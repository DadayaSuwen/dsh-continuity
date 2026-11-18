import { Service } from '@deepseek-ai/cordis';
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import type { Agent, AgentHandle, AgentOptions } from '@deepseek-ai/dsh-agent';
import type {} from '@deepseek-ai/dsh-system-prompt';
import type {} from '@deepseek-ai/dsh-session-query';
import { SessionId } from '@deepseek-ai/dsh-session';
import { randomUUID } from 'node:crypto';
import { continuityDomain, scopeKey, sourceKey } from './storage.ts';
import { digest, previewImport } from './migration/preview.ts';
import type { ContinuityDomain } from './storage.ts';
import { Memory } from './memory/memory.ts';
import { Migration } from './migration/migration.ts';
import type { ArchiveLimits } from './security/archive.ts';
import { DEFAULT_ARCHIVE_LIMITS, ImportError } from './security/archive.ts';
import { buildRecovery } from './recovery/recovery.ts';
import type { RecoveryContext } from './recovery/recovery.ts';
import { BindingSchema, ScopeSchema, SourceSchema, identityOf, sameScope } from './model.ts';
import type { CharacterMemory, SourceMessage } from './model.ts';
import type { MemoryScope } from './model.ts';
import { registerRoutes } from './routes.ts';

export interface Config extends ArchiveLimits {
  ownerId: string;
  contextTokenBudget: number;
  batchEveryTurns: number;
}

export const Config: Schema<Config> = Schema.object({
  ownerId: Schema.string().default('local-owner'),
  maxUploadBytes: Schema.natural().min(1).default(DEFAULT_ARCHIVE_LIMITS.maxUploadBytes),
  maxExpandedBytes: Schema.natural().min(1).default(DEFAULT_ARCHIVE_LIMITS.maxExpandedBytes),
  maxEntryBytes: Schema.natural().min(1).default(DEFAULT_ARCHIVE_LIMITS.maxEntryBytes),
  maxFiles: Schema.natural().min(1).default(DEFAULT_ARCHIVE_LIMITS.maxFiles),
  maxCompressionRatio: Schema.natural().min(1).default(DEFAULT_ARCHIVE_LIMITS.maxCompressionRatio),
  contextTokenBudget: Schema.natural().min(512).max(65536).default(2048),
  batchEveryTurns: Schema.natural().default(0),
});

export const name = 'dsh-continuity';
export const inject = [
  'storage',
  'storageDomain',
  'agents',
  'sessions',
  'sessionPersistence',
  'sessionQuery',
  'systemPrompt',
];

declare module '@deepseek-ai/cordis' {
  interface Context {
    continuity: Continuity;
  }
}

/** DSH-native plugin façade; durable data is native storage, not a parallel runtime. */
export class Continuity extends Service {
  readonly memory: Memory;
  readonly migration: Migration;
  private readonly recoveries = new WeakMap<Agent, () => void>();
  private readonly handles = new Map<string, AgentHandle>();
  private readonly lifetime = new AbortController();
  private readonly extraction = new Map<string, Promise<void>>();
  private readonly queries = new WeakMap<Agent, string>();
  // ponytail: serial identity writes per Host; use per-Session queues if measured contention warrants it.
  private bindingChain = Promise.resolve();

  constructor(
    ctx: Context,
    readonly domain: ContinuityDomain,
    readonly config: Config,
  ) {
    super(ctx, 'continuity');
    ScopeSchema.shape.owner_id.parse(config.ownerId);
    this.memory = new Memory(domain);
    this.migration = new Migration(ctx, domain, config);
    ctx.on('agent/created', async ({ agent }) => {
      this.installRecovery(agent);
      return undefined;
    });
    ctx.on('agent/disposed', ({ agent }) => {
      this.handles.delete(agent.id);
      this.recoveries.get(agent)?.();
      this.recoveries.delete(agent);
    });
    for (const agent of ctx.agents.list()) this.installRecovery(agent);
    ctx.on('agent/inbox/claimed', ({ agent, message }) => {
      if (message.source.kind === 'user')
        this.queries.set(
          agent,
          message.content.map((block) => (block.type === 'text' ? block.text : '')).join('\n'),
        );
    });
    ctx.on('session/event', (session, event) => {
      if (
        event.type !== 'turn/end' ||
        !config.batchEveryTurns ||
        event.data.turn % config.batchEveryTurns !== 0
      )
        return;
      const binding = domain.table('bindings').get(session.id);
      if (!binding || binding.owner_id !== config.ownerId) return;
      void this.extractSession(identityOf(binding), session.id).catch((error) =>
        ctx.logger.warn('continuity batch extraction failed', error),
      );
    });
    ctx.inject(['connection', 'workspaceRegistry'], (routeCtx) => {
      registerRoutes(routeCtx, this, this.lifetime.signal);
    });
    ctx.effect(
      () => async () => {
        this.lifetime.abort(new Error('continuity plugin is unloading'));
        await this.bindingChain;
        await this.migration.drain();
        await Promise.all(this.extraction.values());
        await this.memory.drain();
        await Promise.all([...this.handles.values()].map((handle) => handle.dispose()));
        await domain.close();
      },
      'continuity: drain and close',
    );
  }

  scope(input: Omit<MemoryScope, 'owner_id'>): MemoryScope {
    return ScopeSchema.parse({ ...input, owner_id: this.config.ownerId });
  }

  recovery(scope: MemoryScope, sessionId?: string, query = ''): RecoveryContext {
    this.assertOwner(scope);
    return buildRecovery(scope, this.memory.list(scope), {
      tokenBudget: this.config.contextTokenBudget,
      ...(sessionId === undefined
        ? {}
        : {
            sessionId,
            sessionSources: [...this.domain.table('imports').entries()]
              .map(([, receipt]) => receipt)
              .filter(
                (receipt) =>
                  receipt.session_id === sessionId &&
                  receipt.status === 'imported' &&
                  sameScope(receipt, scope),
              )
              .flatMap((receipt) =>
                [receipt.source_id, ...(receipt.source_alias_ids ?? [])].map((source_id) => ({
                  source_id,
                  conversation_id: receipt.conversation_id,
                })),
              ),
          }),
      query,
    });
  }

  bind(scope: MemoryScope, sessionId: string): Promise<void> {
    this.assertOwner(scope);
    const run = this.bindingChain.then(async () => {
      this.lifetime.signal.throwIfAborted();
      const id = SessionId(sessionId);
      const existing = this.domain.table('bindings').get(sessionId);
      if (existing && !sameScope(existing, scope))
        throw new ImportError(
          'binding-conflict',
          'This Session belongs to another character; create a fresh conversation',
        );
      if (!this.ctx.agents.get(id) && !(await this.ctx.sessionPersistence.stat(id)))
        throw new ImportError('session-not-found', 'Session does not exist');
      if (!existing)
        await this.domain
          .table('bindings')
          .put(
            sessionId,
            BindingSchema.parse({ ...scope, session_id: sessionId, created_at: Date.now() }),
          );
      const agent = this.ctx.agents.get(id);
      if (agent) this.installRecovery(agent);
    });
    this.bindingChain = run.then(
      () => {},
      () => {},
    );
    return run;
  }

  async continueSession(
    scope: MemoryScope,
    sessionId: string,
    options: AgentOptions,
  ): Promise<Agent> {
    this.assertOwner(scope);
    await this.bind(scope, sessionId);
    const existing = this.ctx.agents.get(SessionId(sessionId));
    if (existing) {
      if (options.provider && options.model)
        existing.model.select({
          provider: options.provider,
          model: options.model,
          ...(options.reasoningEffort ? { reasoningEffort: options.reasoningEffort } : {}),
        });
      return existing;
    }
    const handle = await this.ctx.agents.resume({
      resumeSessionId: SessionId(sessionId),
      agentOptions: options,
    });
    if (options.provider && options.model)
      handle.agent.model.select({
        provider: options.provider,
        model: options.model,
        ...(options.reasoningEffort ? { reasoningEffort: options.reasoningEffort } : {}),
      });
    this.handles.set(sessionId, handle);
    return handle.agent;
  }

  async newSession(
    scope: MemoryScope,
    workspacePath: string,
    options: AgentOptions,
  ): Promise<Agent> {
    this.assertOwner(scope);
    const id = SessionId(randomUUID());
    // Persist identity before publication so agent/created restores the correct partition.
    await this.domain
      .table('bindings')
      .put(id, { ...scope, session_id: id, created_at: Date.now() });
    try {
      const handle = await this.ctx.agents.create({
        sessionId: id,
        meta: { cwd: workspacePath },
        agentOptions: options,
      });
      this.handles.set(id, handle);
      return handle.agent;
    } catch (error) {
      await this.domain.table('bindings').delete(id);
      throw error;
    }
  }

  private installRecovery(agent: Agent): void {
    if (this.recoveries.has(agent)) return;
    const binding = this.domain.table('bindings').get(agent.id);
    if (!binding || binding.owner_id !== this.config.ownerId) return;
    const dispose = agent.ctx.systemPrompt.context({
      name: 'dsh-continuity:character',
      order: 300,
      interpolate: false,
      text: () => this.recovery(identityOf(binding), agent.id, this.queries.get(agent) ?? '').text,
    });
    this.recoveries.set(agent, dispose);
    this.ctx.effect(
      () => () => {
        this.recoveries.get(agent)?.();
        this.recoveries.delete(agent);
      },
      'continuity: scoped context',
    );
  }

  extractSession(scope: MemoryScope, sessionId: string): Promise<CharacterMemory[]> {
    this.assertOwner(scope);
    const binding = this.domain.table('bindings').get(sessionId);
    if (!binding || !sameScope(binding, scope))
      return Promise.reject(
        new ImportError('binding-conflict', 'Session does not belong to this character'),
      );
    const key = `${scopeKey(scope)}_${sessionId}`;
    let candidates: CharacterMemory[] = [];
    const run = (this.extraction.get(key) ?? Promise.resolve()).then(async () => {
      this.lifetime.signal.throwIfAborted();
      const snapshot = await this.ctx.sessionQuery.readSession(SessionId(sessionId));
      const cursor = this.domain.table('cursors').get(key)?.last_seq ?? -1;
      const events = snapshot.events.filter((event) => event.seq > cursor);
      const messages: SourceMessage[] = [];
      for (const event of events) {
        const message =
          event.type === 'user/message' && event.data.source.kind === 'user'
            ? event.data
            : event.type === 'assistant/message'
              ? event.data.message
              : undefined;
        if (!message) continue;
        const text = message.content
          .map((block) => (block.type === 'text' ? block.text : ''))
          .join('\n');
        if (!text) continue;
        messages.push({
          id: message.id,
          role: message.role === 'user' ? 'user' : 'assistant',
          text,
          timestamp: event.time,
          status: 'IMPORTED',
          parent_id: messages.at(-1)?.id ?? null,
        });
      }
      if (messages.length) {
        const bytes = new TextEncoder().encode(
          JSON.stringify({ schema_version: 1, dsh_session: snapshot.session, events }),
        );
        const hash = digest(bytes);
        const sourceId = `source:${hash}`;
        const preview = await previewImport(
          bytes,
          `session-${sessionId}.json`,
          this.config,
          this.lifetime.signal,
        );
        await this.domain.table('sources').put(
          sourceKey(scope, sourceId),
          SourceSchema.parse({
            ...scope,
            source_id: sourceId,
            digest: hash,
            raw_base64: Buffer.from(bytes).toString('base64'),
            preview,
            created_at: Date.now(),
          }),
        );
        candidates = await this.memory.extract(scope, sourceId, sessionId);
      }
      const lastSeq = snapshot.events.at(-1)?.seq ?? cursor;
      await this.domain.table('cursors').put(key, { session_id: sessionId, last_seq: lastSeq });
    });
    const tail = run.then(
      () => {},
      () => {},
    );
    this.extraction.set(key, tail);
    void tail.then(() => {
      if (this.extraction.get(key) === tail) this.extraction.delete(key);
    });
    return run.then(() => candidates);
  }

  private assertOwner(scope: MemoryScope): void {
    const parsed = ScopeSchema.parse(scope);
    if (parsed.owner_id !== this.config.ownerId)
      throw new ImportError('owner-mismatch', 'Data belongs to a different owner');
  }
}

export async function apply(ctx: Context, input: Partial<Config>): Promise<void> {
  const config: Config = {
    ...DEFAULT_ARCHIVE_LIMITS,
    ownerId: 'local-owner',
    contextTokenBudget: 2048,
    batchEveryTurns: 0,
    ...input,
  };
  const domain = await ctx.storage.domain.open(continuityDomain);
  try {
    new Continuity(ctx, domain, config);
  } catch (error) {
    await domain.close();
    throw error;
  }
}

import type { Context } from '@deepseek-ai/cordis';
import { randomUUID } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';
import { importDeepseekChatExport } from '@deepseek-ai/dsh-deepseek-chat-import/src/importer.ts';
import type { DeepseekChatImportWorkspace } from '@deepseek-ai/dsh-deepseek-chat-import/src/importer.ts';
import { convertConversation } from '@deepseek-ai/dsh-deepseek-chat-import/src/conversation.ts';
import { exportSessionFile } from '@deepseek-ai/dsh-deepseek-chat-import/src/format.ts';
import type {} from '@deepseek-ai/dsh-session-persistence';
import type {} from '@deepseek-ai/dsh-attachment';
import type {} from '@deepseek-ai/dsh-workspace';
import { Session, SessionId, SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session';
import type { SessionHeader } from '@deepseek-ai/dsh-session';
import {
  createAssistantMessage,
  createSystemMessage,
  createUserMessage,
} from '@deepseek-ai/dsh-llm';
import { ImportError, inspectZip } from '../security/archive.ts';
import type { ArchiveLimits } from '../security/archive.ts';
import { parseDataJson } from '../security/json.ts';
import { ScopeSchema, SourceSchema, LedgerSchema } from '../model.ts';
import type { ImportLedger, MemoryScope, SourceAsset, SourceConversation } from '../model.ts';
import type { ContinuityDomain } from '../storage.ts';
import { sourceKey } from '../storage.ts';
import { digest, previewImport } from './preview.ts';

export interface MigrationResult {
  source_id: string;
  imported: Array<{ conversation_id: string; session_id: string }>;
  duplicates: Array<{ conversation_id: string; session_id: string }>;
  failures: Array<{ conversation_id: string; error: string; session_id: string | null }>;
  warnings: string[];
}

/** Owns original asset retention and receipts; all official ZIP-to-Session semantics stay upstream. */
export class Migration {
  private chain = Promise.resolve();
  constructor(
    private readonly ctx: Context,
    private readonly domain: ContinuityDomain,
    private readonly limits: Partial<ArchiveLimits>,
  ) {}

  source(scope: MemoryScope, sourceId: string): SourceAsset | undefined {
    const stored = this.domain.table('sources').get(sourceKey(ScopeSchema.parse(scope), sourceId));
    return stored === undefined ? undefined : structuredClone(stored);
  }

  listSources(scope: MemoryScope): SourceAsset[] {
    const identity = ScopeSchema.parse(scope);
    return [...this.domain.table('sources').entries()]
      .map(([, source]) => source)
      .filter(
        (source) => sourceKey(source, source.source_id) === sourceKey(identity, source.source_id),
      )
      .map((source) => structuredClone(source));
  }

  async deleteSource(scope: MemoryScope, sourceId: string): Promise<boolean> {
    return await this.domain.table('sources').delete(sourceKey(ScopeSchema.parse(scope), sourceId));
  }

  /** Serialized across this module so concurrent reimports cannot mint duplicate official Sessions. */
  commit(
    bytes: Uint8Array,
    filename: string,
    scope: MemoryScope,
    selection: readonly string[],
    workspace: DeepseekChatImportWorkspace,
    signal: AbortSignal,
    progress: (done: number, total: number) => void = () => {},
    branches: Readonly<Record<string, string>> = {},
  ): Promise<MigrationResult> {
    const input = bytes.slice();
    const identity = ScopeSchema.parse(scope);
    const selected = [...new Set(selection)];
    const branchChoice = { ...branches };
    const run = this.chain.then(() =>
      this.runCommit(
        input,
        filename,
        identity,
        selected,
        workspace,
        signal,
        progress,
        branchChoice,
      ),
    );
    this.chain = run.then(
      () => {},
      () => {},
    );
    return run;
  }

  async drain(): Promise<void> {
    await this.chain;
  }

  private async runCommit(
    bytes: Uint8Array,
    filename: string,
    scope: MemoryScope,
    selection: string[],
    workspace: DeepseekChatImportWorkspace,
    signal: AbortSignal,
    progress: (done: number, total: number) => void,
    branches: Readonly<Record<string, string>>,
  ): Promise<MigrationResult> {
    const preview = await previewImport(bytes, filename, this.limits, signal);
    if (!selection.length)
      throw new ImportError('selection-required', 'Select at least one conversation');
    const sources = selection.map((id) => {
      const conversation = preview.conversations.find((item) => item.id === id);
      if (!conversation?.supported)
        throw new ImportError(
          'invalid-selection',
          `Conversation is missing or not supported: ${id}`,
        );
      return conversation;
    });
    const source = SourceSchema.parse({
      ...scope,
      source_id: preview.source_id,
      digest: digest(bytes),
      raw_base64: Buffer.from(bytes).toString('base64'),
      preview,
      created_at: Date.now(),
    });
    const storedKey = sourceKey(scope, source.source_id);
    if (!this.domain.table('sources').get(storedKey))
      await this.domain.table('sources').put(storedKey, source);
    const files =
      preview.format === 'deepseek-v3' ? await inspectZip(bytes, this.limits, signal) : undefined;
    const result: MigrationResult = {
      source_id: source.source_id,
      imported: [],
      duplicates: [],
      failures: [],
      warnings: [...preview.warnings],
    };
    for (const [index, conversation] of sources.entries()) {
      signal.throwIfAborted();
      const branchId = branches[conversation.id] ?? conversation.active_branch;
      if (
        branches[conversation.id] !== undefined &&
        !conversation.branches.includes(branchId ?? '')
      )
        throw new ImportError(
          'invalid-branch',
          'Selected branch is not a leaf of this conversation',
        );
      const ledgerId = `import_${digest(JSON.stringify([sourceKey(scope, conversation.digest), conversation.id, branchId]))}`;
      const receipts = this.domain.table('imports');
      const prior = receipts.get(ledgerId);
      if (prior?.session_id) {
        const recovered = await this.reconcile(prior, workspace, signal);
        if (recovered) {
          await receipts.update(ledgerId, (current) =>
            LedgerSchema.parse({
              ...current,
              source_alias_ids: [
                ...new Set([...(current.source_alias_ids ?? []), source.source_id]),
              ],
            }),
          );
          result.duplicates.push({
            conversation_id: conversation.id,
            session_id: prior.session_id,
          });
          progress(index + 1, sources.length);
          continue;
        }
      }
      const ledger: ImportLedger = {
        ...scope,
        ledger_id: ledgerId,
        source_id: source.source_id,
        source_alias_ids: [],
        conversation_id: conversation.id,
        branch_id: branchId,
        session_id: null,
        expected_events: 0,
        status: 'writing',
        error: null,
        created_at: Date.now(),
      };
      await receipts.put(ledgerId, ledger);
      try {
        let sessionId: string;
        if (files) {
          const raw = files.get(`chat_sessions/${conversation.id}.json`);
          if (!raw)
            throw new ImportError('missing-conversation', 'Selected raw conversation is missing');
          const parsed = exportSessionFile.parse(parseDataJson(raw));
          const original = JSON.parse(new TextDecoder().decode(raw)) as Record<string, unknown>;
          if (branchId !== null) original.current_message_id = Number(branchId);
          const converted = convertConversation(
            { ...parsed, current_message_id: branchId === null ? null : Number(branchId) },
            { createId: randomUUID, maxTitleBytes: 80 },
          );
          const subset: Record<string, Uint8Array> = {
            'manifest.json': strToU8('{"export_format_version":3}'),
            'chat_session_index.json': strToU8(
              JSON.stringify([
                {
                  id: conversation.id,
                  inserted_at: parsed.inserted_at,
                  updated_at: parsed.inserted_at,
                },
              ]),
            ),
            [`chat_sessions/${conversation.id}.json`]: strToU8(JSON.stringify(original)),
          };
          for (const [path, data] of files)
            if (path.startsWith(`chat_sessions/${conversation.id}_files/`)) subset[path] = data;
          const imported = await importDeepseekChatExport(
            {
              persistence: {
                create: async (header, options) => {
                  await receipts.update(ledgerId, (current) => ({
                    ...current,
                    session_id: header.id,
                    expected_events: converted.events.length,
                  }));
                  return await this.ctx.sessionPersistence.create(header, options);
                },
              },
              attachments: this.ctx.get('attachments'),
              workspaceRegistered: (id) => {
                const registry = this.ctx.get('workspaceRegistry');
                return (
                  registry === undefined ||
                  registry.get(id as Parameters<typeof registry.get>[0]) !== undefined
                );
              },
              createId: randomUUID,
              warn: (warning) => result.warnings.push(warning),
            },
            {
              archive: zipSync(subset, { level: 0 }),
              workspace,
              limits: {
                maxSessions: 1,
                maxEntryBytes: this.limits.maxEntryBytes ?? 64 * 1024 * 1024,
                maxTitleBytes: 80,
              },
              onProgress: () => {},
            },
            signal,
          );
          if (!imported.sessionIds[0])
            throw new ImportError(
              'conversion-failed',
              imported.skipped.map((item) => item.reason).join('; ') || 'No Session was imported',
            );
          sessionId = imported.sessionIds[0];
        } else {
          sessionId = await this.writeEmergency(conversation, workspace, ledgerId, signal);
        }
        await receipts.update(ledgerId, (current) => ({
          ...current,
          session_id: sessionId,
          status: 'imported',
        }));
        await this.domain
          .table('bindings')
          .put(sessionId, { ...scope, session_id: sessionId, created_at: Date.now() });
        result.imported.push({ conversation_id: conversation.id, session_id: sessionId });
        result.warnings.push(...conversation.warnings);
      } catch (error) {
        signal.throwIfAborted();
        const message = error instanceof Error ? error.message : String(error);
        await receipts.update(ledgerId, (current) => ({
          ...current,
          status: 'failed',
          error: message,
        }));
        result.failures.push({
          conversation_id: conversation.id,
          error: message,
          session_id: receipts.get(ledgerId)?.session_id ?? null,
        });
      }
      progress(index + 1, sources.length);
    }
    return result;
  }

  private async reconcile(
    receipt: ImportLedger,
    workspace: DeepseekChatImportWorkspace,
    signal: AbortSignal,
  ): Promise<boolean> {
    if (receipt.session_id === null) return false;
    const id = SessionId(receipt.session_id);
    if (!(await this.ctx.sessionPersistence.stat(id, { signal }))) return false;
    const handle = await this.ctx.sessionPersistence.open(id, 'read', { signal });
    try {
      const log = await handle.read();
      if (log.events.length < receipt.expected_events)
        throw new ImportError(
          'partial-import',
          `Partial Session ${id} retained; inspect before retry`,
        );
      if (handle.header.cwd !== workspace.path)
        throw new ImportError(
          'workspace-mismatch',
          'Duplicate import belongs to another workspace',
        );
    } finally {
      await handle.close();
    }
    await workspace.attachSession(id);
    await this.domain
      .table('imports')
      .update(receipt.ledger_id, (current) => ({ ...current, status: 'imported', error: null }));
    await this.domain.table('bindings').put(id, {
      owner_id: receipt.owner_id,
      agent_id: receipt.agent_id,
      character_id: receipt.character_id,
      story_id: receipt.story_id,
      session_id: id,
      created_at: receipt.created_at,
    });
    return true;
  }

  private async writeEmergency(
    conversation: SourceConversation,
    workspace: DeepseekChatImportWorkspace,
    ledgerId: string,
    signal: AbortSignal,
  ): Promise<string> {
    if (conversation.messages.some((message) => message.role === 'unknown'))
      throw new ImportError(
        'unknown-speaker',
        'Speaker roles are unknown; use labelled User:/Assistant: text or generic JSON before creating a Session',
      );
    const id = SessionId(randomUUID());
    const header: SessionHeader = {
      version: SESSION_FORMAT_VERSION,
      id,
      createdAt: Date.now(),
      cwd: workspace.path,
      isSeeded: false,
    };
    const session = Session.create(id, undefined, header);
    let turn = 0;
    for (let index = 0; index < conversation.messages.length; index++) {
      const user = conversation.messages[index];
      if (!user || user.role !== 'user')
        throw new ImportError(
          'invalid-order',
          'A conversation turn must start with a user message',
        );
      const next = conversation.messages[index + 1];
      const reply = next?.role === 'assistant' ? next : undefined;
      if (reply) index++;
      turn++;
      session.append('turn/start', { turn });
      session.append('step/start', { turn, step: 1 });
      if (turn === 1)
        session.append(
          'system/message',
          { turn, step: 1, message: createSystemMessage('') },
          { surfaceOp: 'append' },
        );
      session.append(
        'user/message',
        createUserMessage({
          content: [{ type: 'text', text: user.text }],
          source: { kind: 'user' },
        }),
        { surfaceOp: 'append' },
      );
      if (reply)
        session.append(
          'assistant/message',
          {
            turn,
            step: 1,
            message: createAssistantMessage({
              content: [{ type: 'text', text: reply.text }],
              source: { provider: 'chat-import', model: 'unknown-original-model' },
            }),
            stream: [],
          },
          { surfaceOp: 'append' },
        );
      session.append('step/end', { turn, step: 1 });
      session.append('turn/end', {
        turn,
        reason: reply
          ? { kind: 'completed' }
          : {
              kind: 'error',
              error: { code: 'IMPORT_NO_REPLY', message: 'Original reply is unknown' },
            },
      });
    }
    const events = session.snapshotEvents();
    await this.domain.table('imports').update(ledgerId, (current) => ({
      ...current,
      session_id: id,
      expected_events: events.length,
    }));
    const handle = await this.ctx.sessionPersistence.create(header, { signal });
    try {
      await handle.append(events);
      await handle.flush();
    } finally {
      await handle.close();
    }
    await workspace.attachSession(id);
    return id;
  }
}

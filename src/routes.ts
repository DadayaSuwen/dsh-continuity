import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection';
import type {} from '@deepseek-ai/dsh-workspace';
import { WorkspaceId } from '@deepseek-ai/dsh-workspace';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { z } from 'zod';
import type { Continuity } from './plugin.ts';
import { previewImport } from './migration/preview.ts';
import type { ImportPreview } from './model.ts';
import { ProposalSchema } from './memory/memory.ts';
import { ImportError } from './security/archive.ts';
import { parseDataJson } from './security/json.ts';
import { exportPackage, restorePackage } from './migration/package.ts';
import { randomUUID } from 'node:crypto';

const IdentityRequest = z
  .object({
    agent_id: z.string().min(1).max(160),
    character_id: z.string().min(1).max(160),
    story_id: z.string().nullable().default(null),
  })
  .strict();
const BASE = '/api/dsh-continuity';
const HeadersJson = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};
const json = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value), { status, headers: HeadersJson });

async function readBytes(
  request: Request,
  limit: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/u.test(length) || Number(length) > limit))
    throw new ImportError('too-large', 'Request length is invalid or exceeds configured limit');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const cancel = () => {
    void reader.cancel(signal.reason).catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    for (;;) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.length;
      if (total > limit) {
        await reader.cancel();
        throw new ImportError('too-large', 'Request exceeds configured byte limit');
      }
      chunks.push(chunk.value);
    }
  } finally {
    signal.removeEventListener('abort', cancel);
  }
  signal.throwIfAborted();
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

const ActionSchema = z.discriminatedUnion('action', [
  IdentityRequest.extend({
    action: z.literal('commit'),
    upload_id: z.string(),
    selected: z.array(z.string()).min(1).max(1000),
    workspace_id: z.string(),
    branches: z.record(z.string(), z.string()).default({}),
  }),
  IdentityRequest.extend({
    action: z.literal('extract'),
    source_id: z.string(),
    conversation_id: z.string(),
    branch_id: z.string().optional(),
  }),
  IdentityRequest.extend({ action: z.literal('propose'), proposal: ProposalSchema }),
  IdentityRequest.extend({
    action: z.literal('confirm'),
    memory_id: z.string(),
    expected_version: z.number().int().positive(),
    replace: z.array(z.string()).default([]),
  }),
  IdentityRequest.extend({
    action: z.literal('edit'),
    memory_id: z.string(),
    expected_version: z.number().int().positive(),
    content: z.string().min(1).max(12000),
  }),
  IdentityRequest.extend({
    action: z.literal('delete-memory'),
    memory_id: z.string(),
    expected_version: z.number().int().positive(),
  }),
  IdentityRequest.extend({ action: z.literal('delete-all-memories') }),
  IdentityRequest.extend({ action: z.literal('delete-source'), source_id: z.string() }),
  IdentityRequest.extend({
    action: z.literal('new-session'),
    workspace_id: z.string(),
    provider: z.string().min(1),
    model: z.string().min(1),
  }),
  IdentityRequest.extend({
    action: z.literal('continue'),
    session_id: z.string(),
    provider: z.string().min(1),
    model: z.string().min(1),
  }),
  IdentityRequest.extend({
    action: z.literal('followup'),
    session_id: z.string(),
    text: z.string().min(1).max(12000),
    provider: z.string().min(1),
    model: z.string().min(1),
  }),
  IdentityRequest.extend({ action: z.literal('discard-upload'), upload_id: z.string() }),
  IdentityRequest.extend({ action: z.literal('restore'), package_base64: z.string() }),
]);

interface StagedUpload {
  bytes: Uint8Array;
  preview: ImportPreview;
  expires: number;
}

/** Exact Connection routes receive only authenticated owner Peers, enforced by DSH before callbacks. */
export function registerRoutes(ctx: Context, service: Continuity, lifetime: AbortSignal): void {
  const uploads = new Map<string, StagedUpload>();
  let reading = false;
  const clean = () => {
    for (const [id, stage] of uploads) if (stage.expires <= Date.now()) uploads.delete(id);
  };
  const register = (
    path: string,
    methods: Array<'GET' | 'POST'>,
    handler: (request: Request, signal: AbortSignal) => Promise<Response>,
  ) => {
    ctx.effect(
      () =>
        ctx.connection.fetch.register({
          path: BASE + path,
          methods,
          requestBody: methods.includes('POST') ? 'streaming' : 'buffered',
          fetch: async (request) => {
            clean();
            const signal = AbortSignal.any([request.signal, lifetime, AbortSignal.timeout(120000)]);
            try {
              return await handler(request, signal);
            } catch (error) {
              const code =
                error instanceof ImportError
                  ? error.code
                  : error instanceof z.ZodError
                    ? 'invalid-input'
                    : signal.aborted
                      ? 'cancelled'
                      : 'operation-failed';
              return json(
                {
                  ok: false,
                  error: { code, message: error instanceof Error ? error.message : String(error) },
                },
                code === 'too-large' ? 413 : code === 'busy' ? 409 : 400,
              );
            }
          },
        }),
      `continuity route ${path}`,
    );
  };
  const identityFromUrl = (request: Request) => {
    const parameters = new URL(request.url).searchParams;
    return service.scope(
      IdentityRequest.parse({
        agent_id: parameters.get('agent_id'),
        character_id: parameters.get('character_id'),
        story_id: parameters.get('story_id') || null,
      }),
    );
  };

  register('/info', ['GET'], async () =>
    json({
      ok: true,
      value: {
        data_destination: 'Current connected DSH Host only',
        max_upload_bytes: service.config.maxUploadBytes,
        workspaces: ctx.workspaceRegistry
          .list()
          .map((workspace) => ({ id: workspace.id, title: workspace.title, path: workspace.path })),
        external_memory_api: false,
        default_model_calls: false,
      },
    }),
  );
  register('/preview', ['POST'], async (request, signal) => {
    if (reading || uploads.size > 0)
      throw new ImportError(
        'busy',
        'Finish or discard the existing upload before uploading another file',
      );
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/octet-stream')
      throw new ImportError('content-type', 'Use application/octet-stream for file bytes');
    reading = true;
    try {
      const bytes = await readBytes(request, service.config.maxUploadBytes, signal);
      const filename = new URL(request.url).searchParams.get('filename') ?? 'chat.txt';
      const preview = await previewImport(bytes, filename, service.config, signal);
      const uploadId = randomUUID();
      uploads.set(uploadId, { bytes, preview, expires: Date.now() + 15 * 60000 });
      return json({ ok: true, value: { upload_id: uploadId, preview, expires_in_seconds: 900 } });
    } finally {
      reading = false;
    }
  });
  register('/data', ['GET'], async (request) => {
    const scope = identityFromUrl(request);
    return json({
      ok: true,
      value: {
        memories: service.memory.list(scope),
        sources: service.migration
          .listSources(scope)
          .map((source) => ({ source_id: source.source_id, preview: source.preview })),
        bindings: [...service.domain.table('bindings').entries()]
          .map(([, binding]) => binding)
          .filter(
            (binding) =>
              binding.owner_id === scope.owner_id &&
              binding.agent_id === scope.agent_id &&
              binding.character_id === scope.character_id &&
              binding.story_id === scope.story_id,
          ),
        recovery: service.recovery(scope),
      },
    });
  });
  register('/export', ['GET'], async (request) => {
    const scope = identityFromUrl(request);
    const body = exportPackage(service.domain, scope);
    return new Response(body.slice().buffer, {
      headers: {
        'content-type': 'application/json',
        'content-disposition': 'attachment; filename="dsh-continuity-backup.json"',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  });
  register('/action', ['POST'], async (request, signal) => {
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      throw new ImportError('content-type', 'Use application/json');
    const action = ActionSchema.parse(
      parseDataJson(
        await readBytes(
          request,
          Math.ceil(service.config.maxUploadBytes * 1.5) + 1024 * 1024,
          signal,
        ),
      ),
    );
    const scope = service.scope({
      agent_id: action.agent_id,
      character_id: action.character_id,
      story_id: action.story_id,
    });
    let value: unknown;
    switch (action.action) {
      case 'commit': {
        const stage = uploads.get(action.upload_id);
        if (!stage)
          throw new ImportError('upload-expired', 'Upload expired; select the file again');
        const workspace = ctx.workspaceRegistry.get(WorkspaceId(action.workspace_id));
        if (!workspace)
          throw new ImportError('workspace-not-found', 'Choose an existing DSH workspace');
        value = await service.migration.commit(
          stage.bytes,
          stage.preview.filename,
          scope,
          action.selected,
          workspace,
          signal,
          () => {},
          action.branches,
        );
        uploads.delete(action.upload_id);
        break;
      }
      case 'extract':
        value = await service.memory.extract(
          scope,
          action.source_id,
          action.conversation_id,
          action.branch_id,
        );
        break;
      case 'propose':
        value = await service.memory.propose(scope, action.proposal);
        break;
      case 'confirm':
        value = await service.memory.confirm(
          scope,
          action.memory_id,
          action.expected_version,
          action.replace,
        );
        break;
      case 'edit':
        value = await service.memory.update(scope, action.memory_id, action.expected_version, {
          content: action.content,
        });
        break;
      case 'delete-memory':
        value = await service.memory.delete(scope, action.memory_id, action.expected_version);
        break;
      case 'delete-all-memories':
        value = await service.memory.deleteAll(scope);
        break;
      case 'delete-source':
        value = await service.migration.deleteSource(scope, action.source_id);
        break;
      case 'new-session': {
        const workspace = ctx.workspaceRegistry.get(WorkspaceId(action.workspace_id));
        if (!workspace)
          throw new ImportError('workspace-not-found', 'Choose an existing DSH workspace');
        const agent = await service.newSession(scope, workspace.path, {
          provider: action.provider,
          model: action.model,
        });
        await workspace.attachSession(agent.id);
        value = { session_id: agent.id };
        break;
      }
      case 'continue': {
        const agent = await service.continueSession(scope, action.session_id, {
          provider: action.provider,
          model: action.model,
        });
        value = { session_id: agent.id };
        break;
      }
      case 'followup': {
        const agent = await service.continueSession(scope, action.session_id, {
          provider: action.provider,
          model: action.model,
        });
        const firstNewEvent = agent.session.snapshotEvents().length;
        agent.followup(
          createUserMessage({
            content: [{ type: 'text', text: action.text }],
            source: { kind: 'user' },
          }),
        );
        await agent.whenIdle();
        const events = agent.session.snapshotEvents().slice(firstNewEvent);
        const failure = events.findLast(
          (event) => event.type === 'turn/end' && event.data.reason.kind === 'error',
        );
        if (failure?.type === 'turn/end' && failure.data.reason.kind === 'error')
          throw new ImportError('model-error', failure.data.reason.error.message);
        value = {
          session_id: agent.id,
          messages: agent.session
            .deriveMessages()
            .filter(
              (message) =>
                (message.role === 'user' && message.source.kind === 'user') ||
                message.role === 'assistant',
            )
            .map((message) => ({
              role: message.role,
              text: message.content
                .map((block) => (block.type === 'text' ? block.text : ''))
                .join('\n'),
            })),
        };
        break;
      }
      case 'discard-upload':
        uploads.delete(action.upload_id);
        value = true;
        break;
      case 'restore':
        value = await restorePackage(
          service.domain,
          Buffer.from(action.package_base64, 'base64'),
          scope,
          service.config.maxUploadBytes,
        );
        break;
    }
    return json({ ok: true, value });
  });
  ctx.effect(
    () => () => {
      uploads.clear();
    },
    'continuity: temporary upload cleanup',
  );
}

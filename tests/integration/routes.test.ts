import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Workspace from '@deepseek-ai/dsh-workspace';
import * as Connection from '@deepseek-ai/dsh-client-connection';
import Credentials from '@deepseek-ai/dsh-credentials-local';
import * as Plugin from '../../src/index.ts';
import { createRuntime } from '../helpers/runtime.ts';
import { companionZip } from '../fixtures/companion.ts';

it('registers actual owner-only Connection routes and commits using the real Workspace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-http-'));
  const runtime = await createRuntime(root);
  try {
    await runtime.domain.close();
    await runtime.ctx.plugin(Credentials, { path: join(root, 'credentials.yml'), watch: false });
    await runtime.ctx.plugin(Connection);
    await runtime.ctx.plugin(Workspace);
    const workspace = await runtime.ctx.workspaceRegistry.create(runtime.workspace);
    const fiber = runtime.ctx.plugin(Plugin, {
      ...Plugin.DEFAULT_ARCHIVE_LIMITS,
      ownerId: 'owner',
      contextTokenBudget: 2048,
      batchEveryTurns: 0,
    });
    await fiber;
    const handler = runtime.ctx.connection.createSharedFetchHandler('/api');
    const response = await handler.fetch(
      new Request('http://dsh.internal/api/dsh-continuity/preview?filename=chat.zip', {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: companionZip().slice().buffer,
      }),
      runtime.ctx.connection.browserPeer,
    );
    expect(response.status).toBe(200);
    const preview = await response.json();
    expect(preview.ok).toBe(true);
    const imported = await handler.fetch(
      new Request('http://dsh.internal/api/dsh-continuity/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          upload_id: preview.value.upload_id,
          selected: ['c1'],
          workspace_id: workspace.id,
          agent_id: 'companion',
          character_id: 'lin',
          story_id: 'harbor',
        }),
      }),
      runtime.ctx.connection.browserPeer,
    );
    const result = await imported.json();
    expect(result.ok).toBe(true);
    expect(result.value.failures).toEqual([]);
    expect(result.value.imported).toHaveLength(1);
    await fiber.dispose();
  } finally {
    await runtime.dispose();
    await rm(root, { recursive: true, force: true });
  }
});

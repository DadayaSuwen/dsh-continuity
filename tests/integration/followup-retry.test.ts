import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Workspace from '@deepseek-ai/dsh-workspace';
import * as Connection from '@deepseek-ai/dsh-client-connection';
import Credentials from '@deepseek-ai/dsh-credentials-local';
import * as Plugin from '../../src/index.ts';
import { createRuntime } from '../helpers/runtime.ts';
import { companionScope } from '../fixtures/companion.ts';
import { ScriptedModel } from '../helpers/model.ts';

it('returns a successful follow-up even when the imported history contains an incomplete reply', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-followup-'));
  const runtime = await createRuntime(root);
  try {
    await runtime.domain.close();
    await runtime.ctx.plugin(Credentials, { path: join(root, 'credentials.yml'), watch: false });
    await runtime.ctx.plugin(Connection);
    await runtime.ctx.plugin(Workspace);
    const workspace = await runtime.ctx.workspaceRegistry.create(runtime.workspace);
    await runtime.ctx.plugin(Plugin, {
      ...Plugin.DEFAULT_ARCHIVE_LIMITS,
      ownerId: 'owner',
      contextTokenBudget: 2048,
      batchEveryTurns: 0,
    });
    runtime.ctx.llm.registerAdapter(['fixture'], new ScriptedModel());
    const service = runtime.ctx.continuity;
    const imported = await service.migration.commit(
      new TextEncoder().encode('用户：请叫我小禾。'),
      'partial.txt',
      companionScope,
      ['conversation'],
      workspace,
      new AbortController().signal,
    );
    const id = imported.imported[0]!.session_id;
    const handler = runtime.ctx.connection.createSharedFetchHandler('/api');
    const response = await handler.fetch(
      new Request('http://dsh.internal/api/dsh-continuity/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'followup',
          agent_id: companionScope.agent_id,
          character_id: companionScope.character_id,
          story_id: companionScope.story_id,
          session_id: id,
          text: '这次继续。',
          provider: 'fixture',
          model: 'fixture',
        }),
      }),
      runtime.ctx.connection.browserPeer,
    );
    const result = await response.json();
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(
      result.value.messages.some(
        (message: { role: string; text: string }) =>
          message.role === 'assistant' && message.text.includes('灯塔'),
      ),
    ).toBe(true);
  } finally {
    await runtime.dispose();
    await rm(root, { recursive: true, force: true });
  }
});

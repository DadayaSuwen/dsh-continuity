import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { SessionId } from '@deepseek-ai/dsh-session';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { ScriptedModel } from '../../helpers/model.ts';
import * as Plugin from '../../../src/index.ts';
import { createRuntime } from '../../helpers/runtime.ts';
import { companionScope } from '../../fixtures/companion.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('binds an initially unowned persisted Session to exactly one character under concurrent requests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-binding-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const runtime = await createRuntime(root);
  await runtime.domain.close();
  cleanup.push(runtime.dispose);
  await runtime.ctx.plugin(Plugin, {
    ...Plugin.DEFAULT_ARCHIVE_LIMITS,
    ownerId: 'owner',
    contextTokenBudget: 2048,
    batchEveryTurns: 0,
  });
  const id = SessionId(randomUUID());
  runtime.ctx.llm.registerAdapter(['fixture'], new ScriptedModel());
  const handle = await runtime.ctx.agents.create({
    sessionId: id,
    meta: { cwd: runtime.workspace },
    agentOptions: { provider: 'fixture', model: 'fixture' },
  });
  handle.agent.followup(
    createUserMessage({
      content: [{ type: 'text', text: '这是尚未绑定角色的对话。' }],
      source: { kind: 'user' },
    }),
  );
  await handle.agent.whenIdle();
  await handle.dispose();
  const service = runtime.ctx.continuity;
  const other = { ...companionScope, character_id: 'other-character', story_id: 'different-story' };
  const attempts = await Promise.allSettled([
    service.bind(companionScope, id),
    service.bind(other, id),
  ]);
  expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(attempts.filter((result) => result.status === 'rejected')).toHaveLength(1);
  await expect(service.bind(other, id)).rejects.toThrow(/another character|belongs/i);
});

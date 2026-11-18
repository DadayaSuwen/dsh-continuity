import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import * as Plugin from '../../../src/index.ts';
import { createRuntime } from '../../helpers/runtime.ts';
import { companionScope, companionZip } from '../../fixtures/companion.ts';
import { ScriptedModel } from '../../helpers/model.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('selects the requested model on live and resumed Sessions without changing character identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-model-switch-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const runtime = await createRuntime(root);
  await runtime.domain.close();
  cleanup.push(runtime.dispose);
  await runtime.ctx.plugin(Plugin, {
    ...Plugin.DEFAULT_ARCHIVE_LIMITS,
    ownerId: 'owner',
    contextTokenBudget: 8192,
    batchEveryTurns: 0,
  });
  const model = new ScriptedModel();
  runtime.ctx.llm.registerAdapter(['fixture'], model);
  const service = runtime.ctx.continuity;
  const imported = await service.migration.commit(
    companionZip(),
    'chat.zip',
    companionScope,
    ['c1'],
    { id: 'workspace', path: runtime.workspace, attachSession: async () => {} },
    new AbortController().signal,
  );
  for (const candidate of await service.memory.extract(companionScope, imported.source_id, 'c1'))
    await service.memory.confirm(companionScope, candidate.memory_id, candidate.version);
  const agent = await service.newSession(companionScope, runtime.workspace, {
    provider: 'fixture',
    model: 'one',
  });
  agent.followup(
    createUserMessage({ content: [{ type: 'text', text: '开始。' }], source: { kind: 'user' } }),
  );
  await agent.whenIdle();
  const switched = await service.continueSession(companionScope, agent.id, {
    provider: 'fixture',
    model: 'two',
  });
  switched.followup(
    createUserMessage({
      content: [{ type: 'text', text: '模型更换后继续。' }],
      source: { kind: 'user' },
    }),
  );
  await switched.whenIdle();
  expect(model.requests.at(-1)?.model).toBe('two');
  expect(JSON.stringify(model.requests.at(-1)?.messages)).toContain('灯塔');
  expect(switched.id).toBe(agent.id);
});

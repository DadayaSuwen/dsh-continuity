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

it('loads the actual plugin and restores approved character context in a new production Agent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-runtime-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const runtime = await createRuntime(root);
  await runtime.domain.close();
  cleanup.push(runtime.dispose);
  const fiber = runtime.ctx.plugin(Plugin, {
    ...Plugin.DEFAULT_ARCHIVE_LIMITS,
    ownerId: 'owner',
    contextTokenBudget: 8192,
    batchEveryTurns: 0,
  });
  const errors: unknown[] = [];
  runtime.ctx.on('agent/error', ({ error }) => {
    errors.push(error);
  });
  await fiber;
  const service = runtime.ctx.continuity;
  const model = new ScriptedModel();
  runtime.ctx.llm.registerAdapter(['fixture'], model);
  const imported = await service.migration.commit(
    companionZip(),
    'chat.zip',
    companionScope,
    ['c1'],
    { id: 'workspace', path: runtime.workspace, attachSession: async () => {} },
    new AbortController().signal,
  );
  const candidates = await service.memory.extract(companionScope, imported.source_id, 'c1');
  for (const candidate of candidates)
    await service.memory.confirm(companionScope, candidate.memory_id, candidate.version);
  const agent = await service.newSession(companionScope, runtime.workspace, {
    provider: 'fixture',
    model: 'fixture',
  });
  agent.followup(
    createUserMessage({
      content: [{ type: 'text', text: '继续寻找船长' }],
      source: { kind: 'user' },
    }),
  );
  await agent.whenIdle();
  expect(errors).toEqual([]);
  expect(model.requests).toHaveLength(1);
  const first = JSON.stringify(model.requests[0]?.messages);
  expect(first).toContain('请叫我小禾');
  expect(first).toContain('沉稳温柔');
  expect(first).toContain('灯塔');
  expect(first).not.toContain('山城');
  const initialSnapshots = agent.session
    .snapshotEvents()
    .filter(
      (event) =>
        event.type === 'user/message' && String(event.data.source.kind) === 'runtime-context',
    ).length;
  agent.followup(
    createUserMessage({ content: [{ type: 'text', text: '还有呢' }], source: { kind: 'user' } }),
  );
  await agent.whenIdle();
  expect(
    agent.session
      .snapshotEvents()
      .filter(
        (event) =>
          event.type === 'user/message' && String(event.data.source.kind) === 'runtime-context',
      ).length,
  ).toBe(initialSnapshots);
  const foreign = await service.newSession(
    { ...companionScope, character_id: 'different' },
    runtime.workspace,
    { provider: 'fixture', model: 'fixture' },
  );
  foreign.followup(
    createUserMessage({ content: [{ type: 'text', text: '你好' }], source: { kind: 'user' } }),
  );
  await foreign.whenIdle();
  expect(JSON.stringify(model.requests.at(-1)?.messages)).not.toContain('小禾');
  await fiber.dispose();
  expect(runtime.ctx.get('continuity')).toBeUndefined();
  expect((await runtime.ctx.sessionPersistence.list()).length).toBeGreaterThanOrEqual(3);
});

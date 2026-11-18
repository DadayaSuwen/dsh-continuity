import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRuntime } from '../../helpers/runtime.ts';
import * as Plugin from '../../../src/index.ts';
import { companionScope, companionZip } from '../../fixtures/companion.ts';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { SessionId } from '@deepseek-ai/dsh-session';
import { ScriptedModel } from '../../helpers/model.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('recovers persisted character and story after full runtime restart without rewriting original events', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-restart-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const before = await createRuntime(root);
  await before.domain.close();
  await before.ctx.plugin(Plugin, {
    ...Plugin.DEFAULT_ARCHIVE_LIMITS,
    ownerId: 'owner',
    contextTokenBudget: 8192,
    batchEveryTurns: 0,
  });
  const service = before.ctx.continuity;
  const imported = await service.migration.commit(
    companionZip(),
    'chat.zip',
    companionScope,
    ['c1'],
    { id: 'workspace', path: before.workspace, attachSession: async () => {} },
    new AbortController().signal,
  );
  const candidates = await service.memory.extract(companionScope, imported.source_id, 'c1');
  for (const candidate of candidates)
    await service.memory.confirm(companionScope, candidate.memory_id, candidate.version);
  const originalId = imported.imported[0]!.session_id;
  const reader = await before.ctx.sessionPersistence.open(SessionId(originalId), 'read');
  const original = (await reader.read()).events;
  await reader.close();
  await before.dispose();
  const after = await createRuntime(root);
  await after.domain.close();
  cleanup.push(after.dispose);
  await after.ctx.plugin(Plugin, {
    ...Plugin.DEFAULT_ARCHIVE_LIMITS,
    ownerId: 'owner',
    contextTokenBudget: 8192,
    batchEveryTurns: 0,
  });
  const model = new ScriptedModel();
  after.ctx.llm.registerAdapter(['fixture'], model);
  expect(
    after.ctx.continuity.memory.list(companionScope).filter((memory) => memory.status === 'active')
      .length,
  ).toBe(candidates.length);
  const resumed = await after.ctx.continuity.continueSession(companionScope, originalId, {
    provider: 'fixture',
    model: 'fixture',
  });
  resumed.followup(
    createUserMessage({ content: [{ type: 'text', text: '继续' }], source: { kind: 'user' } }),
  );
  await resumed.whenIdle();
  expect(JSON.stringify(model.requests[0]?.messages)).toContain('灯塔');
  expect(JSON.stringify(model.requests[0]?.messages)).toContain('小禾');
  expect(resumed.session.snapshotEvents().slice(0, original.length)).toEqual(original);
});

import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import TokenMeter from '@deepseek-ai/dsh-token-meter';
import BasicCompaction from '@deepseek-ai/dsh-compaction-basic';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import * as Plugin from '../../../src/index.ts';
import { createRuntime } from '../../helpers/runtime.ts';
import { companionScope, companionZip } from '../../fixtures/companion.ts';
import { ScriptedModel } from '../../helpers/model.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('latest scoped context supersedes edited and deleted memory after real official compaction', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-context-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const runtime = await createRuntime(root);
  await runtime.domain.close();
  cleanup.push(runtime.dispose);
  await runtime.ctx.plugin(TokenMeter);
  await runtime.ctx.plugin(BasicCompaction, {
    auto: false,
    headroomTokens: 0,
    maxTokens: 128,
    retainTokens: 0,
    compactionRetries: 0,
  });
  await runtime.ctx.plugin(Plugin, {
    ...Plugin.DEFAULT_ARCHIVE_LIMITS,
    ownerId: 'owner',
    contextTokenBudget: 8192,
    batchEveryTurns: 0,
  });
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
  const nickname = (await service.memory.extract(companionScope, imported.source_id, 'c1')).find(
    (item) => item.fact_key === 'user.nickname',
  )!;
  const active = await service.memory.confirm(companionScope, nickname.memory_id, nickname.version);
  const agent = await service.newSession(companionScope, runtime.workspace, {
    provider: 'fixture',
    model: 'fixture',
  });
  const speak = async (text: string) => {
    agent.followup(
      createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }),
    );
    await agent.whenIdle();
  };
  await speak('旧历史内容。'.repeat(600));
  const original = agent.session.snapshotEvents();
  const edited = await service.memory.update(companionScope, active.memory_id, active.version, {
    content: '用户更正：请称呼我禾禾。',
  });
  const revised = await service.memory.confirm(companionScope, edited.memory_id, edited.version);
  await speak('继续。');
  const compacted = await runtime.ctx.compaction.compactNow(agent, new AbortController().signal);
  expect(compacted).not.toBeNull();
  expect(agent.session.snapshotEvents().slice(0, original.length)).toEqual(original);
  await speak('新的章节。');
  const snapshotText = () =>
    model.requests
      .at(-1)!
      .messages.filter(
        (message) => message.role === 'user' && String(message.source?.kind) === 'runtime-context',
      )
      .map((message) =>
        message.content.map((block) => (block.type === 'text' ? block.text : '')).join('\n'),
      )
      .at(-1) ?? '';
  expect(snapshotText()).toContain('禾禾');
  expect(snapshotText()).not.toContain('请叫我小禾');
  await service.memory.delete(companionScope, revised.memory_id, revised.version);
  await speak('现在使用哪些资料？');
  expect(snapshotText()).not.toContain('禾禾');
  expect(snapshotText()).toContain('memories');
  const afterDeletion = agent.session
    .snapshotEvents()
    .filter(
      (event) =>
        event.type === 'user/message' && String(event.data.source.kind) === 'runtime-context',
    ).length;
  await speak('继续。');
  expect(
    agent.session
      .snapshotEvents()
      .filter(
        (event) =>
          event.type === 'user/message' && String(event.data.source.kind) === 'runtime-context',
      ),
  ).toHaveLength(afterDeletion);
});

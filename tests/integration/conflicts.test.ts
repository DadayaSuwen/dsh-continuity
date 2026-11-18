import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRuntime } from '../helpers/runtime.ts';
import { Memory } from '../../src/memory/memory.ts';
import { Migration } from '../../src/migration/migration.ts';
import { companionZip, companionScope } from '../fixtures/companion.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('requires explicit conflict replacement and rejects stale updates under concurrency', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-conflict-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const runtime = await createRuntime(root);
  cleanup.push(runtime.dispose);
  const migration = new Migration(runtime.ctx, runtime.domain, {});
  const memory = new Memory(runtime.domain);
  const imported = await migration.commit(
    companionZip(),
    'chat.zip',
    companionScope,
    ['c1'],
    { id: 'workspace', path: runtime.workspace, attachSession: async () => {} },
    new AbortController().signal,
  );
  const candidate = (await memory.extract(companionScope, imported.source_id, 'c1')).find(
    (item) => item.fact_key === 'user.nickname',
  )!;
  const active = await memory.confirm(companionScope, candidate.memory_id, candidate.version);
  const replacement = await memory.propose(companionScope, {
    source_id: imported.source_id,
    source_session_id: 'c1',
    source_message_id: '1',
    source_excerpt: '请叫我小禾。',
    memory_type: 'user',
    content: '用户明确选择称呼“小禾”',
    fact_key: 'user.nickname',
  });
  expect(replacement?.status).toBe('conflict');
  await expect(
    memory.confirm(companionScope, replacement!.memory_id, replacement!.version),
  ).rejects.toThrow(/conflict/i);
  const updated = await memory.confirm(
    companionScope,
    replacement!.memory_id,
    replacement!.version,
    [active.memory_id],
  );
  expect(
    memory.list(companionScope).find((item) => item.memory_id === active.memory_id)?.status,
  ).toBe('superseded');
  const results = await Promise.allSettled([
    memory.update(companionScope, updated.memory_id, updated.version, { content: '称呼版本A' }),
    memory.update(companionScope, updated.memory_id, updated.version, { content: '称呼版本B' }),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  const foreign = { ...companionScope, owner_id: 'other-owner' };
  expect(memory.list(foreign)).toEqual([]);
  await expect(
    memory.propose(foreign, {
      source_id: imported.source_id,
      source_session_id: 'c1',
      source_message_id: '1',
      source_excerpt: '请叫我小禾。',
      memory_type: 'user',
      content: 'x',
    }),
  ).rejects.toThrow(/Source/i);
});

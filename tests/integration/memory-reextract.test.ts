import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Migration } from '../../src/migration/migration.ts';
import { Memory } from '../../src/memory/memory.ts';
import { createRuntime } from '../helpers/runtime.ts';
import { companionScope, companionZip } from '../fixtures/companion.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('re-extraction preserves the user edit and keeps each memory identity unique', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-reextract-'));
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
  const candidates = await memory.extract(companionScope, imported.source_id, 'c1');
  const nickname = candidates.find((item) => item.fact_key === 'user.nickname')!;
  const edited = await memory.update(companionScope, nickname.memory_id, nickname.version, {
    content: '请叫我小禾，保留用户编辑。',
  });
  await memory.extract(companionScope, imported.source_id, 'c1');
  const current = memory.list(companionScope);
  expect(current.filter((item) => item.memory_id === nickname.memory_id)).toHaveLength(1);
  expect(current.find((item) => item.memory_id === nickname.memory_id)?.content).toBe(
    edited.content,
  );
  const confirmed = await memory.confirm(companionScope, edited.memory_id, edited.version);
  expect(confirmed.content).toBe(edited.content);
});

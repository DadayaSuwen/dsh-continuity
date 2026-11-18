import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Memory } from '../../src/memory/memory.ts';
import { Migration } from '../../src/migration/migration.ts';
import { companionScope, companionZip } from '../fixtures/companion.ts';
import { createRuntime } from '../helpers/runtime.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('extracts traceable review candidates, not automatic user facts from assistant fiction', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-memory-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const runtime = await createRuntime(root);
  cleanup.push(runtime.dispose);
  const migration = new Migration(runtime.ctx, runtime.domain, {});
  const imported = await migration.commit(
    companionZip(),
    'chat.zip',
    companionScope,
    ['c1'],
    { id: 'workspace', path: runtime.workspace, attachSession: async () => {} },
    new AbortController().signal,
  );
  const memory = new Memory(runtime.domain);
  const candidates = await memory.extract(companionScope, imported.source_id, 'c1');
  expect(
    candidates.some((item) => item.memory_type === 'persona' && item.source_message_id === '1'),
  ).toBe(true);
  expect(
    candidates.some(
      (item) => item.memory_type === 'relationship' && item.source_message_id === '3',
    ),
  ).toBe(true);
  expect(
    candidates
      .filter((item) => item.source_kind === 'assistant-fiction')
      .every((item) => item.memory_type !== 'user'),
  ).toBe(true);
  expect(memory.list(companionScope).every((item) => item.status === 'candidate')).toBe(true);
  const nickname = candidates.find((item) => item.fact_key === 'user.nickname')!;
  const activated = await memory.confirm(companionScope, nickname.memory_id, nickname.version);
  expect(activated.status).toBe('active');
  const foreign = { ...companionScope, character_id: 'other' };
  expect(memory.list(foreign)).toEqual([]);
  await expect(memory.confirm(foreign, nickname.memory_id, nickname.version)).rejects.toThrow(
    /memory/i,
  );
  const firstCount = memory.list(companionScope).length;
  await memory.extract(companionScope, imported.source_id, 'c1');
  expect(memory.list(companionScope).length).toBe(firstCount);
  await memory.delete(companionScope, nickname.memory_id, activated.version);
  await memory.extract(companionScope, imported.source_id, 'c1');
  expect(memory.list(companionScope).some((item) => item.memory_id === nickname.memory_id)).toBe(
    false,
  );
});

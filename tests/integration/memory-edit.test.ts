import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as Plugin from '../../src/index.ts';
import { createRuntime } from '../helpers/runtime.ts';
import { companionScope, companionZip } from '../fixtures/companion.ts';
import { Memory } from '../../src/memory/memory.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('edited memory deletion suppresses the original extraction identity, not only its latest text', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-edit-delete-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const runtime = await createRuntime(root);
  cleanup.push(runtime.dispose);
  const migration = new Plugin.Migration(runtime.ctx, runtime.domain, {});
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
  const nickname = candidates.find((candidate) => candidate.fact_key === 'user.nickname')!;
  const edited = await memory.update(companionScope, nickname.memory_id, nickname.version, {
    content: '请叫我小禾，不用旧称呼。',
  });
  await memory.delete(companionScope, edited.memory_id, edited.version);
  await memory.extract(companionScope, imported.source_id, 'c1');
  expect(
    memory.list(companionScope).some((candidate) => candidate.memory_id === nickname.memory_id),
  ).toBe(false);
});

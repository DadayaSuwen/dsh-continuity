import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Migration } from '../../src/migration/migration.ts';
import { Memory } from '../../src/memory/memory.ts';
import { companionScope, companionZip } from '../fixtures/companion.ts';
import { createRuntime } from '../helpers/runtime.ts';
import { exportPackage, restorePackage } from '../../src/migration/package.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('restoring an older backup respects the destination deletion even after an edit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-deletion-restore-'));
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
  const nickname = (await memory.extract(companionScope, imported.source_id, 'c1')).find(
    (item) => item.fact_key === 'user.nickname',
  )!;
  const before = exportPackage(runtime.domain, companionScope);
  const edited = await memory.update(companionScope, nickname.memory_id, nickname.version, {
    content: '请叫我小禾，使用新编辑。',
  });
  await memory.delete(companionScope, edited.memory_id, edited.version);
  await restorePackage(runtime.domain, before, companionScope);
  expect(memory.list(companionScope).some((item) => item.memory_id === nickname.memory_id)).toBe(
    false,
  );
});

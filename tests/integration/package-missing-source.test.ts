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

it('reports deliberately removed sources and restores remaining excerpts only for re-review', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-removed-source-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const first = await createRuntime(join(root, 'a'));
  cleanup.push(first.dispose);
  const migration = new Migration(first.ctx, first.domain, {});
  const memory = new Memory(first.domain);
  const imported = await migration.commit(
    companionZip(),
    'chat.zip',
    companionScope,
    ['c1'],
    { id: 'workspace', path: first.workspace, attachSession: async () => {} },
    new AbortController().signal,
  );
  const candidates = await memory.extract(companionScope, imported.source_id, 'c1');
  await memory.confirm(companionScope, candidates[0]!.memory_id, candidates[0]!.version);
  await migration.deleteSource(companionScope, imported.source_id);
  const backup = exportPackage(first.domain, companionScope);
  const payload = JSON.parse(new TextDecoder().decode(backup)).payload;
  expect(payload.omitted_source_ids).toEqual([imported.source_id]);
  expect(payload.sources).toEqual([]);
  const second = await createRuntime(join(root, 'b'));
  cleanup.push(second.dispose);
  const destination = { ...companionScope, owner_id: 'restored-owner' };
  const result = await restorePackage(second.domain, backup, destination);
  expect(result.source_count).toBe(0);
  const restored = new Memory(second.domain).list(destination);
  expect(restored).toHaveLength(candidates.length);
  expect(
    restored.every(
      (item) =>
        item.status === 'candidate' && item.source_kind === 'unknown' && item.confirmed_at === null,
    ),
  ).toBe(true);
});

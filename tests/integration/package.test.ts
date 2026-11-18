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

it('backs up original bytes and approved memory and restores into a different explicit owner', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-package-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const first = await createRuntime(join(root, 'a'));
  cleanup.push(first.dispose);
  const migration = new Migration(first.ctx, first.domain, {});
  const memory = new Memory(first.domain);
  const source = companionZip();
  const imported = await migration.commit(
    source,
    'original.zip',
    companionScope,
    ['c1'],
    { id: 'workspace', path: first.workspace, attachSession: async () => {} },
    new AbortController().signal,
  );
  const candidates = await memory.extract(companionScope, imported.source_id, 'c1');
  const candidate = candidates[0]!;
  await memory.confirm(companionScope, candidate.memory_id, candidate.version);
  const backup = exportPackage(first.domain, companionScope);
  const second = await createRuntime(join(root, 'b'));
  cleanup.push(second.dispose);
  const destination = { ...companionScope, owner_id: 'restored-owner' };
  await restorePackage(second.domain, backup, destination);
  expect(
    new Memory(second.domain)
      .list(destination)
      .find((item) => item.memory_id === candidate.memory_id)?.status,
  ).toBe('active');
  expect(
    new Migration(second.ctx, second.domain, {}).source(destination, imported.source_id)
      ?.raw_base64,
  ).toBe(Buffer.from(source).toString('base64'));
  expect(new Memory(second.domain).list(companionScope)).toEqual([]);
  const parsed = JSON.parse(new TextDecoder().decode(backup));
  parsed.payload.memories.memories[0].content = 'corrupted';
  await expect(
    restorePackage(second.domain, new TextEncoder().encode(JSON.stringify(parsed)), destination),
  ).rejects.toThrow(/digest|checksum/i);
});

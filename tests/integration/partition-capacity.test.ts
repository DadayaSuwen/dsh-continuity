import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Migration } from '../../src/migration/migration.ts';
import { Memory } from '../../src/memory/memory.ts';
import { companionScope, companionZip } from '../fixtures/companion.ts';
import { createRuntime } from '../helpers/runtime.ts';
import { exportPackage, restorePackage } from '../../src/migration/package.ts';
import { digest } from '../../src/migration/preview.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it.each(['memories', 'tombstones'] as const)(
  'a full %s partition rejects overflow before durability and reopens intact',
  async (limit) => {
    const root = await mkdtemp(join(tmpdir(), 'continuity-capacity-'));
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
    const backup = JSON.parse(
      new TextDecoder().decode(exportPackage(runtime.domain, companionScope)),
    );
    backup.payload.memories.memories =
      limit === 'memories'
        ? Array.from({ length: 10000 }, (_, index) => ({
            ...candidate,
            memory_id: `memory_capacity_${index}`,
            content: `原文待审核称呼候选${index}`,
          }))
        : [candidate];
    backup.payload.memories.deleted_fingerprints =
      limit === 'tombstones'
        ? Array.from({ length: 20000 }, (_, index) => `deleted_capacity_${index}`)
        : [];
    backup.sha256 = digest(JSON.stringify(backup.payload));
    const destination = { ...companionScope, character_id: 'capacity-character' };
    await restorePackage(
      runtime.domain,
      new TextEncoder().encode(JSON.stringify(backup)),
      destination,
    );
    const stored = memory.list(destination);
    const operation =
      limit === 'memories'
        ? memory.propose(destination, {
            source_id: imported.source_id,
            source_session_id: 'c1',
            source_message_id: '1',
            source_excerpt: '请叫我小禾。',
            memory_type: 'user',
            content: '请叫我小禾。',
          })
        : memory.delete(destination, candidate.memory_id, candidate.version);
    await expect(operation).rejects.toThrow(/large|limit|maximum|10000|20000|capacity|overflow/i);
    expect(memory.list(destination)).toEqual(stored);
    await runtime.dispose();
    const reopened = await createRuntime(root);
    cleanup.push(reopened.dispose);
    expect(new Memory(reopened.domain).list(destination)).toEqual(stored);
  },
);

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

it.each(['assistant-as-user', 'fabricated-preview'] as const)(
  'validates raw provenance on checksum-correct backup %s',
  async (mode) => {
    const root = await mkdtemp(join(tmpdir(), 'continuity-evidence-'));
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
    await memory.extract(companionScope, imported.source_id, 'c1');
    const original = JSON.parse(
      new TextDecoder().decode(exportPackage(first.domain, companionScope)),
    );
    const fictional = original.payload.memories.memories.find(
      (item: { source_kind: string }) => item.source_kind === 'assistant-fiction',
    );
    fictional.memory_type = 'user';
    fictional.source_kind = 'user-statement';
    fictional.status = 'active';
    fictional.confirmed_at = Date.now();
    if (mode === 'fabricated-preview') {
      const message = original.payload.sources[0].preview.conversations[0].messages.find(
        (item: { id: string }) => item.id === fictional.source_message_id,
      );
      message.role = 'user';
      message.text = '我住在明月城';
      fictional.source_excerpt = message.text;
      fictional.content = message.text;
    }
    original.sha256 = digest(JSON.stringify(original.payload));
    const second = await createRuntime(join(root, 'b'));
    cleanup.push(second.dispose);
    await expect(
      restorePackage(second.domain, new TextEncoder().encode(JSON.stringify(original)), {
        ...companionScope,
        owner_id: 'restored-owner',
      }),
    ).rejects.toThrow(/evidence|provenance|user fact|preview/i);
    expect(
      new Memory(second.domain).list({ ...companionScope, owner_id: 'restored-owner' }),
    ).toEqual([]);
  },
);

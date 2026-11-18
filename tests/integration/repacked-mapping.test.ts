import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, zipSync, strToU8 } from 'fflate';
import * as Plugin from '../../src/index.ts';
import { createRuntime } from '../helpers/runtime.ts';
import { companionScope, companionZip } from '../fixtures/companion.ts';

it('links session-only memory from repacked duplicate archives to the reused official Session', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-repacked-'));
  const runtime = await createRuntime(root);
  try {
    await runtime.domain.close();
    await runtime.ctx.plugin(Plugin, {
      ...Plugin.DEFAULT_ARCHIVE_LIMITS,
      ownerId: 'owner',
      contextTokenBudget: 8192,
      batchEveryTurns: 0,
    });
    const service = runtime.ctx.continuity;
    const workspace = { id: 'workspace', path: runtime.workspace, attachSession: async () => {} };
    const files = unzipSync(companionZip());
    const firstBytes = zipSync(files);
    const original = await service.migration.commit(
      firstBytes,
      'chat.zip',
      companionScope,
      ['c1'],
      workspace,
      new AbortController().signal,
    );
    files['notes.txt'] = strToU8('A different unrelated export asset.');
    const duplicate = await service.migration.commit(
      zipSync(files),
      'changed-archive.zip',
      companionScope,
      ['c1'],
      workspace,
      new AbortController().signal,
    );
    expect(duplicate.duplicates[0]?.session_id).toBe(original.imported[0]!.session_id);
    const memory = await service.memory.propose(companionScope, {
      source_id: duplicate.source_id,
      source_session_id: 'c1',
      source_message_id: '3',
      source_excerpt: '银钥匙在我手里',
      memory_type: 'story',
      content: '新原件引用：银钥匙在我手里。',
      scope: 'session',
    });
    await service.memory.confirm(companionScope, memory!.memory_id, memory!.version);
    expect(service.recovery(companionScope, original.imported[0]!.session_id).text).toContain(
      '新原件引用',
    );
  } finally {
    await runtime.dispose();
    await rm(root, { recursive: true, force: true });
  }
});

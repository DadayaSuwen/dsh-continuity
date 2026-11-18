import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportPackage } from '../../src/migration/package.ts';
import { previewImport, digest } from '../../src/migration/preview.ts';
import { sourceKey } from '../../src/storage.ts';
import { companionScope } from '../fixtures/companion.ts';
import { createRuntime } from '../helpers/runtime.ts';

it('reports the v1 source-count ceiling before returning an unrestorable export', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-source-limit-'));
  const runtime = await createRuntime(root);
  try {
    // Native source records are a public Storage fixture; export is the seam under test.
    for (let index = 0; index < 1001; index++) {
      const bytes = new TextEncoder().encode(`用户：原始记录${index}。\n助手：已收到。`);
      const preview = await previewImport(bytes, 'chat.txt', {}, new AbortController().signal);
      const asset = {
        ...companionScope,
        source_id: preview.source_id,
        digest: digest(bytes),
        raw_base64: Buffer.from(bytes).toString('base64'),
        preview,
        created_at: 1,
      };
      await runtime.domain.table('sources').put(sourceKey(companionScope, asset.source_id), asset);
    }
    expect(() => exportPackage(runtime.domain, companionScope)).toThrow(/1000|large|maximum/i);
  } finally {
    await runtime.dispose();
    await rm(root, { recursive: true, force: true });
  }
});

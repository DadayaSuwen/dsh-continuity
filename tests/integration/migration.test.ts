import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionId } from '@deepseek-ai/dsh-session';
import { Migration } from '../../src/migration/migration.ts';
import { companionScope, companionZip } from '../fixtures/companion.ts';
import { createRuntime } from '../helpers/runtime.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('commits one selected official conversation, retains raw bytes, and reimport reuses its Session', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-continuity-import-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const runtime = await createRuntime(root);
  cleanup.push(runtime.dispose);
  const migration = new Migration(runtime.ctx, runtime.domain, {});
  const source = companionZip();
  const result = await migration.commit(
    source,
    'deepseek_data.zip',
    companionScope,
    ['c1'],
    { id: 'workspace', path: runtime.workspace, attachSession: async () => {} },
    new AbortController().signal,
  );
  expect(result.imported).toHaveLength(1);
  const id = SessionId(result.imported[0]!.session_id);
  const stored = await runtime.ctx.sessionPersistence.open(id, 'read');
  const log = await stored.read();
  await stored.close();
  expect(log.events.filter((event) => event.type === 'user/message')).toHaveLength(2);
  expect(migration.source(companionScope, result.source_id)?.raw_base64).toBe(
    Buffer.from(source).toString('base64'),
  );
  const again = await migration.commit(
    source,
    'same.zip',
    companionScope,
    ['c1'],
    { id: 'workspace', path: runtime.workspace, attachSession: async () => {} },
    new AbortController().signal,
  );
  expect(again.duplicates[0]?.session_id).toBe(id);
  expect((await runtime.ctx.sessionPersistence.list()).length).toBe(1);
});

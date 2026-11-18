import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, zipSync, strToU8 } from 'fflate';
import { Migration } from '../../src/migration/migration.ts';
import { Memory } from '../../src/memory/memory.ts';
import { companionScope, companionZip } from '../fixtures/companion.ts';
import { createRuntime } from '../helpers/runtime.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('extracts only the explicitly chosen import branch while retaining every raw branch', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-branch-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const runtime = await createRuntime(root);
  cleanup.push(runtime.dispose);
  const files = unzipSync(companionZip());
  const conversation = JSON.parse(new TextDecoder().decode(files['chat_sessions/c1.json']));
  conversation.messages.find((message: { id: number }) => message.id === 5).fragments = [
    { type: 'RESPONSE', content: '剧情：我们已到山城，当前场景在旧书店。' },
  ];
  files['chat_sessions/c1.json'] = strToU8(JSON.stringify(conversation));
  const bytes = zipSync(files);
  const migration = new Migration(runtime.ctx, runtime.domain, {});
  const memory = new Memory(runtime.domain);
  const imported = await migration.commit(
    bytes,
    'chat.zip',
    companionScope,
    ['c1'],
    { id: 'workspace', path: runtime.workspace, attachSession: async () => {} },
    new AbortController().signal,
    () => {},
    { c1: '5' },
  );
  const candidates = await memory.extract(companionScope, imported.source_id, 'c1', '5');
  expect(
    candidates.some((item) => item.memory_type === 'story' && item.content.includes('山城')),
  ).toBe(true);
  expect(candidates.some((item) => item.content.includes('灯塔'))).toBe(false);
  expect(migration.source(companionScope, imported.source_id)?.raw_base64).toBe(
    Buffer.from(bytes).toString('base64'),
  );
});

import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as Plugin from '../../../src/index.ts';
import { createRuntime } from '../../helpers/runtime.ts';
import { companionScope, companionZip } from '../../fixtures/companion.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('session-scoped imported memory follows its official source mapping and stays out of fresh Sessions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-session-scope-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const runtime = await createRuntime(root);
  await runtime.domain.close();
  cleanup.push(runtime.dispose);
  await runtime.ctx.plugin(Plugin, {
    ...Plugin.DEFAULT_ARCHIVE_LIMITS,
    ownerId: 'owner',
    contextTokenBudget: 8192,
    batchEveryTurns: 0,
  });
  const service = runtime.ctx.continuity;
  const imported = await service.migration.commit(
    companionZip(),
    'chat.zip',
    companionScope,
    ['c1'],
    { id: 'workspace', path: runtime.workspace, attachSession: async () => {} },
    new AbortController().signal,
  );
  const candidate = await service.memory.propose(companionScope, {
    source_id: imported.source_id,
    source_session_id: 'c1',
    source_message_id: '3',
    source_excerpt: '银钥匙在我手里',
    memory_type: 'story',
    content: '这一个会话里银钥匙在小禾手里。',
    scope: 'session',
  });
  await service.memory.confirm(companionScope, candidate!.memory_id, candidate!.version);
  expect(service.recovery(companionScope, imported.imported[0]!.session_id).text).toContain(
    '银钥匙',
  );
  expect(service.recovery(companionScope, 'fresh-session').text).not.toContain('银钥匙');
  expect(
    service.recovery({ ...companionScope, character_id: 'other' }, imported.imported[0]!.session_id)
      .text,
  ).not.toContain('银钥匙');
});

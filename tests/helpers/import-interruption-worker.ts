import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { SessionId } from '@deepseek-ai/dsh-session';
import Workspace from '@deepseek-ai/dsh-workspace';
import type { DomainChanged } from '@deepseek-ai/dsh-storage-domain/src/events.ts';
import type { SessionHandle } from '@deepseek-ai/dsh-session-persistence';
import { Migration } from '../../src/migration/migration.ts';
import { LedgerSchema } from '../../src/model.ts';
import { createRuntime } from './runtime.ts';
import { companionScope, companionZip } from '../fixtures/companion.ts';

const [stage, directory] = process.argv.slice(2);
if (!directory || !stage) throw new Error('Provide a crash stage and an isolated test directory');
const validStages = [
  'source-retained',
  'source-cancelled',
  'workspace-retryable-failure',
  'receipt-planned',
  'partial-flushed',
  'session-flushed',
  'session-closed',
  'workspace-attached',
  'receipt-imported',
  'verify',
];
if (!validStages.includes(stage)) throw new Error('Unknown interruption stage');
const runtime = await createRuntime(directory);
await runtime.ctx.plugin(Workspace);
const workspace = await runtime.ctx.workspaceRegistry.create(runtime.workspace);
const bytes = companionZip();
const migration = new Migration(runtime.ctx, runtime.domain, {});
const controller = new AbortController();
if (stage === 'source-cancelled')
  runtime.ctx.on(
    'domain/changed',
    (change: DomainChanged) => {
      if (
        change.domain === 'dsh_continuity' &&
        change.table === 'sources' &&
        change.operation === 'put'
      )
        controller.abort(new Error('Synthetic cancellation after durable raw source'));
    },
    { global: true },
  );
let snapshot: { session_id: string; event_count: number; prefix_sha256: string } | undefined;
const hash = (events: readonly unknown[]) =>
  createHash('sha256').update(JSON.stringify(events)).digest('hex');
function crash(point: string): void {
  if (stage !== point) return;
  writeFileSync(join(directory!, 'checkpoint.json'), JSON.stringify({ stage: point, snapshot }));
  process.stdout.write(JSON.stringify({ milestone: point, snapshot }) + '\n');
  process.exit(73);
}
if (stage === 'source-retained' || stage === 'receipt-planned' || stage === 'receipt-imported') {
  runtime.ctx.on(
    'domain/changed',
    (change: DomainChanged) => {
      if (change.domain !== 'dsh_continuity' || change.operation !== 'put') return;
      if (change.table === 'sources') crash('source-retained');
      if (change.table === 'imports') {
        const receipt = LedgerSchema.parse(change.value);
        if (receipt.session_id && receipt.expected_events > 0 && receipt.status === 'writing')
          crash('receipt-planned');
        if (receipt.status === 'imported') crash('receipt-imported');
      }
    },
    { global: true },
  );
}
if (stage === 'partial-flushed' || stage === 'session-flushed' || stage === 'session-closed') {
  const persistence = runtime.ctx.sessionPersistence;
  const original = persistence.create.bind(persistence);
  persistence.create = async (header, options) => {
    const handle: SessionHandle = await original(header, options);
    const append = handle.append.bind(handle);
    const flush = handle.flush.bind(handle);
    const close = handle.close.bind(handle);
    handle.append = async (events, appendOptions) => {
      if (stage === 'partial-flushed') {
        const prefix = events.slice(0, Math.max(1, Math.floor(events.length / 2)));
        await append(prefix, appendOptions);
        await flush();
        snapshot = {
          session_id: header.id,
          event_count: prefix.length,
          prefix_sha256: hash(prefix),
        };
        crash('partial-flushed');
      } else await append(events, appendOptions);
    };
    handle.flush = async (flushOptions) => {
      await flush(flushOptions);
      const events = (await handle.read()).events;
      snapshot = { session_id: header.id, event_count: events.length, prefix_sha256: hash(events) };
      crash('session-flushed');
    };
    handle.close = async () => {
      const events = (await handle.read()).events;
      snapshot = { session_id: header.id, event_count: events.length, prefix_sha256: hash(events) };
      await close();
      crash('session-closed');
    };
    return handle;
  };
}
const attach = workspace.attachSession.bind(workspace);
workspace.attachSession = async (id) => {
  if (stage === 'workspace-retryable-failure')
    throw new Error('Synthetic workspace attachment failure');
  await attach(id);
  crash('workspace-attached');
};
if (stage !== 'verify') {
  const operation = migration.commit(
    bytes,
    'synthetic.zip',
    companionScope,
    ['c1'],
    workspace,
    controller.signal,
  );
  if (stage === 'source-cancelled') {
    await assert.rejects(operation, /Synthetic cancellation/u);
    await migration.drain();
    assert.equal((await runtime.ctx.sessionPersistence.list()).length, 0);
    assert.equal(
      migration.listSources(companionScope)[0]?.raw_base64,
      Buffer.from(bytes).toString('base64'),
    );
    crash('source-cancelled');
  } else if (stage === 'workspace-retryable-failure') {
    const failure = await operation;
    assert.equal(failure.imported.length, 0);
    assert.equal(failure.failures.length, 1);
    assert.ok(failure.failures[0]?.session_id);
    const stored = await runtime.ctx.sessionPersistence.open(
      SessionId(failure.failures[0].session_id),
      'read',
    );
    const events = (await stored.read()).events;
    snapshot = { session_id: stored.id, event_count: events.length, prefix_sha256: hash(events) };
    await stored.close();
    crash('workspace-retryable-failure');
  } else await operation;
  throw new Error('Interruption point was not reached');
}
try {
  const sources = migration.listSources(companionScope);
  assert.equal(sources.length, 1, 'Crash must preserve exactly one original source');
  assert.equal(sources[0]?.raw_base64, Buffer.from(bytes).toString('base64'));
  const before = await runtime.ctx.sessionPersistence.list();
  const logs = new Map<string, readonly unknown[]>();
  for (const item of before) {
    const handle = await runtime.ctx.sessionPersistence.open(item.header.id, 'read');
    logs.set(item.header.id, (await handle.read()).events);
    await handle.close();
  }
  const checkpoint = JSON.parse(await readFile(join(directory, 'checkpoint.json'), 'utf8')) as {
    stage: string;
    snapshot?: { session_id: string; event_count: number; prefix_sha256: string };
  };
  if (checkpoint.snapshot) {
    const events = logs.get(checkpoint.snapshot.session_id);
    assert.ok(events, 'Acknowledged durable prefix must survive the hard process stop');
    assert.equal(events.length, checkpoint.snapshot.event_count);
    assert.equal(hash(events), checkpoint.snapshot.prefix_sha256);
  }
  if (checkpoint.stage === 'partial-flushed') {
    await assert.rejects(
      migration.commit(
        bytes,
        'synthetic.zip',
        companionScope,
        ['c1'],
        workspace,
        new AbortController().signal,
      ),
      /Partial Session|partial-import/u,
    );
    const after = await runtime.ctx.sessionPersistence.list();
    assert.equal(after.length, before.length, 'Partial retry must not mint or discard a Session');
    const id = checkpoint.snapshot!.session_id;
    const reader = await runtime.ctx.sessionPersistence.open(SessionId(id), 'read');
    assert.deepEqual(
      (await reader.read()).events,
      logs.get(id),
      'Partial history is retained, not rewritten',
    );
    await reader.close();
    console.log(
      JSON.stringify({
        result: 'passed',
        stage: checkpoint.stage,
        retained_source: true,
        partial_import_blocked: true,
        session_count: after.length,
        prefix_unchanged: true,
      }),
    );
  } else {
    const result = await migration.commit(
      bytes,
      'synthetic.zip',
      companionScope,
      ['c1'],
      workspace,
      new AbortController().signal,
    );
    assert.equal(result.failures.length, 0);
    const id = result.imported[0]?.session_id ?? result.duplicates[0]?.session_id;
    assert.ok(id, 'Retry must expose the committed official Session');
    if (before[0])
      assert.equal(id, before[0].header.id, 'Acknowledged complete Session must be reused');
    const again = await migration.commit(
      bytes,
      'synthetic.zip',
      companionScope,
      ['c1'],
      workspace,
      new AbortController().signal,
    );
    assert.equal(again.duplicates[0]?.session_id, id);
    const after = await runtime.ctx.sessionPersistence.list();
    assert.equal(after.length, 1);
    assert.equal(workspace.sessionIds.filter((member) => member === id).length, 1);
    if (logs.has(id)) {
      const reader = await runtime.ctx.sessionPersistence.open(SessionId(id), 'read');
      assert.deepEqual(
        (await reader.read()).events,
        logs.get(id),
        'Retry must not rewrite complete original events',
      );
      await reader.close();
    }
    assert.ok(runtime.domain.table('bindings').get(id));
    console.log(
      JSON.stringify({
        result: 'passed',
        stage: checkpoint.stage,
        retained_source: true,
        session_count: after.length,
        duplicate_reused: true,
        workspace_members: 1,
        prefix_unchanged: true,
        binding_restored: true,
      }),
    );
  }
} finally {
  await runtime.dispose();
}

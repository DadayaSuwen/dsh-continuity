import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkoutCommit, root } from './quality/common.mjs';

const script = fileURLToPath(import.meta.url);
const dist = join(root, 'dist/index.js');
const MiB = 1024 * 1024;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const cpuDelta = (before, after) => ({
  userMs: (after.userCPUTime - before.userCPUTime) / 1000,
  systemMs: (after.systemCPUTime - before.systemCPUTime) / 1000,
});

async function worker(spec) {
  assert.ok(
    Number.isSafeInteger(spec.payloadBytes) &&
      spec.payloadBytes > 0 &&
      spec.payloadBytes <= 32 * MiB,
    'Worker payload must stay within32MiB',
  );
  assert.ok(['stored', 'deflate'].includes(spec.method));
  assert.ok(['preview', 'entry-limit', 'in-flight-abort'].includes(spec.check));
  const send = (value) => {
    process.stdout.write(JSON.stringify(value) + '\n');
  };
  const memory = () => process.memoryUsage();
  const milestone = (name) =>
    send({
      type: 'milestone',
      name,
      atMs: performance.now(),
      memory: memory(),
      usage: process.resourceUsage(),
    });
  const builtBytes = await readFile(dist);
  assert.equal(hash(builtBytes), spec.distSha256, 'Built public parser changed during measurement');
  const { previewImport, DEFAULT_ARCHIVE_LIMITS } = await import(pathToFileURL(dist).href);
  const { companionZip } = await import(pathToFileURL(spec.fixture).href);
  const { zipSync, unzipSync } = await import('fflate');
  milestone('imports-ready');
  const creationUsage = process.resourceUsage();
  const creationStart = performance.now();
  const fixture = (() => {
    const files = unzipSync(companionZip());
    const payload = new Uint8Array(spec.payloadBytes);
    const words = new Uint32Array(payload.buffer);
    let seed = 0x12345678;
    for (let i = 0; i < words.length; i++) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      words[i] = seed >>> 0;
    }
    const archive = zipSync(
      { 'measurement/payload.bin': payload, ...files },
      { level: spec.method === 'stored' ? 0 : 6, mtime: new Date(2026, 0, 1, 0, 0, 0) },
    );
    const local = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    assert.equal(local.getUint16(8, true), spec.method === 'stored' ? 0 : 8);
    assert.equal(local.getUint32(22, true), payload.length);
    const expandedBytes =
      payload.length + Object.values(files).reduce((sum, bytes) => sum + bytes.length, 0);
    const payloadCompressedBytes = local.getUint32(18, true);
    const payloadRatio = payload.length / Math.max(1, payloadCompressedBytes);
    assert.ok(payloadRatio <= DEFAULT_ARCHIVE_LIMITS.maxCompressionRatio);
    return {
      archive,
      expandedBytes,
      payloadCompressedBytes,
      payloadRatio,
      sourceDigest: hash(archive),
      conversationDigest: hash(files['chat_sessions/c1.json']),
    };
  })();
  const creationEnd = performance.now();
  const creationCpu = cpuDelta(creationUsage, process.resourceUsage());
  milestone('fixture-created');
  const controller = new AbortController();
  assert.equal(controller.signal.aborted, false);
  const parseStart = performance.now();
  const parseUsage = process.resourceUsage();
  const parseBefore = memory();
  let peakSampledRss = parseBefore.rss;
  let sampleCount = 0;
  let settled = false;
  let abort;
  let abortTimer;
  const sampleTimer = setInterval(() => {
    const rss = memory().rss;
    peakSampledRss = Math.max(peakSampledRss, rss);
    sampleCount++;
    send({ type: 'sample', phase: 'preview', elapsedMs: performance.now() - parseStart, rss });
  }, 15);
  milestone('preview-start');
  const limits = spec.check === 'entry-limit' ? { maxEntryBytes: spec.payloadBytes - 1 } : {};
  const pending = previewImport(
    fixture.archive,
    'synthetic-resources.zip',
    limits,
    controller.signal,
  );
  void pending.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  const returnedMs = performance.now() - parseStart;
  if (spec.check === 'in-flight-abort')
    abortTimer = setTimeout(() => {
      abort = {
        requestedMs: performance.now() - parseStart,
        pendingAtAbort: !settled,
        alreadyAborted: controller.signal.aborted,
      };
      controller.abort(new DOMException('Synthetic in-flight resource cancellation', 'AbortError'));
      send({ type: 'milestone', name: 'abort-requested', ...abort, memory: memory() });
    }, 5);
  let preview;
  let failure;
  try {
    preview = await pending;
  } catch (error) {
    failure = { name: error.name, code: error.code ?? null, message: error.message };
  } finally {
    clearInterval(sampleTimer);
    clearTimeout(abortTimer);
  }
  const parseElapsedMs = performance.now() - parseStart;
  const parseAfter = memory();
  peakSampledRss = Math.max(peakSampledRss, parseAfter.rss);
  const finalUsage = process.resourceUsage();
  milestone('preview-settled');
  assert.equal(
    hash(fixture.archive),
    fixture.sourceDigest,
    'Preview mutated original archive bytes',
  );
  if (spec.check === 'entry-limit') {
    assert.equal(failure?.code, 'too-large', 'Known oversized entry was not rejected');
    assert.equal(preview, undefined);
  } else if (spec.check === 'in-flight-abort') {
    assert.ok(abort?.pendingAtAbort, 'Abort did not occur while actual inflate was pending');
    assert.equal(abort.alreadyAborted, false);
    assert.equal(failure?.name, 'AbortError');
    assert.equal(preview, undefined);
  } else {
    assert.equal(failure, undefined, JSON.stringify(failure));
    assert.equal(preview.format, 'deepseek-v3');
    assert.equal(preview.source_id, `source:${fixture.sourceDigest}`);
    assert.equal(preview.conversation_count, 1);
    assert.equal(preview.message_count, 5);
    assert.equal(preview.conversations[0].supported, true);
    assert.equal(preview.conversations[0].id, 'c1');
    assert.equal(preview.conversations[0].active_branch, '4');
    assert.equal(preview.conversations[0].digest, fixture.conversationDigest);
    assert.equal(preview.conversations[0].messages[0].text, '角色：你叫林，沉稳温柔。请叫我小禾。');
  }
  assert.equal(
    hash(await readFile(dist)),
    spec.distSha256,
    'Built public parser changed during execution',
  );
  const wholeChildUsage = process.resourceUsage();
  send({
    type: 'result',
    result: 'passed',
    id: spec.id,
    repetition: spec.repetition,
    method: spec.method,
    check: spec.check,
    payloadBytes: spec.payloadBytes,
    archiveBytes: fixture.archive.length,
    expandedBytes: fixture.expandedBytes,
    payloadCompressedBytes: fixture.payloadCompressedBytes,
    payloadRatio: fixture.payloadRatio,
    sourceSha256: fixture.sourceDigest,
    originalBytesUnchanged: true,
    conversationCount: preview?.conversation_count ?? null,
    messageCount: preview?.message_count ?? null,
    fixtureCreation: { elapsedMs: creationEnd - creationStart, cpu: creationCpu },
    preview: {
      elapsedMs: parseElapsedMs,
      syncCallPreludeMs: returnedMs,
      cpu: cpuDelta(parseUsage, finalUsage),
      before: parseBefore,
      after: parseAfter,
      peakObservedRssBytes: peakSampledRss,
      timerSampleCount: sampleCount,
      timerIntervalMs: 15,
    },
    wholeChildMaxRssBytes: wholeChildUsage.maxRSS * 1024,
    wholeChildMaxRssKiB: wholeChildUsage.maxRSS,
    wholeChildPeakIncludesFixtureAndImports: true,
    abort: abort
      ? { ...abort, observedRejectionAfterAbortMs: parseElapsedMs - abort.requestedMs }
      : null,
    failure: failure ?? null,
    persistenceCalled: false,
    defaultLimits: DEFAULT_ARCHIVE_LIMITS,
  });
}

async function main() {
  if (process.versions.node.split('.')[0] !== '24')
    throw new Error('Use the existing project-local Node24 runtime');
  const built = await readFile(dist);
  const distSha256 = hash(built);
  await mkdir(join(root, '.runtime/round-3'), { recursive: true });
  const output = await mkdtemp(join(root, '.runtime/round-3/resource-'));
  const fixture = join(output, 'companion.mjs');
  const { build } = await import('esbuild');
  await build({
    entryPoints: [join(root, 'tests/fixtures/companion.ts')],
    outfile: fixture,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node24',
    external: ['fflate'],
  });
  const cases = [1, 8, 32].flatMap((size) =>
    ['stored', 'deflate'].map((method) => ({
      id: `${method}-${size}MiB`,
      method,
      payloadBytes: size * MiB,
      check: 'preview',
    })),
  );
  cases.push(
    { id: 'entry-limit-8MiB', method: 'stored', payloadBytes: 8 * MiB, check: 'entry-limit' },
    {
      id: 'in-flight-abort-32MiB',
      method: 'deflate',
      payloadBytes: 32 * MiB,
      check: 'in-flight-abort',
    },
  );
  const repeat = process.argv.includes('--repeat=2') ? 2 : 1;
  const report = {
    startedAt: new Date().toISOString(),
    sourceCommit: checkoutCommit(),
    distSha256,
    distBytes: built.length,
    harnessSha256: hash(await readFile(script)),
    companionFixtureSha256: hash(await readFile(join(root, 'tests/fixtures/companion.ts'))),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      osRelease: os.release(),
      cpuModel: os.cpus()[0]?.model,
      logicalCpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
      freeMemoryBytesAtStart: os.freemem(),
      uvThreadpoolSize: process.env.UV_THREADPOOL_SIZE ?? 'default',
      fflate: JSON.parse(await readFile(join(root, 'node_modules/fflate/package.json'), 'utf8'))
        .version,
    },
    scope:
      'Synthetic binary archive workload with unchanged five-message official-v3 companion; no real App/novel/Host or model workload',
    measurement:
      'One fresh Node child per case, concurrency1, child15ms RSS timer plus phase snapshots; OS resourceUsage.maxRSS in KiB includes fixture creation/imports',
    repeats: repeat,
    result: 'running',
    cases: [],
    limitations: [
      'RSS samples miss synchronous JSON/CRC/generation intervals',
      'Whole-child maxRSS is not plugin-only memory',
      'Abort is observed after awaited inflate settles and does not cancel zlib work',
      'No persistence, fullSession/attachment, realApp, liveLLM or device acceptance',
      'Default128MiB upload/512MiB expansion and64MiB entries are not stress-validated',
    ],
  };
  const save = () =>
    writeFile(join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  await save();
  try {
    for (let repetition = 1; repetition <= repeat; repetition++)
      for (const item of cases) {
        const spec = { ...item, repetition, fixture, distSha256 };
        const env = Object.fromEntries(
          Object.entries(process.env).filter(
            ([name]) =>
              !/TOKEN|SECRET|PASSWORD|API_KEY|CREDENTIAL|COOKIE|DSH_|NODE_PATH|NODE_OPTIONS/iu.test(
                name,
              ),
          ),
        );
        for (const name of Object.keys(env)) if (name.toLowerCase() === 'path') delete env[name];
        env.PATH = [dirname(process.execPath), process.env.Path ?? process.env.PATH ?? ''].join(
          process.platform === 'win32' ? ';' : ':',
        );
        const outcome = await new Promise((resolveOutcome) => {
          const child = spawn(process.execPath, [script, '--worker', JSON.stringify(spec)], {
            cwd: root,
            env,
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          let stdout = '';
          let stderr = '';
          let timedOut = false;
          const timer = setTimeout(() => {
            timedOut = true;
            child.kill('SIGTERM');
          }, 120000);
          child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
          });
          child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
          });
          child.once('error', (error) => {
            stderr += error.message;
          });
          child.once('close', (code, signal) => {
            clearTimeout(timer);
            resolveOutcome({ code, signal, timedOut, stdout, stderr });
          });
        });
        await writeFile(join(output, `${item.id}-r${repetition}.jsonl`), outcome.stdout);
        await writeFile(join(output, `${item.id}-r${repetition}.stderr.txt`), outcome.stderr);
        const events = outcome.stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line));
        const result = events.findLast((event) => event.type === 'result');
        const previous = report.cases.find((item) => item.id === spec.id && item.sourceSha256);
        if (previous && result)
          assert.equal(
            result.sourceSha256,
            previous.sourceSha256,
            'Fixed-seed ZIP bytes changed between repetitions',
          );
        const record = {
          id: item.id,
          repetition,
          exitCode: outcome.code,
          signal: outcome.signal,
          timedOut: outcome.timedOut,
          ...(result ?? {
            result: 'failed',
            error: outcome.stderr.slice(0, 3000) || 'Child emitted no completed measurement',
          }),
        };
        report.cases.push(record);
        await save();
        console.log(
          JSON.stringify({
            id: item.id,
            repetition,
            result: record.result,
            exitCode: record.exitCode,
            fixtureMs: result?.fixtureCreation.elapsedMs,
            previewMs: result?.preview.elapsedMs,
            peakChildMiB: result ? result.wholeChildMaxRssBytes / MiB : null,
            previewObservedMiB: result ? result.preview.peakObservedRssBytes / MiB : null,
            error: result?.failure?.name ?? record.error ?? null,
          }),
        );
      }
    assert.equal(
      hash(await readFile(dist)),
      distSha256,
      'Existing built parser changed during run',
    );
    report.result = report.cases.every((item) => item.exitCode === 0 && item.result === 'passed')
      ? 'passed'
      : 'failed';
    report.finishedAt = new Date().toISOString();
    await save();
    console.log(
      JSON.stringify({
        result: report.result,
        evidence: `.runtime/round-3/${output.split(/[\\/]/u).at(-1)}/results.json`,
        cases: report.cases.length,
        distSha256,
      }),
    );
    if (report.result !== 'passed') process.exitCode = 1;
  } catch (error) {
    report.result = 'failed';
    report.error = `${error.name}: ${error.message}`;
    report.finishedAt = new Date().toISOString();
    await save();
    throw error;
  }
}

try {
  if (process.argv[2] === '--worker') await worker(JSON.parse(process.argv[3]));
  else await main();
} catch (error) {
  console.error(`${error.name}: ${error.message}`);
  process.exitCode = 1;
}

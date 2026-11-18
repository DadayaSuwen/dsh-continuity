import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { unzipSync } from 'fflate';
import { checkoutCommit, evidence, pkg, pnpm, root } from './quality/common.mjs';

const input = process.argv.slice(2).filter((arg) => arg !== '--');
assert.equal(input.length, 1, 'Provide one source ZIP: pnpm test:source -- path/to/source.zip');
const archive = readFileSync(resolve(input[0]));
assert.ok(archive.length <= 16 * 1024 * 1024, 'Source archive exceeds16MiB');
const manifest = pkg();
const prefix = `${manifest.name}-${manifest.version}/`;
let expanded = 0;
let count = 0;
const contents = unzipSync(archive, {
  filter(file) {
    assert.ok(
      ++count <= 1000 && file.originalSize <= 4 * 1024 * 1024,
      'Source entry exceeds bounded smoke limits',
    );
    expanded += file.originalSize;
    assert.ok(expanded <= 32 * 1024 * 1024, 'Source archive expansion exceeds32MiB');
    assert.ok(
      file.name.startsWith(prefix) &&
        !/[\\:\u0000]/u.test(file.name) &&
        !file.name.split('/').some((part) => part === '.' || part === '..'),
      'Unexpected source archive path',
    );
    return true;
  },
});
const directory = mkdtempSync(join(tmpdir(), 'dsh-continuity-source-smoke-'));
for (const [file, bytes] of Object.entries(contents)) {
  if (file.endsWith('/')) continue;
  const target = join(directory, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes, { flag: 'wx' });
}
const consumer = join(directory, `${manifest.name}-${manifest.version}`);
for (const file of ['.git', '.toolchain', 'node_modules', 'dist'])
  assert.equal(existsSync(join(consumer, file)), false, `Source ZIP must not include ${file}`);
assert.ok(existsSync(join(consumer, 'pnpm-lock.yaml')), 'Source ZIP must contain its lockfile');
assert.equal(
  checkoutCommit(consumer),
  null,
  'Extracted archive must not inherit a checkout identity',
);
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([name]) =>
      !/TOKEN|SECRET|PASSWORD|API_KEY|CREDENTIAL|COOKIE|DSH_|GIT_|NODE_PATH|NODE_OPTIONS|NPM_CONFIG_|PNPM_HOME/iu.test(
        name,
      ),
  ),
);
env.HOME = directory;
env.USERPROFILE = directory;
env.npm_config_userconfig = join(directory, '.npmrc');
writeFileSync(
  env.npm_config_userconfig,
  'registry=https://registry.npmjs.org/\nauto-install-peers=true\n',
  { flag: 'wx' },
);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const report = {
  checkedAt: new Date().toISOString(),
  archiveSha256: hash(archive),
  archiveBytes: archive.length,
  sourceCommit: null,
  directory,
  consumer,
  result: 'failed',
  steps: [],
  scope:
    'Actual source ZIP, fresh directory, frozen installed official dependencies; no copied node_modules or Git initialization',
};
const log = [];
function step(name, args) {
  try {
    const output = pnpm(args, { cwd: consumer, env, timeout: 120000 });
    log.push(`## ${name}\n${output}`);
    report.steps.push({ name, result: 'passed' });
    console.log(`${name}: passed`);
  } catch (error) {
    log.push(`## ${name}\n${error.message}`);
    report.steps.push({ name, result: 'failed', error: error.message });
    throw error;
  }
}
const read = (file) => JSON.parse(readFileSync(join(consumer, file), 'utf8'));
try {
  step('frozen install', ['install', '--frozen-lockfile']);
  step('production build', ['build']);
  step('public quality self-test', ['exec', 'node', 'scripts/quality/self-test.mjs']);
  step('published official runtime', [
    'test',
    '--reporter=default',
    '--reporter=junit',
    '--outputFile.junit=test-results/source-junit.xml',
  ]);
  const header =
    readFileSync(join(consumer, 'test-results/source-junit.xml'), 'utf8').match(
      /<testsuites\b[^>]+>/u,
    )?.[0] ?? '';
  const tests = Object.fromEntries(
    [...header.matchAll(/\b(tests|errors|failures|skipped)="(\d+)"/gu)].map(([, key, value]) => [
      key,
      Number(value),
    ]),
  );
  assert.ok(
    tests.tests > 0 && !tests.errors && !tests.failures && !tests.skipped,
    'Source ZIP runtime must execute nonempty successful tests',
  );
  step('durable interruption checkpoints', ['test:interruption']);
  const interruption = read('test-results/import-interruption.json');
  assert.equal(interruption.sourceCommit, null);
  assert.equal(interruption.stages.length, 9);
  assert.ok(
    interruption.stages.every(
      (item) => item.result === 'passed' && item.interruptedExit === 73 && item.restartedExit === 0,
    ),
  );
  step('bounded repeated resources', ['test:resources', '--', '--repeat=2']);
  const summary = log
    .at(-1)
    .split('\n')
    .findLast((line) => line.startsWith('{"result":'));
  assert.ok(summary, 'Resource command must emit completed evidence');
  const resources = read(JSON.parse(summary).evidence);
  assert.equal(resources.sourceCommit, null);
  assert.equal(resources.cases.length, 16);
  assert.ok(
    resources.cases.every(
      (item) => item.result === 'passed' && item.exitCode === 0 && !item.timedOut,
    ),
  );
  step('packed native official Loader', ['test:packed']);
  const packed = read('test-results/packed-smoke.json');
  assert.equal(packed.result, 'passed');
  assert.ok(packed.loader.packedLocalLinks > 0);
  report.runtime = tests;
  report.interruption = {
    result: interruption.result,
    sourceCommit: null,
    checkpoints: 9,
    harnessSha256: interruption.harnessSha256,
  };
  report.resources = {
    result: resources.result,
    sourceCommit: null,
    distinctCases: 8,
    observations: 16,
    harnessSha256: resources.harnessSha256,
    distSha256: resources.distSha256,
    capacityCeilingClaim: false,
  };
  report.packed = {
    result: packed.result,
    bytes: packed.tarball.bytes,
    sha256: packed.tarball.sha256,
    markdown: packed.loader.packedMarkdown,
    localTargets: packed.loader.packedLocalLinks,
  };
  assert.equal(checkoutCommit(consumer), null);
  assert.equal(
    hash(readFileSync(join(consumer, 'pnpm-lock.yaml'))),
    hash(contents[`${prefix}pnpm-lock.yaml`]),
    'Frozen install must not edit source lockfile',
  );
  report.result = 'passed';
} catch (error) {
  report.error = error.message;
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  evidence('source-smoke.json', report);
  writeFileSync(join(root, 'test-results/source-smoke.log'), log.join('\n'));
}
console.log(JSON.stringify(report, null, 2));

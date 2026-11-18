import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { compareSource } from './check-compatibility.mjs';
import { evidence, pkg, readJson, root, run } from './quality/common.mjs';

const contract = readJson(join(root, 'COMPATIBILITY.json'));
const before = readFileSync(join(root, 'COMPATIBILITY.json'), 'utf8');
const report = {
  checkedAt: new Date().toISOString(),
  repository: contract.repository,
  branch: 'master',
  stablePin: contract.sha,
  npmVersion: contract.dshVersion,
  result: 'failed',
  steps: [],
  apiChanges: [],
  note: 'Latest official source only; stable pin and dependencies are never updated by this probe',
};
const log = [];
const results = join(root, '.test/results');
mkdirSync(results, { recursive: true });

try {
  if (
    contract.repository !== 'https://github.com/DeepSeek-ai/deepseek-harness' ||
    contract.branch !== 'master' ||
    !/^[a-f0-9]{40}$/.test(contract.sha)
  )
    throw new Error(
      'Latest probe requires the official repository/master and complete stable Git SHA',
    );
  run('git', ['check-ignore', '--quiet', '.test/results/upstream-probe']);
  if (!existsSync(join(root, 'scripts/test-pinned.mjs')) || !pkg().scripts?.['test:pinned'])
    throw new Error('Lead-owned scripts/test-pinned.mjs and pnpm test:pinned are required');
  const working = mkdtempSync(join(results, 'upstream-'));
  const source = join(working, 'deepseek-harness');
  report.source = source;
  run(
    'git',
    [
      'clone',
      '--depth',
      '1',
      '--filter=blob:none',
      '--no-checkout',
      '--single-branch',
      '--branch',
      'master',
      '--',
      `${contract.repository}.git`,
      source,
    ],
    {
      timeout: 10 * 60 * 1000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
    },
  );
  report.sha = run('git', ['-C', source, 'rev-parse', 'HEAD']).trim();
  if (!/^[a-f0-9]{40}$/.test(report.sha))
    throw new Error('Latest checkout did not yield a full Git SHA');
  report.steps.push({ step: 'clone-and-record-SHA', result: 'passed', sha: report.sha });
  run('git', ['-C', source, 'sparse-checkout', 'init', '--cone']);
  run('git', ['-C', source, 'sparse-checkout', 'set', 'packages', 'vendor'], {
    timeout: 10 * 60 * 1000,
  });
  run('git', ['-C', source, 'checkout', '--detach', report.sha], { timeout: 10 * 60 * 1000 });
  report.checkout =
    'Sparse official root + packages/vendor; exact committed source, no npm substitutions';
  writeFileSync(join(working, 'SHA'), `${report.sha}\n`);
  report.publishedSourceDiff = compareSource(source);
  // Export/symbol failures are collected from real Vite-alias tests, not guessed from npm versions.
  const result = spawnSync(process.execPath, [join(root, 'scripts/test-pinned.mjs')], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 30 * 60 * 1000,
    env: { ...process.env, DSH_SOURCE_ROOT: source },
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  log.push(output);
  console.log(output);
  report.exitCode = result.status;
  report.apiChanges = [
    ...new Set(
      output
        .split('\n')
        .filter((line) =>
          /does not provide an export|not exported|not a function|cannot find module|cannot find package|TS23\d\d|TS27\d\d|TS70\d\d|TypeError:|SyntaxError:/i.test(
            line,
          ),
        ),
    ),
  ].slice(0, 80);
  report.steps.push({
    step: 'Lead test-pinned against latest DSH_SOURCE_ROOT',
    result: result.status === 0 ? 'passed' : 'failed',
    error: result.error?.message,
  });
  const pinFile = join(root, 'test-results/pinned-compatibility.json');
  if (existsSync(pinFile)) report.runtime = readJson(pinFile);
  const stableSource = resolve(
    process.env.STABLE_DSH_SOURCE_ROOT ?? join(root, 'upstream/deepseek-harness'),
  );
  if (existsSync(join(stableSource, 'package.json'))) {
    const stableSha = run('git', ['-C', stableSource, 'rev-parse', 'HEAD']).trim();
    if (stableSha === contract.sha) {
      const changed = [];
      for (const entry of report.publishedSourceDiff) {
        if (!entry.source) continue;
        const latestFile = join(source, entry.source);
        const stableFile = join(stableSource, entry.source);
        if (!existsSync(latestFile) || !existsSync(stableFile)) {
          changed.push({ path: entry.source, result: 'added-or-removed' });
          continue;
        }
        const diff = spawnSync('git', ['diff', '--no-index', '--', stableFile, latestFile], {
          encoding: 'utf8',
          maxBuffer: 4 * 1024 * 1024,
        });
        if (diff.status === 1) {
          changed.push({ path: entry.source, result: 'DIFF' });
          log.push(diff.stdout);
        } else if (diff.status !== 0) log.push(diff.stderr ?? 'Source diff failed');
      }
      report.stableSourceDiff = { sha: stableSha, changed };
    } else
      report.stableSourceDiff = {
        result: 'not-run',
        reason: 'Available stable clone is not at the contracted SHA',
      };
  } else
    report.stableSourceDiff = {
      result: 'not-run',
      reason: 'No separate stable clone; published source diff is still recorded',
    };
  if (result.error || result.status !== 0)
    throw new Error(result.error?.message ?? `Latest source runtime check exited ${result.status}`);
  if (report.runtime?.sha !== report.sha || report.runtime?.result !== 'passed')
    throw new Error('test-pinned evidence did not confirm the exact latest source SHA');
  report.result = 'passed';
} catch (error) {
  report.error = error.message;
  log.push(error.stack ?? error.message);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  report.stablePinUnchanged = readFileSync(join(root, 'COMPATIBILITY.json'), 'utf8') === before;
  if (!report.stablePinUnchanged) {
    report.result = 'failed';
    report.error = 'Stable compatibility contract changed during probe';
    process.exitCode = 1;
  }
  evidence('upstream-compatibility.json', report);
  writeFileSync(join(root, 'test-results/upstream-compatibility.log'), `${log.join('\n')}\n`);
  writeFileSync(
    join(root, 'test-results/upstream-compatibility.md'),
    `# Latest DSH compatibility\n\n- Result: ${report.result}\n- Latest SHA: ${report.sha ?? 'clone not completed'}\n- Stable pin: ${contract.sha} (unchanged: ${report.stablePinUnchanged})\n- npm contract: ${contract.dshVersion}; equal version is not equal source.\n- Runtime: real Lead test-pinned with DSH_SOURCE_ROOT; model IO scripted only.\n\n## API failure signals\n\n${report.apiChanges.length ? report.apiChanges.join('\n') : (report.error ?? 'No runtime API failure signals')}\n\nSee upstream-compatibility.json and upstream-compatibility.log for source differences and test output.\n`,
  );
}

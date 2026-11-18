import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkoutCommit, evidence, root } from './quality/common.mjs';

if (process.versions.node.split('.')[0] !== '24')
  throw new Error('Use the project Node24 toolchain');
await mkdir(join(root, '.runtime/round-3'), { recursive: true });
const directory = await mkdtemp(join(root, '.runtime/round-3/interruption-'));
const worker = join(directory, 'worker.mjs');
const require = createRequire(import.meta.url);
await build({
  entryPoints: [join(root, 'tests/helpers/import-interruption-worker.ts')],
  outfile: worker,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  plugins: [
    {
      name: 'actual-official-runtime',
      setup(builder) {
        builder.onResolve({ filter: /^[^./]/ }, (args) => {
          if (args.kind === 'entry-point') return;
          if (args.path.startsWith('node:')) return { path: args.path, external: true };
          if (args.path.startsWith('@deepseek-ai/dsh-deepseek-chat-import/src/')) return;
          try {
            return { path: pathToFileURL(require.resolve(args.path)).href, external: true };
          } catch {
            return {
              path: pathToFileURL(
                createRequire(require.resolve('@deepseek-ai/dsh/package.json')).resolve(args.path),
              ).href,
              external: true,
            };
          }
        });
      },
    },
  ],
});
const report = {
  checkedAt: new Date().toISOString(),
  node: process.version,
  sourceCommit: checkoutCommit(),
  harnessSha256: createHash('sha256')
    .update(await readFile(join(root, 'scripts/check-import-interruption.mjs')))
    .digest('hex'),
  workerSha256: createHash('sha256')
    .update(await readFile(join(root, 'tests/helpers/import-interruption-worker.ts')))
    .digest('hex'),
  scope:
    'Hard process exits at known durable milestones; real official Storage/Session/Workspace, synthetic ZIP only',
  result: 'failed',
  directory,
  stages: [],
};
const childEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    ([name]) =>
      !/TOKEN|SECRET|PASSWORD|API_KEY|CREDENTIAL|COOKIE|DSH_|NODE_PATH|NODE_OPTIONS/iu.test(name),
  ),
);
async function run(stage, data) {
  const child = spawn(process.execPath, [worker, stage, data], {
    cwd: root,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  const timer = setTimeout(() => child.kill('SIGTERM'), 30000);
  try {
    return await new Promise((resolveResult, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => resolveResult({ code, signal, stdout, stderr }));
    });
  } finally {
    clearTimeout(timer);
  }
}
try {
  for (const stage of [
    'source-retained',
    'source-cancelled',
    'workspace-retryable-failure',
    'receipt-planned',
    'partial-flushed',
    'session-flushed',
    'session-closed',
    'workspace-attached',
    'receipt-imported',
  ]) {
    const data = join(directory, stage);
    await mkdir(data);
    const interrupted = await run(stage, data);
    await writeFile(
      join(directory, `${stage}-interrupted.log`),
      interrupted.stdout + '\n' + interrupted.stderr,
    );
    assert.equal(
      interrupted.code,
      73,
      `${stage}: checkpoint was not reached or worker failed:${interrupted.stderr}`,
    );
    const checkpoint = JSON.parse(await readFile(join(data, 'checkpoint.json'), 'utf8'));
    assert.equal(checkpoint.stage, stage);
    const verified = await run('verify', data);
    await writeFile(
      join(directory, `${stage}-restart.log`),
      verified.stdout + '\n' + verified.stderr,
    );
    assert.equal(verified.code, 0, `${stage}: restart failed:${verified.stderr}`);
    const summary = verified.stdout
      .trim()
      .split('\n')
      .findLast((line) => line.startsWith('{'));
    const result = summary ? JSON.parse(summary) : undefined;
    assert.equal(result?.result, 'passed', `${stage}: no successful restart observation`);
    report.stages.push({
      stage,
      interruptedExit: interrupted.code,
      restartedExit: verified.code,
      ...result,
    });
    console.log(
      `${stage}: hard-stop73 → restart0; retained original and official history verified`,
    );
  }
  report.result = 'passed';
} catch (error) {
  report.error = error.message;
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  evidence('import-interruption.json', report);
  await writeFile(join(directory, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));

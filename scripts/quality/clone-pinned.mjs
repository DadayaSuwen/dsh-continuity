import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { evidence, readJson, root, run } from './common.mjs';

const contract = readJson(join(root, 'COMPATIBILITY.json'));
const source = join(root, 'upstream/deepseek-harness');
if (existsSync(source)) {
  const head = run('git', ['-C', source, 'rev-parse', 'HEAD']).trim();
  if (head !== contract.sha)
    throw new Error(
      `Existing official clone ${head} differs from ${contract.sha}; leave it untouched and provide an exact checkout`,
    );
} else {
  if (
    contract.repository !== 'https://github.com/DeepSeek-ai/deepseek-harness' ||
    !/^[a-f0-9]{40}$/.test(contract.sha)
  )
    throw new Error('Expected exact official source contract');
  mkdirSync(dirname(source), { recursive: true });
  run(
    'git',
    ['clone', '--no-checkout', '--filter=blob:none', '--', `${contract.repository}.git`, source],
    { timeout: 10 * 60 * 1000 },
  );
  run('git', ['-C', source, 'checkout', '--detach', contract.sha], { timeout: 10 * 60 * 1000 });
}
const sha = run('git', ['-C', source, 'rev-parse', 'HEAD']).trim();
if (sha !== contract.sha)
  throw new Error('Official source checkout did not resolve the exact pinned SHA');
if (run('git', ['-C', source, 'status', '--porcelain', '--untracked-files=no']).trim())
  throw new Error(
    'Audited official source has tracked modifications; leave it untouched and investigate before testing',
  );
evidence('pinned-source.json', {
  source,
  repository: contract.repository,
  sha,
  result: 'passed',
  note: 'Source read only after exact checkout; no installation/build inside official clone',
});
console.log(`Exact official pinned source: ${sha}`);

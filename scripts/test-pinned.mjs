import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const source = resolve(process.env.DSH_SOURCE_ROOT ?? 'upstream/deepseek-harness');
if (!existsSync(`${source}/package.json`))
  throw new Error('Clone audited DSH source first or set DSH_SOURCE_ROOT');
const sha = spawnSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
if (sha.status !== 0) throw new Error(`DSH source SHA is unavailable: ${sha.stderr}`);
const result = spawnSync(
  process.execPath,
  [
    'node_modules/vitest/vitest.mjs',
    'run',
    '--config',
    'vitest.pinned.config.ts',
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit', env: { ...process.env, DSH_SOURCE_ROOT: source } },
);
mkdirSync('test-results', { recursive: true });
writeFileSync(
  'test-results/pinned-compatibility.json',
  JSON.stringify(
    {
      repository: 'https://github.com/DeepSeek-ai/deepseek-harness',
      sha: sha.stdout.trim(),
      source,
      node: process.version,
      result: result.status === 0 ? 'passed' : 'failed',
      exit_code: result.status,
      tested_at: new Date().toISOString(),
      note: 'Official source module aliases, real Cordis/Storage/Session/AgentLoop; external model IO scripted',
    },
    null,
    2,
  ),
);
process.exit(result.status ?? 1);

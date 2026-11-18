import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
export const pkg = () => readJson(join(root, 'package.json'));
export const evidence = (name, value) => {
  const file = join(root, 'test-results', name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
};

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
    ...options,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')}: ${result.error?.message ?? `exit ${result.status}`}\n${result.stderr ?? ''}\n${result.stdout ?? ''}`,
    );
  }
  return result.stdout;
}

// Use the caller's pnpm, or this project's isolated toolchain. Never switch Node versions.
export function pnpm(args, options = {}) {
  const candidates = [
    process.env.PNPM_SCRIPT,
    process.env.npm_execpath,
    join(root, '.toolchain/pnpm/node_modules/pnpm/bin/pnpm.mjs'),
  ].filter(Boolean);
  const script = candidates.find((file) => /pnpm\.(?:cjs|mjs|js)$/.test(file) && existsSync(file));
  const env = { ...(options.env ?? process.env) };
  for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
  const bins = [
    dirname(process.execPath),
    ...(script ? [resolve(dirname(script), '../../.bin')] : []),
  ];
  env.PATH = [
    ...bins,
    options.env?.Path ?? options.env?.PATH ?? process.env.Path ?? process.env.PATH ?? '',
  ].join(process.platform === 'win32' ? ';' : ':');
  if (script) return run(process.execPath, [script, ...args], { ...options, env });
  if (process.platform === 'win32') throw new Error('Set PNPM_SCRIPT to pnpm.mjs/cjs on Windows');
  return run('pnpm', args, { ...options, env });
}

// Resolve manifests from the requesting package, not from a flat devDependency list.
export function installedManifest(name, from = root) {
  let directory = resolve(from);
  for (;;) {
    const file = join(directory, 'node_modules', name, 'package.json');
    if (existsSync(file)) return realpathSync(file);
    const parent = dirname(directory);
    if (parent === directory)
      throw new Error(`Missing installed dependency ${name} requested by ${from}`);
    directory = parent;
  }
}

export async function github(path, { token = process.env.GITHUB_TOKEN, allow404 = false } = {}) {
  if (!token) throw new Error('GITHUB_TOKEN is required for read-only GitHub metadata checks');
  const base = process.env.GITHUB_API_URL ?? 'https://api.github.com';
  const response = await fetch(`${base}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(30000),
  });
  if (response.status === 404 && allow404) return null;
  if (!response.ok) throw new Error(`GitHub GET ${path}: HTTP ${response.status}`);
  return response.json();
}

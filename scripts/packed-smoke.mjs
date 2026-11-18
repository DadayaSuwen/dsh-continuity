import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { evidence, installedManifest, pkg, pnpm, readJson, root, run } from './quality/common.mjs';

const manifest = pkg();
const directory = mkdtempSync(join(tmpdir(), 'dsh-continuity-pack-'));
const artifacts = join(directory, 'artifacts');
const consumer = join(directory, 'consumer');
const logs = [];
const report = {
  checkedAt: new Date().toISOString(),
  package: manifest.name,
  version: manifest.version,
  directory,
  result: 'failed',
  steps: [],
  note: 'Native Node import and actual official Cordis Loader/entry, no module mocks or dev-tree aliases. Functional agent paths remain test:runtime.',
};
mkdirSync(artifacts);
mkdirSync(consumer);

// Strip credentials, source aliases and user package-manager configuration from the consumer.
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) =>
      !/TOKEN|SECRET|PASSWORD|API_KEY|DSH_SOURCE_ROOT|NODE_PATH|NODE_OPTIONS|NPM_CONFIG_|PNPM_HOME/i.test(
        key,
      ),
  ),
);
for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
env.PATH = `${dirname(process.execPath)}${process.platform === 'win32' ? ';' : ':'}${process.env.Path ?? process.env.PATH ?? ''}`;
env.HOME = consumer;
env.USERPROFILE = consumer;
env.npm_config_userconfig = join(consumer, '.npmrc');
writeFileSync(
  env.npm_config_userconfig,
  'registry=https://registry.npmjs.org/\nauto-install-peers=true\n',
);

function step(name, fn) {
  try {
    const output = fn();
    if (output) {
      logs.push(`## ${name}\n${output}`);
      console.log(output);
    }
    report.steps.push({ name, result: 'passed' });
    return output;
  } catch (error) {
    logs.push(`## ${name}\n${error.message}`);
    report.steps.push({ name, result: 'failed', error: error.message });
    throw error;
  }
}

try {
  if (process.versions.node.split('.')[0] !== '24')
    throw new Error('Packed consumer must use Node 24');
  report.toolchain = {
    node: process.version,
    executable: process.execPath,
    pnpm: pnpm(['--version'], { env }).trim(),
  };
  if (`pnpm@${report.toolchain.pnpm}` !== manifest.packageManager)
    throw new Error('Packed tooling pnpm differs from packageManager');
  const child = JSON.parse(
    pnpm(
      [
        'exec',
        'node',
        '-e',
        'console.log(JSON.stringify({executable:process.execPath,version:process.version}))',
      ],
      { env },
    ).trim(),
  );
  if (child.version !== process.version)
    throw new Error(`Lifecycle Node drift: ${child.version} instead of ${process.version}`);
  report.toolchain.lifecycle = child;
  step('Fresh production build on pinned toolchain', () =>
    pnpm(['build'], { env, timeout: 10 * 60 * 1000 }),
  );
  step('pnpm pack actual fresh-build artifact', () =>
    pnpm(['pack', '--pack-destination', artifacts], { env, timeout: 10 * 60 * 1000 }),
  );
  const files = readdirSync(artifacts).filter((file) => file.endsWith('.tgz'));
  if (files.length !== 1) throw new Error(`Expected one pack tarball, found ${files.length}`);
  const tarball = join(artifacts, files[0]);
  const packedBytes = readFileSync(tarball);
  report.tarball = {
    file: tarball,
    bytes: packedBytes.length,
    sha256: createHash('sha256').update(packedBytes).digest('hex'),
  };
  const loader = readJson(installedManifest('@deepseek-ai/cordis-plugin-loader'));
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.peerDependencies,
    '@deepseek-ai/cordis-plugin-loader': loader.version,
    [manifest.name]: `file:${tarball.replaceAll('\\', '/')}`,
  };
  const clientHostImports = new Set(
    [
      ...readFileSync(join(root, 'dist/client-node.js'), 'utf8').matchAll(
        /from\s+["']([^"']+)["']/g,
      ),
    ]
      .map((match) =>
        match[1].startsWith('@')
          ? match[1].split('/').slice(0, 2).join('/')
          : match[1].split('/')[0],
      )
      .filter((name) => !name.startsWith('.') && !name.startsWith('node:')),
  );
  for (const name of clientHostImports)
    dependencies[name] = readJson(installedManifest(name)).version;
  report.clientHostImports = [...clientHostImports];
  writeFileSync(
    join(consumer, 'package.json'),
    `${JSON.stringify({ name: 'continuity-packed-consumer', private: true, type: 'module', dependencies }, null, 2)}\n`,
  );
  step('Install packed artifact and official runtime deps/peers in isolated consumer', () =>
    pnpm(['install', '--prod', '--ignore-scripts', '--no-frozen-lockfile'], {
      cwd: consumer,
      env,
      timeout: 15 * 60 * 1000,
    }),
  );
  writeFileSync(
    join(consumer, 'smoke.mjs'),
    `import assert from 'node:assert/strict';
import { readFileSync, existsSync, realpathSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import Loader from '@deepseek-ai/cordis-plugin-loader';
import * as plugin from '${manifest.name}';

const resolved = fileURLToPath(import.meta.resolve('${manifest.name}'));
assert.ok(realpathSync(resolved).startsWith(realpathSync(process.cwd())), 'packed import must resolve only inside consumer');
const packed = JSON.parse(readFileSync(fileURLToPath(import.meta.resolve('${manifest.name}/package.json')), 'utf8'));
assert.equal(packed.version, '${manifest.version}');
assert.equal(plugin.name, '${manifest.name}');
assert.equal(typeof plugin.apply, 'function');
assert.equal(typeof plugin.Continuity, 'function');
assert.ok(plugin.Config && Array.isArray(plugin.inject));
for (const file of ['dist/index.js', 'dist/index.d.ts', 'dist/client.js', 'dist/ui/client.d.ts', 'cordis.patch.yml', 'COMPATIBILITY.json', 'LICENSE', 'NOTICE', 'CHANGELOG.md', 'README.md', 'README.zh-CN.md']) {
  assert.ok(existsSync(resolve(dirname(fileURLToPath(import.meta.resolve('${manifest.name}/package.json'))), file)), 'missing packed file: ' + file);
}
const client = await import('${manifest.name}/client');
assert.equal(typeof client.apply, 'function');
const packageRoot = dirname(fileURLToPath(import.meta.resolve('${manifest.name}/package.json')));
const { localLinks } = await import(pathToFileURL(resolve(packageRoot, 'scripts/check-docs.mjs')).href);
const markdown = [];
function collectMarkdown(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) collectMarkdown(file);
    else if (entry.isFile() && entry.name.endsWith('.md')) markdown.push(file);
  }
}
collectMarkdown(packageRoot);
let packedLocalLinks = 0;
for (const file of markdown) for (const link of localLinks(readFileSync(file, 'utf8'))) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('//')) continue;
  const path = link.split('#', 1)[0];
  if (!path) continue;
  const target = resolve(dirname(file), decodeURIComponent(path));
  const local = relative(packageRoot, target);
  assert.ok(!local.startsWith('..') && !isAbsolute(local) && existsSync(target), 'missing offline packed link in ' + relative(packageRoot, file) + ': ' + link);
  packedLocalLinks++;
}
function exportFiles(value) { return typeof value === 'string' ? [value] : Object.values(value).flatMap(exportFiles); }
for (const target of exportFiles(packed.exports)) assert.ok(existsSync(resolve(packageRoot, target)), 'missing declared packed export: ' + target);
const ctx = new Context();
try {
  await ctx.plugin(Loader, { baseUrl: new URL('./cordis.yml', import.meta.url).href });
  const imported = await ctx.loader.import('${manifest.name}');
  assert.equal(imported.apply, plugin.apply);
  const id = await ctx.loader.create({ name: '${manifest.name}', config: { ownerId: 'packed-fixture', contextTokenBudget: 2048 } });
  const entry = ctx.loader.resolve(id);
  assert.equal(entry.options.name, '${manifest.name}');
  assert.ok(entry.moduleNamespace && entry.fiber, 'official Loader entry failed to import or create a real Fiber');
  assert.equal(entry.moduleNamespace.apply, plugin.apply);
  console.log(JSON.stringify({ result: 'passed', resolved, packedVersion: packed.version, packedMarkdown: markdown.length, packedLocalLinks, clientApply: typeof client.apply, loader: '${loader.version}', entryId: id, fiberState: entry.fiber.state, inject: plugin.inject, scope: 'actual Loader import + entry/Fiber creation; required host services deliberately absent; full activation/agent path is test:runtime' }));
} finally { await ctx.fiber.dispose(); }
`,
  );
  const output = step('Native official Loader import and packed entry creation', () =>
    run(process.execPath, [join(consumer, 'smoke.mjs')], { cwd: consumer, env, timeout: 120000 }),
  );
  const last = output
    .trim()
    .split('\n')
    .findLast((line) => line.startsWith('{'));
  if (!last || JSON.parse(last).result !== 'passed')
    throw new Error('Packed Loader evidence was not emitted');
  report.loader = JSON.parse(last);
  if (process.argv.includes('--runtime'))
    step('Real functional runtime (Lead-owned)', () =>
      pnpm(['test:runtime'], { timeout: 10 * 60 * 1000 }),
    );
  report.result = 'passed';
} catch (error) {
  report.error = error.message;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  report.retained =
    'Temporary consumer and tarball retained for investigation; no real host/user data was touched';
  evidence('packed-smoke.json', report);
  writeFileSync(join(root, 'test-results/packed-smoke.log'), `${logs.join('\n')}\n`);
  // Evidence retains the exact bytes checked; workflows publish artifacts, never packages.
  if (report.tarball) {
    const output = join(root, 'test-results/packed');
    mkdirSync(output, { recursive: true });
    writeFileSync(
      join(output, `${manifest.name}-${manifest.version}.tgz`),
      readFileSync(report.tarball.file),
    );
  }
}

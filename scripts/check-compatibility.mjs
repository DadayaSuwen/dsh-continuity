import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { evidence, installedManifest, pkg, readJson, root, run } from './quality/common.mjs';

const official = 'https://github.com/DeepSeek-ai/deepseek-harness';
export const sourceHash = (value) =>
  createHash('sha256').update(value.replace(/\r\n/g, '\n')).digest('hex');

export function sourceManifestMap(source) {
  const result = new Map();
  const visit = (directory) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.'))
        continue;
      const base = join(directory, entry.name);
      const file = join(base, 'package.json');
      if (existsSync(file)) {
        const manifest = readJson(file);
        if (manifest.name) result.set(manifest.name, { directory: base, manifest });
      } else visit(base);
    }
  };
  visit(join(source, 'packages'));
  visit(join(source, 'vendor'));
  return result;
}

function sourceImports() {
  const imports = new Set();
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.tsx?$/.test(entry.name)) {
        const text = readFileSync(file, 'utf8');
        for (const match of text.matchAll(
          /(?:from\s*|import\s*\()['"](@deepseek-ai\/[^'"\s]+)['"]/g,
        ))
          imports.add(match[1]);
      }
    }
  };
  visit(join(root, 'src'));
  return [...imports].sort();
}

export function compareSource(source) {
  const map = sourceManifestMap(source);
  const files = new Map();
  for (const specifier of sourceImports()) {
    const name = specifier.split('/').slice(0, 2).join('/');
    const suffix = specifier.slice(name.length);
    const entry = map.get(name);
    if (!entry) {
      files.set(specifier, { package: name, specifier, result: 'missing-source-package' });
      continue;
    }
    let installed;
    try {
      installed = dirname(installedManifest(name));
    } catch {
      files.set(specifier, { package: name, specifier, result: 'missing-installed-package' });
      continue;
    }
    const subpath = suffix.startsWith('/src/') ? suffix.slice(1) : 'src/index.ts';
    const candidate = join(entry.directory, subpath);
    const published = join(installed, subpath);
    if (!existsSync(candidate) || !existsSync(published)) {
      files.set(specifier, {
        package: name,
        specifier,
        result: 'source-file-unavailable',
        source: relative(source, candidate).replaceAll('\\', '/'),
      });
      continue;
    }
    const a = sourceHash(readFileSync(candidate, 'utf8'));
    const b = sourceHash(readFileSync(published, 'utf8'));
    files.set(`${name}:${subpath}`, {
      package: name,
      specifier,
      source: relative(source, candidate).replaceAll('\\', '/'),
      source_sha256: a,
      npm_sha256: b,
      result: a === b ? 'MATCH' : 'DIFF',
    });
  }
  return [...files.values()];
}

export function checkCompatibility() {
  const manifest = pkg();
  const contract = readJson(join(root, 'COMPATIBILITY.json'));
  const errors = [];
  if (contract.repository !== official || contract.branch !== 'master')
    errors.push('Official repository/default branch contract mismatch');
  if (!/^[a-f0-9]{40}$/.test(contract.sha ?? ''))
    errors.push('COMPATIBILITY.sha must be a complete Git commit SHA');
  if (contract.pluginVersion !== manifest.version)
    errors.push('COMPATIBILITY.pluginVersion differs from package version');
  if (manifest.engines?.dsh !== contract.dshVersion)
    errors.push('engines.dsh differs from npm version contract');
  if (manifest.packageManager !== `pnpm@${contract.pnpm}`)
    errors.push('pnpm toolchain differs from contract');
  if (readFileSync(join(root, '.node-version'), 'utf8').trim() !== contract.node)
    errors.push('.node-version differs from contract');
  if (process.versions.node.split('.')[0] !== '24')
    errors.push(`Node 24 required, running ${process.version}`);
  if (process.env.EXPECTED_DSH_VERSION && process.env.EXPECTED_DSH_VERSION !== contract.dshVersion)
    errors.push('Matrix EXPECTED_DSH_VERSION differs from contract');
  const published = [];
  for (const section of ['dependencies', 'peerDependencies', 'devDependencies']) {
    for (const [name, version] of Object.entries(manifest[section] ?? {})) {
      if (!name.startsWith('@deepseek-ai/dsh')) continue;
      if (version !== contract.dshVersion)
        errors.push(`${section}.${name} must be exact ${contract.dshVersion}`);
      try {
        const installed = readJson(installedManifest(name));
        published.push({ section, package: name, expected: version, installed: installed.version });
        if (installed.version !== version)
          errors.push(`${name}: installed npm ${installed.version}, expected ${version}`);
      } catch (error) {
        errors.push(error.message);
      }
    }
  }
  const source = resolve(process.env.DSH_SOURCE_ROOT ?? join(root, 'upstream/deepseek-harness'));
  let sourceEvidence = {
    result: 'not-run',
    reason: 'Source checkout absent; npm version checks do not validate any Git SHA',
  };
  if (existsSync(join(source, 'package.json'))) {
    const sha = run('git', ['-C', source, 'rev-parse', 'HEAD']).trim();
    if (sha !== contract.sha)
      errors.push(`Source checkout SHA ${sha} is not stable pin ${contract.sha}`);
    if (run('git', ['-C', source, 'status', '--porcelain', '--untracked-files=no']).trim())
      errors.push(
        'Official source checkout contains tracked modifications; SHA alone does not identify dirty source',
      );
    const files = compareSource(source);
    const differences = files.filter((item) => item.result === 'DIFF');
    sourceEvidence = {
      source,
      sha,
      files,
      differingPackages: [...new Set(differences.map((item) => item.package))],
      sourceEqualsPublished: files.length > 0 && files.every((item) => item.result === 'MATCH'),
      runtimeResult: 'not asserted by this checker; run pnpm test:pinned',
    };
    if (!files.length) errors.push('No upstream source imports were compared');
    console.log(
      `Source ${sha}: ${differences.length} DIFF; same npm version is not source identity`,
    );
  }
  const report = {
    checkedAt: new Date().toISOString(),
    contract,
    npm: {
      result: errors.length ? 'failed' : 'installed-version-contract-only',
      packages: published,
    },
    source: sourceEvidence,
    runtime:
      'Use test:runtime for published npm and test:pinned for audited SHA; neither is inferred from version equality',
    errors,
    result: errors.length ? 'failed' : 'passed',
  };
  evidence('compatibility.json', report);
  console.log(
    `Compatibility contract: ${published.length} npm entries checked; ${errors.length} errors`,
  );
  if (errors.length) throw new Error(errors.join('\n'));
  return report;
}

if (process.argv[1]?.endsWith('check-compatibility.mjs')) {
  try {
    checkCompatibility();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { evidence, installedManifest, pkg, root } from './quality/common.mjs';

const allowed = new Set([
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'Python-2.0',
  'BlueOak-1.0.0',
]);

// SPDX operators matter: an approved OR branch is sufficient; every AND branch must pass.
export function approvedLicense(expression) {
  if (typeof expression !== 'string') return false;
  const tokens = expression.match(/\(|\)|[^\s()]+/g) ?? [];
  let index = 0;
  function atom() {
    if (tokens[index] === '(') {
      index++;
      const value = or();
      if (tokens[index++] !== ')') throw new Error('Unbalanced license expression');
      return value;
    }
    const value = allowed.has(tokens[index++]);
    if (tokens[index] === 'WITH') {
      index += 2;
      // No exception is silently approved; a maintainer must review a policy change.
      return false;
    }
    return value;
  }
  function and() {
    let value = atom();
    while (tokens[index] === 'AND') {
      index++;
      const right = atom();
      value = value && right;
    }
    return value;
  }
  function or() {
    let value = and();
    while (tokens[index] === 'OR') {
      index++;
      const right = and();
      value = value || right;
    }
    return value;
  }
  try {
    const value = or();
    return index === tokens.length && value;
  } catch {
    return false;
  }
}

export function checkLicenses() {
  const manifest = pkg();
  const packages = [];
  const missing = [];
  const skippedOptional = [];
  const visited = new Set();
  const pending = [{ data: manifest, directory: root, file: join(root, 'package.json') }];
  while (pending.length) {
    const { data, directory, file } = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    const license = typeof data.license === 'object' ? data.license.type : data.license;
    packages.push({
      name: data.name,
      version: data.version,
      license: license ?? null,
      manifest: file,
      approved: approvedLicense(license),
    });
    const edges = { ...data.dependencies, ...data.peerDependencies, ...data.optionalDependencies };
    for (const name of Object.keys(edges)) {
      const optional =
        Object.hasOwn(data.optionalDependencies ?? {}, name) ||
        data.peerDependenciesMeta?.[name]?.optional === true;
      try {
        const childFile = installedManifest(name, directory);
        const child = JSON.parse(readFileSync(childFile, 'utf8'));
        if (
          optional &&
          child.os &&
          ((child.os.some((os) => !os.startsWith('!') && os !== 'any') &&
            !child.os.includes(process.platform)) ||
            child.os.includes(`!${process.platform}`))
        ) {
          skippedOptional.push({ name, parent: data.name, reason: 'Different platform' });
          continue;
        }
        pending.push({ data: child, file: childFile, directory: dirname(childFile) });
      } catch (error) {
        (optional ? skippedOptional : missing).push({
          name,
          parent: data.name,
          reason: error.message,
        });
      }
    }
  }
  const errors = packages
    .filter((entry) => !entry.approved)
    .map((entry) => `${entry.name}@${entry.version}: ${entry.license ?? 'missing license'}`);
  errors.push(
    ...missing.map((entry) => `${entry.parent}: missing runtime dependency/peer ${entry.name}`),
  );
  if (
    !existsSync(join(root, 'LICENSE')) ||
    !readFileSync(join(root, 'LICENSE'), 'utf8').includes('MIT License')
  )
    errors.push('Project MIT LICENSE is missing');
  if (
    !existsSync(join(root, 'NOTICE')) ||
    !readFileSync(join(root, 'NOTICE'), 'utf8').includes('DeepSeek')
  )
    errors.push('NOTICE must credit DeepSeek and bundled third-party code');
  if (packages.length < 2) errors.push('Installed runtime dependency closure is empty');
  const report = {
    checkedAt: new Date().toISOString(),
    scope:
      'installed runtime dependencies + required peers + installed optional edges; no dev-only license claim',
    allowed: [...allowed],
    packages: packages.sort((a, b) =>
      `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`),
    ),
    missing,
    skippedOptional,
    errors,
    result: errors.length ? 'failed' : 'passed',
  };
  console.log(
    `License check: ${packages.length} installed runtime manifests; ${missing.length} missing; ${errors.length} policy errors`,
  );
  evidence('licenses.json', report);
  if (errors.length) throw new Error(errors.join('\n'));
  return report;
}

if (process.argv[1]?.endsWith('check-licenses.mjs')) {
  try {
    checkLicenses();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

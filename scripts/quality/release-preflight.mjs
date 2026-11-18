import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { evidence, github, pkg, readJson, root, run } from './common.mjs';

export function exactReleaseVersion(version) {
  return /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][\dA-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][\dA-Za-z-]*))*)?$/.test(
    version ?? '',
  );
}

async function main() {
  const manifest = pkg();
  const version =
    process.env.RELEASE_VERSION ||
    (process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME?.slice(1) : undefined);
  const tag = `v${version}`;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!exactReleaseVersion(version) || version !== manifest.version)
    throw new Error(
      'Release version must be exact semver and identical to package.json (no ranges, build metadata or mutable refs)',
    );
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? ''))
    throw new Error('Release requires the GitHub repository identity');
  const head = run('git', ['rev-parse', 'HEAD']).trim();
  const tagged = run('git', ['rev-parse', '--verify', `refs/tags/${tag}^{commit}`]).trim();
  if (head !== tagged)
    throw new Error(`Checkout ${head} does not equal exact existing tag ${tag} at ${tagged}`);
  run('git', ['merge-base', '--is-ancestor', head, 'origin/main']);
  if (
    process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' &&
    process.env.GITHUB_REF !== 'refs/heads/main'
  )
    throw new Error('Dispatch release preparation from main only');
  if (process.env.GITHUB_EVENT_NAME === 'push' && process.env.GITHUB_REF !== `refs/tags/${tag}`)
    throw new Error('Tag event and exact package version differ');
  if (readJson(join(root, 'COMPATIBILITY.json')).pluginVersion !== version)
    throw new Error('Compatibility pluginVersion differs from exact release version');
  const existingRelease = await github(`/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, {
    allow404: true,
  });
  if (existingRelease)
    throw new Error(`GitHub Release ${tag} already exists; no duplicate release preparation`);
  // A 404 version endpoint is not enough: also require a reachable packument or a true package 404.
  const registry = `https://registry.npmjs.org/${encodeURIComponent(manifest.name)}`;
  const response = await fetch(registry, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30000),
  });
  if (![200, 404].includes(response.status))
    throw new Error(`npm read-only preflight HTTP ${response.status}`);
  let npmState = 'package-not-published';
  if (response.ok) {
    const data = await response.json();
    if (Object.hasOwn(data.versions ?? {}, version))
      throw new Error(
        `npm ${manifest.name}@${version} already exists; immutable versions are not republished`,
      );
    npmState = 'package-exists-version-absent';
  }
  const report = {
    checkedAt: new Date().toISOString(),
    package: manifest.name,
    version,
    tag,
    sha: head,
    npmState,
    githubRelease: 'absent',
    result: 'passed',
    publication: 'preparation only; no GitHub release or npm write is implemented',
  };
  evidence('release-preflight.json', report);
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\ntag=${tag}\nsha=${head}\n`);
  console.log(`Release preparation preflight: ${tag} at ${head}; no duplicate npm/GitHub Release`);
}

if (process.argv[1]?.endsWith('release-preflight.mjs')) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

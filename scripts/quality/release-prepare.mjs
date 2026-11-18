import { appendFileSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { evidence, pkg, readJson, root, run } from './common.mjs';
import { exactReleaseVersion } from './release-preflight.mjs';

async function main() {
  const manifest = pkg();
  const version = process.env.RELEASE_VERSION;
  const sha = process.env.RELEASE_SHA;
  if (
    !exactReleaseVersion(version) ||
    manifest.version !== version ||
    run('git', ['rev-parse', 'HEAD']).trim() !== sha
  )
    throw new Error('Approved exact release version/SHA no longer matches checkout');
  // Naming an environment in YAML does not itself enable human protection. Default stays closed.
  if (process.env.RELEASE_HUMAN_APPROVAL_CONFIGURED !== 'true')
    throw new Error(
      'Maintainer must configure release required HUMAN reviewers, prevent self review, disallow bypass, then set environment variable RELEASE_HUMAN_APPROVAL_CONFIGURED=true',
    );
  const smoke = readJson(join(root, 'test-results/packed-smoke.json'));
  if (smoke.result !== 'passed' || smoke.version !== version || !smoke.tarball?.sha256)
    throw new Error('Exact-version real packed Loader smoke evidence must pass before preparation');
  const tarball = join(root, `test-results/packed/${manifest.name}-${version}.tgz`);
  const bytes = readFileSync(tarball);
  if (createHash('sha256').update(bytes).digest('hex') !== smoke.tarball.sha256)
    throw new Error('Packed bytes changed since Loader smoke');
  const output = join(root, 'test-results/release');
  mkdirSync(output, { recursive: true });
  copyFileSync(tarball, join(output, `${manifest.name}-${version}.tgz`));
  writeFileSync(
    join(output, 'SHA256SUMS'),
    `${smoke.tarball.sha256}  ${manifest.name}-${version}.tgz\n`,
  );
  const preflight = readJson(join(root, 'test-results/release-preflight.json'));
  if (preflight.version !== version || preflight.sha !== sha || preflight.result !== 'passed')
    throw new Error('Read-only duplicate publication preflight missing or stale');
  const note = `# ${manifest.name} v${version} — prepared, NOT published\n\nCommit: ${sha}\n\n## Evidence\n\nExact package/tag match; stable DSH pin unchanged; installed license/secret/docs checks; pnpm test:pinned against the audited source SHA; real packed artifact official Loader/entry import; test:runtime/npm dependency paths; browser/mobile checks when run by release workflow.\n\n## Publication checklist for a separate, user-confirmed operation\n\n- Obtain direct user confirmation for public npm and GitHub Release actions. This preparation is not that confirmation.\n- Confirm GitHub release environment HUMAN approval and current-head peer reviews; AI does not approve.\n- Recheck npm version and GitHub tag absence immediately before any future write.\n- Verify SHA256SUMS and retained test evidence; preserve upstream MIT notices.\n- Configure npm trusted publishing/OIDC and minimal public-write permissions in a separately reviewed change. No publish credential or publish command exists here.\n\n## Rollback\n\nKeep the previous working bundle/package. Disable/reinstall that version locally if needed. Public npm versions are immutable; a fix requires a new reviewed version, not an overwrite.\n`;
  writeFileSync(join(output, 'GITHUB_RELEASE_DRAFT.md'), note);
  copyFileSync(join(root, 'CHANGELOG.md'), join(output, 'CHANGELOG.md'));
  const report = {
    checkedAt: new Date().toISOString(),
    version,
    sha,
    sha256: smoke.tarball.sha256,
    result: 'prepared-not-published',
    humanGate:
      'release protected environment configured out-of-band; self-review and bypass disabled',
    publicWrites: 0,
  };
  evidence('release-preparation.json', report);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Release preparation only\n\n${manifest.name} v${version} at \`${sha}\`. Exact checked tarball + checksums + local GitHub Release draft retained as artifacts. **No npm publish, no GitHub Release creation, no public write.**\n`,
    );
  console.log(`${manifest.name}@${version}: prepared artifacts only; 0 public writes`);
}

if (process.argv[1]?.endsWith('release-prepare.mjs')) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

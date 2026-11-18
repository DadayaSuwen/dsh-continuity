import { lstatSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { evidence, root, run } from './quality/common.mjs';

const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['npm-token', /\bnpm_[A-Za-z0-9]{30,255}\b/g],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,255}\b/g],
  ['provider-token', /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,255}\b/g],
  [
    'credential-assignment',
    /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|secret[_-]?key)\b\s*[:=]\s*["']([A-Za-z0-9_+\/=.-]{16,255})["']/gi,
  ],
];
const fake =
  /(?:^(?:YOUR_|EXAMPLE_|FAKE_|DUMMY_|TEST_|SYNTHETIC_|REPLACE_|PLACEHOLDER|CHANGEME)|\$\{|<[^>]+>|^(.)\1+$)/i;

export function scanText(text, file) {
  const findings = [];
  for (const [rule, regex] of rules) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      if (fake.test(match[1] ?? match[0])) continue;
      findings.push({ file, rule, line: text.slice(0, match.index).split('\n').length });
    }
  }
  return findings;
}

export function checkSecrets({ includeUntracked = false } = {}) {
  const files = run('git', [
    'ls-files',
    '-z',
    ...(includeUntracked ? ['--cached', '--others', '--exclude-standard'] : []),
  ])
    .split('\0')
    .filter(Boolean);
  if (!files.length)
    throw new Error(
      'No tracked files: stage/commit the project first, or explicitly use --include-untracked for initialization evidence',
    );
  const exclusions = new Map();
  const allowFile = join(root, 'scripts/quality/secret-allowlist.json');
  let allowlist;
  try {
    allowlist = JSON.parse(readFileSync(allowFile, 'utf8'));
  } catch {
    allowlist = { fixtures: [] };
  }
  for (const entry of allowlist.fixtures ?? []) {
    if (
      !/^tests\/fixtures\/[A-Za-z0-9_./-]+$/.test(entry.path) ||
      entry.path.includes('..') ||
      !entry.reason?.trim()
    )
      throw new Error('Fixture exclusions require an exact tests/fixtures path and reason');
    const text = readFileSync(join(root, entry.path), 'utf8');
    if (!text.includes('Entirely synthetic') && !text.includes('SYNTHETIC_FIXTURE'))
      throw new Error(`${entry.path}: excluded fixture must identify itself as synthetic`);
    exclusions.set(entry.path, entry.reason);
  }
  const findings = [];
  const skipped = [];
  let checked = 0;
  for (const file of [...new Set(files)]) {
    const full = join(root, file);
    const stat = lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error(`Tracked symlink needs manual review: ${file}`);
    if (exclusions.has(file)) {
      skipped.push({ file, reason: exclusions.get(file) });
      continue;
    }
    if (!stat.isFile()) continue;
    const bytes = readFileSync(full);
    if (bytes.includes(0)) {
      skipped.push({ file, reason: 'binary; no text-pattern claim' });
      continue;
    }
    findings.push(...scanText(bytes.toString('utf8'), relative(root, full).replaceAll('\\', '/')));
    checked++;
  }
  const report = {
    checkedAt: new Date().toISOString(),
    scope: includeUntracked
      ? 'tracked + explicitly requested untracked, gitignored excluded'
      : 'git tracked working-tree files',
    checked,
    skipped,
    findings,
    result: findings.length || !checked ? 'failed' : 'passed',
    limitation:
      'Pattern check, not a proof that every secret or historical commit is absent; values are never logged',
  };
  evidence('secrets.json', report);
  console.log(
    `Secret check: ${checked} text files; ${skipped.length} explicit exclusions/binaries; ${findings.length} findings`,
  );
  for (const finding of findings)
    console.error(`${finding.file}:${finding.line}: ${finding.rule} [value redacted]`);
  if (findings.length || !checked)
    throw new Error(
      findings.length
        ? 'Secret-pattern findings require review/rotation'
        : 'No text files were scanned',
    );
  return report;
}

if (process.argv[1]?.endsWith('check-secrets.mjs')) {
  try {
    checkSecrets({ includeUntracked: process.argv.includes('--include-untracked') });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

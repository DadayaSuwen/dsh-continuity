import assert from 'node:assert/strict';
import { approvedLicense } from '../check-licenses.mjs';
import { checkDocs, localLinks } from '../check-docs.mjs';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { scanText } from '../check-secrets.mjs';
import { sourceHash } from '../check-compatibility.mjs';
import { classify, currentHumanApprovals, matches } from './risk-review.mjs';
import { exactReleaseVersion } from './release-preflight.mjs';
import { readJson, root } from './common.mjs';
import { join } from 'node:path';

assert.equal(approvedLicense('MIT'), true);
assert.equal(approvedLicense('(MIT OR GPL-3.0-only) AND Apache-2.0'), true);
assert.equal(approvedLicense('MIT AND AGPL-3.0-only'), false);
assert.equal(approvedLicense(''), false);
assert.equal(approvedLicense('MIT OR'), false);
assert.equal(approvedLicense('MIT WITH Unknown-exception'), false);
assert.deepEqual(
  localLinks(
    '# Test\n[local](<docs/local.md>)\n```\n[fake](missing.md)\n```\n[reference]: ./README.md',
  ),
  ['docs/local.md', './README.md'],
);
mkdirSync(join(root, 'artifacts'), { recursive: true });
const ignoredDocs = mkdtempSync(join(root, 'artifacts/docs-check-'));
try {
  writeFileSync(join(ignoredDocs, 'ignored.md'), '[generated](missing-generated-target.md)\n');
  assert.equal(checkDocs().result, 'passed');
} finally {
  rmSync(ignoredDocs, { recursive: true, force: true });
}
const fakeToken = ['ghp', '_', '0123456789abcdef'.repeat(3)].join('');
assert.equal(scanText(`token='${fakeToken}'`, 'unit').length, 1);
assert.equal(scanText("api_key='YOUR_TEST_KEY_REPLACE_ME'", 'unit').length, 0);
assert.equal(sourceHash('line\r\n'), sourceHash('line\n'));
assert.equal(matches('src/security/**', 'src/security/archive.ts'), true);
assert.equal(matches('src/*', 'src/security/archive.ts'), false);
const policy = readJson(join(root, '.github/risk-policy.json'));
assert.equal(classify([{ filename: 'docs/help.md' }], policy).level, 'low');
assert.equal(classify([{ filename: 'new-entry.mjs' }], policy).level, 'medium');
assert.equal(classify([{ filename: 'src/migration/migration.ts' }], policy).requiredApprovals, 2);
assert.equal(classify([{ filename: '.github/workflows/release.yml' }], policy).level, 'critical');
assert.equal(
  classify(
    Array.from({ length: 20 }, (_, i) => ({ filename: `docs/${i}.md` })),
    policy,
  ).level,
  'high',
);
const pr = { head: { sha: 'HEAD' }, user: { login: 'author' } };
const reviews = [
  { id: 1, state: 'APPROVED', commit_id: 'OLD', user: { login: 'old', type: 'User' } },
  { id: 2, state: 'APPROVED', commit_id: 'HEAD', user: { login: 'author', type: 'User' } },
  { id: 3, state: 'APPROVED', commit_id: 'HEAD', user: { login: 'automation[bot]', type: 'Bot' } },
  { id: 4, state: 'APPROVED', commit_id: 'HEAD', user: { login: 'human', type: 'User' } },
];
assert.deepEqual(
  currentHumanApprovals(
    reviews,
    pr,
    { old: 'write', author: 'admin', 'automation[bot]': 'admin', human: 'maintain' },
    ['write', 'maintain', 'admin'],
  ).map((item) => item.user.login),
  ['human'],
);
assert.equal(
  currentHumanApprovals(
    [...reviews, { id: 5, state: 'DISMISSED', user: { login: 'human', type: 'User' } }],
    pr,
    { human: 'write' },
    ['write'],
  ).length,
  0,
);
assert.equal(exactReleaseVersion('0.1.0'), true);
assert.equal(exactReleaseVersion('0.1.0-rc.4'), true);
for (const version of ['latest', '^0.1.0', 'v0.1.0', '01.1.0', '0.1.0+meta', '0.1.0-01'])
  assert.equal(exactReleaseVersion(version), false);
console.log(
  'Quality self-check passed: licenses, local links, secret redaction, SHA normalization, risk classification/human review, exact release version',
);

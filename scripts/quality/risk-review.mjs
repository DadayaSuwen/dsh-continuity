import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evidence, github, root } from './common.mjs';

export function matches(pattern, file) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('**', '\u0000')
    .replaceAll('*', '[^/]*')
    .replaceAll('\u0000', '.*')
    .replaceAll('?', '[^/]');
  return new RegExp(`^${escaped}$`).test(file);
}

export function classify(files, policy) {
  let level = files.some((file) => !/\.(?:md|txt)$/i.test(file.filename)) ? 'medium' : 'low';
  const reasons = [];
  for (const file of files) {
    for (const rule of policy.rules) {
      if (!rule.patterns.some((pattern) => matches(pattern, file.filename))) continue;
      if (policy.levels[rule.level].rank > policy.levels[level].rank) level = rule.level;
      reasons.push({ file: file.filename, level: rule.level });
    }
  }
  const lines = files.reduce((sum, file) => sum + (file.additions ?? 0) + (file.deletions ?? 0), 0);
  if (files.length >= policy.largeChange.files || lines >= policy.largeChange.lines) {
    if (policy.levels[policy.largeChange.level].rank > policy.levels[level].rank)
      level = policy.largeChange.level;
    reasons.push({
      reason: 'large-change',
      files: files.length,
      lines,
      level: policy.largeChange.level,
    });
  }
  return {
    level,
    requiredApprovals: policy.levels[level].humanApprovals,
    reasons,
    files: files.length,
    lines,
  };
}

export function currentHumanApprovals(reviews, pr, permissions, acceptedPermissions) {
  const latest = new Map();
  for (const review of [...reviews].sort((a, b) => a.id - b.id)) {
    if (review.state === 'COMMENTED' || review.state === 'PENDING') continue;
    latest.set(review.user?.login, review);
  }
  return [...latest.values()].filter(
    (review) =>
      review.state === 'APPROVED' &&
      review.commit_id === pr.head.sha &&
      review.user?.type === 'User' &&
      !/\[bot\]$|(?:^|[-_])(bot|copilot|agent)(?:$|[-_])/i.test(review.user.login) &&
      review.user.login !== pr.user.login &&
      acceptedPermissions.includes(permissions[review.user.login]),
  );
}

async function all(path) {
  const results = [];
  for (let page = 1; page <= 31; page++) {
    const response = await github(
      `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
    );
    results.push(...response);
    if (response.length < 100) return results;
  }
  throw new Error('GitHub metadata pagination exceeded 3100 records; manual review required');
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const number = process.env.PR_NUMBER;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '') || !/^\d+$/.test(number ?? ''))
    throw new Error('Expected GITHUB_REPOSITORY and PR_NUMBER metadata');
  const policy = JSON.parse(readFileSync(join(root, '.github/risk-policy.json'), 'utf8'));
  const pr = await github(`/repos/${repo}/pulls/${number}`);
  const files = await all(`/repos/${repo}/pulls/${number}/files`);
  const reviews = await all(`/repos/${repo}/pulls/${number}/reviews`);
  if (!files.length || files.length !== pr.changed_files)
    throw new Error('Complete PR changed-file metadata is required');
  // Include both old and new paths for renames; no moving a critical file into a low-risk path.
  const risk = classify(
    files.flatMap((file) =>
      file.previous_filename
        ? [file, { filename: file.previous_filename, additions: 0, deletions: 0 }]
        : [file],
    ),
    policy,
  );
  const permissions = {};
  for (const review of reviews) {
    const user = review.user;
    if (!user || user.type !== 'User' || user.login === pr.user.login || permissions[user.login])
      continue;
    try {
      permissions[user.login] = (
        await github(`/repos/${repo}/collaborators/${encodeURIComponent(user.login)}/permission`)
      ).permission;
    } catch {
      permissions[user.login] = 'unknown';
    }
  }
  const approvals = currentHumanApprovals(
    reviews,
    pr,
    permissions,
    policy.reviewRules.acceptedPermissions,
  );
  const changedDuringCheck =
    (await github(`/repos/${repo}/pulls/${number}`)).head.sha !== pr.head.sha;
  const report = {
    checkedAt: new Date().toISOString(),
    repo,
    pullRequest: Number(number),
    head: pr.head.sha,
    ...risk,
    approvals: approvals.map((review) => ({
      user: review.user.login,
      review: review.id,
      commit: review.commit_id,
    })),
    changedDuringCheck,
    result: !changedDuringCheck && approvals.length >= risk.requiredApprovals ? 'passed' : 'failed',
    governance:
      'Read-only metadata; current-head HUMAN approvals only; no AI self-approval, no auto-merge, no label can downgrade computed risk',
    limitation:
      'User account identity is checked, but Github user metadata does not attest who physically clicked; maintainers must not approve through AI automation',
  };
  evidence('risk-review.json', report);
  console.log(
    `Risk ${risk.level}; ${approvals.length}/${risk.requiredApprovals} current-SHA human maintainer approvals`,
  );
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Human risk review\n\nRisk: **${risk.level}**. Current-head approvals: **${approvals.length}/${risk.requiredApprovals}**.\n\nHead: \`${pr.head.sha}\`. Rerun this check after reviews; reviews from earlier heads, authors, bots and unknown permissions do not count.\n`,
    );
  }
  if (report.result !== 'passed')
    throw new Error(
      changedDuringCheck
        ? 'PR head changed during review check; rerun'
        : `Awaiting ${risk.requiredApprovals} current-head human maintainer approvals; rerun the governance workflow after review`,
    );
}

if (process.argv[1]?.endsWith('risk-review.mjs')) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

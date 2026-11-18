import { appendFileSync } from 'node:fs';

const body = {
  required_status_checks: {
    strict: true,
    contexts: ['required', 'review'],
  },
  enforce_admins: true,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: true,
    required_approving_review_count: 1,
    require_last_push_approval: true,
  },
  restrictions: null,
  required_linear_history: true,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: true,
};
const repo = process.env.GITHUB_REPOSITORY ?? 'OWNER/REPO';
if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Expected GITHUB_REPOSITORY=owner/repo');
const command = `gh api --method PUT repos/${repo}/branches/main/protection --input -`;
if (!process.argv.includes('--json')) {
  console.log('# Recommendation only; running this generator changes no GitHub settings.');
  console.log(
    `# Apply ONLY after human confirmation and verifying emitted status-check names:\n# ${command}`,
  );
}
console.log(JSON.stringify(body, null, 2));
if (process.argv.includes('--apply'))
  throw new Error(
    'This generator intentionally has no apply mode; run the explicitly reviewed gh command yourself',
  );
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    'Branch protection recommendation generated only; no remote setting was changed.\n',
  );

import { appendFileSync } from 'node:fs';
import { github } from './common.mjs';

const event = process.env.GITHUB_EVENT_NAME;
let changed;
if (event === 'pull_request') {
  const { readFileSync } = await import('node:fs');
  const payload = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const repo = process.env.GITHUB_REPOSITORY;
  const number = payload.pull_request.number;
  const response = await github(`/repos/${repo}/pulls/${number}/files?per_page=100`);
  // Over the first page, take the conservative full CI path instead of guessing an incomplete diff.
  changed = payload.pull_request.changed_files > 100 ? null : response.map((file) => file.filename);
}
const code = !changed || changed.some((file) => !/\.md$/i.test(file));
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `code=${code}\n`);
console.log(
  code
    ? 'Code/config change or non-PR: run full CI'
    : 'Documentation-only PR: required anchor runs docs + stdlib quality checks, heavy tests skipped',
);

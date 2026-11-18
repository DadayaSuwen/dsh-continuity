# CI/CD and governance

[简体中文](CI_CD.md) · [Testing](TESTING.en.md) · [Branch protection proposal](BRANCH_PROTECTION.md)

## Present status

This repository delivers executable checks and **release preparation**, not a public release. YAML does not prove remote enforcement. Branch protection, actual human Code Owners, protected release environments, repository permissions and npm trusted publishing need separate maintainer configuration after direct user confirmation. Test claims are tied to actual commands and evidence; see [Testing](TESTING.en.md).

## Eight workflows

| Workflow                                                               | Responsibility                                                                                    | Triggers and cost controls                                                                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [ci.yml](../../.github/workflows/ci.yml)                               | Fixed `required` status; types/lint/format/unit/security/storage/build/version contract           | Every PR gets the status; docs-only PRs retain docs/config/script checks but skip heavy tests internally; filtered main pushes |
| [docs.yml](../../.github/workflows/docs.yml)                           | Local links/anchors, bilingual README structure, actual Config and referenced scripts             | Documentation/config/governance paths or dispatch                                                                              |
| [test-matrix.yml](../../.github/workflows/test-matrix.yml)             | Ubuntu/Windows; Node 24.22.3; published npm DSH 0.2.2-rc.4                                        | Source/tests/toolchain paths or dispatch; no invented supported versions                                                       |
| [security.yml](../../.github/workflows/security.yml)                   | Tracked secret patterns, installed runtime licenses, registry audit, dependency diff, CodeQL      | Relevant paths, weekly or dispatch; only CodeQL writes security events                                                         |
| [dsh-compatibility.yml](../../.github/workflows/dsh-compatibility.yml) | Exact-SHA `pnpm test:pinned`; latest-master real source probe and failure issue                   | Pinned on relevant PRs; latest weekly/dispatch only; issue writing isolated from code execution                                |
| [e2e.yml](../../.github/workflows/e2e.yml)                             | Real pack/Loader, npm runtime and native mobile browser                                           | Relevant paths or dispatch; Chromium only                                                                                      |
| [governance.yml](../../.github/workflows/governance.yml)               | Trusted base policy + current-head human maintainer approvals                                     | PR metadata; no dependencies or PR-head execution; rerun original PR job after reviews                                         |
| [release.yml](../../.github/workflows/release.yml)                     | Exact version/tag/commit, deduplication, human environment, revalidation, tarball/draft artifacts | Dispatch or `v*` tags; one global non-cancelling queue; no public writes                                                       |

All workflows default to `contents: read`, use checkout `persist-credentials: false`, explicit timeouts, concurrency and short artifact retention. Only the isolated issue reporter has `issues: write`; only CodeQL has `security-events: write`. PR tests receive no publishing credentials. No privileged PR trigger, AI approval or default auto-merge is used.

## Risk levels and HUMAN review

[Risk policy](../../.github/risk-policy.json) computes path risk independently of mutable labels:

- **low**: documentation; machine gate needs zero, but normal configured branch review still requires one human.
- **medium**: ordinary source/UI/tests; one non-author human maintainer on current HEAD.
- **high**: import/isolation/persistence/recovery/model context, dependencies, workflows or tooling; two humans.
- **critical**: release controls, policy/ownership, compatibility pin, LICENSE/NOTICE; two humans plus release environment approval where relevant.
- At least twenty files or five hundred changed lines raises risk to high. Renames classify old and new paths.

[Review checker](../../scripts/quality/risk-review.mjs) reads PR/files/reviews/collaborator permissions. Only latest `APPROVED` reviews with current head `commit_id`, a non-author `User`, non-bot name and write/maintain/admin permission count. Old, dismissed, unknown-permission and bot reviews do not count. GitHub account metadata cannot attest who physically clicked; maintainers commit to reviewing themselves, never using AI through a human account to approve.

The governance job checks out **base SHA**, not modified PR gate code. Bootstrap must be manually reviewed when base has not yet acquired the checker; failure is not a silent pass. Ordinary `pull_request_review` submitted/edited/dismissed events also recheck the trusted base gate, including withdrawn approvals. Verify the review run is attached to current head; rerun the original PR job if its status remains failed. Manual dispatch provides supplementary evidence, not replacement required PR status. Remote branch/ruleset configuration remains necessary.

## Two distinct compatibility evidence paths

[Contract](../../COMPATIBILITY.json) pins source SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760` and npm `0.2.2-rc.4`. Several source files **DIFF** from same-version published npm. [Lead comparison](../../scripts/compare-upstream.mjs) and [contract checker](../../scripts/check-compatibility.mjs) retain that fact. Equal version is not equal source.

- `pnpm test:runtime`: published modules with real Cordis/Storage/Session/AgentLoop; only external model IO scripted.
- `pnpm test:pinned`: [Lead runner](../../scripts/test-pinned.mjs), Vite aliases into actual audited source modules.
- [Latest probe](../../scripts/upstream-compatibility.mjs): clone official master in ignored `.test/results`, record full SHA, call the same runner with `DSH_SOURCE_ROOT`. Keep API signals/source diffs/logs, create/comment an issue on workflow failure, and never update stable pins, installed dependencies or the existing official clone.

## Prepare, do not publish

1. After confirmation a maintainer configures `release`: actual **HUMAN required reviewers**, prevent self-review, no administrator bypass, only main/`v*` deployment patterns. Reviewer availability depends on repository visibility/plan; keep the gate closed where protection is absent.
2. Set environment variable `RELEASE_HUMAN_APPROVAL_CONFIGURED=true` only after configuration. It is a maintainer declaration, not AI approval and not a substitute for a real environment protection rule. Missing is closed by default.
3. Exact semver must equal package version and `COMPATIBILITY.pluginVersion`; existing `vVERSION` tag must resolve to checkout HEAD in main history. Dispatch starts from main only.
4. [Preflight](../../scripts/quality/release-preflight.mjs) performs read-only npm version/GitHub Release deduplication; network errors fail. Global serialization and a second check after approval reduce stale results.
5. Rerun quality, audited SHA, npm runtime, real pack and browser checks. [Preparation](../../scripts/quality/release-prepare.mjs) checks SHA256 of the exact Loader-tested bytes and retains tarball/checksums/local GitHub Release draft/logs.
6. No npm/GitHub publishing command, `contents: write`, `id-token: write` or npm token exists. Public publication requires a **separate explicitly user-confirmed, human-reviewed change** and has not occurred.

Merely referencing an environment in YAML does not establish human approval; GitHub may create an unprotected environment. See [environment protection rules](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

## Dependency and Action pins

[Dependabot](../../.github/dependabot.yml) groups weekly tooling/action updates with PR caps; no auto-merge. DeepSeek packages remain frozen for manual SHA/npm compatibility audit. All Action refs use forty-character official GitHub API resolved commit SHAs checked on 2026-11-18; annotations were dereferenced, tags are comments only:

- [checkout](https://api.github.com/repos/actions/checkout/git/ref/tags/v4), [setup-node](https://api.github.com/repos/actions/setup-node/git/ref/tags/v4), [upload-artifact](https://api.github.com/repos/actions/upload-artifact/git/ref/tags/v4).
- [pnpm tag owner](https://api.github.com/repos/pnpm/action-setup/git/tags/f40ffcd9367d9f12939873eb1018b921a783ffaa), [github-script](https://api.github.com/repos/actions/github-script/git/ref/tags/v7).
- [CodeQL tag owner](https://api.github.com/repos/github/codeql-action/git/tags/b7b84b636b4f90c9b31da1bc5f72bfadd5b31410), [dependency-review v5.0.1](https://api.github.com/repos/actions/dependency-review-action/git/ref/tags/v5.0.1).

These are resolution evidence, not a full implementation audit claim. Pin changes require human review. [GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use) supports least privilege, full-SHA references and separation of environment secrets from untrusted checkout.

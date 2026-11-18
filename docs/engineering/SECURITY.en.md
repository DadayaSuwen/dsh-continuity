# Security engineering and data governance

[简体中文](SECURITY.md) · [Reporting](../../SECURITY.md) · [Testing](TESTING.en.md)

## Assets and trust

Continuity is an official bundle plugin running on the connected DSH Host. [Plugin](../../src/plugin.ts), [routes](../../src/routes.ts) and [storage](../../src/storage.ts) run there. Local-first refers to the Host, not necessarily the phone/browser device. Original ZIPs, chats, character memories and backups are private assets. CI uses explicit synthetic fixtures and temporary directories, never real user exports/accounts/live Hosts.

Uploads, pasted text, unknown formats and backups are untrusted data. Candidate memories stay separate from confirmed memories; content is not executable configuration or automatically higher-priority instructions. Owner + agent + character + story isolation and Session binding are implemented through [identity schemas](../../src/model.ts) and real persistence.

## Implemented controls and limits

- [ZIP checker](../../src/security/archive.ts) defaults: 128MiB upload, 512MiB expanded total, 64MiB entry, 10000 files, 200× ratio. It checks paths, duplicate canonical names, links/special files, ZIP64/multipart, headers/sizes/CRC, without extracting to disk. Tighten limits to actual Host memory; defaults are not resource guarantees.
- [JSON checker](../../src/security/json.ts), Zod schemas and scope checks validate import data. Errors remain observable, not swallowed.
- [Migration](../../src/migration/migration.ts) and [backup format](../../src/migration/package.ts) retain original assets/digests/provenance. SHA256 provides integrity checking, **not encryption, signing or sender authentication**. Downloaded backups include private content; users choose storage appropriately.
- [Memory](../../src/memory/memory.ts) review/confirmation/conflicts/version/deletion and [recovery](../../src/recovery/recovery.ts) budgets are not proof of cross-model personality identity. Models use explicitly selected Host providers; tests script external model IO only.
- DSH owns native identity/connection and peer Service dependencies. The plugin creates no parallel authentication stack; see [architecture](../architecture/ARCHITECTURE.md).

## Repository and supply chain

CI tokens default to read. Untrusted PRs receive no publish credentials and use no privileged trigger to execute head code. Human review uses trusted base policy and current-head approvals. Official package npm versions and source SHA are tested independently; full-SHA Action changes and capped Dependabot PRs remain human-reviewed.

[Secret check](../../scripts/check-secrets.mjs) scans tracked files without printing values; [allowlist](../../scripts/quality/secret-allowlist.json) contains exact synthetic fixture paths only. Pattern scanning is not an exhaustive historical/credential-type proof. If exposure occurs, maintainers rotate immediately, remove affected logs/artifacts and coordinate remediation without reposting credentials.

[License check](../../scripts/check-licenses.mjs) reads actual installed runtime closure and required peers; missing dependencies/unknown SPDX fail. [NOTICE](../../NOTICE) retains DeepSeek/Cordis/bundled MIT attribution. [Security workflow](../../.github/workflows/security.yml) adds audit/dependency review/CodeQL, whose results exist only after actual execution.

The project-only MCP SDK2.3.0override applies to dev/CI dependencies. [Public transport regression](MCP_TRANSPORT.en.md) verifies actual DSHprobeServer blocks cross-origin307/302header/body forwarding while same-originHTTP andstdio remain usable. InstallingContinuity does not replace an existinguserHostSDK;OAuth/TLS/proxies/realMCPservers remain untested. Current production/fulldev audits are zero andthehighgateexits0;picomatch disappeared after advisorywithdrawal,not a shipped codefix.

## Human authority and release

High/critical changes require two non-author human maintainers on current head. AI never approves or merges. Release approval is an actual GitHub protected-environment HUMAN rule, not model judgment or text marked approved. Maintainers configure it after confirmation; [release workflow](../../.github/workflows/release.yml) prepares only and performs zero public writes. This task changes no remote branch protection or settings; see [executable recommendation](BRANCH_PROTECTION.md).

## Failures and reporting

Public issues contain sanitized versions/SHA/steps/error codes and minimal synthetic reproductions. Do not publicly attach real chats, ZIPs, tokens, Cookies or private paths/network addresses. Use [security reporting](../../SECURITY.md); where private reporting is not configured, ask a maintainer for a published private contact. No fictional address or SLA is promised.

Evidence is ignored locally and artifacts contain synthetic engineering data only. Packed consumers and latest clones retain investigation evidence. Verify resolved absolute temporary paths before cleaning, never delete personal desktop assets. [GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use) documents log handling/rotation and least privilege.

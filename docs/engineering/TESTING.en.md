# Testing and evidence

[简体中文](TESTING.md) · [CI/CD](CI_CD.en.md) · [Security engineering](SECURITY.en.md)

## Toolchain

Node **24.22.3**, pnpm **11.28.5**, published DSH **0.2.2-rc.4**. [Contract](../../COMPATIBILITY.json) records npm version separately from exact Git SHA. [Package scripts](../../package.json) define actual commands. Host-default Node22/pnpm9 do not establish compatibility.

```bash
# Git Bash, project cwd; scoped PATH only
export PATH="$PWD/.toolchain/node-v24.22.3-win-x64:$PWD/.toolchain/pnpm/node_modules/.bin:$PATH"
export PNPM_SCRIPT="$PWD/.toolchain/pnpm/node_modules/pnpm/bin/pnpm.mjs"
node "$PNPM_SCRIPT" install --frozen-lockfile
node scripts/quality/self-test.mjs
node "$PNPM_SCRIPT" typecheck
node "$PNPM_SCRIPT" lint
node "$PNPM_SCRIPT" format:check
node "$PNPM_SCRIPT" test:unit
node "$PNPM_SCRIPT" test:integration
node "$PNPM_SCRIPT" test:runtime
node "$PNPM_SCRIPT" build
node "$PNPM_SCRIPT" check:docs
node "$PNPM_SCRIPT" check:licenses
node scripts/check-secrets.mjs
node "$PNPM_SCRIPT" check:compatibility
```

A project with no tracked files fails the default secret scan deliberately. Explicit `--include-untracked` provides initialization evidence; rerun default after staging/commit. The scanner never claims to examine ignored private exports/runtime directories or historical Git objects.

## Layers and actual modules

- **Unit**: pure recovery budgets, preview and parsing paths.
- **Security**: malicious ZIP/path/size/CRC/identity cases, entirely synthetic fixtures.
- **Integration**: official Cordis + StorageJson/Domain/JSONL and real temporary filesystem; no replacement Session database.
- **npm runtime**: installed official modules, plugin lifecycle, production AgentLoop; only external model IO scripted, no paid model calls.
- **Pinned source**: `pnpm test:pinned`, [Lead runner](../../scripts/test-pinned.mjs) and real official source Vite aliases. This is not npm runtime relabeled.
- **PackedLoader**:`node scripts/packed-smoke.mjs` performsfreshbuild→actualpack→isolatedofficialpeerconsumer→nativehost/client/Loader/Fiber,and validates everypackagedMarkdownlocaltarget. CODE_OF_CONDUCT is packed;thepnpm lock remains insourcecheckout/separatesourceZIP. Privateexperimenthomes are never packed tosatisfylinks. Consumercredentials/sourcealiasesare cleared;FiberpendingwithmissingrequiredHostservicesisnotactivation;functionalpaths aretest:runtime.
- **Mobile browser**: install standard Playwright Chromium then `pnpm test:mobile`. The runner rebuilds the bundle and launches an isolated authenticated Slot Host plus a complete official CLI Web profile, using ephemeral ports and a project-local Documents override; child Hosts stop afterward. Eight checks at 390×844 and 360×800 currently pass. The explicit local browser-path environment fallback is not a CI dependency, and viewport tests are not real Android/iOS or live-model quality evidence.

- **MCPtransport**: `pnpm test:mcp` exercises [publishedpublicprobe](../../scripts/check-mcp-transport.mjs),actualnestedSDK,loopback307/302destinationobservations andNode stdio. Fivechecks are separate fromVitestcases;OAuth/TLS/realHostremain untested. [Scope](MCP_TRANSPORT.en.md).

`pnpm test:coverage` uses V8 with text/lcov/json-summary reports. No invented 100% coverage or empty evaluation directory passes. `test:evaluation` is claimed only once real evaluation tests exist.

## Same npm version, different source

```bash
node scripts/compare-upstream.mjs
node scripts/check-compatibility.mjs
node scripts/quality/clone-pinned.mjs
node "$PNPM_SCRIPT" test:pinned
# Only official latest source; stable pin unchanged; .test/ must be ignored
node scripts/upstream-compatibility.mjs
```

Audited `ca33fd6843b205e279c7ccb6cb73a472c78f5760` differs from multiple same-version npm source files. Installed version equality does **not** prove that SHA works. Pinned/latest reports must retain actual SHA, exit code and runner identity.

## Current executed record

Node24.22.3/Vitest4.1.12:published npm andexactauditedSHAeach60/60 across28files;latest2e39e704source also60/60,andnpmrc4phonechecks8/8. [Latest execution](UPSTREAM_LATEST.en.md);source success does not establish publishedrc.5npm/browser consumption. This is not overallMVPacceptance;realAppexports/modelquality remain separate. See[runtime evidence](RUNTIME_EVIDENCE.md)and[compatibility](COMPATIBILITY.md). Playwrightfailureattachmentsuseignored `.runtime/browser-results` rather than clearing other test-results;redacttokens and keep productiondata out ofCIartifacts.

## Stdlib check scope

- [Docs](../../scripts/check-docs.mjs): local Markdown targets/anchors, mirrored README heading levels/topics, actual scalar plugin Config vs Cordis patch, eight workflows' scripts/minimal-permission/full-SHA contracts. Not a general YAML parser; no exhaustive external-link network scan. Additional actionlint is recommended.
- [Licenses](../../scripts/check-licenses.mjs): installed manifest runtime dependency + required peer + installed optional closure; SPDX AND/OR allow policy. Unknown licenses/missing nonoptional runtime edges fail. No dev-only closure claim.
- [Secrets](../../scripts/check-secrets.mjs): tracked text patterns without exposing values, [exact synthetic-fixture allowlist](../../scripts/quality/secret-allowlist.json), explicit fake prefixes, logged binary exclusions, symlinks fail for review.
- [Compatibility](../../scripts/check-compatibility.mjs): package/contract/toolchain/exact installed npm versions; full SHA/source DIFF when source checkout exists. Runtime tests remain separate.
- [Self-test](../../scripts/quality/self-test.mjs): assert regressions for links/SPDX/redaction/risk/current-head approvals/exact versions; not an empty pass.

## Evidence and reporting

Ignored `test-results/` retains JSON quality reports, source/pinned/JUnit evidence, upstream JSON/Markdown/logs, packed-smoke JSON/logs and exact tarballs, preparation checksums/local draft. Latest official checkout lives in ignored `.test/results/`. Never upload private Host data, real chats or credentials as artifacts.

Report actual command/tool version/exit/result/evidence and unrun reasons. Failures stay failures; do not replace them with empty passes, mocks or version equality. Not run is neither passed nor failed. GitHub Actions/CodeQL/dependency review/npm audit remain marked unrun until actually configured/executed. Real personal export acceptance is a separate user-provided sample level; synthetic fixtures never stand in for it.

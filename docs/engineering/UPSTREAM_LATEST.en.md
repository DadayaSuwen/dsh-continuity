# Latest official-source compatibility supplement

[中文](UPSTREAM_LATEST.md) · [Stable contract](COMPATIBILITY.md) · [Progress](PROGRESS.md) · [Advisory research](../research/DEPENDENCY_ADVISORY_REVIEW.md)

## 1. Observation and execution tracks

Local continuation on2026-11-19(Asia/Shanghai). Git `ls-remote` and the [GitHub commit API](https://api.github.com/repos/DeepSeek-ai/deepseek-harness/commits/2e39e70496aa02986ca6a820c5d497e816b69d7e) both identified official master as **`2e39e70496aa02986ca6a820c5d497e816b69d7e`**, committed `2026-11-18T10:58:42Z`. Its [root manifest](https://github.com/DeepSeek-ai/deepseek-harness/blob/2e39e70496aa02986ca6a820c5d497e816b69d7e/package.json) states **0.2.2-rc.5**, pnpm11.28.5.

| Track                   | Actual round result | Scope                                                                                         |
| ----------------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| Installed npm0.2.2-rc.4 | 60/60,28files       | Real official runtime; only external model IO scripted                                        |
| Stable ca33fd source    | 60/60,28files       | Official and vendor source aliases                                                            |
| Latest2e39e704 source   | 60/60,28files       | Complete required latest source graph, with installed project third-party/native dependencies |
| Phone Web               | 8/8                 | Full npm0.2.2-rc.4 CLI Web and nativeSlot at390×844/360×800                                   |

Latest-source execution is not published rc.5 npm consumption, complete rc.5 browser/device acceptance or live-model quality. Installer peers and stableSHA remain npm0.2.2-rc.4/ca33fd; probe success never updates them automatically.

## 2. Failure before success

A previously fetched latest commit was blocked by an empty index.lock left by interruption. After confirming no live Git process and the old timestamp, the lock was moved to retained diagnostics without changing tracked official source. Actual latest execution then produced **22 suite-loading failures /36 executed passing tests**: official JSONL persistence references `native/system/packages/entry` in its tsconfig, while the old probe selected packages/vendor only. This was a source-closure defect, not demonstrated API incompatibility.

Adding official native/system to sparse checkout made the same [real continuity seam](../../tests/e2e/runtime/continuity.test.ts) pass, then all60tests passed. The [public latest probe](../../scripts/upstream-compatibility.mjs) subsequently ran end to end: fresh isolated clone→fullSHA→packages/vendor/native-system→[real source runner](../../scripts/test-pinned.mjs), **exit0 /60passed /stablePinUnchanged=true**. Existing object reuse reduced network transfer; npm files did not replace official source. Tracked official checkouts stayed clean.

Earlier network and missing-native failures remain in ignored engineering evidence rather than being rewritten as successes.

## 3. Source-change audit

The [official compare](https://github.com/DeepSeek-ai/deepseek-harness/compare/ca33fd6843b205e279c7ccb6cb73a472c78f5760...2e39e70496aa02986ca6a820c5d497e816b69d7e) reports238commits ahead. Complete local Git-tree comparison finds961changed paths; the API's300-file response was truncated and was not treated as exhaustive.

Independent local src-tree object checks match exactly across bothSHAs: Agent8300ce41…, AgentLoop646b1687…, Session542e2421…, SystemPrompt55a8796d…, importer a6b2e35d…. Examined Storage/SessionQuery/compaction changes are package-version-only, not changes to their src. These are reused core seams, not a whole-repository identity claim.

Actual client changes include [volatile synced Connection recoveryConfig](https://github.com/DeepSeek-ai/deepseek-harness/blob/2e39e70496aa02986ca6a820c5d497e816b69d7e/packages/client/connection/src/types.ts), module config-sync and [Sidebar trailing slots](https://github.com/DeepSeek-ai/deepseek-harness/blob/2e39e70496aa02986ca6a820c5d497e816b69d7e/packages/client/ui-sidebar/src/client/contract/slots.ts). The launcher's sidebar.session.action HOC remains; trailing slots do not replace it. Public compareSource checks entry files selected by project imports and reports one stable-source difference(Connection). Deeper client files were separately inspected with Git; the entry checker does not exhaust browser source.

## 4. Test patch and release gates

Verified exact upgrades to **Vitest /coverage-v8 /mocker4.1.12** remove both mocker moderate findings from actual audit. npm,stable/latest source and phone tracks were each rerun. BackendV8coverage:83.36%statements,71.33%branches,90.09%functions,85.02%lines; UIexcluded.

Production audit remains **zero advisories**. Full developmentHost closure reports **1high /1moderate**. Picomatch's GHSA is withdrawn but registry audit still reports high;4.0.8 is unpublished and withdrawal is not a patch. MCPclient2.2.0 remains moderate, including the rc.5 npm dependency. See [primary-source advisory research](../research/DEPENDENCY_ADVISORY_REVIEW.md). The unchanged high gate actually exits1; no lowered threshold or advisory ignore was added.

## 5. Reproduction and open acceptance

```bash
pnpm install --frozen-lockfile
node scripts/quality/clone-pinned.mjs
pnpm test
pnpm test:pinned
node scripts/upstream-compatibility.mjs
pnpm test:coverage
pnpm test:mobile
pnpm audit --prod --audit-level moderate
pnpm audit --audit-level high
```

Actual toolchain:Node24.22.3/pnpm11.28.5/Vitest4.1.12. OtherNode24 support is not inferred from one executable. [Published configuration](../../vitest.pinned.config.ts) uses official source aliases; the native addon remains the installed official module. Session/Storage/Cordis are not mocked.

RealAppZIP,live character/story quality,Android/iOSOSinteraction,rc.5npm/browser,cloudActions/CodeQL,remotehumanreview/environment,RSS/cross-process/fullSessionattachmentbackup remain separate. Original commit17d8ce9 delivery bytes/checksums remain a historical snapshot; maintenance artifacts are separately identified, not a public release or accepted overallMVP.

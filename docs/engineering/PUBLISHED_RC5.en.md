# Independent published DSH rc.5 consumer validation

> This is the initial dependency-consumer snapshot:runtime60/60,phone6/8. Corrected engine metadata andtwo complete8/8matrices are documented in the[consumerfollow-up](PUBLISHED_RC5_FOLLOWUP.en.md);originalfailuretraces/results remain unchanged.

[中文](PUBLISHED_RC5.md) · Preparation/identity (local-only `.runtime/round-2/rc5-20261119-013341/preparation.json`) · Initial verification (local-only `.runtime/round-2/rc5-20261119-013341/verification.json`)

## 1. Scope and identity

On2026-11-19(Asia/Shanghai), `git archive` of fixedcommit `9d9405c8c96a5e3417c33fd75c182749d0817c38` created a new consumer (local-only `.test/consumers/rc5-20261119-013341`). Only its46DSH dependency/peer/dev manifest entries changed to exact `0.2.2-rc.5`. All17src,36test and21script files remain byte-identical. No source aliases or substitute Session/Storage/Cordis runtime.

Original manifestSHA256:`f92c90726a0e0e1f0f59379b53c4b86060c7cc43cc735322eaf2f2b100ac15a7`;lock:`f99c286b1673be3dad8ecd8b74674372599f5e820ba64e8744341e3f376d2a7d`. SHA256ofJSON-sorted src path/hash records:`326d9514c0208270ce6ab9beb0213632c8d14072d9dc17fcbb3fe670f538035b`;per-file hashes are retained.

## 2. Actual commands and outcomes

Node24.22.3,pnpm11.28.5,Vitest4.1.12,Playwright1.65.1,TypeScript6.0.3. Stages executed sequentially in consumercwd, with unchanged scripts/tests.

| Command                                                    | Exit/result                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm install --no-frozen-lockfile --store-dir TASK_STORE` | 0;actualregistry,747packages,reviewed native lifecycles                        |
| `pnpm exec node ...`                                       | 0;actualNode24.22.3;pnpm's store-switch reinstall also passed                  |
| `node node_modules/vitest/vitest.mjs run`                  | 0;**60/60 across28files**                                                      |
| `node scripts/build.mjs`                                   | 0;productionHost/browser/declarations                                          |
| `node scripts/test-mobile.mjs`                             | 1;**6passed/2failed**,bothfullCLIWeb checks failed;allnativeSlot checks passed |
| `pnpm audit --prod --audit-level moderate --json`          | 0;zero advisories                                                              |
| `pnpm audit --audit-level high --json`                     | 0;0high/1moderate,noignores/thresholdchanges                                   |
| `pnpm audit --audit-level moderate --json`                 | **1**;MCPclient2.2.0 /GHSA-6prh-2h8m-c8cw remainsmoderate                      |

Audit observation:2026-11-19T02:05:26+08:00. The high feed now omitswithdrawnpicomatch;this is not a shipped code fix. Fullmoderate evidence (local-only `.runtime/round-2/rc5-20261119-013341/audit-moderate-receipt.json`) retains the MCP finding and nonzeroexit.

All46directentries and329installedDSHclosure packages are rc.5;no rc.4mixed closure. Versions (local-only `.runtime/round-2/rc5-20261119-013341/installed-official-versions.json`) and manifestdiff (local-only `.runtime/round-2/rc5-20261119-013341/manifest.diff`) retained. npm appended330rc.5release-age records in the consumer workspace;original allowBuilds/undici8.12.2/fflate0.8.3 stayed unchanged. These are not audit exemptions.

## 3. Actual full-Web failure

Initialmatrix (local-only `.test/consumers/rc5-20261119-013341/test-results/mobile-junit.xml`) and redactedHostlog (local-only `.runtime/round-2/rc5-20261119-013341/initial-mobile-hosts.log`) show the officialCLI disabled both dsh-continuity and fixture-model rows because the consumer retained `engines.dsh=0.2.2-rc.4`. At390px,asynchronous onboarding blocked sidebarclick;at360px,navigation opened but the migration launcher was absent. Neither completed full migration.

Actual published app-boot `evaluatePluginCompatibility` returns `{requirements:{"engines.dsh":"0.2.2-rc.4"},exempted:false}`. An in-memory exactrc.5engine passes this assessment,not full-Web acceptance. Admission evidence (local-only `.runtime/round-2/rc5-20261119-013341/admission-diagnosis.json`). No official/API code change or allow-version exemption was used. **FullCLIWeb validation did not pass.** A metadata-corrected matrix was not run;this task did not additionally alterenginefields to hide the initial failure,and alloriginaltracespersist.

## 4. Isolation and acceptance boundaries

390×844/360×800 browsers used realpublishedCLIWeb and smaller nativeSlotHosts,ports53612/53613,not3080. DSH_HOME/Documents/browsertemp/npmcache/store were project-/consumer-local. Credential/sourcealias variables were stripped;retained URLtokens redacted;childHosts stopped. agent-browserCLIwas absent;existing realPlaywrightCLI/Chromium was used rather than installing a newclient.

**This is an rc.5dependency source variant,not proof that the original rc.4installer is rc.5compatible.** Its declared engine determines officialadmission;correct metadata and distinctfullWeb validation are required. This task changed no parentstableca33fd/rc.4,core or canonicalevidence,and made nocommit. SourceSHA2e39e704is reference-only,not this npm execution result.

Only externalmodelIO was scripted. RealAppZIP,livepersonality/relationship/storyquality,Android/iOSOSpicker/download,cloudActions,humanreview,publicrelease andstresswindows remain untested. No paidmodels,realchats/accounts or publicwrites.

## 5. Primary sources and local evidence

- Published [CLI](https://registry.npmjs.org/%40deepseek-ai%2Fdsh/0.2.2-rc.5),[importer](https://registry.npmjs.org/%40deepseek-ai%2Fdsh-deepseek-chat-import/0.2.2-rc.5),[fullWebfrontend](https://registry.npmjs.org/%40deepseek-ai%2Fdsh-web-frontend/0.2.2-rc.5) manifests.
- [Official admission algorithm](https://github.com/DeepSeek-ai/deepseek-harness/blob/2e39e70496aa02986ca6a820c5d497e816b69d7e/packages/boot/app-boot/src/plugin-compatibility.ts#L55-L101),also independently called from installed published code.
- Stage exits (local-only `.runtime/round-2/rc5-20261119-013341/steps.json`),audit exits (local-only `.runtime/round-2/rc5-20261119-013341/audit-steps.json`),npmJUnit (local-only `.test/consumers/rc5-20261119-013341/test-results/junit.xml`). Screenshots/traces are under consumer `.runtime/browser-results`,not sharedroot test-results/dist/mobile.

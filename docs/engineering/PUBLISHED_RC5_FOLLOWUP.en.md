# Published rc5 consumer follow-up

[中文](PUBLISHED_RC5_FOLLOWUP.md)

## 1. Scope and identity

Completed **2026-11-19T02:16:52+08:00, Asia/Shanghai**. Lead explicitly confirmed changing only the isolated consumer's `engines.dsh` from exact `0.2.2-rc.4` to exact `0.2.2-rc.5`. Its46 DSH dependency/peer/dev entries were already exact rc5. This follow-up used no `allow-version` and changed no dependencies, lockfiles or original plugin code.

Source commit: `9d9405c8c96a5e3417c33fd75c182749d0817c38`. All74 src/tests/scripts files remain byte-identical; source aggregate SHA256: `326d9514c0208270ce6ab9beb0213632c8d14072d9dc17fcbb3fe670f538035b`. Undoing the single engine field restores prior consumer manifest SHA `60fd48c6…`; current manifest SHA `bf6fce64…`.

This tests a **published npm rc5 source-variant consumer**, not compatibility of the original rc4 installer. No root package/lock/src/workflow, stable upstream,3080 or original researcher's evidence was edited by this follow-up; no commit was made.

## 2. Actual results

| Check                      | Result and provenance                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Prior consumer npm runtime | **60/60,28files,exit0**; original researcher's actual result, not rerun here                                       |
| Original phone matrix      | **6/8,exit1**;390startup-dialog race and360missing launcher; original version-gate/plugin-disabled traces retained |
| New wrapper A / B          | Each **0tests started,exit1**; WindowsabsoluteESM and directCJSnamed-export wrapper defects; failure logs retained |
| Complete matrix C          | **8/8,exit0,23.3s**; finished02:09:43+08                                                                           |
| Fresh-home repeat D        | **8/8,exit0,22.9s**; finished02:12:11+08                                                                           |
| Build / Node / pnpm        | **exit0**; Node24.22.3,pnpm11.28.5,Playwright1.65.1,Vitest4.1.12                                                   |

EachC/D matrix covers390×844 and360×800: full official CLI Web launcher→ZIP→review→new conversation→followup→backup, plus the smaller nativeSlot journey/error/paste checks. The repeat is not16different product acceptance cases.

**No onboarding-logic change, forced click or sleep bypass.** The original390race did not recur twice; this does not prove it universally solved. Copied-test differences are consumer imports and screenshot destinations only. New wrappers use consumer Playwright's actual ESMentry; generated fixture metadata explicitly declares exactrc5 rather than inheriting rootrc4. Official CLI/plugin/original tests remain unchanged.

## 3. Reproduction and evidence

From project root:

```bash
NODE="$PWD/.toolchain/node-v24.22.3-win-x64/node.exe"
"$NODE" .runtime/round-2/rc5-followup-20261119-015454/run.mjs attempt-d
"$NODE" .runtime/round-2/rc5-followup-20261119-015454/verify.mjs
```

The runner performs consumer-only `node scripts/build.mjs`, then the new `test-mobile.mjs --config playwright.config.ts`; both exit0. The wrapper records explicit existing Chromium1228 and pins `PNPM_SCRIPT` to roottoolchain11.28.5. Child credentials/sourcealiases are stripped; allHOME/DSH/Documents/TEMP roots are project-isolated.

```text
.test/consumers/rc5-20261119-013341/package.json
.runtime/round-2/rc5-20261119-013341/03-npm-runtime.log
.runtime/round-2/rc5-20261119-013341/05-full-mobile.log
.runtime/round-2/rc5-followup-20261119-015454/verification.json
.runtime/round-2/rc5-followup-20261119-015454/steps-attempt-{c,d}.json
.runtime/round-2/rc5-followup-20261119-015454/03-mobile-attempt-{a,b,c,d}.log
.runtime/round-2/rc5-followup-20261119-015454/full-web.spec.ts.diff
.runtime/round-2/rc5-followup-20261119-015454/attempt-{c,d}/mobile-junit.xml
.runtime/round-2/rc5-followup-20261119-015454/attempt-{c,d}/mobile-hosts.log
.runtime/round-2/rc5-followup-20261119-015454/attempt-{c,d}/children.json
.runtime/round-2/rc5-followup-20261119-015454/attempt-d/full-official-mobile-{390x844,360x800}.png
```

Verification exits0; Host tokens are redacted and version-disabled rows are absent. All fourC/D Hosts receivedSIGTERM, close was awaited and theirPIDs were observed absent. Every follow-up background job was collected.

## 4. Remaining boundaries

Consumer MCPclient remains **2.2.0** with unchanged rc5 dependency graph/lock. Prior independent audit:zero production advisories, full development0high/1moderate(MCP); no audit rerun or MCPpatch here. RealApp export, live-model quality, Android/iOSdevices and publicrelease remain unaccepted. Only externalmodelIO uses synthetic fixtures; no paid, real-data or account operation occurred. The original researcher's report and failure evidence remain independent.

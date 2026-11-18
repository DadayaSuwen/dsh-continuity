# No-Git source archive consumer verification

[中文](SOURCE_ARCHIVE.md) · [Public consumer runner](../../scripts/source-smoke.mjs) · [Testing guide](TESTING.en.md) · [Checkout metadata](../../scripts/quality/common.mjs)

## 1. Actual reproduction

Round4 starts with the delivered ed431c5 source ZIP, verified SHA256 `f9a62cf5d4d154622639d38dfa086147cdb5d9065fafd6321e0ebd85e2256d9f`. It contains the lock, source and scripts, not Git, installed dependencies, private tooling or dist. A new C-drive temporary consumer was outside every existing repository. Frozen installation and build completed, then both test:interruption and test:resources exited because `git rev-parse HEAD` failed.

The first offline installation had failed earlier because the C-drive default store lacked packages while the D-drive project store held them. That is an environment/input failure, not a source defect. No lock changes, skipped checks or copied node_modules. Explicitly selecting the existing store completed installation and reproduced the actual Git dependency. Public source-smoke reproduced it again against the immutable old ZIP: install/build/self-test/runtime60 passed, then interruption metadata failed. The original ZIP and failure traces remain unchanged.

## 2. Minimal fix

Only the two ordinary engineering observation runners use optional [checkoutCommit](../../scripts/quality/common.mjs). A commit is recorded only when this package has its own.git, actual show-toplevel matches and a full SHA exists; otherwise null. Ancestor repositories, ZIP names/comments and the upstream COMPATIBILITY SHA are not substitute plugin identities. Harness/worker/dist/archive hashes remain independent. Input validation, storage and official Session conversion are unchanged.

The public quality self-test includes a no.git child within an ancestor checkout and a malformed gitdir, both returning null, plus a full-SHA check for a real checkout. The new regression failed before the helper implementation. Tracked-secret scans, official pinned-source SHA and approval/release scripts retain their intentional Git requirements; none uses a permissive fallback.

## 3. Actual consumer results

Four minimal script fixes applied to the original C-drive consumer made9 interruption checks and8×2 resource observations pass, both recording null sourceCommit. A subsequent ZIP built from the staged tree was installed into a fresh consumer rather than reusing old node_modules:

| Path                       | Actual result                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------- |
| Frozen-lock install        | 747 packages; lock unchanged                                                       |
| Production build           | Actual Host/browser outputs generated                                              |
| Quality self-test          | Docs/license-rule/identity/risk/approval regressions passed                        |
| Published official runtime | 60/60 with real Cordis/Storage/Session/Query/AgentLoop                             |
| Import interruptions       | 9 actual exit73→fresh-process0; sourceCommit:null                                  |
| Resources                  | 8 scenarios×2=16 children; sourceCommit:null, not RSS capacity acceptance          |
| Packed Loader              | Actualpack→57 officialpeer consumer→Host/client/Loader and689 local targets passed |

Candidate SHA256 `dac6f174cbce0a806d476aab0f7e8af369faf39fadf6760264c8af143a8b390d`,554146bytes, observed04:10–04:12+08. This candidate is not the final committed source ZIP. Final delivery must archive the final commit and repeat the full consumer test, binding evidence to its exact ZIP digest.

## 4. Reproduction and CI

Use separately installed Node24.22.3/pnpm11.28.5 from the inner source-package root:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test:interruption
pnpm test:resources -- --repeat=2
pnpm test:packed
# Another trusted SOURCE_ZIP produced by this project:
pnpm test:source -- SOURCE_ZIP
```

This developer test executes trusted project sources, not chat uploads or arbitrary untrusted code. Inputs are bounded at16MiB archive,32MiB expansion,1000 entries and4MiB per entry, with fixed-prefix/path checks. It creates a fresh temporary directory, initializes no Git, strips credential/DSH/Git environment overrides and provides independent HOME/npm configuration. Frozen installation precedes public commands. The caller's package-manager context supplies the pnpm JS entry, so Windows source ZIPs need no private.toolchain. Logs contain no real Host/chat tokens; controlled test directories are retained for investigation.

The E2E workflow archives current HEAD into source-ciZIP then calls the same public command. Linux/cloud execution remains unverified. Ignored raw evidence is labelled local-only rather than packaged download links.

## 5. Acceptance boundaries

This verifies reproducible installation/build/synthetic test paths. No new importer format/database, relaxed rc4 engine, public release or paid model call. It does not replace real App exports, live character/relationship/story quality, Android/iOS OS behavior, complete Session/attachment recovery, default maximum resources or power-loss acceptance. Null archive commit honestly denotes missing Git metadata, not signed source authentication.

# Bounded resource measurements

[中文](RESOURCE_MEASUREMENTS.md) · [Public exports](../../src/index.ts) · [Measurement script](../../scripts/measure-resources.mjs)

## 1. Baseline and execution

Final confirmation ran **2026-11-19 02:57:00–02:57:21, Asia/Shanghai**, with **exit0**:

```bash
# Git Bash, project root; scoped toolchain PATH only
export PATH="$PWD/.toolchain/node-v24.22.3-win-x64:$PATH"
node.exe scripts/measure-resources.mjs --repeat=2
```

That historical invocation uses the original machine's private `.toolchain`. A plain source ZIP uses separately installed Node24/pnpm11 from its inner package root; build first. The current runner records `sourceCommit:null` without own-root Git metadata while retaining actual code/build hashes:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test:resources -- --repeat=2
```

**8 bounded scenarios × 2 repetitions = 16 fresh-child observations**, not16 new Vitest cases or product performance acceptance. Pilot/intermediate runs are retained; this table uses only the final harness confirmation.

- Production source baseline: `ca1b65ce04b11b2d76557e60bd30d3572f69348f`; Node **24.22.3 win-x64**, fflate **0.8.3**.
- Existing `dist/index.js`: **922,979 bytes**, SHA256 `691a67a713c3dd5a7ca1268d7cb2bd4a63f9a4ea461e90d1eded1dd8c82cea06`. Its bytes were checked before/after every child and at the end; no rebuild or modification occurred during measurement.
- Harness SHA256: `cc5e289a29a55d98553eadecfee0d69227246610367c33f58f57dd4e29180eb5`. [Companion fixture](../../tests/fixtures/companion.ts) SHA256: `6717de4cf4714509c16bc830665e96c19a848ae3661f902ad318f86d9a904eae`.
- Environment: Windows `10.0.19045`, AMD Ryzen5 4600H,12 logical CPUs, **15.42 GiB** total memory and **3.54 GiB** free at start. `UV_THREADPOOL_SIZE` was unset(default). This was not an idle dedicated benchmark machine.

Raw JSON, milestone JSONL and exit records remain local-only under `.runtime/round-3/resource-S7Llaw/`, not installer download links. Every invocation creates a new directory; pilots use other `resource-*` directories. No accounts, tokens, real chats or Host data paths were retained.

## 2. Synthetic load and measurement method

Installed fflate creates stored(method0) and deflate(method8, level6) ZIPs. Fixed-seed xorshift32 generates **1/8/32 MiB** near-incompressible binary entries placed before the small official-v3 five-message companion. Expanded/compressed payload ratios are approximately **1.000 /0.999797**, below default200. Each ZIP includes another1322bytes of conversation/metadata. This is not a32MiB novel, real App attachment or image-decoding workload. The public [MessageSchema](../../src/model.ts)8MiB per-text limit was not relaxed.

The harness calls the actual built `previewImport(bytes, filename, {}, signal)` entry. Official format/conversion and [ZIP preflight](../../src/security/archive.ts) are not substituted or mocked. Each successful preview asserts one supported conversation, five messages, ID `c1`, branch `4`, the literal first message, conversation/archive SHA256 and unchanged input bytes. No Storage, Session or commit operation is called.

One new Node child per case, **concurrency1**. Milestones separate imports, fixture creation, preview start/settlement and abort request. Wall time uses `performance`; CPU uses `resourceUsage` differences(microseconds→milliseconds). Stage totals include JIT, multiple threads and measurement overhead; they may exceed wall time and are not utilization percentages.

Preview RSS uses a **15ms JS timer plus start/end snapshots**. OS `resourceUsage.maxRSS`(KiB×1024) separately reports the child high-water mark through pre-result validation, **including imports, fixture creation and preview**—not plugin-only incremental memory. No forced GC. A120s watchdog terminates an uncontrolled child and records timeout/nonzero exit; it is not a performance acceptance threshold. No child timed out.

## 3. Actual measurements

Min–max over the final two repetitions; MiB=1048576bytes. Whole-child peaks are observations, not configured guarantees.

| Payload / ZIP method |  ZIP bytes | Fixture creation ms | Preview wall ms | CPU user/system ms | Pre-preview RSS MiB | Preview sampled/snapshot peak MiB | OS whole-child maxRSS MiB |
| -------------------- | ---------: | ------------------: | --------------: | ------------------ | ------------------: | --------------------------------: | ------------------------: |
| 1MiB stored          |  1,050,384 |         10.80–13.22 |     34.15–36.99 | 63–78 /0           |         70.29–70.89 |                       77.89–79.18 |               78.91–80.20 |
| 1MiB deflate         |  1,049,904 |         85.09–91.11 |     35.61–46.61 | 16–63 /0–16        |         77.04–77.33 |                       83.38–83.51 |               84.29–84.42 |
| 8MiB stored          |  8,390,416 |         40.44–40.57 |   119.61–132.69 | 110–125 /16        |         85.46–85.52 |                       98.63–98.76 |               99.64–99.78 |
| 8MiB deflate         |  8,391,421 |       437.10–457.54 |   151.26–156.59 | 140–188 /15–16     |       110.15–110.54 |                     126.55–127.42 |             127.44–128.31 |
| 32MiB stored         | 33,556,240 |       127.40–135.24 |   430.14–494.22 | 406–547 /0–15      |       132.63–133.36 |                     138.33–139.34 |             164.87–165.77 |
| 32MiB deflate        | 33,562,345 |     1676.91–2028.73 |   549.23–554.21 | 625–719 /31–47     |       171.82–172.12 |                     180.21–180.25 |             181.11–181.15 |

All six stored observations produced **zero timer samples**. Synchronous copying/CRC and subsequent microtasks prevented timer execution; start/end RSS is not the internal peak. At32MiB stored, OS peak was about165MiB while snapshots saw about139MiB. Deflate yielded1,3,10samples respectively, still missing synchronous JSON/CRC after callbacks.

Fixture creation/compression time is **excluded from preview elapsed time**; retained buffers and JIT/GC history still affect child RSS. Do not extrapolate this table to Host capacity planning. Two repetitions give observed ranges, notp95/p99, maximum stress or universal guarantees.

## 4. Limits and in-flight cancellation

| Scenario                                | Independent assertion / result                                                                                     | Final two observations                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Known8MiB entry, `maxEntryBytes=8MiB−1` | `ImportError.code=too-large`; no preview value or durability calls                                                 | 5.90–6.58ms; whole-child86.48–87.08MiB                                                |
| Abort while32MiB deflate is pending     | Initially un-aborted signal; promise pending at request; eventual `AbortError`, no preview value, unchanged digest | Request24.34–26.14ms after call; rejection128.89–141.19ms later; total153.23–167.33ms |

The5ms abort timer follows about19.64–21.27ms of synchronous call prelude;5ms is **not actual request arrival**. The payload is the first large entry, placing the observation during awaited async inflate. [Implementation](../../src/security/archive.ts) checks the signal after awaiting, rather than passing it to zlib. Work continues until callback after abort; immediate inflate or synchronous JSON/CRC interruption is not established. Sample/abort/watchdog timers are cleared, each child close awaited and all jobs collected.

## 5. Acceptance boundaries

These observations establish source, limit and cancellation behavior for the listed synthetic inputs on the current built entry. **Default128MiB upload,512MiB expansion and64MiB entry RSS peaks remain unvalidated.** No arbitrary performance-pass threshold, limit relaxation or production change. High-ratio boundaries, complex trees, large text/many JSON nodes, persistence peaks, Session/attachment migration, concurrent Hosts, low-memory systems, Linux/macOS, real App ZIPs, live-model quality and Android/iOS OS behavior were not tested.

The02:57 table remains a single measured snapshot. A later advertised `pnpm test:resources -- --repeat=2` run at03:27 passed another16 children with identical archive/parser hashes. Its local-only `resource-xXFuVz`32MiB whole-child peaks were about169MiB/184MiB, stored417–451ms and deflate542–596ms. Environment/RSS variation means the earlier181MiB observation is not a capacity ceiling. This confirmation and the03:05/03:27 nine-checkpoint interruption runs are retained separately.

Generated evidence/fixtures stay in new local `resource-*` directories. The installer provides the harness/docs; the separate source ZIP retains the project lock. Overall MVP remains open for actual user data, model quality and device acceptance; this measurement does not replace them.

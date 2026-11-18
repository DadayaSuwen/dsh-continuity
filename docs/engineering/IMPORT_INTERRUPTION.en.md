# Import interruption and restart verification

[中文](IMPORT_INTERRUPTION.md) · [Verification script](../../scripts/check-import-interruption.mjs) · [Source/Session seam](../../src/migration/migration.ts) · [Resource observations](RESOURCE_MEASUREMENTS.en.md)

## 1. Actual baseline and method

Executed **2026-11-19T03:05:07–03:05:26+08:00 (Asia/Shanghai): 9/9 checkpoints, command exit0**. The production baseline is `ca1b65c`, with Node24.22.3 and published DSH0.2.2-rc.4. Tests use real Cordis, StorageJson/Domain, JSONL SessionPersistence, WorkspaceRegistry and the official public DeepSeek importer seam. Only the ZIP/data are synthetic. No running3080 Host or model service is used.

Each checkpoint starts a fresh Node child with an independent temporary domain. At the marker, `process.exit(73)` ends it without Context disposal or finally-based teardown. The parent waits for child close, then launches a second process on the same directory. Source/receipt markers use official [post-durability domain events](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/storage/storage-domain/src/events.ts); Session markers wrap actual append/flush/close handles. Wrappers exist only in the test child, not DSH core or plugin production code. The cancellation case explicitly settles its public operation and drain before stopping, as shown below.

[Worker](../../tests/helpers/import-interruption-worker.ts) SHA256: `cf1dfe220836e7e36f79330d6a4b39a2c888219eb7719d33b1571eab726081e0`; harness SHA256: `7cd170ad16340ce3f9a8b492334b4b682b811974c8b91b2c8a92fc25bc442815`. Generated JSON/log/checkpoints stay local-only under `.runtime/round-3/interruption-*` and `test-results/import-interruption.json`; the installer carries no test homes/logs. Child credentials and DSH-root environment variables are stripped. Original bytes and events are independently compared after restart.

## 2. Checkpoints and observed results

| Checkpoint                  | Exact stop/failure boundary                                                                                        | Fresh-process verification                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| source-retained             | Source bytes/preview record acknowledged durable, then hard exit                                                   | ZIP base64 unchanged; first retry creates, repeat reuses; one Session/one member         |
| source-cancelled            | Abort after durable source notice; commit rejects, drain settles, then exit                                        | Zero Sessions before stop; original retained; restart completes import                   |
| workspace-retryable-failure | Complete Session written, but public attachSession throws a synthetic error; result includes failure and SessionID | Existing ID reused; membership/binding repaired; no duplicate                            |
| receipt-planned             | SessionID/expected_events durable, before SessionPersistence.create                                                | Unmaterialized planned ID may be replaced; source unchanged; one final Session           |
| partial-flushed             | Actual append deliberately writes a legal contiguous prefix; flush resolves, then hard exit                        | Explicit Partial Session error; ID/count/prefix hash unchanged; no overwrite/new Session |
| session-flushed             | All events flush, before handle.close                                                                              | Events unchanged; same ID reused; one member and binding restored                        |
| session-closed              | Complete handle.close, before Workspace attach                                                                     | Existing complete ID reused; old events unchanged                                        |
| workspace-attached          | Official membership durable, before imported receipt update                                                        | Receipt/binding reconciled; membership deduplicated                                      |
| receipt-imported            | Imported receipt acknowledged, before binding write                                                                | Same ID reused; binding restored; old events unchanged                                   |

Every stopped child exits73 and every restart verifier exits0. Seven direct hard-stop markers, one already-observed cancellation and one attachment failure make nine distinct checks. These are standalone CLI observations—not nine new Vitest cases or all-failure transaction guarantees.

## 3. Why partial Sessions remain explicit failures

The official [persistence handle contract](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/session/session-persistence/src/handle.ts) distinguishes append visibility from flush crash durability. Migration returns `partial-import` when an existing Session has fewer events than `expected_events`, retaining originals and partial logs for inspection. The public API offers no Session deletion or whole-import rollback.

This verifies that conservative path. It does not fabricate missing plot, discard prefixes, rewrite old events or mint a replacement conversation to hide failure. Automatic reconciliation applies only to complete history or planned IDs not yet materialized.

## 4. Reproduction and CI

```bash
pnpm install --frozen-lockfile
pnpm test:interruption
```

The script transpiles the test/plugin public importer seam into its own temporary worker; public Host modules remain real external imports. Each child has a30s watchdog and close wait. Build/process/assertion failures return nonzero; successful runs report each checkpoint. Earlier Go-regex `u`-flag and absolute-entry externalization errors were preparation failures, retained in tool traces rather than labelled runtime failures.

The [E2E workflow](../../.github/workflows/e2e.yml) runs the same command sequentially after actual runtime tests. A local pass does not establish cloud Actions execution. Logs contain synthetic data and test paths only, no authentication tokens or real chats.

## 5. Uncovered work

A `process.exit` stop is not power loss, disk-full, OS page-cache loss or an actual force-kill/network-model interruption. This does not interrupt atomic rename/fsync interior bytes, test losses before flush returns, compressed JSONL torn tails, attachment storage, multi-conversation batches, cross-Host writers or future migration formats.

These passes do not establish arbitrary Host performance, complete Session/attachment backup or accepted overall MVP. Actual user App exports, live personality/relationship/story quality, Android/iOS OS behavior and cloud governance remain separate. The1/8/32MiB binary resource workload is not combined with the tiny companion interruption fixture into one acceptance claim.

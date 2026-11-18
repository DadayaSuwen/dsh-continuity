# Import and backup formats

[中文](MIGRATION_FORMAT.md) · [Import guide](../user-guide/import.en.md) · [Backup guide](../user-guide/backup.en.md)

> Engineering-preview documentation for current source, not overall MVP completion. Official export, DSH Session, native capture, plugin Storage and backup versions are independent. Future schema conversion is **Planned**.

## 1. Versions and evidence

| Object                          | Current value                                           | Evidence and scope                                                                             |
| ------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Audited official source         | `master` SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760` | Pinned-source track recorded 60/60 across 28 files on Node 24.22.3                             |
| Published official dependencies | `0.2.2-rc.4`                                            | npm track recorded 60/60 across 28 files on the same Node; version is not Git SHA identity     |
| DeepSeek official export        | `export_format_version: 3`                              | [Fixed official schema][format]; other versions return explicit errors                         |
| Formal DSH Session              | Official `SESSION_FORMAT_VERSION` (4 at this SHA)       | Managed by official writer/factory, not the plugin backup format                               |
| Native Session capture          | `dsh-session-capture`, `schema_version: 1`              | JSON source of an exact queried event slice; header checks official Session version            |
| Continuity backup               | `format: dsh-continuity`, `schema_version: 1`           | [Package schema and restore](../../src/migration/package.ts)                                   |
| Plugin Storage domain           | `dsh_continuity`, version 1                             | `sources / memories / bindings / imports / cursors`; [domain definition](../../src/storage.ts) |

The Node support specification is `>=24.9.0 <25`, with pnpm `11.28.5`; current execution evidence covers **Node 24.22.3** only. The two runtime tracks and **8/8** browser matrix at 390×844 / 360×800 are counted separately. Browsers use full official CLI Web and a smaller native Slot page, both on isolated real Hosts. They do not establish Android/iOS device, real App ZIP, live LLM or remote Actions acceptance. The Lead-owned [progress](../engineering/PROGRESS.md) and [runtime evidence](../engineering/RUNTIME_EVIDENCE.md) maintain current counts.

Same-version npm artifacts still differ from audited source: **31 packages / 16 DIFF** for the entry comparison, **9 DIFF** for actual imports. These are different sets, not complete artifact-identity proofs. [Compatibility metadata](../../COMPATIBILITY.json), [entry comparison](../../scripts/compare-upstream.mjs), [actual-import comparison](../../scripts/check-compatibility.mjs), [official audit summary](../research/DEEPSEEK_IMPORT_AUDIT.en.md)

## 2. Official ZIP v3

```text
manifest.json                         {"export_format_version":3}
chat_session_index.json               [{id, inserted_at, updated_at}, ...]
chat_sessions/<conversation-id>.json   {id, title, current_message_id?, inserted_at, messages}
chat_sessions/<conversation-id>_files/<image-file>
```

Messages contain numeric `id / parent_id`, `USER / ASSISTANT`, status, timestamp strings and fragments. The official schema validates fields read by the engine. **Complete original bytes** remain the authority for unknown fields, all branches and later analysis. Preflight additionally checks filename/index/JSON identity, duplicate message ids and missing parents/cycles across the whole tree. [Preview implementation](../../src/migration/preview.ts)

- The default follows the ancestor chain selected by official `current_message_id`. Absent, null or unmatched values fall back to the largest message id. **It never searches for a latest FINISHED branch.** `FINISHED` governs reply conversion. [Official branch selection and converter][conversation]
- Raw ZIP retains the full tree; a formal Session converts only the selected chain. When a leaf is explicitly selected, the native selector supplies the same choice to commit's `branches` and extraction's `branch_id`. Official converter and default choice remain unchanged. [Branch regression](../../tests/integration/branch-extraction.test.ts)
- REQUEST/RESPONSE, THINK and search/open/read-link follow official conversion. Unknown fragments remain in raw source, not necessarily in model history.
- Unfinished/template replies and withdrawn turns follow official exclusion/failure rules. Retaining raw bytes does not put every source sentence into a formal conversation.
- With an attachment service, images use the official Adapter and may be normalized. Non-image files generally retain cards/metadata; missing exported bodies are not claimed as complete attachment migration. [Official attachment orchestration][importer]
- Times become epoch milliseconds and titles may be normalized/truncated. Raw bytes retain original values; formal events are not a byte-for-byte source copy.

## 3. Preview → commit → duplicate detection

Preview stages data on the Host without creating a formal Session or durable source. Staging expires after 15 minutes; one upload is admitted at a time. Commit rechecks the input, stores the original first and invokes the official importer for each selection. Selecting one source conversation still retains the **entire ZIP**. [Routes](../../src/routes.ts)

`source_id = source:<sha256(original-bytes)>`; source storage keys also include the exact character tuple. Import receipts deduplicate by ownership, individual conversation digest, conversation id and branch id. Renaming a file alone does not change its byte digest. A repacked whole ZIP can have a new source id while the selected conversation digest stays unchanged; when reusing its Session, the receipt stores that id in `source_alias_ids` for same-partition Session-use memory mapping. Restart retries check an assigned Session's existence, event count and workspace before reuse. This is not semantic similarity matching, whole-log authentication or automatic rollback for every failure. [Commit/reconciliation](../../src/migration/migration.ts)

Results distinguish `imported / duplicates / failures / warnings`. Multi-conversation commit is not a cross-file transaction. Cancellation/failure may leave a source, partial Sessions or separate attachments; retained receipts support inspection. Source deletion does not clear the ledger. Formal writes use `create → append → flush → close → attach`; official Agent factory takes over continuation. [Fixed official writer][writer]

Default limits: upload **128 MiB**, total expanded **512 MiB**, compressed/expanded entry **64 MiB**, **10,000 files**, compression ratio **200:1**. Only ordinary stored/deflate ZIP enters this path; ZIP64, multipart, encrypted and special-file entries return explicit errors. Checks cover directory/local headers/descriptors, paths, CRC, actual/declarative sizes, strict UTF-8 and JSON depth/nodes. No arbitrary entry path is extracted to disk. Bounded asynchronous inflate validates first, then supplies a stored subset to the official synchronous importer. Copies and caches mean these limits are not an RSS-peak guarantee. [Archive](../../src/security/archive.ts), [JSON](../../src/security/json.ts)

## 4. TXT / Markdown / generic JSON fallback

Fallback converts one linear conversation without claims of attachment bodies, message trees, native tool events or THINK fidelity. Label text with `用户： / 助手：` or `User: / Assistant:`. Unlabelled text remains `unknown` and unknown original dates remain `null`. Correct unknown speakers before commit. A turn starts with user and takes at most one following assistant; missing replies become failed turns, not invented responses.

```json
{
  "title": "A copied conversation",
  "messages": [
    { "id": "1", "role": "user", "content": "Call me River.", "timestamp": null },
    { "id": "2", "role": "assistant", "content": "Hello, River.", "timestamp": null }
  ]
}
```

Generic JSON roles are `user / assistant / unknown`, with string content. Timestamp may be missing, null, non-negative integer milliseconds or a parseable date string. This is an explicit shape, not universal platform-JSON compatibility. Unknown historical times stay null; formal fallback events are generated during import. [Fallback parser](../../src/migration/preview.ts), [fallback writer](../../src/migration/migration.ts)

## 5. Native Session capture v1

```text
{
  schema_version: 1,
  dsh_session: <official Session Query header>,
  events: <exact queried events with seq greater than the stored cursor>
}
preview.format = "dsh-session-capture"
```

`Continuity.extractSession` captures only Sessions with an exact matching ownership binding. The header retains official Session version; events undergo official snapshot validation. Raw source stores JSON serialization bytes of the complete event slice, with a digest. **This is not an original JSONL-byte copy or a complete Session/separate-attachment backup.** Non-text events and unknown raw fields remain in the slice. [Capture](../../src/plugin.ts), [capture parser](../../src/migration/preview.ts)

Preview projects only user-authored `user/message` and `assistant/message` text into rule inputs. Runtime-context does not become user statements; tools/non-text remain raw. In this format, `source_session_id` equals the captured official Session id. Reimporting a capture creates a labelled text-only Session with today's writer; it does not replay original events or attachments.

`batchEveryTurns=0` disables automatic capture by default. An explicit positive value starts capture at matching `turn/end` batches. Candidates still need user review, with no model extraction or automatic confirmation. Partition/Session queues order work, and successful completion persists `cursors.last_seq`. Retries read unconsumed events without rewriting original logs. Cursors are runtime state, excluded from v1 backup. [Batch regression](../../tests/e2e/runtime/batch-extraction.test.ts)

## 6. Continuity package v1

Top-level fields are `format / schema_version / payload / sha256`. Payload contains:

- `owner`: the original four-part tuple. Restore maps to an explicitly selected destination, not an uploaded owner claim.
- `exported_at`: milliseconds.
- `sources[]`: retained originals' exact `raw_base64`, digest, preview, identity and creation time. Export always includes those retained raw bytes; there is no switch to omit existing originals. The v1 schema allows at most **1,000 sources**, checked by both export and restore.
- `omitted_source_ids?`: optional, at most **1,000** absent-source ids. Export lists sources intentionally removed while still referenced by memory; this does not reconstruct their deleted full text.
- `memories`: full partition identity, every record status, `deleted_fingerprints` and revision, not only active records. Shared writes enforce **10,000 memories / 20,000 tombstones**.

```text
sha256 = SHA-256(UTF-8(JSON.stringify(payload)))
source.digest = SHA-256(base64-decoded source.raw_base64)
source.source_id = "source:" + source.digest
```

Checksums detect mismatches, not encryption, digital signatures, sender authentication or original-platform authentication. Someone who edits a package can recompute the checksum. This is not a generic canonical-JSON protocol; manual reordering/editing changes its digest. [Package schema](../../src/migration/package.ts)

## 7. Restore validation and merge

Before source writes, restore checks package size, strict JSON/schema, payload checksum, consistent original owner/record scope, source id/digest and original-byte digest. Every included source is passed back to `previewImport` using raw bytes and its saved filename; the reconstructed preview must equal the packaged preview. [Implementation](../../src/migration/package.ts)

Memory with an included original must literally quote its conversation/message and match original speaker↔`source_kind`. `memory_type=user` additionally excludes assistant, unknown/inferred and recognizable fiction/roleplay evidence. This raw→preview→evidence check catches independently fabricated previews and assistant-to-user promotion. **It is still not cryptographic source authentication.** [Evidence regression](../../tests/integration/package-evidence.test.ts)

An absent source is accepted only when explicitly listed in `omitted_source_ids`, and an id cannot be both included and omitted. Associated memory is destination-mapped and downgraded to **`source_kind=unknown / status=candidate / confirmed_at=null / conflicts_with=[]`**, retaining excerpts for re-verification. Undeclared absence returns `missing-source`; included but mismatching quotations/classification return `invalid-evidence`. [Missing-source regression](../../tests/integration/package-missing-source.test.ts)

After validation, missing sources are stored first, then one destination partition merges through shared `updateMemoryPartition`. Local/package tombstones are unioned; both current fingerprints and digests embedded in stable memory ids filter existing/incoming records. Identical ids and records are reused; differing records with the same id return `memory-conflict`, without overwriting edits. Full schema, unique ids, scope and cardinality are checked before the next memory revision persists. Sources and memory are not one whole-package transaction. [Tombstone/merge regression](../../tests/integration/package.test.ts), [capacity regression](../../tests/integration/partition-capacity.test.ts)

`source_count` reports included sources; `memory_count` reports total destination records after merge, not new insertions. v1 idempotence means repeated merging of identical valid contents; conflicting destination edits require explicit review rather than silent replacement.

## 8. Coverage, capacity and upgrades

v1 includes retained sources (including captured slices), all memory statuses and tombstones. It excludes **complete formal Session logs, the separate attachment store, Session bindings, import receipts, cursors, model credentials and Host configuration**. Restoring these assets does not restore the original formal conversation or import mapping. An original ZIP can be reimported, and confirmed character memory can serve a fresh conversation. [Migration integration](../../tests/integration/migration.test.ts)

Base64 and previews make a backup larger than its source. Current Web restore still applies Host `maxUploadBytes` to the decoded package; a 128 MiB ZIP does not guarantee a backup that fits the same entrance. JSON-body/base64 handling adds further copies. Large-package streaming and RSS stress acceptance are **Planned**. Export also parses the v1 schema before returning bytes, explicitly reporting overflow of the 1,000-source/1,000-omitted-id and other limits instead of emitting an intrinsically oversized package. Long-running capture needs separate source-count/backup-size checks.

Future schema conversion, encryption/signatures, complete Session/attachment backup, atomic whole-package restore, batch identity mapping/opaque-id renaming, cross-process coordination and whole-model-request token budgets are **Planned**. Pinned-source/npm and browser regressions have completed their engineering checks; the overall MVP still needs user-approved real App ZIP, Android/iOS device and live LLM quality acceptance. Remote Actions/publishing are separate. The Lead-owned [progress](../engineering/PROGRESS.md), [runtime evidence](../engineering/RUNTIME_EVIDENCE.md), [known issues](../engineering/KNOWN_ISSUES.md), [decisions](../engineering/DECISIONS.md), [README](../../README.md) and [requirements](../product/PRD.en.md) maintain final counts and acceptance.

[format]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/format.ts#L11-L127
[conversation]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L90-L171
[importer]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L327-L390
[writer]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L546-L599

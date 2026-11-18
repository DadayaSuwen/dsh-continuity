# Import and backup formats

[中文](MIGRATION_FORMAT.md) · [Import guide](../user-guide/import.en.md) · [Backup guide](../user-guide/backup.en.md)

> Current implementation, not an MVP-completion statement. Official export, DSH Session and plugin backup versions are independent. Future version conversion is **Planned**.

## 1. Versions and evidence

| Object                          | Current value                                         | Evidence / status                                                                                 |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Official source audit           | master SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760` | Fixed source inspected; runtime acceptance separate                                               |
| Published official dependencies | `0.2.2-rc.4`                                          | Earlier 11 product checks passed on Node 24.22.3; several same-version npm and Git sources differ |
| DeepSeek official export        | `export_format_version: 3`                            | [Official schema][format]; other versions return errors                                           |
| DSH Session                     | Official `SESSION_FORMAT_VERSION` (4 at this SHA)     | Managed by the official writer/factory, not plugin JSON                                           |
| Continuity backup               | `format: dsh-continuity`, `schema_version: 1`         | [Current schema and restore](../../src/migration/package.ts)                                      |
| Plugin Storage domain           | `dsh_continuity`, version 1                           | [Local definition](../../src/storage.ts)                                                          |

The Node support specification is `>=24.9.0 <25`; product execution evidence is stated only for **24.22.3**. Pinned Git source and npm artifacts are different evidence tracks; see the [official audit summary](../research/DEEPSEEK_IMPORT_AUDIT.en.md).

## 2. Official ZIP v3

```text
manifest.json                         {"export_format_version":3}
chat_session_index.json               [{id, inserted_at, updated_at}, ...]
chat_sessions/<conversation-id>.json   {id, title, current_message_id?, inserted_at, messages}
chat_sessions/<conversation-id>_files/<image-file>
```

Messages contain numeric ids, parent ids, `USER / ASSISTANT`, status, timestamp strings and fragments. The upstream schema validates fields the engine reads; original bytes remain the authority for unknown fields and later analysis. Preflight additionally checks filename/index/JSON identity, duplicate messages and missing parents/cycles across the full tree. [Preview source](../../src/migration/preview.ts)

- The default follows the ancestor chain selected by `current_message_id`; an absent, null or unmatched value falls back to the largest message id. **It does not search for a latest FINISHED branch.** `FINISHED` governs reply conversion. [Official branch/conversion][conversation]
- The complete tree stays in the raw ZIP; a formal conversation contains one chain. Alternate-leaf commit parameters exist; full UI/memory alignment is **Experimental**.
- REQUEST/RESPONSE, THINK, search/open/read-link follow official conversion. Unknown fragments remain in the source, not necessarily model history.
- Unfinished/template replies and withdrawn turns follow official exclusion/error rules. Raw retention does not mean every source sentence enters a formal conversation.
- With an attachment service, images use the official adapter and may be normalized. Non-image files generally retain cards/metadata only; missing exported bodies are not claimed as complete attachments. [Attachment orchestration][importer]
- Original timestamps are parsed to epoch milliseconds; titles may be normalized/truncated. Original bytes preserve original values; Session events are not a byte-for-byte copy.

## 3. Preview → commit → duplicate detection

Preview stages data on the Host without creating a formal conversation or durable source. Staging expires after 15 minutes; one upload is admitted at a time. Commit rechecks the input, stores the original asset first and invokes the official importer per selection. Selecting one conversation still retains the **entire ZIP**.

`source_id = source:<sha256(original-bytes)>`. The source key also includes exact character ownership. Import receipts deduplicate by scope, individual conversation digest, conversation id and branch id. Renaming identical bytes does not change the digest. On retry after restart, reconciliation checks an assigned Session's existence, event count and workspace before reusing it. This is not semantic similarity matching or automatic rollback for every failure.

Results distinguish `imported / duplicates / failures / warnings`. Multi-conversation commit is not a cross-file transaction; cancellation or failure may leave a source, committed prefix Sessions or unreferenced attachments. Inspect receipts before retrying partial writes. Deleting a source does not clear import receipts. [Commit/reconciliation](../../src/migration/migration.ts), [official writer][writer]

Default limits: upload **128 MiB**, total expanded **512 MiB**, compressed/expanded entry **64 MiB**, **10,000** files, compression ratio **200:1**. Ordinary stored/deflate ZIP only; ZIP64, multipart, encrypted and special-file entries are unsupported. Checks cover directory/local headers/descriptors, paths, CRC, actual/declarative sizes, strict UTF-8 and JSON depth/nodes. No entry-supplied path is extracted to disk. These limits are not an RSS-peak guarantee; copies and expanded buffers still exist. [Archive checks](../../src/security/archive.ts), [JSON checks](../../src/security/json.ts)

## 4. TXT / Markdown / generic JSON fallback

Fallback converts one linear conversation, without attachment bodies, message trees, native tool events or THINK fidelity. Label text with `用户： / 助手：` or `User: / Assistant:`. Unlabelled portions remain `unknown`; missing original dates remain `null`. Commit requires correcting unknown speakers first. A turn starts with user and takes at most one following assistant; a missing reply becomes a failed turn, not a fabricated response.

```json
{
  "title": "A copied conversation",
  "messages": [
    { "id": "1", "role": "user", "content": "Call me River.", "timestamp": null },
    { "id": "2", "role": "assistant", "content": "Hello, River.", "timestamp": null }
  ]
}
```

Generic JSON accepts `user / assistant / unknown`, string content and optional/null/non-negative integer-millisecond/parseable-string timestamps. Correct unknown roles in the file and upload again. This is a documented generic shape, not universal platform-JSON compatibility. Emergency Session events are generated during import; unknown historical source timestamps stay null. [Fallback parser](../../src/migration/preview.ts), [writer](../../src/migration/migration.ts)

## 5. Continuity package v1

Top-level fields are `format / schema_version / payload / sha256`. The payload contains:

- `owner`: the original four-part scope; restore remaps to an explicitly selected destination rather than trusting an uploaded owner claim.
- `exported_at`: milliseconds.
- `sources[]`: exact-byte `raw_base64`, digest, preview, identity and creation time. Current export **always includes** raw bytes; no omission switch exists.
- `memories`: partition identity, records in every status, `deleted_fingerprints` and revision, not only active records.

```text
sha256 = SHA-256(UTF-8(JSON.stringify(payload)))
source.digest = SHA-256(base64-decoded source.raw_base64)
```

The checksum detects mismatches. It is neither encryption, a digital signature nor sender authentication; someone who changes the package can also recompute the checksum. This is not a generic canonical-JSON protocol; avoid manually reordering/editing packages.

Restore validates schema, checksum, consistent scope, original-byte digests and literal provenance, then writes sources and merges one memory partition. Identical id/record pairs are reused; differing records with the same id raise a conflict instead of overwriting. Source writes and the memory update are not one transaction. `source_count` reports sources in the package; `memory_count` reports total records after merging, not newly inserted counts. [Restore implementation](../../src/migration/package.ts)

## 6. Coverage and upgrades

v1 **excludes** formal Session logs, the separate attachment store, bindings, import receipts, model credentials and Host configuration. Restoring sources/memory does not restore the original formal Session. Reimport an original ZIP or create a new conversation with confirmed memory.

Base64 and previews make the backup larger than its source. Current Web restore still has the Host upload cap; a 128 MiB source does not guarantee a backup that fits that cap. Keep the original file; large-package streaming is **Planned**. Deleting sources while retaining memories may yield a package that fails with `missing-source / invalid-evidence`.

Only v1 is implemented. Older/future schema conversion, complete cross-platform Host backup, encryption/signatures, batch identity mapping and atomic whole-package restore are **Planned**. Checks: [package integration](../../tests/integration/package.test.ts), [migration integration](../../tests/integration/migration.test.ts). Mobile, pinned-SHA runtime and real App-export acceptance are separate, not implied by this document.

[format]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/format.ts#L11-L127
[conversation]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L90-L171
[importer]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L327-L390
[writer]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L546-L599

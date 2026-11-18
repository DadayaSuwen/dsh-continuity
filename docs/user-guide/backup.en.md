# Backup, restore and deletion scope

[中文](backup.md) · [Import](import.en.md) · [Memory](memory.en.md)

> Current format: **package v1, raw-source and memory export**. Host export/restore are implemented and checked, and automated phone viewports cover browser download events. Android/iOS system downloads, actual user-export restoration and the overall MVP are not accepted. A checksum is not encryption or a signature. See [engineering runtime evidence](../engineering/RUNTIME_EVIDENCE.md).

## Save a character backup

1. Select the correct character/story identifiers and load saved data.
2. Click “下载完整角色备份” under “备份与管理”. It contains private original conversations and memories; store it deliberately.
3. Verify that the browser actually saved it. Keep original ZIPs/backups and avoid editing fields or checksums manually.
4. Back up before deleting a source to retain its full evidence. A later backup can preserve excerpts while marking the source missing; related records restore only as unknown, unconfirmed candidates, not reconstructed evidence or active memory.

The UI's “complete” means this plugin partition's sources and memories, not a whole-Host or full official-conversation backup. [Current download](../../src/ui/Panel.tsx), [Host export](../../src/routes.ts)

## What v1 contains

| Included                                                                                                                            | Excluded                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| All retained scoped sources, exact original bytes as base64, previews                                                               | Complete formal DSH Session logs and uncaptured new messages               |
| Explicitly captured and retained `dsh-session-capture` raw event slices                                                             | Separate official attachment object store; bodies absent from the original |
| Candidate/active/conflict/superseded memories, versions and excerpts                                                                | Session bindings, import receipts and capture cursors                      |
| Deleted fingerprints and original-memory-id tombstones, partition revision, export time, checksum; `omitted_source_ids` when needed | Model credentials, Host config, encryption and digital signatures          |

Retained raw bytes are always included; there is no summary-only switch. An original ZIP may contain unselected conversations, which remain part of the backed-up bytes. The package is plaintext JSON/base64; base64 is not encryption.

New messages saved as sources through manual service capture or explicitly enabled batches also enter backups. The default `batchEveryTurns=0` does not automatically capture all new messages. These slices and complete Sessions are different assets. [Capture scope](import.en.md), [package implementation](../../src/migration/package.ts)

## Restore

1. Select an explicit destination character/story and Host owner.
2. Choose a v1 package. The Host validates schema, payload SHA-256, raw-byte digests and source ids, and consistent scope. It rederives previews from raw bytes and compares them, then checks literal excerpts and source speaker/evidence kind. A package's self-reported preview is not independent evidence.
3. Read the result. Identical id/record pairs are reused; differing records under the same id raise a conflict. Destination and backup tombstones are merged and matching deleted records skipped, including original ids deleted after editing. Existing data is not silently overwritten.
4. Restoration brings back sources and memories, not original formal Sessions or bindings. Reimport the original ZIP for formal history, or create a fresh conversation to use memory. Reimporting a capture creates a labelled text-only Session rather than rebuilding native events or the separate attachment store.
5. Candidates with complete sources remain candidates; restore does not confirm them. A missing source must be explicitly listed in optional `omitted_source_ids`. Its excerpts survive, but related records restore with `source_kind: unknown`, `status: candidate` and `confirmed_at: null`, excluded from active recovery.
6. Missing references without that explicit marker, or mismatched raw bytes/previews/speaker evidence, still return errors. Inspect sources and candidates before continuing; explicit omission does not invent history or original evidence.

Source writes and the memory update are not a whole-package transaction; an error may leave some sources stored. Returned `memory_count` is the merged total, not a new-insertion count. Inspect destination data before retrying. [Package implementation](../../src/migration/package.ts)

Web restore uses the Host upload cap. Base64/previews enlarge backups; a 128 MiB ZIP does not guarantee a package that fits a 128 MiB restore entry. Verify a small sample and keep the original ZIP. Large-package streaming is **Planned**.

## What the checksum proves

SHA-256 detects disagreement between a digest and payload/original bytes, helping identify transfer/storage corruption. There is no key, signature or sender authentication; deliberate edits with a recomputed checksum can still pass the digest check. Restore additionally reparses raw bytes and checks speaker evidence, but those checks do not authenticate a sender either. v1 is plaintext. Future schema conversion and encryption/signing are **Planned**; upgrading Node/the plugin is not arbitrary-version migration.

## Deletions are independent

| Operation                             | Current effect                                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Delete one/all memories               | Remove scoped records and record content-fingerprint/original-id tombstones; sources/conversations remain                                                                                        |
| Delete original asset                 | Remove the plugin source; existing memories/excerpts, receipts, formal Sessions and attachments remain; full plugin evidence disappears; later missing-source restores become unknown candidates |
| Unload plugin                         | Stop/close services and preserve durable data by default                                                                                                                                         |
| Delete formal conversation/attachment | Official SessionPersistence/Attachment deletion APIs are absent; source deletion does not simulate them                                                                                          |

Editing/deleting memory does not erase older logged context snapshots or existing replies. Old-backup restore respects destination tombstones; a fresh destination that never received a deletion record has no knowledge of deletions that occurred after that old backup. Whole-Host data management must distinguish these assets; a plugin button is not total data erasure. The connected Host holds authoritative data, not the phone browser.

Evidence: [source deletion](../../src/migration/migration.ts), [memory deletion](../../src/memory/memory.ts), [lifecycle](../../src/plugin.ts); [format detail](../architecture/MIGRATION_FORMAT.en.md), [source-evidence checks](../../tests/integration/package-evidence.test.ts) and [explicit missing-source restore checks](../../tests/integration/package-missing-source.test.ts). Actual App exports and Android/iOS restoration experience still require separate acceptance.

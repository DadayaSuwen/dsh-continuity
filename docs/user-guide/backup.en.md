# Backup, restore and deletion scope

[中文](backup.md) · [Import](import.en.md) · [Memory](memory.en.md)

> Current format: **package v1**. Host export/restore are implemented; phone downloads and complete native flows are **Experimental / not accepted**. A checksum is not encryption or a signature.

## Save a character backup

1. Select the correct character/story identifiers and load saved data.
2. Download the character backup under backup/management. It contains private original conversations and memories; store it deliberately.
3. Verify that the browser actually saved it. Keep original ZIPs/backups and avoid editing fields or checksums manually.
4. Back up before deleting a source. If memories still reference it, deleting the source first may produce a package that fails provenance validation on restore.

The current UI's “complete character backup” means the plugin's partition assets, not a whole-Host or full official-conversation backup. [Current download](../../src/ui/Panel.tsx), [Host export](../../src/routes.ts)

## What v1 contains

| Included                                                             | Excluded                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| All scoped sources, exact original bytes as base64, previews         | Formal DSH Session logs and new messages after migration             |
| Candidate/active/conflict/superseded memories, versions and excerpts | Separate official attachment object store                            |
| Deleted fingerprints, partition revision, export time and checksum   | Session bindings, import receipts, model credentials and Host config |

Raw bytes are always included today; there is no summary-only switch. An original ZIP may contain unselected conversations, which remain part of the backed-up bytes. The package is plaintext JSON/base64; base64 is not encryption.

## Restore

1. Select an explicit destination character/story and Host owner.
2. Choose a v1 package. The Host validates schema, payload checksum, raw-byte digests, consistent scope and literal provenance.
3. Read the result. Identical id/record pairs are reused; differing records under the same id raise a conflict instead of silently overwriting.
4. Restoration brings back sources and memories, not original formal Sessions. Reimport the original ZIP for formal history, or create a fresh conversation to use memory.
5. Check confirmed reference data before continuing. Candidates remain candidates; restore does not confirm them.

Source writes and the memory update are not a whole-package transaction; an error may leave some sources stored. Returned memory_count is the merged total, not a new-insertion count. [Package implementation](../../src/migration/package.ts)

Web restore uses the Host upload cap. Base64/previews enlarge backups; a 128 MiB ZIP does not guarantee a package that fits a 128 MiB restore entry. Verify a small sample and keep the original ZIP. Large-package streaming is **Planned**.

## What the checksum proves

SHA-256 detects disagreement between a digest and payload/original bytes, helping identify transfer/storage corruption. There is no key, signature or sender authentication; deliberate edits with a recomputed checksum can pass. v1 has no encryption/signature. Future schema conversion and encryption/signing are **Planned**; upgrading Node/the plugin is not advertised as arbitrary-version migration.

## Deletions are independent

| Operation                             | Current effect                                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Delete one/all memories               | Remove scoped records and record current fingerprint tombstones; sources/conversations remain                                            |
| Delete original asset                 | Remove the plugin source; confirmed memories/excerpts, receipts, formal Sessions and attachments remain; full source evidence disappears |
| Unload plugin                         | Stop/close services and preserve durable data by default                                                                                 |
| Delete formal conversation/attachment | Official SessionPersistence/Attachment deletion APIs are absent; source deletion does not simulate them                                  |

Editing/deleting memory does not erase older logged context snapshots or existing replies. Whole-Host data management must distinguish these assets; a plugin button is not total data erasure. The connected Host holds authoritative data, not the phone browser.

Evidence: [source deletion](../../src/migration/migration.ts), [memory deletion](../../src/memory/memory.ts), [lifecycle](../../src/plugin.ts); [format detail](../architecture/MIGRATION_FORMAT.en.md), [existing package check](../../tests/integration/package.test.ts). Real phones, pinned-source execution and actual user-export restoration still need separate Lead acceptance.

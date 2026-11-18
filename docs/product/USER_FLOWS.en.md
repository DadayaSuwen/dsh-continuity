# User flows

[中文](USER_FLOWS.md) · [Product requirements](PRD.en.md) · [Mobile guide](../user-guide/mobile.en.md)

> Source snapshot: 2026-11-18 (Asia/Shanghai). This is an independently installable engineering preview; **the overall MVP is not accepted**. Real npm-runtime, pinned official-source and complete official CLI Web/native Slot phone-viewport runs have passing evidence. Only external model IO is scripted; real App exports, Android/iOS devices and live-model quality still need acceptance. See [engineering runtime evidence](../engineering/RUNTIME_EVIDENCE.md) for current commands/results.

## 1. Entry and shared prerequisites

Open the DSH Web instance you already connect to and click “迁移与记忆” in the native sidebar. The plugin is independently installable into existing DSH using its official bundle mechanism, not an official DeepSeek endorsement. It is not a standalone client, browser extension or another Harness. The current UI is **Chinese only**; English documentation does not imply an English UI.

Install the locally built package on the Host:

```bash
dsh plugin --profile web add ./dsh-continuity-0.1.0.tgz
```

This is a local installation command, not a public npm release. Paid/external resources, public repositories/releases and remote configuration require explicit user approval; this guide executes none of those actions.

Files go to the **currently connected DSH Host**, not a default phone-browser store. Choose an existing workspace and an explicit character profile; reuse the same owner/stable-assistant/character/nullable-story identifiers. First-use workspace initialization is asynchronous and the panel refreshes briefly. If the list is empty, choose a workspace in the main UI, then click “刷新保存位置” (refresh save location).

The current character-name field also stores `character_id`. Changing it selects another partition, not a rename of an existing profile. Separate display names and opaque ids are **Planned**. [UI entry](../../src/ui/client.tsx), [current panel](../../src/ui/Panel.tsx)

## 2. Import an official ZIP

1. Check whether your installed DeepSeek App offers history export and follow that version's menus. No device evidence supports a universal path. Copy/share text if no ZIP is available.
2. Select the ZIP without unpacking it. Verify the destination Host, character/story, workspace and upload cap; the Host performs preflight after upload.
3. Read conversation/message/branch/attachment-reference counts and warnings. Preview creates neither a formal conversation nor a durable source, expires after 15 minutes and admits one file at a time.
4. Select supported conversations. For multiple branches, keep the official default or choose a leaf in the native “导入分支” selector, then retain the original and commit. Selecting one conversation still retains the whole ZIP.
5. Review imported, duplicate and failed outcomes separately. Partial failure is not total success; reimporting the same source/conversation/branch reuses a receipt-verified formal Session.
6. The panel then extracts literal candidates from that same default chain or selected leaf. Verify provenance and review first. Import/extraction make no model calls and never confirm automatically.

Default ancestry follows `current_message_id`; absent/null/unmatched values fall back to the largest message id, not a “latest FINISHED branch”. FINISHED is a reply-conversion condition. Retaining every raw branch does not place every branch in the active Session. Unfinished/template/withdrawn replies and attachments follow official conversion rules. [Import rules](../architecture/MIGRATION_FORMAT.en.md), [commit](../../src/migration/migration.ts), [branch extraction](../../src/memory/memory.ts)

## 3. Copied-content fallback

1. If ZIP export is absent, copy/share your conversation, label `User:` and `Assistant:`, and use TXT/Markdown or the [generic JSON shape](../architecture/MIGRATION_FORMAT.en.md).
2. Unknown speakers and dates remain unknown. Correct unlabelled speakers and upload again; unknown-role commit returns an error instead of guessing.
3. A turn begins with user and takes at most one assistant reply. Native tool events, attachment bodies and trees are outside fallback fidelity.
4. Use the same preview/select/retain/review process. The plugin does not invent missing original information.

## 4. Review character memory

1. Read the candidate, type, source-message speaker and literal excerpt. Assistant-generated character dialogue/story content is not automatically converted into real-person information.
2. Confirm verified candidates; edit unknown/inferred material first. Explicitly resolve same-fact-key conflicts; replaced records become superseded. Rules do not promise every semantic conflict will be found.
3. Editing any record returns it to candidate; confirm again and reload after stale-version errors. Editing preserves the original `memory_id`; re-extraction reuses it without overwriting the edit or duplicating the id.
4. Delete one or all memories in this character partition; sources and formal conversations remain. Content-fingerprint/original-id tombstones make re-extraction and old-backup restore into a tombstone-retaining partition respect deletion.
5. Review the bounded recovery reference. Unconfirmed, unknown/inferred and other-character records are excluded. Session-scoped records must also match the formal conversation or the source mapping in import receipts.

Rules do not cover arbitrary semantics. Manual evidence-bearing proposals exist at service/route level; a dedicated manual-add UI is **Planned**. There is no default third-party memory API or model extraction. [Memory model](../architecture/MEMORY_MODEL.en.md), [Host state machine](../../src/memory/memory.ts)

## 5. New or resumed conversation

1. Select the same character/story and load saved data.
2. New conversations use official `agents.create`; existing bound conversations use `agents.resume` or an already live Agent. Binding an existing Session to another identity raises a conflict instead of overwriting character ownership.
3. Enter configured Host values in “模型服务” (provider) and “模型” (model). Creation uses those values; Continue/Send applies official `model.select` to a live/resumed Agent. Typing alone does not switch it. Sending messages uses the service's quota.
4. Confirmed reference data enters the next assembly through scoped context, ranked by rule-based relevance to the latest user question, importance and time, with receipt mapping for the correct Session scope. Budgeting conservatively uses plugin-text UTF-8 bytes and may omit whole items; it is not an exact token cap over the whole model window.
5. Official logs retain snapshots and deduplicate unchanged values. After editing/deletion, a new snapshot declares supersession of earlier snapshots; updates/deduplication after actual official compaction have regression coverage. Original history and old events are not rewritten.
6. The panel's brief reply display has been verified through complete official-Web E2E. This does not certify native main-conversation selection/list refresh/return navigation and is not a new chat client. Identity/story quality still needs live-model checks; word-identical cross-model behavior is not promised.
7. New messages can be captured manually through the Host service's `extractSession`, or in batches by explicitly configuring `batchEveryTurns`; the default `0` disables it. There is no dedicated panel button today. New official Session Query event slices are stored as `dsh-session-capture` sources, then rules generate review-only candidates without model calls or automatic confirmation.

Retained captures include explicitly captured new turn events and enter backups. They are not full Session/attachment backups; reimport creates a labelled text-only Session. [Lifecycle/capture](../../src/plugin.ts), [recovery ranking](../../src/recovery/recovery.ts), [official factory](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent/src/index.ts#L412-L445)

## 6. Backup, restore and deletion

Download a character backup before destructive operations. v1 exports raw sources and memories: retained raw bytes, previews, candidate/confirmed data, excerpts, deletion tombstones and captured new event slices. It excludes complete formal Sessions, uncaptured new messages, the separate attachment store, bindings, import receipts, capture cursors and credentials. Retained raw bytes are always included; there is no summary-only switch.

Restore into an explicit destination and merge rather than overwrite. The Host validates payload/raw-byte SHA-256, rederives previews from raw bytes and compares them, then checks literal excerpts and source speaker/evidence kind. Differing records under one id raise a conflict; destination and backup tombstones jointly prevent deleted original ids from reviving. Reimport the original ZIP or create a new conversation separately; restoring the package does not rebuild bindings.

Source deletion keeps existing excerpts, formal conversations and attachments but removes the plugin's full evidence. Missing-source packages must explicitly use optional `omitted_source_ids`; related records restore as unknown, unconfirmed candidates, excluded from active recovery, without invented original evidence. Unmarked missing sources or mismatched evidence still return errors.

The checksum detects mismatches, with no encryption, signature or sender authentication. Source writes and the memory update are not a whole-package transaction; inspect stored data after an error before retrying. Official Host Session/Attachment deletion APIs are absent; plugin-asset deletion is not total chat-data erasure. [Backup scope](../user-guide/backup.en.md), [package implementation](../../src/migration/package.ts)

## 7. Recoverable errors and remaining acceptance

| Condition                                        | User action                                                                    | Current boundary                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Workspace has not appeared                       | Choose a workspace in the main DSH UI, click “刷新保存位置”                    | First-use initialization is asynchronous; no parallel workspace service                                       |
| Too large / busy / expired staging               | Discard staging or choose a smaller file and upload again                      | Default 128 MiB upload; page refresh is not guaranteed to release Host staging                                |
| Unsupported version / invalid tree / absent file | Keep the source, read the report, use a known fallback format                  | Unknown versions are not forced into v3                                                                       |
| Unknown role / invalid ordering                  | Label speakers and upload again                                                | No inferred historical speaker                                                                                |
| Partial import / workspace mismatch              | Inspect stored conversations and receipts before retrying                      | No automatic deletion of durable Sessions                                                                     |
| Stale memory / conflict / binding conflict       | Reload, review, explicitly replace or choose the correct character/new Session | No silent identity or memory overwrite                                                                        |
| Package checksum / evidence error                | Use the original backup, keep the ZIP, inspect explicit omission markers       | No bypass of digests, preview rederivation or speaker checks; missing sources restore only unknown candidates |
| Provider/model field change                      | Use configured Host values and Continue/Send                                   | Typing alone does not switch; live-model quality needs separate acceptance                                    |

Archive defaults are 512 MiB total expansion, 64 MiB per entry, 10,000 files and a compression ratio of 200; one Host staging slot lasts 15 minutes. Raw sources are retained by default. Base64/previews enlarge backups, so the upload cap is not a same-size-original restoration promise. [Limits](../../src/security/archive.ts), [routes](../../src/routes.ts)

Passing npm/pinned-source and complete official CLI Web/native Slot 390×844/360×800 viewport results are in [engineering runtime evidence](../engineering/RUNTIME_EVIDENCE.md); this page does not repeat stale totals. Still needed: actual user DeepSeek App export/restoration, Android/iOS system picking/download/soft keyboard/touch, main-conversation navigation, live-model personality/story quality, reverse-proxy/carrier paths, large files and interruption/restart windows. The overall MVP remains unaccepted; viewport or scripted-model passes do not replace those records.

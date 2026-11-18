# User flows

[中文](USER_FLOWS.md) · [Product requirements](PRD.en.md) · [Mobile guide](../user-guide/mobile.en.md)

> Source snapshot: 2026-11-18 (Asia/Shanghai). Host flows are implemented; native sidebar UI integration is **Experimental / not accepted**. These are usage flows and acceptance targets, not mobile or live-model pass records.

## 1. Entry and shared prerequisites

Open the DSH Web instance you already connect to and use **Migration & memory** in the native sidebar (current label: “迁移与记忆”). The plugin joins the existing DSH bundle, not a standalone client or browser extension. Files go to the **currently connected DSH Host**, not a default phone-browser store. Choose an existing workspace and an explicit character profile; reuse the same stable assistant/character/story identifiers later.

The current character-name field also stores `character_id`. Changing it selects another partition, not a rename of an existing profile. Separate display names and opaque ids are **Planned**. [UI entry](../../src/ui/client.tsx), [current panel](../../src/ui/Panel.tsx)

## 2. Import an official ZIP

1. Check whether your installed DeepSeek App offers history export under its profile/settings/data management. No device evidence supports a universal menu path; versions, regions and systems may differ.
2. Select the ZIP without unpacking it. Review the destination Host and upload cap; the Host performs preflight after upload.
3. Read conversation/message/branch/attachment-reference counts and warnings. Preview creates no formal conversation, expires after 15 minutes and admits one file at a time.
4. Select supported conversations, verify character/workspace, then retain the original and commit. Selecting one conversation still retains the whole ZIP.
5. Review imported, duplicate and failed outcomes separately. Partial failure is not total success; duplicate imports reuse a receipt-verified formal conversation.
6. Extract literal memory candidates and review them before continuing. Import/extraction invoke no model by default.

The default formal conversation follows upstream current-branch selection. Alternate-leaf commit and memory alignment are **Experimental**. Retaining every raw branch does not place every branch in the active conversation. [Import rules](../architecture/MIGRATION_FORMAT.en.md)

## 3. Copied-content fallback

1. If ZIP export is absent, copy/share your conversation, label `User:` and `Assistant:`, and use TXT/Markdown or the [generic JSON shape](../architecture/MIGRATION_FORMAT.en.md).
2. Unknown speakers and dates remain unknown. Correct unlabelled speakers and upload again; unknown-role commit returns an error instead of guessing.
3. A turn begins with user and takes at most one assistant reply. Native tool events, attachment bodies and trees are outside fallback fidelity.
4. Use the same preview/select/retain/review process. The plugin does not invent missing original information.

## 4. Review character memory

1. Read the candidate, type and literal provenance. Character dialogue/story content is not converted into real-person information.
2. Confirm verified candidates; edit unknown/inferred material first. Explicitly resolve same-fact-key conflicts; replaced records become superseded.
3. Editing confirmed content returns it to candidate; confirm again. Reload after stale-version errors.
4. Delete one or all memories in this character partition; sources and formal conversations remain.
5. Review the bounded recovery reference. Unconfirmed or other-character records are excluded.

Rules do not cover arbitrary semantics. Manual evidence-bearing proposals exist at service/route level; a dedicated manual-add UI is **Planned**. [Memory model](../architecture/MEMORY_MODEL.en.md)

## 5. New or resumed conversation

1. Select the same character/story and load saved data.
2. New conversations use official `agents.create`; existing bound conversations use `agents.resume` or an already live Agent.
3. Explicitly select a configured Host provider/model. Sending messages uses its quota. Editing provider/model fields does not guarantee automatic model switching on an already live Agent.
4. Confirmed reference data enters the next assembly through scoped, officially logged context snapshots. Unchanged snapshots deduplicate; imported events are not rewritten.
5. Check identity/current-story recall. Different models are not promised word-identical personalities; deterministic wiring and live-model experience require separate acceptance.

The panel's brief reply display is Experimental. Native main-conversation selection/list refresh/return navigation still needs Lead acceptance; it is not a separate chat client. [Lifecycle](../../src/plugin.ts), [official factory](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent/src/index.ts#L412-L445)

## 6. Backup, restore and deletion

Download a character backup before destructive operations. v1 includes raw sources, candidate/confirmed memories and provenance; it excludes formal Sessions, the separate attachment store, bindings, import receipts and credentials. Restore into an explicit destination and merge, rather than overwrite; reimport the original ZIP or create a new conversation separately.

The checksum detects mismatches, with no encryption, signature or identity authentication. Source deletion keeps formal conversations and memory excerpts but removes full evidence; a backup with remaining references and missing sources may fail to restore. Official Host Session/attachment deletion APIs are absent in this baseline. Source deletion is not formal conversation deletion. [Backup scope](../user-guide/backup.en.md)

## 7. Recoverable errors and remaining acceptance

| Condition                                        | User action                                                   | Current boundary                                            |
| ------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------- |
| Too large / busy / expired staging               | Discard staging or choose a smaller file and upload again     | Refresh is not promised to release Host staging immediately |
| Unsupported version / invalid tree / absent file | Keep the source, read the report, use a known fallback format | Unknown versions are not forced into v3                     |
| Unknown role / invalid ordering                  | Label speakers and upload again                               | No inferred historical speaker                              |
| Partial import / workspace mismatch              | Inspect stored conversations and receipts before retrying     | No automatic deletion of durable Sessions                   |
| Stale memory / conflict                          | Reload, review, explicitly replace                            | No silent overwrite                                         |
| Package checksum / evidence error                | Use the original backup and keep the ZIP                      | Checks are not bypassed                                     |

Pending: native DSH Web flows at 390×844/360×800, actual phone file picking/download, pinned-SHA integration, real App exports, live-model behavior, large files and interruption/restart windows. The existing 11 published-dependency checks do not replace those records. [Runtime check source](../../tests/e2e/runtime/continuity.test.ts)

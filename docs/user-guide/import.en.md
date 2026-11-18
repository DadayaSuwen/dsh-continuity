# Import your conversations

[中文](import.md) · [Mobile entry](mobile.en.md) · [Memory review](memory.en.md)

> This is an independently installable engineering preview; **the overall MVP is not accepted**. Host import and the native panel have actual runtime evidence. Synthetic official-v3 fixtures and automated phone-viewport checks do not certify real App exports, Android/iOS devices or live-model quality. See [engineering runtime evidence](../engineering/RUNTIME_EVIDENCE.md).

## Prefer the official ZIP

1. Check whether your installed DeepSeek App offers history export. Follow the menus in your actual version; copy/share text if export is absent. This guide promises no universal menu path.
2. Select the ZIP without unpacking or editing it. Verify the connected DSH Host, character/story, workspace and upload cap. If the workspace has not appeared, select one in the main DSH UI, then click “刷新保存位置” (refresh save location).
3. Read supported conversations, message trees, branches, attachment references and warnings. Preview only stages data on the Host; no durable source or formal conversation exists yet.
4. Select supported conversations. For a multi-branch conversation, keep the official default or choose a leaf in the native “导入分支” selector, then click “保存原始记录并迁移”. Commit and subsequent rule extraction use the same branch. **Selecting one conversation retains the whole ZIP**, which may contain other private conversations.
5. Distinguish imported/duplicate/failed outcomes. Reimporting the same source, conversation and branch can reuse a receipt-verified formal conversation; partial failure does not imply full rollback.
6. Review literal memory candidates and verify the speaker and provenance. They do not enter recovery before confirmation; assistant-generated stories are not real user facts.

## Retention is not conversion

- The current official gate is `export_format_version: 3`; other versions return errors.
- Default ancestry follows `current_message_id`; absent/null/unmatched values fall back to the largest message id. This is not a “latest FINISHED branch” search. FINISHED controls reply conversion.
- The raw ZIP retains every branch and unknown content; a formal conversation converts only the default chain or the selected leaf's ancestry. Branch selection neither edits the retained ZIP nor merges other branches automatically.
- Images may be normalized by official storage; non-image bodies absent from the export remain cards/metadata. Complete formal-conversation attachment migration is not promised.
- Unfinished/template/withdrawn replies and unknown fragments follow upstream exclusion/reporting rules. Retaining originals does not place all text in model history.
- Original title/time values stay in raw bytes; formal titles may be normalized and dates parsed to milliseconds. Unknown history is not invented.

Evidence: [preview](../../src/migration/preview.ts), [commit](../../src/migration/migration.ts), [branch extraction](../../src/memory/memory.ts), [panel coordination](../../src/ui/Panel.tsx) and [fixed official conversion](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L90-L171).

## TXT / Markdown / JSON fallback

Label copied speakers:

```text
User: Persona: your name is Lin, calm and gentle.
Assistant: I will continue the lighthouse story with you.
User: Story: I hold the silver key; next chapter is finding the captain.
```

Unlabelled portions remain `unknown`; correct the original file and upload again before commit. Turns begin with user and take at most one assistant reply. Missing original dates remain null. Fallback is one linear transcript, not a reconstruction of trees, attachment bodies, native tool events or every platform field. Generic JSON must use the [documented messages shape](../architecture/MIGRATION_FORMAT.en.md), not arbitrary JSON.

## Capture new native DSH messages

A bound native DSH Session can be captured manually through the Host service's `extractSession`, or in turn-based batches by explicitly configuring `batchEveryTurns`; the default `0` disables it. The current panel has no dedicated button for this new-message capture. Extraction after an import is a separate existing flow.

Capture uses official Session Query and a durable cursor to save a new slice of logged events as a raw `dsh-session-capture` source, then extracts review-only candidates from user/assistant text. Non-text events remain in the raw slice; attachment bodies and missing history are not invented. Capture and rule extraction make no model calls and never confirm candidates automatically.

Retained captures are included in [v1 backups](backup.en.md), so explicitly captured new messages can enter source backups. This is still not a complete Session-log backup. Reimporting a capture creates a labelled text-only conversation rather than reconstructing the native event stream. Evidence: [capture service](../../src/plugin.ts) and [capture preflight](../../src/migration/preview.ts).

## Errors and custody

Defaults are 128 MiB upload, 512 MiB ZIP expansion, 64 MiB per entry, 10,000 files and a compression ratio of 200. Preflight also checks paths, CRC, UTF-8 and JSON depth; ZIP64/encrypted/multipart files return errors. One Host staging slot expires after 15 minutes; discard it before choosing another file. Durable records may survive cancellation/interruption; inspect receipts before retrying. [Limits](../../src/security/archive.ts), [staging routes](../../src/routes.ts)

Raw sources are retained by default. Source deletion removes the plugin asset, not official Sessions, attachments or existing memory excerpts. [Back up first](backup.en.md). A package exported after source deletion explicitly lists missing sources; related excerpts restore only as unknown, unconfirmed candidates, not reconstructed evidence. Import and rule extraction have no default external model calls; later conversation messages use the explicitly selected model service.

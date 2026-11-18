# Import your conversations

[中文](import.md) · [Mobile entry](mobile.en.md) · [Memory review](memory.en.md)

> Host import flows are implemented; native UI is **Experimental / not accepted**. Actual checks with synthetic official-v3 fixtures do not certify every real App export or phone flow.

## Prefer the official ZIP

1. Check whether your installed DeepSeek App offers history export. Profile/settings/data management are places to inspect, not universal guaranteed menus. Copy/share text if export is absent.
2. Select the ZIP without unpacking or editing it. Verify the connected DSH Host, character/story, workspace and upload cap.
3. Read supported conversations, message trees, branches, attachment references and warnings. Preview only stages on the Host; no durable source or formal conversation exists yet.
4. Select supported conversations and commit. **Selecting one conversation retains the whole ZIP**, which may contain other private conversations.
5. Distinguish imported/duplicate/failed outcomes. Reimport can reuse receipt-verified formal conversations; partial failure does not imply full rollback.
6. Review literal memory candidates. They do not enter character recovery before confirmation.

## Retention is not conversion

- The current official gate is `export_format_version: 3`; other versions return errors.
- Default ancestry follows `current_message_id`; absent/null/unmatched values fall back to the largest message id. This is not a “latest FINISHED branch” search. FINISHED controls reply conversion.
- The raw ZIP retains every branch and unknown content; a formal conversation has one selected chain. Alternate-leaf commit and memory alignment are Experimental.
- Images may be normalized by official storage; non-image bodies absent from the export remain cards/metadata. Complete formal-conversation attachment migration is not promised.
- Unfinished/template/withdrawn replies and unknown fragments follow upstream exclusion/reporting rules. Retaining originals does not place all text in model history.
- Original title/time values stay in raw bytes; formal titles may be normalized and dates parsed to milliseconds. Unknown history is not invented.

Evidence: [preview](../../src/migration/preview.ts), [commit](../../src/migration/migration.ts), [fixed official conversion](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L90-L171).

## TXT / Markdown / JSON fallback

Label copied speakers:

```text
User: Persona: your name is Lin, calm and gentle.
Assistant: I will continue the lighthouse story with you.
User: Story: I hold the silver key; next chapter is finding the captain.
```

Unlabelled portions remain `unknown`; correct the original file and upload again before commit. Turns begin with user and take at most one assistant reply. Missing original dates remain null. Fallback is one linear transcript, not a reconstruction of trees, attachment bodies, native tool events or every platform field. Generic JSON must use the [documented messages shape](../architecture/MIGRATION_FORMAT.en.md), not arbitrary JSON.

## Errors and custody

The default upload cap is 128 MiB. Preflight bounds expansion, entries, ratios, paths, CRC, UTF-8 and JSON depth. ZIP64/encrypted/multipart files are unsupported. One Host staging slot expires after 15 minutes; discard it before choosing another file. Durable records may survive cancellation/interruption; inspect receipts before retrying.

Source deletion removes the plugin asset, not official Sessions, attachments or memories. [Back up first](backup.en.md). Import and rule extraction have no default external model calls; later conversation messages use the explicitly selected model service.

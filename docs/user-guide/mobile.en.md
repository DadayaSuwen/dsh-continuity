# Mobile use

[中文](mobile.md) · [Import](import.en.md) · [Memory](memory.en.md) · [Backup](backup.en.md)

> This is an installable engineering preview; **the overall MVP is not accepted**. Automated 390×844/360×800 viewport checks have passed on the complete official CLI Web and native Slot Host. They do not certify Android/iOS devices, real App menus or live-model quality. See [engineering runtime evidence](../engineering/RUNTIME_EVIDENCE.md).

## Entry

DSH Continuity is an independently installable DSH bundle plugin using the official plugin/bundle mechanism, not an official DeepSeek endorsement. It is not a standalone phone app, chat client, browser extension or another Harness. Install the locally built package on the connected DSH Host, then open that Host's DSH Web on your phone. Expand the native sidebar and click “迁移与记忆”.

The current UI is **Chinese only**. This English guide is a documentation translation, not a claim that an English interface exists. [Client registration](../../src/ui/client.tsx) uses the official native sidebar slot.

Run this on the Host, not as an npm install in a phone browser:

```bash
dsh plugin --profile web add ./dsh-continuity-0.1.0.tgz
```

This consumes a locally built installation package; it is not a public npm-release announcement. Follow the current DSH profile's install/reload behavior. Paid/external resources, a public repository/release or remote configuration require explicit user approval first; this guide performs none of those actions.

## Sequence

1. Verify the connected Host. Files are processed/stored there, not in durable phone-browser storage. Use a trusted HTTPS connection and Host login for remote access.
2. Choose the same character/story identifiers and an existing workspace. First-use workspace initialization is asynchronous; the panel refreshes briefly. If the list remains empty, choose a workspace in the main DSH UI, then click “刷新保存位置” (refresh save location). The character-name field is also an identity key; changing it selects another partition. Keep the original identifiers.
3. Use the system picker for your ZIP/TXT/Markdown/JSON, or paste speaker-labelled content. Check export availability in your installed DeepSeek App version; no universal menu path is promised.
4. Read the report, warnings and selection. For multiple branches, use the native “导入分支” selector to keep the default or choose a leaf. After commit, distinguish imported/duplicate/failed outcomes and review candidates from that same branch.
5. Enter configured Host values in “模型服务” (provider) and “模型” (model), create a conversation or select a bound one, then send. Typing alone does not switch the model; Continue/Send applies official `model.select` to a live/resumed Agent. Import, rule extraction and explicit capture make no model calls; sending messages uses the selected service's quota.
6. Download the v1 character backup and verify where it actually saved. Its [coverage](backup.en.md) is retained sources and memories, including explicitly captured new event slices, not a whole-Host/Session backup.

Manual new-message capture currently exists only as a Host service; turn-based capture defaults to `batchEveryTurns=0`, disabled. It is not described as an existing mobile button. [Capture details](memory.en.md)

## Status and interruption

An ordinary served page may show upload-byte percentage; a transport carrier may show phase status only. This is not per-entry parse/commit percentage. Cancelling upload, closing the page or switching networks does not guarantee rollback of completed Host writes. Successful preview stages data for 15 minutes; discard it or wait for expiry before selecting another file. Closing the page does not delete durable sources or conversations.

Defaults are 128 MiB upload, 512 MiB ZIP expansion, 64 MiB per entry, 10,000 files and a compression ratio of 200. Backups include base64/previews and can be larger; the same upload cap does not guarantee large-package restoration. Start with a small sample. [Host limits](../../src/security/archive.ts), [staging routes](../../src/routes.ts)

## Verified and still awaiting acceptance

- Verified: automated panel flows on complete official CLI Web and native Slot Host at 390×844 and 360×800, including import/review/new conversation recovery/brief continuation reply/browser download events. Real Host/npm and pinned-source runtime results are in [engineering evidence](../engineering/RUNTIME_EVIDENCE.md), without repeating test totals here.
- Only external model IO uses a scripted adapter in those checks; they do not prove live-model personality or story quality. The brief reply display has complete official-Web E2E evidence, not acceptance of main-conversation list refresh, selection or return navigation.
- Actual Android/iOS system file picking/download persistence, soft keyboard, touch and return navigation still need checks, as do export menus in the installed DeepSeek App and actual user files.
- Reverse-proxy prefixes/transport-carrier combinations, network interruption, staging cleanup, partial failures and large-file windows need separate verification; viewport passes are not deployment-path verdicts.
- The overall MVP still needs actual user-export restoration and live-model quality acceptance.

Source: [panel](../../src/ui/Panel.tsx), [transport](../../src/ui/api.ts), [styles](../../src/ui/style.css). Fixed native-slot evidence: [sidebar contract](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/client/ui-sidebar/src/client/contract/slots.ts#L75-L87).

# Mobile use

[中文](mobile.md) · [Import](import.en.md) · [Memory](memory.en.md) · [Backup](backup.en.md)

> **Experimental / not accepted**: native sidebar source exists; the Lead is completing assembly and mobile flows. No real-phone pass or live-model personality-consistency evidence is claimed here.

## Entry

DSH Continuity is a DSH bundle plugin, not a standalone phone app, chat client or browser extension. Install the release-preparation bundle on the connected DSH Host, then open that Host's DSH Web on your phone. Expand the native sidebar and look for **Migration & memory** (current Chinese label: “迁移与记忆”). The [client registration](../../src/ui/client.tsx) provides the entry; English documentation does not imply accepted English UI.

Run this on the Host, not as an npm install in a phone browser:

```bash
dsh plugin --profile web add ./dsh-continuity-0.1.0.tgz
```

This consumes a local release-preparation artifact; it is not a public npm-release announcement. Follow the current DSH profile's install/reload behavior. Real bundle assembly still requires acceptance.

## Sequence

1. Verify the connected Host. Files are processed/stored there, not in durable phone-browser storage. Use a trusted HTTPS connection and Host login for remote access.
2. Choose the same character/story identifiers and an existing workspace. The current character-name field is also an identity key; changing it selects another partition. Keep the original identifiers.
3. Use the system picker for your ZIP/TXT/Markdown/JSON, or paste speaker-labelled content. Check your own DeepSeek App version for export availability; no universal device-verified menu is documented.
4. Read the report, warnings and selection. After commit, distinguish imported/duplicate/failed outcomes, then review memory candidates.
5. Explicitly select a configured Host model and send a message. Import/rule extraction make no default model calls; conversation uses that service's quota, without bypassing platform limits.
6. Download the v1 character backup and verify where it actually saved. Its [coverage](backup.en.md) differs from a whole-Host backup.

## Status and interruption

An ordinary served page may show upload-byte percentage; a transport carrier may show phase status only. This is not per-entry parse/commit percentage. Cancelling upload, closing the page or switching networks does not guarantee rollback of completed Host writes. Successful preview stages data for 15 minutes; discard it or wait for expiry before selecting another file. Closing the page does not delete durable sources or conversations.

The default upload cap is 128 MiB. Backups include base64/previews and can be larger; the same cap does not guarantee large-package restoration. Start with a small sample. [Host limits](../../src/security/archive.ts), [staging routes](../../src/routes.ts)

## Acceptance still needed

- Real DSH Web at 390×844 and 360×800: sidebar, forms, picker, status, report, memory review, recovery and backup end to end.
- Actual Android/iOS browser picking/download, soft keyboard, touch and return-to-conversation navigation.
- Path prefixes/transport carriers, network interruption, staging cleanup and partial-failure presentation.
- Pinned official source and live-model behavior as separate evidence tracks.

Responsive CSS and Host tests are not those acceptance records. Source: [panel](../../src/ui/Panel.tsx), [transport](../../src/ui/api.ts), [styles](../../src/ui/style.css). Fixed native-slot evidence: [sidebar contract](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/client/ui-sidebar/src/client/contract/slots.ts#L75-L87).

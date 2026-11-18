# Product requirements

[中文](PRD.md) · [User flows](USER_FLOWS.en.md) · [Architecture](../architecture/ARCHITECTURE.en.md)

## Positioning

**DSH Continuity** (`dsh-continuity`) is an extension using the official DSH bundle mechanism, not a browser extension, standalone chat client or new Harness. It preserves the user's own conversation assets and offers reviewable character memory for continuing across conversations/models. It does not bypass platform quotas.

## Desired outcome

On phone/desktop: select an official DeepSeek ZIP → preflight on the connected DSH Host → choose source conversations and character → create formal DSH conversations → review persona/relationship/experience/story candidates → continue or start a new conversation with confirmed reference data → back up plugin assets.

User language is **conversation / character / memory**. Technical Session/Agent terms belong in engineering documents. TXT/Markdown/generic JSON/paste are explicit fallback paths; unknown speakers/times stay unknown and require correction where commit needs speaker roles.

## Implementation and acceptance status

> 2026-11-18 (Asia/Shanghai) documentation snapshot, **not an accepted MVP**. The earlier **11 product checks passed** on **Node 24.22.3** with published official `0.2.2-rc.4` dependencies. Several same-version npm and fixed Git sources differ; those passes are not a pinned-SHA claim. The Lead is completing actual pinned-source tests and mobile UI.

| Seam             | Current source                                                               | Acceptance boundary                                                                          |
| ---------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Official import  | v3 preview/selected commit, raw retention, persistent receipts/deduplication | Synthetic official-format checks; real App files and broader failure windows still pending   |
| Character memory | Rule candidates, confirmation/edit/delete, provenance, exact partitions      | No automatic model extraction; semantic quality and additional edge regressions separate     |
| Continuation     | Official persistence and `agents.create/resume`                              | Scripted production-loop wiring, not live-model personality evidence                         |
| Recovery         | Scoped logged context snapshots, confirmed-only selection, deduplication     | Plugin text budget only; latest-question retrieval and complete-request budgeting Planned    |
| Backup           | v1 sources/memories, checksums, explicit destination restore/merge           | No formal Session/attachment-store/binding/receipt backup; future version conversion Planned |
| Mobile UI        | Native `sidebar.session.action` contribution and current panel               | **Experimental / not accepted**; real Web/mobile flows in progress                           |
| Publication      | Local bundle release preparation                                             | No public npm release or production install claim                                            |

Node specification: `>=24.9.0 <25`; only **24.22.3** is declared actually tested. Tooling: pnpm **11.28.5**. Official source audit: master **`ca33fd6843b205e279c7ccb6cb73a472c78f5760`**; published dependency version: **`0.2.2-rc.4`**, reported separately. [Manifest](../../package.json), [compatibility metadata](../../COMPATIBILITY.json), [official audit](../research/DEEPSEEK_IMPORT_AUDIT.en.md)

## MVP acceptance seams

1. **Migration:** v3 message-tree/attachment/status reports; retain exact source bytes; explicit selection/errors; durable repeat-import handling; honest partial outcomes. Raw all-branch retention is distinct from one-chain formal conversion.
2. **Memory:** persona/user/relationship/episodic/story; candidate/confirmed states, literal provenance, strict ownership, conflicts, editing/deletion/export. Assistant fiction is not real-person information.
3. **Continuation:** official persistence/factory and owned lifecycle; create/resume/restart without rewriting committed source events.
4. **Recovery:** owner + stable assistant + character + nullable story + Session binding; exact identity; relevance/importance/decay and whole-record budgeting; current plot priority; officially logged, deduplicated context. Full-request tokenizer budgeting is still Planned.
5. **Mobile:** native DSH Web slot, system picker/paste/status/report/review/recovery/backup. Actual DSH Web checks at 390×844 and 360×800, plus real-phone file/download behavior, are acceptance targets—not current passes.
6. **Privacy:** disclose the currently connected Host destination; no default external model calls, third-party memory API or training-purpose use introduced by this plugin. User-selected conversation calls follow the configured provider's own behavior. Disclose private, unencrypted backup content.
7. **Engineering:** exact official peers, Node24/pnpm11, real Cordis/Storage/Session/factory/AgentLoop contracts and malformed-file checks, reproducible CI/release preparation. Presence of scripts/workflows does not itself claim successful CI.

## App export guidance

Tell users to inspect export availability in their installed App's profile/settings/data management. Version, region and OS may differ. No device evidence establishes a universal export menu. Copy/share speaker-labelled text when an export entry is absent; do not fabricate original dates/roles.

## Limits made visible

- Only official export v3 is recognized. Other versions return unsupported errors.
- Default branch ancestry follows `current_message_id`, falling back to the largest message id. FINISHED is a reply condition, not a latest-finished-branch search. Alternate-leaf import/memory alignment is Experimental.
- Non-image bodies absent from exports remain absent; raw retention and normalized formal attachment storage are different guarantees.
- Keyword rules preserve quotes and require review; arbitrary-fiction comprehension, automatic live-message/model extraction and vector stores are Planned.
- Current UI names are also identity keys; display-name/id separation and renaming are Planned. Changing identifiers selects a different partition.
- Recovery does not promise word-identical personalities across models. Deterministic recall and live-model quality must be reported independently.
- v1 restores plugin sources/memories, not formal Session logs. Its checksum is not encryption, a signature or authentication against deliberate edits. Future migration is Planned.
- Source deletion is not formal Session deletion; current official Session/attachment deletion APIs are absent. Existing logs/snapshots remain after memory changes.
- No public publication, paid API use, production-account changes or DSH core patch is part of this documentation task.

## Priorities and traceability

P0 evidence audit → P1 official-import vertical slice → P2 reviewable memory → P3 recovery → P4 mobile → P5 open-source release preparation. Advanced vectors, universal cross-platform adapters and an independent app are not introduced as MVP prerequisites.

Implementation: [preview/commit](../../src/migration/migration.ts), [memory](../../src/memory/memory.ts), [recovery](../../src/recovery/recovery.ts), [package](../../src/migration/package.ts), [native client](../../src/ui/client.tsx). Fixed primary evidence: [official format](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/format.ts#L11-L127), [factory](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent/src/index.ts#L412-L445). The Lead must update final test numbers and acceptance status from recorded results rather than this requirements prose.

# Product requirements / 产品需求

[中文](PRD.md) · [User flows](USER_FLOWS.en.md) · [Architecture](../architecture/ARCHITECTURE.en.md)

## Positioning

**DSH Continuity** (`dsh-continuity`) is an independently installable extension through the official DSH bundle mechanism. It is not an official DeepSeek product, browser extension, standalone chat client or another Harness. Its mission is preserving the user's own conversation assets and reviewable character memory across conversations/models, without bypassing platform quotas.

## Desired outcome

Select official DeepSeek ZIP on phone/desktop → preflight on the connected DSH Host → select source conversations/branch/character → official Session → review persona/user/relationship/episode/story candidates → continue or create a new Session with confirmed reference data → backup.

User language is conversation / character / memory. Technical Session/Agent terms belong in engineering docs. Labelled TXT/Markdown/generic JSON/paste are explicit fallback paths; unknown dates and speakers stay unknown.

## Implementation and acceptance status

The local engineering preview has actual Node24.22.3 evidence: published npm and pinned audited source each60/60 across28files; eight native phone checks cover390×844/360×800 and separate full official CLI Web/root Slot Host assemblies. See [runtime evidence](../engineering/RUNTIME_EVIDENCE.md) rather than infer results from scripts. The overall MVP is **not accepted**: real user-approved App exports, Android/iOS device handling and live-model quality remain separate. No public npm/GitHub release or cloud Actions result is claimed.

## MVP acceptance seams

1. Migration: official v3 message-tree/attachment/status report, original-byte preservation, explicit selection/errors, durable repeat-import reconciliation and honest partial outcomes.
2. Memory: persona/user/relationship/episodic/story, candidate/confirmed state, literal provenance, strict ownership, conflicts, editing/deletion/export. Assistant fiction is not real-person information.
3. Continuation: official persistence/factory and owned lifecycle; create/resume/restart without rewriting committed source events. Explicit model selection must reach the next real request.
4. Recovery: owner + stable assistant + character + nullable story + Session binding; exact identity, relevance/importance/decay, whole-record budget, current-plot priority and officially logged deduplicated context. Plugin-envelope budget is distinct from a full-request window guarantee.
5. Mobile: native DSH Web slot with system picker/paste/status/report/review/recovery/backup; real browser viewports390×844/360×800, with actual phone file/download/keyboard acceptance separately recorded.
6. Privacy: disclose the connected Host destination; no default third-party memory/model-extraction/training upload. Conversation calls use the explicitly selected Host model and quota. Disclose private plaintext backup before download.
7. Engineering: exact official peers, Node24/pnpm11, real Cordis/Storage/Session/Query/AgentLoop/compaction and hostile-file checks, reproducible CI/release preparation. CI is included from initialization; trusted-base governance must be seeded by human bootstrap before becoming required.

## App export guidance

Tell users to inspect export availability in their installed App's profile/settings/data management. Versions, regions and operating systems vary; there is no device evidence for a universal export menu. Copy/share speaker-labelled text when export is absent; do not invent original dates/roles.

## Limits made visible

- Official DeepSeek formatv3 only; other versions report unsupported.
- Default branch ancestry uses current_message_id, else the largest message id; FINISHED filters replies, not branches. Explicit leaf selection now drives both commit and extraction. All raw branches remain in the original asset.
- Keyword rules require review and do not promise arbitrary-fiction comprehension. Optional batchEveryTurns defaults0 and produces only review candidates from native Session capture; model extraction/vector stores are Planned.
- Exact identities are currently also UI names. Separate display-name/opaque-ID renaming and shared multi-user memory are Planned.
- Cross-model word-identical personality is not promised. Deterministic wiring/recall and live-model quality are separate.
- Packagev1 preserves sources/memory/tombstones, not complete Session logs, bindings, receipts, capture cursors or separate attachments. Explicit missing sources restore as unknown unconfirmed candidates. Checksums are not encryption/signatures/authentication; future schema conversion is Planned.
- Source/memory/formalSession/attachment deletion are distinct. Official Session/attachment delete API is absent; old logged snapshots remain.
- Large-file peakRSS, broad crash windows, transport carriers/proxy prefixes and cross-process writers remain separate acceptance ceilings.
- Public repository/publication, paid API use, production-account settings or DSH core changes require separate direct user confirmation; none has occurred.

## Priorities and traceability

P0 audit → P1 official-import vertical slice → P2 reviewable memory → P3 recovery → P4 mobile → P5 open-source release preparation. Advanced vector stores, universal adapters and an independent App are not MVP prerequisites.

Implementation: [migration](../../src/migration/migration.ts), [memory](../../src/memory/memory.ts), [recovery](../../src/recovery/recovery.ts), [backup](../../src/migration/package.ts), [client](../../src/ui/client.tsx). Acceptance gaps remain in [known issues](../engineering/KNOWN_ISSUES.md) and [progress](../engineering/PROGRESS.md).

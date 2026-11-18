# Architecture

[中文](ARCHITECTURE.md) · [Memory model](MEMORY_MODEL.en.md) · [Import and backup formats](MIGRATION_FORMAT.en.md)

> Source snapshot: 2026-11-19 (Asia/Shanghai). These are engineering-preview docs: implemented interfaces, executed regressions and overall MVP acceptance are separate. The overall MVP is not accepted.

## 1. Baselines and evidence tracks

The official repository is <https://github.com/DeepSeek-ai/deepseek-harness>, audited at `master` SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760`. Published official packages use `0.2.2-rc.4`; **a version number does not identify npm artifacts with that Git SHA**.

| Track                         | Current record                           | What the evidence establishes                                                                                                                    |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Published npm runtime         | Node 24.22.3, 60/60 across 28 test files | Real Cordis, Storage, Session, Query, Workspace, Connection, production AgentLoop and compaction; only external model IO uses a scripted Adapter |
| Pinned-SHA source runtime     | Same Node, 60/60 across 28 test files    | Official and vendor source aliases point to the audited SHA, independently of the npm runtime                                                    |
| Phone browser matrix          | 390×844 and 360×800, 8/8 total           | Actual full official CLI Web and a smaller native Slot page, both connected to isolated real Hosts                                               |
| Real devices, data and models | Not accepted                             | Those results are not Android/iOS device tests, real App ZIP acceptance, live LLM quality or remote Actions success                              |

The Lead-owned [progress](../engineering/PROGRESS.md) and [runtime evidence](../engineering/RUNTIME_EVIDENCE.md) maintain counts and reproduction commands. The two runtime tracks and browser checks are counted separately, not combined into product acceptance. The Node support specification is `>=24.9.0 <25`, with pnpm `11.28.5`; execution evidence here covers **Node 24.22.3** only. [Manifest](../../package.json)

The CRLF-normalized entry comparison checked **31 packages / 16 DIFF**; the source comparison selected from this project's actual imports recorded **9 DIFF**. These are different comparison sets, and neither proves byte identity of complete published artifacts. [Compatibility metadata](../../COMPATIBILITY.json), [entry comparison](../../scripts/compare-upstream.mjs), [actual-import comparison](../../scripts/check-compatibility.mjs), [official audit summary](../research/DEEPSEEK_IMPORT_AUDIT.en.md)

## 2. Native integration, not a second client

DSH Continuity is a Cordis bundle and Web client contribution to existing DSH. It does not replace Harness, the Web shell, model routing, Session storage or the browser. The launcher decorates the official `sidebar.session.action` HOC and preserves shell-supplied `children`. A React Portal mounts the panel on `document.body`, outside the phone sidebar's clipping geometry. The stylesheet compatibility bridge installs its stylesheet only when absent and removes its own installation on unload, accommodating same-version published npm clients and newer official source stylesheet behavior.

Host façade → exact Connection routes → native panel all use the same domain interfaces. Host config supplies `owner_id`; uploaded owner claims do not determine ownership. The fixed official Connection performs owner admission before callbacks. The current target is one Host owner; principal-aware multi-user sharing is **Planned**.

Local implementation: [bundle patch](../../cordis.patch.yml), [Host façade](../../src/plugin.ts), [routes](../../src/routes.ts), [client registration and Portal](../../src/ui/client.tsx), [panel](../../src/ui/Panel.tsx). Fixed official references: [sidebar HOC contract][sidebar], [owner admission][owner]. Executed phone-browser flows are recorded in section 1; OS file picking, keyboards, downloads, transport carriers and returning to the main conversation still need device acceptance.

## 3. Four independent assets

1. **Original source**: exact bytes, SHA-256, filename and preview, with independent ownership. Selecting one source conversation still preserves the complete ZIP, all branches and unknown fields.
2. **Formal conversation**: the official Session log on the Host. Official conversion, continuation and resume append official events; editing memory does not rewrite imported events.
3. **Character memory**: evidence-bearing candidates or confirmed records, with versions, conflicts and deletion tombstones.
4. **Recovery reference**: an on-demand filtered, ranked and bounded projection for the current binding, rebuilt when memory changes.

A v1 backup includes retained sources and memory, but not complete formal Sessions, separate attachment objects, bindings, import receipts or cursors. Incrementally captured event slices may become new sources; that is still not complete Session restoration. [Data types](../../src/model.ts), [package implementation](../../src/migration/package.ts)

## 4. Modules, interfaces and seams

| Module         | Caller interface                                                           | Hidden implementation responsibilities                                                                          |
| -------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Migration      | `previewImport`, `Migration.commit/source/listSources/deleteSource`        | Archive limits, format Adapters, original retention, receipts, duplicate reconciliation and partial results     |
| Memory         | `propose/extract/confirm/update/delete/deleteAll/list`                     | Literal evidence, exact partitions, review state, versions, conflicts, stable ids and tombstones                |
| Recovery       | `buildRecovery`, `Continuity.bind/recovery`                                | Eligibility, Session-source mapping, relevance, conflicts, reference framing and whole-record selection         |
| Package        | `exportPackage/restorePackage`                                             | v1 validation, digests, preview reconstruction from raw bytes, evidence classification, scope mapping and merge |
| Native Adapter | `Continuity.newSession/continueSession/extractSession`, Connection actions | Official factory, owned handles, model selection, Session Query, cursors and scoped context                     |

[Root exports](../../src/index.ts) expose the domain interfaces. Memory and Package share the internal `updateMemoryPartition` seam, concentrating initialization, serialization, full-schema checks, unique ids and cardinality validation. [Shared writer](../../src/storage.ts)

Actual variation sits at format Adapters (official-v3 ZIP, explicit TXT/Markdown/generic JSON and native Session capture) and DSH integration seams. Existing `storage.domain`, persistence and Agent factory remain in use; no second database or generalized Agent runtime is introduced.

## 5. Official importer seam and branches

The upstream root exports its service/types, not a runtime named `importDeepseekChatExport`. Its explicitly public `./src/*` subpaths provide importer, format and conversation code. The build transpiles this importer seam while leaving shared Host instances external. A public source subpath still requires a valid TS/dependency build graph. [Build](../../scripts/build.mjs), [fixed package exports][exports]

Preflight checks ZIP paths, central/local metadata, counts, sizes, compression ratio, CRC, strict JSON/UTF-8 and the complete message tree. Bounded asynchronous inflate limits output before the official Adapter receives the selected conversation's stored subset ZIP. Entry-supplied paths are never extracted arbitrarily to disk. Copies and caches still exist; configured limits are not a measured RSS ceiling. [Archive](../../src/security/archive.ts), [JSON](../../src/security/json.ts), [preview](../../src/migration/preview.ts), [commit](../../src/migration/migration.ts)

The default ancestor chain follows official `current_message_id`, falling back to the largest message id when absent, null or unmatched. **It never searches for a latest FINISHED branch.** `FINISHED` governs reply conversion/rule extraction, not branch search. When another leaf is explicitly selected, the native branch selector sends the same choice to Session commit's `branches` and memory extraction's `branch_id`; without a choice, both follow the default chain. All original branches stay retained and the official converter itself remains unchanged. [Branch regression](../../tests/integration/branch-extraction.test.ts)

Unknown fallback speakers require correction before commit. Missing exported non-image bodies are not reconstructed. Retaining unknown fragments, THINK, tools and unfinished content in raw bytes does not mean all of them enter formal model history.

## 6. Storage and durability

Official `storage.domain` opens **`dsh_continuity`, version 1, per-record layout**, with five tables: `sources / memories / bindings / imports / cursors`. The existing Host Storage backend owns authoritative data; indexes and retrieval projections are rebuildable. [Domain definition](../../src/storage.ts)

Memory operations and Package restore share one domain/partition writer queue. Before persistence, each change validates the complete `MemoryPartitionSchema`, the exact scope of the partition and every record, unique `memory_id` values and limits of **10,000 memories / 20,000 tombstones**. Overflow or scope mismatch does not persist an invalid next revision. Atomic Storage `update` and service-instance queues do not provide cross-process coordination. [Capacity regression](../../tests/integration/partition-capacity.test.ts)

Import saves raw bytes first, then records a planned Session id, event count and status in a durable receipt. Official writes use `create → append → flush → close → attach`. Multiple Sessions, attachments, sources and workspace attachments are not one transaction. Failure/cancellation can leave partial work. Retry reconciliation checks Session existence, event count and workspace, not byte-level authenticity of the entire history. [Fixed official writer][writer]

New conversations use official `agents.create`; continuation uses `agents.resume`. `sessions.create` alone is not persistence. Bindings are saved before Agent publication, and first binding of an existing Session is checked serially per Host without replacing a conflicting identity. An explicit provider/model choice reaches subsequent live/resumed requests through official `model.select`; it does not change character identity. Unload stops new work, drains queues, disposes plugin-owned handles and closes the domain, preserving durable data. [Lifecycle](../../src/plugin.ts), [fixed Agent factory][factory], [model-selection regression](../../tests/e2e/runtime/model-switch.test.ts)

`extractSession` reads events beyond the durable cursor through official Session Query. A captured source stores JSON bytes of the Session header and complete queried event slice. Only user-authored and assistant message text enters rules; runtime-context/tool content is not treated as user facts. Each exact partition/Session stores `last_seq` after extraction completes. `batchEveryTurns=0` disables automatic batches by default; when enabled, matching `turn/end` batches produce review-only candidates, without model extraction or automatic confirmation. [Batch regression](../../tests/e2e/runtime/batch-extraction.test.ts)

## 7. Scope, recovery and budget

Every lookup exactly matches `owner_id + agent_id + character_id + story_id`, including nullable story; purpose labels never weaken identity. Official runtime Agent id equals Session id, while plugin `agent_id` is a stable cross-conversation identity. Today's panel uses name inputs as identity keys: reusing the entire tuple means the same partition. Separating display names from opaque ids and renaming is **Planned**.

Recovery accepts only confirmed, `active`, valid records with non-unknown/non-inferred provenance. `scope=session` can directly match a capture's formal Session id. Imported sources map through that Session's same-partition `imported` receipt using **`source_id + conversation_id`**. When a repacked ZIP reuses the same source conversation/branch, `source_alias_ids` records its new whole-package source id; mapping covers the original id and these aliases. This mapping is not an additional branch-isolation guarantee. [Recovery algorithm](../../src/recovery/recovery.ts), [Session-scope regression](../../tests/e2e/runtime/session-scope.test.ts)

The live callback uses that Agent's latest claimed user question as its query, ranking keywords alongside persona/story anchors, importance, confidence and episodic decay. The query is empty until a new user question is claimed; historical question reconstruction and semantic/vector retrieval are not claimed. Default `contextTokenBudget=2048` uses UTF-8 bytes of the entire plugin header + JSON as a conservative proxy. It excludes official reminder framing, other context, system prompts and history; whole-model-request window budgeting remains **Planned**.

The plugin registers `agent.ctx.systemPrompt.context`, named `dsh-continuity:character`, with `interpolate=false`. Upstream materializes a durable user-role `runtime-context`, deduplicates unchanged named sections and derives a new snapshot when content/retained state changes after compaction. Executed official BasicCompaction and token-meter regression covers edits, deletion, post-compaction refresh and unchanged deduplication while preserving the original event prefix. This is not invisible injection and does not erase older logs or model replies. [Fixed context registry][context], [fixed projection][projection], [context-mutation regression](../../tests/e2e/runtime/context-mutation.test.ts)

## 8. Data destination, backup and deletion

Parsing and durable data live on the **DSH Host currently connected by the user**, not in durable phone-browser storage. Default extraction invokes neither models nor external memory interfaces. Explicit conversation requests use the selected Host model and quota.

Source deletion, memory deletion and formal Session/attachment deletion are independent. Source deletion leaves memory excerpts, receipts and Sessions. Memory deletion records the stable-id digest and current-content fingerprint; re-extraction and older-backup merging respect those tombstones. They do not erase historical snapshots, replies or previously downloaded backups. The audited official SessionPersistence/Attachment interfaces expose no deletion operation; plugin unload preserves data by default.

v1 backup includes every memory status, tombstones and retained raw bytes. After intentional source removal, `omitted_source_ids` explicitly lists absent ids; associated excerpts restore as `unknown / candidate / confirmed_at=null`, not confirmed facts. Where raw sources exist, restore reconstructs preview from those bytes and checks literal excerpts and original speaker↔memory classification. Checksums and these internal consistency checks are not encryption, digital signatures or sender/source authentication. [Package](../../src/migration/package.ts), [backup guide](../user-guide/backup.en.md), [missing-source regression](../../tests/integration/package-missing-source.test.ts)

## 9. Engineering preview and unaccepted work

The recorded npm, pinned-source and phone-browser regressions have executed, establishing current deterministic wiring and browser flows on their respective tracks. Overall MVP acceptance still needs a user-approved real App ZIP, Android/iOS device operations and live LLM personality/relationship/story quality. Local checks do not establish cloud Actions, remote governance or publishing success.

Current production/project-dev audits are zero andtheunchangedhighgate exits0. MCP SDK2.3.0projectoverride passes five realpublicprobe checks;picomatch4.0.7 disappeared afteradvisorywithdrawal,not a codepatch. OtheruserHostSDKs are not replaced byinstallingtheplugin. [MCPscope](../engineering/MCP_TRANSPORT.en.md) · [Knownissues](../engineering/KNOWN_ISSUES.md).

Future schema conversion, encryption/signatures, complete Session/separate-attachment backup, whole-model-request token budgets, cross-process writers, opaque-id/display-name renaming, multi-user sharing, large-file RSS/streaming and broader crash-window acceptance are **Planned**. These docs do not replace the Lead-owned [decisions](../engineering/DECISIONS.md), [progress](../engineering/PROGRESS.md), [README](../../README.md) or [requirements](../product/PRD.en.md). The [deterministic runtime check](../../tests/e2e/runtime/continuity.test.ts) establishes wiring, not natural-language quality.

[sidebar]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/client/ui-sidebar/src/client/contract/slots.ts#L75-L87
[owner]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/client/connection/src/rpc-host.ts#L140-L172
[exports]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/package.json#L18-L68
[factory]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent/src/index.ts#L412-L445
[writer]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L546-L599
[context]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/system-prompt/src/index.ts#L520-L542
[projection]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent-loop/src/runtime-context.ts#L124-L179

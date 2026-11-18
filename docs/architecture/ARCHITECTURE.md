# Architecture / 架构

## Audited baseline

Official repository <https://github.com/DeepSeek-ai/deepseek-harness>, branch `master`, audit SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760`, package version `0.2.2-rc.4`. Runtime validation remains pending until recorded tests pass.

## Deep modules and interfaces

- **Migration module**: `preview(bytes, filename)` and `commit(selection, binding)` hide archive policy, official Adapter, schema checks, reports, immutable source retention and repeat-import ledger.
- **Character module**: `propose/confirm/update/delete/list` hide provenance, data partitioning, candidate status and contradiction handling. Every output is detached data.
- **Recovery module**: `bind/build` hide Session association, relevant retrieval, priorities, decay, conflicts and whole-envelope byte/token budget. No caller builds a global prompt from unfiltered memories.
- **Package module**: `export/restore` hide schema version, digest checks and id remapping. Raw records and memory are independently preserved.
- **Cordis Adapter**: authoritative storage lives in `storage.domain`; official SessionPersistence and `agents.create/resume` provide history/continuation. Native Connection route and UI Slot adapt these same interfaces.

Real variability exists only at format Adapters (official DeepSeek ZIP vs TXT/Markdown/generic JSON) and at DSH integration seams. Avoid an extra database or generalized Agent runtime.

## Four distinct assets

1. Source archive: exact imported bytes with SHA-256 and filename, bounded/preserved under a source record; all branches and unsupported content remain retrievable.
2. Official DSH Session: official conversion and immutable event-sourced history in Host persistence. Plugin never rewrites committed events.
3. Character memory: derived candidates/confirmed facts with source links and revisions, in official Storage domain.
4. Recovery context: budgeted projection of approved memory into current Agent context, re-derived after edits, deletions or compaction.

## Official importer seam

Published root exports service/types, **not** `importDeepseekChatExport`. Adapter uses the explicitly exported `@deepseek-ai/dsh-deepseek-chat-import/src/importer.ts` and companion archive/format/conversation sources; build transpiles this single seam and leaves shared Host instances external. Original canonical ZIP parsing and message tree conversion stay upstream-owned.

Preflight validates ZIP metadata/local headers, path names, file count, expanded totals, compression ratio, declared-vs-actual size, JSON UTF-8/depth, attachment paths. Selected conversation subset is a bounded temporary archive passed to official engine; source remains intact. Defensive worker/timeout or bounded pre-inflate validation contains upstream synchronous inflate limits. No extraction writes paths supplied by archive entries.

## Scope and identity

DSH Agent id equals Session id. Plugin's `agent_id` is stable user-chosen logical identity, not runtime Agent id. Every record carries owner/agent/character; every retrieval checks these exact fields; story/session scopes add filters, never remove identity checks. Browser request owner comes from Host config/authenticated owner route, not an uploaded claim. Different roles with the same display name remain isolated.

MVP targets one local Host owner. Remote multi-user principals denied at the plugin Connection owner route; future principal-aware sharing requires explicit design/testing, not string fields alone.

## Durability and failures

Native `storage.domain` persists before in-memory mutation, provides queued `update` and `deleteMany`; use per-record layout for sparse large source records. Invalid authoritative records fail visibly rather than skip. Original source saved before import commit; ledger stores planned Session IDs and completed outcomes so restart can reconcile without duplicate rewrite. Official per-Session commit is not a multi-session transaction; partial import is reported honestly and raw input remains available.

Session writes use official handle `create/append/flush/close`. Production Agent factory attaches live writer and resumes existing history. Direct `sessions.create` alone is not persistence.

## Context injection timing

Latest `agent.inject` durably appends inbox input; accepted input enters user/message. Preferred scoped `agent.ctx.systemPrompt.context` contributes literal untrusted-data context; official runtime context diff skips unchanged snapshots and re-materializes after compaction. Content is logged by the official loop; original imported events remain untouched. There is no invisible model-message seam in this baseline and no core patch.

## Storage map

- Official Session files: existing Host SessionPersistence root; no replacement.
- Character/source/import/binding records: `storage.domain` routed to existing JSON backend root, domain `dsh-continuity` with per-record records.
- Search/ranking index: derived bounded in-process maps; rebuildable on restart.
- Upload: bounded memory with cancellation, no arbitrary disk extraction. Source persistence is explicit; staging buffers released on cancellation/expiry.
- Backup: explicit user download, schema version + digest, all requested data, raw-byte retention optional on export.
- Deletion: source delete and memory delete are independent; uninstall drains and closes domain but preserves data. Host Session/Attachment deletion follows Host management, not fake plugin deletion.

## Runtime/testing

Node24.22.3/pnpm11.28.5 isolated on Windows, exact DSH prerelease peers. Tests run real Cordis, JSON storage, JSONL persistence, official importer, production AgentLoop; only external LLM responses scripted. UI rendered as native React Slot inside an actual DSH Web assembly for mobile E2E. A deterministic scripted model verifies wiring, not language-model quality; optional paid/live model tests remain explicit separate evidence.

# Architecture

[中文](ARCHITECTURE.md) · [Memory model](MEMORY_MODEL.en.md) · [Import/backup format](MIGRATION_FORMAT.en.md)

> 2026-11-18 (Asia/Shanghai) source-based snapshot. Implemented seams and acceptance evidence are separate; this project is not presented as an accepted MVP.

## 1. Baselines and evidence tracks

| Track                 | Baseline                                              | Status                                                                                                                                 |
| --------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Official source       | master SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760` | Audited; pinned-source execution is being completed by the Lead                                                                        |
| Published packages    | DSH `0.2.2-rc.4`                                      | Earlier 11 product checks passed on Node 24.22.3 with real Cordis/Storage/Session/production-loop seams and scripted external model IO |
| Native sidebar UI     | Current client source                                 | Experimental; mobile assembly and acceptance in progress                                                                               |
| Live-model continuity | Explicit future model evaluation                      | Not accepted; scripted responses prove wiring, not personality quality                                                                 |

Several same-version npm sources differ from the audited Git source. An entry-only, CRLF-normalized comparison checked 29 available packages and found 15 differing entries; it does not prove full artifact identity. [Compatibility metadata](../../COMPATIBILITY.json), [comparison script](../../scripts/compare-upstream.mjs), [audit summary](../research/DEEPSEEK_IMPORT_AUDIT.en.md)

The support specification is Node `>=24.9.0 <25`, pnpm `11.28.5`, exact DSH prerelease peers. Only Node **24.22.3** has product execution evidence. [Manifest](../../package.json)

## 2. Native integration, not a second client

DSH Continuity adds a Cordis bundle and Web client contribution to existing DSH. It neither owns a new Harness nor replaces the Web shell, model route, Session database or browser. The current launcher decorates the official `sidebar.session.action` HOC and preserves its children. The panel's brief reply display is Experimental; native conversation selection/navigation still requires acceptance.

Host service → exact Connection routes → native sidebar panel all use the same migration/memory/recovery/package seams. Uploaded owner claims do not define ownership; Host config supplies the owner. The audited Connection exact-route path admits owners before callbacks. Multi-user principal-aware sharing is Planned, not implied by string ids.

Local source: [bundle patch](../../cordis.patch.yml), [service](../../src/plugin.ts), [routes](../../src/routes.ts), [client registration](../../src/ui/client.tsx), [panel](../../src/ui/Panel.tsx). Fixed official sources: [sidebar contract](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/client/ui-sidebar/src/client/contract/slots.ts#L75-L87), [owner admission](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/client/connection/src/rpc-host.ts#L140-L172).

## 3. Four assets

1. **Original source**: exact bytes, SHA-256, filename and preview, scoped independently. The whole ZIP remains retained even when one conversation is selected.
2. **Formal conversation**: official Session log on the Host. Conversion/continuation append official events; changing memory does not rewrite imported events.
3. **Character memory**: evidence-bearing candidates and confirmed records with versions, conflicts and deletion fingerprints.
4. **Recovery reference**: an on-demand, bounded projection of eligible confirmed records for the current binding.

Original source and memory are separately backed up. v1 backup does not include formal Session logs, separate attachment objects, bindings or import receipts. [Data types](../../src/model.ts), [package](../../src/migration/package.ts)

## 4. Modules and seams

| Module         | Public seam                                                         | Hidden responsibilities                                                                      |
| -------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Migration      | `previewImport`, `Migration.commit/source/listSources/deleteSource` | ZIP bounds, adapters, source retention, receipts, duplicate reconciliation, partial outcomes |
| Memory         | `propose/extract/confirm/update/delete/deleteAll/list`              | Evidence, exact partitioning, review status, version checks, conflicts and fingerprints      |
| Recovery       | `buildRecovery`, `Continuity.bind/recovery`                         | Eligibility, ranking, conflicts, framing and whole-record selection                          |
| Package        | `exportPackage/restorePackage`                                      | v1 validation, digests, evidence checks, scope remapping and merge                           |
| Native adapter | `Continuity.newSession/continueSession` and Connection actions      | Official factory, owned handles, client transport and scoped context                         |

[Root exports](../../src/index.ts) expose these interfaces. Native `storage.domain`, persistence and Agent factory are reused instead of introducing another database/runtime. Real format variability is limited to official-v3 ZIP versus explicit fallback text/Markdown/JSON.

## 5. Official importer boundary

The upstream package root exports its service/types, not a runtime named `importDeepseekChatExport`. The explicitly exported `./src/*` subpath provides the importer, format and conversation seams. The build transpiles the importer boundary while keeping shared Host services external. A public source path still requires a working TS/dependency build graph. [Build](../../scripts/build.mjs), [fixed package exports](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/package.json#L18-L68)

Preflight validates archive paths, central/local metadata, sizes, count, ratio, CRC and strict JSON/UTF-8, including the complete message tree. It never extracts entry paths to disk. Bounded asynchronous inflate limits output before the official adapter sees a selected, uncompressed subset ZIP. Total copies/buffers still exist; limits are not a measured RSS ceiling. [Archive](../../src/security/archive.ts), [JSON](../../src/security/json.ts), [preview](../../src/migration/preview.ts), [commit](../../src/migration/migration.ts)

Default ancestry follows `current_message_id`, falling back to the largest message id; FINISHED is a reply-conversion condition, not branch search. Raw all-branch retention and one-chain Session conversion are distinct. Alternate-leaf commit exists but extraction still follows the preview's default branch, so alternate-branch recovery is Experimental. Unknown fallback roles require correction before commit. Non-image bodies absent from an export are not reconstructed.

## 6. Storage and durability

The plugin opens the official per-record domain **`dsh_continuity`**, version 1, with `sources / memories / bindings / imports`. Authority is the existing Host Storage backend; no extra SQLite/Git/Python memory service is introduced. One memory partition is atomically updated via the domain table; migration uses a service-instance queue and a durable receipt before Session creation. [Storage definition](../../src/storage.ts)

Commit stores original bytes before converting selected conversations. Receipts record planned Session id/event count/status and reconcile persisted logs on retry. Official per-Session writes use `create → append → flush → close → attach`; multiple Sessions, attachments, source writes and workspace attachment are not one transaction. Failures/cancellation can preserve partial work. Reconciliation checks existence/event count/workspace, not every historical event byte. Cross-process writer coordination and broad crash-window acceptance remain Planned.

Live continuation uses official `agents.create/resume`, not `sessions.create` alone. Bindings are persisted before publication so scoped creation hooks choose the right partition. Plugin-owned handles are disposed and queues drained on unload, with durable data retained. [Lifecycle](../../src/plugin.ts), [fixed Agent factory](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent/src/index.ts#L412-L445), [official writer](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L546-L599)

## 7. Scope, context and budget

Every lookup matches owner, stable assistant, character and nullable story exactly. Purpose labels do not weaken identity. Runtime Agent id equals official Session id; the plugin's `agent_id` is a stable logical identity. Current display-name fields are also identity keys; rename/mapping UI is Planned.

Confirmed, valid records only enter recovery. The current live callback passes no query; question-aware retrieval is Planned. `contextTokenBudget` covers the UTF-8 byte length of the plugin's header/JSON as a conservative proxy, not the full model request or upstream reminder framing. Persona/story anchors, importance/confidence and episodic decay rank whole records. [Recovery](../../src/recovery/recovery.ts)

The plugin registers `agent.ctx.systemPrompt.context`, name `dsh-continuity:character`, `interpolate=false`. Upstream materializes a durable user-role `runtime-context` snapshot; unchanged named sections deduplicate, and retained-state changes after compaction can trigger another snapshot. No invisible message seam or core patch is claimed. Prior logged snapshots remain historical evidence after edits/deletion. [Fixed context registry](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/system-prompt/src/index.ts#L520-L542), [projection](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent-loop/src/runtime-context.ts#L124-L179)

## 8. Data destination and deletion

Files are processed/stored on the DSH Host the user currently connects to, not a durable phone-browser store. No default model invocation or external memory API is introduced. User-selected conversation routes may call that Host's configured model and use its quota; no platform-limit bypass is part of the product.

Source deletion, memory deletion and formal Session/attachment deletion differ. Deleting a source removes full evidence but leaves excerpts/receipts/Sessions; a subsequent backup with missing sources may fail restoration. Current official SessionPersistence/Attachment deletion APIs are absent. v1 backup is unencrypted/unsigned JSON with checksum, and future schema migration is Planned. [Backup guide](../user-guide/backup.en.md)

## 9. Acceptance still open

Native mobile assembly/flows; real App exports; pinned-source contract execution; context updates after compaction; session-scope id mapping; edited-memory tombstone coverage; large package/cancellation/restart windows; and live-model identity/plot behavior need final evidence. The Lead owns the final test count and compatibility metadata. Existing scripted-loop checks establish deterministic wiring, not a phone pass or personality guarantee. [Runtime check](../../tests/e2e/runtime/continuity.test.ts), [requirements](../product/PRD.en.md)

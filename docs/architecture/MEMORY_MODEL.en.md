# Character memory model

[中文](MEMORY_MODEL.md) · [Product requirements](../product/PRD.en.md) · [Domain glossary](../../CONTEXT.md)

> Documentation snapshot: 2026-11-18 (Asia/Shanghai). This describes current source, not an accepted MVP. The earlier 11 product checks passed on Node 24.22.3 with published DSH `0.2.2-rc.4` dependencies. Pinned-source runtime, mobile UI and live-model behavior remain separate acceptance items.

## 1. Four assets and shared language

| Term                | Meaning                                                                   | Authority                                |
| ------------------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| Source conversation | Exported message tree, statuses, attachment references and original bytes | Original asset, never replaced by memory |
| Conversation        | A formal DSH Session imported, created or resumed on the Host             | Official SessionPersistence              |
| Character memory    | Evidence-bearing candidates or confirmed descriptions for a character     | Official Storage domain                  |
| Recovery reference  | A filtered, ranked and bounded copy for the current binding               | Rebuildable projection                   |

A character is neither a model nor a running Agent. User-facing language is **conversation / character / memory**. A stable assistant identity spans conversations; an official runtime Agent id equals its Session id. See the [local model](../../src/model.ts) and [official Agent factory](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent/src/index.ts#L157-L216).

## 2. Ownership before retrieval

Every source, memory partition and binding carries `owner_id + agent_id + character_id + story_id`. `story_id` may be `null`; exact matching includes that value. Equal display names do not establish sharing; changing stories does not implicitly import another partition.

- Host config supplies `owner_id`; browser requests supply stable assistant, character and story identities, not an arbitrary owner.
- `scope=character / user / session / story / agent` further labels use **inside** the partition. `user` is not a cross-character global store.
- The current target is one Host owner. Multi-user sharing, cross-character references and identity merging are **Planned**.
- Missing or conflicting bindings produce errors, not a fallback to all characters.

Implementation: [scope validation](../../src/model.ts), [keys and domain](../../src/storage.ts), [Host ownership and bindings](../../src/plugin.ts), [Connection routes](../../src/routes.ts).

## 3. Five memory types

| `memory_type`  | User meaning                                                  | Boundary                                                                                |
| -------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `persona`      | Character identity, description and expression preferences    | Reference material, not a change to the underlying model                                |
| `user`         | An explicitly stated nickname or preference                   | Assistant dialogue, inference and recognizably fictional text are not real-person facts |
| `relationship` | Relationships and agreements within the conversation or story | Not implicitly a real-world relationship                                                |
| `episodic`     | Shared experiences or past events                             | Evidence and confirmation required                                                      |
| `story`        | Current scene, objects, timeline and unresolved events        | Distinct from real user information                                                     |

Default extraction uses Chinese/English keyword rules and quotes the matching sentence. It invokes no model and does not claim to understand arbitrary fiction. A manual proposal may quote existing source evidence. `batchEveryTurns` currently has no periodic extraction implementation; automatic live-message extraction, model extraction and vector retrieval are **Planned**. See [rules and proposals](../../src/memory/memory.ts).

## 4. Record and provenance

A record contains identity, type, use scope, content and optional `fact_key`; `source_id / source_session_id / source_message_id / source_excerpt / source_kind`; timestamps, importance, confidence, validity, version, status, confirmation time and conflicting ids.

`source_session_id` currently means the **source conversation id**, not an official DSH Session id. The excerpt must literally occur in a source message in the same partition. Editing preserves that quote and marks the description `user-edited`; it does not fabricate a new source. Confidence is ranking metadata, not an automatic confirmation probability or verification of real-person information.

Rule extraction follows the source preview's `active_branch` and processes `FINISHED / IMPORTED` text only. All raw ZIP branches remain retained. Session commit accepts another leaf choice, but extraction does not automatically follow it; this flow is **Experimental**.

## 5. Review state machine

```text
proposal / rule extraction → candidate or conflict
candidate / conflict --user confirms and resolves conflicts--> active
active --explicit replacement--> superseded
any existing record --edit--> candidate (confirmation required again)
any existing record --delete--> removed + current fingerprint tombstone
```

- `unknown / inference` candidates require editing and verification before confirmation. No silent background activation.
- Different active content with the same non-null `fact_key` requires explicit replacement; the prior record becomes `superseded`. This is exact-key conflict handling, not general semantic contradiction detection.
- Edit, confirm and delete check `expected_version`; stale versions require reloading. Per-partition queues and one Storage update preserve service-instance ordering. Multi-process writer acceptance is **Planned**.
- Source/message/type/normalized-content fingerprints deduplicate identical proposals. A deletion tombstone covers that fingerprint. Suppression across every pre/post-edit content version is **Planned**.
- The schema reserves `rejected`, but there is no separate reject operation today.

See [confirmation, editing and deletion](../../src/memory/memory.ts) and the [memory integration check](../../tests/integration/memory.test.ts). A test's presence is not execution evidence for every boundary described here.

## 6. Recovery projection and logs

Only exact-scope, `active`, confirmed, non-unknown/non-inferred records within their validity window are eligible. Unresolved competing content for a `fact_key` is excluded and the key is reported. Ranking combines persona/current-story/relationship anchors, importance, confidence, optional keyword relevance and episodic decay. Whole records fit or are omitted; facts are not cut in half.

The default `contextTokenBudget=2048` uses the **UTF-8 byte length of the plugin reference text** as a conservative budget proxy, not an exact tokenizer measurement. It includes the plugin header and JSON, but excludes official reminder framing, other context, system instructions and history. A full-request window guarantee is **Planned**. The live provider passes an empty query; retrieval driven by the latest question is **Planned**. `scope=session` needs source-id/official-Session-id mapping acceptance; the default character/story rule path does not depend on it.

A binding registers `agent.ctx.systemPrompt.context` as `dsh-continuity:character`, with `interpolate=false`. It supplies user-reviewed reference data, not system commands from source prose. The official loop logs snapshots, skips unchanged named sections and reprojects according to retained state after compaction. Editing affects the next assembly; it neither rewrites earlier events nor erases already logged snapshots.

Implementation: [recovery algorithm](../../src/recovery/recovery.ts), [registration timing](../../src/plugin.ts). Fixed official evidence: [context registration](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/system-prompt/src/index.ts#L520-L542), [snapshot comparison and durable source](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent-loop/src/runtime-context.ts#L124-L179).

## 7. Custody and acceptance boundaries

Data is stored on the DSH Host the current user connects to, not in a durable phone-browser store. There is no default external model call, third-party memory API or additional database. Sending conversation messages uses the user's explicitly selected Host model service.

Memory deletion, source deletion and official Session/attachment deletion are distinct. Deleting a source keeps excerpts but removes full evidence, which may make a later backup incomplete; [back up first](../user-guide/backup.en.md). Current official SessionPersistence/Attachment interfaces lack deletion APIs. Unloading preserves data. Backups use v1 JSON plus a checksum, with no encryption or signature. See the [migration format](MIGRATION_FORMAT.en.md).

**Lead acceptance still needed:** pinned-source execution, real mobile flows, conflict/version/post-edit tombstone regressions, session-scope mapping, context refresh after compaction, and live-model personality/story continuity. Deterministic wiring and natural-language behavior must be reported separately.

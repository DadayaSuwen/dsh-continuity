# Character memory model

[中文](MEMORY_MODEL.md) · [Product requirements](../product/PRD.en.md) · [Domain glossary](../../CONTEXT.md)

> Current-source documentation, 2026-11-19 (Asia/Shanghai): engineering preview, not overall MVP acceptance. Node 24.22.3 npm and pinned-SHA runtime tracks each recorded 60/60 across 28 files; the 390×844 / 360×800 phone-browser matrix recorded 8/8. The Lead-owned [progress](../engineering/PROGRESS.md) and [runtime evidence](../engineering/RUNTIME_EVIDENCE.md) maintain counts and commands. These are not Android/iOS device, real App export or live LLM quality results.

## 1. Four assets and shared language

| Term                | Meaning                                                                                                                 | Authority                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Source conversation | Original export tree, statuses, attachment references and all branches; native capture preserves a selected event slice | Independent original asset, never replaced by memory |
| Conversation        | A formal DSH Session imported, created or resumed on the Host                                                           | Official SessionPersistence                          |
| Character memory    | Evidence-bearing candidates or confirmed descriptions for an explicit character                                         | Official Storage domain                              |
| Recovery reference  | A filtered, ranked and bounded memory copy for the current binding                                                      | Rebuildable projection                               |

A character is neither a model nor a running Agent. User-facing language is **conversation / character / memory**. Stable assistant identity spans conversations; official runtime Agent id equals Session id. [Local types](../../src/model.ts), [fixed official Agent factory](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent/src/index.ts#L157-L216)

## 2. Ownership before retrieval

Every source, memory partition and binding carries **`owner_id + agent_id + character_id + story_id`**. `story_id=null` remains part of exact matching; changing stories does not implicitly share the previous partition.

- Host config supplies `owner_id`; browser requests supply only stable assistant, character and story, not an arbitrary owner.
- `scope=character / user / session / story / agent` further labels use **inside** the partition. `user` is not a cross-character global store.
- Today's name inputs also act as identity keys. Matching names with other different keys remain isolated; reusing the whole tuple means the same identity. Display-name/opaque-id separation, renaming, multi-user sharing, cross-character references and identity merging are **Planned**.
- Missing or conflicting bindings produce explicit errors, not retrieval of every character. First binding of an existing Session checks and writes serially per Host.

Implementation: [scope validation](../../src/model.ts), [partition keys and domain](../../src/storage.ts), [Host ownership and binding](../../src/plugin.ts), [Connection routes](../../src/routes.ts).

## 3. Five memory types and extraction entrances

| `memory_type`  | User meaning                                           | Classification rule                                                                              |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `persona`      | Character name, description and expression preferences | Character reference, not a change to the underlying model                                        |
| `user`         | An explicitly stated nickname or preference            | Assistant dialogue, inference and recognizably fictional/roleplay text are not real-person facts |
| `relationship` | Relationships and agreements in the conversation/story | Not implicitly a real-world relationship                                                         |
| `episodic`     | Shared experiences or past events                      | Original quotation and user confirmation still required                                          |
| `story`        | Current scene, objects, timeline and unresolved events | Modeled separately from real user information                                                    |

Default rules match explicit Chinese/English keywords and preserve the matching sentence, without model invocation or automatic confirmation. They are not a semantic interpreter for arbitrary fiction. Manual `propose` must quote a literal substring of an original message in the current partition. [Rules and proposals](../../src/memory/memory.ts)

After import, `extract(scope, source_id, conversation_id, branch_id?)` follows the default `active_branch` or an explicit leaf's ancestor chain, processing `FINISHED / IMPORTED` text only. The native branch selector sends the same choice to Session commit and extraction, avoiding default-plot extraction after alternate-branch import. All ZIP branches remain retained. [Branch regression](../../tests/integration/branch-extraction.test.ts)

A bound new or continued Session can be incrementally captured through official Session Query by `Continuity.extractSession`. Its original source has format `dsh-session-capture`: JSON bytes retain the header and complete event slice beyond the cursor; a projection extracts user-authored and assistant text. Runtime-context, tools and non-text content do not become real-user statements. `batchEveryTurns=0` disables automatic batches by default. An explicit positive value adds review-only candidates at matching `turn/end` batches. Durable `cursors.last_seq` prevents repeated consumption, and a partition/Session queue preserves ordering. Model extraction and embedding/vector retrieval remain **Planned**. [Capture implementation](../../src/plugin.ts), [capture parser](../../src/migration/preview.ts), [batch regression](../../tests/e2e/runtime/batch-extraction.test.ts)

## 4. Record and provenance

Each record contains identity, `memory_type`, use `scope`, content and optional `fact_key`; `source_id / source_session_id / source_message_id / source_excerpt / source_kind`; timestamps, importance, confidence, validity, version, status, confirmation time and conflicting ids. [Full schema](../../src/model.ts)

- For imported files, `source_session_id` means the **source conversation id**, not the official Session id. For native capture, it is the captured official Session id. These origins remain distinct.
- `source_excerpt` must occur literally in an original same-partition message. `user-statement` maps to user and `assistant-fiction` to assistant. `memory_type=user` additionally checks the user speaker and recognizable fiction markers. This is deterministic classification, not complete real-world fact verification.
- Editing keeps `memory_id` and the original quote, marks the description `user-edited`, returns it to candidate and clears confirmation. It fabricates no new original quotation and does not automatically verify the revised description.
- Confidence/importance are ranking metadata, not activation probabilities. The user verifies and edits unknown/inferred candidates before confirmation.
- Where a source remains in a backup, restore reconstructs preview from **raw bytes**, then checks literal evidence and original speaker↔memory classification. It does not trust an independently claimed preview. Digests and consistency checks are not sender authentication.

Implementation: [evidence checks](../../src/memory/memory.ts), [restore validation](../../src/migration/package.ts). Regression: [checksum-correct fabricated provenance](../../tests/integration/package-evidence.test.ts).

## 5. Review, stable ids and durable writes

```text
proposal / rule extraction → candidate or conflict
candidate / conflict --user confirms and explicitly resolves conflicts--> active
active --explicit replacement--> superseded
any existing record --edit, preserving id and provenance--> candidate (reconfirm)
any existing record --delete--> removed + stable-id digest / current fingerprint tombstones
```

- Different active content with the same non-null `fact_key` requires explicit replacement; the old record becomes `superseded`. This is exact-key conflict handling, not general semantic contradiction detection.
- Edit/confirm/delete check `expected_version`. Stale versions require reloading and review. The schema reserves `rejected`; there is no separate reject action today.
- Initial `memory_id=memory_<fingerprint>` derives from source, source conversation, message, type and NFC/whitespace-normalized content. Extraction retries look up both fingerprint and stable `memory_id`, preserving edits rather than overwriting them or adding same-id duplicates.
- Individual/all-record deletion stores both the **current fingerprint and the digest embedded in the original stable id**. Re-extracting the original sentence stays suppressed after editing. Backup merge unions local/package tombstones and applies them to existing destination and incoming records; older backups do not resurrect those deleted identities. This is not global semantic deduplication of arbitrary paraphrases or every historical edit.
- All Memory and Package writers share `updateMemoryPartition`. Full schema, partition/record scope, unique ids and limits of **10,000 memories / 20,000 tombstones** are checked before persisting the next revision; failure keeps the prior partition. Official atomic Storage `update` and domain/partition queues order same-process writes. Cross-process writers are **Planned**.

Implementation: [memory lifecycle](../../src/memory/memory.ts), [shared writer seam](../../src/storage.ts), [backup merge](../../src/migration/package.ts). Regressions: [memory integration](../../tests/integration/memory.test.ts), [post-edit re-extraction](../../tests/integration/memory-reextract.test.ts), [package](../../tests/integration/package.test.ts), [capacity and reopen](../../tests/integration/partition-capacity.test.ts).

## 6. Recovery projection and logs

Only exact-scope, `active`, confirmed, non-unknown/non-inferred records within their validity window enter recovery. Competing unresolved contents for a `fact_key` are all excluded and the key is reported. Whole records fit or are omitted.

`scope=session` has two paths: a capture's `source_session_id` directly equals the current formal Session id, or an imported source maps through that Session's same-partition `imported` receipt using **`source_id + conversation_id`**. The receipt covers its original source id and `source_alias_ids` recorded for duplicate repacks, each paired with the same exact source conversation. A fresh Session does not automatically inherit old Session-use memory, and the mapping does not promise additional branch isolation. [Session-scope regression](../../tests/e2e/runtime/session-scope.test.ts)

The live provider uses the Agent's latest claimed user question as its query. Ranking combines keyword relevance, persona/story/relationship anchors, importance, confidence and episodic decay. The query is empty before a new user message arrives; it is neither independent historical-question restoration nor vector retrieval. Live and resumed provider/model choices use official `model.select`; routing changes do not change memory identity. [Registration and selection](../../src/plugin.ts)

Default `contextTokenBudget=2048` uses the **UTF-8 byte length of the complete plugin header + JSON** as a conservative proxy, not an exact tokenizer. It excludes official reminder framing, other context, system prompts and history. Whole-model-request window guarantees are **Planned**. [Recovery algorithm](../../src/recovery/recovery.ts)

A binding registers `agent.ctx.systemPrompt.context`, named `dsh-continuity:character`, with `interpolate=false`. The official loop materializes reference data as user-role `runtime-context`; unchanged named sections deduplicate, while edits/deletion or changed retained state after compaction reproject current reference data. Executed official BasicCompaction + token-meter regression covers correction, deletion, post-compaction refresh and unchanged deduplication, checking that the original event prefix is not rewritten. Older snapshots, summaries and already produced replies remain historical; supersession by the latest snapshot is not historical erasure.

Implementation: [recovery](../../src/recovery/recovery.ts), [timing](../../src/plugin.ts), [context-mutation regression](../../tests/e2e/runtime/context-mutation.test.ts). Fixed official references: [context registration](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/system-prompt/src/index.ts#L520-L542), [snapshot comparison and durable source](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent-loop/src/runtime-context.ts#L124-L179).

## 7. Custody, backup and acceptance scope

Data lives on the currently connected DSH Host in the **`dsh_continuity` v1** domain: `sources / memories / bindings / imports / cursors`. There is no default external model extraction, third-party memory interface or second database. Conversation requests use the user's selected Host model.

Memory deletion, source deletion and formal Session/attachment deletion are different actions. Source deletion retains memory excerpts and removes the full source. The official SessionPersistence/Attachment interfaces currently lack deletion actions; plugin unload preserves durable data. v1 backup includes sources/all memory statuses/tombstones, not bindings, receipts, cursors, full formal Sessions or separate attachment objects. [Backup guide](../user-guide/backup.en.md), [migration format](MIGRATION_FORMAT.en.md)

A backup explicitly lists intentionally removed originals in optional `omitted_source_ids`. Their memory restores as **unknown, candidate, unconfirmed**, retaining excerpts for review. An undeclared missing source still returns `missing-source`; mismatching evidence with an included source returns `invalid-evidence`. v1 is unencrypted, unsigned JSON + checksum; a checksum does not prove source authenticity. [Missing-source regression](../../tests/integration/package-missing-source.test.ts)

Executed pinned-source, npm, phone-browser, version/tombstone, Session-mapping and compaction regressions are recorded on their own evidence tracks. Overall MVP acceptance remains open: real App ZIPs, Android/iOS system interactions, live LLM personality/relationship/story quality and remote Actions/publishing are separate. Future schema conversion, encryption/signatures, complete Session/attachment backups, whole-model budgets, opaque-id renaming and cross-process deployment are **Planned**. The Lead-owned [decisions](../engineering/DECISIONS.md), [known issues](../engineering/KNOWN_ISSUES.md), [README](../../README.md) and [requirements](../product/PRD.en.md) maintain final acceptance conclusions.

# Review and use character memory

[中文](memory.md) · [Import](import.en.md) · [Backup](backup.en.md)

> Candidates, confirmation, editing, deletion, provenance, partitioning and recovery have Host implementations and actual regression evidence. This is an engineering preview; **the overall MVP is not accepted**. Rules are not arbitrary-conversation understanding, and wiring tests do not prove personality or story quality across live models. See [engineering runtime evidence](../engineering/RUNTIME_EVIDENCE.md).

## From source to memory

1. Select the same character/story identifiers used for import and load saved records. If a leaf was selected, the formal conversation and subsequent candidate extraction use the same branch.
2. Check the type: persona, explicit user statement, relationship, episode or story. Expand provenance and verify the source conversation/message, speaker and literal excerpt.
3. Confirm verified content with “确认记住”. Candidates/conflicts do not enter recovery before confirmation; edit/verify unknown or inferred records first. An excerpt with a missing original is not reconstructed evidence.
4. Explicitly choose replacement for conflicts; the prior active record becomes superseded. Detection covers differing content under the same fact key, not every semantic contradiction.
5. Any edit returns memory to candidate and requires reconfirmation. Editing preserves `memory_id`; extracting the same source again reuses the record rather than overwriting the user edit or adding a duplicate id. Reload on stale-version errors.
6. Delete one or all memories in this partition when no longer wanted. Sources and formal conversations remain. Deleted content fingerprints and original memory ids become tombstones used by later extraction and old-backup merges.

The [current panel](../../src/ui/Panel.tsx) and [Host state machine](../../src/memory/memory.ts) implement these operations. A dedicated manual-add UI is **Planned**; evidence-bearing proposals exist at service/route level. Keep omitted source material and propose it later; guesses are not confirmed facts.

## What memory means

- `user` comes from explicit user statements. Assistant-generated events, character dialogue and recognizable fiction are not real-person information. Model output is not used to infer personal facts automatically; the current rules and speaker checks still require semantic review by the user.
- `persona / relationship / episodic / story` are character/story references. Confirmation selects the description for use, not proof that it happened in reality.
- Owner/stable-assistant/character/nullable-story scope matches exactly. Even `user` is not shared across characters. The current name field is an identity key; changing it selects another partition.
- Rules quote matching sentences from the default chain or explicitly selected leaf. They do not interpret every chapter, extract every branch or remember every new message automatically.
- No third-party memory API or model extraction is called by default. Optional model extraction, vector stores and cross-character sharing are **Planned**; implemented turn-based rule capture is the opt-in feature below.

## Capture new conversation messages

A bound native DSH Session supports manual `extractSession` through the Host service, or batches at selected turn endings when `batchEveryTurns` is explicitly configured. The default `0` disables it. The current panel has no dedicated new-message capture button; a service feature is not presented as a delivered manual UI.

The service reads new logged events through official Session Query, uses a durable cursor to avoid repeat processing, saves the raw event slice as a `dsh-session-capture` source, then applies rules to user/assistant text. New records remain candidate/conflict until reviewed and confirmed. There are no model-extraction calls or automatic fiction-to-user-fact conversion. Retained captures enter [v1 backups](backup.en.md); a character backup does not automatically include uncaptured new messages. [Capture implementation](../../src/plugin.ts), [capture preflight](../../src/migration/preview.ts)

## Continue the story

Load the character, create or continue a bound conversation, and enter configured Host values in the “模型服务” (provider) and “模型” (model) text fields. Creation uses those values; Continue/Send applies them through official `model.select` to a live or resumed Agent. Typing in a field alone does not switch the model. Sending a message uses that service's quota.

The official factory creates/resumes Agents; confirmed reference data uses scoped context. Recovery ranks by rule-based relevance to the latest user question, importance and time, and maps source conversations to formal Sessions through import receipts so session-scoped memory enters only the corresponding conversation. This is not full semantic retrieval or cross-character sharing.

Recovery is bounded. Long items may be omitted whole, with persona/current-story anchors prioritized. Budgeting conservatively uses the plugin text's UTF-8 bytes, not an exact token cap over the entire model request. See the [memory model](../architecture/MEMORY_MODEL.en.md) and [recovery implementation](../../src/recovery/recovery.ts).

Official logs retain reference snapshots and skip unchanged values. After editing/deletion, a new snapshot declares that it supersedes earlier snapshots; updates and deduplication after actual official compaction have regression coverage. Imported history and earlier events stay unchanged. The panel's brief reply display has full official-Web E2E coverage, not acceptance of native main-conversation navigation or live-model quality.

Switching models can reuse selected reference data; expression, personality and story quality still need independent live-model acceptance. Editing/deleting affects future projections, not recorded conversations, earlier replies or logged snapshots.

## Deletion and custody

Memory deletion does not delete sources or formal Sessions. Tombstones record the content fingerprint and original `memory_id`. Re-extraction respects deletion, and restoring an old backup into a partition that retains those tombstones does not revive the record. [Deduplication/deletion](../../src/memory/memory.ts), [backup merge](../../src/migration/package.ts)

Source deletion preserves current memory excerpts and formal conversations but removes the plugin's full source. Packages exported afterward explicitly mark missing sources in `omitted_source_ids`. Related records restore as unknown, unconfirmed candidates, stay out of active recovery and do not fabricate original evidence. [Back up first](backup.en.md) to retain originals.

Data stays on the currently connected DSH Host, not in durable phone-browser storage. Backups are plaintext, unencrypted and unsigned. Official Session/attachment deletion APIs are absent in this baseline; deleting a plugin source is not deleting all chat data.

Source: [record fields](../../src/model.ts), [storage](../../src/storage.ts), [recovery/bindings](../../src/plugin.ts); fixed official [durable snapshot logic](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent-loop/src/runtime-context.ts#L124-L179) and [actual post-compaction mutation regression](../../tests/e2e/runtime/context-mutation.test.ts).

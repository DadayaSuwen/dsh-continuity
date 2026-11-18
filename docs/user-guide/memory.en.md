# Review and use character memory

[中文](memory.md) · [Import](import.en.md) · [Backup](backup.en.md)

> Candidates, confirmation, editing, deletion, provenance and partitioning have Host implementations. Native UI is **Experimental / not accepted**. Rules are not arbitrary-conversation understanding; reference recovery does not prove identical personalities across models.

## From source to memory

1. Select the same character/story identifiers used for import and load saved records.
2. Check the type: persona, explicit user statement, relationship, episode or story. Expand provenance and verify the source conversation/message and literal excerpt.
3. Confirm verified content. Candidates/conflicts do not enter recovery before confirmation; edit/verify unknown or inferred records first.
4. Explicitly choose replacement for conflicts; the prior active record becomes superseded. Detection covers differing content under the same fact key, not every semantic contradiction.
5. Reconfirm after editing. Reload on stale-version errors; operations do not silently overwrite concurrent edits.
6. Delete one or all memories in this partition when no longer wanted. Sources and formal conversations remain.

The [current panel](../../src/ui/Panel.tsx) and [Host state machine](../../src/memory/memory.ts) implement these operations. A dedicated manual-add UI is **Planned**; evidence-bearing proposals exist at service/route level. Keep omitted source material and propose it later rather than treating guesses as confirmed facts.

## What memory means

- `user` comes from explicit user statements. Assistant-generated events, character dialogue and recognizable fiction are not real-person information. Model output is not used to infer personal facts.
- `persona / relationship / episodic / story` are character/story references. Confirmation selects the description for use, not proof that it happened in reality.
- Stable assistant/character/story scope matches exactly. Even `user` is not shared across characters. The current name field is an identity key; changing it selects another partition.
- Rules quote matching sentences from the default source branch. They do not interpret every chapter, extract every branch or track every new message automatically.
- No third-party memory API or model extraction is called by default. Periodic extraction, optional model extraction, vector stores and cross-character sharing are **Planned**.

## Continue the story

Load the character, create or continue a bound conversation, explicitly select a configured Host model and send a message. The official factory creates/resumes Agents; confirmed reference data uses scoped context. Official logs retain snapshots and skip unchanged values. Imported history is not rewritten.

Recovery is bounded. Long items may be omitted whole, with persona/current-story anchors prioritized. Current budgeting conservatively uses the plugin text's UTF-8 bytes, not an exact token cap over the entire model request. Automatic latest-question relevance is Planned. See the [memory model](../architecture/MEMORY_MODEL.en.md).

Editing/deleting affects future projections, not recorded conversations, earlier replies or logged snapshots. Switching models can reuse selected reference data; expression/personality consistency needs independent live-model acceptance and has no pass claim here.

## Deletion and custody

Memory deletion does not delete sources or formal Sessions. Identical source/content fingerprints have deletion tombstones; suppression across every pre/post-edit version is still pending. Source deletion keeps excerpts but removes full evidence, which can make a later package incomplete. [Back up first](backup.en.md).

Data stays on the currently connected DSH Host, not in durable phone-browser storage. Backups are unencrypted/unsigned. Official Session/attachment deletion APIs are absent in this baseline; deleting a plugin source is not deleting all chat data.

Source: [record fields](../../src/model.ts), [storage](../../src/storage.ts), [recovery](../../src/recovery/recovery.ts), [bindings/context](../../src/plugin.ts); fixed official [durable snapshot logic](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent-loop/src/runtime-context.ts#L124-L179).

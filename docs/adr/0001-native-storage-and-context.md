# Reuse official storage and logged context

We use DSH's official `storage.domain`, SessionPersistence and Agent lifecycle instead of owning a second Session database. This binds the MVP to an exact Developer Preview release, but keeps durable history and teardown behavior with their upstream owner. Character memory and original source assets are separate records; changing memory never rewrites conversation history.

Latest DSH model-visible `agent.inject()` and `systemPrompt.context()` both have durable log representation. We accept official traceable user-role recovery context and do not patch the runtime to hide it. The rejected invisible-message approach would break the source-of-truth contract. Character content is data, not a privileged system instruction.

Status: accepted on source evidence at `ca33fd6843b205e279c7ccb6cb73a472c78f5760`; real runtime/compaction regressions pass on stable and latest source tracks. See [runtime evidence](../engineering/RUNTIME_EVIDENCE.md) and [latest supplement](../engineering/UPSTREAM_LATEST.en.md); this is not real-data/live-model acceptance.

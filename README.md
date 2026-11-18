# DSH Continuity

[简体中文](README.zh-CN.md) · [User guide](docs/user-guide/import.en.md)

A local-first, independent **DeepSeek Harness plugin bundle** for migrating your chat assets and carrying reviewed character memories into new conversations. It is not a browser extension, new chat client or replacement Harness.

## Installation

Prerequisites: Node **24.22.3** (supported specification: `>=24.9.0 <25`), pnpm **11.28.5**, and DSH **0.2.2-rc.4**. The current project has not been publicly published; build and install its tarball:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm pack
dsh plugin --profile web add ./dsh-continuity-0.1.0.tgz
dsh web
```

Use an isolated DSH profile for first trials. The package supplies the official `dsh.bundle` patch and native Web client. Removing the plugin preserves stored assets by default.

## Usage

Open **迁移与记忆 / Migration & memory** beside New conversation in the DSH sidebar. On a phone, open the sidebar first.

1. Choose a character, stable assistant identity and optional story, plus an existing DSH workspace.
2. Select a DeepSeek official ZIP; no manual extraction. Review conversation/message/attachment and branch warnings.
3. Select conversations and save the original archive before official Session conversion.
4. Review the extracted persona, preferences, relationship, episodes and story candidates. Confirm or edit before activation.
5. Continue the imported conversation or create a new one with approved recovery context.
6. Download an unencrypted character backup containing original source bytes and memories.

Fallbacks: labelled TXT/Markdown, generic JSON or pasted `User:`/`Assistant:` dialogue. Unknown speakers and dates stay unknown. v1 backups restore source assets and memories, not formal DSH Session logs; remigrate a source to recreate those conversations.

## Compatibility

Source audit baseline: [`master` SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760`](https://github.com/DeepSeek-ai/deepseek-harness/tree/ca33fd6843b205e279c7ccb6cb73a472c78f5760), version **0.2.2-rc.4**. Some same-version npm entry sources differ from this Git checkout; published-runtime tests and exact-SHA source-runtime tests are separate.

Real Cordis, native Storage, JSONL persistence, Session Query, Workspace/Connection, production AgentLoop and official compaction have been executed: **60/60** on published npm and **60/60** on the exact audited source SHA. The **8/8** phone checks cover 390×844 and 360×800, both the complete official CLI Web profile and the smaller native-slot Host fixture. Synthetic/scripted tests prove wiring and deterministic retrieval, not real Android/iOS or live-model personality quality. See [runtime evidence](docs/engineering/RUNTIME_EVIDENCE.md), [compatibility metadata](COMPATIBILITY.json) and [progress](docs/engineering/PROGRESS.md).

DSH remains Developer Preview. Daily upstream checks alert on changes; untested upstream interfaces do not silently replace the stable pin.

## Privacy

Files go only to the **DSH Host you are currently connected to**, not a third-party memory service. When connecting from a phone to a remote Host, use trusted HTTPS and the Host's authentication. No default third-party memory API, model extraction call, training upload or telemetry is introduced by this plugin.

Sending a follow-up uses the model service you explicitly choose and its quota. Imported text is untrusted data, never a privileged system instruction. ZIP resource limits, unsafe paths, duplicate headers/names, CRC, encoding and JSON depth are checked.

Source deletion, memory deletion and formal DSH Session/attachment deletion are distinct. The last remains Host-managed because the audited persistence interface exposes no deletion operation. Backups are checksummed **but not encrypted or signed**; store them privately.

## Limitations

- DeepSeek export format **v3** only. App export menus vary by version/system/region; no universal menu path is claimed.
- Complete original ZIP is retained; official Session conversion and rule extraction follow the same selected leaf. Other branches and excluded/unsupported records remain in the original asset and report.
- Rules extract conservative candidates, not arbitrary novel-quality semantic knowledge. `batchEveryTurns=0` disables live Session capture by default; opt-in capture still creates review-only candidates with no model extraction call.
- Recovery uses official logged context snapshots. It never rewrites original imported events or promises invisible injection.
- Current identities use explicit keys; multi-user sharing and display-name rename mapping are Planned.
- Package v1 preserves sources/memories; full Session/attachment package recovery and large streaming backups are Planned.
- Runtime dependency audit has no high/critical finding in the production check at the recorded run; broad DSH CLI development dependencies have open advisories, tracked separately. Public release is not approved.

This extension does not bypass DeepSeek limits or guarantee identical model behavior across providers. Overall MVP acceptance remains open for a real user-approved official export and live-model quality evidence.

## Development

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:runtime
# Clone official source first, then run exact-SHA runtime tests:
pnpm test:pinned
pnpm build
pnpm check:docs
```

[Architecture](docs/architecture/ARCHITECTURE.en.md) · [Memory model](docs/architecture/MEMORY_MODEL.en.md) · [Migration format](docs/architecture/MIGRATION_FORMAT.en.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Decisions](docs/engineering/DECISIONS.md)

All fixtures are synthetic; never commit private chats or keys. CI/compatibility/security/E2E/release-preparation workflows are source-controlled, but cloud execution and remote branch protection require an actual repository and configured protected environment. No public release or npm publication has occurred.

## License

[MIT](LICENSE). [NOTICE](NOTICE) credits upstream and bundled third-party code. See the [ecosystem source audit](docs/research/ECOSYSTEM_AUDIT.md) and [official import audit](docs/research/DEEPSEEK_IMPORT_AUDIT.md) for reuse decisions.

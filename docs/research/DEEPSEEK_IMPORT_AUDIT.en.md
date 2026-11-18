# Official DeepSeek import audit (English summary)

[中文完整源码审计](DEEPSEEK_IMPORT_AUDIT.md) · [Architecture](../architecture/ARCHITECTURE.en.md)

## Baseline and evidence

Audited repository: <https://github.com/DeepSeek-ai/deepseek-harness>, actual default branch `master`, SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760`, package version `0.2.2-rc.4`. The original Chinese audit contains 91 commit-fixed source/test/document citations and explicitly separates code review, test-source review, narrow executed probes, documentation and static inferences.

The Lead separately ran real Cordis/JSONL/AgentLoop/Storage/Connection tests against both npm packages and exact-SHA source aliases. Same-version npm entry source differences mean version equality is not source identity. Current totals live in [runtime evidence](../engineering/RUNTIME_EVIDENCE.md).

## Reuse, not another ZIP engine

The implemented optional package is `@deepseek-ai/dsh-deepseek-chat-import`; shipped Web profiles omit it by default. Its root exports the service/errors/types, **not** runtime named importer/archive/conversion functions. The package explicitly exports and ships `./src/*`:

```ts
import { importDeepseekChatExport } from '@deepseek-ai/dsh-deepseek-chat-import/src/importer.ts';
import {
  convertConversation,
  selectBranch,
} from '@deepseek-ai/dsh-deepseek-chat-import/src/conversation.ts';
import { openExportArchive } from '@deepseek-ai/dsh-deepseek-chat-import/src/archive.ts';
```

Node does not strip TypeScript under node_modules; parameter properties and decorators also require proper compilation. Continuity transpiles this source seam in its build and leaves actual Host services shared.

## Actual contract

`importDeepseekChatExport(deps, request, signal)` receives explicit persistence, registered workspace lookup, id generation, warning sink and optional attachment/cache facilities. The request carries complete archive bytes, canonical workspace, session/entry/title limits and progress. Upload size/authentication/single-flight belong to the outer Host adapter, not the function.

Only `manifest.export_format_version === 3` is recognized. `chat_session_index.json` ranks conversations by updated time, inserted time and id, deduplicating the first row of each id. Default branch follows `current_message_id`, otherwise maximum message id. Duplicate message ids are checked globally; upstream missing-parent/cycle checks walk only the chosen branch. Continuity additionally validates the full tree and preserves all raw bytes.

The canonical write order is detached `Session.create` validation → persistence.create → append → flush → finally close → optional cold snapshot → Workspace.attachSession. This is not a multi-session/attachment/workspace transaction. Current official persistence has no delete rollback API. Continuity adds explicit original retention and durable import receipts rather than modifying core events.

## Fidelity

THINK reasoning/elapsed time, RESPONSE text and standard search/open tool records are mapped; search snippets are actually preserved in text/meta despite older README language. READ_LINK retains titles/URLs, not encrypted page bodies. Non-image bodies absent from export become synthetic file metadata, not recovered documents. Stored images require the official attachment facility.

CONTENT_FILTER removes the paired user/reply turn. Other unfinished/template/empty replies keep a failed-turn record but are excluded from model-visible reply history. Session begins with the required empty system head so production resume can replace it. Original timestamps remain in source; official event time is monotone and includes reasoning elapsed time. The upstream parser uses Date.parse, not a strict RFC3339 validator.

## Why Continuity adds value

Upstream does not supply cross-import Session dedupe, complete source→Session mapping, review-first character/relationship/story memory, preview/selection, original archive retention or complete partial-result reports. It also lacks all-branch recovery. Continuity supplies these incremental seams while preserving official conversion semantics.

ZIP guards already check central directory duplicate names and per-entry sizes, but duplicate local headers, synchronous inflate CPU work and read/stream size behavior need additional care. Continuity preflights local/central layout, paths, counts, totals, ratios, actual expanded bounds and CRC before passing a level-0 selected subset to upstream. This is defensive preflight, not a cloned format converter.

## Fixed primary sources

- [Package public exports](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/package.json)
- [Host entry](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/index.ts)
- [Importer and canonical write](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts)
- [Format](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/format.ts)
- [Branch/conversion](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts)
- [Archive](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/archive.ts)
- [Real production resume test source](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/resume.host.spec.ts)

No private chat export or paid/live model was used for this audit. Real App-generated export acceptance remains a separate user-approved evidence gate.

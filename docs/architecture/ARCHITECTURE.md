# 架构

[English](ARCHITECTURE.en.md) · [记忆模型](MEMORY_MODEL.md) · [导入与备份格式](MIGRATION_FORMAT.md)

> 2026-11-19（Asia/Shanghai）源码快照。本文是工程预览说明：已实现的接口、已执行的回归与整体 MVP 验收分别记录，整体 MVP 尚未接受。

## 1. 基准与证据轨道

官方仓库为 <https://github.com/DeepSeek-ai/deepseek-harness>，审计基准是 `master` SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760`。已发布官方包版本为 `0.2.2-rc.4`；**版本号不证明 npm 产物等于这个 Git SHA**。

| 轨道                 | 当前记录                           | 证据含义                                                                                                                       |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 已发布 npm 运行版    | Node 24.22.3，60/60，28 个测试文件 | 真实 Cordis、Storage、Session、Query、Workspace、Connection、生产 AgentLoop 与 compaction；仅外部模型 IO 使用 scripted Adapter |
| 固定 SHA 源码运行版  | 同一 Node，60/60，28 个测试文件    | 官方与 vendor 源码 aliases 指向上述 SHA，独立于 npm 运行版                                                                     |
| 手机浏览器矩阵       | 390×844、360×800，共 8/8           | 实际完整官方 CLI Web 与较小 native Slot 页面，均连接隔离的真实 Host                                                            |
| 真实设备、数据与模型 | 尚未验收                           | 上述结果不是 Android/iOS 实机、真实 App ZIP、live LLM 质量或远端 Actions 成功                                                  |

数字与复现命令以 Lead 维护的[进度](../engineering/PROGRESS.md)和[运行证据](../engineering/RUNTIME_EVIDENCE.md)为准；两个运行轨道和浏览器检查分别计数，不合并成产品验收。Node 支持规格为 `>=24.9.0 <25`，pnpm 为 `11.28.5`，本次执行证据仅声明 **Node 24.22.3**。[Manifest](../../package.json)

CRLF 规范化的 entry 比较检查 **31 包 / 16 DIFF**；按本项目实际 imports 选择的源码比较记录 **9 DIFF**。两者检查集合不同，也都不是整个发布包逐字节同一证明。[兼容元数据](../../COMPATIBILITY.json)、[entry 比较](../../scripts/compare-upstream.mjs)、[实际 imports 比较](../../scripts/check-compatibility.mjs)、[官方审计摘要](../research/DEEPSEEK_IMPORT_AUDIT.en.md)

## 2. 原生集成，不另造客户端

DSH Continuity 是现有 DSH 的 Cordis bundle 与 Web client contribution，不替换 Harness、Web shell、模型路由、Session 存储或浏览器。启动器装饰官方 `sidebar.session.action` HOC，保留 shell 提供的 `children`；面板以 React Portal 挂到 `document.body`，避免被手机侧栏容器裁剪。stylesheet compatibility bridge 仅在对应样式尚未安装时补装并随卸载移除，兼容同版本已发布 npm 客户端与较新的官方源码样式行为。

Host façade → 精确 Connection 路由 → 原生面板使用同一组领域接口。Host 配置提供 `owner_id`，上传内容的 owner 声明不决定归属；固定官方 Connection 在回调前执行 owner admission。当前目标为单个 Host owner；principal-aware 多用户共享为 **Planned**。

本地实现：[bundle patch](../../cordis.patch.yml)、[Host façade](../../src/plugin.ts)、[路由](../../src/routes.ts)、[client 注册与 Portal](../../src/ui/client.tsx)、[面板](../../src/ui/Panel.tsx)。固定官方依据：[sidebar HOC 合约][sidebar]、[owner admission][owner]。已执行的手机浏览器流程见第 1 节；OS 文件选择、软键盘、下载、transport carrier 与回主对话导航仍须实机验收。

## 3. 四类独立资产

1. **原始来源**：精确字节、SHA-256、文件名与预览，独立归属。只选择一个来源对话时也保留完整 ZIP，包括全部分支和未知字段。
2. **正式对话**：Host 上的官方 Session 日志。官方转换、继续与恢复追加官方事件；修改记忆不重写已导入事件。
3. **角色记忆**：带出处的候选或已确认记录，具有版本、冲突与删除墓碑。
4. **恢复资料**：为当前绑定按需筛选、排序、限额的投影，可在记忆变化后重新生成。

v1 备份同时保存仍保留的 sources 与记忆，但不保存完整正式 Session、独立附件对象、bindings、import receipts 或 cursors。增量采集的事件切片可以成为新的 source；这仍不是全 Session 恢复。[数据类型](../../src/model.ts)、[备份实现](../../src/migration/package.ts)

## 4. 模块、接口与 seam

| 模块           | 调用者接口                                                                 | 隐藏的实现责任                                                              |
| -------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Migration      | `previewImport`、`Migration.commit/source/listSources/deleteSource`        | 归档限额、格式 Adapter、原件保留、收据、重复 reconcile 与部分结果           |
| Memory         | `propose/extract/confirm/update/delete/deleteAll/list`                     | 逐字出处、精确分区、审阅状态、版本、冲突、稳定 ID 与墓碑                    |
| Recovery       | `buildRecovery`、`Continuity.bind/recovery`                                | 资格、Session 来源映射、相关性、冲突、资料包装与整条选择                    |
| Package        | `exportPackage/restorePackage`                                             | v1 校验、摘要、原字节重新预览、出处分类、归属映射与合并                     |
| Native Adapter | `Continuity.newSession/continueSession/extractSession`、Connection actions | 官方 factory、已拥有 handle、模型选择、Session Query、游标与 scoped context |

[Root exports](../../src/index.ts)提供领域接口；Memory 与 Package 共用内部 `updateMemoryPartition` seam，集中处理初始化、串行、完整 schema、唯一 ID 和容量校验。[共享写入实现](../../src/storage.ts)

真实差异位于格式 Adapter（官方 v3 ZIP、明确的 TXT/Markdown/通用 JSON、原生 Session capture）与 DSH 集成 seam。继续复用 `storage.domain`、官方持久化与 Agent factory；不增加第二套数据库或通用 Agent runtime。

## 5. 官方 importer seam 与分支

上游包根导出其 service/types，不导出运行时 named `importDeepseekChatExport`；明确公开的 `./src/*` 子路径提供 importer、format 与 conversation。构建只转译这个 importer seam，并把共享 Host 实例留在 external dependencies。公开源码子路径仍依赖有效的 TS/依赖构建图。[构建](../../scripts/build.mjs)、[固定 package exports][exports]

预检覆盖 ZIP 路径、central/local metadata、数量、大小、压缩比、CRC、严格 JSON/UTF-8 与完整消息树。有限额的异步 inflate 在官方 Adapter 收到选中对话的 stored subset ZIP 前约束展开输出；任何条目路径都不用于任意磁盘解压。字节副本和缓存仍存在，配置限额不是实测 RSS 峰值。[归档](../../src/security/archive.ts)、[JSON](../../src/security/json.ts)、[预览](../../src/migration/preview.ts)、[提交](../../src/migration/migration.ts)

默认祖先链跟随官方 `current_message_id`；缺失、null 或无命中时取最大 message id，**从不寻找“最新 FINISHED 分支”**。`FINISHED` 是回复转换/规则提取的条件，不是分支搜索算法。显式选择另一个 leaf 时，native branch selector 将相同选择传给 Session commit 的 `branches` 与记忆提取的 `branch_id`；省略选择则两者沿默认链。全部原始分支继续保留，官方 converter 本身不变。[分支回归](../../tests/integration/branch-extraction.test.ts)

未知 fallback 说话者须先修正再提交。导出缺失的非图片正文不被重建；未知 fragments、THINK、工具与未完成内容的原始保留也不代表全部进入正式模型历史。

## 6. Storage 与持久性

官方 `storage.domain` 打开 **`dsh_continuity`，version 1，per-record layout**，包含 `sources / memories / bindings / imports / cursors` 五张表。权威数据由现有 Host Storage 后端管理，索引与检索投影可重新生成。[域定义](../../src/storage.ts)

Memory 操作与 Package restore 共用同一 domain/分区写入队列。每次变更在持久化前验证完整 `MemoryPartitionSchema`、分区及各条记忆的精确 scope、唯一 `memory_id`，以及 **10,000 条记忆 / 20,000 个墓碑**上限。超限或错归属不写入无效下一版本；Storage 的原子 `update` 与同实例队列不等于跨进程协调。[容量回归](../../tests/integration/partition-capacity.test.ts)

导入先保存原始字节，再以 durable receipt 记录计划的 Session id、事件数量与状态。官方写入为 `create → append → flush → close → attach`；多 Session、附件、来源与 workspace attachment 不是一个事务。故障/取消可能留下部分工作；retry reconcile 核对 Session 存在、事件数量和工作区，不逐字节认证整份历史。[固定官方 writer][writer]

新对话使用官方 `agents.create`，继续历史使用 `agents.resume`；单独 `sessions.create` 不是持久化。绑定在 Agent 发布前保存，已有 Session 的首次绑定按 Host 串行检查，冲突身份不被覆盖。对 live/resumed Agent，明确 provider/model 通过官方 `model.select` 路由到后续请求，角色身份不随模型改变。卸载时停止新任务、排空队列、dispose 插件拥有的 handle 并关闭 domain，耐久数据保留。[生命周期](../../src/plugin.ts)、[固定 Agent factory][factory]、[模型选择回归](../../tests/e2e/runtime/model-switch.test.ts)

`extractSession` 从官方 Session Query 读取尚未被游标覆盖的事件。采集 source 保存 Session header 与完整事件切片的 JSON 字节；只有真实用户消息和 assistant 消息的文本进入规则提取，runtime-context/工具内容不当作用户事实。每个精确分区/Session 的 `last_seq` 在提取完成后持久化。`batchEveryTurns=0` 默认关闭；启用后在对应 `turn/end` 批次仅生成待审核候选，无模型提取、无自动确认。[批次回归](../../tests/e2e/runtime/batch-extraction.test.ts)

## 7. 归属、恢复与预算

所有查找精确匹配 `owner_id + agent_id + character_id + story_id`，包括 nullable story；用途标签不弱化身份。运行中的官方 Agent id 等于 Session id，插件 `agent_id` 是跨对话稳定逻辑身份。当前面板把名称输入用作这些身份键；复用整个四元组就是同一分区，显示名与 opaque ID 分离及改名为 **Planned**。

恢复仅采用已确认、`active`、有效期内、出处非 unknown/inference 的记忆。`scope=session` 可直接匹配采集来源的正式 Session id；导入来源通过当前 Session 的 `imported` receipt 映射 **`source_id + conversation_id`**，receipt 仍须处于同一分区。重打包 ZIP 复用同一来源对话/分支时，receipt 的 `source_alias_ids` 记录新的全包 source id，映射覆盖原 id 与这些别名。该映射不是额外的 branch 隔离保证。[恢复算法](../../src/recovery/recovery.ts)、[Session 范围回归](../../tests/e2e/runtime/session-scope.test.ts)

live callback 使用该 Agent 最新认领的 user 问题作为 query，按关键词与角色/剧情锚点、重要性、置信度、经历衰减排序。尚未收到新 user 问题时 query 为空；不声称从旧日志独立重建问题或进行语义/向量检索。`contextTokenBudget` 默认 2048，按整个插件 header + JSON 的 UTF-8 字节数作保守代理；不含官方提醒包装、其他上下文、系统提示和历史，完整模型请求窗口预算仍为 **Planned**。

插件注册 `agent.ctx.systemPrompt.context`，名称 `dsh-continuity:character`，`interpolate=false`。上游将资料 materialize 为 durable user-role `runtime-context`；未变具名 section 去重，变更/压缩后的 retained state 触发最新快照。官方 BasicCompaction 与 token meter 回归实际覆盖编辑、删除、压缩后资料更新及未变去重，保持旧 event 前缀不变。这不是隐形注入，也不擦除旧日志或既有模型回复。[固定 context registry][context]、[固定 projection][projection]、[context mutation 回归](../../tests/e2e/runtime/context-mutation.test.ts)

## 8. 数据去向、备份与删除

解析与耐久数据位于用户当前连接的 **DSH Host**，不是手机浏览器持久库。默认提取无模型调用或外部记忆接口；用户明确发送对话时，使用所选 Host 模型与额度。

来源删除、记忆删除、正式 Session/附件删除互相独立。删除来源保留记忆引文、收据和 Sessions；删除记忆记录稳定 ID 摘要与当前内容 fingerprint，重复提取及老备份合并尊重这些墓碑。它们不抹掉历史快照、回复或已经下载的备份。当前审计的官方 SessionPersistence/Attachment 接口缺少删除操作；插件卸载默认保留数据。

v1 backup 保存全部状态记忆、墓碑和仍保留的原字节；故意删掉来源后，`omitted_source_ids` 明列缺源 id，相关引文恢复为 `unknown / candidate / confirmed_at=null`，不作为已确认事实使用。对有原件的记录，restore 从原字节重新计算预览，并检查逐字引文与原说话者↔记忆分类。checksum 与这些内部一致性检查不是加密、数字签名或来源发送者认证。[Package](../../src/migration/package.ts)、[备份指南](../user-guide/backup.md)、[缺源回归](../../tests/integration/package-missing-source.test.ts)

## 9. 工程预览与尚未接受的范围

上述 npm、固定源码与手机浏览器回归已执行，分别证明当前实现的确定性接线与浏览器流程。整体 MVP 仍须用户明确同意的真实 App ZIP、实际 Android/iOS 操作与 live LLM 人设/关系/剧情质量验收；本地检查也不证明 cloud Actions、远端治理或发布生效。

最新audit：production0公告；完整devHost在undici8.12.2与Vitest4.1.12后仍有**1high（picomatch）/1moderate（MCPclient）**。PicomatchGHSAwithdrawn但registryhighgate仍exit1，门禁保持。[已知问题](../engineering/KNOWN_ISSUES.md) · [latest源码补充](../engineering/UPSTREAM_LATEST.md)

未来 schema 转换、加密/签名、完整 Session 与独立附件备份、整模型请求 token 预算、跨进程写者、opaque ID/显示名改名、多用户分享、大文件 RSS/流式处理与更多 crash-window 验收均为 **Planned**。不以本文替代 Lead 的[决策](../engineering/DECISIONS.md)、[进度](../engineering/PROGRESS.md)、[README](../../README.zh-CN.md)与[主需求](../product/PRD.md)；[确定性 runtime 检查](../../tests/e2e/runtime/continuity.test.ts)验证接线，不保证自然语言质量。

[sidebar]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/client/ui-sidebar/src/client/contract/slots.ts#L75-L87
[owner]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/client/connection/src/rpc-host.ts#L140-L172
[exports]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/package.json#L18-L68
[factory]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent/src/index.ts#L412-L445
[writer]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L546-L599
[context]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/system-prompt/src/index.ts#L520-L542
[projection]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent-loop/src/runtime-context.ts#L124-L179

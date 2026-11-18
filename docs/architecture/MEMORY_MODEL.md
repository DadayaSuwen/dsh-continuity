# 角色记忆模型

[English](MEMORY_MODEL.en.md) · [主需求](../product/PRD.md) · [领域词汇](../../CONTEXT.md)

> 2026-11-19（Asia/Shanghai）当前源码说明，属于工程预览而非整体 MVP 验收。Node 24.22.3 的 npm 与固定 SHA 两个运行轨道各 60/60（28 文件），390×844 / 360×800 手机浏览器矩阵 8/8；数字与复现命令见 Lead 的[进度](../engineering/PROGRESS.md)和[运行证据](../engineering/RUNTIME_EVIDENCE.md)。这不是实机 Android/iOS、真实 App 导出或 live LLM 质量证明。

## 1. 四类资产与共同用语

| 用语     | 含义                                                                    | 权威来源                   |
| -------- | ----------------------------------------------------------------------- | -------------------------- |
| 来源对话 | 原始导出消息树、状态、附件引用及全部分支；原生 capture 保存选定事件切片 | 独立原始资产，记忆不替代它 |
| 对话     | Host 上导入、新建或恢复的正式 DSH Session                               | 官方 SessionPersistence    |
| 角色记忆 | 对明确角色带出处的候选或已确认描述                                      | 官方 Storage domain        |
| 恢复资料 | 为当前绑定筛选、排序、限额的记忆副本                                    | 可重建投影                 |

角色既不是模型，也不是运行中的 Agent。界面语言以 **对话 / 角色 / 记忆** 为主；稳定助手身份跨对话使用，官方运行中 Agent id 等于 Session id。[本地数据类型](../../src/model.ts)、[固定官方 Agent factory](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent/src/index.ts#L157-L216)

## 2. 归属先于检索

每条 source、记忆分区与绑定携带 **`owner_id + agent_id + character_id + story_id`**。`story_id=null` 仍是精确匹配的一部分；换故事不自动共享上一故事的分区。

- `owner_id` 来自 Host 配置；浏览器请求仅提供稳定助手、角色、故事，不提交任意 owner。
- `scope=character / user / session / story / agent` 是**分区内部**进一步的用途标签；`user` 不表示跨角色全局库。
- 当前名称输入也是身份键。只同名但其他键不同仍隔离；复用整个四元组则就是同一身份。显示名与 opaque ID 分离、改名、多用户分享、跨角色引用与身份合并为 **Planned**。
- 缺失或冲突绑定显式报错，不降级为检索所有角色；已有 Session 首次绑定按 Host 串行检查再写入。

实现：[scope 校验](../../src/model.ts)、[分区键与域](../../src/storage.ts)、[Host 归属与绑定](../../src/plugin.ts)、[Connection 路由](../../src/routes.ts)。

## 3. 五种记忆与提取入口

| `memory_type`  | 用户含义                           | 分类原则                                                   |
| -------------- | ---------------------------------- | ---------------------------------------------------------- |
| `persona`      | 角色名称、设定、表达偏好           | 角色参考资料，不宣称改变底层模型                           |
| `user`         | 用户明确表达的称呼或偏好           | assistant 台词、推断、明显 fiction/roleplay 不作为真人事实 |
| `relationship` | 对话/故事中的关系与约定            | 不自动解释为现实关系                                       |
| `episodic`     | 共同经历或已发生事件               | 仍需原句出处与用户确认                                     |
| `story`        | 当前场景、物品、时间线、未解决事件 | 与现实用户资料分别建模                                     |

默认规则匹配明确的中英文关键词并保留命中的原句，无模型调用、无自动确认；它不是任意小说的语义理解器。手工 `propose` 必须引用当前分区原始消息的字面子串。[规则与 proposal](../../src/memory/memory.ts)

导入后 `extract(scope, source_id, conversation_id, branch_id?)` 沿默认 `active_branch` 或显式 leaf 的祖先链，仅处理 `FINISHED / IMPORTED` 文本。native branch selector 同时传给 Session commit 与提取，避免另选分支却提取默认剧情；全部 ZIP 分支仍保留。[分支回归](../../tests/integration/branch-extraction.test.ts)

新建或继续的绑定 Session 可由 `Continuity.extractSession` 从官方 Session Query 增量采集。原始 source 记录为 `dsh-session-capture`：保存 header 与游标后的完整事件切片的 JSON 字节，再投影真实 user 和 assistant 的文本；runtime-context、工具与非文本不会伪装成真人陈述。`batchEveryTurns=0` 默认关闭；显式设置正整数后，在对应 `turn/end` 批次只增加待审核候选。耐久 `cursors.last_seq` 避免重复消费，同分区/Session 队列保持顺序。模型提取与 embedding/向量检索仍为 **Planned**。[采集实现](../../src/plugin.ts)、[capture 解析](../../src/migration/preview.ts)、[批次回归](../../tests/e2e/runtime/batch-extraction.test.ts)

## 4. 记录与出处

每条记录含身份、`memory_type`、用途 `scope`、内容、可选 `fact_key`；`source_id / source_session_id / source_message_id / source_excerpt / source_kind`；时间、重要性、置信度、有效期、版本、状态、确认时间与冲突 id。[完整 schema](../../src/model.ts)

- 对导入文件，`source_session_id` 是**来源对话 id**，不等于官方 Session id；对 native capture，它是被采集的官方 Session id。两种来源保持明确区别。
- `source_excerpt` 必须逐字出现在同分区原消息中。`user-statement` 对应 user，`assistant-fiction` 对应 assistant；`memory_type=user` 另检查 user 说话者与明显故事标识。此为确定性分类约束，不是完整现实事实验证。
- 编辑保留 `memory_id` 和原引文，描述改为 `user-edited`，回到 candidate 并清空确认；不伪造新原文，也不自动证明修改后的描述真实。
- 置信度/重要性是排序元数据，不是自动激活概率。unknown/inference 先由用户核实编辑，再确认。
- backup restore 对仍有 source 的记录从**原字节重新计算预览**，再检查逐字出处及原说话者↔记忆分类；不信任包内独立声称的 preview。摘要与一致性检查不是发送者认证。

实现：[出处检查](../../src/memory/memory.ts)、[恢复校验](../../src/migration/package.ts)；回归：[checksum 正确但伪造出处](../../tests/integration/package-evidence.test.ts)。

## 5. 审阅、稳定 ID 与持久写入

```text
proposal / rule extract → candidate 或 conflict
candidate / conflict --用户确认并明确解决冲突--> active
active --明确替换--> superseded
任意已存在记录 --编辑、保留 ID 与出处--> candidate（重新确认）
任意已存在记录 --删除--> 移除 + 稳定 ID 摘要 / 当前 fingerprint 墓碑
```

- 同一非空 `fact_key` 的不同 active 内容须明确替换，旧记录转为 `superseded`；这是精确键冲突，不是全面语义矛盾检测。
- edit/confirm/delete 检查 `expected_version`。过期版本重读后再审阅。schema 保留 `rejected`，当前没有独立 reject 操作。
- 初始 `memory_id=memory_<fingerprint>`，fingerprint 包含 source、来源对话、消息、类型与 NFC/空白规范化内容。提取重试既按 fingerprint，也按稳定 `memory_id` 找已有记录，因此不覆盖用户编辑、不增加同 ID 副本。
- 单条与全部删除同时保存**当前 fingerprint + 原稳定 ID 中的摘要**。即使内容编辑过，重新提取原句也被墓碑抑制。备份合并 union 本地/包内墓碑，对目标已有记录和待恢复记录都应用；老备份不复活这些已删除身份。这不是任意同义句或所有历史编辑版本的全局语义去重。
- 所有 Memory 与 Package 写者使用共享 `updateMemoryPartition`。完整 schema、分区和每条记录 scope、唯一 ID，以及 **10,000 条记忆 / 20,000 个墓碑**均在下一版本持久化前检查；失败保留原分区。官方 Storage 原子 `update` 与每 domain/分区队列约束同进程顺序；跨进程写者为 **Planned**。

实现：[记忆生命周期](../../src/memory/memory.ts)、[共享写入 seam](../../src/storage.ts)、[备份合并](../../src/migration/package.ts)。回归：[记忆集成](../../tests/integration/memory.test.ts)、[编辑后重提取](../../tests/integration/memory-reextract.test.ts)、[Package](../../tests/integration/package.test.ts)、[容量与重启](../../tests/integration/partition-capacity.test.ts)。

## 6. 恢复投影与日志

仅精确归属、`active`、`confirmed_at` 非 null、出处非 unknown/inference、有效期内的记忆参与恢复。未解决的同 `fact_key` 多种内容全部从可用记录排除，并列出冲突键；每条资料整条放入或省略。

`scope=session` 有两条路径：capture 的 `source_session_id` 直接等于当前正式 Session id；导入来源由当前 Session 的同分区 `imported` receipt 提供 **`source_id + conversation_id`** 映射。receipt 包含原 source id 和重复重打包时记录的 `source_alias_ids`，都使用同一精确来源对话配对。新 Session 不自动继承旧 Session 用途记忆，且该映射不承诺额外 branch 隔离。[Session scope 回归](../../tests/e2e/runtime/session-scope.test.ts)

live provider 以 Agent 最新认领的 user 问题作 query，按关键词相关性、persona/story/relationship 锚点、重要性、置信度与 episodic 衰减排序。新的 user 消息到来前 query 为空；不是从旧日志独立恢复最后问题或向量检索。对 live 与 resumed 选择的 provider/model 使用官方 `model.select`；模型路由变化不改变记忆身份。[注册与选择](../../src/plugin.ts)

默认 `contextTokenBudget=2048` 按整个**插件 header + JSON 的 UTF-8 字节数**作保守预算代理，不是精确 tokenizer。它不包括官方 reminder 包装、其他上下文、系统提示和历史；整模型请求窗口保证为 **Planned**。[恢复算法](../../src/recovery/recovery.ts)

绑定注册 `agent.ctx.systemPrompt.context`，名称 `dsh-continuity:character`，`interpolate=false`。参考数据由官方 loop materialize 为 user-role `runtime-context`；未变具名 section 去重，编辑/删除或压缩后 retained state 变化会重投影最新资料。实际官方 BasicCompaction + token meter 回归覆盖更正、删除、压缩后更新与未变去重，并检查旧 event 前缀未重写。旧快照、摘要和已经产生的回复仍是历史；最新快照的 supersession 不表示历史擦除。

实现：[恢复](../../src/recovery/recovery.ts)、[时机](../../src/plugin.ts)、[context mutation 回归](../../tests/e2e/runtime/context-mutation.test.ts)。固定官方依据：[context 注册](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/system-prompt/src/index.ts#L520-L542)、[快照比较与持久化来源](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent-loop/src/runtime-context.ts#L124-L179)。

## 7. 保管、备份与验收范围

数据保存在当前连接的 DSH Host 的 **`dsh_continuity` v1** domain：`sources / memories / bindings / imports / cursors`。无默认外部模型提取、第三方记忆接口或第二套数据库；对话请求才使用用户选择的 Host 模型。

记忆删除、原始来源删除、正式 Session/附件删除是不同动作。来源删除保留记忆引文并移除全文；当前官方 SessionPersistence/Attachment 接口缺删除操作，卸载插件保留耐久数据。v1 backup 包含 sources/全状态 memory/墓碑；不包含 bindings、收据、游标、完整正式 Session 或独立附件对象。[备份指南](../user-guide/backup.md)、[迁移格式](MIGRATION_FORMAT.md)

故意移除原件的 backup 明列可选 `omitted_source_ids`；其记忆恢复为 **unknown、candidate、unconfirmed**，保留引文以供重新核实。未明列缺失来源仍返回 `missing-source`，有原件但出处不匹配返回 `invalid-evidence`。v1 为未加密、无签名 JSON + checksum，完整来源真实性不由 checksum 保证。[缺源回归](../../tests/integration/package-missing-source.test.ts)

固定源码、npm、手机浏览器、版本/墓碑、Session 映射与 compaction 的已执行回归按各自证据记录。整体 MVP 仍未接受：真实 App ZIP、Android/iOS 系统交互、live LLM 人格/关系/剧情质量、远端 Actions/发布另列。未来 schema 转换、加密/签名、全 Session/附件备份、全模型预算、opaque ID 改名与跨进程部署为 **Planned**。[Lead 决策](../engineering/DECISIONS.md)、[已知问题](../engineering/KNOWN_ISSUES.md)、[README](../../README.zh-CN.md)与[主需求](../product/PRD.md)维护最终验收结论。

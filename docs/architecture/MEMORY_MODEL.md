# 角色记忆模型

[English](MEMORY_MODEL.en.md) · [主需求](../product/PRD.md) · [领域词汇](../../CONTEXT.md)

> 文档快照：2026-11-18（Asia/Shanghai）。描述当前源码，不代表 MVP 已验收。此前 11 项产品测试在 Node 24.22.3、已发布 DSH `0.2.2-rc.4` 依赖上通过；固定官方 SHA 的运行、手机 UI 和真实模型表现分别待验收。

## 1. 四类资产与用语

| 用语     | 含义                                         | 权威来源                 |
| -------- | -------------------------------------------- | ------------------------ |
| 来源对话 | 导出文件中的消息树、状态、附件引用与原始字节 | 原始资产，记忆不会替代它 |
| 对话     | 在 DSH 中保存、创建或恢复的正式 Session      | 官方 SessionPersistence  |
| 角色记忆 | 对指定角色有出处的候选或已确认描述           | 官方 Storage domain      |
| 恢复资料 | 对当前绑定筛选、排序、限额后的记忆副本       | 可重新生成的投影         |

角色不等于模型，也不等于运行中的 Agent。界面以“对话 / 角色 / 记忆”为主；稳定助手身份是跨对话的逻辑标识，官方 Agent id 则与 Session id 相同。参见[数据模型](../../src/model.ts)和[官方 Agent factory](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent/src/index.ts#L157-L216)。

## 2. 归属先于检索

每条原始资产、记忆分区和绑定带有 `owner_id + agent_id + character_id + story_id`。`story_id` 可为 `null`；精确匹配仍包含这个值。相同名称不建立共享关系，换故事也不会自动带入另一故事的分区。

- `owner_id` 来自 Host 配置；浏览器请求提交稳定助手、角色和故事，不提交任意 owner。
- `scope` 的 `character / user / session / story / agent` 是分区内进一步的用途标签；`user` 不是跨角色全局库。
- 当前目标是一个 Host owner。多用户共享、跨角色引用和身份合并为 **Planned**。
- 缺失或冲突绑定返回明确错误；不存在“找不到就读所有角色”的降级路径。

实现：[scope 校验](../../src/model.ts)、[分区键与域](../../src/storage.ts)、[Host 归属与绑定](../../src/plugin.ts)、[Connection 路由](../../src/routes.ts)。

## 3. 五种记忆

| `memory_type`  | 用户含义                           | 边界                                       |
| -------------- | ---------------------------------- | ------------------------------------------ |
| `persona`      | 角色名称、设定、表达偏好           | 角色资料，不声称改变底层模型               |
| `user`         | 用户明确表达的称呼或偏好           | 助手台词、推断、明显故事文本不作为真人事实 |
| `relationship` | 对话或故事中的关系、约定           | 不自动解释为现实关系                       |
| `episodic`     | 共同经历或已发生事件               | 仍需来源与确认                             |
| `story`        | 当前场景、物品、时间线、未解决事件 | 不与现实用户资料混用                       |

默认提取是中英文关键词规则，保留命中的原句，不调用模型，也不保证理解任意小说。遗漏时可提交有原文证据的手工候选。`batchEveryTurns` 当前没有周期提取实现；自动新消息提取、模型提取和向量检索为 **Planned**。实现：[规则与 proposal](../../src/memory/memory.ts)。

## 4. 记录与出处

每条记忆包含身份、类型、用途、内容、可选 `fact_key`；`source_id / source_session_id / source_message_id / source_excerpt / source_kind`；时间、重要性、置信度、有效期、版本、状态、确认时间与冲突 id。

`source_session_id` 当前指**来源对话 id**，不是正式 DSH Session id。`source_excerpt` 必须是当前分区原消息里的字面子串；编辑保留原引文并标记 `user-edited`，不是给新描述伪造新来源。置信度是排序元数据，不是自动确认概率或真人信息验证。

默认提取沿来源预览的 `active_branch`，只处理 `FINISHED / IMPORTED` 文本。原 ZIP 的全部分支仍保留；另选分支的 Session 提交已有参数，但提取不会自动切换到它，相关流程为 **Experimental**。

## 5. 审阅状态机

```text
proposal / rule extract → candidate 或 conflict
candidate / conflict --用户确认且解决冲突--> active
active --被明确替换--> superseded
任意已存在记录 --编辑--> candidate（需要重新确认）
任意已存在记录 --删除--> 移除 + 当前指纹墓碑
```

- `unknown / inference` 候选先编辑核实，再确认；后台没有静默激活。
- 同一非空 `fact_key` 的不同 active 内容要求明确替换，原记录转为 `superseded`。这是精确键冲突，不是完整语义矛盾检测。
- 编辑、确认、删除检查 `expected_version`；过期版本要求重读。每分区队列和一次 Storage 更新保持同实例并发顺序；多进程写者验收为 **Planned**。
- 相同来源 / 消息 / 类型 / 规范化内容指纹去重；删除墓碑针对这个指纹。编辑前后所有内容版本统一防复活为 **Planned**。
- schema 保留 `rejected` 状态，当前没有独立 reject 操作。

实现：[确认、修改、删除](../../src/memory/memory.ts)；现有检查：[记忆集成测试](../../tests/integration/memory.test.ts)。测试存在不等于每一条边界都有执行证据。

## 6. 恢复投影与日志

仅精确归属、`active`、已确认、来源非 unknown/inference、处于有效期的记忆进入投影。未解决的同 `fact_key` 内容全部从可用记忆排除，并列出冲突键。排序组合角色 / 当前剧情 / 关系优先级、重要性、置信度、可选关键词相关性与经历衰减；整条放入或省略，不截断半条事实。

默认 `contextTokenBudget=2048` 使用整个**插件资料文本的 UTF-8 字节数**作为保守预算代理，不是 tokenizer 精确测量。它包括插件 header 与 JSON，不包括官方提醒包装、其他上下文、系统提示和历史。全请求窗口保证为 **Planned**。实时 provider 当前使用空 query；跟随最新问题的检索为 **Planned**。`scope=session` 的来源 id / 官方 Session id 映射待验收，默认规则的 character/story 路径不依赖它。

绑定后注册 `agent.ctx.systemPrompt.context`，名称 `dsh-continuity:character`，`interpolate=false`。资料以用户审阅的参考数据出现，不把原文当系统命令。官方 loop 将快照写入日志；未变化的具名 section 跳过重复，压缩后按 retained state 重新投影。记忆修改影响下一次资料组装，不重写旧事件，也不抹去历史已记录的快照。

实现：[恢复算法](../../src/recovery/recovery.ts)、[注册时机](../../src/plugin.ts)；固定官方证据：[context 注册](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/system-prompt/src/index.ts#L520-L542)、[快照比较与持久化来源](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/agent-loop/src/runtime-context.ts#L124-L179)。

## 7. 保管与验收边界

数据存到当前用户连接的 DSH Host，而不是手机浏览器的持久本地库。无默认外部模型调用、第三方记忆 API 或额外数据库；用户发送对话时使用其明确选择的 Host 模型服务。

删除记忆、删除原始资产、删除官方 Session / 附件是不同事情。原始资产删除保留记忆引文，但移除来源全文，可能令后续备份缺失证据；先[备份](../user-guide/backup.md)。当前官方 SessionPersistence / Attachment 接口缺删除 API，卸载插件默认保留数据。备份为 v1 JSON + checksum，无加密、无签名。参见[迁移格式](MIGRATION_FORMAT.md)。

**待 Lead 最终补证据：** 固定源码运行、手机真实流程、冲突/版本/编辑后墓碑回归、session-scope 映射、压缩后资料更新，以及真实模型的人格和剧情连续性；确定性接线通过与自然语言表现分别记录。

# 导入与备份格式

[English](MIGRATION_FORMAT.en.md) · [导入指南](../user-guide/import.md) · [备份指南](../user-guide/backup.md)

> 当前源码的工程预览说明，不是整体 MVP 完成声明。官方导出、DSH Session、原生采集、插件 Storage 与备份各有独立版本；未来 schema 转换为 **Planned**。

## 1. 版本与证据

| 对象                | 当前值                                                  | 证据与范围                                                                          |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 官方审计源码        | `master` SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760` | 固定源码轨道在 Node 24.22.3 记录 60/60，28 文件                                     |
| 已发布官方依赖      | `0.2.2-rc.4`                                            | npm 轨道同 Node 记录 60/60，28 文件；版本号不等于 Git SHA                           |
| DeepSeek 官方导出   | `export_format_version: 3`                              | [固定官方 schema][format]；其他版本显式报错                                         |
| 正式 DSH Session    | 官方 `SESSION_FORMAT_VERSION`（固定 SHA 为 4）          | 官方 writer/factory 管理，不是插件备份格式                                          |
| 原生 Session 采集   | `dsh-session-capture`，`schema_version: 1`              | 精确 Query 事件切片的 JSON source，header 验证官方 Session version                  |
| Continuity backup   | `format: dsh-continuity`、`schema_version: 1`           | [Package schema 与 restore](../../src/migration/package.ts)                         |
| 插件 Storage domain | `dsh_continuity`，version 1                             | `sources / memories / bindings / imports / cursors`；[域定义](../../src/storage.ts) |

Node 支持规格为 `>=24.9.0 <25`、pnpm `11.28.5`；本次实际执行仅声明 **Node 24.22.3**。两个 runtime 轨道与 390×844 / 360×800 浏览器矩阵 **8/8** 分别计数；浏览器使用完整官方 CLI Web 与较小 native Slot，均接真实隔离 Host。这不是 Android/iOS 实机、真实 App ZIP、live LLM 或远端 Actions 验收。以 Lead 的[进度](../engineering/PROGRESS.md)与[运行证据](../engineering/RUNTIME_EVIDENCE.md)维护最新计数。

同版本 npm 与审计源码仍有差异：entry 比较 **31 包 / 16 DIFF**，实际 imports 比较 **9 DIFF**，不是同一比较集合或完整产物同一证明。[兼容元数据](../../COMPATIBILITY.json)、[entry 比较](../../scripts/compare-upstream.mjs)、[actual imports 比较](../../scripts/check-compatibility.mjs)、[官方审计摘要](../research/DEEPSEEK_IMPORT_AUDIT.en.md)

## 2. 官方 ZIP v3

```text
manifest.json                         {"export_format_version":3}
chat_session_index.json               [{id, inserted_at, updated_at}, ...]
chat_sessions/<conversation-id>.json   {id, title, current_message_id?, inserted_at, messages}
chat_sessions/<conversation-id>_files/<image-file>
```

消息含数字 `id / parent_id`、`USER / ASSISTANT`、状态、时间字符串与 fragments。官方 schema 验证引擎读取的字段；**完整原始字节**是未知字段、全部分支与后续分析的依据。预检另核对文件名/index/JSON id、重复消息、全树缺父与环。[预览实现](../../src/migration/preview.ts)

- 默认沿官方 `current_message_id` 的祖先链；缺失、null 或无命中时取最大 message id。**从不寻找“最新 FINISHED 分支”。** `FINISHED` 是回复转换条件。[官方分支与 converter][conversation]
- 原始 ZIP 留存全树，正式 Session 只转换选中链。用户显式选择 leaf 时，native selector 将相同选择交给 commit 的 `branches` 和 extract 的 `branch_id`；官方 converter 不变，默认选择也不变。[分支回归](../../tests/integration/branch-extraction.test.ts)
- REQUEST/RESPONSE、THINK、搜索/open/read-link 依官方转换；未知 fragments 留在 raw source，不承诺进入模型历史。
- 未完成/模板回复、撤回轮次按官方排除或失败规则处理；保留 raw 不表示原文全部进入正式对话。
- 图片有附件服务时由官方 Adapter 保存，可能规范化；非图片通常只有文件卡/元数据，导出缺正文时不宣称完整附件迁移。[官方附件编排][importer]
- 时间解析为 epoch milliseconds，标题可能规范化/截断；原始字节保留原值，正式事件不是源文件逐字复制。

## 3. 预检 → 提交 → 重复识别

预览在 Host 暂存，不创建正式 Session 或持久 source；暂存有效期 15 分钟，一次一个上传。commit 再次预检，先保存原始来源，再按选项调用官方 importer。选择一个来源对话也保留**整个 ZIP**。[路由](../../src/routes.ts)

`source_id = source:<sha256(original-bytes)>`；source 存储键还包括精确角色四元组。import receipt 按归属、单个来源对话 digest、conversation id、branch id 去重。仅重命名文件不改变字节 digest。重打包的全 ZIP 可有新 source id 而选中对话 digest 不变；复用 Session 时，receipt 以 `source_alias_ids` 保存新的 source id，供同分区的 Session 用途记忆映射。重启重试核对已分配 Session 的存在、事件数量和工作区后复用；不是语义相似去重、整日志认证或全故障自动回滚。[commit/reconcile](../../src/migration/migration.ts)

结果分 `imported / duplicates / failures / warnings`。多对话不是跨文件事务；取消或故障后可能留 source、部分 Session 或独立附件，保留回执供核对。来源删除不清除 ledger。正式写入为 `create → append → flush → close → attach`，继续历史由官方 Agent factory 接手。[固定官方 writer][writer]

默认限额：上传 **128 MiB**、展开总量 **512 MiB**、单条目压缩/展开 **64 MiB**、**10,000 文件**、压缩比 **200:1**。普通 stored/deflate ZIP 才进入通道；ZIP64、分卷、加密、特殊文件显式报错。校验目录/local header/descriptor、路径、CRC、实量/声明、严格 UTF-8 与 JSON 深度/节点；无任意条目路径落盘。有限额异步 inflate 先验证，再把 stored subset 交给官方同步 importer；副本与缓存使这些限额不等于 RSS 峰值承诺。[归档](../../src/security/archive.ts)、[JSON](../../src/security/json.ts)

## 4. TXT / Markdown / 通用 JSON 应急输入

应急通道转换一个线性对话，不承诺图片正文、消息树、原生工具事件或 THINK 保真。文本使用 `用户： / 助手：` 或 `User: / Assistant:`；未标注内容保留 `unknown`，未知原始日期为 `null`。提交前须修正未知说话者；轮次以 user 开始，最多接一个 assistant，缺回复成为失败轮，不捏造回应。

```json
{
  "title": "A copied conversation",
  "messages": [
    { "id": "1", "role": "user", "content": "Call me River.", "timestamp": null },
    { "id": "2", "role": "assistant", "content": "Hello, River.", "timestamp": null }
  ]
}
```

通用 JSON role 为 `user / assistant / unknown`，content 为字符串；timestamp 可缺失、null、非负整数毫秒或可解析时间字符串。这是明确格式，不是任意平台 JSON 自动兼容。历史时间未知仍为 null，正式应急事件在导入时生成。[应急 parser](../../src/migration/preview.ts)、[应急 writer](../../src/migration/migration.ts)

## 5. 原生 Session capture v1

```text
{
  schema_version: 1,
  dsh_session: <official Session Query header>,
  events: <exact queried events with seq greater than the stored cursor>
}
preview.format = "dsh-session-capture"
```

`Continuity.extractSession` 只采集已有精确归属绑定的 Session。header 保留官方 Session version；每个事件经过官方 snapshot 校验，原始 source 保存完整事件切片的 JSON 序列化字节，并计算 digest。**不是原 JSONL 字节副本，也不是全 Session/独立附件备份**；非文本事件和未知 raw 字段仍留在该 slice。[采集](../../src/plugin.ts)、[capture 解析](../../src/migration/preview.ts)

预览只把 user-authored `user/message` 与 `assistant/message` 的文本投影为规则输入；runtime-context 不变成用户陈述，工具/非文本保留 raw。`source_session_id` 在这个格式里等于被采集的官方 Session id。若把 capture 当来源重新迁移，当前 writer 生成带标记的 text-only Session，不 replay 原事件或附件。

`batchEveryTurns=0` 默认关闭；显式正整数在对应 `turn/end` 批次启动采集。候选仍需用户审阅，零模型提取、零自动确认。同分区/Session 排队，完成后保存 `cursors.last_seq`；retry 读取未消费事件，不覆盖原日志。游标是运行状态，不在 v1 backup 中。[批次回归](../../tests/e2e/runtime/batch-extraction.test.ts)

## 6. Continuity package v1

顶层为 `format / schema_version / payload / sha256`。payload 包含：

- `owner`：原四元组；restore 映射到用户明确选择的目标，不信任上传者 owner 声明。
- `exported_at`：毫秒时间。
- `sources[]`：仍保留来源的精确 `raw_base64`、digest、preview、身份和创建时间。当前导出总包含这些 raw bytes，没有主动去掉仍存在原件的开关；v1 schema 上限 **1,000 sources**，export/restore 都检查。
- `omitted_source_ids?`：可选、最多 **1,000** 个缺源 id。来源已故意删除但记忆仍引用它时，export 明列这些 id；它不重建已删除全文。
- `memories`：完整分区身份、全部状态记录、`deleted_fingerprints` 与 revision，不只 active。共享写入上限为 **10,000 记忆 / 20,000 墓碑**。

```text
sha256 = SHA-256(UTF-8(JSON.stringify(payload)))
source.digest = SHA-256(base64-decoded source.raw_base64)
source.source_id = "source:" + source.digest
```

checksum 检测内容不匹配，不是加密、数字签名、发送者认证或原始平台认证；修改包的人也可以重算摘要。当前不是通用 canonical JSON 协议，手工重排/编辑会改变摘要。[Package schema](../../src/migration/package.ts)

## 7. Restore 校验与合并

restore 在任何来源写入前检查 package 大小、严格 JSON/schema、payload checksum、原 owner 与各条记录 scope 一致、source id/digest、原始 byte digest。对每个 included source，使用 raw bytes 与保存的 filename 重新执行 `previewImport`，要求重新计算的预览等于包内 preview。[实现](../../src/migration/package.ts)

有原件的 memory 必须逐字引用对应 conversation/message，并匹配原说话者↔`source_kind`；`memory_type=user` 额外排除 assistant、unknown/inference 和明显 fiction/roleplay。这个 raw→preview→evidence 检查阻止只改 preview 或把 assistant 话升为 user 事实；**仍不是密码学来源认证**。[出处回归](../../tests/integration/package-evidence.test.ts)

缺失来源只有在 `omitted_source_ids` 明列时才接受，且同一 id 不得同时 included/omitted。相关 memory 在目标映射后降为 **`source_kind=unknown / status=candidate / confirmed_at=null / conflicts_with=[]`**，保留引文待重新核实。未明列缺源返回 `missing-source`；有原件但引文/分类不匹配返回 `invalid-evidence`。[缺源回归](../../tests/integration/package-missing-source.test.ts)

通过校验后先保存缺失 sources，再通过共享 `updateMemoryPartition` 合并一个目标分区。目标与包内 tombstones 取 union；稳定 memory ID 中的摘要与当前 fingerprint 都用于过滤已有/待恢复记录。相同 ID 与相同记录复用，同 ID 不同内容返回 `memory-conflict`，不覆盖用户编辑。完整 schema、唯一 ID、scope、容量在 memory 下一版本写入前校验；sources 与 memory 不构成全包事务。[墓碑/合并回归](../../tests/integration/package.test.ts)、[容量回归](../../tests/integration/partition-capacity.test.ts)

返回 `source_count` 是 included sources 数，`memory_count` 是合并后的目标分区总记录数，不是本次新增数。v1 的“幂等”针对相同有效内容的重复合并；与目标编辑冲突时显式要求审阅，不默默覆盖。

## 8. 覆盖范围、容量与升级

v1 包含 retained sources（含已采集 slice）、全状态 memory 与 tombstones；不包含**完整正式 Session logs、独立附件库、Session bindings、import receipts、cursors、模型凭据或 Host 配置**。恢复这些资产不等于恢复原正式对话或导入映射；原 ZIP 可再迁移，已确认角色记忆可用于新对话。[迁移集成](../../tests/integration/migration.test.ts)

base64 与 previews 使 backup 大于上传原件；当前 Web restore 的 decoded package 仍受 Host `maxUploadBytes` 限额，128 MiB ZIP 不保证其 backup 也可经同入口恢复。JSON body/base64 又增加副本；大包流式与 RSS 压力验收为 **Planned**。export 在返回字节前同样解析 v1 schema，超出 1,000 sources/1,000 omitted ids 等上限时显式报错，而非生成必然超限的包。长期采集的来源数量与备份规模需单独核对。

未来 schema 转换、加密/签名、完整 Session/附件备份、原子全包恢复、批量身份映射/opaque ID 改名、跨进程协作与整模型请求 token 预算为 **Planned**。固定源码/npm 与浏览器回归已完成各自工程检查，整体 MVP 尚待用户认可的真实 App ZIP、Android/iOS 实机与 live LLM 质量；远端 Actions/发布另列。以 Lead 的[进度](../engineering/PROGRESS.md)、[运行证据](../engineering/RUNTIME_EVIDENCE.md)、[已知问题](../engineering/KNOWN_ISSUES.md)、[决策](../engineering/DECISIONS.md)、[README](../../README.zh-CN.md)和[主需求](../product/PRD.md)维护最终计数与验收。

[format]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/format.ts#L11-L127
[conversation]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L90-L171
[importer]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L327-L390
[writer]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L546-L599

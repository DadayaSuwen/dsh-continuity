# 导入与备份格式

[English](MIGRATION_FORMAT.en.md) · [导入指南](../user-guide/import.md) · [备份指南](../user-guide/backup.md)

> 当前实现说明，非 MVP 完成声明。官方格式、DSH Session 格式、插件备份格式是三个独立版本；未来版本转换为 **Planned**。

## 1. 版本与证据

| 对象                | 当前值                                                | 证据 / 状态                                                            |
| ------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| 官方源码审计        | master SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760` | 固定源码已读，运行验收另列                                             |
| 已发布官方依赖      | `0.2.2-rc.4`                                          | 此前 11 项产品测试在 Node 24.22.3 通过；同版本 npm 与 Git 部分源码不同 |
| DeepSeek 官方导出   | `export_format_version: 3`                            | [官方 schema][format]；其他版本显式报错                                |
| DSH Session         | 官方 `SESSION_FORMAT_VERSION`（固定 SHA 为 4）        | 由官方 writer/factory 管理，非插件 JSON 格式                           |
| Continuity 备份     | `format: dsh-continuity`、`schema_version: 1`         | [当前 schema 与恢复实现](../../src/migration/package.ts)               |
| 插件 Storage domain | `dsh_continuity`、version 1                           | [本地定义](../../src/storage.ts)                                       |

Node 支持规格为 `>=24.9.0 <25`；实际产品测试仅声明 Node **24.22.3**。固定源码和 npm 产物不是同一证据，参见[英文官方审计摘要](../research/DEEPSEEK_IMPORT_AUDIT.en.md)。

## 2. 官方 ZIP v3

```text
manifest.json                         {"export_format_version":3}
chat_session_index.json               [{id, inserted_at, updated_at}, ...]
chat_sessions/<conversation-id>.json   {id, title, current_message_id?, inserted_at, messages}
chat_sessions/<conversation-id>_files/<image-file>
```

消息含数字 `id`、`parent_id`、`USER / ASSISTANT`、状态、时间字符串和 fragments。schema 只验证官方引擎读取的字段，保留原始字节是未知字段和未来分析的依据。预检另核对文件名/index/JSON id、重复消息、全树缺父/环。[预检源码](../../src/migration/preview.ts)

- 默认按官方 `current_message_id` 选择祖先链；该值缺失、null 或无命中时取最大 message id。**不是寻找最新 FINISHED 分支。** `FINISHED` 是回复转换的筛选条件。[官方分支与转换][conversation]
- 全树留在原始 ZIP；正式对话只含选中链。另选 leaf 的提交参数存在，完整 UI / 记忆联动为 **Experimental**。
- REQUEST/RESPONSE、THINK、搜索/open/read-link 按官方转换处理；未知 fragments 留在原始资产，不承诺进入模型历史。
- 非 FINISHED 回复、模板回复、撤回轮等按官方错误/排除规则处理；完整保留原 ZIP 不等于所有文本进入正式对话。
- 图片有存储服务时由官方附件 Adapter 保存，可能规范化；非图片通常只有文件卡和元数据，导出缺正文时不声称完整附件迁移。[官方附件编排][importer]
- 原时间解析为 epoch milliseconds，标题可规范化/截断；源字节保留原值，正式事件不等于原文件逐字复制。

## 3. 预检 → 提交 → 重复识别

预览只在 Host 暂存，不创建正式对话或持久来源；暂存有效期 15 分钟，一次一个上传。提交再次预检，先保存原始资产，再按选项调用官方 importer。全部对话共用同一原始 source；只选一段对话也会保留整个 ZIP。

`source_id = source:<sha256(original-bytes)>`。原始资产键还包含精确角色归属。提交账本按归属、单个来源对话 digest、对话 id、分支 id 去重；文件重命名不改变字节 digest。重启重试先核对已分配 Session 的存在、事件数量和工作区，再复用它。此机制不是语义近似去重，也不是所有失败场景的自动回滚。

结果区分 `imported / duplicates / failures / warnings`。多对话提交不是跨文件事务；取消或故障后可能保留来源、前缀 Session 或孤立附件。部分写入需检查回执再重试，原始资产删除不会清除账本。[提交与 reconcile](../../src/migration/migration.ts)；[正式 Session 写入][writer]

默认限额：上传 **128 MiB**、展开总量 **512 MiB**、单条目压缩/展开 **64 MiB**、文件 **10,000**、压缩比 **200:1**。当前只支持普通 stored/deflate ZIP；ZIP64、分卷、加密、特殊文件不受支持。校验目录/local header/descriptor、路径、CRC、实量与声明、严格 UTF-8、JSON 深度/节点；不按压缩包路径写盘。限额不是 RSS 峰值承诺，仍有字节副本和展开缓存。[归档检查](../../src/security/archive.ts)、[JSON 检查](../../src/security/json.ts)

## 4. TXT / Markdown / 通用 JSON 应急输入

应急通道只转换一个线性对话，无图片正文、消息树、工具原生事件或 THINK 保真承诺。文本以 `用户： / 助手：` 或 `User: / Assistant:` 标记；未标注部分保留 `unknown`，原时间为 `null`。当前提交要求先修正未知说话者，轮次以 user 开始，最多接一个 assistant；缺回复记录为失败轮，不捏造回复。

```json
{
  "title": "A copied conversation",
  "messages": [
    { "id": "1", "role": "user", "content": "Call me River.", "timestamp": null },
    { "id": "2", "role": "assistant", "content": "Hello, River.", "timestamp": null }
  ]
}
```

通用 JSON role 只接受 `user / assistant / unknown`，content 为字符串；timestamp 可缺失、null、非负整数毫秒或可解析时间字符串。未知角色应先在文件修正再上传；通用 JSON 不是任意平台 JSON 自动兼容。应急正式事件在导入时产生，source 中未知历史时间仍为 null。[应急解析](../../src/migration/preview.ts)、[应急 writer](../../src/migration/migration.ts)

## 5. Continuity package v1

顶层为 `format / schema_version / payload / sha256`。payload 含：

- `owner`：原归属四元组；恢复到用户明确选择的目标归属，不沿用上传者自称 owner。
- `exported_at`：毫秒时间。
- `sources[]`：精确原始字节的 `raw_base64`、digest、预览、身份与创建时间；当前导出**总包含**原始字节，无省略开关。
- `memories`：分区身份、全部状态记忆、`deleted_fingerprints` 和 revision；不只导出 active。

```text
sha256 = SHA-256(UTF-8(JSON.stringify(payload)))
source.digest = SHA-256(base64-decoded source.raw_base64)
```

checksum 检测内容不匹配，不是加密、数字签名或发送者认证；可重新计算摘要的人也可修改包。当前不是通用 canonical JSON 协议，不建议手工重排或改包后再恢复。

恢复先校验 schema / 摘要 / 归属一致 / 原字节摘要 / 引文出处，再写来源并合并一个记忆分区。相同 memory id 且相同记录复用；同 id 不同内容显式冲突，不覆盖目标。来源写入与记忆更新不是整体事务。返回 `source_count` 是包内来源数，`memory_count` 是合并后分区总数，不是本次新增数。[恢复实现](../../src/migration/package.ts)

## 6. 备份覆盖与升级

v1 **不包含**正式 Session 日志、独立附件库、Session bindings、import ledger、模型凭据或 Host 配置。恢复 sources/memory 不等于恢复原正式 Session；可从原 ZIP 再迁移，或新建对话使用已确认记忆。

base64 与预览使备份大于上传源；当前 Web 恢复仍受 Host 上传限额，原 ZIP 达到 128 MiB 不保证其备份也能从同限额入口恢复。保留原文件；大包流式处理为 **Planned**。先删原始资产而留记忆可能生成缺源包，恢复会报 `missing-source / invalid-evidence`。

仅当前 v1 有读写实现。旧/未来版本转换、跨平台完整 Host 备份、加密/签名、批量身份映射和原子全包恢复为 **Planned**。验证参考：[package 集成检查](../../tests/integration/package.test.ts)、[迁移集成检查](../../tests/integration/migration.test.ts)；手机流程、固定 SHA 和真实 App 导出验收单列，非此文档的通过声明。

[format]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/format.ts#L11-L127
[conversation]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L90-L171
[importer]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L327-L390
[writer]: https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L546-L599

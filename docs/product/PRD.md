# 产品需求 / Product requirements

[English](PRD.en.md) · [用户流程](USER_FLOWS.md) · [架构](../architecture/ARCHITECTURE.md)

## 定位

**DSH Continuity**（`dsh-continuity`）是使用官方DSH bundle机制的独立可安装扩展。它不是DeepSeek官方产品、浏览器扩展、独立聊天客户端或另一套Harness。使命是保存用户自己的聊天资产，提供可审阅的角色记忆，换会话/模型后继续；不规避平台额度。

## 用户结果

手机/电脑选官方DeepSeek ZIP → 当前连接DSH Host预检 → 选来源对话/分支/角色 → 官方Session → 审核人设/用户/关系/经历/剧情候选 → 继续或新建带已确认资料的会话 → 备份。

界面用“对话 / 角色 / 记忆”；Session/Agent技术词在工程文档。标注说话者的TXT/Markdown/通用JSON/粘贴为应急通道，未知日期和角色仍未知。

## 实现与验收状态

本地工程预览已有Node24.22.3实际证据：npm运行版与固定审计源码版各60/60、28文件；390×844/360×800八项浏览器检查分别覆盖完整官方CLI Web与root Slot Host。查看[运行证据](../engineering/RUNTIME_EVIDENCE.md)，不从脚本存在推断成功。整体MVP仍**未接受**：用户允许的真实App导出、Android/iOS实机和live模型质量单列。没有公开npm/GitHub Release或cloudActions成功声明。

## MVP验收接口

1. Migration：官方v3消息树/附件/状态报告、原字节保留、明确选择/错误、耐久重复识别与诚实部分结果。
2. Memory：Persona/User/Relationship/Episodic/Story、候选/确认状态、逐字出处、严格归属、冲突、编辑/删除/导出；助手虚构不是现实用户事实。
3. Continuation：官方持久化/factory和生命周期；创建/恢复/重启不改旧来源事件。显式模型选择要进入下一次真实请求。
4. Recovery：owner + stable assistant + character + nullable story + Session binding；精确身份、相关性/重要性/衰减/整条预算、当前剧情优先和官方日志化去重context。插件envelope预算与全请求窗口保证不同。
5. Mobile：原生DSH Web slot，系统文件选择/粘贴/状态/报告/审阅/恢复/备份；390×844、360×800真实浏览器，实机文件/下载/软键盘另计。
6. Privacy：明确数据发送到当前Host；无默认第三方记忆/模型提取/训练上传。续聊按用户选定Host模型与额度。下载前明示备份私密且明文。
7. Engineering：官方精确peers、Node24/pnpm11、真实Cordis/Storage/Session/Query/AgentLoop/compaction和恶意文件检查，可重现CI/发布准备。从初始化纳入CI；trusted-base治理先经人类bootstrap落地再启required状态。

## App导出指引

用户在自己已安装版本的头像/设置/数据管理查看导出是否可用。版本、地区、系统不同；没有实机证据证明统一必有菜单。缺导出时复制/分享标注说话者文本，不伪造原时间/角色。

## 明示上限

- 官方DeepSeek只认v3，其它版本报告unsupported。
- 默认current_message_id选祖先链，否则取最大消息id；FINISHED筛回复，不找分支。显式leaf选择现已同时驱动commit和extract，全部rawbranch仍保留。
- 关键词规则需审阅，不保证任意小说语义。batchEveryTurns默认0，可选nativeSession采集只产候选；模型提取/向量库Planned。
- 当前明确身份也是UI名称。显示名/opaqueID分离改名、多用户共享Planned。
- 不保证跨模型逐字同人格；确定性接线/召回与live模型质量分开。
- v1保存source/memory/墓碑，不含完整Session logs、bindings、receipts、游标或独立附件。显式缺源残留引文恢复unknown候选；checksum不是加密/签名/身份认证，未来schema转换Planned。
- 来源/记忆/正式Session/附件删除不同。官方Session/Attachment deleteAPI缺席；旧日志快照保留。
- 大包peakRSS、长故障窗口、transportcarrier/proxyprefix、跨进程writer保持单独验收。
- 公开仓库/发布、付费API、生产账号设置或DSH core修改需另行直接人类确认，本任务均未发生。

## 优先级与追溯

P0审计 → P1官方导入纵向切片 → P2可审记忆 → P3恢复 → P4手机 → P5开源发布准备。高级向量库、通用适配器和独立App不是MVP前置。

实现：[迁移](../../src/migration/migration.ts)、[记忆](../../src/memory/memory.ts)、[恢复](../../src/recovery/recovery.ts)、[备份](../../src/migration/package.ts)、[客户端](../../src/ui/client.tsx)。未决验收见[已知问题](../engineering/KNOWN_ISSUES.md)和[进度](../engineering/PROGRESS.md)。

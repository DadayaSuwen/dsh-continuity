# 产品需求 / Product requirements

## Positioning

**DSH Continuity**（项目包名 `dsh-continuity`）是官方 DSH bundle 扩展，不是浏览器扩展、聊天客户端或新的 Harness。产品使命为保存用户自己的聊天资产并提供可审阅的角色记忆，帮助换会话和模型后继续对话。不涉及平台额度规避。

## User outcome

在手机/电脑选择 DeepSeek 官方导出 ZIP → 本机 DSH 预检和报告 → 选择来源对话与角色 → 官方 Session → 确认角色/关系/经历/剧情记忆 → 新会话恢复 → 完整备份。

界面称“对话”“角色”“记忆”，技术词保留在开发文档。TXT/Markdown/通用 JSON/粘贴是应急通道，未知角色与时间显式标为未知。

## MVP acceptance seams

1. Migration preview/commit：官方格式 v3、消息树/附件/状态报告、保留原始来源、明确选项、错误可见、相同来源去重。
2. Character memory：Persona/User/Relationship/Episodic/Story 类型，候选与已确认状态、出处、隔离、矛盾提示、编辑/删除/导出。
3. Session continuation：官方持久化与 Agent factory；创建/恢复/重启不修改来源日志。
4. Recovery：绑定 owner + stable agent + character + story + Session；严格归属；相关性/重要性/衰减/预算；当前剧情优先；官方日志化 context 去重。
5. Mobile：DSH native Web slot，系统文件选择/粘贴/解析进度/报告/确认/恢复/备份；390×844 与 360×800 等视口真实浏览器测试。
6. Privacy：数据默认到当前已连接 DSH Host，在界面明确显示去向；不调用第三方记忆 API、不给数据训练用途；网络模型需显式选择。备份含私密内容，下载前明示。
7. Engineering：官方包精确版本、Node24、pnpm11、真实 Cordis/Session/Storage/AgentLoop集成测试和恶意文件测试；CI 从初始化起运行。

## App export guidance

仅描述“在已安装 App 中查看头像/设置/数据管理是否提供历史导出”，不同版本、地区和系统可能不同。不给未经实机核验的菜单写成统一入口；导出缺失时提供复制/分享文本备用路径。

## MVP limits (not hidden)

- 官方只能认 DeepSeek export format v3；其他版本报告 unsupported。
- 原始 ZIP 全分支保留；官方正式对话选择最新 finished 分支，其他内容在报告明确。MVP 的其他分支恢复标为 Experimental，禁止虚构原始时间。
- 默认规则候选提取保留原话，不保证理解任意小说；用户确认/手工编辑是完整支持路径。可选模型批量提取单独评估，不默认调用。
- 恢复不保证不同模型逐字同一人格；确定性资料召回与真实模型表现分开。
- 原始资产删除与正式 DSH Session 删除是不同操作，Host API 当前无 Session删除能力；界面说明删除范围。
- 不公开发布、不消耗付费 API、不改生产账户和主机 DSH 核心。

## Priorities

P0 证据审计 → P1 官方导入纵向闭环 → P2 候选/确认记忆 → P3恢复 → P4手机 UI → P5开源发布准备。高级向量/跨平台全适配/独立App暂不引入。

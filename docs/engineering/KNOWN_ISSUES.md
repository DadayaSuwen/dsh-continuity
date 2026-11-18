# 已知问题 / Known issues

## P0 evidence in progress

1. 最新 DSH 为 Developer Preview `0.2.2-rc.4`，接口随 SHA 变化；本项目尚未完成兼容运行，不标兼容已通过。
2. 官方 DeepSeek import 只支持 export format `3` 且 ZIP 保持在内存中；全部 ZIP 与单条目需明确限制，手机远端应使用 HTTPS 和已验证 owner Connection。
3. 官方 importer 主入口未 re-export 运行时函数，但 `./src/*` 已公开；依赖 source subpath 需要单点构建转译，属于需要固定兼容测试的 seam。
4. 官方 ZIP 引擎未提供跨导入去重、预览选择、全分支恢复和原始 ZIP 留存；需要插件增量实现，原始记录必须独立保留。
5. 官方路径为 `agent.inject()` durable inbox / `systemPrompt.context()` durable context snapshot；model-visible 内容有日志记录。项目不修改原始已提交事件，也不声称隐形注入。
6. 官方 SessionPersistence/Attachment 没有删除能力；“删除原始资产/记忆”与“删除正式 DSH Session/附件”必须分别告知，后者遵循 Host 自身管理。暂停/卸载插件默认保留数据。
7. 默认规则候选提取覆盖有限明确表达，不等同于任意长篇对话的可靠语义理解。用户确认与来源引用是硬约束；可选模型提取仍需独立验证。
8. 真实 DeepSeek 官方 App 导出文件和多个真实模型角色表现尚无验收样本；先验证官方 schema 合成夹具，保留真实性验收项。
9. 主机现有 Node22/pnpm9不满足当前上游要求，已准备隔离 Node24/pnpm11。
10. Official clone/network 下载较慢，继续审计官方 raw 与已发布同版本 npm 源码，最终以克隆实际 SHA 记录。

状态会随实际测试证据更新；未通过项保留，不删测试以掩盖问题。

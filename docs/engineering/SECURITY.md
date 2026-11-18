# 安全工程与数据治理

[English](SECURITY.en.md) · [报告渠道](../../SECURITY.md) · [测试](TESTING.md)

## 资产与信任

DSH Continuity是已连接DSH Host的官方bundle插件。[核心实现](../../src/plugin.ts)、[routes](../../src/routes.ts)、[storage](../../src/storage.ts) 在该Host本地运行；本机是Host位置概念，不保证浏览器手机即数据落点。原始ZIP、聊天、角色记忆与备份均为私密资产。CI和工程验收只用明确合成fixture与隔离temp，不读取用户真实导出、账户或运行中的Host。

输入文件、粘贴、未知格式和备份都是不可信数据。记忆候选与已确认记忆分离；内容不作为可执行配置，也不自动拥有系统指令地位。owner + agent + character + story隔离与Session绑定由 [identity model](../../src/model.ts) 和真实持久化实施。

## 实际实现与上限

- [ZIP checker](../../src/security/archive.ts) 对128MiB上传、512MiB总展开、64MiB单项、10000文件、200倍压缩比默认限额逐项检查；路径、重复canonical名、链接/特殊文件、ZIP64/分卷、header/size/CRC等检查，zip不提取到磁盘。配置仍须按真实Host内存容量收紧，最大默认不是资源保证。
- [JSON checker](../../src/security/json.ts)、Zod schema和scope校验保护导入数据；失败为可记录错误，不吞掉。
- [Migration](../../src/migration/migration.ts) 与 [backup package](../../src/migration/package.ts) 保留原始来源/哈希/出处；备份SHA256用于完整性校验，**不是加密、签名或发送者身份认证**。下载包含私密内容，用户选择安全存储。
- [Memory](../../src/memory/memory.ts) 审阅/确认、冲突/版本/删除路径和 [Recovery](../../src/recovery/recovery.ts) 预算召回不是跨模型人格一致性的证明。模型调用来自用户显式选择的Host provider，CI只script外部模型IO。
- Host原生身份/连接和peer Service依赖仍由DSH负责；插件不另建登录或认证系统。详见 [架构](../architecture/ARCHITECTURE.md)。

## 仓库和供应链

CI默认read token；untrusted PR不拿发布凭证、不用特权PR触发执行head代码。人为Review使用可信base策略和当前head审批。依赖精确pin；官方npm与GitSHA分开验证；full-SHA Action ref与有限Dependabot PR都需人类审阅。

[Secret check](../../scripts/check-secrets.mjs) 默认只tracked文件，值不打印； [allowlist](../../scripts/quality/secret-allowlist.json) 只精确合成fixture。模式扫描不是全历史/全类型credential证明。泄露发现后维护者立即rotation，清理相关日志/产物并协调修复，不把旧密钥再贴入issue。

[License check](../../scripts/check-licenses.mjs) 读取真实installed runtime闭包及required peers，未知SPDX/缺失依赖失败；[NOTICE](../../NOTICE)保留DeepSeek/Cordis/相关bundled MIT来源。[Security workflow](../../.github/workflows/security.yml) 额外audit/dependency review/CodeQL只在实际Actions或联网run产生结果，不推定已跑。

## 发布与人工权限

高风险/critical至少两名非作者人类维护者在当前headReview；AI不批准、不合并。Release approval是GitHub protected environment的人工规则，不是模型判断或文件中的“approved”。环境保护由维护者确认后配置， [release workflow](../../.github/workflows/release.yml) 只做准备，零公开写入。分支保护与仓库设置未在本任务中改远端，见 [可执行建议](BRANCH_PROTECTION.md)。

## 故障与报告

公开issue只放经清洗的版本、SHA、步骤、错误码、合成fixture最小重现和证据文件名。完整真实聊天、源ZIP、token、Cookie、路径/网络地址等个人信息不要公开。私下报告参见 [SECURITY](../../SECURITY.md)；没有远端安全报告功能时先联系维护者取得其公布的私下渠道，不虚构邮箱或SLA。

失败证据保存在ignored目录，只上传合成/工程测试产物。packed consumer与latest clone保留调查证据；对已解析绝对temp路径核对后再清理，不清理个人桌面文件。参照 [GitHub secure-use](https://docs.github.com/en/actions/reference/security/secure-use) 的日志rotation与最小权限实践。

# 技术决策 / Decisions

## D-001 · 2026-11-18 · Independent official bundle

项目使用独立 npm bundle + `cordis.patch.yml`，遵循官方插件安装/卸载及双端扩展，官方源码仅审计，不改核心。依据：官方 `docs/user/develop/basic/publish.md` 与 `packages/boot/plugin-manager`，基准 SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760`。

## D-002 · Official DeepSeek importer

官方 ZIP 引擎已经合并且发布为 `@deepseek-ai/dsh-deepseek-chat-import@0.2.2-rc.4`，默认 Profile 未装载。主包未导出运行时引擎，但明确公开 `./src/*`；项目只在单一 Adapter seam 引入官方源码公开子路径，在构建时转译/打包。不复制或重新实现 manifest/消息树→Session 转换逻辑。增强预览、原始保留、选择、去重及文件防护；已知上游同步 inflate 限制在进入官方引擎前验证。

## D-003 · Native Storage and Session

长期记忆及来源索引使用官方 `storage.domain` 声明与官方后端路由；MVP 不引入外部数据库/Redis/Embedding API。Session 通过官方持久化 handle 和 `agents.create/resume`；`sessions.create()` 单独调用不等于持久化（源码已核对）。原始聊天独立保留。

## D-004 · Recovery is logged context, not invisible mutation

最新官方 `agent.inject()` 向 durable inbox 写入 user-role 消息，下一 pre-step 被采纳后进入 append-only Event Log；`systemPrompt.context()` 也在模型请求时 materialize 成 durable user-role snapshot。上游不提供绕过日志的 model-visible 注入通道。因此恢复采用官方可追溯、带 source 标识的恢复上下文，保留原始历史不变，不声称“注入完全不进日志”。动态恢复优先 `systemPrompt.context` scoped contribution，由官方 context diff 去重和压缩后恢复；角色内容不作为可信系统命令。

## D-005 · Stable identity

运行中的 DSH Agent ID 等于 Session ID；插件另设用户确认的 stable `agent_id` 与 `character_id`，并持久化每个 Session 的归属绑定。检索以 owner+stable agent+character+story 等明确字段隔离，名字相同不代表同一角色。远端仅使用 DSH Connection 所验证的数据所有者，绝不从上传请求里的 owner 字段推导权限。

## D-006 · Keyless and review-first MVP

默认候选提取使用本机确定性规则及消息引用，人工确认后激活。任意模型辅助批量提取必须用户显式启动、选择现有 DSH provider，禁止默认第三方调用、后台每轮收费或把 AI 生成剧情升格为用户事实。角色连续性确定性评估与真实 LLM 质量评估分开报告。

## D-007 · Exact compatibility pin

仅声明实际完成测试的上游 SHA/发布版本。当前审计版本为 `0.2.2-rc.4`，Node 隔离环境 `24.22.3`，pnpm `11.28.5`；上游最新探测失败仅通知，不自动改稳定分支。兼容矩阵可新增经过实际验证的 Node 版本，未跑不宣称支持。

## D-008 · Shared memory write boundary

官方domain在加载时schema验证，并非每次put自动验证。Memory与restore统一通过[分区写入seam](../../src/storage.ts)序列化初始化与update，并在耐久化前校验MemoryPartitionSchema、归属和唯一ID；10k记忆/20k墓碑满额返回错误，不跳过或静默丢弃旧记录。编辑保留稳定原ID，重新提取与删除/restore按ID及内容指纹判断。跨进程writer仍是未验收部署，不承诺此进程队列解决它。

## D-009 · Raw-source-first restore

备份校验和不是发送者认证。恢复先从raw bytes重新预览，核对上传preview和原role/证据类型，再合并记忆，不允许assistant-fiction改成真人user事实。显式缺源包保留omitted_source_ids与引文，恢复成unknown未确认候选；不重建丢失原件。来源和memory仍非全包事务；v1不含完整Session/attachment/binding/receipts。

## D-010 · Native Session capture, opt in

通过official SessionQuery.readSession读实际事件切片，保存原始snapshot为dsh-session-capture来源，与导出的ZIP并列；耐久游标只在候选提取后推进。batchEveryTurns=0默认关闭，非0只运行本机规则并要求确认。模型IO不参与采集，context/runtime提醒不当用户原话。最新问题检索、model.select和scope=session receipt映射使用官方Agent/Session事实而非另建运行时。

## D-011 · Mobile and governance boundaries

手机panel作为sidebar HOC children-preserving贡献，Portal隔离官方sidebar transform；同版npm和源码stylesheet契约不同，兼容style由plugin effect管理。firstuseWorkspace异步初始化用限时重读及用户刷新，不自动创建任意目录。E2E的官方Documents配置指向project temp。

trusted-base人类review脚本首次bootstrap对空base不存在；公开仓库初始化需人类先审snapshot、在main落地可信gate再启requiredstatus。没有automaticbootstrappass、不执行PR自己修改的approvalcode。发布准备执行highauditgate，真实GitHub环境保护由维护者配置；本地AI或变量不等于approval。

## D-012 · Project-only MCP patch boundary

MCPclient不是Continuity生产功能或外部记忆服务。项目dev/CIHost依赖把SDK解析到2.3.0；官方dsh-mcp-client manifest/source不改，用户安装插件也不会自动替换其HostSDK。[公共probe回归](../../scripts/check-mcp-transport.mjs)实际2.2红→2.3绿：跨源307/302目标0请求，同源/直连/stdio仍通过。默认同源政策来自第一方修复，不设置redirectPolicyfollow或allow-version。审计feed撤回picomatch与MCP代码修复分别记录；实际全量0公告不等于全Host风险消失。[详细范围](MCP_TRANSPORT.md)。

## Test seams / 本次实现公开测试接口

用户已经在任务中明确指定解析/导入、Memory、Recovery、迁移包、真实插件加载和手机完整流程的验收接口，并授予自主工程决策。本次据此记录：

1. Migration.preview/commit：不可信文件→报告/可选择来源→官方存储 Session。
2. Character memory propose/confirm/update/delete/retrieve：来源、冲突、归属与生命周期。
3. Recovery.bind/build：明确会话绑定、相关记忆与完整预算。
4. Migration package export/restore：版本、校验、跨实例数据与去重。
5. Cordis Plugin + Connection HTTP + native Web slot：真实装载、重启、手机端端到端。

每个纵向能力遵循失败测试→最小实现→真实回归，不用内部函数调用次数或手工 Mock 数据库作为成功证据。

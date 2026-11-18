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

## Test seams / 本次实现公开测试接口

用户已经在任务中明确指定解析/导入、Memory、Recovery、迁移包、真实插件加载和手机完整流程的验收接口，并授予自主工程决策。本次据此记录：

1. Migration.preview/commit：不可信文件→报告/可选择来源→官方存储 Session。
2. Character memory propose/confirm/update/delete/retrieve：来源、冲突、归属与生命周期。
3. Recovery.bind/build：明确会话绑定、相关记忆与完整预算。
4. Migration package export/restore：版本、校验、跨实例数据与去重。
5. Cordis Plugin + Connection HTTP + native Web slot：真实装载、重启、手机端端到端。

每个纵向能力遵循失败测试→最小实现→真实回归，不用内部函数调用次数或手工 Mock 数据库作为成功证据。

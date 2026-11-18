# 开发进度 / Engineering progress

## 2026-11-18 · P0 完成，P1–P3 核心闭环已运行，P4/P5 验收进行中

- 项目位于 `D:/Desktop/dsh-continuity`。桌面含既有个人文件，采用独立目录，不清理或覆盖它们。
- 独立 Git 仓库使用 `main`。官方源码只读克隆到忽略目录 `upstream/deepseek-harness`。
- 官方仓库：<https://github.com/DeepSeek-ai/deepseek-harness>；默认分支实际为 `master`。
- GitHub API 基准 SHA：`ca33fd6843b205e279c7ccb6cb73a472c78f5760`；版本 `0.2.2-rc.4`，克隆后再核对。
- 官方要求 Node `>=24.9.0`、pnpm `11.28.5`。主机 Node `22.23.2`、pnpm `9.12.0` 不作为兼容环境；准备隔离工具链，不改变默认环境。

### 实际可用 / Available

- 官方格式 v3 ZIP 预览与分支/未知内容报告，原始 ZIP 字节独立持久化；官方 importer 单会话提交到真正 JSONL Session；收据去重与失败报告。
- 本机规则提取 Persona/User/Relationship/Story/Episodic 候选，用户确认后生效，来源逐字验证、版本编辑、删除与角色分区。
- 官方 Cordis 插件实际加载；新生产 Agent 恢复已确认资料；不改原始事件；unchanged snapshot 不重复注入；卸载默认保留数据。
- v1 角色/记忆/原始来源备份与跨实例显式身份恢复。当前包不含正式 DSH Session log/bindings，需要来源重新迁移。
- 官方 owner-only Connection 上传/预览/确认/续聊/导出路由真实 Workspace 集成通过。
- Native sidebar HOC 手机界面已编码，真实 browser 测试运行中，尚不标手机通过。
- Hub 十仓审计已完成，两份源码证据报告固定 SHA 引用。无核心修改。
- Node24.22.3/pnpm11.28.5隔离工具链运行，依赖安装经过脚本审阅。

整体 MVP 尚未最终验收，仍有移动完整 DSH Web、扩展安全回归、持续 Session 提取、发布准备及真实官方用户导出/模型质量证据待完成。

### 测试 / Tests

- 2026-11-18 20:30：固定 Git SHA source-mode 测试 9 文件 13/13 通过，真实 Cordis/Session/Storage/AgentLoop/Connection/Workspace，外部模型 IO 脚本化。`test-results/pinned-compatibility.json` 保存结果。
- 20:37：npm 发布包运行测试 10 文件 27/27 通过（含 16 条文件安全测试）。TypeScript/Lint 已有通过轮次，最终会再跑全部 gates。
- 同版 npm 与当前 Git 源码存在多处 entry 源码差异，明确 source aliases 与发布包两套验证，不仅靠版本号。
- 手机测试已启动真实官方 HTTP/认证/存储 Host（隔离端口3917，当前3080 GUI未改）；浏览器包安装较慢，已有Chrome可用于真实视口运行。
- GitHub Actions 文件正在完善；本地检查与云端执行区分，未创建公开GitHub仓库、Release或npm发布。

### 当前工作 / In progress

官方插件/Cordis/Session Query/Storage/Injection/Import/test-support 源码审计；Hub 竞品实际源码；依赖与构建脚本检查。

### 未完成 / Remaining

P0 证据文档和 ADR；P1 官方导入集成；P2 角色记忆；P3 恢复；P4 手机 UI；P5 测试、CI/CD、双语文档和发布准备。

### 风险 / Risks

上游 Developer Preview 接口变动；尚无经用户批准的真实官方 ZIP，先用官方测试夹具与合成数据验证，用户真实导出验收单列证据等级。

### 下一步 / Next

核对克隆 SHA → 完成接口证据 → 最小架构与测试接口 → 真实 Cordis/Session 纵向闭环。公开发布、付费模型调用和远端分支保护变更等待用户明确批准。

## Resume

先读本文件、DECISIONS.md、KNOWN_ISSUES.md、Git 状态和最近提交，再继续。空闲进程或 README 描述不代表任务已完成。

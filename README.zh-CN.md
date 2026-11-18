# DSH Continuity

[English](README.md) · [导入指南](docs/user-guide/import.md)

本地优先、独立可安装的 **DeepSeek Harness 插件 bundle**：迁移你的聊天资产，把经过你确认的角色记忆带到新的对话中。不是浏览器扩展、新聊天客户端或另一套 Harness。

## 安装

前提：Node **24.22.3**（支持规格 `>=24.9.0 <25`）、pnpm **11.28.5**、DSH **0.2.2-rc.4**。项目尚未公开发布；从源码构建并安装 tarball：

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm pack
dsh plugin --profile web add ./dsh-continuity-0.1.0.tgz
dsh web
```

首次使用建议独立 DSH profile。包自带官方 `dsh.bundle` patch 和 native Web client；卸载默认保留已有资产。

## 使用

在 DSH 侧边栏“新会话”旁打开 **迁移与记忆**。手机布局先展开侧边栏。

1. 选择角色、稳定助手档案、可选故事和现有 DSH 工作区。
2. 选择 DeepSeek 官方 ZIP，无需解压；检查会话、消息、附件与分支报告。
3. 选择迁移对话，先保存原始归档，再由官方引擎转换成 Session。
4. 审核角色设定、偏好、关系、经历和剧情候选，确认或编辑后生效。
5. 继续导入的对话，或创建带已确认恢复资料的新对话。
6. 下载含原始来源与记忆的未加密角色备份。

备用通道支持标注说话者的 TXT/Markdown、通用 JSON，以及粘贴“用户：/助手：”对话。未知角色和日期保持未知。v1 备份恢复原始资产与记忆，不包含正式 DSH Session 日志；从保存的来源重新迁移可重建对话。

## 兼容性

源码审计基准：[`master` SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760`](https://github.com/DeepSeek-ai/deepseek-harness/tree/ca33fd6843b205e279c7ccb6cb73a472c78f5760)，版本 **0.2.2-rc.4**。部分同版本 npm 源码与 Git checkout 有差异，发布包运行测试与固定 SHA 源码运行测试分开记录。

已实际执行真实 Cordis、原生 Storage、JSONL、Session Query、Workspace/Connection、生产 AgentLoop 与官方压缩：npm 运行版 **60/60**，固定官方 SHA 源码版 **60/60**。手机 **8/8** 覆盖390×844、360×800，分别运行完整官方 CLI Web profile 与小型 native Slot Host fixture。合成/脚本模型只证明接线和确定性召回，不冒充真实 Android/iOS 或模型人格质量。见[运行记录](docs/engineering/RUNTIME_EVIDENCE.md)、[兼容元数据](COMPATIBILITY.json)和[开发进度](docs/engineering/PROGRESS.md)。

DSH 仍处于 Developer Preview。每日上游检查发现变动后通知维护者，不自动替换稳定 pin。

## 隐私

文件仅发送到 **你当前连接的 DSH 主机**，不进入第三方记忆服务。手机连接远程主机时使用可信 HTTPS 和主机认证。插件不默认调用第三方记忆 API、模型提取、训练上传或新增遥测。

发送续聊消息会使用你明确选择的模型和额度。导入文字始终是不可信数据，而非高权限系统指令。ZIP 资源上限、路径、重复头/文件名、CRC、编码与 JSON 深度经过检查。

删除原始资产、删除记忆和删除正式 DSH Session/附件是不同操作。后者由主机管理，因为审计接口没有删除方法。备份带校验和，**未加密、未签名**，请私密保存。

## 限制

- DeepSeek 官方导出格式仅 **v3**。App 菜单随版本、系统、地区变化，不宣传通用必有入口。
- 原始 ZIP 全部保留；正式 Session 转换与规则提取采用同一选中leaf。其他分支和被排除内容仍在原件和报告中。
- 规则候选不等于任意长篇小说的可靠语义理解。`batchEveryTurns=0` 默认关闭新消息采集；启用后仍只产生待审核候选，无模型提取调用。
- 恢复通过官方日志化 context snapshot；不改原始已提交事件，不承诺隐形注入。
- 身份使用明确分区键；多用户共享、名称与 ID 分离改名体验为 Planned。
- v1 保存来源/记忆；完整 Session/附件迁移包与大包流式恢复为 Planned。
- 已记录生产依赖审计无 high/critical；全量 DSH CLI 开发依赖有待处理公告，单独追踪。公开发布尚未批准。

项目不规避 DeepSeek 限额，也不保证不同模型逐字相同行为。整体 MVP 验收还包括用户允许的真实官方导出样本和真实模型质量证据。

## 开发

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:runtime
# 先克隆官方源码，再执行固定 SHA 真实运行测试：
pnpm test:pinned
pnpm build
pnpm check:docs
```

[架构](docs/architecture/ARCHITECTURE.md) · [记忆模型](docs/architecture/MEMORY_MODEL.md) · [迁移格式](docs/architecture/MIGRATION_FORMAT.md) · [贡献指南](CONTRIBUTING.md) · [安全说明](SECURITY.md) · [决策记录](docs/engineering/DECISIONS.md)

全部测试夹具为合成数据，私密聊天和密钥不要提交。CI/兼容/安全/E2E/发布准备工作流已进入源码；云端运行和远端分支保护需真实仓库及 protected environment 配置。尚未创建公开 Release 或 npm 发布。

## 许可证

[MIT](LICENSE)。[NOTICE](NOTICE)保留上游和内联第三方代码说明。复用决策见[生态源码审计](docs/research/ECOSYSTEM_AUDIT.md)及[官方导入审计](docs/research/DEEPSEEK_IMPORT_AUDIT.md)。

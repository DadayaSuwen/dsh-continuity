# 开发进度 / Engineering progress

## 2026-11-19 03:15 CST · 本地维护预览，整体 MVP 待真实数据与模型验收

项目是独立 **DSH Continuity bundle 插件**，不是浏览器扩展、另一套客户端或 Harness。代码在独立目录；官方源码保持只读和 clean。所有本地开发、提交与测试均未公开发布，当前运行中的 3080 GUI 未改动。

### 已实现 / Implemented

- 官方 DeepSeek v3 ZIP → 严格归档/JSON 预检 → 原件保留 → 用户选中对话/分支 → 官方 importer → 正式 JSONL Session。持久收据可识别重复并核对失败后的 Session。
- Persona/User/Relationship/Episodic/Story 候选、逐字出处、确认、冲突替换、CAS 版本、编辑、单条/全部删除；owner / stable assistant / character / nullable story 精确分区。
- 统一记忆写入 seam：保存前校验归属、唯一 ID、10,000 记忆与 20,000 墓碑限额。编辑后重复提取与老备份恢复尊重原 ID 和删除意图。
- 新建/继续/重启原生 Agent；串行首次绑定防身份覆盖；官方 `model.select` 真正切换后续模型；最新问题相关性和 imported source → Session 范围映射。
- 官方日志化 scoped context：未变快照去重，编辑/删除后 supersession，实际官方 compaction 后资料更新；不改旧事件。
- 官方 Session Query 增量采集：原始事件切片独立保存，耐久游标；`batchEveryTurns=0` 默认关闭，启用后也仅产生待审核候选，无模型提取或自动确认。
- v1 原始来源/记忆备份：校验和、原字节 → 预览重新验证、说话者/证据类型检查、显式目标身份、合并、墓碑。已删除来源列入 `omitted_source_ids`，残留引文恢复成 unknown 候选而非已确认事实。
- 中文 native sidebar HOC + Portal 手机面板：系统文件选择、上传进度、解析、分支、审阅、续聊、备份。工作区异步初始化刷新与同版本已发布客户端 CSS 兼容。
- 八个 CI/文档/矩阵/安全/每日上游兼容/E2E/人类治理/发布准备工作流；双语工程和用户文档、MIT/完整第三方 NOTICE。云端执行与远端生效另计。

### 实际测试 / Executed evidence

工具链为隔离 **Node 24.22.3 / pnpm 11.28.5 / Vitest4.1.12**，主机默认 Node22/pnpm9未替换。官方稳定基准为 [`master` SHA ca33fd6843b205e279c7ccb6cb73a472c78f5760](https://github.com/DeepSeek-ai/deepseek-harness/tree/ca33fd6843b205e279c7ccb6cb73a472c78f5760)，已发布依赖 `0.2.2-rc.4`；[最新源码补充](UPSTREAM_LATEST.md)记录2e39e704 / rc.5源码轨道，非rc.5 npm/browser消费声明。

| 路径                                       | 最近实际结果                                          | 说明                                                                                                |
| ------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| npm 官方运行版回归                         | **60/60，28 文件**                                    | 真实 Cordis/Storage/Session/Query/Workspace/Connection/AgentLoop/compaction；仅外部模型 IO scripted |
| exact SHA 源码回归                         | **60/60，28 文件**                                    | 官方 + vendor 源码 aliases；不是只改版本标题                                                        |
| latest2e39e704 源码回归                    | **60/60，28文件**                                     | 正式latestprobeexit0；原生源码引用补齐，stablePinUnchanged=true                                     |
| 手机 E2E                                   | **8/8**                                               | 完整官方 CLI Web 与 root Slot fixture；390×844、360×800，两个隔离认证 Host 自动启动                 |
| rc.5发布consumer实验                       | **60/60；phone8/8、重复8/8**                          | 只改consumer精确版本与engine；源代码不改，非原rc4installer兼容声明                                  |
| 严格类型、ESLint、格式                     | **通过**                                              | 最终源码逐项实跑                                                                                    |
| 密钥模式扫描                               | **最终源码tracked扫描通过，0findings**                | 合成fixture独立排除；实际文本统计见维护验证报告                                                     |
| build → pack → 隔离 consumer → 原生 Loader | **通过**                                              | 57包consumer，最终构建字节与校验和保留                                                              |
| npm/源码差异                               | 实际使用接口 **9 DIFF**；entry 比较 **31 包/16 DIFF** | 同版本号不代表源码同一                                                                              |
| production audit                           | 0 high/critical，0 moderate                           | 与完整开发 Host 闭包分开                                                                            |
| 开发闭包 audit                             | **0公告，highgateexit0**                              | SDK2.3项目override实测修复；picomatchwithdrawnfeed更新不是codefix                                   |
| MCP传输公共probe                           | **5/5**                                               | 真实loopback直接/同源HTTP、跨源307/302、stdio；非OAuth/真实Host修复声明                             |
| 导入中断/取消/挂接失败重启                 | **9/9checkpoint**                                     | 实际post-durability硬退出73→freshprocess0；完整ID复用、partialSession明确错误保留                   |
| 有界预览资源观察                           | **8种×2轮，16child通过**                              | 1/8/32MiBstored/deflate及限额/在途取消；whole-childRSS含fixture，非默认大限额承诺                   |

详细命令与边界：[运行证据](RUNTIME_EVIDENCE.md)、[测试指南](TESTING.md)、[已知问题](KNOWN_ISSUES.md)。

### 代码审查 / Review

固定比较基线 `5082575b57b8662fa451f7688497afd513f874ab`，bootstrap snapshot `7db7a28335942b6fe692691dcf1a8ef9ccac65f4`。Standards 与 Spec 独立并行审查已完成：四个标准硬问题/一个重复代码启发式，六个需求问题；来源伪造、并发绑定、重提取、容量、历史错误、缺源包、分支一致性均有真实失败→通过回归。空基线的远端治理 bootstrap 是人工流程前提，保留 trusted-base gate，不用自动放行修饰。

### 本地工程预览交付 / Local preview delivery

1. 双语架构、用户、需求、工程文档与兼容元数据已同步；固定点双轴审查有逐项复现和修复记录。
2. 类型/lint/格式、双语文档/8workflow合约、64许可证manifest与源码扫描实际通过；npm/stable/latest各60/60、rc4phone8/8、MCP5项、rc5独立consumer60及两轮8通过。最终统计随维护交付报告。
3. freshbuild→pack→独立consumer57包→原生host/client/officialLoader已通过；最终安装包、源码ZIP、校验和及verification报告在生成交付目录。无远端发布。

公开发布仍待用户明确确认及真实远端人类审批；本项目原audit high门已实际exit0。这里完成的是本地工程预览，而不是整体MVP或人类GitHub审批。MCPoverride只在项目dev/CI安装图，用户HostSDK不自动改变。

### 尚未验收 / Not accepted

- 用户明确允许使用的真实 DeepSeek App ZIP、真实 Android/iOS 文件选择/下载、跨模型自然语言人格与剧情质量。
- 已发布rc.5消费sourcevariant已60/60与完整phone8/8（重复8/8）通过，原rc.4installer不因实验自动兼容rc.5。正式rc.5安装版本与模型/实机验收仍待维护决定；初次admission和wrapper失败记录保留。见[跟进](PUBLISHED_RC5_FOLLOWUP.md)。
- 大文件 RSS/中断窗口全覆盖、跨进程写者、完整 Session/附件迁移、加密/签名/未来 schema 升级。
- cloud Actions/CodeQL、人类远端 Review/branch/environment 配置、GitHub/npm Release；尚无公开仓库或 tag。

## Resume

先读[本进度](PROGRESS.md)、[决策](DECISIONS.md)、[已知问题](KNOWN_ISSUES.md)、[会话技术快照](SESSION_SNAPSHOT.md)、Git status/最近提交和仍相关后台任务，再继续。idle、README、合成回复或过期 tarball 都不等于任务验收。

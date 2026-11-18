# P0 Hub 竞品源码证据审计

> 审计对象：DSH Continuity 的迁移、角色记忆、恢复与共存设计。审计日期：2026-11-18（Asia/Shanghai）。本次是主工程师委派的背景研究，没有继续派生子代理。
>
> **结论先行：这批插件真实存在，但它们不是一个可直接拼装的“官方 ZIP → 审阅角色记忆 → 严格隔离恢复”方案。** 最有价值的是源码中的接口接缝、引用与回执思想、失败测试；最危险的是把目录徽章、旧 README、顺序单测和“按工作区打标签”分别当成运行兼容、保真导入、并发正确和强隔离。

## 1. 审计范围与证据口径

### 1.1 对齐完整任务

本报告已读取并对齐主工程师建立的 [PRD](D:/Desktop/dsh-continuity/docs/product/PRD.md)、[架构](D:/Desktop/dsh-continuity/docs/architecture/ARCHITECTURE.md)、[显式身份与审阅优先 ADR](D:/Desktop/dsh-continuity/docs/adr/0002-scoped-reviewed-memory.md)。其核心要求是：官方 DeepSeek export format v3 的 ZIP 预检与选择性正式导入、原始资产保留、Persona/User/Relationship/Episodic/Story 候选与确认、owner + stable agent + character + story 的严格归属、官方 Session 持久化、预算化恢复、手机原生 Web UI、明确模型调用与数据去向。

本次深读并浅克隆 **10 个仓库**：Mneme、Memory Gate、五个有直接比较价值的 memory 系列实现、会话导出、外部会话导入、会话搜索。不是对全网所有名称包含 memory 的仓库做穷尽性审计；同名/衍生目录项另外列明，避免混淆。

### 1.2 四种标签

| 标签                  | 本报告的含义                                                                             | 不代表什么                                   |
| --------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| **源码已核验 S**      | 在下表固定 SHA 的本地浅克隆读取实际 package、bundle、入口和相关实现，引用固定 SHA 文件行 | 不代表在当前 DSH profile 中加载成功          |
| **测试已运行 T**      | 本次实际执行的命令、版本、输出和失败原因；只用合成数据/内存库/审计临时目录               | 不代表真实用户聊天、真实模型质量或手机端验收 |
| **README/目录声称 R** | 仓库作者文档、目录复制的说明、徽章、评测数字                                             | 不升格为本次测试证据                         |
| **推导/建议 I**       | 从 S/T 得出的集成取舍与待验证事项                                                        | 不伪装成官方接口保证                         |

固定源码引用使用 `/blob/<40位SHA>/...#Lx-Ly`；正文范围引用均由本机文件行数校验，不以 HEAD/main 链接支持实现事实。Hub 是目录身份来源，GitHub 仓库/提交/实际文件是实现事实来源。测试对源码与已提交 lib 的使用分开注明。

### 1.3 执行边界

- 已加载 `research`、`web-access`、`ponytail`。研究技能要求的背景执行由本次委派本身满足，没有递归调度。
- **本代理只写本报告和 `upstream/competitors/` 下的竞品克隆/合成临时目录**。没有另克隆官方仓库，没有修改官方克隆、核心、profile、生产配置；没有安装完整依赖、发布、付费模型调用、会话发现扫描或真实聊天读取。
- Shell 已实测为 Git Bash；不是按 PowerShell 语法执行。测试复用主工程师后来建立的隔离 Node 与根目录现成包，只读使用，没有替主工程师改依赖。
- 本次所有测试临时目录均通过 `TMP`/`TEMP`/`TMPDIR` 指向 `D:/Desktop/dsh-continuity/upstream/competitors/_audit/tmp`。竞品自己的 tracked 文件最终均为 clean。
- 官方基准 SHA/运行状态由主工程师另审，本报告不冒领官方 Cordis/AgentLoop/ZIP 集成验收。

## 2. 真实 Hub 身份：先 catalog，再 GitHub

### 2.1 不把几个同名 Hub 当成一个服务

本次使用三个社区目录交叉定位：

1. [DSH Hub / dshhub.org](https://dshhub.org/zh-CN/)：公开版本化静态目录；[manifest](https://dshhub.org/catalog/manifest.json) 返回 `snapshotId=2026-11-17T11:58:04.962Z-61c6e5c70df0`、`generatedAt=2026-11-17T11:58:04.962Z`、`pluginCount=38389`；[index 根](https://dshhub.org/catalog/2fc9e028343312a4/index.json) 声明 5 个 index 分片；[browser-en](https://dshhub.org/catalog/2fc9e028343312a4/browser-en.json) 实际 `rows` 为 37987。二者数量不同，**浏览器目录不是 manifest 总数的穷尽证明**。本次从 rows 与较小 index 分片提取目标身份，再请求真实详情页。
2. [dshhub.dev](https://dshhub.dev/)：本次网页显示 733 个仓库、快照日期 2026-10-27；[memory 搜索](https://dshhub.dev/plugins?q=dsh-memory&sort=name) 只有 4 个命中；[session-export 搜索](https://dshhub.dev/plugins?q=session-export) 为 0。这里只能得出“该快照/查询未匹配”，而不是“项目不存在”。
3. [dshplugins.ai](https://dshplugins.ai/plugins/git121995-dsh-memory-gate)、[dshbase](https://dshbase.com/zh/plugins/directory/)：用于补充旧身份与交叉发现。Bundle verified/实测可装等属于目录方声称；本次没有复现其 CI，也没有把其徽章计入 T。

目录作者自己的 [静态目录运维说明](https://raw.githubusercontent.com/coderPerseus/dsh-hub/main/docs/static-operations.md)说明 client 0.2.0 使用 manifest/index/detail shards，旧动态 API 已退役。这个文档只用于定位目录结构，不作为竞品实现证据。

### 2.2 目标 slug 与当前仓库映射

下表 dshhub.org 的完整链接均 **HTTP 200 已请求**，不靠拼接后猜测存在。`.dev` 的三个 dsh-memory 同名仓库来自该目录的真实列表。

| 用户任务称呼              | dshhub.org 真实 slug / 详情                                                                                        | dshhub.dev 对应                                                                                                                 | 当前 GitHub 与实际包                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| dsh-mneme                 | [modusensus/dsh-mneme](https://dshhub.org/zh-CN/plugins/modusensus/dsh-mneme/)                                     | [mneme](https://dshhub.dev/plugins/mneme)                                                                                       | [slow-stack/mneme](https://github.com/slow-stack/mneme)；插件在子目录，包 `@modusensus/dsh-mneme`             |
| dsh-memory-gate           | [GIT121995/dsh-memory-gate](https://dshhub.org/zh-CN/plugins/GIT121995/dsh-memory-gate/)                           | 本次未从该站确认详情 slug；另一目录 [git121995-dsh-memory-gate](https://dshplugins.ai/plugins/git121995-dsh-memory-gate) 为 200 | [GIT121995/dsh-memory-gate](https://github.com/GIT121995/dsh-memory-gate)，包 `dsh-memory-gate`               |
| dsh-memory / 灵枢         | [FuRongJun-1999/dsh-memory](https://dshhub.org/zh-CN/plugins/FuRongJun-1999/dsh-memory/)                           | [dsh-memory](https://dshhub.dev/plugins/dsh-memory)                                                                             | [FuRongJun-1999/dsh-memory](https://github.com/FuRongJun-1999/dsh-memory)，包 `@furongjun1999/dsh-memory`     |
| dsh-memory / hr98w        | [hr98w/dsh-memory](https://dshhub.org/zh-CN/plugins/hr98w/dsh-memory/)                                             | [hr98w-dsh-memory](https://dshhub.dev/plugins/hr98w-dsh-memory)                                                                 | [hr98w/dsh-memory](https://github.com/hr98w/dsh-memory)，包 `@hr98w/dsh-memory`                               |
| dsh-memory / Git          | [seriousz158/dsh-memory](https://dshhub.org/zh-CN/plugins/seriousz158/dsh-memory/)                                 | [seriousz158-dsh-memory](https://dshhub.dev/plugins/seriousz158-dsh-memory)，从目录链接定位                                     | [seriousz158/dsh-memory](https://github.com/seriousz158/dsh-memory)，实际包 `dsh-git-memory`                  |
| dsh-memory / cited        | [Jesse-njx/dsh-memory](https://dshhub.org/zh-CN/plugins/Jesse-njx/dsh-memory/)                                     | 未确认                                                                                                                          | [Jesse-njx/dsh-memory](https://github.com/Jesse-njx/dsh-memory)，包 `@dsh-memory/bundle`                      |
| dsh-memory-evolve         | [csyangwen/dsh-memory-evolve](https://dshhub.org/zh-CN/plugins/csyangwen/dsh-memory-evolve/)                       | [dsh-memory-evolve](https://dshhub.dev/plugins/dsh-memory-evolve)，目录已链接                                                   | [csyangwen/dsh-memory-evolve](https://github.com/csyangwen/dsh-memory-evolve)，包 `dsh-memory-evolve`         |
| dsh-session-export        | [bwndlct/dsh-session-export](https://dshhub.org/zh-CN/plugins/bwndlct/dsh-session-export/)                         | 搜索 0，不能外推不存在                                                                                                          | [bwndlct/dsh-session-export](https://github.com/bwndlct/dsh-session-export)，包 `dsh-session-export`          |
| dsh-plugin-session-import | [huguangyu666/dsh-plugin-session-import](https://dshhub.org/zh-CN/plugins/huguangyu666/dsh-plugin-session-import/) | 未确认                                                                                                                          | [huguangyu666/dsh-plugin-session-import](https://github.com/huguangyu666/dsh-plugin-session-import)，同名包   |
| dsh-session-search-pro    | [LeslieWylie/dsh-session-search-pro](https://dshhub.org/zh-CN/plugins/LeslieWylie/dsh-session-search-pro/)         | 未确认                                                                                                                          | [YaoleWu/dsh-session-search-pro](https://github.com/YaoleWu/dsh-session-search-pro)，包仍记旧作者 LeslieWylie |

**已核验的身份变化：** GitHub REST `repos/modusensus/dsh-mneme` 跟随重定向后返回 `full_name=slow-stack/mneme`；`repos/LeslieWylie/dsh-session-search-pro` 返回 `full_name=YaoleWu/dsh-session-search-pro`。反向用当前 GitHub 作者猜 `.org/YaoleWu/...` 得到 404，但 catalog 仍使用 LeslieWylie，真实详情为 200。Mneme `.dev` slug 是 `mneme` 而不是包名。这两个实例直接证伪“猜测 slug 404 ⇒ 项目不存在”。

### 2.3 同名和快照漂移

- 目标 rows 还匹配 `YYfather/DSH-memory`（描述称 csyangwen 的兼容分支）和 `huanyu-a/dsh-memory-gate`（实际名 `dsh-memory-header-gate`，请求身份头门控，不是 CBDC 记忆库）。本次没有克隆/深审这两项，**不会把它们算成同一个原版**。
- `.org` 的 exporter 详情也列出多个同名仓库；本报告明确选 bwndlct，不把 `yangyongzhen` 等同名实现的能力合并进来。
- GitHub 名称搜索 `dsh-memory in:name` 返回总数 1078，包含大量 fork/不同系统。本次的 memory 系列是经 Hub 定位的五种可比较形态，不宣称把 1078 个全部核验。
- 同一 snapshot 中 `.org` Mneme 为 0.7.16/Gate 为 0.12.0/灵枢为 0.4.11/Git memory 为 0.8.0；本地源码分别为 0.16.1/0.15.0/0.11.0/0.10.0。`.dev` 和其他目录还有不同旧版本。**目录生成于昨日不意味着每个条目在昨日更新过。**

## 3. 固定 SHA、许可、提交和本地位置

所有克隆均为 `--depth 1`，本次没有 fetch 后移动审计头。下列完整 SHA 与 `git log -1` 提交者时间为本次观测，不是 Hub 的 pushedAt，也不是 release 发布时间。

| ID  | 仓库 / 固定 SHA                                                                     | 实际包版本                      | 最后提交（保留原时区）                                            | 许可正文                          |
| --- | ----------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| M   | slow-stack/mneme · `5b1f17a6606d164e743b6e9a8344c52e3af0fcc2`                       | 子包 0.16.1；根壳 0.0.0 private | 2026-11-18T17:57:47+08:00 · Merge PR #756，type enum/reject count | [MIT · Modusensus][m-license]     |
| G   | GIT121995/dsh-memory-gate · `4a440ceefb65cba89759fb03f8a88085e8144648`              | 0.15.0                          | 2026-10-19T09:52:20+08:00 · bound session-log mining/disclosure   | [MIT · GIT121995][g-license]      |
| L   | FuRongJun-1999/dsh-memory · `1b7331831e06b51e250057fa244a626be0116064`              | 0.11.0                          | 2026-11-18T15:15:29+08:00 · Merge PR #992，identity-tag fallback  | [MIT · FuRongJun-1999][l-license] |
| H   | hr98w/dsh-memory · `a5239de8a524cf6cb0496ed43887560a57e15761`                       | 0.1.5                           | 2026-11-01T17:05:33+08:00 · Merge PR #2，Harness compatibility    | [MIT · hr98w][h-license]          |
| J   | Jesse-njx/dsh-memory · `2a1c9e561b8784bd390f1fd97f307c82abf96f9e`                   | 0.1.0                           | 2026-08-28T17:46:33-04:00 · prepare builds lib for Git installs   | [MIT · contributors][j-license]   |
| S   | seriousz158/dsh-memory · `f7b03757f8bf546d3c007f8e9a074a847b681d3d`                 | 0.10.0                          | 2026-10-10T09:56:39-06:00 · Merge PR #42，desktop 0.2 memory      | [MIT · seriousz158][s-license]    |
| E   | csyangwen/dsh-memory-evolve · `44b6b3eb65a1d50ceba0afb2c13acdd4a8b81423`            | 0.1.0 private                   | 2026-10-29T22:43:31+08:00 · 0.2.1 skill scope/source fix          | [MIT · dsh-external][e-license]   |
| X   | bwndlct/dsh-session-export · `eb18389192e36934718877fd7c6eb397f5cf1cd4`             | 0.1.0                           | 2026-08-14T19:10:23+08:00 · bilingual README                      | [MIT · bwndlct][x-license]        |
| I   | huguangyu666/dsh-plugin-session-import · `ff421f64e1e72eec8d977f20fa8bb1b2e9a16537` | 0.1.3                           | 2026-11-11T13:25:56+08:00 · reserve imported system head          | [MIT · huguangyu666][i-license]   |
| Q   | YaoleWu/dsh-session-search-pro · `82787487d75f6af3d0e1b219a19dec49b93213cb`         | 0.2.0                           | 2026-08-18T11:24:13+08:00 · required peer no longer optional      | [MIT · LeslieWylie][q-license]    |

本地原样浅克隆目录：

```text
D:/Desktop/dsh-continuity/upstream/competitors/
  slow-stack--mneme/
  GIT121995--dsh-memory-gate/
  FuRongJun-1999--dsh-memory/
  hr98w--dsh-memory/
  Jesse-njx--dsh-memory/
  seriousz158--dsh-memory/
  csyangwen--dsh-memory-evolve/
  bwndlct--dsh-session-export/
  huguangyu666--dsh-plugin-session-import/
  YaoleWu--dsh-session-search-pro/
```

**复用许可边界 S：** 上表十份根 LICENSE 均已读，MIT 要保留版权和许可声明；目录 MIT 不替代插件 LICENSE。灵枢的 [LoCoMo-zh-500 数据集说明][l-dataset] 明确 **CC BY-NC 4.0**，且是关键词查询/零干扰检索集，不是问答端到端成绩；不得把它跟根仓 MIT 混同，或原封装进商业默认数据集。本次未跑其公开横评，也未用其成绩排竞品优劣。

## 4. 实际 Cordis 接入与数据路径总览（S）

| ID  | package → bundle → 实际入口                                                                                             | 强依赖/装配方式                                                                                                       | 持久化 / 提取 / 注入                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| M   | [子包 main=lib/index.js、bundle=cordis.patch.yml][m-package] → [id=dsh-mneme][m-patch]；根包是 [private 仓库壳][m-root] | [tools/systemPrompt/llm/agentDefaultModel/commands/webServer][m-entry]；可选服务用 reflect，src/lib 入口本次 cmp 相同 | SQLite memory.db + Markdown mirror + provenance/cursors；turn/end 模型蒸馏/autoDream；systemPrompt context + assemble 补位 |
| G   | [main=lib/index.js][g-package] → [id=memory-gate][g-patch] → [apply/attachHarness][g-entry]                             | commands；agent/session/llm 类型与构造器，session/event + agent/pre-step                                              | SQLite+FTS5 claims/beliefs/evidence/audit；规则 cue；step 1 的新增 user-message recall                                     |
| L   | [main=lib/index.js、dsh/cordis.patch.yml][l-package] → [id=furongjun1999-dsh-memory][l-patch] → [apply][l-entry]        | tools 强依赖，其余动态增强；Node 管理 Python stdio MCP 子进程                                                         | md_cg Markdown 真源 + 派生索引/审计/近期窗口；消息级 gated remember；异步 assemble 注入                                    |
| H   | [main=lib/index.mjs][h-package] → [id=dsh-memory，另覆盖 connection row][h-patch] → [src/index.ts][h-entry]             | inject=[]；子 fiber 注入 memoryStore/systemPrompt/tools/sessionPersistence/agents 等                                  | Global Markdown + 工作区目录；memory_update；手动稳定 Session 整理 Agent；Global+index context                             |
| J   | [main=lib/index.js][j-package] → [id=dsh-memory][j-patch] → [src/index.ts][j-entry]                                     | tools/systemPrompt/sessions；jobs/llm/persistence 可选读取                                                            | 单条 Markdown+JSON header；session/disposed 一次模型蒸馏；systemPrompt 小索引 + read/expand                                |
| S   | [root main=packages/dsh-git-memory/lib/index.js][s-package] → [id=memory][s-patch] → [实际 lib][s-entry]                | tools；settings/systemPrompt 等子装配、Remote service                                                                 | 独立本地 Git 记忆库 + SQLite 派生检索 + usage sidecar；可选 isolated sync；summary section                                 |
| E   | [main=lib/index.js，private][e-package] → [id=dsh-memory-evolve][e-patch] → [实际 lib][e-entry]                         | tools/systemPrompt/agents/sessionTitle/sessionPersistence/settings/llm                                                | MEMORY/USER/KEY/项目/每日文本 + suggestion JSONL；memory 工具/提示驱动 review；snapshot context                            |
| X   | [main=lib/index.js][x-package] → [id=dsh-session-export][x-patch] → [src/index.ts][x-entry]                             | tools；commands 可选                                                                                                  | 当前 Session 投影成自己的 schema 1.0 Markdown/JSON，写工作区 .dsh/exports；不做记忆提取                                    |
| I   | [main=lib/index.js，client=lib/client.js][i-package] → [id=session-import][i-patch] → [src/index.js][i-entry]           | commands/agents/workspaceRegistry/webServer/agentDefaultModel/llm/agentPresets                                        | 四种外部 CLI history 解析 → 重排/裁剪 seed → agents.create → workspace attachment                                          |
| Q   | [main=lib/index.js][q-package] → [id=session-search-pro][q-patch] → [实际 lib/index.js][q-entry]                        | tools/sessionQuery                                                                                                    | 只读官方服务；无自有持久库/提取器/自动注入；index 或有界 scan，search/list/read 三工具                                     |

### 4.1 源码路径存在不等于发布入口可加载（S）

本次逐个检查 package.main 指向的真实文件：M 子包、G、S、E、X、I、Q 的声明 main 在浅克隆中存在；**L 的 `lib/index.js`、H 的 `lib/index.mjs`、J 的 `lib/index.js` 在克隆中均缺失且被各仓 .gitignore 忽略**。L 的 prepare/build 会生成产物（并可能运行 UI 构建），J 有 `prepare: pnpm build`，H 需要声明的 tsdown/build；本次均未执行这些构建。Mneme 根包另为 private 壳，本次用子包而非根包当插件。

所以表中的 L/H/J `src/*.ts` 是**已核验实现接缝**，不是冒称其 package.main 已可直接加载。其现成源文件可以供特定纯函数/诊断执行，仍不等于 Cordis profile 安装/boot 已通过。主工程师如选择源码复用，应先验证构建产物、exports、peer graph 和 bundle 激活，再谈运行兼容。

## 5. 分仓审计

### 5.1 M：Mneme，功能丰富，不是默认强隔离或零模型成本

**已走通的源码链 S：** [入口装配][m-assembly] 创建 store/mirror/service、injector/summarizer/dream 等；[store][m-store] 使用 Node SQLite，busy timeout 先于 WAL，存在 nullable scope、审计、distill 游标/运行/来源表。[summarize 的窗口读取][m-summarize] 在 turn/end 读取增量窗口，经 [实际 llm.stream 调用][m-llm-call] 调用宿主模型，写来源/游标；失败解析不冒充已消费。注入通过 [memory context 和 assemble hook][m-inject]，不改原始 Session；查询读模型可见 seq 并考虑 rewind/compact。

**默认值必须分“schema”与“bundle” S：** [schema 的基础自动项][m-config] 有 autoInject=true、autoSummarize=true；[autoDream 默认值][m-dream-default] 为 true，[embedProvider 默认值][m-embed-default] 为 openai；[bundle][m-patch] 还明确开 entityExtractionEnabled。存在本地 embedding 选项不等于默认所有后台处理不调模型。目录的“完全离线/无需 API Key”句子是 R，不能覆盖这条实际装配链；本次模型调用为 0。

**隔离的关键反例 S+T：**

- [scopeEnabled/strictScope 默认 false][m-scope-config]。
- [scope 解析][m-scope] 用持久 agentPreset 与工作区，不用 Session id 当长期身份；解析不到留 NULL。
- [真正可见性谓词][m-visibility]、[SQL 过滤][m-sql-visibility] **只有 source=explicit 的非空 scope 才构成硬墙**；auto/旧 NULL source 仅降权，跨区仍可见，NULL 全局恒可见；sensitivity 标签不构成此可见性检查。
- [hard-wall workspace 名单及盖章][m-scope-stamp] 能将指定自动工作区盖成 explicit，是 opt-in 补丁，不是默认隔离。
- 本次实际调用真实 store/service 的内存见证：strictScope=true、当前 W2、两条 W1 preference，仅一条 auto、一条 explicit，得到：

```json
{ "autoVisible": true, "explicitVisible": false, "injected": ["foreign-auto"] }
```

这不是“检索分数可能变低”的猜测，是已进入实际 injectCandidates 返回值的反例。

**导入器组合风险 S：** [导入检测器][m-import-detect] 只认 `deepseek-chat-export` provider 或 `DEEPSEEK_EXPORT_` 错误，默认排除官方 DeepSeek 导入会话的自动蒸馏；外部 importer [seed 写 provider=imported][i-events]，并不匹配。不能宣称安装两者就天然保护所有导入历史。显式 backfill 与自动蒸馏是两条入口，PRD 要把来源留存与“允许提取”分开。

**冲突与预算 S/T：** [conflict-freeze 测试][m-freeze-test] 证明 freeze 默认关，开启才进入人工 pending；本次 24 条通过。不能用“有人工冻结能力”宣传默认 review-first。注入有单块/单条/pin 等预算，但 [pin 不扣普通块预算][m-inject-budget]，整体还含 user settings/人格/热记忆，PRD 的“整个恢复 envelope 上限”需另算，不能只抄 maxInjectedItems。

**复用建议 I：** 借 provenance、增量 cursor、source 单点判据、人工冲突回执、literal context 与 source/lib 同步测试；不把 6000+ 行 store/大配置面直接接成角色库。角色分区必须从第一条候选就强制 owner/stable agent/character/story；不把空 scope 解释为跨角色全局。

### 5.2 G：Memory Gate，确定性闸门适合参考，session 状态仍共享

[entry][g-entry] → [harness][g-harness]：在 turn/start 缓存真实 user 源消息，turn/end 保守提取；在 agent/pre-step 先 next，只有 enter、未中止、step=1 才回挖并注入，输出 [producer-owned source][g-source] 的 user message。并非 monkey-patch llm 请求，也不是隐形附加消息。

[repository][g-repository] 使用 SQLite/WAL/FTS5，schemaVersion=3；记忆带来源 Session/event seq、内容 hash、active/superseded/tombstone、belief/evidence、检索/裁决/注入/反馈审计。[authority][g-authority] 对 relevance、belief、freshness、risk 给 use/verify/ignore；[关系判定][g-relations] 不仅按 60% 词项重叠，还保护条件判别词与显式来源，heuristic 不覆盖 explicit。全局 preference/constraint 有 capsule 特权通道。

**隔离 S：** [scope key][g-scope] 是 resolve/realpath 后的 workspace SHA-256 前 24 位，另有 session key；[retrieve][g-service] 仅 session/current workspace/global。没有 owner/persona/character/story 维度；global 偏好默认进入各会话，不能复用为角色身份。

**读隐私与自动回挖 S：** [默认 config][g-config] autoMineWorkspace=true；[mine][g-mine] 为判 workspace，先读取候选日志（非匹配 workspace 的日志也须先读），文件/解压有上限，只有匹配内容才提取。`/memory mine` [把 heuristic 内容落 global][g-mine-service]。因此“只挖同工作区”是写入/提取边界，不等于“绝不打开别的工作区日志”。本次没有运行其真实 sessions root。

**已复现的共享预算 T：** [MemoryService 的 injectionHistory 与 degraded/mode][g-service] 属同一 service 实例，不是 sessionId Map；负反馈健康诊断亦看全库 recentConsumption。内存见证将 sessionBudgetChars=1，A/B 两个会话共享 W 的 heuristic preference：

```json
{ "AInjected": true, "BInjected": false, "crossSessionBudgetAffected": true }
```

A 的预算使用压掉 B 的 verify。单 owner 可能是刻意共享模式，但跟 PRD 的每个恢复绑定独立预算不同。T 的 64 条通过是库/规则/合成日志层，不是当前官方 host hook 的端到端验收。

**复用建议 I：** 首选借“检索候选≠可消费记忆”、use/verify/ignore 的可解释裁决、tombstone、source precedence、合成日志限额；把 session budget/health 改成明确的分区政策。PRD 默认候选待确认，不沿用其 automatic assist 生效行为。

### 5.3 L：灵枢，Markdown/MCP/权限能力很强，体量与默认行为变化很大

[实际入口][l-entry] tools 强依赖，启动 [Node→Python stdio 桥][l-bridge]；[MdcgClient][l-client] 是写入/读取统一出口，自动 remember 走 `mdcg_remember(gated=true)`，并非旧 README 示例的 `cg(op=write)`。后者和审核队列语义不同，不能凭 `ok=true` 判落盘。

**真源/生命周期 S：** [datapath][l-path] 把数据根移到包外用户状态目录（MDCG_STATE_ROOT/DSH_HOME，另有 env/paths/config 优先级），旧包内 data 只作兼容迁移来源；[Python node 写盘][l-write-node] 汇流到 atomic_write，Markdown 节点是真源，索引可重建；[remember_gated][l-gated] 有 ACCEPT/MERGE/DROP/DEFER 及审计。这些“默认数据不住 node_modules”思想值得借鉴。

**旧文档“默认 guest”已经漂移 S：** 当前 [apply resolveToken][l-token-entry] 的 `autoIssue=!legacyAuth`；[token_store][l-token] 缺省 role=designer，未关闭且无既有 token 时会签发并写 keyring。`.org` 仍展示“没配凭据只读 guest”是旧版本 R。本次没有启动 apply、Python MCP、签 token、迁移数据或执行 npm prepare。

**自动记忆不是只提炼事实 S：** [hooks][l-hooks-write] 默认用户消息进入 contextual；assistant/tool 可配置，另有独立近期窗口，关知识面不等于关窗口。显式 excludeSessions 只影响某些轨；[sessionPrivate 默认 false][l-config]，不等于默认每个会话不可串读。

**注入与身份 S：** [assemble][l-hooks-read] 加近期 timeline、query-based cross-session knowledge、可选 identity 独立块；sid 缺失有警告并回落旧全局行为，sid 还有最近观测会话回退，不能当强角色绑定。[Secure._readable][l-readable] 有 clearance×sensitivity、principal.session、admin 豁免；**查询参数 session 不是授权身份**。共享 public/internal 跨会话可见，private/secret 绑定且 admin 豁免；单桥启动级 identity/tenant 不自动等同每个 DSH 角色。

**模板/数据边界 S：** [prompt_safety][l-prompt] 把不可信记忆封装并在注入副本打断模板括号，不改记忆真源；值得借鉴。此审计未运行其集成/加密/权限套件，相关能力只有 S，非 T。

**复用建议 I：** 借包外数据根、写入成功字段、独立短期窗口、principal 与查询视图分离、注入文本转义；不将这一整套 Python 大脑/权限/角色网页/互维维护引入当前最小原生 Storage 架构。根 MIT 不覆盖其 NC 数据集。

### 5.4 H：hr98w，最接近“小索引+审阅整理”，跨进程 CAS 有真实反例

[入口][h-entry] 顶层 inject=[]，子 fiber 分别绑定 systemPrompt/tools/session persistence/agents/workspaces；[memory store][h-store] 是真正 Cordis `Service('memoryStore')`。Global=一份 Markdown；工作区 key 为 basename slug + resolve(cwd) 的 SHA-256 前 16 位，比 J 的 basename-only 好，但是 lexical 路径，未宣称物理 symlink/case canonical identity。

[observation registry][h-observation] 用 Agent WeakMap 保存模型已看到的 revision，模型工具不用自己伪造 revision；[consolidator][h-consolidator] 先 list→inspect→再 list，排 live/archived/missing-cwd/unstable，冻结来源与 reviewId。[worker 的实际 setup][h-worker] 是受限整理 Agent，限制工具/runtime context，结果由 Host 校验并 commit/receipt。它是 **用户手动触发**的额外模型工作，不是零成本自动规则提取。

**必须修正并发表述 T：** 现成 [two-process diagnostic][h-concurrency] 先读取同一代并用屏障让 A/B 分别提交，实际 stdout：

```json
{"mode":"global","outcomes":[{"writer":"writer-a","status":"committed"},{"writer":"writer-b","status":"committed"}],"final":"writer-b","lostUpdate":true}
{"mode":"workspace","outcomes":[{"writer":"writer-a","status":"committed"},{"writer":"writer-b","status":"committed"}],"final":["seed-note","writer-b"],"lostUpdate":true}
```

诊断 **exit 0 只表示诊断完成，反而记录两种 lost update**。[withLock][h-lock] 只有实例 Promise Map；[directory publish][h-publish] staging/backup swap 没有覆盖两进程共同 CAS 临界区。因此“并发修改不会覆盖”必须限同实例协作，不能外推多进程/外部编辑器。本次没有改它的锁。

**测试隔离 S：** [vitest alias][h-vitest] 把 dsh-agent/llm/session/tools/schemastery 映到自写 stub；即使其单测绿也不等于新官方 peer graph 可运行。本次不安装 Vitest/tsdown，不跑全套；只跑了真实 store 的两进程诊断（复用现成 Cordis/yaml）。

**共存风险 S：** [bundle][h-patch] 除自身 id=dsh-memory 还覆盖官方 connection row 的 inject；与 J 同 id=dsh-memory。PRD 的原生插件应少碰官方 bootstrap row，官方兼容修复需在自己的 adapter 内确认。

**复用建议 I：** 优先借 observations、稳定来源重观测、受限 proposal worker、确定性 review receipt；并发提交采用官方 Storage 队列/事务或跨进程有效机制，不能复制实例锁当全局锁。仍缺 character/story 和来源授权的默认强键。

### 5.5 J：Jesse cited memory，引用理念正确，实际 adapter/作用域/预算较弱

[entry][j-entry] session/disposed → [scheduleDistill][j-distill] 一次模型调用，从 firstLiveSeq 后事件提取 user/project/feedback；把结果写 [Markdown + JSON header][j-store]，带 `(sessionId,start,end)`、rev；[recall][j-recall] 每次 prompt section 用 800 估计 token 小索引，memory_read/expand 延后细节。

**三处关键边界 S/T：**

1. [projectFromCwd][j-project] 只取 resolve(cwd) 的 basename 再 slug：两个不同目录但同名项目必然共享目录；无 cwd 为 default；user 类型写 `_user` 全局。没有 owner/character/story，不能当角色隔离层。
2. [store saveTo][j-save] 临时文件 rename 是文件原子替换，不是 CAS；[recall cache][j-recall] 只按 project 缓存，不含 root/预算，多个实例同名 root 的共存还需审查。
3. [工具原文展开][j-tools] 调 persistence.inspect 后按 seq 过滤，但再调用 renderEvent：工具参数截断 400、工具结果 800；`bytes += text.length` 是 JS 长度而非 UTF-8 bytes；citation 是消费窗口范围，非每条事实精确 causal evidence。README 的“lossless”属于设计愿望 R，不应直接标为逐字原文保证。

**实际测试 T：** 29 个选定测试 26 过 3 失败；一个是 Windows path 对 POSIX 预期不符；两个对现成 `dsh-llm@0.2.2-rc.4` 的真实 tool result 构造器失败，根因 [renderEvent][j-transcript] 假定第一块内还有 `.content`，真实 message.content 是直接 text[]，取 undefined 后 `.filter` 崩。不是“缺完整依赖”的失败，是真正执行到断言路径的 adapter 偏差。独立 index-builder 7 条通过，范围仅索引/估计预算。

**复用建议 I：** 借“摘要是原文索引”的产品思想和可审阅单条 Markdown；不用 basename key、旧 Session accessor/nested result adapter、字符伪装 bytes 或窗口引用充当逐句证据。

### 5.6 S：seriousz158 Git memory，事务/回滚参考，不是当前 Windows MVP 的轻量依赖

[根包][s-package] 真入口和 bundle 在 packages/dsh-git-memory，id=memory；不是把整个 repo 根 README 当插件。实际 [repository lib][s-entry] 以 DSH_HOME/storages/memory 为独立 Git 库，summary/handbook/rollouts/archive 为 payload；有校验路径、锁、usage sidecar、derived SQLite 搜索、preview/apply/rollback。普通会话只读，写入由可选 sync 的隔离副本经 Host 验证后入库，[sync transaction][s-sync] 检查 head 与 manifest。

[summary 注入][s-inject] 注册 systemPrompt.section name=memory order=50，interpolate=false；读取更新用 generation 防旧刷新复活；坏读保留上一次有效快照。该库没有当前 Agent 的 owner/persona/workspace 检索参数，默认根与 summary 是本 Host 共享库。

**平台和验收 S/R：** [README 兼容矩阵][s-readme] 明确 macOS 是实测集成目标；源码/测试仍多处 `/usr/bin/git`、zsh，Python 使用 POSIX fd/preexec_fn（[实际调用][s-sync]）。本次不跑其会安装/同步/读源日志的脚本、不为 Windows 安装兼容工具，不把“Node≥22”当全链跨平台保证。Git 备份是记忆库备份，不是 DeepSeek 官方来源 ZIP 或完整 DSH Session 备份。

**复用建议 I：** 借 staging→verify→commit→journal→rollback、派生索引与权威资产分离、metadata-only 审计；不引入额外 Git 写者/头less同步器作为 P1/P2 前提。

### 5.7 E：memory-evolve，原生文本/锁可参考，但自动行为主要依赖模型遵循

[实际 lib][e-entry] 是源码级发布入口，默认 MEMORY/USER 两个全局轨、projects 的 MEMORY/KEY、daily、suggestion 队列；[projectHash 与 locate][e-store] 为 cwd SHA-1 前 12 位（直接字符串），不带 owner/persona/character/story。daily 是共享当日日志、程序加项目标签，不是物理项目隔离。

[store][e-store-lock] 用 `openSync('wx')` 跨进程锁、pid 存活判断、rename；drift guard 能阻止 replace/remove 抹掉非 canonical 的人工改动并备份。这是本批比实例 Map 更真实的跨进程锁参考，但本次没有跑其专门多进程锁套件，37 条通过仅是 store 单测和 source-marker 静态检查。

[renderSnapshot][e-snapshot] 全量注入全局 MEMORY/USER 和当前 KEY，默认 progressiveDisclosure=off；project/daily 刻意不注入。每回合“自动记录”大多是固定提示词要求模型调用 memory，而不是独立确定性事件提取器；reviewEnabled=false。[子代理全局写门控][e-global-write] 依据 origin/subagent 与 reviewMode/approval；主会话并没有同样强制逐条用户确认。因此 README“你确认后才生效/不会擅自写”是 R，PRD 的 candidate→confirmed 必须在数据状态机落实。

包有大量可选技能管理/CLI 调度/广播/同步/通知/UI功能；这次没有启动 apply，因此没有更改技能目录、拉起 CLI 或连接外部会话。`private:true` 和 Git 安装与 npm 发布是不同事实。

**复用建议 I：** 借 plain-text drift guard、exclusive lock、条目 ID/时间标签、changed-only runtime context；不要复制整套技能/调度/广播功能，把 P0/P2 角色记忆变成泛型运维平台。

### 5.8 X：session-export，自有格式导出；旧 fixture 全绿掩盖新工具结果丢失

[工具+commands entry][x-entry] 取当前 exec.agent.session；[adapter][x-adapter] 只读 session.events、略去 context/log-only/compaction replacement，输出 [schemaVersion=1.0][x-schema] Markdown 或 JSON。[exporter][x-exporter] 写 `<session cwd>/.dsh/exports`，不是官方 ZIP，不包含附件原始字节，不是官方 restore 协议。

**T：** 三个现有 node:test 文件 31 次通过，源码只有 **19 个独立 test 声明**，Markdown 的 6 个通过被两个测试文件 import 导致重复执行。这个数字不能作为 31 个独立覆盖点。

**T：真实构造器对照，保真失败：** 以 `@deepseek-ai/dsh-llm@0.2.2-rc.4` 的 `createToolResultMessage` 生成合成消息，input message 顶层 `isError=true`、`toolCallId=fixture-call`，content 直接为 text；[adapter 的 tool/result 分支][x-result] 仍从第一块取 isError/content，得到：

```json
{
  "input": {
    "role": "tool",
    "toolCallId": "fixture-call",
    "isError": true,
    "content": [{ "type": "text", "text": "synthetic-tool-output" }]
  },
  "exported": { "type": "tool_result", "callId": "fixture-call", "success": true, "content": "" },
  "contentLost": true,
  "errorFlagLost": true
}
```

现有手写 fixture 是旧 nested block，因此全绿也不等于当前官方工具结果保真。

**T：并发不覆盖声明的边界：** [uniquePath existsSync→writeFile][x-exporter] 没有 exclusive create。无屏障自然并发 20 次本次得到 20 条唯一路径，**该次自然跑未复现**；在实际 fs writeFile 前加屏障，让 8 个 writer 均先完成同一个选名，再统一执行，得到：

```json
{ "calls": 8, "barrierArrivals": 8, "reportedPaths": 8, "uniquePaths": 1, "collisions": 7 }
```

这是可行 TOCTOU 交错的确定性实证；顺序重名测试只验证顺序。取消信号也在写后才检查（[entry][x-entry]），中止结果不代表文件没写。

**复用建议 I：** 借版本化自有格式、未知事件、围栏自适应与文件名规则；不借旧 tool-result adapter 或“永不覆盖”的并发保证。应急 MD/JSON 要明确有损，正式迁移走官方 v3 引擎。

### 5.9 I：external session-import，有 seed 修复经验，不是 DeepSeek App ZIP 导入

[解析器表][i-entry] 只有 Claude Code/Codex/Reasonix/ZCode。源码包含本机各 CLI 目录扫描、zcode SQLite 索引；本次仅读实现和运行合成 parser fixture，**没有调用 discoverSessions/scanAllSessions/apply 或访问这些真实目录中的聊天**。

[importOne][i-create] parse → 预算裁剪 → [toSessionEvents][i-events] → agents.create(seed, meta.cwd, setup default preset) → workspace create/attach。转换器保证 turn/step/tool pairing、孤儿丢弃/中断结果合成、empty system head；但它重排部分工具链，用 Date.now 分配新 event time，原始时间/原始事件格式不能被称为未损失保存。

[裁剪预算][i-trim] 是字符/token 估计并有 minimum 50000，锚点/摘要保护；README“任何长度/任何模型窗口都不超限”没有本次证据，应称启发式裁剪而非严格 token 保证。[HTTP handlers][i-http] 在插件层把 body chunks 无界合并，并接受文件路径/批次；插件 handler 自身没有完整 owner/method/size 围栏，宿主是否统一执行这些约束本次未运行，因此不作“全站可匿名读盘”的推断。PRD 接入仍需官方 owner route+bounded upload。

**T：** events 29、codex 7、reasonix 5、system head 1 全过；slug 4 条 3 过 1 失败。[slug test][i-slug-test] 硬编码 `c--` 却在 D 盘执行，且 `.slug-test-dir` 没按 [decoder][i-slug] 的 punctuation 规则编码。正确分类是竞品测试跨平台/夹具问题，不把这一次失败泛化为 parser 所有 Windows 路径都坏。未改源/未搬工作区去迎合测试。

**复用建议 I：** 借事件闭合/system-head/损失报告测试；不把支持其他 CLI 的 seed 导入等同官方 DeepSeek ZIP 的 message tree/attachments/status 选择。角色记忆提取更不应在导入提交时偷偷发生。

### 5.10 Q：session-search-pro，是薄服务适配，不是新记忆数据库

[实际 lib][q-entry] required tools+sessionQuery，无 service 不注册工具。`searchSessions` 存在才试 indexed search；仅 SESSION_QUERY_SEARCH_DISABLED/UNSUPPORTED 或相应不可用情形走 bounded list/filter scan；真实 backend 故障返回 error，不冒充零命中。有 engine、scanned、truncated；默认 maxResults=10/maxScan=200，search limit≤50/scan≤500、read maxEvents≤200/每事件≤4000字符。title 使用单独 title APIs。

**隔离 S：** search 默认遍历全部宿主可见 Session，无强 cwd/owner/character 参数；list 的 cwd 只是可选 substring；read 任意可见 id。服务读权限能限制 Host 访问范围，但插件没有实现角色分区，不能当 Recovery 的身份闸门。read 返回的是已抽取文本，不是完整原始事件或附件备份。

[旧 README][q-readme] 解释旧版本 index-disabled 并给 stock openAt=never 配置；这是其 rc.6 目标的 R/S背景，**当前官方 stock 是否仍相同由主工程师核验**。

**T：** 现有 tools 套件加载失败 `ERR_MODULE_NOT_FOUND @deepseek-ai/dsh-tools`；[boot 套件][q-boot] 默认缺包会 exit0/skip，本次 `DSH_BOOT_STRICT=1` 正确 exit1，明确为**没有执行到真实 boot**。没有安装全部官方 graph 来凑绿，也没有读取当前聊天。该插件 README“tests执行真实registry”仍是 R，不是本次成绩。

**复用建议 I：** 优先官方 sessionQuery thin adapter、capability probe、index→bounded scan、完整 truncation 报告；不要再建自己的会话文件扫描器。角色/故事范围必须在调用前强过滤。

## 6. 测试已运行账本（T）

### 6.1 实际环境与解释

```text
Shell: Git Bash
Host default Node: 22.23.2（仅检查工具；正式选定测试使用下面隔离版本）
Test Node: D:/Desktop/dsh-continuity/.toolchain/node-v24.22.3-win-x64/node.exe
Node version: 24.22.3
复用主工程师已有根包：
  @deepseek-ai/dsh-llm 0.2.2-rc.4
  @deepseek-ai/schemastery 3.19.0
  @deepseek-ai/cordis 4.1.0
  yaml 2.9.1
@deepseek-ai/dsh-tools: 本次从竞品祖先解析仍缺失
没有运行 npm/pnpm install、完整 build、真实 profile boot、联网模型测试
```

| 仓库/命令范围                                                                    | 结果                                         | 正确证据解释                                                                            |
| -------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| X `node --test test/filename.test.mjs test/json.test.mjs test/markdown.test.mjs` | **31 pass / 0 fail / 0 skip**；19 独立声明   | 旧 fixture 纯函数+文件测试；6 Markdown 被重复加载，非官方 host                          |
| I `node test-events.mjs`                                                         | **29 pass / 0 fail**                         | converter 源码合成消息                                                                  |
| I `node test-codex.mjs`                                                          | **7 pass / 0 fail**                          | 合成 JSONL，不读用户 sessions                                                           |
| I `node test-reasonix.mjs`                                                       | **5 pass / 0 fail**                          | 合成 JSONL/meta                                                                         |
| I `node test-slug.mjs`                                                           | **3 pass / 1 fail**，exit1                   | 固定 C 盘/未编码 fixture；问题已定位                                                    |
| I `node test-system-head.mjs`                                                    | **1 pass / 0 fail**                          | 前面批处理因 slug fail 停止后单独补跑                                                   |
| G 6 个 tests + measure/trajectory 2 个 backtest test 文件                        | **64 pass / 0 fail / 0 skip**                | 直接使用已提交 lib，**没有先 npm run build**；规则/SQLite/合成日志，非实际 Cordis hooks |
| M conflict-freeze + scope-optional-service                                       | **30 pass / 0 fail / 0 skip**                | 24 冻结+6 Proxy resolver；mock LLM，不产生真实模型调用                                  |
| M strict-scope/hard-wall/session-gate 3 个 suite 文件                            | **文件加载失败**，dsh-tools 缺失             | 四文件首次组合为 24 pass+3 file fail；不是3条已执行逻辑断言失败。后单独重跑上行确认30条 |
| M 真实内存 store/service 的 auto/explicit 可见性→injectCandidates 见证           | auto foreign 注入、explicit foreign排除      | 已执行真实链，非源码 regex                                                              |
| E store + injection-source-kind                                                  | **37 pass / 0 fail / 0 skip**                | 33 storage测试+4规则/静态 source marker；不冒充全 plugin boot                           |
| J store/index-builder/transcript                                                 | **26 pass / 3 fail / 0 skip**（29总数）      | 1 Windows路径fixture、2真实llm constructor/result形状；使用 native transform-types      |
| J index-builder 单独复验                                                         | **7 pass / 0 fail**                          | 已包含上一行，不能重复累加成额外独立覆盖                                                |
| H `--experimental-transform-types scripts/check-memory-concurrency.mjs`          | exit0；**global与workspace lostUpdate=true** | 诊断发现缺陷，绝非“并发测试通过”                                                        |
| Q tools                                                                          | exit1，缺 dsh-tools                          | 未跑到工具行为                                                                          |
| Q `DSH_BOOT_STRICT=1 .../tests/boot.test.mjs`                                    | exit1，明确缺包/未执行                       | 把默认 skip=0 的假绿挡住                                                                |
| L / S 完整 suite                                                                 | **未运行**                                   | 准备/模型/Python/Mac依赖和副作用未引入                                                  |
| X 当前官方llm constructor→adaptSession见证                                       | **contentLost=true/errorFlagLost=true**      | 新格式保真失败，旧 fixture绿不能覆盖                                                    |
| X 自然并发20 / 强制FS屏障8                                                       | 自然20unique；屏障**1unique/7碰撞**          | 分别记载；不把一次无复现自然跑隐藏                                                      |
| G 内存 A/B budget见证                                                            | **A true/B false**                           | 跨会话预算互相影响                                                                      |

本次没有给不同仓库测试数做统一总和：断言方法、重复加载、静态检查、缺包失败与诊断的意义不同。也没有以“README宣称628/54/若干测试”替代上表。

### 6.2 可复制的常规命令（不安装依赖）

运行前使用既有隔离 Node；没有这些现成 peer 时，保持“未执行”状态即可，勿连接真实 profile 去满足研究测试。

```bash
cd /d/Desktop/dsh-continuity
mkdir -p upstream/competitors/_audit/tmp
export TMPDIR='D:/Desktop/dsh-continuity/upstream/competitors/_audit/tmp'
export TMP="$TMPDIR" TEMP="$TMPDIR"
NODE='/d/Desktop/dsh-continuity/.toolchain/node-v24.22.3-win-x64/node.exe'

(cd upstream/competitors/bwndlct--dsh-session-export && \
  "$NODE" --test test/filename.test.mjs test/json.test.mjs test/markdown.test.mjs)
(cd upstream/competitors/huguangyu666--dsh-plugin-session-import && \
  "$NODE" test-events.mjs && "$NODE" test-codex.mjs && "$NODE" test-reasonix.mjs)
(cd upstream/competitors/huguangyu666--dsh-plugin-session-import && "$NODE" test-slug.mjs)
"$NODE" upstream/competitors/huguangyu666--dsh-plugin-session-import/test-system-head.mjs

(cd upstream/competitors/GIT121995--dsh-memory-gate && "$NODE" --test \
  tests/text.test.mjs tests/relations.test.mjs tests/repository.test.mjs \
  tests/service.test.mjs tests/mine.test.mjs tests/extractor.test.mjs \
  backtest/measure.test.mjs backtest/trajectory.test.mjs)
(cd upstream/competitors/slow-stack--mneme/dsh-mneme && "$NODE" --test \
  test/conflict-freeze.test.js test/scope-optional-service.test.js)
(cd upstream/competitors/csyangwen--dsh-memory-evolve && "$NODE" --test \
  tests/store.test.js tests/injection-source-kind.test.js)
(cd upstream/competitors/Jesse-njx--dsh-memory && "$NODE" --experimental-transform-types --test \
  test/store.test.ts test/index-builder.test.ts test/transcript.test.ts)
"$NODE" --experimental-transform-types upstream/competitors/hr98w--dsh-memory/scripts/check-memory-concurrency.mjs
DSH_BOOT_STRICT=1 "$NODE" upstream/competitors/YaoleWu--dsh-session-search-pro/tests/boot.test.mjs
```

### 6.3 最小见证：默认 soft scope 和跨 Session 预算

下列示例只使用合成身份与 `:memory:`，运行位置为仓库根：

```js
// Mneme：这是真实 store/service，不启动 apply，不调用模型。
import { createStore } from './upstream/competitors/slow-stack--mneme/dsh-mneme/src/store.js';
import { createService } from './upstream/competitors/slow-stack--mneme/dsh-mneme/src/service.js';
const store = createStore(':memory:');
const service = createService({
  store,
  mirror: null,
  config: { scopeEnabled: true, strictScope: true, memoryQualityFilter: { enabled: false } },
});
const a = store.save({
  type: 'preference',
  title: 'foreign-auto',
  content: '用户喜欢简洁中文',
  importance: 5,
  workspace_scope: 'W1',
  workspace_scope_source: 'auto',
});
const b = store.save({
  type: 'preference',
  title: 'foreign-explicit',
  content: '用户喜欢详细英文',
  importance: 5,
  workspace_scope: 'W1',
  workspace_scope_source: 'explicit',
});
const scope = { agent_scope: null, workspace_scope: 'W2' };
console.log({
  autoVisible: service.isVisibleInScope(a, scope),
  explicitVisible: service.isVisibleInScope(b, scope),
  injected: service.injectCandidates({ maxItems: 10, threshold: 0, scope }).map((x) => x.title),
});
store.close();
```

```js
// Gate：共享 service 上，A 的 verify 预算影响 B。
import { MemoryRepository } from './upstream/competitors/GIT121995--dsh-memory-gate/lib/repository.js';
import { MemoryService } from './upstream/competitors/GIT121995--dsh-memory-gate/lib/service.js';
const r = new MemoryRepository(':memory:');
const s = new MemoryService(r, {
  mode: 'assist',
  candidateLimit: 16,
  capsuleLimit: 0,
  injectionLimit: 3,
  maxInjectionChars: 1200,
  minUseBelief: 0.7,
  maxUseRisk: 0.45,
  harmfulQuarantineThreshold: 2,
  freshnessHalfLifeDays: 180,
  sessionBudgetChars: 1,
});
s.remember('用户偏好简洁中文回答', {
  scope: 'workspace',
  scopeKey: 'W',
  kind: 'preference',
  origin: 'heuristic',
});
const call = (id) =>
  s.prepareRecall({ query: '简洁中文', sessionId: id, sessionScopeKey: id, workspaceKey: 'W' });
console.log({ AInjected: !!call('A'), BInjected: !!call('B') });
r.close();
```

exporter 的 FS 屏障见证按以下可复现交错执行：导入实际 `writeExport`；用 `node:fs/promises.writeFile` wrapper 与 `syncBuiltinESMExports()` 将 8 个目标目录 writer 阻塞在真实落盘之前；固定 Session id/秒级时间，等待 8 个均已通过 uniquePath 后统一释放；收集返回 paths 得到 1 unique。wrapper 没改磁盘源码，只将允许发生的异步交错确定化；临时目录完成后清理。不要把此见证解释为自然压力场景的碰撞概率评估。

## 7. 冲突、重复注入与复用矩阵

### 7.1 已确认的名称/路径/流程冲突（S，未运行组合 host）

| 组合                  | 已核验事实                                                                                                    | 对 DSH Continuity 的处理                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| H + J                 | 两份 [bundle id 都是 dsh-memory][h-patch] [J同名][j-patch]                                                    | 不同时原样插入；自身用独立 namespace，目录 slug≠loader id                          |
| M + H                 | [M memory_update][m-tools] 与 [H memory_update][h-entry] 同工具名                                             | 单工具所有者或改自有 namespace；不能靠安装顺序保证行为                             |
| M + S                 | [M memory_search][m-tools] 与 [S 的 memory_search][s-tools] 重叠；context/section 还分别用 memory             | 独立 section/context 名称，明确关闭其它自动注入；具体 registry冲突行为由官方集成测 |
| G + J                 | [G /memory commands][g-commands] 与 [J /memory][j-entry] 同命令                                               | 不能混用同一 slash入口当各自状态查询                                               |
| 多套memory            | M/J/H默认都邻近 DSH_HOME/memory，但格式分别 SQLite/mirror、每条JSONheader、Global/YAML工作区；G同目录另sqlite | 数据域分离；绝不让不同格式的“memory目录”互相扫描/迁移                              |
| 多个自动注入者        | M/G/L/H/J/S/E均各自把记忆送入模型，预算互不知晓；source/routing/时间还不同                                    | 恢复只有一个权威组装器，预算按全envelope计算；不累计装一堆记忆插件                 |
| M + external importer | M默认导入排除认 deepseek-chat-export；I写 imported                                                            | 来源落库与提取许可显式绑定，不靠provider名称猜所有来源                             |
| Q +角色恢复           | Q读取全部宿主可见会话；可选cwd substring非强身份                                                              | query前做owner/agent/character/story精确筛选，读结果保留source引用                 |
| H/其它包替官方row     | H bundle覆盖connection.inject；旧版本service名/peer范围常变化                                                 | 自己只增加bundle/client slot/adapter，不以竞品兼容patch修改核心                    |

以上是源码级冲突，不冒称已装十个插件后得到某个 loader exception。默认自动功能叠加也不等同“重复注入必然每步发生”，其程度需通过真实官方 materialization/diff 测量。

### 7.2 按 PRD 需求评估可复用内容

| PRD 接缝                               | 本批最有价值的参考                                          | 空缺/负证据                                                    | P0决策                                                                |
| -------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| 官方 v3 ZIP预检/commit                 | I的seed闭合测试、X的有损导出报告                            | X自有schema非ZIP；I是外部history；新工具结果X/J适配器失败      | **复用官方 importer**，保留全部原始bytes/分支/附件；竞品不替代        |
| 审阅角色记忆                           | H proposal/receipt，G可解释闸门，M provenance/freeze        | default auto确认不匹配；无完整Persona/Relationship/Story强分区 | **候选默认不生效**，用户确认状态机，不从assistant剧情推断真人事实     |
| owner/stable agent/character/story隔离 | M显式scope、L principal/view分离、H opaque workspace        | M auto soft可跨区；J basename碰撞；G无persona；L admin共享默认 | **强键前置**，解析失败留未知且不跨角色兜底                            |
| restart/append-only续聊                | J cited ranges、H readonly persistence adapter              | J/X旧accessor/result形状；memory ≠ Session持久化               | **官方 persistence+factory**；原事件不重写                            |
| 预算+当前剧情优先                      | G use/verify，J小索引，M相关性/热记忆                       | G跨会话budget；Jchars伪bytes；多块预算分别计算                 | **整个恢复envelope硬上限**，每binding独立状态，冲突提示优先           |
| 故障/并发/去重                         | S staged verify/commit/journal，E drift/lock，H observation | H已复现two-process lost update；X已复现race；目录绿无help      | **官方Storage队列/事务**，可解释partial outcome；并发测试红样本先留   |
| 手机原生UI                             | 多个dsh.client例子、I file/seed flow                        | 本次无390×844/360×800真实UI测试                                | **只挂官方slot**，后续实际DSH Web E2E，不自建聊天窗                   |
| 隐私/模型成本                          | 包外数据根、literal untrusted context、metadata-only账      | auto LLM/真实log扫描/guest旧文档漂移                           | **规则候选默认**，模型选项显式；Host目的地在UI明示                    |
| 完整备份与删范围                       | S记忆回滚，X独立格式设计                                    | 自有导出非全部原始资产；删除Session不等于删mem/source          | **四类资产独立**：source、officialSession、memory、recoveryProjection |

**总推荐 I：用接口/测试/数据不变量复用，不用“十个竞品功能总和”复用。** 当前已有架构的官方 Storage domain + 官方 importer + 单一恢复组装器比新增 SQLite/Python/Git三个记忆后台同时接入更短，更容易满足完整 PRD。

## 8. 本轮完成与剩余验证

### 已完成

- 四个社区域名交叉发现，真实 catalog slug、GitHub重定向、同名包区别、过时快照已核验。
- 十个竞品固定SHA浅克隆、版本/许可/最后提交/入口/持久化/提取/注入/隔离/测试/共存复用已落证据。
- 实际执行纯合成/内存测试；记录缺依赖、跨平台fixture、真实构造器偏差、跨进程lost update、auto soft scope、共享budget、export race，未藏红。
- 该报告写入；117 个固定 SHA 源码行引用已逐个核对路径与行范围，引用名无缺失。合成测试临时根已清理，十个竞品 tracked 工作树 clean；无核心修改，无官方重克隆，无真实聊天，无发布。

### 明确未完成、由主工程师后续验收

1. 当前官方 SHA 上真实 Cordis Loader、Tools registry、SessionQuery、Storage、Session writer/factory、AgentLoop 的集成契约；不能由竞品的 rc.6 peer范围或自写stub推导兼容。
2. 官方 v3 ZIP/tree/attachments/state的真实导入与恶意ZIP预检；原始资产、repeat import ledger、部分提交、取消、重启恢复。
3. owner/stable agent/character/story强隔离、同名不同角色、失去binding、来源未知、用户/助手/推断区分、候选确认/修订/tombstone的回归测试。
4. 所有注入块整体budget、模板边界、重复context快照、rewind/compact后恢复，以及相关性/剧情时序与冲突提示。
5. 手机视口真实DSH Web流程、文件选择、目标Host显示、解析报告/确认/恢复/备份，不把第三方截图当当前验收。
6. 模型实际表现单独评估；本轮的mock/确定性测试只证明接线/算法，不证明不同模型保持人格或自然语言记忆质量。

---

## 固定 SHA 源码引用索引

[m-root]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/package.json#L1-L11
[m-assembly]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/index.js#L210-L403
[m-dream-default]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/config.js#L230-L240
[m-embed-default]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/config.js#L484-L499
[m-llm-call]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/summarize.js#L1260-L1304
[m-package]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/package.json#L1-L73
[m-license]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/LICENSE#L1-L21
[m-patch]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/cordis.patch.yml#L1-L21
[m-entry]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/index.js#L67-L85
[m-store]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/store.js#L1358-L1456
[m-summarize]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/summarize.js#L1059-L1149
[m-inject]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/inject.js#L660-L727
[m-config]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/config.js#L14-L52
[m-scope-config]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/config.js#L1174-L1225
[m-scope]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/scope.js#L46-L118
[m-visibility]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/service.js#L93-L159
[m-sql-visibility]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/store.js#L2000-L2018
[m-scope-stamp]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/scope.js#L204-L276
[m-import-detect]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/imported-session.js#L7-L40
[m-freeze-test]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/test/conflict-freeze.test.js#L1-L44
[m-inject-budget]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/inject.js#L184-L337
[m-tools]: https://github.com/slow-stack/mneme/blob/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2/dsh-mneme/src/tools.js#L208-L525
[g-package]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/package.json#L1-L94
[g-license]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/LICENSE#L1-L21
[g-patch]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/cordis.patch.yml#L1-L13
[g-entry]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/src/index.ts#L1-L46
[g-harness]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/src/harness.ts#L17-L111
[g-source]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/src/message-source.ts#L14-L27
[g-repository]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/src/repository.ts#L35-L159
[g-authority]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/src/authority.ts#L14-L77
[g-relations]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/src/relations.ts#L83-L113
[g-scope]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/src/scope.ts#L1-L25
[g-service]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/src/service.ts#L33-L219
[g-config]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/src/config.ts#L45-L92
[g-mine]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/src/mine.ts#L1-L245
[g-mine-service]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/src/service.ts#L249-L304
[g-commands]: https://github.com/GIT121995/dsh-memory-gate/blob/4a440ceefb65cba89759fb03f8a88085e8144648/src/commands.ts#L23-L30
[l-package]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/package.json#L1-L137
[l-license]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/LICENSE#L1-L21
[l-patch]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/dsh/cordis.patch.yml#L1-L3
[l-entry]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/src/index.ts#L83-L351
[l-bridge]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/src/bridge.ts#L1-L120
[l-client]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/src/lib/mdcg_client.ts#L1-L38
[l-path]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/src/lib/datapath.ts#L1-L140
[l-write-node]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/md_cg/mdcg.py#L4890-L4905
[l-gated]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/md_cg/mdcos.py#L6311-L6321
[l-token-entry]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/src/index.ts#L272-L325
[l-token]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/src/lib/token_store.ts#L339-L427
[l-hooks-write]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/src/hooks.ts#L1401-L1549
[l-hooks-read]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/src/hooks.ts#L1160-L1309
[l-config]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/src/index.ts#L156-L256
[l-readable]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/md_cg/mdcos.py#L7777-L7829
[l-prompt]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/src/lib/prompt_safety.ts#L66-L245
[l-dataset]: https://github.com/FuRongJun-1999/dsh-memory/blob/1b7331831e06b51e250057fa244a626be0116064/data/benchmarks/locomo-zh-500/README.md#L1-L35
[h-package]: https://github.com/hr98w/dsh-memory/blob/a5239de8a524cf6cb0496ed43887560a57e15761/package.json#L1-L90
[h-license]: https://github.com/hr98w/dsh-memory/blob/a5239de8a524cf6cb0496ed43887560a57e15761/LICENSE#L1-L21
[h-patch]: https://github.com/hr98w/dsh-memory/blob/a5239de8a524cf6cb0496ed43887560a57e15761/cordis.patch.yml#L1-L11
[h-entry]: https://github.com/hr98w/dsh-memory/blob/a5239de8a524cf6cb0496ed43887560a57e15761/src/index.ts#L63-L240
[h-store]: https://github.com/hr98w/dsh-memory/blob/a5239de8a524cf6cb0496ed43887560a57e15761/src/memory-store.ts#L120-L149
[h-observation]: https://github.com/hr98w/dsh-memory/blob/a5239de8a524cf6cb0496ed43887560a57e15761/src/memory-observation.ts#L1-L84
[h-consolidator]: https://github.com/hr98w/dsh-memory/blob/a5239de8a524cf6cb0496ed43887560a57e15761/src/session-consolidator.ts#L25-L130
[h-worker]: https://github.com/hr98w/dsh-memory/blob/a5239de8a524cf6cb0496ed43887560a57e15761/src/consolidation-worker.ts#L248-L302
[h-concurrency]: https://github.com/hr98w/dsh-memory/blob/a5239de8a524cf6cb0496ed43887560a57e15761/scripts/check-memory-concurrency.mjs#L1-L95
[h-lock]: https://github.com/hr98w/dsh-memory/blob/a5239de8a524cf6cb0496ed43887560a57e15761/src/memory-store.ts#L353-L366
[h-publish]: https://github.com/hr98w/dsh-memory/blob/a5239de8a524cf6cb0496ed43887560a57e15761/src/memory-store.ts#L448-L475
[h-vitest]: https://github.com/hr98w/dsh-memory/blob/a5239de8a524cf6cb0496ed43887560a57e15761/vitest.config.ts#L1-L18
[j-package]: https://github.com/Jesse-njx/dsh-memory/blob/2a1c9e561b8784bd390f1fd97f307c82abf96f9e/package.json#L1-L87
[j-license]: https://github.com/Jesse-njx/dsh-memory/blob/2a1c9e561b8784bd390f1fd97f307c82abf96f9e/LICENSE#L1-L21
[j-patch]: https://github.com/Jesse-njx/dsh-memory/blob/2a1c9e561b8784bd390f1fd97f307c82abf96f9e/cordis.patch.yml#L1-L20
[j-entry]: https://github.com/Jesse-njx/dsh-memory/blob/2a1c9e561b8784bd390f1fd97f307c82abf96f9e/src/index.ts#L30-L102
[j-distill]: https://github.com/Jesse-njx/dsh-memory/blob/2a1c9e561b8784bd390f1fd97f307c82abf96f9e/src/distill.ts#L280-L370
[j-store]: https://github.com/Jesse-njx/dsh-memory/blob/2a1c9e561b8784bd390f1fd97f307c82abf96f9e/src/store.ts#L95-L200
[j-project]: https://github.com/Jesse-njx/dsh-memory/blob/2a1c9e561b8784bd390f1fd97f307c82abf96f9e/src/store.ts#L50-L93
[j-save]: https://github.com/Jesse-njx/dsh-memory/blob/2a1c9e561b8784bd390f1fd97f307c82abf96f9e/src/store.ts#L260-L346
[j-recall]: https://github.com/Jesse-njx/dsh-memory/blob/2a1c9e561b8784bd390f1fd97f307c82abf96f9e/src/recall.ts#L15-L61
[j-tools]: https://github.com/Jesse-njx/dsh-memory/blob/2a1c9e561b8784bd390f1fd97f307c82abf96f9e/src/tools.ts#L154-L205
[j-transcript]: https://github.com/Jesse-njx/dsh-memory/blob/2a1c9e561b8784bd390f1fd97f307c82abf96f9e/src/transcript.ts#L26-L49
[s-package]: https://github.com/seriousz158/dsh-memory/blob/f7b03757f8bf546d3c007f8e9a074a847b681d3d/package.json#L1-L90
[s-license]: https://github.com/seriousz158/dsh-memory/blob/f7b03757f8bf546d3c007f8e9a074a847b681d3d/LICENSE#L1-L21
[s-patch]: https://github.com/seriousz158/dsh-memory/blob/f7b03757f8bf546d3c007f8e9a074a847b681d3d/packages/dsh-git-memory/cordis.patch.yml#L1-L5
[s-entry]: https://github.com/seriousz158/dsh-memory/blob/f7b03757f8bf546d3c007f8e9a074a847b681d3d/packages/dsh-git-memory/lib/index.js#L1-L216
[s-tools]: https://github.com/seriousz158/dsh-memory/blob/f7b03757f8bf546d3c007f8e9a074a847b681d3d/packages/dsh-git-memory/lib/index.js#L1621-L1657
[s-inject]: https://github.com/seriousz158/dsh-memory/blob/f7b03757f8bf546d3c007f8e9a074a847b681d3d/packages/dsh-git-memory/lib/index.js#L1658-L1689
[s-sync]: https://github.com/seriousz158/dsh-memory/blob/f7b03757f8bf546d3c007f8e9a074a847b681d3d/packages/dsh-git-memory/lib/sync-apply.py#L1050-L1139
[s-readme]: https://github.com/seriousz158/dsh-memory/blob/f7b03757f8bf546d3c007f8e9a074a847b681d3d/README.md#L63-L82
[e-package]: https://github.com/csyangwen/dsh-memory-evolve/blob/44b6b3eb65a1d50ceba0afb2c13acdd4a8b81423/package.json#L1-L29
[e-license]: https://github.com/csyangwen/dsh-memory-evolve/blob/44b6b3eb65a1d50ceba0afb2c13acdd4a8b81423/LICENSE#L1-L21
[e-patch]: https://github.com/csyangwen/dsh-memory-evolve/blob/44b6b3eb65a1d50ceba0afb2c13acdd4a8b81423/cordis.patch.yml#L1-L10
[e-entry]: https://github.com/csyangwen/dsh-memory-evolve/blob/44b6b3eb65a1d50ceba0afb2c13acdd4a8b81423/lib/index.js#L60-L189
[e-store]: https://github.com/csyangwen/dsh-memory-evolve/blob/44b6b3eb65a1d50ceba0afb2c13acdd4a8b81423/lib/store.js#L480-L614
[e-store-lock]: https://github.com/csyangwen/dsh-memory-evolve/blob/44b6b3eb65a1d50ceba0afb2c13acdd4a8b81423/lib/store.js#L375-L447
[e-snapshot]: https://github.com/csyangwen/dsh-memory-evolve/blob/44b6b3eb65a1d50ceba0afb2c13acdd4a8b81423/lib/index.js#L546-L647
[e-global-write]: https://github.com/csyangwen/dsh-memory-evolve/blob/44b6b3eb65a1d50ceba0afb2c13acdd4a8b81423/lib/index.js#L1156-L1188
[x-package]: https://github.com/bwndlct/dsh-session-export/blob/eb18389192e36934718877fd7c6eb397f5cf1cd4/package.json#L1-L67
[x-license]: https://github.com/bwndlct/dsh-session-export/blob/eb18389192e36934718877fd7c6eb397f5cf1cd4/LICENSE#L1-L21
[x-patch]: https://github.com/bwndlct/dsh-session-export/blob/eb18389192e36934718877fd7c6eb397f5cf1cd4/cordis.patch.yml#L1-L5
[x-entry]: https://github.com/bwndlct/dsh-session-export/blob/eb18389192e36934718877fd7c6eb397f5cf1cd4/src/index.ts#L24-L158
[x-adapter]: https://github.com/bwndlct/dsh-session-export/blob/eb18389192e36934718877fd7c6eb397f5cf1cd4/src/session-adapter.ts#L102-L141
[x-result]: https://github.com/bwndlct/dsh-session-export/blob/eb18389192e36934718877fd7c6eb397f5cf1cd4/src/session-adapter.ts#L185-L207
[x-schema]: https://github.com/bwndlct/dsh-session-export/blob/eb18389192e36934718877fd7c6eb397f5cf1cd4/src/schema.ts#L1-L48
[x-exporter]: https://github.com/bwndlct/dsh-session-export/blob/eb18389192e36934718877fd7c6eb397f5cf1cd4/src/exporter.ts#L24-L100
[i-package]: https://github.com/huguangyu666/dsh-plugin-session-import/blob/ff421f64e1e72eec8d977f20fa8bb1b2e9a16537/package.json#L1-L69
[i-license]: https://github.com/huguangyu666/dsh-plugin-session-import/blob/ff421f64e1e72eec8d977f20fa8bb1b2e9a16537/LICENSE#L1-L21
[i-patch]: https://github.com/huguangyu666/dsh-plugin-session-import/blob/ff421f64e1e72eec8d977f20fa8bb1b2e9a16537/cordis.patch.yml#L1-L4
[i-entry]: https://github.com/huguangyu666/dsh-plugin-session-import/blob/ff421f64e1e72eec8d977f20fa8bb1b2e9a16537/src/index.js#L7-L29
[i-events]: https://github.com/huguangyu666/dsh-plugin-session-import/blob/ff421f64e1e72eec8d977f20fa8bb1b2e9a16537/src/to-session-events.js#L28-L190
[i-trim]: https://github.com/huguangyu666/dsh-plugin-session-import/blob/ff421f64e1e72eec8d977f20fa8bb1b2e9a16537/src/index.js#L356-L464
[i-create]: https://github.com/huguangyu666/dsh-plugin-session-import/blob/ff421f64e1e72eec8d977f20fa8bb1b2e9a16537/src/index.js#L466-L545
[i-http]: https://github.com/huguangyu666/dsh-plugin-session-import/blob/ff421f64e1e72eec8d977f20fa8bb1b2e9a16537/src/index.js#L548-L642
[i-slug-test]: https://github.com/huguangyu666/dsh-plugin-session-import/blob/ff421f64e1e72eec8d977f20fa8bb1b2e9a16537/test-slug.mjs#L15-L43
[i-slug]: https://github.com/huguangyu666/dsh-plugin-session-import/blob/ff421f64e1e72eec8d977f20fa8bb1b2e9a16537/src/path-decoding.js#L1-L34
[q-package]: https://github.com/YaoleWu/dsh-session-search-pro/blob/82787487d75f6af3d0e1b219a19dec49b93213cb/package.json#L1-L65
[q-license]: https://github.com/YaoleWu/dsh-session-search-pro/blob/82787487d75f6af3d0e1b219a19dec49b93213cb/LICENSE#L1-L21
[q-patch]: https://github.com/YaoleWu/dsh-session-search-pro/blob/82787487d75f6af3d0e1b219a19dec49b93213cb/cordis.patch.yml#L1-L10
[q-entry]: https://github.com/YaoleWu/dsh-session-search-pro/blob/82787487d75f6af3d0e1b219a19dec49b93213cb/lib/index.js#L70-L337
[q-readme]: https://github.com/YaoleWu/dsh-session-search-pro/blob/82787487d75f6af3d0e1b219a19dec49b93213cb/README.md#L1-L253
[q-boot]: https://github.com/YaoleWu/dsh-session-search-pro/blob/82787487d75f6af3d0e1b219a19dec49b93213cb/tests/boot.test.mjs#L16-L40

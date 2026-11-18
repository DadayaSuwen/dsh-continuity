# 最新官方源码兼容补充

[English](UPSTREAM_LATEST.en.md) · [稳定合约](COMPATIBILITY.md) · [进度](PROGRESS.md) · [依赖公告研究](../research/DEPENDENCY_ADVISORY_REVIEW.md)

## 1. 观察与运行轨道

2026-11-19（Asia/Shanghai）本地继续验证。Git `ls-remote` 和 [GitHub commit API](https://api.github.com/repos/DeepSeek-ai/deepseek-harness/commits/2e39e70496aa02986ca6a820c5d497e816b69d7e) 均确认当时官方 `master` 是 **`2e39e70496aa02986ca6a820c5d497e816b69d7e`**，commit 时间为 `2026-11-18T10:58:42Z`。[根 manifest](https://github.com/DeepSeek-ai/deepseek-harness/blob/2e39e70496aa02986ca6a820c5d497e816b69d7e/package.json) 标记 **0.2.2-rc.5**、pnpm11.28.5。

| 轨道                 | 本轮实际结果  | 范围                                                      |
| -------------------- | ------------- | --------------------------------------------------------- |
| 已安装 npm0.2.2-rc.4 | 60/60，28文件 | 真实官方 runtime，仅外部模型IO scripted                   |
| 稳定 ca33fd 源码     | 60/60，28文件 | 官方与vendor源码 aliases                                  |
| 最新 2e39e704 源码   | 60/60，28文件 | 完整最新源码图，沿用本项目已安装第三方/native依赖         |
| 手机 Web             | 8/8           | 完整 npm0.2.2-rc.4 CLI Web与nativeSlot，390×844 / 360×800 |

最新源码检查不是已发布 rc.5 npm消费测试，也不是rc.5完整浏览器/实机或live模型验收。插件安装版本、官方peer精确版本与稳定SHA仍保持0.2.2-rc.4 / ca33fd，不因probe成功自动切换。

## 2. 先失败再通过

此前已取得latest commit的隔离clone因中断留下零字节index.lock；确认无Git进程、时间戳属于旧轮次后，将锁移存为诊断证据，不改官方跟踪源码。随后真实latest运行出现 **22套件加载失败、36测试执行通过**：官方JSONL持久化tsconfig引用 `native/system/packages/entry`，旧probe只取packages/vendor，原生目录缺失。这个失败不是已证明的API不兼容。

补齐官方 `native/system` 稀疏目录后，同一[正式连续性测试](../../tests/e2e/runtime/continuity.test.ts)先通过，再运行全部60项通过。最后实际执行[公开latest脚本](../../scripts/upstream-compatibility.mjs)：全新隔离clone→fullSHA→packages/vendor/native-system→[真实源码runner](../../scripts/test-pinned.mjs)，**exit0 / 60通过 / stablePinUnchanged=true**。沿用已有object只为减少下载，未用npm源码替代官方文件；所有跟踪源码状态clean。

此前网络失败、原生目录缺失的失败trace保留在ignored工程证据中，不覆盖为虚构成功。

## 3. 源码变化审计

[官方比较](https://github.com/DeepSeek-ai/deepseek-harness/compare/ca33fd6843b205e279c7ccb6cb73a472c78f5760...2e39e70496aa02986ca6a820c5d497e816b69d7e) 显示latest领先238commits。本地完整Git树比较有961变化路径；GitHub API返回的300文件列表被截断，未把它当完整集合。

本地独立比较官方src树对象：Agent `8300ce41…`、AgentLoop `646b1687…`、Session `542e2421…`、SystemPrompt `55a8796d…`、DeepSeek importer `a6b2e35d…` 在两个SHA完全相同；Storage/SessionQuery/compaction变化仅package版本，所查src未变。它们是本插件复用的核心seam，不代表全仓无变化。

实际client变化包括 [Connection recovery改为volatile同步Config](https://github.com/DeepSeek-ai/deepseek-harness/blob/2e39e70496aa02986ca6a820c5d497e816b69d7e/packages/client/connection/src/types.ts)、模块config-sync与 [Sidebar trailing slot](https://github.com/DeepSeek-ai/deepseek-harness/blob/2e39e70496aa02986ca6a820c5d497e816b69d7e/packages/client/ui-sidebar/src/client/contract/slots.ts)。当前launcher使用的 `sidebar.session.action` HOC仍在；新增trailing不是替代它。公开compareSource仅按项目imports检查入口，其stableSourceDiff报告Connection一项；更深client文件另做Git审计，不误称入口检查穷尽浏览器源码。

## 4. 测试补丁与发布门禁

已核实并精确升级 **Vitest / coverage-v8 / mocker4.1.12**，两项mockers moderate已从实际audit消失。新工具链的npm、stable/latest源码与手机矩阵分别重新实跑。V8后端coverage：83.36% statements、71.33% branches、90.09% functions、85.02% lines，UI排除。

生产audit仍 **0公告**；完整开发Host闭包剩 **1high / 1moderate**。Picomatch GHSA虽已withdrawn，registry audit仍报告high，4.0.8未发布；withdrawal不等于修复。MCP client2.2.0仍有moderate，rc.5 npm仍精确依赖它。详情见[第一方公告研究](../research/DEPENDENCY_ADVISORY_REVIEW.md)。原high门禁实际exit1，未降低阈值、未加ignore。

## 5. 复现与未验收

```bash
pnpm install --frozen-lockfile
node scripts/quality/clone-pinned.mjs
pnpm test
pnpm test:pinned
node scripts/upstream-compatibility.mjs
pnpm test:coverage
pnpm test:mobile
pnpm audit --prod --audit-level moderate
pnpm audit --audit-level high
```

实际工具链Node24.22.3/pnpm11.28.5/Vitest4.1.12。普通Node24以外规格不从这次结果推断。使用[公开配置](../../vitest.pinned.config.ts)与官方alias，native addon仍来自已安装官方模块，无Mock Session/Storage/Cordis。

真实AppZIP、live模型人设/剧情、Android/iOS OS交互、rc.5 npm/browser、云Actions/CodeQL、远端review/environment、RSS/跨进程/完整附件Session包继续单列。上一交付commit17d8ce9的安装包和校验和保持历史快照；本轮维护产物单独标记，不冒充公开release或整体MVP接受。

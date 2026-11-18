# 已发布 DSH rc.5 的独立消费验证

> 本文是初次依赖消费实验快照：runtime60/60、phone6/8。其后engine元数据修正的完整矩阵8/8及重复结果另见[消费跟进](PUBLISHED_RC5_FOLLOWUP.md)；原失败trace和结论不回写。

[English](PUBLISHED_RC5.en.md) · 准备与原身份 (local-only `.runtime/round-2/rc5-20261119-013341/preparation.json`) · 初次结果 (local-only `.runtime/round-2/rc5-20261119-013341/verification.json`)

## 1. 范围与身份

2026-11-19（Asia/Shanghai）从固定提交 `9d9405c8c96a5e3417c33fd75c182749d0817c38` 用 `git archive` 建立新的消费目录 (local-only `.test/consumers/rc5-20261119-013341`)；与主项目独立安装。只把消费 manifest 的46项 DSH dependency/peer/dev精确改为 `0.2.2-rc.5`。17个src、36个test、21个script文件均与归档原字节相同，无源码alias、Session/Storage/Cordis替代。

原manifest SHA256：`f92c90726a0e0e1f0f59379b53c4b86060c7cc43cc735322eaf2f2b100ac15a7`；原lock：`f99c286b1673be3dad8ecd8b74674372599f5e820ba64e8744341e3f376d2a7d`。按路径排序的src文件hash记录JSON再SHA256为 `326d9514c0208270ce6ab9beb0213632c8d14072d9dc17fcbb3fe670f538035b`；每文件hash在准备记录中。

## 2. 实际命令与结果

工具链：Node24.22.3、pnpm11.28.5、Vitest4.1.12、Playwright1.65.1、TypeScript6.0.3。顺序在消费cwd运行，原脚本和测试未改。

| 命令                                                       | exit / 实测                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| `pnpm install --no-frozen-lockfile --store-dir TASK_STORE` | 0；真实registry，747包，既有allowBuilds执行native生命周期   |
| `pnpm exec node ...`                                       | 0；实际Node24.22.3；更换store后pnpm重新安装亦成功           |
| `node node_modules/vitest/vitest.mjs run`                  | 0；**60/60、28文件**                                        |
| `node scripts/build.mjs`                                   | 0；实际Host/browser构建与声明输出                           |
| `node scripts/test-mobile.mjs`                             | 1；**6通过 /2失败**，完整CLIWeb两项失败；nativeSlot六项通过 |
| `pnpm audit --prod --audit-level moderate --json`          | 0；0公告                                                    |
| `pnpm audit --audit-level high --json`                     | 0；0high /1moderate，无ignore、阈值不变                     |
| `pnpm audit --audit-level moderate --json`                 | **1**；MCPclient2.2.0 / GHSA-6prh-2h8m-c8cw仍为moderate     |

审计观察为2026-11-19T02:05:26+08:00：highfeed已省略withdrawn picomatch，这不是已发布代码修复；完整moderate审计证据 (local-only `.runtime/round-2/rc5-20261119-013341/audit-moderate-receipt.json`)明确保留MCP公告与非零退出。

46directentries实际rc.5；329个installed DSH闭包package全为rc.5，无rc.4混入。版本清单 (local-only `.runtime/round-2/rc5-20261119-013341/installed-official-versions.json`)与manifest差异 (local-only `.runtime/round-2/rc5-20261119-013341/manifest.diff`)保留。npm自动在消费workspace加入330条rc.5release-age记录，既有allowBuilds/undici8.12.2/fflate0.8.3不变；不是审计豁免。

## 3. 完整 Web 的真实失败

初次双Host结果 (local-only `.test/consumers/rc5-20261119-013341/test-results/mobile-junit.xml`)与脱敏Hostlog (local-only `.runtime/round-2/rc5-20261119-013341/initial-mobile-hosts.log`)显示：完整官方CLI关闭 `dsh-continuity` 和 `fixture-model` 两个row，因消费manifest仍保留 `engines.dsh=0.2.2-rc.4`。390视口停在异步“开始使用”overlay阻挡sidebarclick；360视口已开导航但没有迁移launcher。它们不是完整导入流程通过。

实际已发布app-boot的 `evaluatePluginCompatibility` 返回 `{requirements:{"engines.dsh":"0.2.2-rc.4"},exempted:false}`；在内存把声明设为rc.5即可通过兼容评估，但这个内存检查不是完整Web验收。admission证据 (local-only `.runtime/round-2/rc5-20261119-013341/admission-diagnosis.json`)。实际API代码没有被改，未执行 `allow-version`。**完整CLIWeb验证结论为未通过**；消费engine修正后的矩阵未运行，本任务没有额外更改engine字段来掩盖初次失败，原trace完整保留。

## 4. 隔离与验收边界

手机两个视口390×844 /360×800，连接真实publishedCLIWeb和较小nativeSlotHost，ports53612/53613；没有3080。DSH_HOME、Documents、浏览器temp、npmcache/store均为任务/消费本地；真实credential/sourcealias变量已从子环境清理，日志token已redact，子Host结束。浏览器CLI `agent-browser` 未安装，使用既有真实PlaywrightCLI/Chromium而非安装替代客户端。

**这是rc.5依赖的源码消费变体，不是原rc.4安装包的rc.5兼容证明。** 原engine契约决定官方安装admission；metadata需要准确变更和单独完整Web验证。主项目stableca33fd/rc.4、core及canonical证据未由本任务改动，未commit。源码SHA `2e39e704…` 仅第一方参考，不充当本次npm运行结果。

模型IO仅合成固定adapter；真实AppZIP、live性格/关系/剧情质量、Android/iOSOSpicker/download、cloudActions、人类review、公开发布、压力窗口未验收。无付费模型、真实聊天/账号读取或公开写入。

## 5. 第一方与本地证据

- [已发布CLI manifest](https://registry.npmjs.org/%40deepseek-ai%2Fdsh/0.2.2-rc.5)、[importer](https://registry.npmjs.org/%40deepseek-ai%2Fdsh-deepseek-chat-import/0.2.2-rc.5)、[完整Webfrontend](https://registry.npmjs.org/%40deepseek-ai%2Fdsh-web-frontend/0.2.2-rc.5)。
- [官方兼容声明算法](https://github.com/DeepSeek-ai/deepseek-harness/blob/2e39e70496aa02986ca6a820c5d497e816b69d7e/packages/boot/app-boot/src/plugin-compatibility.ts#L55-L101)；实际已发布函数亦单独调用验证。
- 顺序执行退出记录 (local-only `.runtime/round-2/rc5-20261119-013341/steps.json`)、audit记录 (local-only `.runtime/round-2/rc5-20261119-013341/audit-steps.json`)、npmJUnit (local-only `.test/consumers/rc5-20261119-013341/test-results/junit.xml`)。浏览器failure截图/trace在消费 `.runtime/browser-results`，没有写共享根test-results/dist/mobile。

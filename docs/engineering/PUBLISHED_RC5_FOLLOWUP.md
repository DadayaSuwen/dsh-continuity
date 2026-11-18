# 已发布 rc5 consumer 跟进

[English](PUBLISHED_RC5_FOLLOWUP.en.md)

## 1. 范围与身份

完成时间：**2026-11-19T02:16:52+08:00（Asia/Shanghai）**。仅按 Lead 明确确认把隔离 consumer 的 `engines.dsh` 从精确 `0.2.2-rc.4` 改为精确 `0.2.2-rc.5`；46项 DSH dependencies/peers/dev 原已精确 rc5。本跟进未使用 `allow-version`，未改依赖/锁文件或原插件代码。

来源 commit：`9d9405c8c96a5e3417c33fd75c182749d0817c38`。74个 src/tests/scripts 文件逐字节核对零变化；源码 aggregate SHA256：`326d9514c0208270ce6ab9beb0213632c8d14072d9dc17fcbb3fe670f538035b`。撤销仅这一个 engine 字段即可恢复原 consumer manifest SHA `60fd48c6…`；新 manifest SHA `bf6fce64…`。

这是**已发布 npm rc5 源码变体 consumer**实验，不是原 rc4 安装包兼容验证。根 package/lock/src/workflows、稳定上游、3080及原研究者证据均未由本跟进修改；无提交。

## 2. 实际结果

| 检查                     | 结果与性质                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------- |
| 原 consumer npm runtime  | **60/60，28文件，exit0**；原研究者实际结果，本跟进未重跑                                |
| 原手机矩阵               | **6/8，exit1**；390启动对话竞态、360 launcher缺席；版本门禁禁用插件的原 trace 保留      |
| 新包装 A / B             | 各 **0测试启动、exit1**；Windows绝对ESM路径、直接CJS named-export包装问题，失败日志保留 |
| 新完整矩阵 C             | **8/8，exit0，23.3秒**；结束02:09:43+08                                                 |
| 全新 home 重复矩阵 D     | **8/8，exit0，22.9秒**；结束02:12:11+08                                                 |
| 本次 build / Node / pnpm | **exit0**；Node24.22.3、pnpm11.28.5、Playwright1.65.1、Vitest4.1.12                     |

C/D各覆盖390×844和360×800：完整官方 CLI Web真实launcher→ZIP→审核→新对话→followup→备份，以及较小 nativeSlot 的完整流程/坏文件/粘贴检查。不是把重复两轮计成16项产品验收。

**无 onboarding 逻辑修正、强制点击或 sleep 绕过。** 原390竞态两轮未复现，不宣称永久解决。复制测试差异仅consumer依赖import与截图输出位置。新包装显式使用consumer Playwright ESM入口，生成fixture的就近manifest设精确rc5，避免继承根rc4；未改官方CLI、插件或原测试。

## 3. 复现与证据

在项目根目录：

```bash
NODE="$PWD/.toolchain/node-v24.22.3-win-x64/node.exe"
"$NODE" .runtime/round-2/rc5-followup-20261119-015454/run.mjs attempt-d
"$NODE" .runtime/round-2/rc5-followup-20261119-015454/verify.mjs
```

runner内部consumer-only `node scripts/build.mjs`，再执行新包装的 `test-mobile.mjs --config playwright.config.ts`；两个步骤exit0。显式Chromium1228路径在wrapper记录，`PNPM_SCRIPT`固定根toolchain11.28.5；子环境移除凭据/源码alias，HOME/DSH/Document/TEMP全部项目隔离。

```text
.test/consumers/rc5-20261119-013341/package.json
.runtime/round-2/rc5-20261119-013341/03-npm-runtime.log
.runtime/round-2/rc5-20261119-013341/05-full-mobile.log
.runtime/round-2/rc5-followup-20261119-015454/verification.json
.runtime/round-2/rc5-followup-20261119-015454/steps-attempt-{c,d}.json
.runtime/round-2/rc5-followup-20261119-015454/03-mobile-attempt-{a,b,c,d}.log
.runtime/round-2/rc5-followup-20261119-015454/full-web.spec.ts.diff
.runtime/round-2/rc5-followup-20261119-015454/attempt-{c,d}/mobile-junit.xml
.runtime/round-2/rc5-followup-20261119-015454/attempt-{c,d}/mobile-hosts.log
.runtime/round-2/rc5-followup-20261119-015454/attempt-{c,d}/children.json
.runtime/round-2/rc5-followup-20261119-015454/attempt-d/full-official-mobile-{390x844,360x800}.png
```

验证exit0；Host日志token已脱敏，版本禁用记录消失。C/D四个Host均SIGTERM并等待close、PID实查已退出；本跟进后台job全收集。

## 4. 剩余边界

consumer MCP client仍**2.2.0**，其rc5依赖图与锁文件未变。原独立audit：production0公告；完整开发0high/1moderate（MCP），本跟进未重跑audit或修MCP。真实App导出、liveLLM质量、Android/iOS实机、公开release仍未验收。仅外部modelIO为合成fixture；无付费/真实数据/账户操作。原研究者报告及失败证据独立保留。

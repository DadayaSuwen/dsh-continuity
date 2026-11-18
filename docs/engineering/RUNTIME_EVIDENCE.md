# Runtime evidence / 运行证据

## Baseline

- Official [`master` SHA ca33fd6843b205e279c7ccb6cb73a472c78f5760](https://github.com/DeepSeek-ai/deepseek-harness/tree/ca33fd6843b205e279c7ccb6cb73a472c78f5760)，commit 2026-11-17T22:17:01+08:00，version **0.2.2-rc.4**；只读clone保持clean。
- Isolated **Node24.22.3 win-x64 / pnpm11.28.5**。Node archive校验和来自nodejs.org；PATH与子生命周期明确固定24，不沿用主机默认22。
- npm同版本与Git部分源码不同：实际使用接口9DIFF，entry比较31包/16DIFF。两个真实runtime路径各自测试，不用版本相等证明SHA。
- 项目本地bootstrap commit `7db7a28`，固定点`5082575`；[双轴审查](CODE_REVIEW.md)发现已独立复现/修复。后续最终代码与tarball须再记录。

## Maintenance round4 — source archive consumer

- [源包验证](SOURCE_ARCHIVE.md) /[English](SOURCE_ARCHIVE.en.md)：原ed431c5交付ZIP在C盘true-noGit目录frozeninstall/build通过，中断/资源测试因强制rev-parse HEAD失败。早期C盘offlinecache缺包是环境失败；选择已锁定D盘store完成实际安装后才复现代码问题。各失败记录保留。
- 最小optionalcheckoutCommit只给ordinaryharness.metadata；本目录.git+真实top/fullSHA才记录，否则null，code/dist/worker摘要不删。祖先checkout身份与损坏gitdir有publicself-test，审批/tracksecret/officialpinnedGitgates原样保留。
- stagedtreecandidate ZIP freshfrozen747依赖/build/publicselftest/60runtime/9hardstop/16resource/pack-nativeLoader60Markdown689localtargets通过。没有复用node_modules、Gitinit或真实数据，candidate与finalexactZIP不能互换，最终交付独立报告记录exacthash。
- 本轮stableca33fd/latest2e39e704各60/60、phone完整Web/Slot8/8（21.9s）、MCP5真实probe通过；生产代码/lock均无diff。registryaudit原命令和一次15s无自动重试刷新均fetchfailed，prod未给出公告数据、dev/high未执行完成；round3最近0snapshot保留但不作为本轮freshpass。
- `test:packed`提供portablepnpmcontext，`test:source`复验可信项目源码archive；双语文档补installedtooling/buildfirst和历史private.toolchain区分。CIcurrentHEAD archive调用同publicconsumer，Linux/cloud尚未执行。

## Maintenance round3 — 2026-11-19 03:05 CST

- [导入中断验证](IMPORT_INTERRUPTION.md) /[English](IMPORT_INTERRUPTION.en.md):九种源保存/取消/计划ID/partialflush/fullflush/close/workspaceattach/importreceipt/挂接错误条件，实际测试进程exit73，freshprocess验证exit0。原件精确、完整SessionID复用、成员/绑定恢复；partial明确报错无覆盖，非OS断电/全事务验收。
- [有界资源观察](RESOURCE_MEASUREMENTS.md) /[English](RESOURCE_MEASUREMENTS.en.md):8种case×2=16freshchild，1/8/32MiBstored/deflate合成二进制。32MiBpreviewstored430–494ms/deflate549–554ms，whole-childpeak约165–181MiB，含模块/fixture，非插件净值。
- 已知8MiB−1entrylimit在5.90–6.58ms拒绝；32MiB异步inflatepending在途取消后128.89–141.19ms才观察AbortError。没有预先aborted替代、没有宣称立即中断同步JSON/CRC。
- 生产代码/官方clone不改；新增测试脚本、typedworker、双语说明和已有E2E顺序执行命令。Vitest计数仍60；9checkpoint和8resourcecase各自报告。默认128/512/64MiB峰值、跨Host、复杂JSON/附件/断电窗口仍未测。
- 本轮npm/stable/latest2e39e704各60/60、28文件实际重跑；MCP5checks、production/dev0公告、原highgateexit0。manifest只增加scripts，frozen/offlineinstall通过、lock无diff。
- 首次手机尝试缺Playwright1.65.1的chromium1255/headlessshell，8个启动error、未进入UI，失败JUnit单独保留。使用officialinstall把exactrevision装到project.toolchain，明确PLAYWRIGHT_BROWSERS_PATH后完整官方Web/Slot重跑8/8（21.2s）；浏览器/界面测试源代码没有改动，也没有静默换浏览器来掩盖环境。

## Maintenance round2 — 2026-11-19 01:55 CST

- [公共MCPprobe回归](MCP_TRANSPORT.md)2.2.0先红：307转发5次合成header及541正文bytes，302转发2header；项目SDK2.3.0override后目标0请求，5checks通过。直连/同源HTTP及stdio真实运行未变。
- 生产/全量dev audit0，原highgateexit0。MCP是代码修复；picomatch4.0.7是withdrawnfeed更新而非patch。无ignore/降阈值，用户HostSDK不自动改变。
- npmrc4/stableca33fd各60/60，phone8/8；并行install期间容量fixture曾30s超时，单项和单worker完整suite通过，负载消退后默认并发60/60。timeout、测试内容与官方Storage未改变；失败trace保留。
- 最新2e39e704源码在新依赖图60/60。rc5已发布npm消费实验独立执行，engine metadata不匹配的初始Web失败单列，不用sourcegreen代替完整consumer证据。
- 实际工具Node24.22.3/pnpm11.28.5/Vitest4.1.12；[MCP测试脚本](../../scripts/check-mcp-transport.mjs)与SecurityCI使用同一入口。
- 已发布rc5sourceconsumer：实际46direct/329DSH包均rc5、npm60/60；仅consumer engine匹配rc5后完整phone8/8并freshhome重复8/8。原6/8及wrapper0测试失败保留，源代码/原测试未改，不宣称原rc4installer兼容。见[初次实验](PUBLISHED_RC5.md) /[跟进](PUBLISHED_RC5_FOLLOWUP.md)。
- 真实packed消费assert复现缺CODE_OF_CONDUCT和锁文件链接；补齐治理文本、明确源码ZIP含lock、私有证据路径改local-only标签后，所有随包Markdown本地targets检查与nativeLoader通过。源码check和packedcheck各自统计；无runtime/credentials/试验homes打包。

## Maintenance round — 2026-11-19 01:11 CST (round1 snapshot)

- Node24.22.3/pnpm11.28.5，Vitest与coverage4.1.12精确patch。npm0.2.2-rc.4、stableca33fd与latest2e39e704三个轨道均60/60 across28files；phone npmrc4矩阵8/8重跑。
- Publiclatestprobe从freshclone→packages/vendor/native/system→真实test-pinned，exit0、stablePinUnchanged=true。原22suite缺native tsconfig加载失败与旧网络失败保留trace；补齐官方source而非改转换器。
- 当前生产audit0，开发1high/1moderate，原highgateexit1；Vitest两项moderate已实际消除。Picomatchwithdrawn但registry仍报high，不作为修复；MCPclient待验证升级。
- docs checker现排除generatedartifacts，公共self-test先红后绿；生成坏链接不影响源码合约。详见[中文补充](UPSTREAM_LATEST.md) /[English](UPSTREAM_LATEST.en.md)和[第一方公告研究](../research/DEPENDENCY_ADVISORY_REVIEW.md)。
- 本轮V8后端statements83.36/branches71.33/functions90.09/lines85.02%，UIexcluded。原00:17表与初次交付校验和是历史记录，不替代本轮快照。

## Executed — 2026-11-19 00:17 CST (initial delivery snapshot)

| Check                        | Actual command/result                                                               | Evidence and ceiling                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Strict TypeScript            | `node node_modules/typescript/bin/tsc --noEmit`，**通过**                           | 官方published严格声明                                                                                                                                        |
| ESLint/Prettier              | `eslint .` / `prettier --check .`，**通过**                                         | 最终本仓文件；upstream/ignored data不被格式化                                                                                                                |
| Published npm runtime        | `node node_modules/vitest/vitest.mjs run`，**60/60，28files**                       | 真实Cordis/StorageJson/Domain/JSONL/SessionQuery/Workspace/Connection/AgentLoop/BasicCompaction/TokenMeter，模型IO scripted                                  |
| Exact SHA runtime            | `node scripts/test-pinned.mjs`，**60/60，28files**                                  | official+vendor源aliases、标准decorator转换，Node v24.22.3记录到结果JSON                                                                                     |
| Hostile ZIP/JSON             | runtime内 **16/16**                                                                 | 路径、CRC、重复、压缩比、大小、版本、严格UTF8/JSON、取消；不是任意文件形式全覆盖                                                                             |
| Labelled continuity          | runtime内 **14/14**                                                                 | 人设/剧情/归属/预算/有效期/冲突固定检索案例；不是liveLLM质量                                                                                                 |
| Lifecycle regressions        | runtime内通过                                                                       | 编辑重提取/删除墓碑/老包恢复、并发绑定、容量写前校验及重启、session范围、模型route switch、历史失败后成功续聊、officialcompaction后context修改/删除/未变去重 |
| Official CLI/plugin manager  | `dsh --help` / `dsh web --help` / isolated `dsh plugin --profile web add`，通过     | 正式独立bundle配置；未改生产profile                                                                                                                          |
| Mobile full matrix           | `node scripts/test-mobile.mjs`，**8/8**                                             | 390×844、360×800，每视口fullofficialCLIWeb和nativeSlot真实Host；ZIP→review→new→followup→backup、坏ZIP/粘贴/暂存、launch                                      |
| Full official mobile UI      | matrix内两项通过                                                                    | 官方完整Web shell、nativeplugin模块、Portal与样式、异步Workspace；小rootSlot页面不是fullWeb，但分别有证据                                                    |
| Build/pack/isolated Loader   | `node scripts/packed-smoke.mjs`，最近通过                                           | freshbuild→pack→独立consumer57包→原生host/clientexports→officialLoader entry；Host依赖故意缺席时Fiber pending不冒充activation                                |
| Production registry audit    | `pnpm audit --prod --audit-level high`                                              | 0high/critical，0moderate；生产与开发闭包分开                                                                                                                |
| Full development audit       | `pnpm audit --audit-level high`                                                     | undici8.12.2修复后1high/3moderate；picomatch4.0.7暂无发布fix，gate保留失败                                                                                   |
| Default tracked secret check | `node scripts/check-secrets.mjs`，**135texts/0findings**（bootstrap）               | 1明确合成fixture排除；不扫描Git历史/所有credential形式，最终重跑                                                                                             |
| License closure              | `node scripts/check-licenses.mjs`，**64真实manifests/0errors**                      | 当前runtime/required-peer/installed-optional闭包，非假dev平表                                                                                                |
| Documentation contracts      | `node scripts/check-docs.mjs`，**47 Markdown / 572本地链接 / 8 workflows，0errors** | 固定本地链接/脚本/配置/权限合约，不声称外链全部可用                                                                                                          |
| Latest official source       | 三次clone失败                                                                       | 只读ls-remote观察2e39e70496aa02986ca6a820c5d497e816b69d7e；ETIMEDOUT/reset，latestAPI/runtime未测，stablePinUnchanged                                        |

## Coverage

`node node_modules/vitest/vitest.mjs run --coverage` 实际60/60通过。V8后端：statements83.36%、branches71.33%、functions90.09%、lines85.01%；排除UI，包含低coverage的export-only入口，不声称完整代码或手机100%覆盖。原JSON/lcov在生成目录，下载报告以此范围为准。

## Reproduction

在项目目录使用隔离PATH，不改全局环境：

```bash
export PATH="$PWD/.toolchain/node-v24.22.3-win-x64:$PWD/.toolchain/pnpm/node_modules/.bin:$PATH"
node scripts/quality/self-test.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node node_modules/vitest/vitest.mjs run
node scripts/test-pinned.mjs
# CI安装标准Chromium；本机existing浏览器路径仅显式env fallback：
CONTINUITY_BROWSER_PATH="C:/Users/Dadaya/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe" node scripts/test-mobile.mjs
node scripts/packed-smoke.mjs
node scripts/check-docs.mjs
node scripts/check-licenses.mjs
node scripts/check-secrets.mjs
node scripts/check-compatibility.mjs
```

Result files在ignored `test-results/`；手机失败attachments在ignored `.runtime/browser-results/`，避免Playwright清除其他证据。Phone runner使用两个ephemeralport/isolatehome与project-localDocuments，Host logs token redacted；截图按实际viewport命名。最终tarball有独立SHA256/Loader证据，文档更新后旧tarball需重pack。

## Boundaries / 未测与未执行

没有读取真实用户聊天或API key，没有paid模型调用。ScriptedModel仅证明运行接线与选中资料，不证明跨模型性格自然语言质量。真实App ZIP、Android/iOSpicker/download/softkeyboard、proxytransportprefix、压力/长故障窗口仍待单独验收。

没有push仓库、npm publish、GitHubRelease、cloudActions/CodeQL、remotebranch/environment设置或AI自批准。发布准备新增highauditgate，已知high不通过就不宣布可公开发布。Project Mission整体MVP仍open；详见[兼容文档](COMPATIBILITY.md)、[进度](PROGRESS.md)和[已知问题](KNOWN_ISSUES.md)。

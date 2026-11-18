# 有界资源测量

[English](RESOURCE_MEASUREMENTS.en.md) · [公共入口](../../src/index.ts) · [测量脚本](../../scripts/measure-resources.mjs)

## 1. 基准与执行

最终确认于 **2026-11-19 02:57:00–02:57:21（Asia/Shanghai）** 执行，命令 **exit0**：

```bash
# Git Bash，项目根目录；仅固定本次工具链PATH
export PATH="$PWD/.toolchain/node-v24.22.3-win-x64:$PATH"
node.exe scripts/measure-resources.mjs --repeat=2
```

历史测量命令依赖原始开发机的私有 `.toolchain`。普通源码 ZIP 使用已安装 Node24/pnpm11，在内层包根执行以下步骤；新的 runner 无 Git 时记录 `sourceCommit:null`，保留真实代码/构建 hash：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test:resources -- --repeat=2
```

这是 **8种有界场景 × 2轮 = 16个独立子进程观察**，不是16项新增Vitest或产品性能验收。先导单轮和中间确认也保留；本文表格只引用最终脚本确认轮，不混用结果。

- 当前生产源码基准commit `ca1b65ce04b11b2d76557e60bd30d3572f69348f`，Node **24.22.3 win-x64**，fflate **0.8.3**。
- 只读取既有 `dist/index.js`，**922,979 bytes**，SHA256 `691a67a713c3dd5a7ca1268d7cb2bd4a63f9a4ea461e90d1eded1dd8c82cea06`；每个子进程执行前后及全轮结束核对，无重建或修改。
- 最终测量脚本SHA256 `cc5e289a29a55d98553eadecfee0d69227246610367c33f58f57dd4e29180eb5`；[合成companion fixture](../../tests/fixtures/companion.ts) SHA256 `6717de4cf4714509c16bc830665e96c19a848ae3661f902ad318f86d9a904eae`。
- 实际环境：Windows `10.0.19045`、AMD Ryzen5 4600H、12逻辑CPU、物理内存 **15.42 GiB**，开始可用 **3.54 GiB**；`UV_THREADPOOL_SIZE` 未设（默认）。不是空闲专用基准机。

原JSON/阶段JSONL/退出状态位于本机生成目录，未作为安装包链接：`.runtime/round-3/resource-S7Llaw/`。每次运行建立新目录；先导记录在其他 `resource-*` 目录。没有账户、token、真实聊天或Host路径数据。

## 2. 合成负载与测量方法

用既有fflate生成stored(method0)和deflate(method8、level6) ZIP；固定seed xorshift32产生 **1/8/32 MiB**近不可压缩二进制条目，放在小型官方v3五消息companion之前。payload展开/压缩比约 **1.000 / 0.999797**，低于默认200。每个ZIP包含1322bytes实际聊天/元数据；这不是32MiB长篇小说、真实App附件或图片解析测量。公共[MessageSchema](../../src/model.ts)每文本8MiB上限没有被放宽。

真正调用既有built `previewImport(bytes, filename, {}, signal)`；官方格式解析/转换及[ZIP预检](../../src/security/archive.ts)不替代、不Mock。每次断言1个supported来源对话、5条消息、id `c1`、默认branch `4`、固定首条原句、conversation和整个ZIP SHA256，且输入字节不变。此入口只预览，未调用Storage/Session/commit。

一个case一个新Node子进程，**并发1**。分别记录导入完成、fixture创建、preview开始/结束、abort请求；wall time用performance、CPU用process.resourceUsage差值（微秒换毫秒）。CPU是整个测量进程的该阶段统计，含JIT/多线程与采样开销，可能高于wall time；不是单线程百分比。

preview RSS使用 **15ms JS timer + 开始/结束快照**；另记OS `resourceUsage.maxRSS`（KiB×1024），**含模块导入、fixture创建、预览及结果前校验**，不是插件净增内存。未强制GC。超时watchdog120s只用于终止失控子进程，失败/timedOut/非零exit显式记录，不作为性能通过阈值；本次无超时。

## 3. 实际测量

以下是最终两轮的min–max；MiB=1048576bytes。RSS峰值是上述whole-child观测，不是配置承诺。

| payload / ZIP方法 |  ZIP bytes |  fixture创建 ms | preview wall ms | preview CPU user/system ms | preview前 RSS MiB | preview采样/快照峰 MiB | OS whole-child maxRSS MiB |
| ----------------- | ---------: | --------------: | --------------: | -------------------------- | ----------------: | ---------------------: | ------------------------: |
| 1MiB stored       |  1,050,384 |     10.80–13.22 |     34.15–36.99 | 63–78 / 0                  |       70.29–70.89 |            77.89–79.18 |               78.91–80.20 |
| 1MiB deflate      |  1,049,904 |     85.09–91.11 |     35.61–46.61 | 16–63 / 0–16               |       77.04–77.33 |            83.38–83.51 |               84.29–84.42 |
| 8MiB stored       |  8,390,416 |     40.44–40.57 |   119.61–132.69 | 110–125 / 16               |       85.46–85.52 |            98.63–98.76 |               99.64–99.78 |
| 8MiB deflate      |  8,391,421 |   437.10–457.54 |   151.26–156.59 | 140–188 / 15–16            |     110.15–110.54 |          126.55–127.42 |             127.44–128.31 |
| 32MiB stored      | 33,556,240 |   127.40–135.24 |   430.14–494.22 | 406–547 / 0–15             |     132.63–133.36 |          138.33–139.34 |             164.87–165.77 |
| 32MiB deflate     | 33,562,345 | 1676.91–2028.73 |   549.23–554.21 | 625–719 / 31–47            |     171.82–172.12 |          180.21–180.25 |             181.11–181.15 |

stored六次确认观察的timer样本均 **0**：同步复制/CRC等工作和随后microtask期间，timer没有机会执行；开始/结束快照不代表真实途中峰值。32MiB stored尤其明显，OS峰约165MiB而快照峰约139MiB。deflate的timer分别1、3、10次，仍会漏掉回调后同步JSON/CRC峰。

fixture创建和压缩时间 **不算preview时间**；其缓冲区/JIT/GC历史却在同一child中影响RSS，不能把该表外推为Host容量规划。二次重复是范围观察，不是p95/p99、最大压力或普适性能保证。

## 4. 限额与在途取消

| 场景                                 | 独立断言与结果                                                                                     | 最终两轮实测                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 已知8MiB条目，`maxEntryBytes=8MiB−1` | 公共预览返回`ImportError.code=too-large`，没有preview结果、没有耐久调用                            | 5.90–6.58ms；whole-child86.48–87.08MiB                                         |
| 32MiB deflate pending时abort         | signal初始未abort；定时回调发生时promise仍pending；最终`AbortError`、无preview结果，输入digest不变 | abort在调用后24.34–26.14ms；其后128.89–141.19ms才观察到拒绝；总153.23–167.33ms |

取消timer设为5ms，但先经过约19.64–21.27ms同步入口，因此5ms **不是实际取消到达时间**。payload是首个大条目，观察发生在异步inflate等待期间；[实现](../../src/security/archive.ts)在await后检查signal，未将signal交给zlib。abort后工作继续至回调，既不宣称立即中断inflate，也不宣称interrupt同步JSON/CRC。所有sample/abort/watchdog定时器均清理，各child等待close；全部测量job已收集。

## 5. 验收边界

本轮证明当前built入口对这些合成输入的来源/限额/取消行为和实际观测数据，**未验证默认128MiB上传、512MiB展开、64MiB单条目峰值**。没有随意通过阈值、没有修改limit或生产代码。未覆盖高压缩率边界、复杂消息树、大文本/大量节点、持久化峰值、Session/附件迁移、并发Host、低内存机器、Linux/macOS、真实AppZIP、live模型质量或Android/iOSOS体验。

本文保留02:57的同一测量表。随后公开命令`pnpm test:resources -- --repeat=2`在03:27再次16child通过，原ZIP/parserhash相同；local-only `resource-xXFuVz` 的32MiBwhole-child峰约169MiB/184MiB，stored417–451ms、deflate542–596ms，说明重复运行环境/RSS会变，前表181MiB不是容量上限。该确认与03:05/03:27两个9checkpoint中断结果分别保存。

生成证据和fixture只在本机新建 `resource-*` 中；安装包只提供脚本和本文，独立源码ZIP保留项目锁文件。整体MVP仍待用户数据/模型/实机验收，本测量不替代它。

# 无 Git 源码包消费验证

[English](SOURCE_ARCHIVE.en.md) · [公开消费者脚本](../../scripts/source-smoke.mjs) · [测试指南](TESTING.md) · [来源标识](../../scripts/quality/common.mjs)

## 1. 实际复现

round4以已交付ed431c5源码ZIP为输入，校验SHA256 `f9a62cf5d4d154622639d38dfa086147cdb5d9065fafd6321e0ebd85e2256d9f`。它含锁文件、源码和脚本，正常不含Git、已安装依赖、工具链或dist。新的C盘temp消费者确实位于任何Git仓库之外；冻结安装和build完成后，test:interruption与test:resources均因`git rev-parse HEAD`非零退出。

首次离线安装先失败，是C盘默认store缺包而D盘projectstore已有锁定依赖。记录明确区分：不是源码bug，没有改锁、忽略校验或复制node_modules。显式选择已有store后全量安装通过，Git依赖问题才被真实复现。随后publicsource-smoke对原ZIP再次红：安装/build/selftest/runtime60通过，到中断metadata仍报错；旧包/失败trace完整保留。

## 2. 最小修复

只有两个普通工程观测runner使用可选[checkoutCommit](../../scripts/quality/common.mjs)：本目录有.git、实际show-toplevel相同、fullSHA正确才记录commit；否则null。不会继承外层仓库身份，不把ZIP文件名、ZIPcomment、上游COMPATIBILITY SHA当插件sourceCommit。harness/worker/dist及归档hash独立保留。输入/存储/官方Session转换未改。

公共qualityselftest包含ancestorcheckout内无.git子目录和损坏gitdir两个null例子，并在真正checkout存在时检查fullSHA。先执行新测试失败，再实现共享helper。trackedsecret扫描、官方pinned源码SHA、审批/发布脚本仍保留原本Git前提，不改成宽松fallback。

## 3. 真实消费结果

仅四个最小scriptfix应用到原C盘消费目录后，中断9节点、resource8×2观察均通过，sourceCommit都为null。之后从stagedtree生成全新candidate ZIP，而非复用旧node_modules：

| 路径               | 实際结果                                                          |
| ------------------ | ----------------------------------------------------------------- |
| frozenlock install | 747包，锁不改                                                     |
| productionbuild    | 真实host/browser产物生成                                          |
| qualityselftest    | 文档/许可规则/来源metadata/风险与审批回归通过                     |
| 官方npmruntime     | 60/60，真实Cordis/Storage/Session/Query/AgentLoop                 |
| 导入中断           | 9节点实际退出73→新进程0，sourceCommit:null                        |
| resource           | 8场景×2=16child通过，sourceCommit:null，非RSS容量验收             |
| packedLoader       | actualpack→57官方peer消费→host/client/Loader与689localtargets通过 |

candidate SHA256 `dac6f174cbce0a806d476aab0f7e8af369faf39fadf6760264c8af143a8b390d`，554146bytes，04:10–04:12+08实测。该候选不是最终commit源码ZIP；最后交付必须从最终commit重新archive并完整复跑，报告绑定新ZIP摘要。

## 4. 复现与CI

使用独立安装Node24.22.3/pnpm11.28.5，从源码ZIP内层包根目录：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test:interruption
pnpm test:resources -- --repeat=2
pnpm test:packed
# 另一个可信本项目生成的SOURCE_ZIP：
pnpm test:source -- SOURCE_ZIP
```

test:source是开发者对可信项目源码的验证，不是聊天文件上传或不可信代码执行服务。输入上限16MiB/32MiB展开/1000条目/4MiB每条，固定prefix与路径检查；临时目录新建且不初始化Git，子环境清除credential/DSH/Git覆盖并给独立HOME/npm配置，先冻结安装再跑公开命令。只从packageManager上下文取得pnpmJS入口，避免Windows普通ZIP依赖私有.toolchain。日志不携带真实Host/聊天token，测试目录保留供调查。

E2E工作流从当前HEAD生成source-ciZIP，然后调用同一public命令；云端Linux执行仍未验证。所有旧rawtrace使用本机生成路径标签，不作为随包下载链接。

## 5. 验收边界

源码ZIP复验只证明这些真实安装/构建/合成回归路径可重现。没有新增格式/数据库、宽化rc4engine、公共发布或收费模型。它不取代真实App导出、live人设/关系/剧情、Android/iOSOS、全Session附件恢复、默认最大资源和断电窗口验收。普通archivecommit为null是诚实缺失元数据，不代表签名来源认证。

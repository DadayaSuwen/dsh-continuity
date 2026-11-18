# 固定点双轴审查 / Two-axis code review

比较：`git diff 5082575b57b8662fa451f7688497afd513f874ab...7db7a28`。基线为空的本地 bootstrap；被审查 commit 为 `7db7a28335942b6fe692691dcf1a8ef9ccac65f4`。两轴独立并行、只读审查，不互相合并评分。以下是该快照的发现，而不是修复后版本的成功声明。

## Standards

文档依据：[CONTRIBUTING](../../CONTRIBUTING.md)、[领域词汇](../../CONTEXT.md)、[ADR 0002](../adr/0002-scoped-reviewed-memory.md)、[决策](DECISIONS.md)、[安全工程](SECURITY.md)。

| 快照发现                                      | 违反的项目约定                             | 当前处理与独立回归                                                                                                                 |
| --------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 首次并发绑定先读后await后覆盖                 | 显式Session归属隔离                        | 整个check/stat/put串行；[绑定并发测试](../../tests/e2e/runtime/binding-concurrency.test.ts)先红后绿                                |
| 恢复只哈希raw，却信任独立preview和source_kind | 原始出处、不可信备份、助手故事不是用户事实 | 从raw重预览 + 原role/证据类型校验；[恢复证据测试](../../tests/integration/package-evidence.test.ts)两种攻击先红后绿                |
| 分区超schema限额仍耐久化，重启失败            | 输入与存储生命周期校验                     | 统一domain更新seam，写前全schema/归属/唯一ID；[容量与重启测试](../../tests/integration/partition-capacity.test.ts)两种上限先红后绿 |
| 编辑改变fingerprint却保留ID，重提取插同ID     | 可编辑且唯一的记忆生命周期                 | 稳定ID+指纹去重；[编辑重提取测试](../../tests/integration/memory-reextract.test.ts)先红后绿                                        |

判断性启发式：**possible Duplicated Code**，Memory与package各自初始化空分区并维护写链。已经集中到[官方domain共享写入seam](../../src/storage.ts)；它不是额外数据库或自动通过规则。

本轴：**4项文档硬问题 + 1项启发式**。快照内最严重的问题为绑定身份与不可信来源失真，均需行为回归而非单看格式。

## Spec

依据：[产品需求](../product/PRD.en.md)、[用户流程](../product/USER_FLOWS.en.md)；没有公开Issue tracker，来源见[本地审查约定](../agents/issue-tracker.md)。

| 快照发现                                           | 原需求                        | 当前处理                                                                                                                                 |
| -------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 删source后导出成功、恢复missing-source             | 能独立备份恢复来源/记忆资产   | 明确omitted_source_ids，残留引文降为unknown待审核；[缺源备份测试](../../tests/integration/package-missing-source.test.ts)                |
| alternate leaf提交后提取默认灯塔剧情               | 当前剧情优先、选择不混分支    | UI/路由/Memory显式同leaf；[分支回归](../../tests/integration/branch-extraction.test.ts)                                                  |
| checksum正确的assistant→user/伪造preview           | 助手虚构不升格真人事实        | raw→preview重新校验、原说话者检查；[来源回归](../../tests/integration/package-evidence.test.ts)                                          |
| 并发A/B首次bind都成功                              | Session绑定精确归属           | 串行首次绑定；[并发回归](../../tests/e2e/runtime/binding-concurrency.test.ts)                                                            |
| followup搜全部历史error，新成功也失败              | 继续既有会话与真实生命周期    | 只看本次新增事件；[失败后续聊回归](../../tests/integration/followup-retry.test.ts)                                                       |
| 空base没有新risk-review脚本，首PR MODULE_NOT_FOUND | 初始化CI + 可信base人工review | 保持closed/trusted-base；人类先审查bootstrap、在main放入可信gate后才开required状态；[流程前提](BRANCH_PROTECTION.md)，本地无远端PR可执行 |

没有建立无关scope creep。本轴：**6项需求发现**；最严重的正确性问题为来源与身份隔离，bootstrap治理是部署前提而非允许PR执行自己审批脚本的理由。

## 修复证据与结论 / Evidence and disposition

截至2026-11-18 23:30 CST，Node24.22.3下两条真实运行路径各**60/60**，手机两个视口**8/8**。新增模型选择、session-scope映射、编辑删除墓碑、老包恢复和官方compaction上下文回归分别有实际运行证据；[运行记录](RUNTIME_EVIDENCE.md)与[进度](PROGRESS.md)由最终门禁更新。

这不是人类GitHub review或MVP验收：真实App ZIP、真实模型质量、云端Actions、branch/environment设置、公开发布仍单列。审查者没有修改代码、没有运行远端操作，也没有宣称完整runtime测试通过；Lead独立复现并测试修复。

## Maintenance round3 — fixedca1b65c working-tree review

比较`git diff ca1b65ce04b11b2d76557e60bd30d3572f69348f`和七个尚未staged的新scripts/worker/双语文档。此时HEAD等于基线，three-dotcommitdiff为空；两轴明确审当前workingtree，不把空diff冒充审查。源目录/官方clone/lock不改，范围为publicharness、CI命令和说明。

### Standards

依据CONTRIBUTING27/31、DECISIONS53–63、TESTING证据纪律和ARCHITECTURE。独立read-only reviewer0c7bd7cb确认 **0文档硬违反 + 1启发式**。真实Migration/preview、Storage/Session/Workspace未被替代；七个直接hardstop与已完成取消drain分列；RSSwholechild/零timer采样/在途abort延迟/默认上限未测如实写明。

**possible Duplicated Code**：[中断runner](../../scripts/check-import-interruption.mjs)与[resource runner](../../scripts/measure-resources.mjs)各自spawn/stdout/stderr/watchdog/close。当前异常结算不同，controlledworkers已实际close；依最小化约定暂不引入泛用runner，下一次同类lifecycle修复再集中共享shape。判断性建议，不是现有故障。

### Spec

依据PRD21/23的durable重复协调、honestpartial和原events不改；reviewer8affcf66确认无实质scopecreep/运行实现缺陷。**1个轻微复现性问题**：PRD27要求可复现CI，初稿CI只调用test:resources默认1次，文档范围是8×2。Lead将CI命令加`-- --repeat=2`，公开同样pnpm命令实际验证，不以一次CI观察等价两次minmax。

本轮双轴：Standards0hard+1heuristic，最差为条件性spawn重复；Spec1minor，最差为重复参数缺失，已修正。报告彼此不合并或重新排名。两reviewer只读、无代码改动/paid/publiccalls；MVP和云端人类审批仍未接受。

## Maintenance round4 — fixeded431c5 source archive review

固定点ed431c5c5d9b9fdcc1d2a3a234bccff4580b506b；审`git diff fixed`当前staged+unstaged和新增source-smoke/SOURCE_ARCHIVE双语文本。HEAD当时仍等于fixed，非空workingtree才是范围，不以空commitdiff为审查。实际旧ZIP无Git先红，candidate新ZIP install/build/60runtime/9checkpoint/16resources/Loader通过。

### Standards

独立reviewered770aa6确认0hard、0具体heuristic。ownroot.git与真实top/fullSHA集中在common.checkoutCommit，两个harness复用；公开selftest测无Git祖先子目录、损坏gitdir和真checkout。source-smoke限额/路径/新wx目录/隔离environment/真实frozeninstall与nonemptytests符合CONTRIBUTING27/31；只是可信developerarchive，不引入未知代码运行服务。正式src、锁、审核/发布和官方pinnedGit门均不改。

### Spec

PRD21/23/27/42的真实持久化/可复现工程/保留验收边界：readonlyreviewerbef39e18确认0新增实质问题。ordinaryarchivecommit=null与代码hash并列，不冒认ancestorGit或upstreamSHA；CIcurrentHEAD ZIP和同publictest:source接线、installedtooling/先build文档与真实消费者一致。最终commit ZIP精确摘要复测仍是既定交付步骤，候选不是最终证据。

两轴只读未运行测试；本轮Standards0hard/0heuristic，Spec0findings，无单轴最差故障。结论分列，不合并评分；MVP真人App/live/OS与云端approval仍未完成。

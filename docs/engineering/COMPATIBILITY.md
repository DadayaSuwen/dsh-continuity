# 兼容性合约 / Compatibility contract

[机器元数据](../../COMPATIBILITY.json) · [运行证据](RUNTIME_EVIDENCE.md) · [官方源码审计](../research/DEEPSEEK_IMPORT_AUDIT.md) · [English summary](../research/DEEPSEEK_IMPORT_AUDIT.en.md)

## Tested baseline

| 项目 / Item         | 固定值 / Pin                             | 实际证据 / Actual evidence                                 |
| ------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| Official repository | DeepSeek-ai/deepseek-harness             | 独立只读clone，未修改core                                  |
| Branch              | master                                   | 不是main                                                   |
| Source SHA          | ca33fd6843b205e279c7ccb6cb73a472c78f5760 | clean exact-source模式60/60（Node24）                      |
| Published DSH       | 0.2.2-rc.4                               | npm真实运行模式60/60                                       |
| Node                | 24.22.3 Windows x64                      | archive checksum已核，子执行PATH固定24                     |
| pnpm                | 11.28.5                                  | packageManager/lock与子生命周期一致                        |
| Export format       | DeepSeek v3                              | 官方schema/converter，原始字节保留                         |
| Native mobile Web   | 390×844 and 360×800                      | 完整官方CLI Web + nativeSlot共8/8；不是Android/iOS实机证明 |

规格允许Node `>=24.9.0 <25`，但实际测试声明只覆盖24.22.3。其它Node/DSH版本不从规格或相同版本号推断为成功。

## Published npm is not source identity

同名同版npm源码与审计SHA存在差异。[entry比较](../../scripts/compare-upstream.mjs)为31包/16 entry DIFF；[实际使用接口比较](../../scripts/check-compatibility.mjs)为9 DIFF。两者范围不同，不互相覆盖。一个是版本/源码观察，另两个runtime测试才证明所运行组合的行为。

- `pnpm test`：已安装npm版官方Cordis/Storage/Session/Query/AgentLoop/compaction。
- `pnpm test:pinned`：[runner](../../scripts/test-pinned.mjs) + [source aliases](../../vitest.pinned.config.ts)，真实官方与vendor源码、标准decorator预转换。
- `node scripts/packed-smoke.mjs`：fresh build/pack、独立consumer官方peer安装、原生host/client导入和officialLoader entry。
- `pnpm test:mobile`：[自主Host runner](../../scripts/test-mobile.mjs)，启动独立认证Host与官方Web profile，使用项目隔离Documents目录，结束清理测试进程。

只对模型外部IO脚本化；没有Mock Session/Storage/Cordis。Scripted回复不证明人格质量。

## Update discipline

每日[`dsh-compatibility`工作流](../../.github/workflows/dsh-compatibility.yml)读取官方master，记录full SHA后使用同一个真实source runner；失败保留trace并由独立job通知维护者，未执行的云端任务不声称已有通知。稳定pin和npm依赖不自动变更。

2026-11-18latest发现：`ls-remote`观察 `2e39e70496aa02986ca6a820c5d497e816b69d7e`；三次officialclone超时/connectionreset，最新API/runtime**未测**。继续保留已测试ca33fd基线。更新必须人类review源码变化、锁依赖、重跑两轨与手机/packed后再新增兼容声明。

## Release blockers

生产audit无high/critical、0moderate；完整开发Host闭包在undici8.12.2修复后仍有picomatch4.0.7的1high/3moderate。暂无已发布修复，不降低阈值。不做公开Release/npm发布，未配置真实云端人类审批、仓库保护或发布账户。

实际App ZIP、真实模型质量、真实移动系统、大包压力、跨进程writer、完整Session/附件包均见[未决事项](KNOWN_ISSUES.md)。兼容通过是本地工程组合，不等于整体产品验收。

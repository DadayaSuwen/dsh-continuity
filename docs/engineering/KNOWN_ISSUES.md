# 已知问题 / Known issues

更新：2026-11-19 04:22 CST。整体 MVP 尚未接受；此列表保留真实验收缺口，不把未跑项目写成通过。

## 需要外部证据 / External acceptance

1. **真实导出与模型质量**：当前仅合成官方 schema 和 scripted 外部模型 IO。待用户明确允许的实际 App ZIP、至少两个真实模型的人设/关系/剧情回归；真实调用可能涉及额度，另行确认。
2. **上游latest消费边界**：2e39e704 /rc.5源码60/60；已发布rc.5独立consumer60/60，正确exactengine后完整phone8/8并重复8/8。原rc.4installer exactengine仍不匹配rc.5，未宽化官方peers或绕过admission；本轮只验证sourcevariant。初次6/8与两次wrapper0测试失败保留。[消费跟进](PUBLISHED_RC5_FOLLOWUP.md) · [源码补充](UPSTREAM_LATEST.md)。
3. **供应链与Host边界**：项目dev/CI以SDK2.3.0override修复MCP跨源header/body转发，5个真实公共probe检查通过；生产/完整开发audit的最近成功snapshot为round3的0公告/highgate0；round4刷新两次fetch失败，原锁/阈值/ignore不改，不把旧记录算为本轮freshfeed通过。Picomatch4.0.7公告撤回已被registry采纳，没有codepatch，仍避免不可信glob。用户安装Continuity不会自动替换其HostSDK，OAuth/TLS/代理/真实服务未验证。见[MCP实测](MCP_TRANSPORT.md)与[第一方研究](../research/DEPENDENCY_ADVISORY_REVIEW.md)。
4. **远端治理与发布**：八工作流是本地代码，cloud Actions/CodeQL/actionlint尚无运行证明；CODEOWNERS 模板未启用，branch/environment/人类 reviewer/npm trusted publishing 未配置。只交付发布准备，无 public writes。
5. **首次 governance bootstrap**：trusted-base checker 首次进入空基线时不存在。人类需在公开仓库确认前检查初始化 snapshot，将可信 gate 放入 main 后再开启 required status；任何当前 PR 不执行自己的修改版审批器，不设置自动通过。

## 当前功能上限 / Product ceilings

6. **格式与原件**：官方导出只认v3。ZIP 内未知字段、全分支、THINK/工具/未完成内容保留在原始资产；不保证均进入正式上下文。缺正文的非图片附件不重建。官方公开 `./src/*` importer seam 需构建转译和固定兼容测试。
7. **备份范围**：v1 包含 sources/memory/墓碑，不含完整 Session logs、bindings、import receipts、游标、独立附件对象、credentials/Host config。启用采集的新轮原始切片可在 sources 中保存，但这不是全 Session 恢复。
8. **缺源恢复**：用户删原件后引文仍可导出，包会明确列 `omitted_source_ids`。恢复的缺源记忆为 unknown、candidate、unconfirmed；未提供丢失原件，原始来源真实性仍待核实。
9. **大文件与故障**：1/8/32MiB合成二进制归档预览已测，whole-child32MiB峰约165–181MiB，含fixture/imports，不是插件净内存上限。默认128MiB上传/512MiB展开/64MiB条目峰值、复杂文本/大量节点未验收。九个durable milestone硬退出/取消/挂接故障的重启通过；partialSession明确报错保留。OS断电、rename/fsync内部和附件/多Session全事务仍未覆盖。[资源报告](RESOURCE_MEASUREMENTS.md) · [中断报告](IMPORT_INTERRUPTION.md)。
10. **预算**：预算覆盖整个插件header+JSON，以UTF-8字节作保守token代理，不覆盖全provider请求、其它插件与历史。官方token meter/compaction回归通过不等于任意模型窗口保证。
11. **规则与状态**：规则只匹配明确中英文句式，不保证小说语义、角色台词真人判断或同义矛盾完全正确；用户审阅是核心。模型提取、embedding、独立新增候选UI、显示名/opaqueID改名、多用户分享是Planned。
12. **并发部署**：同一domain写者在进程内统一排队、验证、原子update；绑定链按Host串行。跨进程/多Host共享存储未接受，不以此支持多writer部署。
13. **手机**：完整官方Web与原生Slot的两个视口8/8通过。真实Android/iOS软键盘、OS文件选择/下载、路由前缀/transport carrier、网络切换和回主会话导航待实机验收。UI当前中文；英文docs不是英文UI测试。
14. **删除**：插件记忆/来源删除不删除正式Session/附件，也不抹掉旧日志快照和既有模型回复。官方审计API无正式Session/Attachment delete；卸载默认保留数据。

15. **v1来源数量**：每包最多1000included与1000omitted source IDs；export和restore保存前都检查并显式报错。长期采集需分批资产管理，超过上限未提供自动分包UI。

16. **源码包复现**：原ed431c5 ZIP无Git时build/runtime能运行，但两个新增测试强制HEAD失败；ordinarymetadata改为本目录真实GitSHA或null后，实际新candidate ZIP frozeninstall→build→60runtime→9checkpoint→16observations→Loader通过。锁/正式rc4peers不改，私有toolchain不打包；trackedsecret/官方sourceSHA/审批仍需其Git前提。见[源包报告](SOURCE_ARCHIVE.md)。最终commit ZIP仍另行精确摘要复验。

## 已复现并修复 / Reproduced and fixed

- 同版已发布Web丢失stylesheet metadata、sidebar内overlay几何：兼容样式安装 + Portal。
- 默认Workspace初始化晚于panel首次读取：限时重读 + “刷新保存位置”。
- 编辑后提取同ID重复、编辑后删除原文本复活、老backup回灌删除记录：稳定ID去重和墓碑。
- 恢复信任独立preview/assistant升user：从raw重新预览 + 原说话者/分类逐字校验。
- 首次并发Session归属覆盖：串行check/existence/write。
- 10001记忆/20001墓碑耐久后重启损坏：统一schema/唯一ID/范围校验在写入之前。
- 历史失败让新成功续聊永久报错：仅检查本次新增事件。
- alternate branch提取默认剧情、source id对Session scope错配、已运行Agent忽略新模型：显式branch联动、receipt映射、official model.select。
- context编辑/删除与真实official compaction：最新snapshot supersession、未变去重、旧event前缀保持。

来源：[当前进度](PROGRESS.md)、[固定点审查](CODE_REVIEW.md)、[运行证据](RUNTIME_EVIDENCE.md)、[实现](../../src/plugin.ts)。最终打包仍须从最终版本重跑；旧绿记录不替代新tarball。

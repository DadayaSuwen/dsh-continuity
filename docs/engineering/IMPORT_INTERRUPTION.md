# 导入中断与重启验证

[English](IMPORT_INTERRUPTION.en.md) · [公共验证脚本](../../scripts/check-import-interruption.mjs) · [原始/正式对话seam](../../src/migration/migration.ts) · [资源观察](RESOURCE_MEASUREMENTS.md)

## 1. 实际基准与方法

2026-11-19T03:05:07–03:05:26+08:00（Asia/Shanghai）运行 **9/9节点、命令exit0**。主项目源码基准ca1b65c、Node24.22.3，已发布官方DSH0.2.2-rc.4。测试使用真实Cordis、StorageJson/Domain、JSONL SessionPersistence、WorkspaceRegistry以及官方公开DeepSeek importer源码seam；仅ZIP和文件内容是合成fixture。未启动3080或任何模型调用。

每个节点由全新Node子进程写独立临时域；checkpoint发生时 `process.exit(73)`，**没有Context dispose/finally graceful teardown**。父进程等待close，再启动第二个进程加载同一目录并重试。对来源、收据使用官方[post-durability domain事件](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/storage/storage-domain/src/events.ts)；对Session使用真实handle append/flush/close，故障包装只在测试进程，不修改DSH核心或插件生产源码。

[worker](../../tests/helpers/import-interruption-worker.ts)hash `cf1dfe220836e7e36f79330d6a4b39a2c888219eb7719d33b1571eab726081e0`；验证脚本hash `7cd170ad16340ce3f9a8b492334b4b682b811974c8b91b2c8a92fc25bc442815`。生成JSON/log/checkpoint只在本机 `.runtime/round-3/interruption-*` 与 `test-results/import-interruption.json`，安装包不携带测试homes/日志。子环境移除凭据及DSH数据根，已有字节副本和原始events独立核对。

## 2. 节点与观察结果

| 节点                        | 确切停止/故障边界                                                           | 新进程验证                                                              |
| --------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| source-retained             | 来源字节和preview原件记录确认耐久后硬退出                                   | 原ZIPbase64不变；重试首次创建，随后重复复用；1Session/1member           |
| source-cancelled            | post-durability来源事件后AbortController取消，commit失败且drain完再退出     | 停止前0Session；原件保留，新进程可完成迁移                              |
| workspace-retryable-failure | 完整Session完成写入，但attachSession抛出合成错误；公开结果有失败与SessionID | 重启重试复用已写ID、修复工作区/绑定，无重复                             |
| receipt-planned             | 写入分配SessionID及expected_events后、SessionPersistence.create前           | 计划ID未落盘可重建；来源字节不变，最终1Session                          |
| partial-flushed             | 公共append故意仅写入合法连续前缀，flush完成后硬退出                         | Partial Session明确报错；ID/count/已落前缀hash不变，不覆盖、不增Session |
| session-flushed             | 全部events的flush确认后、handle.close前硬退出                               | 完整events逐项不变，重试同ID，1member及绑定恢复                         |
| session-closed              | 完整handle.close完成后、Workspace.attach前硬退出                            | 已完成ID复用，原events不改                                              |
| workspace-attached          | 官方工作区挂接完成、imported收据写入前硬退出                                | 重试收据/绑定修复，成员去重                                             |
| receipt-imported            | durable imported收据后、绑定写入前硬退出                                    | 重试同ID，绑定恢复，原events不改                                        |

每个停止进程实际exit73，每个重启验证exit0。七个纯硬退出节点、一个已观察取消、一个挂接失败，共九种；它们是独立CLI验证，不冒充新增9个Vitestcase或全故障事务保证。

## 3. 为什么部分对话保持报错

官方[persistence handle合约](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/session/session-persistence/src/handle.ts)规定append只承诺当前后端可见，flush承诺crash耐久。Migration对已有Session事件数量不足expected_events时返回partial-import，原件与部分日志留存供核对；公开接口没有删除Session或全交易回滚方法。

当前测试确认这个保守路径实际存在。它**没有**自动修复半段剧情、丢弃前缀、改旧events或mint一个替代对话来把失败隐藏为成功。重试只对完整日志或计划但尚未materialize的ID自动reconcile。

## 4. 复现与CI

```bash
pnpm install --frozen-lockfile
pnpm test:interruption
```

脚本只转译测试/插件公开importerseam到自己的临时worker，Host公共模块仍external实际加载。每个child有30swatchdog和close等待；构建/进程/断言失败返回非零，成功输出各节点结果。初版脚本Go-regex `u`flag及absolute入口external错误属于prep，已原样保留工具失败记录，未记为runtime故障。

[E2E工作流](../../.github/workflows/e2e.yml)在真实runtime后顺序运行同命令；本地通过不代表云Actions已执行。日志只包含合成数据与测试目录，无authtoken或真实聊天。

## 5. 尚未覆盖

`process.exit`硬停止不是切断电源、磁盘full、OSpage-cache丢失或真实forcekill/网络断线模型。未中断atomic rename/fsync中间字节，未测试flush返回前丢失、压缩JSONL尾巴损坏、附件store、多个对话批次、source/绑定并发跨Host写者或future migration schema。

测量及hardstop通过不证明任意Host性能、完整Session/附件备份或产品MVP完成。实际用户AppZIP、live人设/关系/剧情质量、Android/iOSOS体验、云端治理仍单列。资源表仅代表1/8/32MiB合成归档，与本页tinycompanion中断无混算。

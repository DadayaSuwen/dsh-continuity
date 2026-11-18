# 在手机使用

[English](mobile.en.md) · [导入](import.md) · [记忆](memory.md) · [备份](backup.md)

> 当前为可安装工程预览，**整体 MVP 尚未验收**。完整官方 CLI Web 与原生 Slot Host 的 390×844 / 360×800 自动化视口检查已通过；它们不是 Android/iOS 实机、真实 App 菜单或真实模型质量的通过声明。详见[工程运行证据](../engineering/RUNTIME_EVIDENCE.md)。

## 入口

DSH Continuity 是可独立安装的 DSH bundle 插件，使用官方插件 / bundle 机制；这不表示 DeepSeek 官方背书。它不是独立手机 App、独立聊天客户端、浏览器扩展或另一套 Harness。先在已连接的 DSH Host 安装本地构建包，再从手机打开该 Host 的 DSH Web，展开原生侧边栏并点“迁移与记忆”。

当前 UI **仅中文**；英文指南只是文档翻译，不表示存在英文界面。[客户端注册](../../src/ui/client.tsx)使用官方原生 sidebar slot。

在 Host 操作安装，不在手机浏览器安装 npm：

```bash
dsh plugin --profile web add ./dsh-continuity-0.1.0.tgz
```

这是本地构建安装包的消费命令，不是公开 npm 发布声明；安装 / 重载遵循当前 DSH profile 的插件流程。需要付费或外部资源、公开仓库 / 发布、远端配置时，先取得用户明确同意；本文不执行这些动作。

## 使用顺序

1. 核对当前连接的 Host。文件在那里处理、保存，而非手机浏览器持久存储；远程访问使用可信 HTTPS 和 Host 登录连接。
2. 填同一角色档案 / 故事，选已有保存位置。首次工作区初始化是异步的，面板会短时自动刷新；列表仍为空时，在 DSH 主界面选择工作区，再点“刷新保存位置”。当前角色名称输入也是身份键，改名相当于选择另一分区；记录原标识。
3. 用系统文件选择器选自己的 ZIP / TXT / Markdown / JSON，或粘贴标注说话者的内容。DeepSeek App 是否有导出入口需在实际已安装版本检查，本文不承诺统一菜单路径。
4. 阅读解析报告、警告和选择。多分支对话用原生“导入分支”下拉框选择默认或一个 leaf；保存后检查新增 / 重复 / 失败，再审阅同一分支的候选记忆。
5. 在“模型服务”和“模型”文本框填 Host 已配置值，新建对话或选择已绑定对话后发送。仅打字不切换模型；继续 / 发送时通过官方 `model.select` 应用到 live / resumed Agent。导入、规则提取和显式采集没有模型调用；发送对话才使用所选服务额度。
6. 下载 v1 角色备份并检查文件实际保存位置。[覆盖范围](backup.md)只含保留的来源与记忆，包括已显式采集的新事件切片，区别于完整 Host / Session 备份。

新消息手工采集当前仅有 Host service，按轮次采集默认 `batchEveryTurns=0` 关闭；不把它描述成现有手机按钮。[采集说明](memory.md)

## 状态与中断

普通页面上传可显示发送字节百分比，传输 carrier 路径可能只有阶段状态；它不是解压 / 提交逐项百分比。取消上传、关闭页面、网络切换不保证 Host 已完成的写入回滚。成功预览有 15 分钟暂存；再次选择前清除暂存，或等过期重新上传。提交的原始资产与正式对话不会因关闭页面而自动删除。

默认上传上限 128 MiB；ZIP 展开总量 512 MiB、单条目 64 MiB、最多 10,000 文件、压缩比 200。备份含 base64 / 预览可能更大；先用小样本，大包可恢复性不由同一个上传数字保证。[Host 限额](../../src/security/archive.ts)、[暂存路由](../../src/routes.ts)

## 已验证与仍需验收

- 已验证：完整官方 CLI Web 与原生 Slot Host 在 390×844、360×800 的自动化面板流程，包括导入 / 审阅 / 新建恢复 / 续聊简要回复 / 浏览器下载事件；原生 Host / npm 与固定官方源码运行结果见[工程证据](../engineering/RUNTIME_EVIDENCE.md)，不在本指南重复测试总数。
- 这些检查只在外部模型 IO 使用 scripted adapter，不代表真实模型人格或剧情质量。简要回复显示已有完整官方 Web E2E 证据，也不代表主对话列表刷新、选择与返回导航已验收。
- 仍需实际 Android / iOS 浏览器的系统文件选择 / 下载保存、软键盘、触控与返回对话路径，以及实际已安装 DeepSeek App 的导出菜单与真实用户文件。
- 反向代理前缀 / transport carrier 组合、网络中断、暂存清理、部分失败与大包窗口仍需分别验证；视口通过不扩展为这些部署路径的结论。
- 整体 MVP 仍需真实用户导出恢复与真实模型质量验收。

实现依据：[面板](../../src/ui/Panel.tsx)、[传输](../../src/ui/api.ts)、[样式](../../src/ui/style.css)；固定官方原生 slot：[sidebar contract](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/client/ui-sidebar/src/client/contract/slots.ts#L75-L87)。

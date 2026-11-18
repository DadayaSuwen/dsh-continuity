# 在手机使用

[English](mobile.en.md) · [导入](import.md) · [记忆](memory.md) · [备份](backup.md)

> **Experimental / 未验收**：原生 sidebar 界面已有源码，Lead 正在完成装配与手机流程。没有手机实机通过或 live 模型人格一致的证据；本指南不把计划流程宣传为完成版。

## 入口

DSH Continuity 是 DSH bundle 插件，不是独立手机 App、独立聊天客户端或浏览器扩展。先在你已连接的 DSH Host 安装准备中的 bundle，再从手机打开该 Host 的 DSH Web，展开原生侧边栏并寻找“迁移与记忆”。当前中文入口来自[客户端注册](../../src/ui/client.tsx)；英文指南不表示英文 UI 已验收。

在 Host 操作安装，不在手机浏览器安装 npm：

```bash
dsh plugin --profile web add ./dsh-continuity-0.1.0.tgz
```

这是本地发布准备产物的消费命令，不是公开 npm 发布声明。安装/重载遵循当前 DSH profile 的插件流程；手机入口仍需真实 bundle 装配验证。

## 使用顺序

1. 核对当前连接的 Host。文件在那里处理、保存，而非手机浏览器持久存储；远程访问使用你信任的 HTTPS 和 Host 登录连接。
2. 填同一角色档案 / 故事，选已有保存位置。当前角色名称输入也是身份键，改名相当于选择另一分区；记录原标识。
3. 用系统文件选择器选自己的 ZIP/TXT/Markdown/JSON，或粘贴标注说话者的内容。DeepSeek App 是否有导出入口需在自己的版本检查，本文没有统一菜单实机证据。
4. 阅读解析报告、警告和选择，保存后检查新增 / 重复 / 失败；再审阅候选记忆。
5. 显式选择 Host 已配置模型，发送消息继续对话。导入/规则提取没有默认模型调用，发送对话使用所选服务额度，不绕过平台额度。
6. 下载 v1 角色备份并检查文件实际保存位置。[覆盖范围](backup.md)与完整 Host 备份不同。

## 状态与中断

普通页面上传可显示发送字节百分比，传输 carrier 路径可能只有阶段状态；它不是解压 / 提交逐项百分比。取消上传、关闭、网络切换不保证 Host 已完成的写入回滚。成功预览有 15 分钟暂存；再次选择前清除暂存，或等过期重新上传。提交的原始资产与正式对话不会因关闭页面而自动删除。

默认上传上限 128 MiB，备份含 base64/预览可能更大。先用小样本；大包可恢复性不由同一个上传数字保证。[Host 限额](../../src/security/archive.ts)、[暂存路由](../../src/routes.ts)

## 仍需验收

- 390×844、360×800 实际 DSH Web：侧边栏、表单、文件选择、进度、报告、记忆审阅、恢复、备份完整流程。
- 实际 Android/iOS 浏览器与系统文件选择/下载、软键盘、触控、对话返回路径。
- 不同页面前缀/传输 carrier、网络中断、暂存清理、部分失败提示。
- 固定官方源码运行与真实模型表现分别记录。

已有 CSS 自适应和 Host 测试不等于上述验收。实现依据：[面板](../../src/ui/Panel.tsx)、[传输](../../src/ui/api.ts)、[样式](../../src/ui/style.css)；固定官方原生 slot：[sidebar contract](https://github.com/DeepSeek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/client/ui-sidebar/src/client/contract/slots.ts#L75-L87)。

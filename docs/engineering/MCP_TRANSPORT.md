# MCP 传输依赖修复与实测

[English](MCP_TRANSPORT.en.md) · [公告研究](../research/DEPENDENCY_ADVISORY_REVIEW.md) · [运行证据](RUNTIME_EVIDENCE.md)

## 1. 修复范围

本轮验证的是项目开发/CI运行图的 **官方已发布 MCP `probeServer`**，不是为 Continuity 添加外部记忆服务。插件Host/browser bundle未导入MCP SDK。官方 `dsh-mcp-client@0.2.2-rc.4` manifest仍精确声明SDK2.2.0；项目在[工作区override](../../pnpm-workspace.yaml)将其解析为 **`@modelcontextprotocol/client@2.3.0`**，保留官方源码、DSH版本和稳定SHA。

此override只影响本项目安装图；将Continuity安装包加入其他DSH Host不会自动替换该Host的MCP依赖。未修改运行中的GUI、生产Host或官方clone。

第一方[2.3.0发布说明](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2.3.0)和[GHSA-6prh](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-6prh-2h8m-c8cw)记载同源重定向默认约束及client2.3.0修复边界。MIT→Apache-2.0是SDK manifest实际变化；SDK仅在开发Host闭包，没有复制进插件bundle，runtime许可证检查仍64个manifest。

## 2. 真实公共测试入口

[测试脚本](../../scripts/check-mcp-transport.mjs)通过已发布DSH包的公共 `probeServer(ctx,config,options)`，加载该包实际解析的SDK和Cordis。两个Node HTTP服务器只监听loopback随机端口；JSON-RPC、header、工具名均为明确合成数据。未Mock传输、替换fetch或连接真实MCP服务。

五项检查：直接HTTP列表、同源307跳转、跨源307、跨源302、stdio启动与列表。跨源定义为另一端口；固定合成header/body在目标端按存在/长度观察，不保留真实凭据。assert既要求请求未到目标，又要求probe失败且closeConfirmed；stdio实起Node子进程，关闭后清理自己创建的目录。

## 3. 红 → 绿证据

| 实际nested SDK | 跨源307目标                        | 跨源302目标                      | 普通/同源HTTP、stdio | 命令结果         |
| -------------- | ---------------------------------- | -------------------------------- | -------------------- | ---------------- |
| 2.2.0          | 5请求，5个合成header，541正文bytes | 2请求，2个合成header，0正文bytes | 均通过               | exit1            |
| 2.3.0          | 0请求、0header、0正文              | 0请求、0header、0正文            | 均通过               | exit0，5检查通过 |

失败和修复后日志分别保存于ignored工程证据，重复确认后仍通过。302虽然probe最终失败，header已曾到达另一端口，因此只看返回错误不够；检查目标端是此回归的关键。

`pnpm test:mcp`是同一可复现命令，已加入[Security工作流](../../.github/workflows/security.yml)的原high审计门前。阈值与权限未降低，测试不要求key、账户或云服务。

## 4. 审计与回归

2026-11-19（Asia/Shanghai）实跑：production audit **0公告**；完整开发audit **0公告**，原 `--audit-level high` **exit0**。MCP moderate消失来自实际SDK修复。Picomatch仍4.0.7，GHSA已于2026-11-18T15:38:56Z撤回，registry现不再返回它；这是公告feed变化，**不是已发布修复或ReDoS不存在的证明**。没有advisory ignore或版本检查绕过。

修改后的npmrc.4和stableca33fd真实runtime各60/60，phone完整官方Web/nativeSlot8/8。首次重跑在并行安装期间有容量fixture30s超时；单项仍通过，单worker两个完整轨道60/60。原失败保留，不改30s限制或删除测试；1001条耐久source写入的吞吐受主机负载影响，尚不作为插件性能上限。

## 5. 复现与剩余范围

```bash
pnpm install --frozen-lockfile
pnpm test:mcp
pnpm test
pnpm test:pinned
pnpm test:mobile
pnpm audit --prod --audit-level moderate
pnpm audit --audit-level high
```

实际Node24.22.3/pnpm11.28.5/Vitest4.1.12。MCP检查独立于60项Continuity suite，报告为5项，不合并成65个Vitest测试。

OAuth注册/刷新/issuer、跨scheme/TLS、代理、真实服务器和客户端调用每种工具均未测试；本次Node loopback结果不等于browser SDK或用户现有Host已修复。rc.5消费实验另有独立metadata/源码身份与失败记录。真实AppZIP、live人设质量、实机OS、cloudActions和人类远端发布仍待验收。

# 测试与证据

[English](TESTING.en.md) · [CI/CD](CI_CD.md) · [安全工程](SECURITY.md)

## 工具链

Node **24.22.3**、pnpm **11.28.5**、官方 npm DSH **0.2.2-rc.4**。[合约](../../COMPATIBILITY.json) 分别保存 npm 版本与 exact Git SHA。[package scripts](../../package.json) 是实际命令来源，不使用主机默认的 Node22/pnpm9来宣称兼容。

```bash
# Git Bash from D:/Desktop/dsh-continuity; scoped PATH, no global replacement
export PATH="$PWD/.toolchain/node-v24.22.3-win-x64:$PWD/.toolchain/pnpm/node_modules/.bin:$PATH"
export PNPM_SCRIPT="$PWD/.toolchain/pnpm/node_modules/pnpm/bin/pnpm.mjs"
node "$PNPM_SCRIPT" install --frozen-lockfile
node scripts/quality/self-test.mjs
node "$PNPM_SCRIPT" typecheck
node "$PNPM_SCRIPT" lint
node "$PNPM_SCRIPT" format:check
node "$PNPM_SCRIPT" test:unit
node "$PNPM_SCRIPT" test:integration
node "$PNPM_SCRIPT" test:runtime
node "$PNPM_SCRIPT" build
node "$PNPM_SCRIPT" check:docs
node "$PNPM_SCRIPT" check:licenses
node scripts/check-secrets.mjs
node "$PNPM_SCRIPT" check:compatibility
```

初始化阶段没有 tracked files 时 secret checker明确失败；可显式执行 `node scripts/check-secrets.mjs --include-untracked` 得到初始化证据，staging/commit后再执行默认 tracked扫描。它不扫描真实导出、ignored runtime目录或历史 Git commit，不声称密钥完整缺席。

## 层次与真实模块

- **单元**：召回预算、预检与解析等纯路径。
- **安全**：恶意 ZIP/路径/大小/CRC/owner identity等；fixture完全合成。
- **集成**：官方 Cordis + StorageJson/Domain/JSONL，真正 temp filesystem与保存/加载，不替代 Session数据库。
- **npm runtime**：已安装 npm官方模块、插件 lifecycle与真实 production AgentLoop；仅外部模型 IO scripted，不访问付费模型。
- **pinned source**：`pnpm test:pinned` 通过 [Lead runner](../../scripts/test-pinned.mjs) 与真实官方源码 Vite alias，不是 npm runtime 换一个标题。
- **packed Loader**：`node scripts/packed-smoke.mjs` freshbuild→actualpack→独立consumer官方peer→原生host/client与Loader/Fiber，同时检查随包所有Markdown本地目标。CODE_OF_CONDUCT随包，pnpm锁只在源码checkout/独立sourceZIP，不把私有试验homes打包来满足链接。Consumer清除token/sourcealiases；缺requiredHostservices时Fiberpending不等于activation，功能路径由test:runtime验证。
- **手机浏览器**：`pnpm exec playwright install --with-deps chromium` 后 `pnpm test:mobile`；runner先build，再启动隔离认证Host与完整官方CLI Web，使用ephemeralports和projectDocuments，结束关闭子进程。390×844、360×800八项当前通过，UI如实归属和scope；本机Chrome路径只用显式环境变量，CI使用标准PlaywrightChromium。不是Android/iOS实机或live模型质量证明。

- **MCP传输**：`pnpm test:mcp`通过[已发布公共probe](../../scripts/check-mcp-transport.mjs)、真实nestedSDK、loopback307/302目标观察和Nodestdio；5checks不计为新增Vitestcases，OAuth/TLS/真实Host未测。[范围](MCP_TRANSPORT.md)。

`pnpm test:coverage` 独立产生 cobertura相关证据，当前配置使用V8/text/lcov/json-summary；不虚构100%覆盖、不让空目录test/evaluation通过来冒充测试。`pnpm test:evaluation`只在真实测试已实现时声明成功。

## npm与源码同版本 DIFF

```bash
node scripts/compare-upstream.mjs
node scripts/check-compatibility.mjs
node scripts/quality/clone-pinned.mjs
node "$PNPM_SCRIPT" test:pinned
# 只读取最新官方source；稳定pin不变；需要 .test/ 已在ignore
node scripts/upstream-compatibility.mjs
```

当前audited `ca33fd6843b205e279c7ccb6cb73a472c78f5760` 与 npm0.2.2-rc.4多个源码不同。同版本check只证明 installed manifest满足精确版本，**不**证明这个SHA运行。pinned/latest输出必须记录实际SHA、exit code和Runner路径。

## 当前运行记录

Node24.22.3/Vitest4.1.12：npm与exactauditedSHA各60/60、28文件；latest2e39e704源码亦60/60，两个npmrc4手机视口共8/8。[最新实测](UPSTREAM_LATEST.md)；latest源码通过不等于rc.5npm/browser消费。结果不是MVP接受，真实App/export/model仍单列。详见[运行证据](RUNTIME_EVIDENCE.md)和[兼容](COMPATIBILITY.md)。Playwright失败attachments在ignored `.runtime/browser-results`，不会清空其他 `test-results` 报告；日志token须脱敏，生产数据不作为CIartifact。

## stdlib检查的范围

- [docs](../../scripts/check-docs.mjs)：本地 Markdown文件/anchor，双语README同heading层次与必要主题，真实 `src/plugin.ts` scalar Config 对 `cordis.patch.yml`，8 workflows的脚本引用/最小权限/pin约束。它不是通用 YAML parser，不访问所有外链；建议维护者另外运行actionlint。
- [licenses](../../scripts/check-licenses.mjs)：实际installed manifests，从runtime dependencies+required peers+installed optional边递归，检查SPDX AND/OR准入；缺失非optional或未知license失败。dev-only不伪称闭包。
- [secrets](../../scripts/check-secrets.mjs)：tracked文本模式、值不输出，合成fixture用 [精确allowlist](../../scripts/quality/secret-allowlist.json)，明确假key前缀跳过；binary只记为未文本扫描，symlink需Review。
- [compatibility](../../scripts/check-compatibility.mjs)：package/contract/toolchain/installed exact npm版本，存在source clone时核对 full SHA并计算源码DIFF。runtime必须单独跑。
- [quality self-test](../../scripts/quality/self-test.mjs)：assert验证link/SPDX/secret redaction/risk/head review/version关键分支，非empty pass。

## 证据目录与报告纪律

运行生成 ignored `test-results/` 的 docs/licenses/secrets/compatibility JSON、pinned-source/pinned-compatibility/JUnit、upstream JSON/MD/log、packed-smoke JSON/log及 exact tarball、release preparation/checksum/local draft。最新官方 clone在 ignored `.test/results/`；不会把个人Host数据、真实chat、credentials上传 artifact。

报告每项明确：命令、工具版本、实际exit/result、证据路径、未运行原因。失败即保留失败，不靠空pass/Mock/版本相等改写；未运行不等于失败也不等于通过。GitHub Actions/CodeQL/dependency review/npm audit在未配置远端或未联网执行时应标“未运行”。真实个人导出验收是另一个需要用户提供明确样本的等级，合成fixture不冒充它。

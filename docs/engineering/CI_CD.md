# CI/CD 与治理

[English](CI_CD.en.md) · [测试](TESTING.md) · [分支保护建议](BRANCH_PROTECTION.md)

## 当前状态

本仓库交付可执行 CI 和发布**准备**，不是公开发布。工作流文件尚不证明远端已启用；分支保护、Code Owners、人为 Release environment、仓库权限与 npm trusted publishing 均由维护者在用户明确确认后另行配置。本地验收结果以实际命令和证据为准，见 [测试指南](TESTING.md)。

## 八个工作流

| 工作流                                                                 | 任务                                                                         | 触发与成本                                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [ci.yml](../../.github/workflows/ci.yml)                               | 类型、lint、格式、单元/安全/真实存储、构建、版本合约；`required` 固定状态    | PR 总是生成状态；文档 PR 内部跳过重测试，仍检查文档/配置/脚本；main push 路径过滤  |
| [docs.yml](../../.github/workflows/docs.yml)                           | 本地链接/anchor、中英 README 结构、真实 Config 与 workflow 脚本引用          | 文档/配置/治理路径或手动                                                           |
| [test-matrix.yml](../../.github/workflows/test-matrix.yml)             | Ubuntu 与 Windows，Node 24.22.3，npm DSH 0.2.2-rc.4                          | 源码/测试/工具链路径或手动；不虚构其他已支持版本                                   |
| [security.yml](../../.github/workflows/security.yml)                   | tracked secrets、installed runtime 许可证、registry audit、依赖 diff、CodeQL | 相关路径、每周或手动；CodeQL 仅写 security events                                  |
| [dsh-compatibility.yml](../../.github/workflows/dsh-compatibility.yml) | exact SHA `pnpm test:pinned`；latest master 真实源码探针及失败 issue         | pinned 在相关 PR；latest 只每日/手动，失败 issue 由不 checkout 上游的独立 job 创建 |
| [e2e.yml](../../.github/workflows/e2e.yml)                             | 真实 pack/Loader、npm runtime、手机浏览器                                    | 功能路径或手动；只安装 Chromium                                                    |
| [governance.yml](../../.github/workflows/governance.yml)               | 可信 base policy + 当前 HEAD 人类维护者审批                                  | PR metadata；8分钟；无依赖安装/PR head 执行；Review 后重跑原 PR job                |
| [release.yml](../../.github/workflows/release.yml)                     | 精确 tag/版本/commit、防重复、人为 environment、重新验收、tarball/草稿       | `workflow_dispatch` 或 `v*` tag；单全局队列，不中断已开始准备；零公开写入          |

每个 workflow 默认 `contents: read`，checkout `persist-credentials: false`，有超时、并发与短期证据保留。仅 CodeQL job 的 `security-events: write` 和独立维护 issue job 的 `issues: write` 有明确必要；测试 PR 不接收发布凭证。不使用特权 PR trigger、不由 AI 批准、不默认 auto-merge。

## 风险等级与人工 Review

[风险策略](../../.github/risk-policy.json) 是机器可执行的路径规则，不信任可随意更改的 PR label：

- **low**：文档；自动 gate 0 个，但远端正常分支 Review 仍要求至少 1 个。
- **medium**：一般源码、UI、测试；当前 HEAD 至少 1 位非作者人类维护者。
- **high**：导入/隔离/持久化/恢复/模型上下文、依赖、工作流和工具；当前 HEAD 至少 2 位。
- **critical**：release gate、风险策略、所有权、兼容 pin、license/NOTICE；当前 HEAD 至少 2 位，另有发布 environment 人为 gate。
- 20个文件或500行的改动至少 high；rename 同时计算原路径和新路径。

[Review checker](../../scripts/quality/risk-review.mjs) 读取 GitHub PR/files/reviews/collaborator permission。仅 `User`、非作者、非 bot 命名、write/maintain/admin、有当前 head `commit_id` 的最新 `APPROVED` 计数；dismissed、旧 head、未知权限不计数。GitHub 账号类型不证明鼠标实际由谁操作，维护者承诺亲自审阅；禁止 AI 借真人账号自动批准。

治理 job checkout **base SHA**，执行 base 的策略而不是 PR 修改后的 gate。首次加入 gate 时 base 尚无脚本，需维护者审阅 bootstrap；首次失败不是默认放行。普通 `pull_request_review` 的 submitted/edited/dismissed也触发可信base检查，避免审批撤销后只保留旧状态。人工 Review 完成后确认该Review run附着当前head；若原PR run仍失败，从原 PR run 重跑 job，让 required status 绑定原 PR head；手动 dispatch 是补充证据，不替代 PR 状态。远端设置仍是实际强制条件。

## 兼容证据是两条路径

[兼容合约](../../COMPATIBILITY.json) pin 源码 SHA `ca33fd6843b205e279c7ccb6cb73a472c78f5760` 与 npm `0.2.2-rc.4`。同版本 npm 包与此 SHA 存在多处源码 **DIFF**，由 [Lead 的对比脚本](../../scripts/compare-upstream.mjs) 和 [合约检查](../../scripts/check-compatibility.mjs) 记录，版本相等不代表源码一致。

- `pnpm test:runtime` 验证 published npm 模块、真实 Cordis/Storage/Session/AgentLoop，只有外部模型 IO scripted。
- `pnpm test:pinned` 调 [Lead 的 runner](../../scripts/test-pinned.mjs)，以 Vite alias 调 exact audited SHA 的真实源码。
- [latest checker](../../scripts/upstream-compatibility.mjs) 在 ignored `.test/results` clone最新 official master → record full SHA → `DSH_SOURCE_ROOT` 调同一 runner。失败保留 API signals/source diff/日志，Actions 创建或评论维护 issue；稳定 pin、依赖和官方已有 clone不被修改。

## 发布准备而非发布

1. 维护者在确认后配置 `release` protected environment：**人类 required reviewers**、防 self-review、禁管理员 bypass、仅 main/`v*` deployment patterns。不同计划/私有仓库可能不支持 reviewer，缺失时保持准备 gate 关闭。
2. 设置 environment variable `RELEASE_HUMAN_APPROVAL_CONFIGURED=true` 是维护者配置声明，不是 AI approval，也不替代 GitHub 真实 required-reviewer rule；初始默认缺失即失败。
3. 输入 exact semver，匹配 package version、`COMPATIBILITY.pluginVersion`、已存在 `vVERSION` tag 与 checkout HEAD；commit 在 main历史。手动 dispatch 必须从 main启动。
4. [预检](../../scripts/quality/release-preflight.mjs) 只读检查 registry version/GitHub Release不存在；网络错误失败。全局并发串行化，并在 environment Review 后再检一次，防 stale 检查。
5. 重新运行质量、high依赖audit、exact SHA、npm runtime、pack与浏览器检查；当前picomatch high仍让gate失败，不降低阈值。[准备脚本](../../scripts/quality/release-prepare.mjs) 校验被 Loader 测过的 exact tarball SHA256，保留 tarball/checksums/local GitHub Release draft及日志。
6. 本工作流没有 npm/GitHub发布命令、`contents: write`、`id-token: write`、npm token。真正公开 npm publish/GitHub Release 是**另一项需用户明确确认、人类 Review 的变更**，尚未执行。

`environment: release` 单独写在 YAML 会在某些条件下创建未保护 environment；因此不可宣称 YAML 自带人为 approval。参见 [GitHub environment rules](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)。

## 依赖与 Action pin

[Dependabot](../../.github/dependabot.yml) 每周分组工具/action，限制同时打开 PR，不自动合并；官方 DeepSeek包冻结并由兼容审计手动更新。所有 Action pin 使用官方 GitHub API 解引用得到的40位 commit SHA（2026-11-18核对），tag仅作注释：

- [checkout](https://api.github.com/repos/actions/checkout/git/ref/tags/v4)、[setup-node](https://api.github.com/repos/actions/setup-node/git/ref/tags/v4)、[upload-artifact](https://api.github.com/repos/actions/upload-artifact/git/ref/tags/v4)。
- [pnpm/action-setup tag owner](https://api.github.com/repos/pnpm/action-setup/git/tags/f40ffcd9367d9f12939873eb1018b921a783ffaa)、[github-script](https://api.github.com/repos/actions/github-script/git/ref/tags/v7)。
- [CodeQL tag owner](https://api.github.com/repos/github/codeql-action/git/tags/b7b84b636b4f90c9b31da1bc5f72bfadd5b31410)、[dependency-review v5.0.1](https://api.github.com/repos/actions/dependency-review-action/git/ref/tags/v5.0.1)。

这些是来源解析证据，不是所有 Action 实现经过完整审计的宣称。更新 pin由人类审阅。GitHub [secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use) 支持最小权限、full-SHA pin、环境秘密与可信 checkout 分离。

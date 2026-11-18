# Contributing / 贡献指南

[English README](README.md) · [中文 README](README.zh-CN.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

## 开发 / Development

Use Node24.22.3 and pnpm11.28.5 from [package scripts](package.json) and [compatibility contract](COMPATIBILITY.json). Read [architecture](docs/architecture/ARCHITECTURE.md), [testing](docs/engineering/TESTING.md) / [English](docs/engineering/TESTING.en.md), and [CI/governance](docs/engineering/CI_CD.md) / [English](docs/engineering/CI_CD.en.md) before changing data or runtime paths.

```bash
pnpm install --frozen-lockfile
node scripts/quality/self-test.mjs
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:unit
pnpm test:integration
pnpm test:runtime
pnpm build
pnpm check:docs
pnpm check:licenses
node scripts/check-secrets.mjs
pnpm check:compatibility
node scripts/quality/clone-pinned.mjs
pnpm test:pinned
```

本地缺tracked files时可显式 `--include-untracked` 作初始化证据，提交前跑默认tracked扫描。运行前确认不会指向真实个人Host/chat。测试用合成fixture、真实官方模块和隔离temp；external model IO scripted，而不是Mock Cordis/Session/Storage。

## 变更与审阅 / Changes and review

Open focused PRs linked to a concrete issue. List actual commands/results and unrun checks; update bilingual documentation with identical structure where appropriate. Preserve DeepSeek and bundled license notices. Do not edit audited pins merely to make failing tests disappear. Same npm version does not equal same upstream SHA.

[Risk policy](.github/risk-policy.json) determines required current-head HUMAN approvals: ordinary changes1，high/critical2；作者/bot/AI批准不计数。Changes to import, identity isolation, persistence, recovery/context, dependencies, workflows or release require explicit human inspection. After new commits/reviews, rerun the original governance PR job. No default auto-merge.

Maintainers activate real Code Owners and remote branch protection separately; [proposal](docs/engineering/BRANCH_PROTECTION.md) is not a claim they are already enabled.

## 隐私、安全报告与发布 / Privacy, reports and release

Only sanitized synthetic reproductions in public issues. Real chat exports, keys, Cookies and personal Host details stay out of repository/log artifacts. Report vulnerabilities via [SECURITY](SECURITY.md), not public sensitive attachments.

本项目只准备发布；npm/GitHub Release和仓库设置变更均要求单独的用户确认及人工protected-environment审批。AI可建议代码/测试，不提交approval或执行公开发布。

## 许可 / Licensing

Contributions use the [MIT license](LICENSE) and retain [NOTICE](NOTICE) attribution. Third-party additions require verified installed runtime license compatibility and provenance; no unrequested dependency for work Node stdlib/platform can do.

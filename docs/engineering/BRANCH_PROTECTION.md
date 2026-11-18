# 分支保护可执行建议 / Branch protection proposal

[CI/CD](CI_CD.md) · [English CI/CD](CI_CD.en.md) · [Review policy](../../.github/risk-policy.json)

## 状态 / Status

**仅交付建议与命令；未向远端执行，未宣称生效。** 本项目当前尚未确定公开仓库owner、人类维护者团队或私有计划能力。运行 [generator](../../scripts/quality/branch-protection.mjs) 只打印JSON/命令，连API都不访问；`--apply`刻意失败。

This is a proposal, not active remote enforcement. The generator performs no network request or setting change. Resolve the real repository, human maintainers and plan support before applying anything.

## 推荐规则 / Recommended rules

- `main` 禁force push/delete，管理员同样受限；linear history、resolve conversations。
- 至少1个人工PR review；dismiss stale、最后push作者之外的人批准、要求真实Code Owners。
- 必需状态采用**始终有结果的anchor**：CI `required`、Human risk review `review`。GitHub实际UI通常显示 `required`/`review` 或带workflow前缀，先观察实际 emitted context，再填JSON；不可照猜测字符串配置。
- 不把workflow级path过滤的Docs/E2E/Security/Matrix状态全设required，避免文档PR永久pending。涉及功能风险时，人类还检查相关workflow证据；CI anchor使用内部过滤。
- 关闭auto-merge、GitHub Actions创建/批准PR权限；AI不自批准。
- [Codeowners template](../../.github/CODEOWNERS) 目前全部注释，是**未启用模板**，确认存在的人类team/user后再激活；不要虚构机器人Codeowner。
- `v*` tag ruleset限制创建/更新/删除权限到发布维护者，禁止force更新；创建tag本身也是远端操作，需确认。

Minimum one human review, stale dismissal, last-push approval, real human Code Owners, current-head risk gate, strict always-emitted required checks, no force pushes/deletion/auto-merge. Do not require path-skipped workflows as universal status checks.

## 生成与人工应用 / Generate and manually apply

```bash
# Read-only generator. Replace identity; it does not call GitHub.
GITHUB_REPOSITORY=OWNER/REPO node scripts/quality/branch-protection.mjs --json > branch-protection.json
# Inspect the JSON and actual emitted required contexts before any remote action.
# AFTER explicit confirmation, a HUMAN maintainer may apply:
gh api --method PUT repos/OWNER/REPO/branches/main/protection --input branch-protection.json
# Read-back verification; include the receipt/output in a separate report:
gh api repos/OWNER/REPO/branches/main/protection
# Optional settings change, also a separate HUMAN-confirmed action:
gh api --method PATCH repos/OWNER/REPO -F allow_auto_merge=false
```

Generator默认示例context `required`、`review`，人工应用前需按实际 emitted context核对。GitHub API收到请求不等于所有规则有效，需读回branch protection和实际PR演练；本任务没有发上述PUT/PATCH/GET。

Default sample contexts are placeholders pending observed emitted names. An accepted request is not proof of effective enforcement; read back settings and exercise a real PR after applying. None of those remote commands was executed here.

## Bootstrap prerequisite / 首次初始化前提

本地fixedpoint5082575是空tree，risk-review脚本在bootstrap7db7a28才加入。首次PR的trustedbase尚无checker，job会明确失败而不是人类审批后自动转绿。计划中的远端仓库需人类在启用requiredreviewstatus之前审查初始化snapshot与gate、从可信main开始其后PR；如果现有base为空，不配置此status为required直到可信gate落地并实际运行。这个人工顺序不是AIapproval、不是auto-merge，也不授予PRhead修改gate的权限。本任务未执行远端初始化或设置。

## Release protected environment是另一道人工门

确认后维护者配置 **release**：required HUMAN reviewer（非initiator）、prevent self-review、disallow bypass、selected main branch及v* tag。不将AI判断接入approval。未配置保护时 `RELEASE_HUMAN_APPROVAL_CONFIGURED` 留空使准备job失败。若仓库计划不支持 required-reviewer，则维持关闭而非用无保护environment冒充人工审批。

YAML不能强制后台environment保护，environment变量也只是声明；维护者应在UI/API读回核验。当前 [release workflow](../../.github/workflows/release.yml) 零public write，仅本地artifact/Release草稿。

## 一手文档 / Primary references

- [Branch protection REST](https://docs.github.com/en/rest/branches/branch-protection)
- [Required status checks and skipped workflows](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks)
- [Protected environments: human reviewers/self-review/bypass/plan support](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [Code Owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

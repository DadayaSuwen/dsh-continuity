# Security reporting / 安全报告

## Supported baseline / 支持基线

Development preparation version0.1.0，Node24.22.3、npm DSH0.2.2-rc.4、exact source contract见 [COMPATIBILITY](COMPATIBILITY.json)。This document is not a public-release/support-SLA claim. Same npm version and audited GitSHA are validated separately; fixes should target the current reviewed baseline.

## Private reporting / 私下报告

If this repository has GitHub **Report a vulnerability** enabled, use that private advisory form. Otherwise contact the repository's human maintainer through a private channel they have actually published; request that channel without posting sensitive details. No fictional address or guaranteed response time is promised.

请提供经清洗的package/version、upstream SHA、OS/Node、错误码、最小合成重现和预期/实际结果。真实chat/ZIP、credentials、Cookie、个人网络地址或Host数据不要贴公开issue，也不要上传到普通Actions artifact。

## Response / 处理

Maintainers triage privately, reproduce with synthetic data and real official modules, rotate exposed credentials, remove affected logs/artifacts, develop a focused fix, request current-head human review, and coordinate disclosure after verification. A hash is integrity evidence, not encryption; backups contain private assets and require careful handling.

[Engineering controls](docs/engineering/SECURITY.md) · [English controls](docs/engineering/SECURITY.en.md) · [Test evidence](docs/engineering/TESTING.en.md)

Public npm/GitHub Release actions and remote settings changes are separately user-confirmed and human-reviewed. The shipped release workflow prepares artifacts only and has no publishing credential or public write.

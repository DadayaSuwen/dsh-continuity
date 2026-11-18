# Ecosystem audit (English summary)

[中文完整证据报告](ECOSYSTEM_AUDIT.md) · [Product requirements](../product/PRD.en.md)

## Evidence and scope

The 2026-11-18 audit cloned and reviewed ten actual repositories, inspected MIT license texts and commit-fixed implementations, and ran selected synthetic tests/probes. The Chinese report contains 117 validated SHA-fixed source references and a full pass/fail/not-run ledger. README/catalog claims are not treated as execution evidence.

The user supplied `dsh-hub.org/zh`; its guessed plugin routes returned 404. Other actual catalog snapshots were cross-checked rather than concluding projects did not exist. GitHub redirects changed `modusensus/dsh-mneme` to `slow-stack/mneme`, and `LeslieWylie/dsh-session-search-pro` to `YaoleWu`; catalog slugs can retain old owners.

## Repositories audited

| Repository                             | Actual version | Fixed commit                             |
| -------------------------------------- | -------------- | ---------------------------------------- |
| slow-stack/mneme                       | plugin 0.16.1  | 5b1f17a6606d164e743b6e9a8344c52e3af0fcc2 |
| GIT121995/dsh-memory-gate              | 0.15.0         | 4a440ceefb65cba89759fb03f8a88085e8144648 |
| FuRongJun-1999/dsh-memory              | 0.11.0         | 1b7331831e06b51e250057fa244a626be0116064 |
| hr98w/dsh-memory                       | 0.1.5          | a5239de8a524cf6cb0496ed43887560a57e15761 |
| Jesse-njx/dsh-memory                   | 0.1.0          | 2a1c9e561b8784bd390f1fd97f307c82abf96f9e |
| seriousz158/dsh-memory                 | 0.10.0         | f7b03757f8bf546d3c007f8e9a074a847b681d3d |
| csyangwen/dsh-memory-evolve            | 0.1.0          | 44b6b3eb65a1d50ceba0afb2c13acdd4a8b81423 |
| bwndlct/dsh-session-export             | 0.1.0          | eb18389192e36934718877fd7c6eb397f5cf1cd4 |
| huguangyu666/dsh-plugin-session-import | 0.1.3          | ff421f64e1e72eec8d977f20fa8bb1b2e9a16537 |
| YaoleWu/dsh-session-search-pro         | 0.2.0          | 82787487d75f6af3d0e1b219a19dec49b93213cb |

All root code licenses reviewed were MIT; a FuRongJun dataset has separate CC BY-NC terms and was not imported. Missing built main files in several source checkouts are build requirements, not proof of install success.

## Substantive findings

- **Mneme** has extensive SQLite/provenance/distillation/retrieval logic, but scope and strict scope default off. Even enabled strict scope hard-walls only explicit scope; a real synthetic store probe retrieved a foreign automatic-scope memory. Automatic model costs and imported-session exclusion require explicit configuration. Its official-import marker does not cover another importer's `provider=imported`.
- **Memory Gate** offers useful deterministic evidence/decision logic. Selected suites passed 64/64, yet synthetic A/B injection showed a shared service-level budget suppressing B after A. Session/workspace/global does not equal persona isolation.
- **hr98w** offers useful observation/receipt ideas, but its own two-process diagnostic reported both writers committed and a lost update for global and workspace stores. Exit zero meant the diagnostic completed, not CAS correctness.
- **Exporter** produces Markdown/custom JSON schema 1.0, not the official DeepSeek ZIP format. Its old fixtures passed while a real current `createToolResultMessage` lost text/error state. A pre-write barrier demonstrated a filename TOCTOU collision.
- **Jesse** has useful source citations but basename-based project identity and outdated tool-result adaptation; selected tests included genuine current-schema failures.
- **External importer** adapts four CLI history families, not DeepSeek official v3 ZIP. Most selected parser tests passed; one slug fixture failed due to C-drive/POSIX assumptions on Windows.
- **Search Pro** reads official SessionQuery. Its default search spans Host-visible conversations; optional cwd substring is not an owner/persona permission boundary. Selected suites with missing dsh-tools were not counted as passing.

## Reuse decision

Reuse official DSH Storage, SessionPersistence, SessionQuery and import converter. Borrow conservative gating, provenance/cursors, review receipts, source expansion and journal concepts—do not depend on these ten independent automatic injection systems as a combined character engine.

Known coexistence risks include duplicated loader ids (`dsh-memory`), tool names (`memory_update`, `memory_search`), separate schema stores, combined injection budgets and imported provenance mismatch. Default automatic summarization is not review-first character memory.

## Why install Continuity

The audited ecosystem does not form a reliable ready-made **official v3 ZIP → retained raw history → user-reviewed role/relationship/story memory → exact isolated new-session recovery → mobile transfer/backup** loop. Continuity adds that focused outcome rather than another global search/database/Agent runtime.

Data partitioning is exact owner + stable assistant + character + story from the first candidate; no inferred workspace tags or cross-character fallback. A single recovery assembler budgets the whole plugin envelope and keeps fiction separate from real user statements. Source assets remain independent from derived memory.

## Primary sources

- [Mneme fixed source tree](https://github.com/slow-stack/mneme/tree/5b1f17a6606d164e743b6e9a8344c52e3af0fcc2)
- [Memory Gate fixed source tree](https://github.com/GIT121995/dsh-memory-gate/tree/4a440ceefb65cba89759fb03f8a88085e8144648)
- [hr98w fixed source tree](https://github.com/hr98w/dsh-memory/tree/a5239de8a524cf6cb0496ed43887560a57e15761)
- [Exporter fixed source tree](https://github.com/bwndlct/dsh-session-export/tree/eb18389192e36934718877fd7c6eb397f5cf1cd4)
- [External importer fixed source tree](https://github.com/huguangyu666/dsh-plugin-session-import/tree/ff421f64e1e72eec8d977f20fa8bb1b2e9a16537)
- [Search fixed source tree](https://github.com/YaoleWu/dsh-session-search-pro/tree/82787487d75f6af3d0e1b219a19dec49b93213cb)

See the Chinese report for every other fixed source, exact lines and executed command/fixture outcomes. None of these competitor results substitutes for Continuity's own real DSH/mobile/live-model acceptance.

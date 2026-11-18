# Runtime evidence / 运行证据

## Baseline

- Git: <https://github.com/DeepSeek-ai/deepseek-harness/tree/ca33fd6843b205e279c7ccb6cb73a472c78f5760>
- Branch: master; commit timestamp 2026-11-17T22:17:01+08:00; version 0.2.2-rc.4.
- Node24.22.3 win-x64, pnpm11.28.5. Official Node archive SHA256 verified against nodejs.org published SHASUMS256.
- Official clone stays clean; standalone bundle project main is independent.
- Published rc.4 npm entry source differs from master in several packages. Both real published runtime and source-alias runtime are tested, with no promise that all package internals are byte-identical.

## Executed

| Check                                            | Actual result at 2026-11-18 21:00 CST                    | Evidence level                                                                          |
| ------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| TypeScript strict                                | Pass                                                     | installed official public declarations                                                  |
| ESLint src/tests/config                          | Pass                                                     | local source, all findings corrected                                                    |
| Full npm-runtime Vitest                          | 27/27, 10 files                                          | real Cordis/Storage/JSONL/AgentLoop/Workspace/Connection; scripted external model only  |
| Pinned source-mode                               | 13/13, 9 files before expanded security suite            | official + Cordis sources aliased to exact SHA, no Core changes                         |
| ZIP/JSON security                                | 16/16                                                    | synthetic hostile input, real preflight                                                 |
| Official CLI --help / web --help                 | Pass                                                     | real @deepseek-ai/dsh CLI                                                               |
| Official plugin --profile web add local checkout | Pass                                                     | isolated DSH_HOME, actual official Plugin Manager                                       |
| Official full Web launch with installed bundle   | Host ready, no inactive plugin warning after peers fixed | native official profile, actual full Web client pending browser flow                    |
| Native Slot browser launch                       | Pass                                                     | production Slot renderer; root harness supplies explicit no-selected-session source     |
| Mobile full workflow                             | In progress, previous failures retained                  | real phone viewport; first React/GET body mode defects fixed, remaining flow re-running |
| npm audit --prod high                            | 0 high/critical, 1 moderate                              | production closure separate from broad dev Host closure                                 |
| npm audit full dev closure                       | 5 high/8 moderate                                        | broad official CLI deps; unresolved dev advisories gate release until assessed          |

## Boundaries

No real user chats or API keys read. No paid model calls. No repository pushed, npm published or GitHub Release created. Github workflows prepared locally, cloud runs and branch protection not claimed active.

Private test credentials are ephemeral and live only in ignored test home; test report publication strips credentials. Fixed data is synthetic. Browser test assembly port3917/full official profile3918 are isolated from current running GUI3080.

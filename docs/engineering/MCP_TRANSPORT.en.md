# MCP transport dependency fix and execution evidence

[中文](MCP_TRANSPORT.md) · [Advisory research](../research/DEPENDENCY_ADVISORY_REVIEW.md) · [Runtime evidence](RUNTIME_EVIDENCE.md)

## 1. Fix scope

This round tests the **published official MCP probeServer** in the project development/CI dependency graph; Continuity gains no external memory service. Plugin Host/browser bundles do not import the MCP SDK. Official dsh-mcp-client0.2.2-rc.4 still declares SDK2.2.0; the [project workspace override](../../pnpm-workspace.yaml) resolves **@modelcontextprotocol/client2.3.0** without changing official source, DSH version or stableSHA.

The override applies only to this project's install graph. Adding the Continuity installer to another DSH Host does not automatically replace that Host's MCP dependency. Running GUI/productionHost and official checkouts are untouched.

The first-party [2.3.0 release](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2.3.0) and [GHSA-6prh](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-6prh-2h8m-c8cw) document default same-origin redirects and client2.3.0's fix boundary. The SDK manifest changes MIT toApache-2.0. It remains a developmentHost dependency, not copied into plugin bundles; the runtime license check still covers64manifests.

## 2. Real public test entrance

The [test script](../../scripts/check-mcp-transport.mjs) calls the published DSH public probeServer(ctx,config,options) with its actual nested SDK andCordis. Two NodeHTTP servers listen only on ephemeralloopback ports; JSON-RPC,headers andtool names are explicitlysynthetic. Transport/fetch is not mocked, and no real MCPserver is contacted.

Five checks cover directHTTP listing,same-origin307,cross-origin307,cross-origin302 andstdio startup/listing. A different port defines cross-origin. Destination-side header presence/body length are observed without realcredentials. Assertions require zero destinationrequests,failedprobe andcloseConfirmed. Stdio starts a realNodechild and removes its newly created fixture directory after closure.

## 3. Red → green evidence

| Actual nested SDK | Cross-origin307 destination            | Cross-origin302 destination          | Direct/same-originHTTP andstdio | Command result |
| ----------------- | -------------------------------------- | ------------------------------------ | ------------------------------- | -------------- |
| 2.2.0             | 5requests,5fixtureheaders,541bodybytes | 2requests,2fixtureheaders,0bodybytes | Passed                          | exit1          |
| 2.3.0             | 0requests,0headers,0bodybytes          | 0requests,0headers,0bodybytes        | Passed                          | exit0,5checks  |

Both failure and patched logs remain in ignored engineering evidence. Repeated confirmation passed. A302probe had ultimately failed while headers had already reached another port; destination observation,not merely a returned error,locks down this defect.

The same reproducible `pnpm test:mcp` runs before the original high-audit gate in [Security workflow](../../.github/workflows/security.yml). Thresholds/permissions are unchanged. Tests require no key,account orcloudservice.

## 4. Audit and regressions

Executed on2026-11-19(Asia/Shanghai):production audit **zero advisories**,fulldevelopment audit **zero advisories**,unchanged --audit-level high **exit0**. MCPmoderate disappeared after the actual SDKfix. Picomatch remains4.0.7; itsGHSAwaswithdrawn2026-11-18T15:38:56Z andtheregistry now omits it. That is feeddisposition, **not a shipped fix or proof that ReDoS is absent**. No advisoryignore orversion-check bypass was added.

Updated npmrc.4 andstableca33fdruntime each60/60;fullofficialWeb/nativeSlot phone8/8. The initial run during parallel installation timed out thecapacityfixture at30s. Its isolated run passed,andone-worker complete tracks each60/60. The failure remains;30s limits andtests were not weakened. Throughput of1001durablesourcefixture writes depends onHostload andisnot aproductperformance ceiling.

## 5. Reproduction and remaining scope

```bash
pnpm install --frozen-lockfile
pnpm test:mcp
pnpm test
pnpm test:pinned
pnpm test:mobile
pnpm audit --prod --audit-level moderate
pnpm audit --audit-level high
```

Actual Node24.22.3/pnpm11.28.5/Vitest4.1.12. MCP's5checks are independent of the60ContinuityVitest cases;the report does not relabel them as65Vitesttests.

OAuthregistration/refresh/issuer,cross-schemeTLS,proxies,realservers andeverytooloperation are untested. Node loopback checks do not establish browserSDK or existinguserHostremediation. Publishedrc.5consumption has separatemetadata/sourceidentity andfailure evidence. RealAppZIP,livepersonalityquality,deviceOS,cloudActions andhumanremotepublication remainopen.

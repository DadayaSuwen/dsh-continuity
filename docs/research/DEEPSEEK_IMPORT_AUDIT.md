# P0 官方 DeepSeek 导入源码证据审计

## 0. 基线、范围与证据等级

- 官方仓库：`deepseek-ai/deepseek-harness`；本次固定提交为 **`ca33fd6843b205e279c7ccb6cb73a472c78f5760`**，包版本为 **`0.2.2-rc.4`**。任务给定的 master/latestSHA 用作审计基线；以下结论固定到此提交，不随 master 后续移动。提交记录是 release/dsh-0.2.2 rc.4 同步到 master 的合并；[导入包声明][S-package]及[根运行要求][S-root]与此版本一致。
- 读取顺序：先使用官方 GitHub raw/API；主工程师提供的[共享 upstream 源码](D:/Desktop/dsh-continuity/upstream/deepseek-harness)就绪后，实际核对 `git rev-parse HEAD` 为上述 SHA，再只读核对本地源码行号。审计涉及的导入包、核心 Session、官方 bundle、CLI 入口与 Web 驱动相对 HEAD 的 `git diff --name-only` 没有输出。
- 唯一写入交付物是本报告；本委派没有另建 clone、没有改核心/官方测试、没有安装全部依赖、没有启动另一套 GUI、没有递归委派。
- 请求中的 `deepseek-chat-export-import.md` 实际对应[已实现 Agent Note][D-note]，不是包内同名实现文件。它是设计说明；实际行为以[导入编排][S-import-select]、[格式解析][S-format]、[转换 Implementation][S-conv-tree]和测试断言为准。

| 标记            | 本报告含义                                                   | 本次取得的证据                                                                                     |
| --------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **S：源码**     | 固定 SHA 的 Implementation、公开 exports、类型与实际调用顺序 | 核心导入源码全文；CLI/Web/Session/附件/工具相关源码及关键行                                        |
| **T：测试源码** | 官方测试里确实存在的输入、mock、断言；不是执行成功记录       | 核心转换/ZIP/编排、resume、composition 全文及上传/UI/mount 的用例与关键断言                        |
| **R：运行探针** | 本次真正执行的窄探针；注明运行环境与覆盖范围                 | 现有 Node `v22.23.2` 下，在内存中提取固定源码的时间函数、分支函数运行；本地 SHA 就绪后复核分支探针 |
| **D：文档**     | README、Agent Note 的目标、设计意图、承认的限制              | 固定 SHA 的 README 与 Agent Note；与 S/T 冲突处单列                                                |
| **I：静态推论** | 由控制流推导的限制，尚无对应负载或故障实测                   | 同一 ZIP slice 的 finished 队列峰值、部分取消窗口、报告缺口等                                      |

**测试执行状态：本次没有运行官方 Vitest、Web E2E、真实模型续聊、ZIP 压力或损坏包集成测试。** R 仅验证抽取函数，不等于完整包/完整依赖图加载或官方测试通过。主工程师已有 Node `v24.22.3` 工具链；官方根要求 Node `>=24.9.0`、pnpm `11.28.5`。[运行要求][S-root]

---

## 1. 给主工程师的 P0 结论

1. **现成的 deep module 已存在，优先复用。** 完整编排是 `importDeepseekChatExport(deps, request, signal)`；纯转换 seam 是 `convertConversation(file, options)`；ZIP seam 是 `openExportArchive(bytes, maxEntryBytes, signal)`。不要重新拼一套 THINK/工具/turn/surface 规则。[编排 Interface][S-import-deps]、[转换 Interface][S-conv-options]、[ZIP Interface][S-archive-interface]
2. **包根没有运行时 named 导出上述三个函数。** 根仅公开 default Host 插件、三种错误类及一组 type。明确公开且发布的 `./src/*` 是复用入口，例如 `@deepseek-ai/dsh-deepseek-chat-import/src/importer.ts`。`lib/types/importer.js` 一类路径不是 exports 声明的公共 seam。[根导出][S-index-exports]、[包 exports/files][S-package]
3. **直接调用 importer 不包含上传限额、owner admission、single-flight。** `maxUploadBytes` 与一 Host 一导入槽属于 Host/upload Adapter；直接调用的 limits 只有 `maxSessions/maxEntryBytes/maxTitleBytes`。这两个同名 `DeepseekChatImportLimits` 要起别名区分。[两种 limits][S-import-deps]、[wire types][S-wire]、[Host Adapter][S-index-host]
4. **输入仅是一个完整 ZIP 的 Uint8Array，格式仅 v3。** 接受 manifest 的 `export_format_version === 3`；目标是文档所述 2026-11-12 导出结构，新增字段部分 optional，不代表所有旧 v3/未来字段漂移都有兼容保证。[格式][S-format]、[版本门禁][S-import-select]、[文档目标][D-readme-limits]
5. **一会话只选一个祖先链；不是分支全部保留。** `current_message_id` 命中时决定终点；缺失/null/未知才选最大 message id。重复消息 id 全局检查，缺父/环只检查选中链；“child id 必大于 parent id”是注释假设，Implementation 没有强制。[树选择][S-conv-tree]、[分支测试][T-conv-tree]
6. **同一 archive 的 index 重复 id 去重，但跨导入完全没有去重账本。** 首个 index row 胜出；生产 createId 是 randomUUID；第二次导入创建第二组 Session。图片按规范化后内容去重，synthetic file id 按 export file id 哈希，均不是 Session 去重。[index 去重][S-import-index]、[生产 id][S-index-host]、[附件去重][S-image-store]、[文档][D-readme-limits]
7. **冷 Session 提交路径已经使用真正公共持久化 seam。** `Session.create` 校验 → `persistence.create` → append → flush → finally close → optional coldSnapshot → Workspace.attachSession。没有 live Agent，也没有跨三者的原子事务或 rollback。[writer][S-import-write]、[Session.create][S-session-create]、[持久化 Interface][S-persistence]
8. **完整审计报告不是现成公开能力。** 成功结果只有 workspace、Session ids、index 会话数、未尝试数、skipped；没有 source→Session 对照表、drop/mapping 计数、附件失败清单、ZIP digest、阶段提交记录。取消/中途 archive-level failure 不返回已提交 Session 列表；外部 Adapter/账本需要补这层可观测性。[wire result][S-wire]、[上传错误处理][S-upload-stream]
9. **ZIP 防护有有效 guard，也有已确认/文档承认的缺口。** 中央目录重名、声明 size cap、stored size 一致性、stream 超实际 size 都有检查；重复 local header 未去重，writer 没有额外 count cap；read 截断与 stream 报错的语义不同；同步 inflate 不被输出保留 cap 中断。[ZIP Implementation][S-archive-open]、[stream][S-archive-stream]、[size][S-archive-size]、[公开限制][D-readme-limits]
10. **文档有可影响验收的漂移。** 搜索 `snippet` 实际保留在 tool result 文本及 meta；README/Agent Note 的“snippet 不导入”与 S/T 冲突。非 JSON manifest 实际是 `unsupported-version`，不是泛称“损坏 manifest 一律 unreadable”。时间 parser 也比其 RFC3339 注释宽松。[搜索映射][S-conv-tools]、[formatter][S-tool-search]、[测试][T-conv-tools]、[metadata 测试][T-import-fail]、[时间][S-format-time]

---

## 2. 实际端到端入口：package → plugin → CLI/Web → 上传 → Session

```text
官方 OPTIONAL_BUNDLES / MORE_BUNDLES / EXPERIMENTAL_BUNDLES
  └─ @deepseek-ai/dsh-deepseek-chat-import（默认未选入 Web template）
       └─ dsh.bundle.patch → cordis.patch.yml
            └─ Host default DeepseekChatImportService
                 ├─ @Remote limits(signal)（不是 import Remote）
                 └─ connection.fetch.register(exact POST, streaming body)
                      └─ createUploadRoute(handler)
                           └─ bounded ZIP buffer
                                └─ importDeepseekChatExport(deps, request, signal)
                                     ├─ openExportArchive → manifest → index
                                     ├─ 第一 pass：选中会话的 image entries
                                     ├─ 第二 pass：选中 conversation entries
                                     ├─ convertConversation → Session.create detached 校验
                                     ├─ persistence.create → append → flush → close
                                     ├─ optional projectionCache.coldSnapshot
                                     ├─ Workspace.attachSession
                                     └─ failed candidates → 更老 index rows 补位

Web shell AppWebEntry / 插件 Client apply
  └─ mountImport(ctx, generated remote contribution)
       ├─ ctx.remote.$mount
       └─ sidebar.session.action HOC → ImportSessionsAction
            └─ ZIP File + workspace.picker
                 └─ limits → uploadArchive(XHR 或 page fetch carrier)
                      └─ progress/outcome NDJSON
                           └─ finally sessions.refresh
```

| Module / seam    | 所在位置                                                                           | 实际职责                                                                |
| ---------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 官方 bundle 目录 | [bundles:10–26,56–75][S-bundles]；[plugin-manager:51–85][S-bundle-ui]              | 可选、More 中列出、Experimental；Web 默认 template 只有 base/web-app    |
| bundle patch     | [cordis.patch:1–6][S-patch]                                                        | 只插入一个 id=`deepseek-chat-import` 的 Host row                        |
| Host Adapter     | [index:55–132][S-index-host]                                                       | dependency 注入、route、owner limits、单导入槽、卸载等待                |
| ZIP Module       | [archive:13–106][S-archive-interface]                                              | read-only archive Interface；stream selection/entry/reject；按名读取    |
| 格式 Module      | [format:12–147][S-format]                                                          | zod schema 与时间解析；不是全面校验 export 所有字段                     |
| 转换 Module      | [conversation:53–171][S-conv-options]                                              | deterministic tree→seed；caller 注入 id 与已存图片 ref                  |
| 编排 Module      | [importer:38–98][S-import-deps]                                                    | explicit dependencies；元数据、候选选择、图片/会话 pass、写入与补位     |
| upload Adapter   | [upload:21–95][S-upload-interface]                                                 | Fetch Request→bounded bytes→NDJSON；route 自身不核查 principal          |
| 浏览器 Adapter   | [client entry][S-client-index]、[mount][S-client-mount]、[upload][S-client-upload] | self-mount Remote、UI HOC、carrier/XHR、刷新                            |
| 正常续聊         | [resume 官方测试][T-resume]                                                        | JSONL 持久化后 `ctx.agents.resume`，真实 production loop 配 MockAdapter |

### CLI 定性结论

[CLI args][S-cli-args]的四种 invocation 是 profile、plugin、dump-config、dump-config-schema；[bin 分派][S-cli-bin]按此启动。`dsh web` 是启动 Web profile，`dsh plugin --profile web add <package>` 是 profile package 管理转发。[plugin Implementation][S-cli-plugin]没有导入 ZIP 的执行函数。

**此官方导入包没有独立 `dsh import-deepseek` 子命令，也没有 `--archive`/`--export-path` 参数提供者。** 包的 runtime 源码既没有 cmdline 注入，也没有 Host path/解压目录输入；导入是启用包后的浏览器上传，或工程自己的 Node Adapter 直接调用 public source seam。这个负结论来自已读 launcher 分派、包全部 Host 源码、包 exports，而不是“搜索没有找到一个字符串”单独成立。[Host][S-index-host]、[request][S-import-deps]

[Web main:1–40][S-web-main]只启动 `AppWebEntry` 并消费 shell injection；导入业务没有写入 Web main，UI 位置来自插件 slot。设计上这是已有真实 seam，而不是再在 CLI/Web 壳层复制业务分支。

---

## 3. 精确公共可复用导出与 Interface

### 3.1 已构建包的公开入口

| package specifier                       | 已见公开表面                                                                                                                                          | 使用限制                                                                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@deepseek-ai/dsh-deepseek-chat-import` | **default** `DeepseekChatImportService`；runtime `ExportEntryError/ExportSourceError/ExportConversationError`；`Config` 与导入/上传/转换/result types | 没有 named runtime `importDeepseekChatExport/openExportArchive/convertConversation/selectBranch/createUploadRoute`；`Config` 是 type，schema 在 class.static Config |
| `.../client`                            | runtime `apply(ctx)`, `inject`；Client injected/outcome/props/locale key types                                                                        | `uploadArchive`、`mountImport`、`ImportSessionsAction`没有从这个 entry re-export                                                                                    |
| `.../remote`                            | 生成的 Remote client contribution                                                                                                                     | 公开 exports 指向 lib 生成物；源码 checkout 未 build 时需测试配置的 stand-in；不是本地 importer                                                                     |
| `.../typert`                            | 生成的 Host Remote description                                                                                                                        | 与 build/generator 有关；不是 ZIP parser                                                                                                                            |
| `.../types`                             | browser-safe wire types                                                                                                                               | exports 只有 types 条件；应使用 `import type`，不要当 runtime 模块                                                                                                  |
| `.../src/*`                             | 明确 wildcard 公开 source subpath，并发布 `src`                                                                                                       | 实际扩展名 `.ts/.tsx`；不等于原始 Node 可直接加载所有源码；需已配置 TS 构建/别名与 dependency graph                                                                 |

证据：[exports/files/dependencies][S-package]、[根 re-export][S-index-exports]、[Client re-export][S-client-index]。

### 3.2 可直接引用的 source seam 及签名

```ts
// package.json 的 ./src/* 明确公开这些路径。
import {
  openExportArchive,
  ExportSourceError,
  ExportEntryError,
} from '@deepseek-ai/dsh-deepseek-chat-import/src/archive.ts';
import {
  convertConversation,
  selectBranch,
  messageTime,
  IMPORTED_MODEL_SOURCE,
} from '@deepseek-ai/dsh-deepseek-chat-import/src/conversation.ts';
import { importDeepseekChatExport } from '@deepseek-ai/dsh-deepseek-chat-import/src/importer.ts';
import { createUploadRoute } from '@deepseek-ai/dsh-deepseek-chat-import/src/upload.ts';
import {
  exportManifest,
  exportSessionIndex,
  exportSessionFile,
  parseKnownFragment,
  parseExportTime,
  SUPPORTED_EXPORT_FORMAT_VERSION,
} from '@deepseek-ai/dsh-deepseek-chat-import/src/format.ts';
import { UPLOAD_PATH, UPLOAD_ROUTE } from '@deepseek-ai/dsh-deepseek-chat-import/src/protocol.ts';

// 浏览器 source seam；不是 /client 的 runtime named 导出。
import { uploadArchive } from '@deepseek-ai/dsh-deepseek-chat-import/src/client/upload.ts';
```

下面按源码抄录 type-level 表面；Interface 还包括本报告的前置条件、错误、副作用、排序与资源限制。

```ts
openExportArchive(
  archive: Uint8Array,
  maxEntryBytes: number,
  signal: AbortSignal,
): Promise<ExportArchive>

interface ExportArchive {
  stream(handler: ExportStreamHandler, signal: AbortSignal): Promise<void>
  read(entry: string, signal: AbortSignal): Promise<Uint8Array | undefined>
}
interface ExportStreamHandler {
  select(entry: ExportEntryInfo): boolean
  entry(entry: ExportEntryInfo, data: Uint8Array): Promise<void>
  reject(entry: ExportEntryInfo, error: ExportEntryError): void
}
interface ExportEntryInfo {
  readonly name: string
  readonly size: number
  readonly originalSize: number
  readonly compression: number
}

selectBranch(file: ExportSessionFile): readonly ExportMessage[]
messageTime(message: ExportMessage): number
convertConversation(
  file: ExportSessionFile,
  options: ConvertConversationOptions,
): ConvertedConversation
interface ConvertConversationOptions {
  readonly createId: () => string
  readonly maxTitleBytes: number
  readonly images?: ReadonlyMap<string, ImageAttachmentRef> // key=export file id
}
interface ConvertedConversation {
  readonly title: string | null
  readonly createdAt: number
  readonly events: readonly SessionEvent[] // seq 从 0 连续；无 end-seed
}

importDeepseekChatExport(
  deps: DeepseekChatImportDependencies,
  request: DeepseekChatImportRequest,
  signal: AbortSignal,
): Promise<DeepseekChatImportResult>

createUploadRoute(
  handler: UploadRouteHandler,
): (request: Request) => Promise<Response>

// local Host service method；browser generated Remote 在 mount 中包装成 outcome。
DeepseekChatImportService.limits(signal: AbortSignal): DeepseekChatImportLimits

uploadArchive(
  file: Blob,
  workspaceId: string,
  onProgress: (progress: UploadProgress) => void,
  signal: AbortSignal,
): Promise<UploadAnswer>

// /client entry 公开
apply(ctx: Context): Promise<() => Promise<void>>
```

签名证据：[ZIP][S-archive-interface]、[open][S-archive-open]、[树/转换][S-conv-tree]、[options][S-conv-options]、[编排][S-import-select]、[route][S-upload-interface]、[limits][S-index-host]、[browser upload][S-client-upload]、[client apply][S-client-index]。

### 3.3 编排依赖对象：最低可实现表面

```ts
interface DeepseekChatImportDependencies {
  readonly persistence: {
    create(
      header: SessionHeader,
      options: { signal: AbortSignal },
    ): Promise<Pick<SessionHandle, 'append' | 'flush' | 'close'>>;
  };
  readonly projectionCache?:
    | {
        coldSnapshot(
          header: SessionHeader,
          inheritedEventCount: SessionLogOffset,
          events: readonly SessionEvent[],
        ): unknown;
      }
    | undefined;
  readonly attachments?:
    | {
        saveImage(input: SaveImageAttachment): Promise<ImageAttachmentRef>;
      }
    | undefined;
  readonly workspaceRegistered: (workspaceId: string) => boolean;
  readonly createId: () => string;
  readonly warn: (message: string) => void;
}
interface DeepseekChatImportWorkspace {
  readonly id: string;
  readonly path: string; // 现存、canonical absolute directory
  attachSession(sessionId: SessionId): Promise<void>;
}
interface DeepseekChatImportRequest {
  readonly archive: Uint8Array;
  readonly workspace: DeepseekChatImportWorkspace;
  readonly limits: {
    readonly maxSessions: number;
    readonly maxEntryBytes: number;
    readonly maxTitleBytes: number;
  };
  readonly onProgress: (done: number, total: number) => void;
}
```

[完整依赖/request Interface][S-import-deps]明确接受 dependencies，而不是自己创建持久化/Workspace。这提供较高 leverage：可以接真正 SessionPersistence，也可以在工程 Adapter 中包住创建/提交日志；不必改 Implementation。

注意：

- `workspace.path` 除 type 注释外还被 `stat().isDirectory()` 实际检查；production registry Workspace 自带 canonical path。直接使用伪对象不是绕开文件系统存在性的方法。[workspace guard][S-import-select]、[directory helper][S-import-write]
- `createId()`供应 Session、message、tool-call id，应是唯一且满足 downstream 存储约束的字符串。`warn/onProgress`是同步 callback，无异步等待；其异常可能使编排提前结束，适合不可抛异常的观测 Adapter。[report/id][S-import-select]、[writer][S-import-write]
- `projectionCache.coldSnapshot`返回值被忽略且没有 await；真实 cache 内部写回是 fire-and-forget。自定义实现若同步抛异常，已经写完的 Session 会被本轮归入 skipped；若返回 rejected Promise，当前编排没有等待它。[writer][S-import-write]、[实际 cache][S-cache]
- `saveImage`的 Interface 没有 AbortSignal；取消只能在调用前后和 archive chunk/编排检查处协作，等待此 Promise 的期间没有通用中断能力。[图片 pass][S-import-images]、[卸载测试][T-composition-cancel]

### 3.4 必须区分的同名类型

```ts
import type { DeepseekChatImportLimits as BrowserUploadLimits } from '@deepseek-ai/dsh-deepseek-chat-import/types';
// BrowserUploadLimits = { maxUploadBytes: number }

import type { DeepseekChatImportLimits as ImportExecutionLimits } from '@deepseek-ai/dsh-deepseek-chat-import/src/importer.ts';
// ImportExecutionLimits = { maxSessions, maxEntryBytes, maxTitleBytes }
```

包根 re-export 的 `DeepseekChatImportLimits`来自 wire types，不来自 importer。照名字推测字段会接错。[根 types 来源][S-index-exports]、[wire][S-wire]、[execution limits][S-import-deps]

### 3.5 编译与依赖闭包限制

- 正常挂插件：依赖 `typert/connection/sessionPersistence/workspaceRegistry`；`sessionProjectionCache/attachments` optional。schema 默认 `1000 / 512MiB / 256MiB / 80 UTF-8 bytes`。[Host][S-index-host]
- source 编排 runtime imports：Node fs/path、dsh-brand、dsh-session、conversation、format、archive；archive 需要 fflate；format 需要 zod；conversation runtime 又需要 session-title 与 tool-web 的 formatter/meta helper。[编排 imports][S-import-deps]、[转换 imports][S-conv-options]、[archive imports][S-archive-interface]、[格式][S-format]
- 包 manifest 的普通 dependency 是 dsh-brand、typert-protocol、schemastery、fflate `^0.8.2`、zod `4.6.6`；peer 是 cordis、session、session-title、tool-web。许多 import 用到的其他 DSH 包是 type-only 或测试/build 依赖，见[声明][S-package]与[host tsconfig references][S-import-tsconfig]；不要仅拷三个 TS 文件后假定没有其余 runtime closure。
- `./src/*`的“公共可见”不等于“可裸 Node import”。例如 LogBuilder 有 TypeScript parameter property，Host class 有 parameter property/Remote decorator；源码 TS 的运行还涉及 node_modules TS 处理和 workspace bare import 解析。工程应使用已有 bundler/TS loader/alias，或构建自家 Adapter，固定 upstream SHA。[LogBuilder][S-conv-events]、[Host constructor][S-index-host]
- 本次验证了 source exports 与 files 声明，没有下载 npm tarball/执行 publint/真实发布包消费。**发布产物的实际闭包与导出行为仍需独立 consumer smoke test。**

---

## 4. ZIP 版本与 manifest/index/会话结构

### 4.1 实际识别的是内部 entry，不是文件名

入口读取 `manifest.json`、`chat_session_index.json`；主 pass 的会话名匹配 `^chat_sessions/([^/]+)\.json$`，图片名匹配 `^chat_sessions/([^/]+)_files/[^/]+$`。用户 ZIP 名是否为 `deepseek_data-*.zip`没有被 Host 检验；UI accept 是文件选择提示，真正 ZIP 判定在 archive parser。[命名常量][S-import-deps]、[UI input][S-ui-file]、[ZIP open][S-archive-open]

### 4.2 schema 事实

| 对象              | 实际要求/转换                                                                                                               | 未读取或未做更强限制                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| manifest          | object；`export_format_version` number；编排随后必须等于 3                                                                  | exporter version/date/user 等字段不是门禁                                    |
| index             | array；每行非空 string id、string inserted_at/updated_at 经时间函数转换                                                     | index title/pinned/message_count 不参与校验/排序结果内容                     |
| conversation      | 非空 string id；title=`string                                                                                               | null`；current_message_id=`nonnegative integer                               | null | absent`；inserted_at string；messages array | 不核对 JSON 内 id 与文件名/index id 一致；顶层 inserted_at 没用于 header 时间 |
| message           | id nonnegative int、parent_id nonnegative int/null、role USER/ASSISTANT、status string、inserted_at string、fragments array | parent-child id 大小关系不校验；timestamp 到选中消息转换时才解析             |
| fragment envelope | loose object，type string                                                                                                   | 未识别 type 保留 envelope 后返回 undefined/忽略；已识别 type 再做专用 schema |
| file              | id/file_name string、file_size 非负整数 optional 默认 0、is_image boolean、export_path string/null                          | export 宽高、token_usage 等不拿来充当真实 stored ref                         |

证据：[format:12–118][S-format]、[parseKnownFragment/time][S-format-time]、[parseConversation/imagePlan][S-import-image-plan]。

已识别的 fragment type 有 REQUEST、RESPONSE、THINK、TEMPLATE_RESPONSE、TOOL_SEARCH、TOOL_OPEN、TOOL_FIND、READ_LINK、TOOL_IMAGE_SEARCH、PARTIAL_FILE_READ、TIP、FILE。`CONTENT_RISK`不是已识别 schema，走未知 type 忽略。**“忽略显示”与“忽略验证”有区别：**已识别但后续不映射的 TIP/TOOL_FIND 等仍会经过 schema parse，缺字段会让选中会话转换失败；未知 type 才是不检查内部 payload。[fragment schema][S-format]、[fragmentsOf][S-conv-status]

### 4.3 元数据失败分支

- ZIP 不可读或中央目录有同名条目：`unreadable-archive`。
- 没有 manifest entry：`missing-manifest`；manifest entry 解压损坏：`unreadable-archive`；entry 超限：`too-large`。
- manifest bytes 能交付，但不是 JSON/shape 错误/version 非 3：**`unsupported-version`**。
- index 缺失、解压损坏、JSON/shape/time 错误：`missing-index`；index entry 超限：`too-large`；去重后零行：`no-conversations`。

这些步骤发生在图片/会话 pass 之前，尚无本次 Session 写入。[metadata/version][S-import-select]、[readMetadata/parseIndex][S-import-index]、[失败测试][T-import-fail]

---

## 5. chat_session_index：选择、顺序、补位与去重

### 5.1 算法与语义

1. 全部 index rows 先通过 schema；然后 `Map<id,row>`去重，**第一条同 id row 保留**，不是选重复条目里最新时间。
2. 排序：updatedAt 降序 → insertedAt 降序 → id 字典顺序升序。
3. `total = min(maxSessions, unique index rows)`；chosen 取前 total 行；初始进度 `(0,total)`。
4. 主 pass **按 archive local entry 顺序**处理 chosen，会话大小/转换/存储失败均计 skipped，并形成 outstanding。
5. pass 后补报 index 指定但 ZIP 未交付的 chosen；从剩余 rank 更老的行逐个按名读取；成功补一个 outstanding，失败继续更老候选。
6. 成功 `sessionIds`最后按 index rank 排序，即**最新优先**，与写入顺序不同。
7. `omittedByLimit = ranked.length - next`，表示**没有尝试到的 index 行**，不是“全部超过初选 K 的行”。失败触发补位后，该值会下降。

证据：[选择/主 pass/补位][S-import-select]、[index 去重排序][S-import-index]；[排序与进度测试][T-import-order]、[补位测试][T-import-replace]、[index 重复行测试][T-import-dedup]。

### 5.2 三种“去重”不要混用

| 层次                   | 实际机制                                                                | 结论                                                             |
| ---------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| index row              | 同 id 首条 Map 去重                                                     | 一个正常 ZIP 的 index 重复 row 不重复导入                        |
| message node           | 重复 id 抛 ExportConversationError                                      | 不是内容去重/合并；只用于树一致性                                |
| Session across imports | randomUUID、新 header、新 writer                                        | 重导生成新 Session；没有 archive/conversation fingerprint ledger |
| 图片 blob              | attachment-local 规范化 bytes 的 SHA-256 + immutable object EEXIST 校验 | 相同规范化内容复用对象，不代表会话已导入                         |
| synthetic file card    | SHA-256(`deepseek-chat-export:` + file.id)                              | deterministic ref 没有文件 bytes；不是附件 object 的内容哈希     |

[树][S-conv-tree]、[id生产][S-index-host]、[synthetic ref][S-conv-files]、[附件内容地址][S-image-store]。

### 5.3 本地工程若需要可恢复/去重报告

现有结果没有 conversationId→SessionId 成功对应关系。只拿 `sessionIds`与 `skipped`，尤其 archive 顺序不同、补位、写后 attach 失败时，不宜推断对应表。需要在工程自己的 Adapter/导入账本记录源 ZIP digest、源会话 id、选中终点、映射策略版本、提交 Session id、阶段与 outcome；不能把 synthetic file id 当作会话键。[结果结构][S-wire]、[rank/id流程][S-import-select]

这不是要求新增一种 core Session event。复用 converter/persistence 的既有 seam，在导入域自己的 metadata/report 中记录，保持 core 不变，locality 更好。

---

## 6. 消息树、分支、状态与事件映射

### 6.1 selectBranch 的真实检查范围

- 构造全 messages id Map；duplicate id 即整会话失败。
- 选中 current id，或最大 id fallback；沿 parent_id 回 root/null，再 reverse。
- 父节点缺失时报错；若链长度到所有节点数仍未回 root，报 cycle。
- 全部弃分支的缺父/环不走；最大 id 是 leaf 的结论依赖 exporter invariant，源码没有 leaf 检查；current id 可以是内部节点，不必 leaf。

[S][S-conv-tree]与[T][T-conv-tree]支持正常分支/fallback/重复/选中链错误。R 已实际验证：选中 root=1、弃支 node=2 指向不存在 parent=999，返回 `[1]`；最大 id=10 的 root 有 child id=2 时 fallback 返回 `[10]`。因此上线若承诺“全树完整校验”，要在工程 Adapter 补，而不是把 selectBranch 名称当成这个保证。

### 6.2 USER/ASSISTANT 成 turn

选中链按顺序扫：每 USER 开一个 turn；只把紧接其后的 ASSISTANT 当 reply。孤立 ASSISTANT 丢弃；连续 USER 可以产生无回复 turn。USER 本身 status 不拿来排除。reply status=`CONTENT_FILTER`时**USER+reply 全轮删除**，turn 编号无缺口；全会话只剩这种 round 时 conversion 抛错，进入 skipped。[convert:140–171][S-conv-options]

除 CONTENT_FILTER 的提前删除外，reply fragments 先解析/拆 step，再判断 status/template；因此非 FINISHED reply 中 malformed 的已识别 fragment 仍可能导致整会话 skipped，不一定落成普通 turn error。[turn:203–209][S-conv-events]、[fragment parse][S-conv-status]

### 6.3 事件结构与 source

```text
turn/start {turn:n}
step/start {turn:n,step:1}
  首轮额外 system/message(content:[], source:system-prompt, surfaceOp:append)
user/message {id,role:user,source:{kind:user},content}, surfaceOp:append
  可导入 reply 的每 step：
    assistant/message {turn,step,message,stream:[]}, surfaceOp:append
    tool/call ...（先写本 step 全部 call）
    tool/result ...（再写本 step 全部 result）
      surfaceOp:append, sourceEventSeqs:[对应 tool/call seq]
    step/end
  后续 step/start...
最后 step/end
turn/end {turn,reason:{kind:completed} 或 {kind:error,error:{code,message}}}
首轮结束后 optional session/title {title,messageSeqs:[],source:{kind:user}}
```

assistant source 固定 `{kind:'model',provider:'deepseek-chat-export',model:'deepseek-chat-export'}`，没有 replayState；stream 是空数组；没有编造 request/header、request/context、model/selection、usage、per-token timeline。tool-call block id、tool/call.callId、result source.callId/toolCallId 共用 caller createId 生成的同一值。[事件 builder][S-conv-events]、[source/tool result][S-conv-tools]

首轮空 system head 是关键：给 surface node 0 占位，续聊时由 production Agent 替换成真实 system prompt，而不是在历史后面 append 第二个头。[resume断言:108–116][T-resume]。不要删除这个“看起来为空”的事件。

### 6.4 排除 reply 的固定 code

| 原回复                                                        | 写入 turn/end error code                                            | 保留 USER？ |
| ------------------------------------------------------------- | ------------------------------------------------------------------- | ----------- |
| CONTENT_FILTER                                                | 整轮无事件                                                          | 否          |
| 包含 TEMPLATE_RESPONSE                                        | `DEEPSEEK_EXPORT_TEMPLATE_RESPONSE`；error.message 是第一条模板文本 | 是          |
| FAILED / TIMEOUT / CONTEXT_LENGTH_EXCEEDED / INCOMPLETE / WIP | `DEEPSEEK_EXPORT_` + 对应固定状态                                   | 是          |
| 其他非 FINISHED 状态                                          | `DEEPSEEK_EXPORT_UNFINISHED_REPLY`                                  | 是          |
| FINISHED 但无可导入 step                                      | `DEEPSEEK_EXPORT_EMPTY_REPLY`                                       | 是          |
| USER 之后无 ASSISTANT                                         | `DEEPSEEK_EXPORT_NO_REPLY`                                          | 是          |

template 高于一般 status，高于 empty；错误文本包含未知状态，但 code 不从未受控字符串动态构造。没有 `assistant/attempt`；被排除 reply 文本不进 derived model history。[status Implementation][S-conv-status]、[状态/withdrawn测试][T-conv-status]

---

## 7. 时间与标题：保留的是归一化语义，不是原始精度

### 7.1 时间

- index inserted_at/updated_at 解析成 epoch milliseconds，用于排序；message inserted_at 在 selected turn 转换时解析。
- `parseExportTime`实际 `Date.parse(value)`，再检查 safe integer 且 `>=0`。没有 RFC3339 正则/UTC-only 约束，日期-only 与合法时区 offset 也被接受；精度高于毫秒部分按 JS Date 结果损失。[time函数][S-format-time]
- LogBuilder cursor 初始 0；每个用户/回复时间 `max(oldCursor,messageTime)`，所以事件非递减；assistant 原始时间稍早于 USER 时 clamped。
- 每 step 所积累的 THINK `elapsed_secs`先 `Math.round(sec*1000)`，在写 assistant/message 前加到 cursor；后续 tool/result/step_end/turn_end 与随后 steps 继承推进后的时间。不是把每 THINK 当独立事件计时。
- header.createdAt 是**剩余首轮首 event 时间**，不是 conversation 顶层 inserted_at，也不是 import 当前 clock；首轮 withdrawn 会改变有效 createdAt。

[builder时间][S-conv-events]、[THINK accumulation][S-conv-steps]、[writer header][S-import-write]；[时间测试][T-conv-time]、[withdrawn createdAt测试][T-conv-status]。

I：schema 对 elapsed_secs 是非负数而非小上界；极大 duration 的算术可能使后续时间违反 Session safe-integer guard，实际 writer 会在 seed validation 阶段跳过该会话。没有做极值运行测量。

### 7.2 标题

`normalizeSessionTitle(input,maxTitleBytes)`不仅合并 whitespace，还清除 OSC/CSI/ESC、部分控制字符和 directional/invisible controls，UTF-8 code-point-safe 截断，trimEnd；空标题写 null/不产 title event。title event 的 source=user 固定，不触发导入时模型生成标题。[normalize][S-title-normalize]、[converter][S-conv-options]、[标题测试][T-conv-time]

`maxTitleBytes`与 deployment 的 session-title 设置分开，Host 默认 80；更改一边时应同步另一边。[Host Config][S-index-host]、[文档限制][D-readme-limits]

---

## 8. 附件：图片实存与 synthetic file card

### 8.1 图片 pass 与实际字节

第一 pass 在任何 chosen conversation JSON parse 之前执行，按 archive entries 保存其 `_files/`图片；只处理选中会话 id、单层 leaf entry；扩展名 case-insensitive png/jpg/jpeg/webp/gif。source bytes 不用 exported file_size/width/height 背书。[图片 pass][S-import-images]

调用 `attachments.saveImage({data,mediaType,name})`；mediaType 由扩展名推导，name 去掉前缀 UUID+`_`（旧 `_`/`-`均识别）。存储 Adapter 自己检查 encoded bytes、实际图像类型、dimensions 与 normalization policy；返回 ref 才是可信 stored facts。[name/type helper][S-import-image-plan]、[attachment store][S-image-store]

第二 pass 用 selected branch 中 USER FILE 的 export_path 查第一 pass 的 Map，再以 file.id 为 options.images key。主路径没有每图片 `archive.read`，因此不会随图片数做 N 次中央目录扫描。[imagePlan/ref lookup][S-import-image-plan]、[无 by-name 图片读取测试][T-import-images]

### 8.2 降级与缺失

| 场景                                            | 结果                                        | 观测                                                               |
| ----------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| 图片 entry 存储成功且 selected FILE 引用        | image ContentBlock +真实 ImageAttachmentRef | ref 是存储返回值                                                   |
| 缺失、超限、解压损坏、不支持类型、saveImage失败 | synthetic file ContentBlock                 | attachments mounted 时，引用图片对应 Host warn；不影响会话正常导入 |
| attachments 未挂载                              | 全部文件 synthetic card；不走 image pass    | 这条分支**没有逐图 warn**，与泛称“每个没存图片都有日志”不同        |
| FILE.is_image=false                             | synthetic file card，即使有 export_path     | 无通用 saveFile 正文导入路径                                       |
| 同会话弃支/withdrawn轮/最终转换失败的图片       | 第一 pass 已存 bytes，但可能无 event 引用   | 没有 importer cleanup/remove seam                                  |

证据：[图片实现][S-import-images]、[converter附件内容][S-conv-events]、[synthetic][S-conv-files]、[无attachment测试][T-import-no-attachments]、[全 selected 图片保存测试][T-import-images]。

### 8.3 synthetic reference 精确定义

```ts
attachmentId = 'sha256:' + sha256('deepseek-chat-export:' + file.id)
name = exported file_name 的 leaf，去 C0/DEL control，trim；空后取 'file'
bytes = file_size；旧导出缺该字段默认 0
```

该 ID 不是文件内容 SHA；没有创建 attachment object，也没有 bytes。从标准 LlmRuntime 续聊时所有 file block 都被 `projectFilesToText`转为 fileHandleText，ref 能构造 path 的情形指向并不存在的对象；环境/ref 无效时返回 no-path 文本。不要在 UI 或报告承诺“文件完整迁移”。[synthetic函数][S-conv-files]、[标准file投影][S-llm-files]、[Runtime投影][S-llm-runtime]

图片保存 dedup 以**规范化后 bytes**的 SHA 为键，可能缩放/重编码，不是原始 ZIP image 一字节不差复制。附件 saveImage 默认 encoded bytes 上限另有 50MiB 等资源策略，所以 importer 的 256MiB entry cap 不代表附件 store 会接受那个体量。[attachment-local配置与save][S-image-adapter]、[normalize/digest][S-image-store]

---

## 9. 思考、搜索、链接与“报告”内容保真

### 9.1 fragment 映射矩阵

| Fragment                                                | 实际写入                                                   | 损失/条件                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| USER REQUEST                                            | 多 REQUEST 用换行连接为 text，附件排在 text 前             | 空白 text 且无附件时保留一个空 text block                                |
| THINK                                                   | reasoning block，elapsed 参与 step 时间                    | 空 content 不写 reasoning；仍累积 elapsed                                |
| RESPONSE                                                | text block                                                 | 仅空字符串不写；whitespace-only 非空内容仍按 text 保存                   |
| TOOL_SEARCH                                             | `web_search {queries}`、tool result文本+meta               | WIP忽略；FAILED固定 error；缺status等同正常；其他status也走普通成功分支  |
| TOOL_OPEN                                               | `web_fetch {url}`、tool result文本+成功meta                | WIP/空url忽略；非 FINISHED（除WIP）固定error；成功 statusCode=200 为推定 |
| READ_LINK                                               | `[title](url)`每结果一行；缺title则label=url；缺url仅title | signature/加密正文未保存；不对链接做Markdown转义/URL协议强验证           |
| TEMPLATE_RESPONSE                                       | 使整个reply排除，写 turn error                             | 模板正文不是assistant/model content                                      |
| TOOL_FIND / TOOL_IMAGE_SEARCH / PARTIAL_FILE_READ / TIP | 无 message/tool 映射                                       | 仍属于known schema，malformed 可让conversion失败                         |
| CONTENT_RISK / unknown                                  | 无映射                                                     | unknown envelope不检查payload                                            |
| 非图片 FILE / 未存图                                    | synthetic file                                             | 没有文件正文迁移                                                         |

[USER/events][S-conv-events]、[step转换][S-conv-steps]、[status/files][S-conv-status]、[工具/links][S-conv-tools]。

“报告”如果指 assistant RESPONSE 中的报告文字，作为普通 text 保存；如果指 PDF/Word FILE，则只有 synthetic card；如果指 READ_LINK 的外部报告页，则只有链接/标题而无网页正文。没有独立 REPORT fragment/报告对象 schema；unknown fragment 会被忽略。验收宜区分这三者。[格式全表][S-format]、[工具 notice][S-conv-tools]

### 9.2 搜索结果确切保留字段

成功 search 构造 sources 的 `url/title/snippet/publishedAt`，过滤 null/blank optional text；`site_name`没读取。结果文本复用 `formatSearchOutput`，包括外部内容提示、sources list、snippet/excerpt与发布日期、引用URL说明；meta 使用 `searchMetaFromValue`保存结构化 sources，truncated=false。[search mapping][S-conv-tools]、[formatter/meta][S-tool-search]

重要边例：FAILED 搜索分支发生在 `queries.length===0`检查之前，所以 FAILED+全空queries 仍可写 error tool call；文档的“所有query为空便忽略”不覆盖此分支。普通/缺status search 的空queries才忽略。[search:438–445][S-conv-tools]

### 9.3 step/并行调用关系

- text/reasoning/READ_LINK 遇到已有 tool call 时结束当前 step，再开下一 step。
- 非 null stage_id 的连续 calls，stage 相同合并；不同 stage split；尚无stage的text-only step会被第一call采用stage，避免 stranded non-final text-only step。
- 未stage call不改已有stage；WIP/空url/ignored notices不建call、不split。
- 同 step assistant.content 是 content group 后跟 call blocks；随后先发全部 tool/call events，再发全部 tool/result，维持标准并行工具历史形状。

[step Implementation][S-conv-steps]、[事件顺序][S-conv-events]；[stage测试][T-conv-stage]。

### 9.4 续聊模型表面

导入不发模型请求。之后 resume 使用正常 deployment 选择；保留 USER、reasoning、工具调用/结果、RESPONSE与链接文本，被排除 reply 与 CONTENT_FILTER轮不进入模型历史。[resume test:76–125][T-resume]

DeepSeek serialize 将 reasoning 转 thinking；无原生 replay signature 时为 unsigned thinking；空 user/assistant message跳过；图像输入由 modality处理，file先经 LlmRuntime转 handle text。[DeepSeek序列化][S-serialize]、[Runtime][S-llm-runtime]。因此“显示一条空问题”不等于“模型请求会包含一个空 user message”。

I/D：初次续聊的token/KV-cache成本、任何特定provider对未声明历史工具名的接收能力，本次未做真实模型实测。导入未写 request/header.tools，部署需确保历史 web_search/web_fetch 兼容。Agent Note也承认了这项后果。[文档后果][D-note-consequences]

---

## 10. Session 提交：公共持久化 seam、非原子后置步骤

### 10.1 官方 writer 顺序

```ts
const id = brandString<SessionId>(deps.createId());
const header: SessionHeader = {
  version: SESSION_FORMAT_VERSION, // 此 SHA 为 4；与 export 格式 3 分开
  id,
  createdAt: conversion.createdAt,
  cwd: workspace.path,
  isSeeded: false,
};
Session.create(id, conversion.events, header); // detached；返回实例丢弃
signal.throwIfAborted();
const handle = await deps.persistence.create(header, { signal });
try {
  await handle.append(conversion.events);
  await handle.flush();
} finally {
  await handle.close();
}
deps.projectionCache?.coldSnapshot(header, brandNumber<SessionLogOffset>(0), conversion.events);
await workspace.attachSession(id);
// 然后才 imported.push 与 progress(done,total)
```

[writer与attach][S-import-write]、[成功计数][S-import-select]；[Session format=4][S-session-format]。

### 10.2 公共方法（可复用，不调用私有实体）

```ts
Session.create(
  id: SessionId,
  seed?: readonly SessionEvent[],
  header?: SessionHeader,
  inheritedEventCount?: SessionLogOffset,
  projections?: readonly SessionMessageProjection[],
): Session

SessionPersistence.create(
  header: SessionHeader,
  options?: SessionPersistenceCreateOptions,
): Promise<SessionHandle>

SessionHandle.append(events: readonly SessionEvent[],
  options?: SessionHandleAppendOptions): Promise<void>
SessionHandle.flush(options?: SessionHandleFlushOptions): Promise<void>
SessionHandle.close(): Promise<void>

SessionProjectionCache.coldSnapshot(
  meta: SessionHeader,
  inheritedEventCount: SessionLogOffset,
  events: readonly SessionEvent[],
): ProjectionSnapshot

Workspace.attachSession(sessionId: SessionId): Promise<void>
```

[Session.create签名与校验][S-session-create]、[Persistence公开class][S-persistence]、[Handle][S-handle]、[Cache][S-cache]、[Workspace实体实现][S-workspace-attach]。

### 10.3 校验与 end-seed 细节

`Session.create`逐seed snapshot lossless JSON；检查 envelope、seq从0连续、message shape、surface transition；header version/id、createdAt非负safe int、cwd absolute等也校验。[Session Implementation][S-session-create]、[header guard][S-session-header]

**它内部会给 detached Session副本追加普通 `session/end-seed`。官方writer随后写的是原始 `conversion.events`，不是返回Session的snapshot，所以存储仍没有这个marker。**普通resume在第一次打开时再追加；不要将 detached validate instance 的events直接拿来替换官方writer输入，这会改变seed/live分界。[constructor:725–732][S-session-create]、[writer:565–570][S-import-write]、[无marker测试][T-import-order]

### 10.4 持久性、附着、缓存与失败窗口

- flush 是 durable barrier；append resolved本身只保证该backend实例可见/有序，不保证崩溃后存在；close为最终释放且uncancellable。[Persistence语义][S-persistence]、[Handle语义][S-handle]
- importer只把 signal传给create；append/flush调用未传各自支持的signal options。进入这段后协作取消不是“写入回滚”；已在进行的write/attach可完成，后续signal检查再停。[writer][S-import-write]
- 实际Workspace.attachSession读已存header、canonicalize cwd、检查directory与Workspace.path相等，再在storage domain写链上idempotent attach；不能绕过这个公共方法直接写私有实体record。[Workspace][S-workspace-attach]
- attach失败已存Session不移除，skipped.reason包含“stored as Session {id} but not added ...”；成功sessionIds不包含它。存储create/append/flush/close失败也没有统一删除接口；“失败会话完全无落盘”只在**写入前校验失败**等情况下成立。[attach helper][S-import-write]、[attach失败测试][T-import-dedup]
- coldSnapshot同步返回投影，异步fail-soft写回cache；import success并非“cache已经durable”保证。原始Session日志是authority，cache不是。[Cache][S-cache]
- 直接cold write不进入live SessionStore、不emit `session/created`；browser finally刷新才能发现，包括failure/cancel之前已提交项。[Client mount][S-client-mount]

**不存在“ZIP全部会话+所有图片+Session log+cache+Workspace ledger”的全局事务。**这个事实必须体现在工程报告、重试和去重策略里。

---

## 11. 上传、Web表面、错误报告与取消

### 11.1 Host route

- exact path=`/api/deepseek-chat-import/archive`，method POST，requestBody=streaming。[protocol][S-protocol]、[注册][S-index-host]
- auth=required的共享 `/api` carrier先authenticate，再exact route只放owner principal。实际owner guard在Connection，不在 `createUploadRoute`。自家注册HTTP handler若只复用route函数，需保留同等admission与method约束。[Connection exact guard][S-connection-owner]
- Content-Type媒体类型（允许`;...`参数）必须application/octet-stream，否则415；workspaceId缺失/空400。
- 占service单槽：busy时先cancel body，以200 NDJSON failure返回；Workspace未知同样failure。
- body按有效content-length预分配，必要时double/grow；声明/实收超maxUploadBytes就停止；ZIP未作为临时文件落盘。shared bridge的300MiB cap只针对buffered routes，streaming import走自己的512MiB默认cap。[route/readBounded][S-upload-interface]、[body][S-upload-body]、[bridge][S-http-bridge]
- active claim是service instance内状态；direct importer没单槽；多个显式隔离service instance/进程并不是全局单槽。[Host active][S-index-host]

### 11.2 NDJSON与报告

```ts
type DeepseekChatImportLine =
  | { type: 'progress'; done: number; total: number }
  | {
      type: 'outcome';
      outcome:
        | { ok: true; value: DeepseekChatImportResult }
        | { ok: false; error: { reason: DeepseekChatImportFailureReason; message: string } };
    };

type DeepseekChatImportResult = {
  workspaceId: string;
  workspacePath: string;
  sessionIds: string[];
  conversationCount: number;
  omittedByLimit: number;
  skipped: Array<{ conversationId: string; title: string | null; reason: string }>;
};
```

reason=`too-large | unreadable-archive | missing-manifest | missing-index | unsupported-version | no-conversations | workspace-not-found | busy`。成功即使sessionIds为空也可ok=true（例如index候选全失败）；只看HTTP200/ok=true不等于有Session成功迁入。[wire][S-wire]、[全部missing测试][T-import-replace]

响应headers是NDJSON、no-store/no-transform、nosniff；业务失败仍200；unexpected failure Host logger.error并error stream，没有outcome；cancel也结束无outcome。**failure outcome只有reason/message，没有partial-success列表。**[stream][S-upload-stream]

UI成功summary仅显示导入数、omitted、skipped数与选中Workspace展示名，不展开逐会话reason。完整报告不能从UI计数替代。[UI summary][S-ui-file]

### 11.3 Client slot、transport、取消

- HOC保留children；没有 `deepseekChatImport/limits` access时直接return children。dialog选当前mainView Session所属Workspace；用既有workspace.picker；ZIP选择input accept `.zip,application/zip`。[UI][S-ui-action]、[file/picker][S-ui-file]
- Client先 `$mount`generated remote、再注册UI；unmount先UI后Remote；字典八语言；UI import finally始终尝试sessions.refresh，刷新failure只warn、不覆盖主outcome。[mount][S-client-mount]、[mount测试][T-client-mount]
- URL是UPLOAD_ROUTE解析于document.baseURI，支持path-prefix；served page XHR有upload百分比；page自带`__DSH_TRANSPORT__.fetch`则直接reading，无upload byte progress。[upload选择][S-client-upload]
- Dialog close/unmount abort request；late progress/outcome不再setState；Host signal join claim/request/response-cancel，unloadabort且await settled；已写Session保留。[UI取消][S-ui-action]、[Host][S-index-host]、[route][S-upload-stream]、[真实composition取消断言][T-composition-cancel]
- decoder读取以换行结束的完整line；null/未知type/缺字段等导致invalid并cancel后续；既有测试证明later outcome不覆盖invalid。**它不验证恰好一个outcome且必须最后**：合法重复outcome覆盖state.outcome，合法progress在outcome之后仍可处理；最后无newline的tail不被parse。数值只`typeof number`，未校验nonnegative/integer/finite与done≤total。[collector][S-client-collector]、[wire validation][S-client-line-validation]、[client tests][T-client-upload]

这最后一项是I/S协议严谨性缺口，不是本次网络响应出现了此异常。当前生产Host正常发一个final outcome，但外部Adapter若复用decoder不要扩大它的承诺。

---

## 12. ZIP防护清单与 P0限制

### 12.1 已存在的保护

| 检查                                   | Implementation                                         | 证据与测试                                                                                         |
| -------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 非ZIP/目录读取失败                     | open时filter全false、不inflate；失败SourceError        | [open][S-archive-open]；[archive测试:62–74][T-archive-open]                                        |
| 中央目录同名                           | names→Set重名立刻失败，任何pass前                      | [open:149–155][S-archive-open]；[duplicate test][T-archive-open]                                   |
| 声明uncompressed/compressed单entry超限 | entrySizeError先判断originalSize/size；pass不inflate   | [size][S-archive-size]；[declared测试][T-archive-size]                                             |
| stored entry大小不同                   | compression=0时size必须等于originalSize                | [size:284–288][S-archive-size]；[stored tests][T-archive-size]                                     |
| stream实际解压输出过限/过声明          | 累加received；只保留limit内chunk；final reject         | [stream/size][S-archive-stream]、[size][S-archive-size]；[实量测试][T-archive-size]                |
| local name不在central directory        | directory.get(file.name)缺失抛SourceError              | [stream:211–215][S-archive-stream]；[local-name test][T-archive-corruption]                        |
| decoder损坏                            | entryError可跳entry；结构失败archiveError              | [stream][S-archive-stream]；[损坏测试][T-archive-corruption]                                       |
| cooperative cancel                     | async read terminate；stream各slice检查signal+nextTurn | [unzipAsync][S-archive-cancel]；[cancel tests][T-archive-cancel]                                   |
| ZipSlip直接文件写入                    | importer不把ZIP路径解压到Workspace/disk                | [read-only archive][S-archive-interface]、[upload][S-upload-body]；图片通过content-addressed store |

没有看见本包主动联网取原image URL或READ_LINK正文；工具“回放”写历史call/result，不执行这些URL的network request。[工具映射][S-conv-tools]

### 12.2 缺口、证据等级与对工程的影响

| 优先级                 | 发现                                                                                               | 证据等级                              | 工程需要承担的限制                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **P0 接口接错**        | 根无runtime import/convert/open named exports；limits同名不同shape                                 | S                                     | 用public source subpath/已构建Host插件；明确alias                                                |
| **P0 导入重复**        | 无cross-import ledger，retry能再写新Session                                                        | S+D                                   | 可恢复/重复识别在工程导入域维护，不靠random id                                                   |
| **P0 count cap**       | stream按local header可重复交付已chosen会话；handled只add不阻止第二次；writer无 imported.length cap | S+D；未构造恶意ZIP运行                | 不把maxSessions视为异常ZIP下的硬写入上界；在Adapter/提交准入设置真正额度                         |
| **P0 CPU占用**         | 同步UnzipInflate，不因received过limit终止inflate；到entry结束才reject                              | S+D                                   | 输出保留cap不是计算预算；采用执行隔离/硬超时或更强ZIP reader，不以cooperative signal承诺立即停止 |
| **P0 内存承诺**        | 64KiB compressed slice里可finish多个accepted entries，finished[]先存所有data再deliver              | I，由S控制流直接推导；未做RSS负载实测 | `archive + 单entry`不是严格峰值上界；多个高压缩entry可排队，共享Host尤其要限额/隔离              |
| **P0 partial提交**     | prefix已写后archive-level失败/cancel，只返回全局reason/transport failure                           | S+D                                   | 保留每Session commit journal、attempt标识，报告partial；重试前核对账本                           |
| **P1 by-name语义**     | read委托fflate按originalSize返回截断data；同一entry stream会reject                                 | T+D+S                                 | manifest/index/replacement走read；不要声称都做实量一致性验证                                     |
| **P1 storage剩余物**   | 图片pass先写所有selected图片；会话失败/弃支/withdrawn可留孤立blob；attach失败留Session             | S+T+D                                 | 不是transactional cleanup；报告存储/附着分开                                                     |
| **P1 schema真实性**    | 无JSON内conversation.id与index/entry对照检查；metadata parser/URLs宽松                             | S                                     | provenance/report不能仅相信conversation.json.id                                                  |
| **P1 time/branch承诺** | Date.parse宽松、只selected ancestor校验、id大小invariant未强制                                     | S+R                                   | 全树验证/严格时间要求在工程Adapter补                                                             |
| **P1 protocol**        | decoder不验证single-final-outcome、integer/finiteness、tail                                        | S/I                                   | 外部transport严格decoder需补证据，不复述文档完整保证                                             |
| **P1 cache/取消**      | cache异步落盘；saveImage无signal；append/flush未传signal                                           | S+T                                   | durability/cancel落在真实步骤而非UI关闭时刻                                                      |

关于entry一致性还应保守表述：`sizeFailure`只拒绝received大于originalSize，**没有received小于originalSize的对称检查**；本包没有显式CRC比对/总uncompressed bytes cap/entry count cap/compression-ratio cap；底层fflate具体能否拦下各种截断/CRC错误不由本报告推定。[size函数][S-archive-size]、[archive全部Implementation][S-archive-stream]

本报告没有把这些静态缺口描述成已完成攻击复现；P0排序针对主工程接入的可靠性与资源预算。

---

## 13. 文档、源码、测试的不一致与保真 ceiling

| 文档/注释说法                                      | 实际S/T/R                                                                             | 审计采用的表述                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| README/Agent Note“search snippet不导入”            | converter保留snippet；formatter输出；meta保留；测试断言snippet和文本                  | **snippet保留；site_name丢弃**                          |
| “损坏manifest=unreadable-archive”泛称              | 解压损坏是unreadable；非JSON/缺version/wrong shape是unsupported-version，测试明确如此 | 分byte delivery与JSON/schema阶段                        |
| “RFC3339 UTC时间，0/3/6/9小数位”注释               | Date.parse+safe/nonnegative；R接受日期only/offset                                     | epoch-ms解析，不是严格RFC/UTC校验                       |
| “每个无存图有Host日志”                             | attachments缺失早return，测试warnings=[]                                              | mounted store且selected引用失败才逐图warn               |
| “所有query为空忽略搜索”                            | FAILED分支先返回error，空queries check在其后                                          | 仅普通成功分支空queries忽略                             |
| “largest id一定leaf、整树missing parent/cycle失败” | 注释假设id单调；选中chain才walk；R返回有child的最大id root                            | exporter正常结构下fallback；不是全树校验                |
| “一个entry/会话内存”                               | reader.push先塞多个finished条目；deliver后yield                                       | 转换逐会话，压缩slice中data队列可超过单entry            |
| “每会话之间yield”                                  | 明确nextTurn在archive每64KiB slice；多个小条目可同slice处理                           | 以实际chunk+await位置为准，不承诺固定逐会话事件循环预算 |
| “单outcome最后line”                                | Host实现满足；Client合法duplicate outcome未报错                                       | production协议预期，不是decoder强制属性                 |

[README限制与冲突:154–169][D-readme-limits]、[Agent Note映射/后果][D-note-consequences]、[搜索S][S-conv-tools]、[搜索T][T-conv-tools]、[时间S][S-format-time]、[无attachmentT][T-import-no-attachments]、[ZIP队列S][S-archive-stream]、[decoderS][S-client-collector]。

另外，文档测试表的“latest K oldest first”应理解为目标/旧描述；当前T明确主pass按archive顺序，成功result按index新优先，不是强制oldest-first writer。[编排测试:147–173][T-import-order]、[设计测试表][D-note-testing]

---

## 14. 官方测试证据矩阵与本次真实运行

### 14.1 官方测试源码（全部均未由本委派运行）

| Layer                   | 实际测试与关键行                                                                                                          | 能支持的静态结论                                                                                                      | 留白                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Branch/time/conversion  | [conversation:75–124][T-conv-tree]、[127–208][T-conv-time]、[210–435][T-conv-tools]、[451–588][T-conv-status]             | current/fallback、tree错误、seq/time、空head、title、search/meta/stage、状态与withdrawn、附件synthetic                | 未测弃支坏树/child-id倒序、严格时间、极值durations                          |
| ZIP                     | [archive:62–104][T-archive-open]、[107–175][T-archive-size]、[176–232][T-archive-corruption]、[234–257][T-archive-cancel] | 中央重名、by-name截断、declared/received guards、损坏、local未列名、取消                                              | duplicate local name alias到已有entry、CPU/RSS硬预算未见专门断言            |
| Orchestration           | [importer:147–195][T-import-order]、[276–346][T-import-replace]、[384–429][T-import-fail]、[501–821][T-import-images]     | synthZIP、rank、replacement、duplicate index、failure/close、Workspace removal、image pass、无image read              | 这里的persistence主要是in-memory harness；不是单靠这文件证明JSONL/crash事务 |
| Route                   | [upload.host:80–186][T-upload-host]                                                                                       | type/workspace检查、length/stream超限、single-slot、NDJSON、request/answer/unloadcancel                               | 直接route函数测试不等于完整network owner admission                          |
| Real Loader composition | [composition:145–225][T-composition]、[227–259][T-composition-cancel]                                                     | 真Loader+Session/JSONL/Workspace/cache；connection registry与saveImage是stand-in；owner limits、存储/附着、unloadwait | 当前test直调registered route，不是完整外网HTTP负载                          |
| Resume                  | [resume:39–127][T-resume]                                                                                                 | 真JSONL+production agent loop+MockAdapter；model request包含历史、无withdrawn轮；systemhead replace；重读存储         | 不是DeepSeek真实模型质量/服务端接收测试                                     |
| Client upload           | [upload.client:120–316][T-client-upload]                                                                                  | FakeXHR/carrier；document relative path、分片/整包、invalidline fail-fast、取消                                       | 未强制single-final-outcome、numeric range                                   |
| Client mounting         | [mount:72–131][T-client-mount]                                                                                            | slot、generated contribution、limits、错误、每次refresh、refreshfail不改result                                        | 来源是source/mock，不是published binary消费                                 |
| UI                      | [import-sessions:94–279][T-ui]                                                                                            | React测试：保留children、workspace预选、progress、plural、失败copy、close/unmountcancel                               | 没有真实大ZIP upload/partial详情展示                                        |
| Optional bundle         | [optional-bundles:136–163][T-bundles-compose]、[306–315][T-bundles-meta]                                                  | 通用遍历OPTIONAL_BUNDLES的组合与title/description/icon断言；本包在目录中                                              | 不证明业务导入成功                                                          |
| Web keyless snapshot    | [driver:90–174][T-web]                                                                                                    | synth2026-11-12ZIP经过route导入2Session；UI打开其中一个续聊；record/replay；fixture inventory                         | 导入本身通过scaffold.hostFetch，不是点UI上传；续聊部分才是真browser操作     |

[根Vitest配置][S-vitest]提供path alias和standard decorator transform；缺built Remote时指向generated stub。[Web配置][S-vitest-web]把driver收在Web lane，非一般unit `testIncludes`。

### 14.2 本次 R 实际输出

环境：命令执行器是GitBash；抽取函数在现有Node `v22.23.2`里 `node:module.stripTypeScriptTypes`后执行；没有加载整个包的runtime dependencies。函数bytes来自fixed raw/local，对原算法未做rewrite。

```json
{"value":"2026-11-11T02:33:23.123456789Z","parsed":1794364403123}
{"value":"2026-11-11","parsed":1794355200000}
{"value":"2026-11-11T02:33:23+08:00","parsed":1794335603000}
{"value":"yesterday","parsed":null}
{"probe":"selected-root-with-invalid-dropped-branch","selected":[1]}
{"probe":"fallback-does-not-enforce-child-id-greater","selected":[10]}
{"fixedSourceLocalProbe":"dropped-invalid-parent","selected":[1]}
```

以上探针[时间Implementation][S-format-time]、[分支Implementation][S-conv-tree]均 `[exit code: 0]`；Node输出了stripTypeScriptTypes ExperimentalWarning。报告落盘后也实际执行了下一节所列的只读最小检查，输出 `timestamp-and-branch-probes: PASS`，退出码为 0。这是功能探针记录，不是Vitest passed数量，也不是官方Node24环境的一组集成测试。

### 14.3 留在报告里的最小可复验检查（只读、无安装）

以下从checkout读取真实function，assertDate与branch行为。路径相对于工程根；用已具备stripTypeScriptTypes的Node执行，输出见上，不加载fflate/zod。

```bash
node -e 'const fs=require("node:fs"),assert=require("node:assert/strict"),{stripTypeScriptTypes}=require("node:module");const base="upstream/deepseek-harness/packages/experimental/deepseek-chat-import/src/";const t=fs.readFileSync(base+"format.ts","utf8");const parse=new Function(stripTypeScriptTypes(t.slice(t.indexOf("export function parseExportTime")).replace("export ",""))+";return parseExportTime")();assert.equal(parse("2026-11-11"),1794355200000);const s=fs.readFileSync(base+"conversation.ts","utf8");const src=s.slice(s.indexOf("export class ExportConversationError"),s.indexOf("/** Inputs that make"))+s.slice(s.indexOf("export function selectBranch"),s.indexOf("/**\n * Read the time"));const select=new Function(stripTypeScriptTypes(src.replaceAll("export ",""))+";return selectBranch")();assert.deepEqual(select({current_message_id:1,messages:[{id:1,parent_id:null},{id:2,parent_id:999}]}).map(m=>m.id),[1]);console.log("timestamp-and-branch-probes: PASS")'
```

### 14.4 工具失败记录的解释

早期curl曾因Schannel revocation-offline返回35；随后best-effort方式及官方raw/API成功。全repository API的响应体过大曾超时导致JSON截断；改读小blob/共享目录后恢复。后期API返回403 rate-limit，切raw；主工程师clone就绪后全部用只读本地核对。

唯一后台job `bash-10`是早期只读目录请求；已取消并收集为killed/exit1。它没有测试结果，也没有文件写副作用。报告不把网络失败当作源码缺失。没有留下本委派仍相关的后台任务。

---

## 15. 主工程接入建议与下一轮验收

### 15.1 最小复用分层

- **只做preview/转换审计**：`exportSessionFile.parse` + `selectBranch/convertConversation`；preview不要误接完整importer，因为importer会先保存images并提交Session。
- **接受官方行为的一次导入**：复用完整 `importDeepseekChatExport`，dependency接真正SessionPersistence/Workspace/cache/attachments；工程Adapter负责input bytes cap、single-flight、任务标识、结果记录。
- **要求全树保留/强ZIP资源预算/跨导入去重/可恢复逐项报告**：官方Interface没有这些字段和策略开关；继续复用converter与持久化seam，但工程自己的导入domain/Adapter承载selection、账本和异常ZIP reader，不改core，也不调用private parseIndex/writeSession/storeImages。

这是depth/locality选择：保留官方复杂转换在deep module里面，只在真正变化的输入/提交/报告seam做Adapter。不要为一次导入再发明一套live Agent lifecycle。

### 15.2 Node Adapter 接法示意（说明代码，未运行）

```ts
import { readFile, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { importDeepseekChatExport } from '@deepseek-ai/dsh-deepseek-chat-import/src/importer.ts';

const uploadCap = 512 * 1024 * 1024;
if ((await stat(archivePath)).size > uploadCap) throw new Error('archive over byte cap');
const archive = new Uint8Array(await readFile(archivePath, { signal }));
if (archive.byteLength > uploadCap) throw new Error('archive changed beyond byte cap');
// 外层已取得本工程single-flight；report callbacks保持不抛异常。
const result = await importDeepseekChatExport(
  {
    persistence: ctx.sessionPersistence,
    projectionCache: ctx.get('sessionProjectionCache'),
    attachments: ctx.get('attachments'),
    workspaceRegistered: (id) => ctx.workspaceRegistry.get(id as typeof workspace.id) !== undefined,
    createId: randomUUID,
    warn: (message) => report.warn(message),
  },
  {
    archive,
    workspace,
    limits: { maxSessions: 1000, maxEntryBytes: 256 * 1024 * 1024, maxTitleBytes: 80 },
    onProgress: (done, total) => report.progress(done, total),
  },
  signal,
);
```

这展示现有Interface，不声称脚本已在当前工程编译/运行。`archivePath/ctx/workspace/report/signal`均由工程Adapter提供；若consumer只用package root，本段named import要保留source subpath与其TS构建支持。

### 15.3 环境就绪后可运行的官方复验命令（本次未执行）

```bash
# 在固定SHA的官方checkout，已有依赖和官方Node要求满足后：
pnpm exec vitest run packages/experimental/deepseek-chat-import/tests \
  --project thread-safe --no-file-parallelism

# Web artifacts、replay fixtures、Chromium已准备后：
DSH_SNAPSHOT=replay pnpm exec vitest run --config vitest.web.config.ts \
  apps/web/tests/deepseek-chat-import.e2e.ts
```

根 `pnpm test`还先build native-system；本P0源码审计没有调用全构建/全依赖安装。[根scripts][S-root]。Web case使用build产物与keyless replay固定物，`record`会写fixture且发recorded model turn，勿在只读审计中用record替换replay。[driver][T-web]、[Web config][S-vitest-web]

### 15.4 下一轮最有价值的检查

1. 发布包consumer smoke：root实际runtime exports；public source subpath经工程bundler后的closure；两种limits alias。
2. 正常v3导出fixture端到端：chosen current branch、title/时间、THINK/search/open/readlink、empty USER、withdrawn与excluded replies；JSONL重读和正常resume。
3. duplicate central vs duplicate local header分别测试；maxSessions以**实际成功create/commit**计数；总entry、总输出、压缩比和RSS/CPU budget。
4. read与stream对misdeclared/truncated/CRC的行为对比；metadata和replacement不能静默将截断的JSON当完整数据。
5. crash/failure/cancel分别停在image保存、create、append、flush、close、cache、attach期间；结果账本能列已存但未attached的Session与孤立blob。
6. re-import同archive与会话轻微更新、index duplicate row时间冲突、JSON id/entry id不符、selected/弃支坏树，保证工程去重/追溯键的定义明确。
7. Client decoder重复合法outcome、outcome后progress、无newline尾行、超range number；确认UI刷新后partial prefix可见，不用HTTP200当提交成功。

---

## 16. 固定 SHA 证据索引（S/T/D）

以下全部GitHub链接均锁定 `ca33fd6843b205e279c7ccb6cb73a472c78f5760`；S是实现，T是测试源码，D是文档。未使用搜索结果中的其他commit代替本基线。

[S-package]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/package.json#L1-L132
[S-root]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/package.json#L1-L84
[D-note]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/.agents/notes/implemented/feature/2026-11-11-deepseek-chat-export-import.md#L1-L56
[D-note-testing]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/.agents/notes/implemented/feature/2026-11-11-deepseek-chat-export-import.md#L209-L221
[D-note-consequences]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/.agents/notes/implemented/feature/2026-11-11-deepseek-chat-export-import.md#L255-L266
[D-readme-limits]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/README.md#L154-L169
[S-bundles]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/util/official-bundles/src/bundles.ts#L10-L75
[S-bundle-ui]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/util/official-bundles/src/plugin-manager.ts#L51-L85
[S-patch]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/cordis.patch.yml#L1-L6
[S-index-exports]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/index.ts#L18-L45
[S-index-host]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/index.ts#L55-L132
[S-import-deps]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L11-L98
[S-import-select]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L154-L312
[S-import-index]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L401-L440
[S-import-images]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L327-L390
[S-import-image-plan]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L452-L543
[S-import-write]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/importer.ts#L546-L599
[S-import-tsconfig]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tsconfig.host.json#L1-L34
[S-format]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/format.ts#L9-L127
[S-format-time]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/format.ts#L129-L147
[S-conv-options]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L14-L171
[S-conv-tree]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L99-L131
[S-conv-events]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L174-L267
[S-conv-steps]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L275-L346
[S-conv-status]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L349-L378
[S-conv-files]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L384-L403
[S-conv-tools]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/conversation.ts#L416-L489
[S-archive-interface]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/archive.ts#L7-L106
[S-archive-open]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/archive.ts#L136-L175
[S-archive-stream]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/archive.ts#L182-L255
[S-archive-size]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/archive.ts#L262-L290
[S-archive-cancel]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/archive.ts#L297-L312
[S-upload-interface]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/upload.ts#L13-L95
[S-upload-stream]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/upload.ts#L102-L143
[S-upload-body]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/upload.ts#L150-L196
[S-wire]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/types.ts#L13-L73
[S-protocol]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/protocol.ts#L1-L10
[S-client-index]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/client/index.ts#L1-L25
[S-client-mount]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/client/mount.ts#L15-L64
[S-client-upload]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/client/upload.ts#L8-L174
[S-client-collector]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/client/upload.ts#L34-L98
[S-client-line-validation]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/client/upload.ts#L232-L314
[S-ui-action]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/client/ImportSessions.tsx#L59-L124
[S-ui-file]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/src/client/ImportSessions.tsx#L126-L231
[S-connection-owner]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/client/connection/src/rpc-host.ts#L143-L168
[S-http-bridge]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/client/connection/src/http-bridge.ts#L35-L98
[S-cli-args]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/apps/cli/src/args.ts#L20-L216
[S-cli-bin]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/apps/cli/src/bin.ts#L26-L74
[S-cli-plugin]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/apps/cli/src/plugin.ts#L68-L108
[S-web-main]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/apps/web/src/main.ts#L1-L40
[S-session-create]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/session/src/index.ts#L607-L732
[S-session-header]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/session/src/index.ts#L98-L160
[S-session-format]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/core/session/src/types.ts#L90-L140
[S-persistence]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/session/session-persistence/src/index.ts#L140-L233
[S-handle]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/session/session-persistence/src/handle.ts#L45-L117
[S-cache]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/session/session-projection-cache/src/index.ts#L277-L309
[S-workspace-attach]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/workspace/workspace/src/entity.ts#L123-L164
[S-title-normalize]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/session/session-title/src/normalize.ts#L1-L61
[S-tool-search]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/web/tool-web/src/search.ts#L85-L191
[S-image-store]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/attachment/attachment-local/src/store.ts#L55-L382
[S-image-adapter]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/attachment/attachment-local/src/index.ts#L68-L230
[S-llm-files]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/llm/llm/src/content.ts#L145-L208
[S-llm-runtime]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/llm/llm/src/index.ts#L1082-L1104
[S-serialize]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/llm/llm-deepseek/src/serialize.ts#L27-L133
[S-vitest]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/vitest.config.ts#L192-L245
[S-vitest-web]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/vitest.web.config.ts#L1-L37
[T-conv-tree]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/conversation.host.spec.ts#L75-L124
[T-conv-time]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/conversation.host.spec.ts#L127-L208
[T-conv-tools]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/conversation.host.spec.ts#L210-L435
[T-conv-stage]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/conversation.host.spec.ts#L276-L328
[T-conv-status]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/conversation.host.spec.ts#L451-L588
[T-archive-open]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/archive.host.spec.ts#L62-L104
[T-archive-size]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/archive.host.spec.ts#L107-L175
[T-archive-corruption]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/archive.host.spec.ts#L176-L232
[T-archive-cancel]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/archive.host.spec.ts#L234-L257
[T-import-order]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/importer.host.spec.ts#L147-L195
[T-import-replace]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/importer.host.spec.ts#L276-L346
[T-import-dedup]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/importer.host.spec.ts#L324-L346
[T-import-fail]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/importer.host.spec.ts#L384-L429
[T-import-images]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/importer.host.spec.ts#L501-L821
[T-import-no-attachments]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/importer.host.spec.ts#L647-L659
[T-upload-host]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/upload.host.spec.ts#L80-L186
[T-composition]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/composition.host.spec.ts#L145-L225
[T-composition-cancel]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/composition.host.spec.ts#L227-L259
[T-resume]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/resume.host.spec.ts#L39-L127
[T-client-upload]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/upload.client.spec.ts#L120-L316
[T-client-mount]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/mount.client.spec.ts#L72-L131
[T-ui]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/packages/experimental/deepseek-chat-import/tests/import-sessions.client.spec.tsx#L94-L279
[T-bundles-compose]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/scripts/optional-bundles.spec.ts#L136-L163
[T-bundles-meta]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/scripts/optional-bundles.spec.ts#L306-L315
[T-web]: https://github.com/deepseek-ai/deepseek-harness/blob/ca33fd6843b205e279c7ccb6cb73a472c78f5760/apps/web/tests/deepseek-chat-import.e2e.ts#L90-L174

import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  exportManifest,
  exportSessionFile,
  exportSessionIndex,
  parseKnownFragment,
  parseExportTime,
  SUPPORTED_EXPORT_FORMAT_VERSION,
} from '@deepseek-ai/dsh-deepseek-chat-import/src/format.ts';
import {
  convertConversation,
  selectBranch,
} from '@deepseek-ai/dsh-deepseek-chat-import/src/conversation.ts';
import type { ExportSessionFile } from '@deepseek-ai/dsh-deepseek-chat-import/src/format.ts';
import { assertAssetPath, ImportError, inspectZip } from '../security/archive.ts';
import type { ArchiveLimits } from '../security/archive.ts';
import { parseDataJson } from '../security/json.ts';
import { PreviewSchema } from '../model.ts';
import type { ImportPreview, SourceConversation, SourceMessage } from '../model.ts';

export const digest = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

function wholeTree(file: ExportSessionFile): void {
  const byId = new Map(file.messages.map((message) => [message.id, message]));
  if (byId.size !== file.messages.length)
    throw new ImportError('invalid-tree', 'Duplicate message id');
  const finished = new Set<number>();
  for (const start of file.messages) {
    const chain = new Set<number>();
    let current: typeof start | undefined = start;
    while (current && !finished.has(current.id)) {
      if (chain.has(current.id)) throw new ImportError('invalid-tree', 'Message parent cycle');
      chain.add(current.id);
      if (current.parent_id === null) break;
      const parent = byId.get(current.parent_id);
      if (!parent)
        throw new ImportError(
          'invalid-tree',
          'Message parent is missing, including an inactive branch',
        );
      current = parent;
    }
    for (const id of chain) finished.add(id);
  }
}

function deepseekConversation(file: ExportSessionFile, raw: Uint8Array): SourceConversation {
  wholeTree(file);
  const warnings: string[] = [];
  const selected = selectBranch(file);
  const parents = new Set(file.messages.map((message) => message.parent_id));
  const branches = file.messages
    .filter((message) => !parents.has(message.id))
    .map((message) => String(message.id));
  if (branches.length > 1)
    warnings.push(
      `${branches.length} branches are preserved in the raw asset; only selected branch ${selected.at(-1)?.id} enters this Session by default`,
    );
  let attachmentCount = 0;
  const messages: SourceMessage[] = file.messages.map((message) => {
    const lines: string[] = [];
    for (const envelope of message.fragments) {
      const fragment = parseKnownFragment(envelope);
      if (!fragment) {
        warnings.push(
          `Message ${message.id}: unknown fragment ${envelope.type} remains in raw source`,
        );
        continue;
      }
      if (fragment.type === 'REQUEST' || fragment.type === 'RESPONSE') lines.push(fragment.content);
      else if (fragment.type === 'FILE') {
        attachmentCount += fragment.files.length;
        for (const attachment of fragment.files) {
          if (attachment.export_path !== null) assertAssetPath(attachment.export_path);
          if (!attachment.is_image)
            warnings.push(
              `Attachment ${attachment.file_name}: original body is absent from official export; metadata remains`,
            );
        }
      } else if (!['THINK', 'TOOL_SEARCH', 'TOOL_OPEN', 'READ_LINK'].includes(fragment.type))
        warnings.push(
          `Message ${message.id}: fragment ${fragment.type} is not model-visible after official conversion`,
        );
    }
    if (message.status !== 'FINISHED')
      warnings.push(
        `Message ${message.id}: status ${message.status} is excluded or represented as a failed turn by official conversion`,
      );
    return {
      id: String(message.id),
      role: message.role === 'USER' ? 'user' : 'assistant',
      text: lines.join('\n'),
      timestamp: parseExportTime(message.inserted_at) ?? null,
      status: message.status,
      parent_id: message.parent_id === null ? null : String(message.parent_id),
    };
  });
  if (messages.some((message) => message.timestamp === null))
    warnings.push(
      'An invalid original timestamp prevents official Session conversion; raw value is preserved',
    );
  const conversion = convertConversation(file, { createId: randomUUID, maxTitleBytes: 80 });
  if (conversion.title !== file.title)
    warnings.push('The DSH title is normalized/truncated; the full original title remains here');
  return {
    id: file.id,
    title: file.title,
    digest: digest(raw),
    message_count: messages.length,
    attachment_count: attachmentCount,
    branches,
    active_branch: String(selected.at(-1)?.id ?? ''),
    messages,
    warnings: [...new Set(warnings)],
    supported: true,
  };
}

const GenericMessageSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  role: z.enum(['user', 'assistant', 'unknown']),
  content: z.string().max(8 * 1024 * 1024),
  timestamp: z.union([z.number().int().nonnegative(), z.string()]).nullable().optional(),
});
const GenericSchema = z.object({
  title: z.string().nullable().optional(),
  messages: z.array(GenericMessageSchema).min(1),
});

function emergencyConversation(
  bytes: Uint8Array,
  format: 'text' | 'markdown' | 'generic-json',
): SourceConversation {
  const warnings = [
    'Original timestamps may be unknown; no historical dates are invented',
    'Confirm speaker labels before creating a Session',
  ];
  let title: string | null = null;
  let messages: SourceMessage[];
  if (format === 'generic-json') {
    const parsed = GenericSchema.parse(parseDataJson(bytes));
    title = parsed.title ?? null;
    messages = parsed.messages.map((message, index) => ({
      id: String(message.id ?? index + 1),
      role: message.role,
      text: message.content,
      timestamp:
        typeof message.timestamp === 'number'
          ? message.timestamp
          : typeof message.timestamp === 'string'
            ? (parseExportTime(message.timestamp) ?? null)
            : null,
      status: 'IMPORTED',
      parent_id: index === 0 ? null : String(parsed.messages[index - 1]?.id ?? index),
    }));
  } else {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new ImportError('invalid-unicode', 'Text is not valid UTF-8');
    }
    const paragraphs = text
      .replace(/^\uFEFF/u, '')
      .replace(/\r\n?/g, '\n')
      .split('\n');
    const collected: Array<{ role: SourceMessage['role']; lines: string[] }> = [];
    for (const line of paragraphs) {
      const heading =
        /^(?:#{1,6}\s*)?(?:user|human|用户|我|assistant|ai|deepseek|助手|角色)\s*[:：]\s*(.*)$/iu.exec(
          line.trim(),
        );
      if (heading) {
        const role = /^(?:#{1,6}\s*)?(?:user|human|用户|我)\s*[:：]/iu.test(line.trim())
          ? 'user'
          : 'assistant';
        collected.push({ role, lines: [heading[1] ?? ''] });
      } else {
        if (!collected.length) collected.push({ role: 'unknown', lines: [] });
        collected.at(-1)?.lines.push(line);
      }
    }
    messages = collected
      .map((message, index) => ({
        id: String(index + 1),
        role: message.role,
        text: message.lines.join('\n').trim(),
        timestamp: null,
        status: 'IMPORTED',
        parent_id: index === 0 ? null : String(index),
      }))
      .filter((message) => message.text.length > 0);
    title = format === 'markdown' ? (/^#\s+(.+)$/mu.exec(text)?.[1] ?? null) : null;
  }
  if (!messages.length) throw new ImportError('no-messages', 'Input contains no messages');
  if (new Set(messages.map((message) => message.id)).size !== messages.length)
    throw new ImportError('duplicate-message', 'Message identities must be unique');
  return {
    id: 'conversation',
    title,
    digest: digest(bytes),
    message_count: messages.length,
    attachment_count: 0,
    branches: [messages.at(-1)?.id ?? ''],
    active_branch: messages.at(-1)?.id ?? null,
    messages,
    warnings,
    supported: true,
  };
}

/** Format adapters only: official DeepSeek conversion is upstream-owned; other formats remain small and explicit. */
export async function previewImport(
  bytes: Uint8Array,
  filename: string,
  limits: Partial<ArchiveLimits>,
  signal: AbortSignal,
): Promise<ImportPreview> {
  signal.throwIfAborted();
  if (bytes.length > (limits.maxUploadBytes ?? 128 * 1024 * 1024))
    throw new ImportError('too-large', 'Input exceeds upload limit');
  const sourceId = `source:${digest(bytes)}`;
  let format: ImportPreview['format'];
  let conversations: SourceConversation[];
  const warnings: string[] = [];
  if (/\.zip$/iu.test(filename) || (bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    format = 'deepseek-v3';
    const files = await inspectZip(bytes, limits, signal);
    const manifestBytes = files.get('manifest.json');
    const indexBytes = files.get('chat_session_index.json');
    if (!manifestBytes || !indexBytes)
      throw new ImportError(
        'missing-metadata',
        'Official manifest.json and chat_session_index.json are required at ZIP root',
      );
    const manifest = exportManifest.parse(parseDataJson(manifestBytes));
    if (manifest.export_format_version !== SUPPORTED_EXPORT_FORMAT_VERSION)
      throw new ImportError(
        'unsupported-version',
        `Official export format ${manifest.export_format_version} is unsupported; supported version is ${SUPPORTED_EXPORT_FORMAT_VERSION}`,
      );
    const index = exportSessionIndex.parse(parseDataJson(indexBytes));
    if (!index.length) throw new ImportError('no-conversations', 'Export index is empty');
    const seen = new Set<string>();
    conversations = [];
    for (const row of index) {
      if (seen.has(row.id)) {
        warnings.push(`Repeated conversation ${row.id} in index`);
        continue;
      }
      seen.add(row.id);
      assertAssetPath(`chat_sessions/${row.id}.json`);
      const data = files.get(`chat_sessions/${row.id}.json`);
      try {
        if (!data) throw new ImportError('missing-conversation', 'Conversation file is absent');
        const parsed = exportSessionFile.parse(parseDataJson(data));
        if (parsed.id !== row.id)
          throw new ImportError(
            'identity-mismatch',
            'Conversation id disagrees with filename/index',
          );
        conversations.push(deepseekConversation(parsed, data));
      } catch (error) {
        conversations.push({
          id: row.id,
          title: null,
          digest: digest(data ?? row.id),
          message_count: 0,
          attachment_count: 0,
          branches: [],
          active_branch: null,
          messages: [],
          warnings: [error instanceof Error ? error.message : String(error)],
          supported: false,
        });
      }
    }
    warnings.push(
      'All raw ZIP bytes are retained on commit; only explicitly selected supported conversations are converted to DSH Sessions',
    );
  } else {
    format = /\.json$/iu.test(filename)
      ? 'generic-json'
      : /\.(?:md|markdown)$/iu.test(filename)
        ? 'markdown'
        : 'text';
    conversations = [emergencyConversation(bytes, format)];
  }
  return PreviewSchema.parse({
    source_id: sourceId,
    filename: filename.slice(0, 512),
    format,
    byte_count: bytes.length,
    conversation_count: conversations.length,
    message_count: conversations.reduce((sum, conversation) => sum + conversation.message_count, 0),
    attachment_count: conversations.reduce(
      (sum, conversation) => sum + conversation.attachment_count,
      0,
    ),
    conversations,
    warnings,
  });
}

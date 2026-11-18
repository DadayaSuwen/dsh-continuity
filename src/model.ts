import { z } from 'zod';

const id = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[\p{L}\p{N}_.:@-]+$/u);
export const ScopeSchema = z
  .object({
    owner_id: id,
    agent_id: id,
    character_id: id,
    story_id: id.nullable().default(null),
  })
  .strict();
export type MemoryScope = z.infer<typeof ScopeSchema>;

/** Project identity from a validated asset or binding without weakening input schemas. */
export function identityOf(record: MemoryScope): MemoryScope {
  return ScopeSchema.parse({
    owner_id: record.owner_id,
    agent_id: record.agent_id,
    character_id: record.character_id,
    story_id: record.story_id,
  });
}

export const MessageSchema = z.object({
  id: z.string().min(1).max(256),
  role: z.enum(['user', 'assistant', 'unknown']),
  text: z.string().max(8 * 1024 * 1024),
  timestamp: z.number().int().nonnegative().nullable(),
  status: z.string().max(100),
  parent_id: z.string().nullable(),
});
export type SourceMessage = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: z.string().min(1).max(256),
  title: z.string().max(4096).nullable(),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  message_count: z.number().int().nonnegative(),
  attachment_count: z.number().int().nonnegative(),
  branches: z.array(z.string()),
  active_branch: z.string().nullable(),
  messages: z.array(MessageSchema),
  warnings: z.array(z.string()),
  supported: z.boolean(),
});
export type SourceConversation = z.infer<typeof ConversationSchema>;

export const PreviewSchema = z.object({
  source_id: z.string().regex(/^source:[a-f0-9]{64}$/),
  filename: z.string().max(512),
  format: z.enum(['deepseek-v3', 'text', 'markdown', 'generic-json']),
  byte_count: z.number().int().nonnegative(),
  conversation_count: z.number().int().nonnegative(),
  message_count: z.number().int().nonnegative(),
  attachment_count: z.number().int().nonnegative(),
  conversations: z.array(ConversationSchema),
  warnings: z.array(z.string()),
});
export type ImportPreview = z.infer<typeof PreviewSchema>;

export const MemoryTypeSchema = z.enum(['persona', 'user', 'relationship', 'episodic', 'story']);
export const MemorySchema = z.object({
  memory_id: id,
  scope: z.enum(['character', 'user', 'session', 'story', 'agent']),
  owner_id: id,
  agent_id: id,
  character_id: id,
  story_id: id.nullable(),
  memory_type: MemoryTypeSchema,
  content: z.string().min(1).max(12000),
  fact_key: z.string().max(200).nullable(),
  source_id: z.string().min(1),
  source_session_id: z.string().min(1),
  source_message_id: z.string().min(1),
  source_excerpt: z.string().min(1).max(16000),
  source_kind: z.enum([
    'user-statement',
    'assistant-fiction',
    'inference',
    'unknown',
    'user-edited',
  ]),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
  importance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  validity: z.object({
    from: z.number().int().nonnegative().nullable(),
    until: z.number().int().nonnegative().nullable(),
  }),
  version: z.number().int().positive(),
  status: z.enum(['candidate', 'active', 'superseded', 'conflict', 'rejected']),
  confirmed_at: z.number().int().nonnegative().nullable(),
  conflicts_with: z.array(id),
});
export type CharacterMemory = z.infer<typeof MemorySchema>;

export const SourceSchema = z.object({
  source_id: z.string(),
  owner_id: id,
  agent_id: id,
  character_id: id,
  story_id: id.nullable(),
  raw_base64: z.string(),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  preview: PreviewSchema,
  created_at: z.number().int().nonnegative(),
});
export type SourceAsset = z.infer<typeof SourceSchema>;

export const BindingSchema = ScopeSchema.extend({
  session_id: id,
  created_at: z.number().int().nonnegative(),
});
export type SessionBinding = z.infer<typeof BindingSchema>;

export const LedgerSchema = ScopeSchema.extend({
  ledger_id: id,
  source_id: z.string(),
  conversation_id: z.string(),
  branch_id: z.string().nullable(),
  session_id: id.nullable(),
  expected_events: z.number().int().nonnegative(),
  status: z.enum(['writing', 'imported', 'failed']),
  error: z.string().nullable(),
  created_at: z.number().int().nonnegative(),
});
export type ImportLedger = z.infer<typeof LedgerSchema>;

export function sameScope(record: MemoryScope, scope: MemoryScope): boolean {
  return (
    record.owner_id === scope.owner_id &&
    record.agent_id === scope.agent_id &&
    record.character_id === scope.character_id &&
    record.story_id === scope.story_id
  );
}

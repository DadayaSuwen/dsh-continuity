import { z } from 'zod';
import { MemorySchema, MemoryTypeSchema, ScopeSchema, sameScope } from '../model.ts';
import type { CharacterMemory, MemoryScope, SourceAsset, SourceMessage } from '../model.ts';
import { digest } from '../migration/preview.ts';
import { ImportError } from '../security/archive.ts';
import {
  emptyPartition,
  scopeKey,
  sourceKey,
  updateMemoryPartition,
  drainMemoryPartitions,
} from '../storage.ts';
import type { ContinuityDomain, MemoryPartition } from '../storage.ts';

export const ProposalSchema = z
  .object({
    source_id: z.string().min(1),
    source_session_id: z.string().min(1),
    source_message_id: z.string().min(1),
    source_excerpt: z.string().min(1).max(16000),
    memory_type: MemoryTypeSchema,
    content: z.string().min(1).max(12000),
    fact_key: z.string().max(200).nullable().default(null),
    scope: z.enum(['character', 'user', 'session', 'story', 'agent']).default('character'),
    importance: z.number().min(0).max(1).default(0.7),
    confidence: z.number().min(0).max(1).default(0.85),
    inferred: z.boolean().default(false),
  })
  .strict();
export type MemoryProposal = z.input<typeof ProposalSchema>;

export function assertMemoryEvidence(
  memory: Pick<CharacterMemory, 'memory_type' | 'source_excerpt' | 'source_kind'>,
  message: SourceMessage | undefined,
): void {
  if (!message || !message.text.includes(memory.source_excerpt))
    throw new ImportError('invalid-evidence', 'A memory must quote its original source message');
  if (memory.source_kind === 'user-statement' && message.role !== 'user')
    throw new ImportError(
      'invalid-evidence',
      'User-statement evidence must originate from a user message',
    );
  if (memory.source_kind === 'assistant-fiction' && message.role !== 'assistant')
    throw new ImportError(
      'invalid-evidence',
      'Assistant-fiction evidence must originate from an assistant message',
    );
  if (
    memory.memory_type === 'user' &&
    (message.role !== 'user' ||
      ['assistant-fiction', 'unknown', 'inference'].includes(memory.source_kind) ||
      /剧情|角色扮演|故事|台词|fiction|roleplay/iu.test(message.text))
  )
    throw new ImportError(
      'not-user-fact',
      'Fiction or inference is not an explicit real user fact',
    );
}

export function memoryFingerprint(
  memory: Pick<
    CharacterMemory,
    'source_id' | 'source_session_id' | 'source_message_id' | 'memory_type' | 'content'
  >,
): string {
  return digest(
    JSON.stringify([
      memory.source_id,
      memory.source_session_id,
      memory.source_message_id,
      memory.memory_type,
      memory.content.normalize('NFC').replace(/\s+/gu, ' ').trim(),
    ]),
  );
}

function activeMessages(
  asset: SourceAsset,
  conversationId: string,
  branchId?: string,
): SourceMessage[] {
  const conversation = asset.preview.conversations.find((item) => item.id === conversationId);
  if (!conversation)
    throw new ImportError(
      'source-not-found',
      'Source conversation is not in this character partition',
    );
  const byId = new Map(conversation.messages.map((message) => [message.id, message]));
  const messages: SourceMessage[] = [];
  if (branchId !== undefined && !conversation.branches.includes(branchId))
    throw new ImportError('invalid-branch', 'Selected branch is not a leaf of this conversation');
  let id = branchId ?? conversation.active_branch;
  const seen = new Set<string>();
  while (id !== null) {
    if (seen.has(id)) throw new ImportError('invalid-tree', 'Source message cycle');
    seen.add(id);
    const message = byId.get(id);
    if (!message) throw new ImportError('source-not-found', 'Source branch message is missing');
    messages.push(message);
    id = message.parent_id;
  }
  return messages.reverse();
}

/** Review-first memories. One atomic partition update owns confirmation, conflicts and deletion tombstones. */
export class Memory {
  constructor(
    private readonly domain: ContinuityDomain,
    private readonly now: () => number = Date.now,
  ) {}

  list(scope: MemoryScope): CharacterMemory[] {
    const identity = ScopeSchema.parse(scope);
    const partition = this.domain.table('memories').get(scopeKey(identity));
    if (!partition || !sameScope(partition, identity)) return [];
    return structuredClone(partition.memories);
  }

  partition(scope: MemoryScope): MemoryPartition {
    const identity = ScopeSchema.parse(scope);
    const partition = this.domain.table('memories').get(scopeKey(identity));
    return structuredClone(
      partition && sameScope(partition, identity) ? partition : emptyPartition(identity),
    );
  }

  async propose(scope: MemoryScope, input: MemoryProposal): Promise<CharacterMemory | undefined> {
    const identity = ScopeSchema.parse(scope);
    const proposal = ProposalSchema.parse(input);
    const asset = this.domain.table('sources').get(sourceKey(identity, proposal.source_id));
    if (!asset || !sameScope(asset, identity))
      throw new ImportError('source-not-found', 'Source is not available to this character');
    const message = asset.preview.conversations
      .find((item) => item.id === proposal.source_session_id)
      ?.messages.find((item) => item.id === proposal.source_message_id);
    if (!message || !message.text.includes(proposal.source_excerpt))
      throw new ImportError(
        'invalid-evidence',
        'A memory must quote a literal source message in this partition',
      );
    if (
      proposal.memory_type === 'user' &&
      (message.role !== 'user' ||
        proposal.inferred ||
        /剧情|角色扮演|故事|台词|fiction|roleplay/iu.test(message.text))
    )
      throw new ImportError(
        'not-user-fact',
        'Fiction or inference is not an explicit real user fact',
      );
    const sourceKind = proposal.inferred
      ? 'inference'
      : message.role === 'user'
        ? 'user-statement'
        : message.role === 'assistant'
          ? 'assistant-fiction'
          : 'unknown';
    const at = this.now();
    const candidate = MemorySchema.parse({
      ...identity,
      memory_id: `memory_${memoryFingerprint(proposal)}`,
      scope: proposal.scope,
      memory_type: proposal.memory_type,
      content: proposal.content,
      fact_key: proposal.fact_key,
      source_id: proposal.source_id,
      source_session_id: proposal.source_session_id,
      source_message_id: proposal.source_message_id,
      source_excerpt: proposal.source_excerpt,
      source_kind: sourceKind,
      created_at: at,
      updated_at: at,
      importance: proposal.importance,
      confidence: proposal.confidence,
      validity: { from: null, until: null },
      version: 1,
      status: 'candidate',
      confirmed_at: null,
      conflicts_with: [],
    });
    let returned: CharacterMemory | undefined;
    await this.mutate(identity, (current) => {
      const hash = memoryFingerprint(candidate);
      if (
        current.deleted_fingerprints.includes(hash) ||
        current.deleted_fingerprints.includes(candidate.memory_id.replace(/^memory_/u, ''))
      )
        return current;
      const existing = current.memories.find(
        (memory) => memory.memory_id === candidate.memory_id || memoryFingerprint(memory) === hash,
      );
      if (existing) {
        returned = existing;
        return current;
      }
      const conflicts = current.memories
        .filter(
          (memory) =>
            memory.status === 'active' &&
            memory.fact_key !== null &&
            memory.fact_key === candidate.fact_key &&
            memory.content !== candidate.content,
        )
        .map((memory) => memory.memory_id);
      returned = {
        ...candidate,
        status: conflicts.length ? 'conflict' : 'candidate',
        conflicts_with: conflicts,
      };
      return {
        ...current,
        memories: [...current.memories, returned],
        revision: current.revision + 1,
      };
    });
    return returned === undefined ? undefined : structuredClone(returned);
  }

  /** Incremental exact-message rules; no model invocation and no silent activation. */
  async extract(
    scope: MemoryScope,
    sourceId: string,
    conversationId: string,
    branchId?: string,
  ): Promise<CharacterMemory[]> {
    const identity = ScopeSchema.parse(scope);
    const asset = this.domain.table('sources').get(sourceKey(identity, sourceId));
    if (!asset || !sameScope(asset, identity))
      throw new ImportError('source-not-found', 'Source is not available');
    const proposed: CharacterMemory[] = [];
    for (const message of activeMessages(asset, conversationId, branchId)) {
      if (message.status !== 'FINISHED' && message.status !== 'IMPORTED') continue;
      for (const sentence of message.text
        .split(/(?<=[。！？.!?])\s*|\n+/u)
        .map((text) => text.trim())
        .filter(Boolean)) {
        let type: CharacterMemory['memory_type'] | undefined;
        let factKey: string | null = null;
        const isFiction = /剧情|角色扮演|故事|台词|fiction|roleplay/iu.test(message.text);
        if (
          message.role === 'user' &&
          /请(?:叫|称呼)我|称呼(?:我)?[:：]|call me/iu.test(sentence) &&
          !isFiction
        ) {
          type = 'user';
          factKey = 'user.nickname';
        } else if (/角色[:：]|你叫|人设[:：]|persona:|your name is/iu.test(sentence)) {
          type = 'persona';
          factKey = /你叫|your name is/iu.test(sentence) ? 'persona.identity' : null;
        } else if (/关系[:：]|约定|承诺|搭档|恋人|朋友|relationship:|promise/iu.test(sentence)) {
          type = 'relationship';
          factKey = /关系[:：]|relationship:/iu.test(sentence) ? 'relationship.current' : null;
        } else if (
          /剧情[:：]|当前场景|下一步|未解决|章节|story:|current scene|next chapter/iu.test(sentence)
        ) {
          type = 'story';
          factKey = 'story.current';
        } else if (
          message.role === 'user' &&
          /我(?:喜欢|不喜欢|偏好|希望你记住)|i (?:like|prefer|dislike)/iu.test(sentence)
        ) {
          type = isFiction ? 'story' : 'user';
          factKey = isFiction ? null : 'user.preference';
        } else if (
          /曾经|还记得|共同经历|我们.*(?:去过|经历|到了)|we (?:visited|remember)/iu.test(sentence)
        )
          type = 'episodic';
        if (!type) continue;
        const memory = await this.propose(identity, {
          source_id: sourceId,
          source_session_id: conversationId,
          source_message_id: message.id,
          source_excerpt: sentence,
          content: sentence,
          memory_type: type,
          fact_key: factKey,
          scope: type === 'story' && identity.story_id !== null ? 'story' : 'character',
          importance: type === 'story' || type === 'persona' ? 0.95 : 0.8,
        });
        if (memory) proposed.push(memory);
      }
    }
    return proposed;
  }

  async confirm(
    scope: MemoryScope,
    memoryId: string,
    expectedVersion: number,
    replace: readonly string[] = [],
  ): Promise<CharacterMemory> {
    let result: CharacterMemory | undefined;
    await this.mutate(ScopeSchema.parse(scope), (current) => {
      const memory = this.require(current, memoryId, expectedVersion);
      if (memory.source_kind === 'unknown' || memory.source_kind === 'inference')
        throw new ImportError(
          'unverified-memory',
          'Unknown or inferred candidates must be edited and verified before activation',
        );
      const conflicts = current.memories.filter(
        (item) =>
          item.status === 'active' &&
          item.memory_id !== memoryId &&
          item.fact_key !== null &&
          item.fact_key === memory.fact_key &&
          item.content !== memory.content,
      );
      if (
        conflicts.some((item) => !replace.includes(item.memory_id)) ||
        replace.some((id) => !conflicts.some((item) => item.memory_id === id))
      )
        throw new ImportError(
          'memory-conflict',
          `Explicitly resolve conflicts before activation: ${conflicts.map((item) => item.memory_id).join(', ')}`,
        );
      const now = this.now();
      result = MemorySchema.parse({
        ...memory,
        status: 'active',
        conflicts_with: [],
        version: memory.version + 1,
        updated_at: now,
        confirmed_at: now,
      });
      return {
        ...current,
        memories: current.memories.map((item) =>
          item.memory_id === memoryId
            ? result!
            : replace.includes(item.memory_id)
              ? { ...item, status: 'superseded', updated_at: now, version: item.version + 1 }
              : item,
        ),
        revision: current.revision + 1,
      };
    });
    return structuredClone(result!);
  }

  async update(
    scope: MemoryScope,
    memoryId: string,
    expectedVersion: number,
    input: Pick<CharacterMemory, 'content'> &
      Partial<Pick<CharacterMemory, 'importance' | 'confidence' | 'validity'>>,
  ): Promise<CharacterMemory> {
    let result: CharacterMemory | undefined;
    await this.mutate(ScopeSchema.parse(scope), (current) => {
      const memory = this.require(current, memoryId, expectedVersion);
      result = MemorySchema.parse({
        ...memory,
        ...input,
        memory_id: memory.memory_id,
        source_kind: 'user-edited',
        version: memory.version + 1,
        updated_at: this.now(),
        status: 'candidate',
        confirmed_at: null,
        conflicts_with: [],
      });
      return {
        ...current,
        memories: current.memories.map((item) => (item.memory_id === memoryId ? result! : item)),
        revision: current.revision + 1,
      };
    });
    return structuredClone(result!);
  }

  async delete(scope: MemoryScope, memoryId: string, expectedVersion: number): Promise<boolean> {
    let deleted = false;
    await this.mutate(ScopeSchema.parse(scope), (current) => {
      const existing = current.memories.find((item) => item.memory_id === memoryId);
      if (!existing) return current;
      const memory = this.require(current, memoryId, expectedVersion);
      deleted = true;
      return {
        ...current,
        memories: current.memories.filter((item) => item.memory_id !== memoryId),
        deleted_fingerprints: [
          ...new Set([
            ...current.deleted_fingerprints,
            memoryFingerprint(memory),
            memory.memory_id.replace(/^memory_/u, ''),
          ]),
        ],
        revision: current.revision + 1,
      };
    });
    return deleted;
  }

  async deleteAll(scope: MemoryScope): Promise<number> {
    let count = 0;
    await this.mutate(ScopeSchema.parse(scope), (current) => {
      count = current.memories.length;
      return {
        ...current,
        memories: [],
        deleted_fingerprints: [
          ...new Set([
            ...current.deleted_fingerprints,
            ...current.memories.flatMap((memory) => [
              memoryFingerprint(memory),
              memory.memory_id.replace(/^memory_/u, ''),
            ]),
          ]),
        ],
        revision: current.revision + 1,
      };
    });
    return count;
  }

  async drain(): Promise<void> {
    await drainMemoryPartitions(this.domain);
  }

  private require(partition: MemoryPartition, id: string, version: number): CharacterMemory {
    const memory = partition.memories.find((item) => item.memory_id === id);
    if (!memory)
      throw new ImportError('memory-not-found', 'Memory is absent from this character partition');
    if (memory.version !== version)
      throw new ImportError(
        'stale-memory',
        'Memory changed since it was read; reload and review again',
      );
    return memory;
  }

  private mutate(
    scope: MemoryScope,
    transform: (current: MemoryPartition) => MemoryPartition,
  ): Promise<void> {
    return updateMemoryPartition(this.domain, scope, transform).then(() => {});
  }
}

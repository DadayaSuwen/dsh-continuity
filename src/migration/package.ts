import { z } from 'zod';
import type { ContinuityDomain } from '../storage.ts';
import { MemoryPartitionSchema, emptyPartition, scopeKey, sourceKey } from '../storage.ts';
import { ScopeSchema, SourceSchema, identityOf, sameScope } from '../model.ts';
import type { MemoryScope } from '../model.ts';
import { digest } from './preview.ts';
import { parseDataJson } from '../security/json.ts';
import { ImportError } from '../security/archive.ts';
import { memoryFingerprint } from '../memory/memory.ts';

export const MigrationPackageSchema = z
  .object({
    format: z.literal('dsh-continuity'),
    schema_version: z.literal(1),
    payload: z
      .object({
        owner: ScopeSchema,
        exported_at: z.number().int().nonnegative(),
        sources: z.array(SourceSchema).max(1000),
        memories: MemoryPartitionSchema,
      })
      .strict(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

/** Explicit user backup; raw bytes and approved/candidate memories are separate assets. */
export function exportPackage(
  domain: ContinuityDomain,
  input: MemoryScope,
  now = Date.now(),
): Uint8Array {
  const scope = ScopeSchema.parse(input);
  const sources = [...domain.table('sources').entries()]
    .map(([, asset]) => asset)
    .filter((asset) => sameScope(asset, scope));
  const partition = domain.table('memories').get(scopeKey(scope)) ?? emptyPartition(scope);
  const payload = { owner: scope, exported_at: now, sources, memories: partition };
  return new TextEncoder().encode(
    JSON.stringify({
      format: 'dsh-continuity',
      schema_version: 1,
      payload,
      sha256: digest(JSON.stringify(payload)),
    }),
  );
}

/** v1 import is merge-only and idempotent; source writes precede an atomic memory partition commit. */
export async function restorePackage(
  domain: ContinuityDomain,
  bytes: Uint8Array,
  destination: MemoryScope,
  maxBytes = 512 * 1024 * 1024,
): Promise<{ source_count: number; memory_count: number }> {
  if (bytes.length > maxBytes)
    throw new ImportError('too-large', 'Migration package exceeds configured byte limit');
  const raw = parseDataJson(bytes);
  const validated = MigrationPackageSchema.parse(raw);
  const scope = ScopeSchema.parse(destination);
  if (digest(JSON.stringify(validated.payload)) !== validated.sha256)
    throw new ImportError('package-digest', 'Migration package digest checksum mismatch');
  const originalScope = validated.payload.owner;
  if (
    !sameScope(validated.payload.memories, originalScope) ||
    validated.payload.sources.some((source) => !sameScope(source, originalScope)) ||
    validated.payload.memories.memories.some((memory) => !sameScope(memory, originalScope))
  )
    throw new ImportError('package-scope', 'Migration package mixes character identities');
  for (const source of validated.payload.sources) {
    const binary = Buffer.from(source.raw_base64, 'base64');
    if (
      digest(binary) !== source.digest ||
      source.source_id !== `source:${source.digest}` ||
      source.preview.source_id !== source.source_id
    )
      throw new ImportError('source-digest', 'Original source digest does not match');
  }
  const sourceIds = new Set(validated.payload.sources.map((source) => source.source_id));
  for (const memory of validated.payload.memories.memories) {
    if (!sourceIds.has(memory.source_id))
      throw new ImportError('missing-source', 'Backup memory references an absent source');
    const source = validated.payload.sources.find((asset) => asset.source_id === memory.source_id);
    const message = source?.preview.conversations
      .find((conversation) => conversation.id === memory.source_session_id)
      ?.messages.find((item) => item.id === memory.source_message_id);
    if (!message?.text.includes(memory.source_excerpt))
      throw new ImportError('invalid-evidence', 'Backup memory does not quote its original source');
  }
  const mapped = validated.payload.memories.memories.map((memory) => ({
    ...memory,
    ...identityOf(scope),
  }));
  for (const source of validated.payload.sources) {
    const key = sourceKey(scope, source.source_id);
    const table = domain.table('sources');
    const existing = table.get(key);
    if (existing && existing.raw_base64 !== source.raw_base64)
      throw new ImportError('source-conflict', 'Existing source has different bytes');
    if (!existing) await table.put(key, { ...source, ...scope });
  }
  const key = scopeKey(scope);
  const table = domain.table('memories');
  if (!table.get(key)) await table.put(key, emptyPartition(scope));
  let count = 0;
  await table.update(key, (current) => {
    if (!sameScope(current, scope))
      throw new ImportError('scope-mismatch', 'Destination identity does not match');
    const deleted = new Set([
      ...current.deleted_fingerprints,
      ...validated.payload.memories.deleted_fingerprints,
    ]);
    const isDeleted = (memory: (typeof mapped)[number]) =>
      deleted.has(memoryFingerprint(memory)) ||
      deleted.has(memory.memory_id.replace(/^memory_/u, ''));
    const merged = current.memories.filter((memory) => !isDeleted(memory));
    for (const memory of mapped) {
      if (isDeleted(memory)) continue;
      const existing = merged.find((item) => item.memory_id === memory.memory_id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(memory))
        throw new ImportError(
          'memory-conflict',
          'Existing memory differs; review before restoring',
        );
      if (!existing) merged.push(memory);
    }
    count = merged.length;
    return {
      ...current,
      memories: merged,
      deleted_fingerprints: [
        ...new Set([
          ...current.deleted_fingerprints,
          ...validated.payload.memories.deleted_fingerprints,
        ]),
      ],
      revision: current.revision + 1,
    };
  });
  return { source_count: validated.payload.sources.length, memory_count: count };
}

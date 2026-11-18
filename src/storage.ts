import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
import type { Domain } from '@deepseek-ai/dsh-storage-domain';
import { z } from 'zod';
import {
  BindingSchema,
  LedgerSchema,
  MemorySchema,
  ScopeSchema,
  SourceSchema,
  identityOf,
  sameScope,
} from './model.ts';
import { ImportError } from './security/archive.ts';
import type { MemoryScope, SourceAsset } from './model.ts';
import { digest } from './migration/preview.ts';

export const MemoryPartitionSchema = ScopeSchema.extend({
  memories: z.array(MemorySchema).max(10000),
  deleted_fingerprints: z.array(z.string()).max(20000),
  revision: z.number().int().nonnegative(),
});
export type MemoryPartition = z.infer<typeof MemoryPartitionSchema>;

export const continuityDomain = defineDomain({
  name: 'dsh_continuity',
  version: 1,
  layout: 'per-record' as const,
  tables: {
    sources: domainTable<string, SourceAsset>(SourceSchema),
    memories: domainTable<string, MemoryPartition>(MemoryPartitionSchema),
    bindings: domainTable<string, z.infer<typeof BindingSchema>>(BindingSchema),
    imports: domainTable<string, z.infer<typeof LedgerSchema>>(LedgerSchema),
    cursors: domainTable<string, { session_id: string; last_seq: number }>(
      z.object({ session_id: z.string().min(1), last_seq: z.number().int().min(-1) }),
    ),
  },
});
export type ContinuityDomain = Domain<typeof continuityDomain>;

export const scopeKey = (scope: MemoryScope): string => digest(JSON.stringify(identityOf(scope)));
export const sourceKey = (scope: MemoryScope, sourceId: string): string =>
  digest(JSON.stringify([scopeKey(scope), sourceId]));

export function emptyPartition(scope: MemoryScope): MemoryPartition {
  return { ...ScopeSchema.parse(scope), memories: [], deleted_fingerprints: [], revision: 0 };
}

const memoryWrites = new WeakMap<ContinuityDomain, Map<string, Promise<void>>>();
/** All plugin memory writers share initialization, serialization and validation before durability. */
export function updateMemoryPartition(
  domain: ContinuityDomain,
  scope: MemoryScope,
  transform: (current: MemoryPartition) => MemoryPartition,
): Promise<MemoryPartition> {
  let queues = memoryWrites.get(domain);
  if (!queues) {
    queues = new Map();
    memoryWrites.set(domain, queues);
  }
  const key = scopeKey(scope);
  const run = (queues.get(key) ?? Promise.resolve()).then(async () => {
    const table = domain.table('memories');
    if (!table.get(key)) await table.put(key, emptyPartition(scope));
    return table.update(key, (current) => {
      if (!sameScope(current, scope))
        throw new ImportError(
          'scope-mismatch',
          'Stored memory partition does not match its identity',
        );
      const next = MemoryPartitionSchema.parse(transform(current));
      if (!sameScope(next, scope) || next.memories.some((memory) => !sameScope(memory, scope)))
        throw new ImportError('scope-mismatch', 'A memory belongs to another partition');
      if (new Set(next.memories.map((memory) => memory.memory_id)).size !== next.memories.length)
        throw new ImportError(
          'duplicate-memory',
          'Memory identities must be unique inside a partition',
        );
      return next;
    });
  });
  const tail = run.then(
    () => {},
    () => {},
  );
  queues.set(key, tail);
  void tail.then(() => {
    if (queues!.get(key) === tail) queues!.delete(key);
  });
  return run;
}

export async function drainMemoryPartitions(domain: ContinuityDomain): Promise<void> {
  await Promise.all(memoryWrites.get(domain)?.values() ?? []);
}

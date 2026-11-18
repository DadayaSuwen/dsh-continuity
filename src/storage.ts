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
} from './model.ts';
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

import { Context } from '@deepseek-ai/cordis';
import Storage from '@deepseek-ai/dsh-storage';
import * as StorageJson from '@deepseek-ai/dsh-storage-json';
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain';
import * as JsonlPersistence from '@deepseek-ai/dsh-session-persistence-jsonl';
import SessionQuery from '@deepseek-ai/dsh-session-query-sqlite';
import {
  mountAgentLoopTestDependencies,
  mountAgentLoopTestHarness,
} from '@deepseek-ai/dsh-agent-loop-testkit';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { continuityDomain } from '../../src/storage.ts';

/** Real upstream modules and real filesystem; no substitute Session database. */
export async function createRuntime(root: string) {
  const ctx = new Context();
  await ctx.plugin(Storage);
  await ctx.plugin(StorageJson, { root: join(root, 'storages') });
  await ctx.plugin(StorageDomain, { backend: 'json' });
  await mountAgentLoopTestDependencies(ctx, { workingDirectory: true });
  await ctx.plugin(JsonlPersistence, { root: join(root, 'sessions'), compression: 'none' });
  await mountAgentLoopTestHarness(ctx);
  await ctx.plugin(SessionQuery, { path: ':memory:', openAt: 'never' });
  const domain = await ctx.storage.domain.open(continuityDomain);
  const workspace = join(root, 'workspace');
  await mkdir(workspace, { recursive: true });
  return {
    ctx,
    domain,
    workspace,
    dispose: async () => {
      await domain.close();
      await ctx.fiber.dispose();
    },
  };
}

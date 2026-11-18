import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import * as Plugin from '../../../src/index.ts';
import { createRuntime } from '../../helpers/runtime.ts';
import { companionScope } from '../../fixtures/companion.ts';
import { ScriptedModel } from '../../helpers/model.ts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

it('captures new Session history through official Session Query in review-only batches', async () => {
  const root = await mkdtemp(join(tmpdir(), 'continuity-batch-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const runtime = await createRuntime(root);
  await runtime.domain.close();
  cleanup.push(runtime.dispose);
  await runtime.ctx.plugin(Plugin, {
    ...Plugin.DEFAULT_ARCHIVE_LIMITS,
    ownerId: 'owner',
    contextTokenBudget: 8192,
    batchEveryTurns: 1,
  });
  runtime.ctx.llm.registerAdapter(['fixture'], new ScriptedModel());
  const service = runtime.ctx.continuity;
  const agent = await service.newSession(companionScope, runtime.workspace, {
    provider: 'fixture',
    model: 'fixture',
  });
  agent.followup(
    createUserMessage({
      content: [{ type: 'text', text: '我喜欢茉莉茶，请记住这个偏好。' }],
      source: { kind: 'user' },
    }),
  );
  await agent.whenIdle();
  await service.extractSession(companionScope, agent.id);
  const memories = service.memory.list(companionScope);
  expect(memories.some((memory) => memory.content.includes('茉莉茶'))).toBe(true);
  expect(
    memories.every((memory) => memory.status === 'candidate' || memory.status === 'conflict'),
  ).toBe(true);
  const count = memories.length;
  await service.extractSession(companionScope, agent.id);
  expect(service.memory.list(companionScope)).toHaveLength(count);
  const archive = service.migration.listSources(companionScope)[0]!;
  expect(archive.preview.format).toBe('generic-json');
  expect(Buffer.from(archive.raw_base64, 'base64').length).toBeGreaterThan(0);
});

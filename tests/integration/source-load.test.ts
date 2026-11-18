import { expect, it } from 'vitest';

it('loads source-backed official interfaces without replacing the runtime', async () => {
  for (const entry of [
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-llm',
    '@deepseek-ai/dsh-session',
    '@deepseek-ai/dsh-agent-loop',
    '@deepseek-ai/dsh-storage-domain',
  ]) {
    try {
      const loaded = await import(entry);
      expect(Object.keys(loaded).length).toBeGreaterThan(0);
    } catch (error) {
      console.error(`[source-load:${entry}]`, error);
      throw error;
    }
  }
});

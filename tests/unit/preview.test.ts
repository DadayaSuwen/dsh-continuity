import { describe, expect, it } from 'vitest';
import { previewImport } from '../../src/migration/preview.ts';
import { companionZip } from '../fixtures/companion.ts';

describe('Migration preview', () => {
  it('reports raw branches and thinking without claiming all are active context', async () => {
    const result = await previewImport(
      companionZip(),
      'deepseek_data.zip',
      {},
      new AbortController().signal,
    );
    expect(result.format).toBe('deepseek-v3');
    expect(result.message_count).toBe(5);
    expect(result.conversations[0]?.active_branch).toBe('4');
    expect(result.conversations[0]?.branches).toEqual(['4', '5']);
    expect(result.conversations[0]?.messages[1]?.text).toBe('小禾，我是林。我们约定每周一起看海。');
    expect(result.conversations[0]?.warnings.join(' ')).toMatch(/branch/i);
  });

  it('does not invent roles or timestamps for copied unlabelled text', async () => {
    const result = await previewImport(
      new TextEncoder().encode('一段未标注的聊天'),
      'chat.txt',
      {},
      new AbortController().signal,
    );
    expect(result.conversations[0]?.messages[0]?.role).toBe('unknown');
    expect(result.conversations[0]?.messages[0]?.timestamp).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { buildRecovery } from '../../src/recovery/recovery.ts';
import type { CharacterMemory } from '../../src/model.ts';
import { companionScope } from '../fixtures/companion.ts';

const memory = (change: Partial<CharacterMemory>): CharacterMemory => ({
  ...companionScope,
  memory_id: 'm1',
  scope: 'character',
  memory_type: 'persona',
  content: '你叫林，沉稳温柔。',
  fact_key: 'persona.identity',
  source_id: 'source1',
  source_session_id: 'c1',
  source_message_id: '1',
  source_excerpt: '你叫林，沉稳温柔。',
  source_kind: 'user-statement',
  created_at: 1,
  updated_at: 1,
  importance: 1,
  confidence: 1,
  validity: { from: null, until: null },
  version: 1,
  status: 'active',
  confirmed_at: 1,
  conflicts_with: [],
  ...change,
});

describe('Recovery context', () => {
  it('only exposes confirmed in-scope records, never other roles or candidates', () => {
    const result = buildRecovery(
      companionScope,
      [
        memory({}),
        memory({ memory_id: 'foreign', character_id: 'other', content: '另一个角色的秘密' }),
        memory({ memory_id: 'candidate', status: 'candidate', content: '未经确认的推测' }),
      ],
      { tokenBudget: 1800, query: '你是谁', now: 100 },
    );
    expect(result.memory_ids).toEqual(['m1']);
    expect(result.text).toContain('你叫林');
    expect(result.text).not.toContain('秘密');
    expect(result.text).not.toContain('推测');
  });

  it('includes the complete framing inside a conservative UTF-8 token upper bound', () => {
    const result = buildRecovery(
      companionScope,
      [
        memory({ content: '林'.repeat(1000) }),
        memory({
          memory_id: 'story',
          fact_key: 'story.current',
          memory_type: 'story',
          content: '当前位置：灯塔，寻找船长。',
        }),
      ],
      { tokenBudget: 1100, query: '灯塔', now: 100 },
    );
    expect(Buffer.byteLength(result.text, 'utf8')).toBeLessThanOrEqual(1100);
    expect(result.memory_ids).toEqual(['story']);
    expect(result.omitted).toBe(1);
  });

  it('reports an undersized framing budget instead of cutting a record or forging context', () => {
    expect(() => buildRecovery(companionScope, [], { tokenBudget: 10, now: 100 })).toThrow(
      /budget/i,
    );
  });
});

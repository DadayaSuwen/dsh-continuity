import { describe, expect, it } from 'vitest';
import { buildRecovery } from '../../src/recovery/recovery.ts';
import type { CharacterMemory } from '../../src/model.ts';
import { companionScope } from '../fixtures/companion.ts';

/** Independently labelled synthetic continuity benchmark, deterministic/context-only; not live-model quality. */
const baseline: CharacterMemory = {
  ...companionScope,
  memory_id: 'persona',
  scope: 'character',
  memory_type: 'persona',
  content: '角色林：沉稳温柔，称呼用户为小禾。',
  fact_key: 'persona.identity',
  source_id: 'synthetic-source',
  source_session_id: 'c1',
  source_message_id: '1',
  source_excerpt: '角色林：沉稳温柔，称呼用户为小禾。',
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
};
const fixture = (overrides: Partial<CharacterMemory>) => ({ ...baseline, ...overrides });
const cases: Array<{
  name: string;
  records: CharacterMemory[];
  required: string[];
  absent: string[];
}> = [
  {
    name: 'long companion identity',
    records: [baseline],
    required: ['沉稳温柔', '小禾'],
    absent: ['陌生角色'],
  },
  {
    name: 'preference superseded',
    records: [
      fixture({
        memory_id: 'old',
        memory_type: 'user',
        content: '以前喜欢咖啡',
        fact_key: 'user.drink',
        status: 'superseded',
      }),
      fixture({
        memory_id: 'new',
        memory_type: 'user',
        content: '现在喜欢茶',
        fact_key: 'user.drink',
      }),
    ],
    required: ['现在喜欢茶'],
    absent: ['以前喜欢咖啡'],
  },
  {
    name: 'relationship transition',
    records: [
      fixture({
        memory_id: 'relationship',
        memory_type: 'relationship',
        content: '现在是互相信任的搭档',
        fact_key: 'relationship.current',
      }),
    ],
    required: ['互相信任的搭档'],
    absent: ['陌生人'],
  },
  {
    name: 'multiple characters',
    records: [
      baseline,
      fixture({ memory_id: 'other', character_id: 'different', content: '另角色的秘密' }),
    ],
    required: ['角色林'],
    absent: ['另角色的秘密'],
  },
  {
    name: 'long-span important event',
    records: [
      fixture({
        memory_id: 'past',
        memory_type: 'episodic',
        content: '一年前一起修复灯塔',
        fact_key: null,
      }),
    ],
    required: ['修复灯塔'],
    absent: ['去山城'],
  },
  {
    name: 'same character other Session',
    records: [
      fixture({
        memory_id: 'other-session',
        source_session_id: 'c2',
        content: '第二次对话的海边约定',
        fact_key: null,
      }),
    ],
    required: ['海边约定'],
    absent: ['另一角色'],
  },
  {
    name: 'conflicting identity withheld',
    records: [baseline, fixture({ memory_id: 'conflict', content: '角色叫别的名字' })],
    required: ['persona.identity'],
    absent: ['角色叫别的名字', '沉稳温柔'],
  },
  {
    name: 'user edited memory reviewed',
    records: [fixture({ content: '用户更正：角色戴银色耳饰', source_kind: 'user-edited' })],
    required: ['银色耳饰'],
    absent: ['金色耳饰'],
  },
  {
    name: 'deleted memory absent',
    records: [],
    required: ['memories'],
    absent: ['修复灯塔', '小禾'],
  },
  {
    name: 'compaction recovery projection',
    records: [baseline],
    required: ['角色林', '小禾'],
    absent: ['凭空约定'],
  },
  {
    name: 'imported story point',
    records: [
      fixture({
        memory_id: 'story',
        memory_type: 'story',
        content: '当前灯塔，下一步寻找失踪船长，银钥匙在小禾手里',
        fact_key: 'story.current',
      }),
    ],
    required: ['寻找失踪船长', '银钥匙'],
    absent: ['船长已找到'],
  },
  {
    name: 'cross-model same evidence',
    records: [baseline],
    required: ['角色林', 'user-statement'],
    absent: ['provider-specific fictional fact'],
  },
  {
    name: 'assistant fictional evidence labelled',
    records: [
      fixture({
        memory_type: 'episodic',
        content: '剧情中一起看海',
        source_kind: 'assistant-fiction',
        fact_key: null,
      }),
    ],
    required: ['assistant-fiction'],
    absent: ['现实用户是船长'],
  },
  {
    name: 'candidate never recovered',
    records: [fixture({ content: '尚未确认的用户猜测', status: 'candidate', confirmed_at: null })],
    required: ['memories'],
    absent: ['尚未确认的用户猜测'],
  },
];

describe('Character continuity labelled benchmark', () => {
  it.each(cases)('$name', ({ records, required, absent }) => {
    for (const now of [1000, 86400000 * 500]) {
      const answer = buildRecovery(companionScope, records, { tokenBudget: 4096, now });
      for (const text of required) expect(answer.text).toContain(text);
      for (const text of absent) expect(answer.text).not.toContain(text);
      expect(answer.token_upper_bound).toBeLessThanOrEqual(4096);
      for (const id of answer.memory_ids)
        expect(
          records.some((record) => record.memory_id === id && record.source_message_id === '1'),
        ).toBe(true);
    }
  });
});

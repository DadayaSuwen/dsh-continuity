import { strToU8, zipSync } from 'fflate';

export const companionScope = {
  owner_id: 'owner',
  agent_id: 'companion',
  character_id: 'lin',
  story_id: 'harbor',
};

/** Entirely synthetic official-format export, never a real user's chat. */
export function companionZip(): Uint8Array {
  const conversation = {
    id: 'c1',
    title: '林与小禾的灯塔',
    current_message_id: 4,
    inserted_at: '2026-01-01T10:00:00Z',
    messages: [
      {
        id: 1,
        parent_id: null,
        role: 'USER',
        status: 'FINISHED',
        inserted_at: '2026-01-01T10:00:00Z',
        fragments: [{ type: 'REQUEST', content: '角色：你叫林，沉稳温柔。请叫我小禾。' }],
      },
      {
        id: 2,
        parent_id: 1,
        role: 'ASSISTANT',
        status: 'FINISHED',
        inserted_at: '2026-01-01T10:00:01Z',
        fragments: [
          { type: 'THINK', content: '这是虚构角色。' },
          { type: 'RESPONSE', content: '小禾，我是林。我们约定每周一起看海。' },
        ],
      },
      {
        id: 3,
        parent_id: 2,
        role: 'USER',
        status: 'FINISHED',
        inserted_at: '2026-01-02T10:00:00Z',
        fragments: [
          {
            type: 'REQUEST',
            content:
              '剧情：我们已到灯塔，银钥匙在我手里；下一步寻找失踪的船长。关系：我们是互相信任的搭档。',
          },
        ],
      },
      {
        id: 4,
        parent_id: 3,
        role: 'ASSISTANT',
        status: 'FINISHED',
        inserted_at: '2026-01-02T10:00:01Z',
        fragments: [{ type: 'RESPONSE', content: '我会守着灯塔，和你一起找船长。' }],
      },
      {
        id: 5,
        parent_id: 1,
        role: 'ASSISTANT',
        status: 'FINISHED',
        inserted_at: '2026-01-01T10:00:02Z',
        fragments: [{ type: 'RESPONSE', content: '另一个分支：我们去了山城。' }],
      },
    ],
  };
  return zipSync({
    'manifest.json': strToU8('{"export_format_version":3}'),
    'chat_session_index.json': strToU8(
      JSON.stringify([
        { id: 'c1', inserted_at: conversation.inserted_at, updated_at: '2026-01-02T10:00:01Z' },
      ]),
    ),
    'chat_sessions/c1.json': strToU8(JSON.stringify(conversation)),
  });
}

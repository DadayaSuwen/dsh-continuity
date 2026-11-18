import { LlmAdapter } from '@deepseek-ai/dsh-llm';
import type { GenerateOptions, LlmResolvedModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm';

/** Only external model IO is scripted. Cordis/AgentLoop/Session/Storage remain production implementations. */
export class ScriptedModel extends LlmAdapter {
  requests: GenerateOptions[] = [];
  async resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return { provider, id: model, name: model };
  }
  async *stream(request: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(request);
    const text = '小禾，我记得灯塔和我们的约定。';
    yield { type: 'block-start', index: 0, blockType: 'text' };
    yield { type: 'text-delta', index: 0, text };
    yield { type: 'block-end', index: 0, block: { type: 'text', text } };
    yield { type: 'usage', usage: { inputTokens: 20, outputTokens: 20 } };
    yield { type: 'finish', reason: { kind: 'stop' } };
  }
}

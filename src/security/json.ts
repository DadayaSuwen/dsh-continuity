import { ImportError } from './archive.ts';

/** Strict UTF-8 + iterative JSON depth/size/prototype checks at every file/request boundary. */
export function parseDataJson(bytes: Uint8Array, maxDepth = 48, maxNodes = 500000): unknown {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new ImportError('invalid-unicode', 'Input is not valid UTF-8');
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ImportError('invalid-json', 'Input is not valid JSON');
  }
  const pending = [{ value, depth: 0 }];
  let nodes = 0;
  while (pending.length) {
    const next = pending.pop();
    if (!next) break;
    if (++nodes > maxNodes || next.depth > maxDepth)
      throw new ImportError('json-limit', 'JSON exceeds depth or node limit');
    const current = next.value;
    if (
      typeof current === 'string' &&
      /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(current)
    )
      throw new ImportError('invalid-unicode', 'Input contains an unpaired surrogate');
    if (typeof current === 'number' && !Number.isFinite(current))
      throw new ImportError('invalid-json', 'JSON number is not finite');
    if (current !== null && typeof current === 'object') {
      for (const [key, child] of Object.entries(current)) {
        if (key === '__proto__' || key === 'prototype' || key === 'constructor')
          throw new ImportError('unsafe-json', 'JSON contains a reserved object key');
        pending.push({ value: child, depth: next.depth + 1 });
      }
    }
  }
  return value;
}

import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { inspectZip } from '../../src/security/archive.ts';

const signal = () => new AbortController().signal;

describe('untrusted archive preflight', () => {
  it('keeps valid entries without extracting user supplied paths', async () => {
    const input = zipSync({ 'manifest.json': strToU8('{"export_format_version":3}') });
    const result = await inspectZip(input, {}, signal());
    expect(new TextDecoder().decode(result.get('manifest.json'))).toBe(
      '{"export_format_version":3}',
    );
  });

  it('reports traversal rather than passing it to an importer', async () => {
    const input = zipSync({ '../outside.json': strToU8('private') });
    await expect(inspectZip(input, {}, signal())).rejects.toThrow(/path/i);
  });
});

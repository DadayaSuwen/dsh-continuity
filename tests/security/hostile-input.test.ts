import { expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { inspectZip } from '../../src/security/archive.ts';
import { parseDataJson } from '../../src/security/json.ts';
import { previewImport } from '../../src/migration/preview.ts';
import { companionZip } from '../fixtures/companion.ts';

const signal = () => new AbortController().signal;

it.each([
  '/absolute.json',
  'C:/outside.json',
  'foo\\bar.json',
  'foo/../bar.json',
  'foo/%00.json\u0000',
  'con.txt',
  'foo/bar.',
])('blocks hostile file paths %s', async (name) => {
  await expect(inspectZip(zipSync({ [name]: strToU8('{}') }), {}, signal())).rejects.toThrow(
    /path/i,
  );
});
it('bounds declared compression ratio before decompression', async () => {
  const zip = zipSync({ 'bomb.txt': strToU8('A'.repeat(1000000)) }, { level: 9 });
  await expect(inspectZip(zip, { maxCompressionRatio: 20 }, signal())).rejects.toThrow(/ratio/i);
});
it('bounds upload and expanded size independently', async () => {
  const zip = companionZip();
  await expect(inspectZip(zip, { maxUploadBytes: 10 }, signal())).rejects.toThrow(/upload/i);
  await expect(inspectZip(zip, { maxExpandedBytes: 10 }, signal())).rejects.toThrow(/expanded/i);
});
it('detects filename camouflage and unsupported versions', async () => {
  await expect(previewImport(strToU8('not a zip'), 'chat.zip', {}, signal())).rejects.toThrow(
    /ZIP/i,
  );
  const zip = zipSync({
    'manifest.json': strToU8('{"export_format_version":99}'),
    'chat_session_index.json': strToU8('[]'),
  });
  await expect(previewImport(zip, 'chat.zip', {}, signal())).rejects.toThrow(/unsupported/i);
});
it('rejects poison keys, deep JSON, invalid UTF-8 and unpaired surrogate', () => {
  expect(() => parseDataJson(strToU8('{"__proto__":{"admin":true}}'))).toThrow(/reserved/i);
  expect(() => parseDataJson(strToU8('['.repeat(100) + '0' + ']'.repeat(100)))).toThrow(/depth/i);
  expect(() => parseDataJson(new Uint8Array([0xff, 0xfe]))).toThrow(/UTF-8/i);
  expect(() => parseDataJson(strToU8('{"text":"\\ud800"}'))).toThrow(/surrogate/i);
});
it('checks CRC and actual expanded bytes instead of trusting only directory metadata', async () => {
  const zip = zipSync({ 'value.txt': strToU8('hello') }, { level: 0 });
  const changed = zip.slice();
  const view = new DataView(changed.buffer);
  changed[30 + view.getUint16(26, true)] = 33;
  await expect(inspectZip(changed, {}, signal())).rejects.toThrow(/CRC/i);
});
it('rejects case-folded duplicate filenames', async () => {
  const zip = zipSync({ 'same.txt': strToU8('a'), 'SAME.txt': strToU8('b') });
  await expect(inspectZip(zip, {}, signal())).rejects.toThrow(/Duplicate/i);
});
it('honors cancellation without publishing parsed assets', async () => {
  const abort = new AbortController();
  abort.abort(new Error('cancelled by user'));
  await expect(inspectZip(companionZip(), {}, abort.signal)).rejects.toThrow(/cancelled/i);
});

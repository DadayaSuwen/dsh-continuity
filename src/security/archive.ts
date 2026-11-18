import { inflateRaw } from 'node:zlib';

export interface ArchiveLimits {
  maxUploadBytes: number;
  maxExpandedBytes: number;
  maxEntryBytes: number;
  maxFiles: number;
  maxCompressionRatio: number;
}

export const DEFAULT_ARCHIVE_LIMITS: ArchiveLimits = {
  maxUploadBytes: 128 * 1024 * 1024,
  maxExpandedBytes: 512 * 1024 * 1024,
  maxEntryBytes: 64 * 1024 * 1024,
  maxFiles: 10000,
  maxCompressionRatio: 200,
};

export class ImportError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

export function assertAssetPath(path: string): void {
  const parts = path.replace(/\/$/, '').split('/');
  if (
    path.length === 0 ||
    path.length > 1024 ||
    path.startsWith('/') ||
    /[\\:\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(path) ||
    parts.some(
      (part) =>
        part === '' ||
        part === '.' ||
        part === '..' ||
        /[. ]$/u.test(part) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(part),
    )
  )
    throw new ImportError('unsafe-path', `Unsafe archive path: ${JSON.stringify(path)}`);
}

interface Entry {
  name: string;
  compressed: number;
  expanded: number;
  offset: number;
  method: number;
  flags: number;
  crc: number;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let i = 0; i < 8; i++) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ (CRC_TABLE[(crc ^ byte) & 255] ?? 0);
  return (crc ^ 0xffffffff) >>> 0;
}

function boundedInflate(bytes: Uint8Array, maxOutputLength: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    inflateRaw(bytes, { maxOutputLength: Math.max(1, maxOutputLength) }, (error, output) => {
      if (error)
        reject(
          new ImportError(
            'invalid-deflate',
            `Invalid or oversized deflate stream: ${error.message}`,
          ),
        );
      else resolve(output);
    });
  });
}

/** Validate and bound the archive before the upstream format Adapter sees it. Never extracts to disk. */
export async function inspectZip(
  bytes: Uint8Array,
  configured: Partial<ArchiveLimits> = {},
  signal: AbortSignal,
): Promise<Map<string, Uint8Array>> {
  const limits = { ...DEFAULT_ARCHIVE_LIMITS, ...configured };
  for (const key of Object.keys(DEFAULT_ARCHIVE_LIMITS) as Array<keyof ArchiveLimits>) {
    const value = limits[key];
    if (!Number.isSafeInteger(value) || value < 1)
      throw new ImportError('invalid-limits', `${key} must be a positive integer`);
  }
  signal.throwIfAborted();
  if (bytes.length > limits.maxUploadBytes)
    throw new ImportError('too-large', 'Archive exceeds upload limit');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fail = (message: string): never => {
    throw new ImportError('invalid-zip', message);
  };
  const bounds = (offset: number, size: number): void => {
    if (offset < 0 || size < 0 || offset + size > bytes.length) fail('Truncated archive');
  };
  const u16 = (offset: number): number => {
    bounds(offset, 2);
    return view.getUint16(offset, true);
  };
  const u32 = (offset: number): number => {
    bounds(offset, 4);
    return view.getUint32(offset, true);
  };
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (u32(i) === 0x06054b50 && i + 22 + u16(i + 20) === bytes.length) {
      end = i;
      break;
    }
  }
  if (end < 0) fail('Not a ZIP archive');
  if (u16(end + 4) !== 0 || u16(end + 6) !== 0 || u16(end + 8) !== u16(end + 10))
    fail('Multipart ZIP is unsupported');
  const count = u16(end + 10);
  const directorySize = u32(end + 12);
  const directoryOffset = u32(end + 16);
  if (count === 65535 || directorySize === 0xffffffff || directoryOffset === 0xffffffff)
    fail('ZIP64 is unsupported');
  if (count > limits.maxFiles)
    throw new ImportError('too-many-files', 'Archive exceeds file count limit');
  if (directoryOffset + directorySize !== end) fail('Unexpected archive directory layout');
  bounds(directoryOffset, directorySize);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const decode = (offset: number, size: number): string => {
    bounds(offset, size);
    try {
      return decoder.decode(bytes.subarray(offset, offset + size));
    } catch {
      throw new ImportError('invalid-unicode', 'Archive path is not valid UTF-8');
    }
  };
  const entries: Entry[] = [];
  const names = new Set<string>();
  let expandedTotal = 0;
  let cursor = directoryOffset;
  for (let index = 0; index < count; index++) {
    signal.throwIfAborted();
    if (u32(cursor) !== 0x02014b50) fail('Invalid central directory');
    bounds(cursor, 46);
    const nameLength = u16(cursor + 28);
    const extraLength = u16(cursor + 30);
    const commentLength = u16(cursor + 32);
    const name = decode(cursor + 46, nameLength);
    assertAssetPath(name);
    const canonical = name.normalize('NFC').toLowerCase();
    if (names.has(canonical))
      throw new ImportError('duplicate-path', `Duplicate archive path: ${name}`);
    names.add(canonical);
    const flags = u16(cursor + 8);
    const method = u16(cursor + 10);
    if ((flags & 1) !== 0 || (method !== 0 && method !== 8))
      fail('Encrypted or unsupported ZIP entry');
    if (u16(cursor + 34) !== 0) fail('Multipart entry is unsupported');
    const unixType = (u32(cursor + 38) >>> 16) & 0xf000;
    if (unixType !== 0 && unixType !== 0x8000 && unixType !== 0x4000)
      fail('Special file or link entry is unsupported');
    const compressed = u32(cursor + 20);
    const expanded = u32(cursor + 24);
    if (compressed === 0xffffffff || expanded === 0xffffffff) fail('ZIP64 entry is unsupported');
    if (expanded > limits.maxEntryBytes || compressed > limits.maxEntryBytes)
      throw new ImportError('too-large', `Entry exceeds byte limit: ${name}`);
    if (expanded > Math.max(1, compressed) * limits.maxCompressionRatio)
      throw new ImportError('compression-ratio', `Excessive compression ratio: ${name}`);
    expandedTotal += expanded;
    if (expandedTotal > limits.maxExpandedBytes)
      throw new ImportError('too-large', 'Archive exceeds expanded byte limit');
    entries.push({
      name,
      flags,
      method,
      compressed,
      expanded,
      offset: u32(cursor + 42),
      crc: u32(cursor + 16),
    });
    cursor += 46 + nameLength + extraLength + commentLength;
    if (cursor > end) fail('Directory entry exceeds directory');
  }
  if (cursor !== end) fail('Unlisted directory bytes');
  entries.sort((a, b) => a.offset - b.offset);
  const result = new Map<string, Uint8Array>();
  let nextOffset = 0;
  for (const entry of entries) {
    signal.throwIfAborted();
    if (entry.offset !== nextOffset) fail('Duplicate local header or unlisted entry');
    const at = entry.offset;
    if (u32(at) !== 0x04034b50 || u16(at + 6) !== entry.flags || u16(at + 8) !== entry.method)
      fail('Local header disagrees with directory');
    const nameLength = u16(at + 26);
    const extraLength = u16(at + 28);
    if (decode(at + 30, nameLength) !== entry.name) fail('Local path disagrees with directory');
    const dataOffset = at + 30 + nameLength + extraLength;
    const dataEnd = dataOffset + entry.compressed;
    if (dataEnd > directoryOffset) fail('Entry overlaps directory');
    bounds(dataOffset, entry.compressed);
    if ((entry.flags & 8) === 0) {
      if (
        u32(at + 14) !== entry.crc ||
        u32(at + 18) !== entry.compressed ||
        u32(at + 22) !== entry.expanded
      )
        fail('Local sizes disagree with directory');
      nextOffset = dataEnd;
    } else {
      const descriptor = u32(dataEnd) === 0x08074b50 ? dataEnd + 4 : dataEnd;
      if (
        u32(descriptor) !== entry.crc ||
        u32(descriptor + 4) !== entry.compressed ||
        u32(descriptor + 8) !== entry.expanded
      )
        fail('Invalid data descriptor');
      nextOffset = descriptor + 12;
    }
    const packed = bytes.subarray(dataOffset, dataEnd);
    const data =
      entry.method === 0
        ? packed.slice()
        : await boundedInflate(packed, Math.min(limits.maxEntryBytes, entry.expanded));
    signal.throwIfAborted();
    if (data.length !== entry.expanded || crc32(data) !== entry.crc)
      fail(`Size or CRC mismatch: ${entry.name}`);
    result.set(entry.name, data);
  }
  if (nextOffset !== directoryOffset) fail('Unlisted local entry or trailing data');
  return result;
}

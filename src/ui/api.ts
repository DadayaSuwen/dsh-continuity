import type { MemoryScope } from '../model.ts';

export interface BrowserInfo {
  data_destination: string;
  max_upload_bytes: number;
  workspaces: Array<{ id: string; title: string; path: string }>;
  external_memory_api: boolean;
  default_model_calls: boolean;
}
export type ClientIdentity = Omit<MemoryScope, 'owner_id'>;

const BASE = '/api/dsh-continuity';
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const carrier = (
    globalThis as typeof globalThis & { __DSH_TRANSPORT__?: { fetch?: typeof fetch } }
  ).__DSH_TRANSPORT__?.fetch;
  const response = await (carrier ?? fetch)(new URL(BASE + path, document.baseURI), {
    credentials: 'same-origin',
    ...init,
  });
  const result = (await response.json()) as
    { ok: true; value: T } | { ok: false; error: { code: string; message: string } };
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.value;
}
export const query = (scope: ClientIdentity): string =>
  new URLSearchParams({
    agent_id: scope.agent_id,
    character_id: scope.character_id,
    ...(scope.story_id === null ? {} : { story_id: scope.story_id }),
  }).toString();
export async function action<T>(
  scope: ClientIdentity,
  value: object,
  signal?: AbortSignal,
): Promise<T> {
  return api<T>('/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...scope, ...value }),
    ...(signal === undefined ? {} : { signal }),
  });
}

/** Native file picker → XHR: actual upload byte progress; no browser ZIP unpacking. */
export function upload<T>(
  file: File,
  progress: (percent: number) => void,
  signal: AbortSignal,
): Promise<T> {
  if ((globalThis as typeof globalThis & { __DSH_TRANSPORT__?: unknown }).__DSH_TRANSPORT__)
    return api<T>(`/preview?${new URLSearchParams({ filename: file.name })}`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: file,
      signal,
    });
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BASE + `/preview?${new URLSearchParams({ filename: file.name })}`);
    xhr.setRequestHeader('content-type', 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) progress(Math.round((event.loaded / event.total) * 100));
    };
    const abort = () => xhr.abort();
    signal.addEventListener('abort', abort, { once: true });
    xhr.onload = () => {
      signal.removeEventListener('abort', abort);
      try {
        const result = JSON.parse(xhr.responseText);
        if (result.ok) resolve(result.value);
        else reject(new Error(result.error?.message ?? `HTTP ${xhr.status}`));
      } catch {
        reject(new Error('The DSH Host returned an invalid response'));
      }
    };
    xhr.onerror = () => {
      signal.removeEventListener('abort', abort);
      reject(new Error('Upload connection failed'));
    };
    xhr.onabort = () => {
      signal.removeEventListener('abort', abort);
      reject(new Error('Upload cancelled'));
    };
    if (signal.aborted) reject(new Error('Upload cancelled'));
    else xhr.send(file);
  });
}

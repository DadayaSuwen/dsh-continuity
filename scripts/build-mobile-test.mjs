import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve('.runtime/mobile');
await mkdir(root, { recursive: true });
const require = createRequire(import.meta.url);
const uiModules = await build({
  entryPoints: ['tests/e2e/browser/mount.tsx'],
  outfile: join(root, 'app.js'),
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  loader: { '.css': 'text' },
  sourcemap: true,
});
await writeFile(join(root, 'style.css'), await readFile('src/ui/style.css'));
await writeFile(
  join(root, 'index.html'),
  '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DSH Continuity · Native Slot E2E</title><link rel="stylesheet" href="/style.css"></head><body style="margin:0"><div id="app"></div><script type="module" src="/app.js"></script></body></html>',
);
await build({
  entryPoints: ['tests/e2e/browser/server.ts'],
  outfile: join(root, 'server.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  plugins: [
    {
      name: 'official-source-seam',
      setup(builder) {
        builder.onResolve({ filter: /^[^./]/ }, (args) => {
          if (args.path.startsWith('node:')) return { path: args.path, external: true };
          if (args.path.startsWith('@deepseek-ai/dsh-deepseek-chat-import/src/')) return;
          try {
            return { path: pathToFileURL(require.resolve(args.path)).href, external: true };
          } catch {
            try {
              return {
                path: pathToFileURL(
                  createRequire(require.resolve('@deepseek-ai/dsh/package.json')).resolve(
                    args.path,
                  ),
                ).href,
                external: true,
              };
            } catch {
              return;
            }
          }
        });
      },
    },
  ],
  sourcemap: true,
});
console.log(
  'Built native Cordis Slot browser and real DSH Host E2E assembly',
  uiModules.errors.length,
);

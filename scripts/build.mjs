import { build } from 'esbuild';
import { mkdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

await mkdir('dist', { recursive: true });
const hostExternal = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/schemastery',
  '@deepseek-ai/dsh-agent',
  '@deepseek-ai/dsh-session',
  '@deepseek-ai/dsh-session-persistence',
  '@deepseek-ai/dsh-session-projection',
  '@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-system-prompt',
  '@deepseek-ai/dsh-storage',
  '@deepseek-ai/dsh-storage-domain',
  '@deepseek-ai/dsh-workspace',
  '@deepseek-ai/dsh-session-title',
  '@deepseek-ai/dsh-tool-web',
  '@deepseek-ai/dsh-client-connection',
  '@deepseek-ai/dsh-attachment',
];
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
  external: hostExternal,
  legalComments: 'eof',
});
const css = await readFile('src/ui/style.css', 'utf8');
const meta = `, meta: () => ({ stylesheets: { 'src/ui/style.css': { text: () => ${JSON.stringify(css)} } } })`;
await build({
  entryPoints: ['src/ui/client.tsx'],
  outfile: 'dist/client.js',
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  jsx: 'automatic',
  sourcemap: true,
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-ui-slots',
  ],
  banner: {
    js: 'window.__ModuleLoader__.load({ id: "dsh-continuity", factory: (require) => { var module = { exports: {} }; var exports = module.exports;',
  },
  footer: { js: `return module.exports; }${meta} });` },
  loader: { '.css': 'text' },
  legalComments: 'eof',
});
await build({
  entryPoints: ['src/ui/client.tsx'],
  outfile: 'dist/client-node.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  loader: { '.css': 'text' },
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-ui-slots',
  ],
});
const result = spawnSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json'],
  { stdio: 'inherit' },
);
if (result.status !== 0) process.exit(result.status ?? 1);

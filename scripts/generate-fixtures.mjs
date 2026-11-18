import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

await mkdir('.runtime/fixtures', { recursive: true });
await build({
  entryPoints: ['tests/fixtures/companion.ts'],
  outfile: '.runtime/fixtures/companion.mjs',
  platform: 'node',
  format: 'esm',
  target: 'node24',
  bundle: true,
});
const { companionZip } = await import(
  pathToFileURL(resolve('.runtime/fixtures/companion.mjs')).href
);
await writeFile('.runtime/fixtures/deepseek_data_synthetic.zip', companionZip());
console.log('Generated entirely synthetic official-format ZIP');

import { readFileSync, readdirSync, existsSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const normalize = (value) => value.replace(/\r\n/g, '\n');
const hash = (value) => createHash('sha256').update(normalize(value)).digest('hex');
const upstream = resolve(process.env.DSH_SOURCE_ROOT ?? 'upstream/deepseek-harness');
const results = [];
const visit = (dir) => {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const base = join(dir, entry.name);
    const manifest = join(base, 'package.json');
    if (!existsSync(manifest)) {
      visit(base);
      continue;
    }
    const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
    const installed = resolve('node_modules', pkg.name);
    const source = join(base, 'src/index.ts');
    if (!existsSync(installed) || !existsSync(source)) continue;
    const published = join(realpathSync(installed), 'src/index.ts');
    if (!existsSync(published)) continue;
    results.push({
      package: pkg.name,
      source,
      match: hash(readFileSync(source, 'utf8')) === hash(readFileSync(published, 'utf8')),
    });
  }
};
visit(join(upstream, 'packages'));
for (const result of results) console.log(`${result.match ? 'MATCH' : 'DIFF'} ${result.package}`);
console.log(
  JSON.stringify({
    checked: results.length,
    differing: results.filter((result) => !result.match).map((result) => result.package),
  }),
);

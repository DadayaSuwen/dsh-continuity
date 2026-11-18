import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import ts from 'typescript';

const root = resolve(process.env.DSH_SOURCE_ROOT ?? 'upstream/deepseek-harness');
const aliases: Array<{ find: RegExp; replacement: string }> = [];
const require = createRequire(import.meta.url);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sourceDirectories: string[] = [];
const dependencyResolution = new Map<string, string>();

for (const namespace of ['packages', 'vendor']) {
  const first = readdirSync(join(root, namespace), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, namespace, entry.name));
  const directories =
    namespace === 'vendor'
      ? first
      : first.flatMap((directory) =>
          readdirSync(directory, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => join(directory, entry.name)),
        );
  for (const directory of directories) {
    const manifest = join(directory, 'package.json');
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, 'utf8')) as {
      name: string;
      dependencies?: Record<string, string>;
    };
    if (!existsSync(join(directory, 'src/index.ts'))) continue;
    sourceDirectories.push(directory);
    for (const [suffix, file] of [
      ['/types', 'src/types.ts'],
      ['/surface', 'src/surface.ts'],
      ['/fork', 'src/fork.ts'],
      ['/projection', 'src/projection.ts'],
      ['/pipeline', 'src/pipeline.ts'],
      ['/message-projections', 'src/message-projections.ts'],
      ['', 'src/index.ts'],
    ]) {
      const target = join(directory, file);
      if (existsSync(target))
        aliases.push({ find: new RegExp(`^${escape(pkg.name + suffix)}$`), replacement: target });
    }
    aliases.push({
      find: new RegExp(`^${escape(pkg.name)}/src/(.*)$`),
      replacement: `${directory.replaceAll('\\', '/')}/src/$1`,
    });
    try {
      // Resolve each source package's actual third-party runtime dependencies at its published peer's lookup position.
      let installedManifest: string;
      try {
        installedManifest = require.resolve(`${pkg.name}/package.json`);
      } catch {
        installedManifest = createRequire(require.resolve('@deepseek-ai/dsh/package.json')).resolve(
          `${pkg.name}/package.json`,
        );
      }
      const ownerRequire = createRequire(realpathSync(installedManifest));
      for (const name of Object.keys(pkg.dependencies ?? {})) {
        if (name.startsWith('@deepseek-ai/')) continue;
        try {
          dependencyResolution.set(name, ownerRequire.resolve(name));
        } catch {
          /* Missing dependencies remain a real test error. */
        }
      }
    } catch {
      /* Source-only modules use the tested project's dependency lookup. */
    }
  }
}
for (const [name, replacement] of dependencyResolution)
  aliases.push({ find: new RegExp(`^${escape(name)}$`), replacement });
const runtimeRequire = createRequire(require.resolve('@deepseek-ai/dsh/package.json'));
for (const entry of ['@deepseek-ai/node-addon-system/flock'])
  aliases.push({
    find: new RegExp(`^${escape(entry)}$`),
    replacement: runtimeRequire.resolve(entry),
  });

export default defineConfig({
  plugins: [
    {
      name: 'pinned-typescript-standard-decorators',
      enforce: 'pre',
      transform(code, id) {
        const file = id.split('?', 1)[0] ?? id;
        if (!/\.[cm]?tsx?$/u.test(file) || !/^\s*@[A-Za-z_$][\w$]*/mu.test(code)) return;
        const transformed = ts.transpileModule(code, {
          fileName: file,
          compilerOptions: {
            target: ts.ScriptTarget.ES2024,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
            sourceMap: true,
          },
        });
        return {
          code: transformed.outputText.replace(/\n?\/\/# sourceMappingURL=.*$/u, '\n'),
          map: transformed.sourceMapText,
        };
      },
    },
  ],
  resolve: { alias: aliases },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    server: { deps: { inline: [/^@deepseek-ai\//] } },
    reporters: ['default', ['junit', { outputFile: 'test-results/pinned-junit.xml' }]],
  },
});

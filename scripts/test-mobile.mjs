import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
await mkdir('.runtime', { recursive: true });
const home = await mkdtemp(resolve('.runtime/mobile-run-'));
await import('./build.mjs');
await import('./build-mobile-test.mjs');
const env = {
  ...process.env,
  DSH_HOME: join(home, 'host-home'),
  DSH_TELEMETRY_DISABLED: '1',
  CONTINUITY_E2E_ROOT: join(home, 'data'),
  CONTINUITY_E2E_PORT: '0',
};
const model = join(home, 'fixture-model.mjs');
await build({
  entryPoints: ['tests/helpers/model.ts'],
  outfile: model,
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  target: 'node24',
  footer: {
    js: "export function apply(ctx) { ctx.llm.registerAdapter(['fixture'], new ScriptedModel()); } export const inject = ['llm'];",
  },
});
const patch = join(home, 'full-web.patch.yml');
await writeFile(
  patch,
  `- id: workspace-controller\n  config:\n    documentsDirectory: ${JSON.stringify(join(home, 'documents'))}\n    documentsLookupTimeoutMs: 10000\n- insert:\n    - id: dsh-continuity\n      name: ${JSON.stringify(pathToFileURL(resolve('dist/index.js')).href)}\n      config:\n        ownerId: local-owner\n        contextTokenBudget: 8192\n    - id: fixture-model\n      name: ${JSON.stringify(pathToFileURL(model).href)}\n`,
);

const children = [];
const logs = [];
async function launch(args, childEnv, matcher) {
  const child = spawn(process.execPath, args, {
    env: childEnv,
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  let output = '';
  const url = new Promise((resolveUrl, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('DSH test Host did not become ready')),
      45000,
    );
    const take = (chunk) => {
      output += chunk.toString();
      const matched = matcher(output);
      if (matched) {
        clearTimeout(timeout);
        resolveUrl(matched);
      }
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.once('exit', (code) => {
      clearTimeout(timeout);
      if (code) reject(new Error(`DSH Host exited ${code}: ${output}`));
    });
  });
  const ready = await url;
  logs.push(() => output.replace(/([?&]token=)[^\s"\\]+/g, '$1[redacted]'));
  return ready;
}
let status = 1;
try {
  const small = await launch(['.runtime/mobile/server.mjs'], env, (text) => {
    const match = /CONTINUITY_E2E_READY (\{[^\n]+\})/u.exec(text);
    return match ? JSON.parse(match[1]).url : null;
  });
  const full = await launch(
    [
      require.resolve('@deepseek-ai/dsh/lib/bin.js'),
      'web',
      '--patch',
      patch,
      '--port',
      '0',
      '--no-open',
    ],
    { ...env, DSH_HOME: join(home, 'full-home') },
    (text) => /dsh web: (http:\/\/[^\s]+)/u.exec(text)?.[1],
  );
  const test = spawn(
    process.execPath,
    [join(resolve('node_modules/@playwright/test'), 'cli.js'), 'test', ...process.argv.slice(2)],
    { env: { ...env, CONTINUITY_E2E_URL: small, CONTINUITY_FULL_WEB_URL: full }, stdio: 'inherit' },
  );
  const [code] = await once(test, 'exit');
  status = code ?? 1;
} catch (error) {
  console.error(error.message);
} finally {
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/mobile-hosts.log', logs.map((get) => get()).join('\n'));
  await writeFile(
    'test-results/mobile-runtime.json',
    JSON.stringify(
      {
        result: status === 0 ? 'passed' : 'failed',
        node: process.version,
        viewports: [
          [390, 844],
          [360, 800],
        ],
        home,
        officialProfile: true,
        data: 'synthetic only',
        model: 'scripted external model fixture',
        tested_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}
process.exit(status);

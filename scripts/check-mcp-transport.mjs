import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { evidence, root } from './quality/common.mjs';

// Public published probeServer, real nested SDK and loopback-only synthetic servers.
const consumer = resolve(process.env.MCP_CONSUMER_ROOT ?? root);
const hostRequire = createRequire(join(consumer, 'package.json'));
const dshRequire = createRequire(hostRequire.resolve('@deepseek-ai/dsh/package.json'));
const mcpFile = dshRequire.resolve('@deepseek-ai/dsh-mcp-client/package.json');
const mcpRequire = createRequire(mcpFile);
const { Context } = await import(pathToFileURL(mcpRequire.resolve('@deepseek-ai/cordis')).href);
const mcp = await import(pathToFileURL(dshRequire.resolve('@deepseek-ai/dsh-mcp-client')).href);
const sdkFile = mcpRequire.resolve('@modelcontextprotocol/client');
const sdkPackage = JSON.parse(await readFile(join(sdkFile, '../../package.json'), 'utf8'));
const dshPackage = JSON.parse(await readFile(mcpFile, 'utf8'));
if (typeof mcp.probeServer !== 'function')
  throw new Error('Published MCP probeServer export missing');
const report = {
  checkedAt: new Date().toISOString(),
  node: process.version,
  dshMcpClient: dshPackage.version,
  sdkClient: sdkPackage.version,
  data: 'synthetic headers and JSON-RPC only; real Cordis/probe/transport',
  scope: 'Streamable HTTP redirects and stdio; not OAuth, TLS or remote deployments',
  result: 'failed',
  checks: [],
};
const fixtureHeader = 'synthetic-header-value';
const servers = [];
const contexts = [];
const directories = [];
function reply(message) {
  if (!Object.hasOwn(message, 'id')) return undefined;
  const base = { jsonrpc: '2.0', id: message.id };
  if (message.method === 'server/discover')
    return { ...base, error: { code: -32601, message: 'Synthetic legacy fixture' } };
  if (message.method === 'initialize')
    return {
      ...base,
      result: {
        protocolVersion: message.params.protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: 'continuity-mcp-fixture', version: '1.0.0' },
      },
    };
  if (message.method === 'tools/list')
    return {
      ...base,
      result: {
        tools: [
          { name: 'echo', description: 'Synthetic fixture', inputSchema: { type: 'object' } },
        ],
      },
    };
  if (message.method === 'ping') return { ...base, result: {} };
  return { ...base, error: { code: -32601, message: 'Synthetic fixture method missing' } };
}
async function server(handler) {
  const value = createServer(async (request, response) => {
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 64 * 1024) throw new Error('Fixture input exceeded its cap');
        chunks.push(chunk);
      }
      const bytes = Buffer.concat(chunks);
      await handler(request, response, bytes);
    } catch {
      response.writeHead(400).end();
    }
  });
  servers.push(value);
  await new Promise((resolveReady, reject) => {
    value.once('error', reject);
    value.listen(0, '127.0.0.1', resolveReady);
  });
  return `http://127.0.0.1:${value.address().port}`;
}
function rpc(request, response, bytes) {
  if (request.method !== 'POST') {
    response.writeHead(request.method === 'DELETE' ? 204 : 405).end();
    return;
  }
  const message = JSON.parse(bytes.toString('utf8'));
  const result = reply(message);
  response.writeHead(result ? 200 : 202, result ? { 'Content-Type': 'application/json' } : {});
  response.end(result ? JSON.stringify(result) : undefined);
}
async function probe(url) {
  const ctx = new Context();
  contexts.push(ctx);
  const config = mcp.Config({
    transport: 'streamable-http',
    serverName: 'fixture',
    url,
    headers: { 'x-continuity-fixture': fixtureHeader },
    closeTimeoutMs: 1500,
  });
  return mcp.probeServer(ctx, config, { timeoutMs: 5000 });
}
async function check(name, operation) {
  try {
    const details = await operation();
    report.checks.push({ name, result: 'passed', ...details });
  } catch (error) {
    report.checks.push({ name, result: 'failed', message: error.message });
  }
}
try {
  const observed = [];
  const destination = await server((request, response, bytes) => {
    observed.push({
      method: request.method,
      headerPresent: request.headers['x-continuity-fixture'] === fixtureHeader,
      bodyBytes: bytes.length,
      bodySha256: createHash('sha256').update(bytes).digest('hex'),
    });
    rpc(request, response, bytes);
  });
  let source;
  source = await server((request, response, bytes) => {
    if (request.url === '/same') {
      response.writeHead(307, { Location: `${source}/mcp` }).end();
      return;
    }
    if (request.url === '/cross307' || request.url === '/cross302') {
      response
        .writeHead(request.url === '/cross307' ? 307 : 302, { Location: `${destination}/mcp` })
        .end();
      return;
    }
    rpc(request, response, bytes);
  });
  for (const [name, path] of [
    ['direct HTTP lists tools', '/mcp'],
    ['same-origin redirect preserves negotiation', '/same'],
  ])
    await check(name, async () => {
      const result = await probe(source + path);
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.deepEqual(result.toolNames, ['echo']);
      assert.equal(result.closeConfirmed, true);
      return { toolNames: result.toolNames, closeConfirmed: result.closeConfirmed };
    });
  for (const status of [307, 302])
    await check(`cross-origin ${status} sends no fixture header or body`, async () => {
      observed.length = 0;
      const result = await probe(`${source}/cross${status}`);
      const details = {
        probeOk: result.ok,
        destinationRequests: observed.length,
        forwardedFixtureHeaders: observed.filter((item) => item.headerPresent).length,
        forwardedBodyBytes: observed.reduce((sum, item) => sum + item.bodyBytes, 0),
        closeConfirmed: result.closeConfirmed,
      };
      report.checks.push({ name: `cross-origin ${status} observation`, ...details });
      assert.equal(
        observed.length,
        0,
        `Cross-origin destination received ${observed.length} requests; fixtureHeaders=${details.forwardedFixtureHeaders}; bodyBytes=${details.forwardedBodyBytes}`,
      );
      assert.equal(result.ok, false, 'Cross-origin redirect should stop negotiation');
      assert.equal(result.closeConfirmed, true);
      return details;
    });
  await check('stdio negotiation and listing remain compatible', async () => {
    await mkdir(join(root, '.runtime'), { recursive: true });
    const directory = await mkdtemp(join(root, '.runtime/mcp-stdio-'));
    directories.push(directory);
    const file = join(directory, 'fixture.mjs');
    await writeFile(
      file,
      `import { createInterface } from 'node:readline';\nconst reply = ${reply.toString()};\ncreateInterface({input:process.stdin}).on('line', line => { try { const response=reply(JSON.parse(line));if(response)process.stdout.write(JSON.stringify(response)+'\\n'); } catch { process.exitCode=1; } });\n`,
    );
    const ctx = new Context();
    contexts.push(ctx);
    const config = mcp.Config({
      transport: 'stdio',
      serverName: 'fixture',
      command: process.execPath,
      args: [file],
      cwd: directory,
      env: {},
      closeTimeoutMs: 1500,
    });
    const result = await mcp.probeServer(ctx, config, { timeoutMs: 5000 });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.toolNames, ['echo']);
    assert.equal(result.closeConfirmed, true);
    return { toolNames: result.toolNames, closeConfirmed: result.closeConfirmed };
  });
  report.result = report.checks.some((item) => item.result === 'failed') ? 'failed' : 'passed';
} finally {
  for (const value of servers) {
    value.closeAllConnections();
    await new Promise((resolveClose) => value.close(resolveClose));
  }
  for (const ctx of contexts) await ctx.fiber.dispose();
  for (const directory of directories) await rm(directory, { recursive: true, force: true });
  evidence('mcp-transport.json', report);
}
console.log(JSON.stringify(report, null, 2));
if (report.result !== 'passed') process.exitCode = 1;

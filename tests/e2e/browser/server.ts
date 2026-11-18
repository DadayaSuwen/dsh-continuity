import { createRuntime } from '../../helpers/runtime.ts';
import Host from '@deepseek-ai/dsh-host-webserver';
import * as Connection from '@deepseek-ai/dsh-client-connection';
import * as Frontend from '@deepseek-ai/dsh-host-frontend-static';
import Credentials from '@deepseek-ai/dsh-credentials-local';
import Workspace from '@deepseek-ai/dsh-workspace';
import * as Plugin from '../../../src/index.ts';
import { ScriptedModel } from '../../helpers/model.ts';
import { join, resolve } from 'node:path';

const root = resolve(process.env.CONTINUITY_E2E_ROOT ?? '.runtime/mobile-data');
const runtime = await createRuntime(root);
await runtime.domain.close();
await runtime.ctx.plugin(Credentials, { path: join(root, 'credentials.yml'), watch: false });
await runtime.ctx.plugin(Host, {
  host: '127.0.0.1',
  port: Number(process.env.CONTINUITY_E2E_PORT ?? 3917),
});
await runtime.ctx.plugin(Connection);
await runtime.ctx.plugin(Workspace);
await runtime.ctx.workspaceRegistry.create(runtime.workspace);
await runtime.ctx.plugin(Frontend, { distIndex: resolve('.runtime/mobile/index.html') });
await runtime.ctx.plugin(Plugin, {
  ...Plugin.DEFAULT_ARCHIVE_LIMITS,
  ownerId: 'local-owner',
  contextTokenBudget: 8192,
  batchEveryTurns: 0,
});
runtime.ctx.llm.registerAdapter(['fixture'], new ScriptedModel());
const url = runtime.ctx.connection.authenticatedUrl(
  `http://127.0.0.1:${runtime.ctx.webServer.port}/`,
);
console.log('CONTINUITY_E2E_READY', JSON.stringify({ url, data: root }));
const stop = async () => {
  await runtime.dispose();
  process.exit(0);
};
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());

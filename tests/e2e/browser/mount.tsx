import { apply as clientApply } from '../../../src/ui/client.tsx';
import type { Context } from '@deepseek-ai/cordis';
import { Context as BrowserContext } from '@deepseek-ai/cordis';
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/src/client/registry.ts';
import { createSlotRenderer } from '@deepseek-ai/dsh-client-ui-renderer/src/client/scoped-slots.tsx';
import { createRoot } from 'react-dom/client';

/** Native Cordis Slot registry and production renderer, with no mock UI/HTTP client. */
const ctx: Context = new BrowserContext();
const slots = new SlotRegistry(ctx);
slots.install(createSlotRenderer());
const absent = { key: undefined, hooks: {}, keyedHooks: {}, props: {} };
const absentSource = { getSnapshot: () => absent, subscribe: () => () => {} };
ctx.slots.installScope('session', { current: absentSource, bindingSource: () => absentSource });
ctx.slots.register(
  { name: 'root', children: { 'sidebar.session.action': { kind: 'hoc', scope: 'root' } } },
  ({
    renderSlot,
  }: {
    renderSlot: (
      name: 'sidebar.session.action',
      props: { wide: boolean; children: unknown },
    ) => unknown;
  }) => renderSlot('sidebar.session.action', { wide: true, children: null }) as never,
);
clientApply(ctx);
const element = document.getElementById('app');
if (!element) throw new Error('Missing DSH mount target');
createRoot(element).render(ctx.slots.renderSlot('root', {}));

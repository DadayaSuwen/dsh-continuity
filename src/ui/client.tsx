import type { Context } from '@deepseek-ai/cordis';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import stylesheet from './style.css';
import type { ReactNode } from 'react';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import { ContinuityPanel } from './Panel.tsx';

export const name = 'dsh-continuity-client';
export const inject = ['slots'];
export { ContinuityPanel };

function Modal({ close }: { close: () => void }): ReactNode {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    layer.current?.querySelector<HTMLElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (event.key !== 'Tab') return;
      const targets = [
        ...(layer.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary',
        ) ?? []),
      ].filter((element) => element.offsetParent !== null);
      const first = targets[0];
      const last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [close]);
  return createPortal(
    <div
      ref={layer}
      className="continuity-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="聊天迁移"
    >
      <ContinuityPanel onClose={close} />
    </div>,
    document.body,
  );
}

function Launcher({ children }: { children?: ReactNode; wide?: boolean }): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <>
      {children}
      <button
        className="continuity-launch"
        onClick={() => setOpen(true)}
        aria-label="聊天迁移与角色记忆"
      >
        迁移与记忆
      </button>
      {open && <Modal close={() => setOpen(false)} />}
    </>
  );
}

/** Official HOC slot decorates New session, never replaces the DSH shell or runtime. */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const selector = 'style[data-plugin="dsh-continuity"][data-path="src/ui/style.css"]';
    if (document.head.querySelector(selector)) return () => {};
    const style = document.createElement('style');
    style.dataset.plugin = 'dsh-continuity';
    style.dataset.path = 'src/ui/style.css';
    style.textContent = stylesheet;
    document.head.appendChild(style);
    return () => style.remove();
  }, 'continuity: stylesheet compatibility');
  ctx.slots.inject('sidebar.session.action', () =>
    ctx.slots.register({ name: 'sidebar.session.action', id: 'dsh-continuity' }, Launcher),
  );
}

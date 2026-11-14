import type { ReactNode } from 'react';

type PanelLayoutProps = {
  title: string;
  children: ReactNode;
  /**
   * Shown next to the title, e.g. a count.
   */
  badge?: ReactNode;
  actions?: ReactNode;
  /**
   * Stays at the bottom of the panel while its content scrolls.
   */
  footer?: ReactNode;
};

export function PanelLayout(props: PanelLayoutProps) {
  const { title, children, badge, actions, footer } = props;

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <header className='flex h-12 shrink-0 items-center gap-2 border-b border-zinc-800 px-4'>
        <h2 className='text-sm font-semibold text-zinc-100'>{title}</h2>
        {badge !== undefined && (
          <span className='rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400 tabular-nums'>
            {badge}
          </span>
        )}
        {actions && <div className='ml-auto flex items-center gap-1'>{actions}</div>}
      </header>
      <div className='min-h-0 flex-1 overflow-y-auto'>{children}</div>
      {footer && <footer className='shrink-0 border-t border-zinc-800 p-3'>{footer}</footer>}
    </div>
  );
}

/**
 * The usual padding and spacing of a panel's sections.
 */
export function PanelBody(props: { children: ReactNode }) {
  const { children } = props;

  return <div className='space-y-7 p-4'>{children}</div>;
}

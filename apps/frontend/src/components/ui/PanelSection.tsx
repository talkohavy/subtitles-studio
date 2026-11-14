import type { ReactNode } from 'react';
import { cn } from '@src/common/utils/cn';

type PanelSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function PanelSection(props: PanelSectionProps) {
  const { title, children, className } = props;

  return (
    <section className={cn('space-y-3', className)}>
      <h3 className='text-[11px] font-semibold tracking-wider text-zinc-500 uppercase'>{title}</h3>
      {children}
    </section>
  );
}

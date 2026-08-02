import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

type DescribedElement = ReactElement<{ 'aria-describedby'?: string }>;

/**
 * Hafif tooltip.
 *
 * `title` özniteliğine güvenmiyoruz: dokunmatik ekranda çalışmaz, klavye
 * odağıyla tutarlı görünmez ve stilini denetleyemeyiz. Burada açıklama
 * hem hover hem focus-within ile açılır; hedef düğmeye `aria-describedby`
 * bağlanır.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content?: ReactNode;
  children: ReactElement;
  side?: 'top' | 'bottom';
}) {
  const id = useId();
  if (!content || !isValidElement(children)) return children;

  const target = children as DescribedElement;
  const child = cloneElement(target, {
    'aria-describedby': [
      target.props['aria-describedby'],
      id,
    ].filter(Boolean).join(' '),
  });

  return (
    <span className="group/tooltip relative inline-flex">
      {child}
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-[var(--z-popover)] hidden w-max max-w-56 -translate-x-1/2 rounded-card border border-border-strong bg-surface-2 px-2 py-1 text-meta leading-snug text-foreground shadow-overlay',
          'group-hover/tooltip:block group-focus-within/tooltip:block',
          side === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'
        )}
      >
        {content}
      </span>
    </span>
  );
}

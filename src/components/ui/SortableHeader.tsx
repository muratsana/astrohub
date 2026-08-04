import type { ReactNode } from 'react';

export function SortableHeader({
  children,
  onClick,
  align = 'left',
}: {
  children: ReactNode;
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      className={align === 'right' ? 'py-2 pl-4 text-right' : 'py-2 pr-4'}
    >
      <button
        type="button"
        onClick={onClick}
        className="text-meta font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {children}
      </button>
    </th>
  );
}

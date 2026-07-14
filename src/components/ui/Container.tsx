import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * İçerik konteyneri — §6.4 grid/genişlik kuralları.
 * Maksimum genişlik ~1520px; responsive dış boşluk (mobil 16 / tablet 24 / masaüstü 32–48).
 */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8 xl:px-12',
        className
      )}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * BOŞ DURUM — sonuç yokken gösterilen çerçeve.
 *
 * "Sonuç bulunamadı" tek başına kullanıcıyı çıkmazda bırakır; bu yüzden
 * bileşen bir `hint` bekler: ne denenebileceğini söyleyen tek cümle.
 */
export function EmptyState({
  message,
  hint,
  action,
  className,
}: {
  message: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface-1 px-4 py-14 text-center',
        className
      )}
    >
      <p className="text-body-sm text-foreground">{message}</p>
      {hint && (
        <p className="mx-auto mt-2 max-w-[52ch] text-meta leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

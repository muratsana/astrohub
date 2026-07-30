import type { ReactNode } from 'react';
import { Alert } from './Alert';

/**
 * Etiket + kontrol + hata mesajı sarmalayıcı. Erişilebilirlik için
 * label `htmlFor` ile, hata mesajı ortak `Alert` bileşeniyle bağlanır —
 * `role="alert"` ve renk/punto oradan gelir (§6.7 klavye/erişim).
 *
 * Etiket, sitenin geri kalanındaki ölçüm etiketleriyle aynı dili konuşur:
 * küçük, büyük harf, geniş harf aralıklı. Form alanı da bir okuma penceresi.
 */
export function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="label block">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-meta leading-snug text-faint">{hint}</p>
      )}
      {error && (
        <Alert id={`${htmlFor}-error`} variant="text">
          {error}
        </Alert>
      )}
    </div>
  );
}

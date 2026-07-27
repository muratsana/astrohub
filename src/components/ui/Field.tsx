import type { ReactNode } from 'react';

/**
 * Etiket + kontrol + hata mesajı sarmalayıcı. Erişilebilirlik için
 * label `htmlFor` ve hata `role="alert"` ile bağlanır (§6.7 klavye/erişim).
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
        <p className="text-[10px] leading-snug text-faint">{hint}</p>
      )}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-[11px] leading-snug text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}

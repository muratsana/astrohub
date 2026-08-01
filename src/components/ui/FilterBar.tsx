import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * FİLTRE ŞERİDİ — hücrelere bölünmüş kontrol paneli.
 *
 * Her kontrol yuvarlak köşeli ayrı bir kutu olmak yerine, tek bir ızgaranın
 * hücresi. Hücreler arasındaki ayrım `gap-px` + arka plan çizgi rengiyle
 * kurulur: gerçek bir hairline elde edilir, kenarlıklar üst üste binmez.
 *
 * Galeri sayfasında yerinde yazılmıştı; etkinlikler, ilanlar, ekipman ve saha
 * sayfaları da aynı şeridi kullandığı için buraya çıkarıldı.
 */
export function FilterBar({
  children,
  columns = 4,
  className,
}: {
  children: ReactNode;
  /** Geniş ekrandaki sütun sayısı. */
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const lg = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }[
    columns
  ];

  return (
    <div
      className={cn(
        'mb-4 grid gap-px border border-border bg-border sm:grid-cols-2',
        lg,
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Filtre şeridi hücresi: üstte etiket, altta kontrol.
 *
 * ODAK HALKASI HÜCREYE AİT, KONTROLE DEĞİL. Kontrolün kendi halkası,
 * hücrenin içinde yüzen yuvarlak köşeli ikinci bir kutu üretiyordu —
 * şerit "hücrelere bölünmüş tek panel" olmaktan çıkıp iç içe kutulara
 * dönüşüyordu. Halka kaldırılmadı, yeri değiştirildi: `inset` gölge
 * hücrenin tam sınırına oturur ve odak §6.7'deki gibi her zaman görünür.
 */
export function FilterCell({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-surface-1 px-3 pb-1.5 pt-1.5',
        'has-[:focus-visible]:shadow-[inset_0_0_0_2px_var(--color-primary)]',
        className
      )}
    >
      <label htmlFor={htmlFor} className="label block">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Şerit içindeki kontrollerin ortak sınıfı. Kendi kenarlığı yoktur —
 * çerçeveyi hücre çizer; alan yalnızca içine yazılan değerdir.
 */
export const filterControlClass =
  'h-8 w-full rounded-none border-0 bg-transparent px-0 text-meta ' +
  'focus:bg-transparent focus-visible:outline-none';

/**
 * Onay kutusu hücresi. Etiket ve kutu aynı satırda; hücre yüksekliği
 * diğerleriyle hizalı kalsın diye aynı dolgu kullanılır.
 */
export function FilterToggle({
  label,
  checked,
  onChange,
  id,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center bg-surface-1 px-3 py-2.5',
        'has-[:focus-visible]:shadow-[inset_0_0_0_2px_var(--color-primary)]',
        className
      )}
    >
      <label
        htmlFor={id}
        className="label flex cursor-pointer items-center gap-2 text-muted-foreground has-[:checked]:text-foreground"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          /* 24px: WCAG 2.2 AA dokunma hedefi (2.5.8). 14px'lik kutu
             mobilde parmakla vurulamıyordu. */
          className="h-6 w-6 rounded-card border-border accent-primary"
        />
        {label}
      </label>
    </div>
  );
}

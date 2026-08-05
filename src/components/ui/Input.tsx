import { forwardRef } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const fieldClasses = cn(
  'h-10 w-full rounded-card border border-border bg-surface-1 px-3 text-body-sm text-foreground',
  'placeholder:text-faint',
  'transition-colors focus:border-primary focus:bg-surface-2',
  'aria-[invalid=true]:border-danger'
);

/**
 * DAR ALAN İÇİN GENİŞLİK — `className` ile DEĞİL, bu prop ile.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN AYRI BİR PROP GEREKTİ
 *
 * Taban sınıflar `w-full` taşıyor ve `lib/cn.ts` bir `tailwind-merge`
 * DEĞİL — yalnızca birleştiriyor. `className="w-20"` geçildiğinde iki
 * genişlik sınıfı da nitelikte kalıyor ve kazananı sınıf sırası değil,
 * derlenmiş CSS dosyasındaki sıra belirliyor. Pratikte `w-full` kazandı.
 *
 * Bunun bedeli ölçüldü: `/planlayici` "Seçilen hedefler" panelinde 80px
 * beklenen girdi 497px oldu, `shrink-0` ile birlikte satırın tamamını
 * yedi, yanındaki hedef adı sıfır genişliğe çöktü ve uyarı metni girdinin
 * üstüne bindi. Panel okunmaz hâldeydi (denetim §2.1).
 *
 * Satır içi stil sınıf sırasından etkilenmez, dolayısıyla burası
 * güvenilir tek yol. `className` ile genişlik vermeyi denemeyin —
 * sessizce yok sayılır.
 *
 * KULLANIM:  <Input width="5rem" />   ·   <Select width="6rem" />
 */
type FieldWidth = { width?: string };

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & FieldWidth
>(({ className, width, style, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(fieldClasses, className)}
    style={width ? { ...style, width } : style}
    {...props}
  />
));

Input.displayName = 'Input';

/** Aynı görsel dilde açılır liste — filtre ve seçicilerde kullanılır. */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldWidth
>(({ className, width, style, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      fieldClasses,
      'appearance-none pr-8',
      '[&>option]:bg-[var(--color-surface-1)] [&>option]:text-[var(--color-foreground)]',
      className
    )}
    style={width ? { ...style, width } : style}
    {...props}
  />
));

Select.displayName = 'Select';

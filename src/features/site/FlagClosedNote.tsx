import type { ReactNode } from 'react';
import { LockIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * "BU YÜZEY ŞU AN KAPALI" NOTU.
 *
 * Bir bayrak kapatıldığında yerine ne konacağı sorusunun tek cevabı.
 * Dört yerde (yorum kutusu, forum yanıtı, ilan formu, kayıt formu) aynı
 * cümle kuruluyor; ayrı ayrı yazılsaydı biri "kapalı", biri "devre dışı",
 * biri "şu an mümkün değil" derdi ve ziyaretçi bunları farklı durumlar
 * sanırdı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FORM GİZLENMİYOR, YERİNE BU KONUYOR
 *
 * Kapalı yüzeyi sessizce yok etmek, ziyaretçiye "burada hiç böyle bir
 * şey yoktu" dedirtir — özellikle daha önce kullanmış biri için bu, bir
 * arıza gibi okunur. Not, kapalı olduğunu ve GEÇİCİ olduğunu söylüyor.
 *
 * Biçim forumdaki "konu kilitli" notundan alındı: aynı anlam, aynı
 * görünüm.
 */
export function FlagClosedNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-2 rounded-card border border-border bg-surface-1 px-3 py-2.5 text-meta text-muted-foreground',
        className
      )}
    >
      <LockIcon className="h-3.5 w-3.5 shrink-0 text-faint" />
      {children}
    </p>
  );
}

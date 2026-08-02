import { cn } from '@/lib/cn';
import type { AstroPhoto } from './types';

/**
 * PUAN ROZETİ — ortalamayı GÖSTEREN parça, oy VEREN parça değil.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `RatingControl`TEN AYRILDI
 *
 * `PhotoCard` yalnızca bu rozet için `RatingControl`ü içe aktarıyordu ve
 * o dosya `services/content/engagement` üzerinden oy YAZMA yolunu — sorgu
 * istemcisi, mutasyon kancası, oturum kontrolü — beraberinde getiriyordu.
 * Kart ana sayfada çizildiği için bütün o kod İLK YÜKLENEN JS'e giriyor,
 * galeriyi açan ziyaretçi hiç oy vermeyecek olsa bile indiriyordu.
 * Ölçüldü: bütçe 200.6/200 kB'ye çıktı, kapı düştü.
 *
 * `publicUrl.ts` ile aynı ayrım: "değeri oku" ile "değeri değiştir" ayrı
 * modüller. Rozet 20 satır ve hiçbir şeye bağlı değil.
 *
 * `RatingControl` bunu yeniden dışa aktarıyor — mevcut çağıranlar
 * değişmedi.
 */
export function RatingBadge({
  rating,
  className,
}: {
  rating: AstroPhoto['rating'];
  className?: string;
}) {
  /* Oy yoksa rozet HİÇ çizilmiyor: "0.0/10" yazmak, kötü puan almış bir
     kare ile henüz oy almamış kareyi aynı şey gibi gösterirdi. */
  if (rating.sayi === 0) return null;
  const average = rating.toplam / rating.sayi;

  return (
    <span
      className={cn(
        'tabular inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-meta',
        className
      )}
      title={`${rating.sayi} oyun ortalaması`}
    >
      <span className="font-semibold text-primary">{average.toFixed(1)}</span>
      <span className="text-faint">/10</span>
    </span>
  );
}

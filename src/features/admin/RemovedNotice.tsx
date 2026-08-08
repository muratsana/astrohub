import { cn } from '@/lib/cn';

/**
 * KALDIRILAN İÇERİĞİN YERİNE GEÇEN AÇIKLAMA (plan FAZ 5, görev 3).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN SATIR SİLİNMİYOR
 *
 * Kaldırılan bir iletiyi tamamen yok etmek, tartışmayı okunamaz hâle
 * getiriyor: ona verilen yanıtlar havada kalıyor ve okuyan kişi neyi
 * kaçırdığını bilmiyor. Daha kötüsü, "burada bir şey vardı ve
 * kayboldu" hissi moderasyonu keyfî gösteriyor.
 *
 * Bu yüzden satır yerinde kalıyor; yalnızca metin gidiyor ve yerine
 * KARARIN GEREKÇESİ geçiyor. Okuyan kişi hem bir iletinin kaldırıldığını
 * hem de nedenini görüyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * GEREKÇE METNİ VERİTABANINDAN GELİYOR, BURADA ÜRETİLMİYOR
 *
 * Bileşen kendi başına bir cümle uydurmuyor. Gerekçe `removal_reason`
 * kolonunda ve o kolon boşken kaldırma işleminin kendisi veritabanı
 * tarafından reddediliyor — yani "gerekçesiz kaldırma" diye bir durum
 * oluşamıyor. Buradaki `reason` bu nedenle zorunlu bir alan.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TON: UYARI DEĞİL, BİLGİ
 *
 * Kırmızı bir hata kutusu, kaldırılan iletiyi yazan kişiyi teşhir eden
 * bir damgaya dönüşüyor. Kutu bu yüzden nötr yüzey renginde ve kesik
 * çerçeveli: "burada bir şey vardı" demeye yetiyor, bağırmıyor.
 */
export function RemovedNotice({
  reason,
  className,
}: {
  /** `removal_reason` — kaldırma kararının gerekçesi. */
  reason: string;
  className?: string;
}) {
  return (
    <div
      /* `role="note"`: ekran okuyucuda bu blok iletinin KENDİSİ değil,
         onun yerine geçen bir açıklama. Düz bir paragraf olsaydı
         kullanıcı gerekçeyi yazarın cümlesi sanırdı. */
      role="note"
      className={cn(
        'rounded-card border border-dashed border-border-strong bg-surface-2 px-3 py-2.5',
        className
      )}
    >
      <p className="text-meta font-medium text-muted-foreground">
        Bu içerik moderasyon tarafından kaldırıldı
      </p>
      <p className="mt-0.5 text-meta leading-relaxed text-faint">{reason}</p>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSiteConfig } from './SiteConfigContext';
import { announcementVisible, type Announcement } from './siteConfig';
import { CloseIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * SİTE DUYURU BANDI (§13.2 "Site duyurusu").
 *
 * Panelde metin, ton, tarih penceresi ve "kapatılabilir mi" alanları
 * vardı; ziyaretçi tarafında karşılığı yoktu. Bant üst çubuğun ÜSTÜNDE
 * duruyor: duyuru gezinmenin bir parçası değil, gezinmeden önce okunması
 * istenen şey.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAPATMA HAFIZASI METNE BAĞLI, SABİT BİR ANAHTARA DEĞİL
 *
 * "Kapattım" bilgisi `astrohub:duyuru-kapatildi` altında DUYURUNUN
 * METNİYLE saklanıyor. Sabit bir anahtar (`kapatildi: true`) kullansaydık
 * bir kez kapatan ziyaretçi SONRAKİ duyuruları da hiç görmezdi — üstelik
 * yönetici bunu asla fark edemezdi, çünkü kendi tarayıcısında bant
 * görünmeye devam ederdi. Metin değişince bant geri geliyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * `localStorage` OKUMASI EFEKTTE, RENDER'DA DEĞİL
 *
 * Prerender edilmiş HTML'de `localStorage` yok. Başlangıç değeri olarak
 * okusaydık sunucu ve istemci farklı karar verir, React hidrasyonda
 * uyuşmazlık bildirirdi. Efekt ilk boyamadan sonra çalışıyor: statik HTML
 * her zaman "kapatılmamış" varsayıyor ve zaten duyuru varsayılan olarak
 * KAPALI, yani statik çıktıda bant hiç yok.
 */

const HAFIZA_ANAHTARI = 'astrohub:duyuru-kapatildi';

const tonSinifi: Record<Announcement['ton'], string> = {
  info: 'bg-cold/15 text-foreground',
  success: 'bg-success/15 text-foreground',
  warning: 'bg-warning/20 text-foreground',
  danger: 'bg-danger/20 text-foreground',
};

export function AnnouncementBar() {
  const { announcement, flags } = useSiteConfig();
  const [kapatilan, setKapatilan] = useState<string | null>(null);

  useEffect(() => {
    try {
      setKapatilan(localStorage.getItem(HAFIZA_ANAHTARI));
    } catch {
      /* Depolama kapalıysa bant her açılışta görünür — kabul edilebilir:
         duyurunun görünmesi, kaybolmasından daha az zararlı. */
    }
  }, []);

  if (!announcementVisible(announcement, flags)) return null;
  if (kapatilan === announcement.metin) return null;

  const kapat = () => {
    setKapatilan(announcement.metin);
    try {
      localStorage.setItem(HAFIZA_ANAHTARI, announcement.metin);
    } catch {
      /* Kapatma bu oturumda yine de geçerli; kalıcı olmaması yeterli. */
    }
  };

  return (
    <div
      /*
        `role="status"`: duyuru ekran okuyucuya BİLDİRİLMELİ ama sayfayı
        kesmemeli. `role="alert"` olsaydı okuyucu o an okuduğu şeyi bırakıp
        bandı okurdu — bir site duyurusu için fazla agresif.
      */
      role="status"
      className={cn(
        'flex items-center gap-3 px-4 py-2 text-body-sm sm:px-6',
        tonSinifi[announcement.ton]
      )}
    >
      <p className="flex-1 text-pretty">{announcement.metin}</p>

      {announcement.kapatilabilir && (
        <button
          type="button"
          onClick={kapat}
          aria-label="Duyuruyu kapat"
          /* 44px dokunma hedefi (§6.7) — `check:a11y` bunu ölçüyor. */
          className="grid h-11 w-11 shrink-0 place-items-center rounded-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

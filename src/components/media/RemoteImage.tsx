import { useState } from 'react';
import { StarField } from './StarField';
import { safeUrl } from '@/lib/url';
import { commonsSrcSet } from '@/lib/commons';
import { cn } from '@/lib/cn';

/**
 * DIŞ KAYNAKLI GÖRSEL — düşme payıyla.
 *
 * Haber görsellerinin bir kısmı NASA (kamu malı) ve ESA/Hubble, ESA/Webb,
 * ESO (CC BY 4.0) yayınlarından geliyor; bu kurumların görselleri kaynak
 * belirtilerek kullanılabilir. Telif izni olmayan hiçbir görsel siteye
 * kopyalanmaz — özellikle etkinlik afişleri: onların hakkı düzenleyende
 * kalır ve bizde yalnızca duyuru bağlantısı bulunur.
 *
 * ÜÇ DURUMA DAYANIKLI OLMAK ZORUNDA:
 *   1. Adres yok           → kendi yıldız alanımız çizilir.
 *   2. Adres var, yüklendi → görsel çizilir.
 *   3. Adres var, YÜKLENMEDİ (ağ yok, CSP, kaynak taşınmış) → sessizce
 *      yıldız alanına düşer.
 *
 * Üçüncüsü olmadan tek dosya önizlemede ve çevrimdışı kabukta her kart
 * kırık görsel ikonu gösterirdi. Kırık ikon, yer tutucudan kötüdür:
 * kullanıcıya sitenin bozuk olduğunu söyler.
 */
/**
 * KART GENİŞLİĞİNE GÖRE VARSAYILAN KOPYA GENİŞLİKLERİ.
 *
 * Çoğu kullanım kart/karo (≤660 px çizim alanı); 1200'lük tek kopya
 * yerine tarayıcıya seçenek verilir. Küçük thumb kullanan yerler kendi
 * dar listesini geçer (ör. NewsStrip 86 px levhaları).
 */
const DEFAULT_WIDTHS = [320, 640, 960];

export function RemoteImage({
  src,
  alt,
  seed,
  tint,
  className,
  sizes,
  widths = DEFAULT_WIDTHS,
  priority = false,
}: {
  src?: string;
  alt: string;
  /** Görsel yoksa çizilecek yıldız alanının tohumu. */
  seed: string;
  tint?: string;
  className?: string;
  /**
   * Görselin sayfada kaplayacağı genişlik (`sizes` sözdizimi, ör.
   * `"(min-width: 1024px) 320px, 100vw"`). Verilmezse tarayıcı 100vw
   * varsayar ve gereğinden büyük kopya seçebilir — kart kullanan her
   * çağıran bunu geçmeli.
   */
  sizes?: string;
  /** `srcset` için üretilecek kopya genişlikleri (yalnızca Commons adresleri). */
  widths?: number[];
  /** İlk ekranda LCP adayı olan görsel: eager + yüksek öncelik. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  // `safeUrl` http(s) dışındaki şemaları ve kontrol karakteriyle
  // gizlenmiş adresleri reddeder (§15.4).
  const url = src ? safeUrl(src) : null;

  if (!url || failed) {
    return <StarField seed={seed} tint={tint} />;
  }

  // Commons dışı adreste srcset üretilmez; tek `src` ile eski davranış.
  const srcSet = commonsSrcSet(url, widths) ?? undefined;

  return (
    <img
      src={url}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  );
}

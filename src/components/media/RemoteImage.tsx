import { useState } from 'react';
import { StarField } from './StarField';
import { safeUrl } from '@/lib/url';
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
export function RemoteImage({
  src,
  alt,
  seed,
  tint,
  className,
}: {
  src?: string;
  alt: string;
  /** Görsel yoksa çizilecek yıldız alanının tohumu. */
  seed: string;
  tint?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  // `safeUrl` http(s) dışındaki şemaları ve kontrol karakteriyle
  // gizlenmiş adresleri reddeder (§15.4).
  const url = src ? safeUrl(src) : null;

  if (!url || failed) {
    return <StarField seed={seed} tint={tint} />;
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  );
}

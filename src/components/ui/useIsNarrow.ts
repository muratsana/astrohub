import { useEffect, useState } from 'react';

/**
 * DAR EKRAN MI — tek kaynak.
 *
 * `FilterBar` bunu kendi içinde taşıyordu; tablo görünümü de mobilde
 * karta dönüşmek zorunda olduğu için ikinci bir kopya gerekecekti. İki
 * kopya demek, kırılma noktasının birinde değişip diğerinde kalması
 * demek: filtreler çekmeceye girerken tablo hâlâ tablo kalırdı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN CSS DEĞİL
 *
 * Bu kancayı kullanan yerlerde iki düzen aynı anda DOM'da duramaz:
 * kontroller `id` taşıyor (etiket `htmlFor` ile bağlanıyor) ve tablo
 * satırları bağlantı taşıyor. Gizli bir kopya çift `id` ve klavye
 * sırasında iki kez gezilen satır demekti.
 *
 * PRERENDER'DA GENİŞ VARSAYILIYOR: `matchMedia` Node'da yok ve statik
 * HTML'de tam düzenin bulunması doğru varsayılan.
 */
export function useIsNarrow(query = '(max-width: 639px)'): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [query]);

  return narrow;
}

import { useCallback, useEffect, useState } from 'react';

/**
 * Görünüm tercihi (ızgara / liste) — modül bazında saklanır.
 *
 * Bileşen dosyasından ayrı tutulur: `ViewToggle.tsx` yalnızca bileşen dışa
 * aktarır ve hızlı yenileme (fast refresh) sorunsuz çalışır.
 */

export type ViewMode = 'grid' | 'list';

const viewModes = ['grid', 'list'] as const;

/**
 * Sınırlı seçenekli, modül bazında saklanan bir görünüm tercihi.
 *
 * `useViewMode` bunun ızgara/liste ile sabitlenmiş hâli. Ayrı bir kanca
 * yazılmasının sebebi: forum yoğunluğu (yalnızca başlık / başlık ve metin)
 * ızgara-liste ikilisinin üçüncü şıkkı değil, aynı fikrin başka bir eksende
 * tekrarı. İkisini tek birleşime sıkıştırmak, `'grid' | 'list' | 'baslik'`
 * gibi hiçbir sayfada tamamı geçerli olmayan bir tür üretirdi.
 *
 * `allowed` listesi yalnızca varsayılan için değil, DEPODAN OKURKEN de
 * kullanılıyor: depoda kalmış eski ya da başka modüle ait bir değer
 * ("takvim", elle düzenlenmiş bir anahtar) sessizce geçerli sayılırsa
 * arayüz hiçbir dalı eşleşmeyen bir durumda boş render ediyor.
 */
export function useStoredChoice<T extends string>(
  storageKey: string,
  allowed: readonly T[],
  fallback: T
) {
  const [mode, setMode] = useState<T>(fallback);

  // İlk render'da depodan oku — sunucu tarafı render'la uyumsuzluk olmasın.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`astrohub:view:${storageKey}`);
      if (stored !== null && (allowed as readonly string[]).includes(stored)) {
        setMode(stored as T);
      }
    } catch {
      // Depolama yoksa varsayılanda kal.
    }
    // `allowed` her render'da yeni bir dizi olabilir; kimliği değil içeriği
    // önemli ve içerik modül başına sabit — bu yüzden bağımlılık anahtarı.
  }, [storageKey, allowed]);

  const update = useCallback(
    (next: T) => {
      setMode(next);
      try {
        localStorage.setItem(`astrohub:view:${storageKey}`, next);
      } catch {
        // Seçim yalnızca bu oturumda geçerli olur.
      }
    },
    [storageKey]
  );

  return [mode, update] as const;
}

export function useViewMode(storageKey: string, fallback: ViewMode = 'grid') {
  return useStoredChoice(storageKey, viewModes, fallback);
}


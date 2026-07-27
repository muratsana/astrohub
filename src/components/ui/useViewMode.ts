import { useCallback, useEffect, useState } from 'react';

/**
 * Görünüm tercihi (ızgara / liste) — modül bazında saklanır.
 *
 * Bileşen dosyasından ayrı tutulur: `ViewToggle.tsx` yalnızca bileşen dışa
 * aktarır ve hızlı yenileme (fast refresh) sorunsuz çalışır.
 */

export type ViewMode = 'grid' | 'list';

export function useViewMode(storageKey: string, fallback: ViewMode = 'grid') {
  const [mode, setMode] = useState<ViewMode>(fallback);

  // İlk render'da depodan oku — sunucu tarafı render'la uyumsuzluk olmasın.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`astrohub:view:${storageKey}`);
      if (stored === 'grid' || stored === 'list') setMode(stored);
    } catch {
      // Depolama yoksa varsayılanda kal.
    }
  }, [storageKey]);

  const update = useCallback(
    (next: ViewMode) => {
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


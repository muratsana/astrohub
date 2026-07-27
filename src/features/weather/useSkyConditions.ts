import { useEffect, useState } from 'react';
import { useLocationContext } from '@/features/location/LocationContext';
import { fetchSkyConditions, type SkyConditions } from './openMeteo';

export type SkyStatus = 'idle' | 'loading' | 'ready' | 'error';

interface SkyState {
  status: SkyStatus;
  data: SkyConditions | null;
}

/**
 * Hava koşullarını seçili konum için getirir.
 *
 * Sonuç modül düzeyinde önbelleğe alınır: durum çubuğu ve "Bu Gece" paneli
 * aynı anda ekranda olabilir ve ikisi de bu kancayı çağırır — aynı istek iki
 * kez gitmesin. Önbellek 15 dakika yaşar; hava bundan hızlı değişmiyor ve
 * ücretsiz servise gereksiz yük bindirmenin anlamı yok.
 */
const CACHE_MS = 15 * 60 * 1000;

interface CacheEntry {
  at: number;
  data: SkyConditions | null;
  promise?: Promise<SkyConditions | null>;
}

const cache = new Map<string, CacheEntry>();

function keyFor(lat: number, lon: number) {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export function useSkyConditions(): SkyState {
  const { location } = useLocationContext();
  const key = keyFor(location.latitude, location.longitude);

  const [state, setState] = useState<SkyState>(() => {
    const hit = cache.get(key);
    return hit && Date.now() - hit.at < CACHE_MS
      ? { status: 'ready', data: hit.data }
      : { status: 'idle', data: null };
  });

  useEffect(() => {
    let active = true;

    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      setState({ status: 'ready', data: hit.data });
      return;
    }

    setState({ status: 'loading', data: null });

    // Aynı konum için uçuşta bir istek varsa ona bağlan — iki bileşen aynı
    // anda mount olduğunda tek istek gider.
    const inflight =
      hit?.promise ??
      fetchSkyConditions(location.latitude, location.longitude).catch(
        () => null
      );

    cache.set(key, { at: hit?.at ?? 0, data: hit?.data ?? null, promise: inflight });

    void inflight.then((data) => {
      cache.set(key, { at: Date.now(), data });
      if (active) setState({ status: data ? 'ready' : 'error', data });
    });

    return () => {
      active = false;
    };
  }, [key, location.latitude, location.longitude]);

  return state;
}

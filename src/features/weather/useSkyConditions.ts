import { useCallback, useEffect, useState } from 'react';
import { useLocationContext } from '@/features/location/LocationContext';
import { fetchOpenMeteo, type SkyConditions } from './openMeteo';
import { fetchMeteoblue } from './meteoblue';
import { hasNetworkAccess } from '@/lib/runtime';

/**
 * `offline`: dış istek yapılamayan bir derlemede çalışıyoruz (tek dosya
 * önizleme). `error`den ayrı tutuluyor çünkü kullanıcıya söylenecek şey
 * farklı — beklemek ya da tekrar denemek bu durumda işe yaramaz.
 */
export type SkyStatus = 'idle' | 'loading' | 'ready' | 'error' | 'offline';

export interface SkyState {
  status: SkyStatus;
  data: SkyConditions | null;
  /**
   * Yeniden dener — ÖNBELLEĞİ ATLAYARAK.
   *
   * Önbelleği atlamazsa düğme hiçbir şey yapmaz: başarısız istek
   * önbelleğe `null` yazdıysa 15 dakika boyunca aynı `null` geri gelirdi.
   * Kullanıcı düğmeye basar, ekran değişmez ve arıza yerine arayüz
   * bozuk görünür.
   */
  retry: () => void;
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

/**
 * İKİ SERVİS, TEK SONUÇ.
 *
 * Open-Meteo her koşulda çağrılıyor çünkü seeing tahmininin ihtiyaç
 * duyduğu 200/500 hPa rüzgârını yalnızca o veriyor (meteoblue'nun temel
 * paketlerinde basınç seviyesi değişkenleri yok).
 *
 * meteoblue varsa **yer koşulları ve bulut** ondan alınıyor: bulut
 * tahmini astronomi topluluğunda referans ve katman ayrımı veriyor.
 * Vekil yapılandırılmamışsa ya da istek düşerse Open-Meteo'nun kendi
 * sonucu kullanılıyor.
 *
 * Sıralama değil paralel: iki isteği arka arkaya yapmak paneli iki tur
 * bekletirdi ve Open-Meteo sonucu zaten her iki yolda da gerekiyor.
 */
export async function fetchConditions(
  latitude: number,
  longitude: number
): Promise<SkyConditions | null> {
  const open = await fetchOpenMeteo(latitude, longitude).catch(() => ({
    conditions: null,
    upperAir: null,
  }));

  const meteoblue = await fetchMeteoblue(
    latitude,
    longitude,
    open.upperAir
  ).catch(() => null);

  return meteoblue ?? open.conditions;
}

export function useSkyConditions(): SkyState {
  const { location } = useLocationContext();
  const key = keyFor(location.latitude, location.longitude);

  const [state, setState] = useState<Omit<SkyState, 'retry'>>(() => {
    const hit = cache.get(key);
    return hit && Date.now() - hit.at < CACHE_MS
      ? { status: 'ready', data: hit.data }
      : { status: 'idle', data: null };
  });

  /*
   * Sayaç, effect'i yeniden çalıştırmanın tek dürüst yolu: aynı konum
   * için bağımlılık dizisi değişmez ve effect kendiliğinden tekrarlamaz.
   */
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    cache.delete(key);
    setAttempt((value) => value + 1);
  }, [key]);

  useEffect(() => {
    if (!hasNetworkAccess) {
      setState({ status: 'offline', data: null });
      return;
    }

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
      fetchConditions(location.latitude, location.longitude).catch(() => null);

    cache.set(key, { at: hit?.at ?? 0, data: hit?.data ?? null, promise: inflight });

    void inflight.then((data) => {
      cache.set(key, { at: Date.now(), data });
      if (active) setState({ status: data ? 'ready' : 'error', data });
    });

    return () => {
      active = false;
    };
  }, [key, attempt, location.latitude, location.longitude]);

  return { ...state, retry };
}

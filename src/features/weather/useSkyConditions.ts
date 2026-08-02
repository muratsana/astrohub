import { useCallback, useEffect, useState } from 'react';
import { useLocationContext } from '@/features/location/LocationContext';
import { fetchOpenMeteo, type SkyConditions } from './openMeteo';
import { fetchMeteoblue } from './meteoblue';
import { fetchTransparency } from './airQuality';
import { hasNetworkAccess } from '@/lib/runtime';
import { useWeatherProvider } from '@/features/site/SiteConfigContext';
import type { WeatherProvider } from '@/features/site/siteConfig';

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

/*
 * Önbellek anahtarı SEÇİLEN GECEYİ de taşıyor. Yalnızca konumla
 * anahtarlansaydı, kullanıcı bir sonraki geceye geçtiğinde önbellekteki
 * bugünün koşulları "taze" sayılıp olduğu gibi gösterilirdi — tarih
 * değişir, sayılar değişmezdi.
 */
/*
 * SAĞLAYICI DA ANAHTARDA. Yönetici tercihi değiştirdiğinde önbellekteki
 * eski sonuç "taze" sayılıp olduğu gibi gösterilirdi — ayar değişir,
 * sayılar değişmezdi ve değişmediği için ayarın çalışmadığı sanılırdı.
 */
function keyFor(lat: number, lon: number, provider: WeatherProvider, at?: Date) {
  const gun = at ? at.toISOString().slice(0, 13) : 'simdi';
  return `${lat.toFixed(2)},${lon.toFixed(2)},${gun},${provider}`;
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
  longitude: number,
  at?: Date,
  provider: WeatherProvider = 'auto'
): Promise<SkyConditions | null> {
  const open = await fetchOpenMeteo(latitude, longitude, undefined, at).catch(
    () => ({ conditions: null, upperAir: null })
  );

  /*
   * ŞEFFAFLIK ÜÇÜNCÜ İSTEK AMA SIRAYA GİRMİYOR. Ayrı bir uçtan (hava
   * kalitesi) geliyor ve diğer 17 alanla ilgisi yok; arka arkaya
   * çağırmak paneli bir tur daha bekletirdi. Hatası da ayrı: düşerse
   * yalnızca o alan "veri yok" olur, koşulların tamamı değil.
   */
  /*
   * `open-meteo` seçiliyse meteoblue İSTEĞİ HİÇ ATILMIYOR — `catch` ile
   * yutulmuyor, kurulmuyor. Ayarın sebebi maliyet ve arıza kaçışı;
   * isteği atıp sonucu atmak ikisini de çözmezdi.
   */
  const [meteoblue, transparency] = await Promise.all([
    provider === 'open-meteo'
      ? Promise.resolve(null)
      : fetchMeteoblue(latitude, longitude, open.upperAir).catch(() => null),
    fetchTransparency(latitude, longitude, at).catch(() => null),
  ]);

  const base = meteoblue ?? open.conditions;
  return base ? { ...base, transparency } : null;
}

/**
 * `at`: koşulların okunacağı an. Verilmezse "şimdi".
 *
 * İleri tarihli bir gece seçildiğinde panel bu kancayı o gecenin
 * ortasıyla çağırıyor; tahmin ufkunun ötesindeki bir an için servis
 * veri döndürmüyor ve durum `error` yerine `ready`+`null` olmuyor —
 * ayrımı `parseSkyConditions` yapıyor ve `null` dönüyor.
 */
export function useSkyConditions(at?: Date): SkyState {
  const { location } = useLocationContext();
  const provider = useWeatherProvider();
  const key = keyFor(location.latitude, location.longitude, provider, at);

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
      fetchConditions(location.latitude, location.longitude, at, provider).catch(
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
    /* eslint-disable-next-line react-hooks/exhaustive-deps --
       `at` bir Date nesnesi ve her render'da yenisi üretiliyor; bağımlılık
       olarak eklenmesi effect'i sonsuz döngüye sokardı. Anahtar zaten
       `at`in saat hassasiyetli karşılığını taşıyor, yani gerçekten
       değiştiğinde `key` değişiyor. */
  }, [key, attempt, location.latitude, location.longitude, provider]);

  return { ...state, retry };
}

import { dewPointFromHumidity } from '@/domain/weather/humidity';
import { estimateSeeing, type SeeingEstimate } from './seeing';
import type { CloudLayers, SkyConditions } from './openMeteo';

/**
 * HAVA SERVİSİ ADAPTÖRÜ — meteoblue (vekil üzerinden).
 *
 * NEDEN İKİNCİ BİR SERVİS: meteoblue'nun bulut tahmini astronomi
 * topluluğunda referans kabul ediliyor ve `clouds-1h` paketi bulutu
 * **katmanlara ayırıyor** — alçak, orta, yüksek. Tek bir "%40 bulut"
 * sayısı alçak sisle yüksek sirrusu aynı gösterir; birincisi geceyi
 * bitirir, ikincisi yalnızca geniş alan çekimini zorlaştırır.
 *
 * NEDEN DOĞRUDAN ÇAĞIRMIYORUZ: meteoblue anahtarı kredili ve `VITE_`
 * önekli her değişken derlenmiş pakete düz metin girer. Anahtar
 * `supabase/functions/meteoblue` içinde, sunucu tarafında duruyor.
 *
 * SEEING HÂLÂ OPEN-METEO'DAN. Seeing tahmini 200/500 hPa rüzgârını
 * ister; bu basınç seviyesi değişkenleri meteoblue'nun temel
 * paketlerinde yok, Open-Meteo'da ücretsiz. İki servisi birleştirmek
 * "daha çok veri" için değil, her birinin gerçekten verdiği şeyi
 * kullanmak için: bulut meteoblue'dan, üst atmosfer rüzgârı
 * Open-Meteo'dan.
 *
 * ALAN ADLARI EKSİKSE SESSİZCE null. meteoblue paket alanları sürümle
 * değişebiliyor; eksik alanı sıfır saymak "bulutsuz gece" demek olurdu.
 * Zorunlu alan gelmezse bütün yanıt reddediliyor ve çağıran Open-Meteo'ya
 * düşüyor.
 */

/** Vekil fonksiyonun adresi — Supabase yapılandırılmamışsa `null`. */
export function meteoblueProxyUrl(
  latitude: number,
  longitude: number
): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!base) return null;
  return (
    `${base.replace(/\/+$/, '')}/functions/v1/meteoblue` +
    `?lat=${latitude.toFixed(2)}&lon=${longitude.toFixed(2)}`
  );
}

interface Series {
  time?: string[];
  [key: string]: unknown;
}

export interface MeteoblueRaw {
  basic?: { data_1h?: Series };
  clouds?: { data_1h?: Series };
}

/** Diziden sayı okur; alan yoksa ya da değer sayı değilse `null`. */
function num(series: Series | undefined, field: string, i: number): number | null {
  const values = series?.[field];
  if (!Array.isArray(values)) return null;
  const v = values[i];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Zaman dizisinde şu ana en yakın indeks.
 *
 * Vekil `tz=UTC` istiyor, dolayısıyla damgalar UTC. `new Date(...)`
 * bunu doğru çözüyor ve karşılaştırma mutlak zamanda yapılıyor.
 */
export function nearestIndex(times: string[], now: Date): number {
  if (times.length === 0) return -1;
  let best = 0;
  let bestDelta = Infinity;
  for (let i = 0; i < times.length; i++) {
    const delta = Math.abs(new Date(`${times[i]}Z`).getTime() - now.getTime());
    if (delta < bestDelta) {
      bestDelta = delta;
      best = i;
    }
  }
  return best;
}

export interface UpperAir {
  wind200hPa: number;
  wind500hPa: number;
}

/**
 * Ham yanıtı uygulama modeline çevirir.
 *
 * `upperAir` Open-Meteo'dan gelir. Yoksa seeing HESAPLANMAZ — `null`
 * kalır ve arayüz "veri yok" gösterir. Eski davranış eksik rüzgârı sıfır
 * sayıyordu; sıfır rüzgâr "sakin jet" demek olduğundan panel veri yokken
 * yapay bir "mükemmel seeing" basıyordu (QA ASTRO-03). Bulut/sıcaklık
 * verisi yine de değerli: okumanın tamamını atmak yerine yalnızca
 * üretemediğimiz alan boş bırakılıyor.
 */
export function parseMeteoblue(
  raw: MeteoblueRaw,
  now: Date,
  upperAir: UpperAir | null
): SkyConditions | null {
  const basic = raw.basic?.data_1h;
  const times = basic?.time;
  if (!Array.isArray(times) || times.length === 0) return null;

  const i = nearestIndex(times, now);
  if (i < 0) return null;

  const temperature = num(basic, 'temperature', i);
  const humidity = num(basic, 'relativehumidity', i);
  if (temperature === null || humidity === null) return null;

  const cloudsSeries = raw.clouds?.data_1h;
  /* Bulut katmanları `clouds-1h`ten; toplam örtü orada yoksa `basic`
     paketindeki alan deneniyor. İkisi de yoksa yanıt reddediliyor —
     bulut sayısı bu panelin varlık sebebi. */
  const total =
    num(cloudsSeries, 'totalcloudcover', i) ?? num(basic, 'totalcloudcover', i);
  if (total === null) return null;

  const layers: CloudLayers | null = (() => {
    const low = num(cloudsSeries, 'lowclouds', i);
    const mid = num(cloudsSeries, 'midclouds', i);
    const high = num(cloudsSeries, 'highclouds', i);
    if (low === null || mid === null || high === null) return null;
    const visibility = num(cloudsSeries, 'visibility', i);
    return {
      low,
      mid,
      high,
      /* meteoblue görüşü metre veriyor; panelde km okunuyor. */
      visibilityKm: visibility === null ? null : Math.round(visibility / 100) / 10,
    };
  })();

  /* Yer rüzgârı zorunlu: hem panelde okunuyor hem seeing'in yerel
     bileşeni. Eksikse sıfır ("sakin") saymak yerine okuma reddediliyor —
     Open-Meteo yedeği zaten devrede. */
  const windSpeed = num(basic, 'windspeed', i);
  if (windSpeed === null) return null;

  const seeing: SeeingEstimate | null = upperAir
    ? estimateSeeing({
        wind200hPa: upperAir.wind200hPa,
        wind500hPa: upperAir.wind500hPa,
        windSurface: windSpeed,
      })
    : null;

  return {
    cloudCover: total,
    humidity,
    temperature,
    /*
     * Üç alan meteoblue'nun bu uç noktasında YOK ve `null` bırakılıyor.
     *
     * Hissedilen sıcaklığı yer sıcaklığına, hamleyi ortalama rüzgâra
     * eşitlemek kolay olurdu ama ikisi de yanlış bilgi üretir: hamle,
     * ortalamanın üç katına çıkabilir ve poz sırasında montürü sarsan
     * şey odur. `null`, arayüzde "veri yok" olarak okunuyor.
     *
     * Open-Meteo yedeği bu üçünü veriyor; kullanıcı hangi servisten
     * baktığını `source` alanından zaten görüyor.
     */
    apparentTemperature: null,
    windGust: null,
    precipitationProbability: null,
    /* meteoblue çiy noktasını doğrudan vermiyor; sıcaklık ve bağıl
       nemden hesaplanıyor (Magnus). Hesaplanamıyorsa sıcaklığın kendisi
       yazılıyor — o durumda "açıklık sıfır", yani en kötü durum
       varsayılıyor ve ısıtıcı bandı önerisi güvenli tarafta kalıyor. */
    dewPoint: dewPointFromHumidity(temperature, humidity) ?? temperature,
    windSpeed,
    seeing,
    observedAt: new Date(`${times[i]}Z`),
    source: 'meteoblue',
    layers,
  };
}

/**
 * Vekilden koşulları getirir.
 *
 * Anahtar tanımlı değilse vekil 503 döner ve burada `null` olur; çağıran
 * Open-Meteo'ya düşer. Yapılandırılmamış bir gizli değişken kullanıcıya
 * bozuk sayfa olarak yansımamalı.
 */
export async function fetchMeteoblue(
  latitude: number,
  longitude: number,
  upperAir: UpperAir | null,
  signal?: AbortSignal
): Promise<SkyConditions | null> {
  const url = meteoblueProxyUrl(latitude, longitude);
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;

  /*
   * Anon anahtarı gönderiliyor çünkü fonksiyon JWT doğrulamasıyla
   * yayımlandı. Bu anahtar zaten istemcide açık — gizlilik sağlamıyor,
   * ama uç noktayı "internetteki herkes" yerine "siteyi açan herkes"
   * seviyesine indiriyor ve Supabase'in hız sınırlarını devreye sokuyor.
   * Asıl korunan şey meteoblue anahtarı; o hiç tarayıcıya inmiyor.
   */
  const response = await fetch(url, {
    signal,
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
  });
  if (!response.ok) return null;

  const raw = (await response.json()) as MeteoblueRaw;
  return parseMeteoblue(raw, new Date(), upperAir);
}

import { dewPointFromHumidity } from '@/domain/weather/humidity';
import { estimateSeeing, type SeeingEstimate } from './seeing';
import type { TransparencyEstimate } from './airQuality';

/**
 * HAVA SERVİSİ ADAPTÖRÜ — Open-Meteo.
 *
 * Neden Open-Meteo: API anahtarı istemez, ticari olmayan kullanımda
 * ücretsizdir ve — bizim için belirleyici olan — **basınç seviyesi**
 * değişkenlerini (200/500 hPa rüzgâr) açık verir. Seeing tahmini bu
 * değişkenler olmadan yapılamaz; anahtar isteyen çoğu servis onları
 * ücretli katmanda tutuyor.
 *
 * Anahtar olmadığı için istek doğrudan tarayıcıdan gider. Koordinat
 * Open-Meteo'ya ulaşır — bu, cihaz konumu kullanan biri için gerçek bir
 * gizlilik sonucudur ve arayüzde açıkça söylenir (§15.7). Şehir seçiliyken
 * giden koordinat zaten şehir merkezidir, kişisel değildir.
 */

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

/**
 * Bulut örtüsünün katman ayrımı.
 *
 * Astronomide toplam örtü tek başına yetmiyor: %40 alçak bulut geceyi
 * bitirir, %40 yüksek sirrus geniş alan çekimini yalnızca zorlaştırır.
 * İki servis de bu ayrımı veriyor, dolayısıyla model ortak.
 */
export interface CloudLayers {
  /** Alçak bulut yüzdesi — gözlemi doğrudan kapatan katman. */
  low: number;
  /** Orta katman yüzdesi. */
  mid: number;
  /** Yüksek (sirrus) yüzdesi — şeffaflığı düşürür, tümden kapatmaz. */
  high: number;
  /** Yatay görüş (km). Ölçüm gelmezse `null`. */
  visibilityKm: number | null;
}

export interface SkyConditions {
  /** Bulut örtüsü yüzdesi (0–100). */
  cloudCover: number;
  /** Bağıl nem yüzdesi — çiylenme riski için. */
  humidity: number;
  /** Yer sıcaklığı (°C). */
  temperature: number;
  /**
   * Hissedilen sıcaklık (°C) — rüzgâr ve nem düzeltmesiyle.
   *
   * Gece boyunca sabit duran bir gözlemci için asıl belirleyici bu:
   * −2 °C'de 25 km/sa rüzgâr, −9 °C gibi hissettirir ve dört saatlik bir
   * seansı bitirir. Servis vermezse `null` — yer sıcaklığını hissedilen
   * diye göstermek yanlış bilgi olur.
   */
  apparentTemperature: number | null;
  /** Çiy noktası (°C). Sıcaklığa yaklaştıkça optik çiylenir. */
  dewPoint: number;
  /** Yer rüzgârı (km/sa). */
  windSpeed: number;
  /**
   * Rüzgâr hamlesi (km/sa) — servis vermezse `null`.
   *
   * Ortalama rüzgârdan AYRI bir karar girdisi: 12 km/sa ortalama sorunsuz
   * görünür ama 40 km/sa hamle, poz sırasında montürü sarsıp kareyi
   * çöpe atar. Ortalamayı hamle yerine göstermek gözlemciyi yanıltır.
   */
  windGust: number | null;
  /** Yağış ihtimali (%) — servis vermezse `null`. */
  precipitationProbability: number | null;
  /**
   * Seeing tahmini — üst atmosfer (200/500 hPa) rüzgârı gelmediyse `null`.
   *
   * Eksik rüzgârı sıfır saymak "sakin jet, mükemmel seeing" üretirdi;
   * oysa bilinen tek şey ölçümün gelmediği. `null`, arayüzde "veri yok"
   * olarak okunur — uydurulmuş bir iyimserlikten her zaman daha doğru.
   */
  seeing: SeeingEstimate | null;
  /** Ölçümün ait olduğu saat. */
  observedAt: Date;
  /**
   * Sayının hangi servisten geldiği.
   *
   * Arayüzde görünüyor: iki servis aynı saat için farklı bulut yüzdesi
   * verebilir ve kullanıcı hangisine baktığını bilmeden ikisini
   * karşılaştıramaz.
   */
  source: 'meteoblue' | 'open-meteo';
  /** Katman ayrımı — servis vermezse `null`. */
  layers: CloudLayers | null;
  /**
   * Şeffaflık — aerosol optik derinliğinden (§7.2'nin 17. alanı).
   *
   * BULUTTAN AYRI BİR SORU. Bulutsuz bir gece şeffaf olmak zorunda
   * değil: toz taşınımında gökyüzü açık görünür ama sönük hedefler
   * kaybolur. Ayrı bir servisten (hava kalitesi ucu) geliyor ve o
   * istek düşerse `null` — nemden türetip "şeffaflık" demek,
   * ölçülmemiş bir metriği ölçülmüş gibi sunmak olurdu.
   */
  transparency: TransparencyEstimate | null;
}

interface HourlyResponse {
  hourly?: {
    time?: string[];
    cloud_cover?: (number | null)[];
    cloud_cover_low?: (number | null)[];
    cloud_cover_mid?: (number | null)[];
    cloud_cover_high?: (number | null)[];
    visibility?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    temperature_2m?: (number | null)[];
    apparent_temperature?: (number | null)[];
    dew_point_2m?: (number | null)[];
    precipitation_probability?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    wind_gusts_10m?: (number | null)[];
    wind_speed_500hPa?: (number | null)[];
    wind_speed_200hPa?: (number | null)[];
  };
}

const HOURLY_FIELDS = [
  'cloud_cover',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'visibility',
  'relative_humidity_2m',
  'temperature_2m',
  'apparent_temperature',
  'dew_point_2m',
  'precipitation_probability',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_speed_500hPa',
  'wind_speed_200hPa',
].join(',');

/**
 * HAVA TAHMİNİNİN UFKU — Open-Meteo'nun ücretsiz uçta verdiği azami gün.
 *
 * Panel artık ileri tarihli bir gece seçilmesine izin veriyor. Efemeris
 * (karanlık penceresi, ay) İSTENEN HER TARİH için hesaplanabiliyor —
 * gök mekaniği bir tahmin değil. Hava öyle değil: 16 günün ötesi için
 * elimizde veri yok ve olmayacak.
 *
 * Bu sayı arayüzde de kullanılıyor: kullanıcı ufkun ötesine geçtiğinde
 * "hava verisi yok" diye açıkça söyleniyor. Sınırı sessizce en yakın
 * saate düşürmek — `nearestHourIndex`in kendi başına yapacağı şey —
 * on gün sonrasına bugünün bulut oranını yazmak olurdu.
 */
export const FORECAST_DAYS = 16;

export function skyConditionsUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(3),
    longitude: longitude.toFixed(3),
    hourly: HOURLY_FIELDS,
    forecast_days: String(FORECAST_DAYS),
    timezone: 'auto',
    wind_speed_unit: 'kmh',
  });
  return `${ENDPOINT}?${params.toString()}`;
}

/**
 * Yanıttaki saatlik diziden **şu ana en yakın** indeksi bulur.
 *
 * Open-Meteo `timezone=auto` ile yerel saat damgası döndürür (sonunda Z
 * yoktur). `new Date('2026-07-27T21:00')` tarayıcının yerel saatini varsayar;
 * kullanıcı başka bir zaman diliminde olsa bile karşılaştırma kendi içinde
 * tutarlı kaldığı için en yakın saat doğru seçilir.
 */
/**
 * En yakın örneğin kabul edilebileceği azami uzaklık.
 *
 * Saatlik veride 90 dakika, "komşu saat" demek. Bunun ötesindeki bir
 * eşleşme artık yaklaştırma değil UYDURMA: dizinin sonundan taşan bir
 * istek, sessizce son saatin değerlerini alır ve kullanıcı on gün
 * sonrasına bugünün havasını okur.
 */
const MAX_SAMPLE_DISTANCE_MS = 90 * 60_000;

export function nearestHourIndex(times: string[], now: Date): number {
  if (times.length === 0) return -1;

  let best = 0;
  let bestDelta = Infinity;
  for (let i = 0; i < times.length; i++) {
    const delta = Math.abs(new Date(times[i]).getTime() - now.getTime());
    if (delta < bestDelta) {
      bestDelta = delta;
      best = i;
    }
  }

  if (bestDelta > MAX_SAMPLE_DISTANCE_MS) return -1;
  return best;
}

/** Diziden sayı okur; alan yoksa ya da değer sayı değilse `null`. */
function num(values: (number | null)[] | undefined, i: number): number | null {
  const v = values?.[i];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Ham yanıtı uygulama modeline çevirir. Ağ katmanından bağımsız — test edilebilir.
 *
 * EKSİK ALAN ASLA SIFIR SAYILMAZ. Sıfır burada masum bir yedek değil,
 * anlamlı bir hava raporu: bulut 0 "açık gece", nem 0 "kuru hava", rüzgâr 0
 * "sakin atmosfer" demek. Eksik ölçümü bunlara çevirmek, veri yokken
 * "gözleme uygun" hükmü üretir ve kullanıcıyı boşuna sahaya çıkarır
 * (QA P0-06). Kural:
 *
 *   · bulut, sıcaklık, nem, yer rüzgârı — zorunlu; biri yoksa okuma
 *     bütünüyle reddedilir. Yarım panel, boş panelden daha yanıltıcı.
 *   · çiy noktası — servis vermezse sıcaklık+nemden türetilir (Magnus);
 *     o da olmuyorsa sıcaklığın kendisi (açıklık sıfır = en kötü durum,
 *     güvenli taraf).
 *   · seeing — üst atmosfer rüzgârı yoksa `null`; tahmin uydurulmaz.
 */
export function parseSkyConditions(
  raw: HourlyResponse,
  now: Date
): SkyConditions | null {
  const hourly = raw.hourly;
  const times = hourly?.time;
  if (!hourly || !times || times.length === 0) return null;

  const i = nearestHourIndex(times, now);
  if (i < 0) return null;

  const cloudCover = num(hourly.cloud_cover, i);
  const temperature = num(hourly.temperature_2m, i);
  const humidity = num(hourly.relative_humidity_2m, i);
  const windSpeed = num(hourly.wind_speed_10m, i);
  if (
    cloudCover === null ||
    temperature === null ||
    humidity === null ||
    windSpeed === null
  ) {
    return null;
  }

  /* Katman ayrımı ancak üçü de gelirse kuruluyor. Eksik bir katmanı
     sıfır saymak "o yükseklikte bulut yok" demek olurdu — oysa bilinen
     tek şey ölçümün gelmediği. */
  const low = num(hourly.cloud_cover_low, i);
  const mid = num(hourly.cloud_cover_mid, i);
  const high = num(hourly.cloud_cover_high, i);
  const visibilityM = num(hourly.visibility, i);

  const wind200hPa = num(hourly.wind_speed_200hPa, i);
  const wind500hPa = num(hourly.wind_speed_500hPa, i);

  return {
    cloudCover,
    humidity,
    temperature,
    apparentTemperature: num(hourly.apparent_temperature, i),
    precipitationProbability: num(hourly.precipitation_probability, i),
    windGust: num(hourly.wind_gusts_10m, i),
    dewPoint:
      num(hourly.dew_point_2m, i) ??
      dewPointFromHumidity(temperature, humidity) ??
      temperature,
    windSpeed,
    seeing:
      wind200hPa !== null && wind500hPa !== null
        ? estimateSeeing({ wind200hPa, wind500hPa, windSurface: windSpeed })
        : null,
    observedAt: new Date(times[i]),
    source: 'open-meteo',
    /* Şeffaflık AYRI SERVİSTEN (hava kalitesi ucu); bu ayrıştırıcı onu
       görmez. Birleştirme `useSkyConditions` içinde yapılıyor — tek
       istekten iki uca ait alan üretmek, kaynağı belirsizleştirirdi. */
    transparency: null,
    layers:
      low !== null && mid !== null && high !== null
        ? {
            low,
            mid,
            high,
            visibilityKm:
              visibilityM !== null ? Math.round(visibilityM / 100) / 10 : null,
          }
        : null,
  };
}

/**
 * Seeing hesabı için üst atmosfer rüzgârı — meteoblue yolunda da kullanılır.
 * İki seviyeden biri eksikse `null`: yarım girdiyle tahmin, tahmin değil
 * uydurma olur.
 */
export function parseUpperAir(
  raw: HourlyResponse,
  now: Date
): { wind200hPa: number; wind500hPa: number } | null {
  const times = raw.hourly?.time;
  if (!raw.hourly || !times || times.length === 0) return null;
  const i = nearestHourIndex(times, now);
  if (i < 0) return null;
  const wind200hPa = num(raw.hourly.wind_speed_200hPa, i);
  const wind500hPa = num(raw.hourly.wind_speed_500hPa, i);
  if (wind200hPa === null || wind500hPa === null) return null;
  return { wind200hPa, wind500hPa };
}

/**
 * Koşulları getirir. Hata durumunda `null` döner — hava verisi olmadan da
 * site tamamen çalışır, bu yüzden hata fırlatıp sayfayı düşürmenin anlamı yok.
 */
export async function fetchSkyConditions(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<SkyConditions | null> {
  return (await fetchOpenMeteo(latitude, longitude, signal)).conditions;
}

/**
 * Tek istek, iki çıktı: koşullar ve üst atmosfer rüzgârı.
 *
 * Üst atmosfer ayrı veriliyor çünkü meteoblue yolunda **yalnızca o**
 * gerekiyor — bulut ve sıcaklık oradan geliyor, seeing hâlâ buradan.
 * İkinci bir Open-Meteo isteği atmak aynı yanıtı iki kez indirmek olurdu.
 */
/**
 * `at` verilirse koşullar O ANA en yakın saatten okunuyor; verilmezse
 * şimdiden. Ufkun ötesindeki bir an için `conditions` `null` döner —
 * uydurulmuş bir değer değil.
 */
export async function fetchOpenMeteo(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
  at?: Date
): Promise<{
  conditions: SkyConditions | null;
  upperAir: { wind200hPa: number; wind500hPa: number } | null;
}> {
  const response = await fetch(skyConditionsUrl(latitude, longitude), {
    signal,
  });
  if (!response.ok) return { conditions: null, upperAir: null };

  const raw = (await response.json()) as HourlyResponse;
  /*
   * Üst atmosfer de İSTENEN ANA göre okunuyor. Seeing tahmini jet akımı
   * rüzgârından çıkıyor ve o rüzgâr on gün içinde bambaşka olur; yer
   * koşullarını geleceğe taşıyıp seeing'i bugünden almak, tek bir
   * panelde iki farklı geceyi karıştırmak olurdu.
   */
  const target = at ?? new Date();
  return {
    conditions: parseSkyConditions(raw, target),
    upperAir: parseUpperAir(raw, target),
  };
}

/**
 * Çiylenme riski. Optik yüzey hava sıcaklığının altına düştüğünde çiy tutar;
 * sıcaklık ile çiy noktası arasındaki fark daraldıkça risk artar.
 */
export function dewRisk(
  temperature: number,
  dewPoint: number
): { label: string; tone: 'success' | 'warning' | 'danger' } {
  const spread = temperature - dewPoint;
  if (spread <= 1.5) return { label: 'Çiy kesin', tone: 'danger' };
  if (spread <= 4) return { label: 'Çiy riski', tone: 'warning' };
  return { label: 'Kuru', tone: 'success' };
}

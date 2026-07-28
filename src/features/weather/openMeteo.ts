import { estimateSeeing, type SeeingEstimate } from './seeing';

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
  /** Çiy noktası (°C). Sıcaklığa yaklaştıkça optik çiylenir. */
  dewPoint: number;
  /** Yer rüzgârı (km/sa). */
  windSpeed: number;
  seeing: SeeingEstimate;
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
    dew_point_2m?: (number | null)[];
    wind_speed_10m?: (number | null)[];
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
  'dew_point_2m',
  'wind_speed_10m',
  'wind_speed_500hPa',
  'wind_speed_200hPa',
].join(',');

export function skyConditionsUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(3),
    longitude: longitude.toFixed(3),
    hourly: HOURLY_FIELDS,
    // Yalnızca yakın saatler lazım; 2 gün fazlasıyla yeter ve yanıt küçük kalır.
    forecast_days: '2',
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
  return best;
}

/** Diziden sayı okur; eksik/boş değerde yedeğe düşer. */
function at(values: (number | null)[] | undefined, i: number, fallback: number) {
  const v = values?.[i];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Ham yanıtı uygulama modeline çevirir. Ağ katmanından bağımsız — test edilebilir. */
export function parseSkyConditions(
  raw: HourlyResponse,
  now: Date
): SkyConditions | null {
  const hourly = raw.hourly;
  const times = hourly?.time;
  if (!hourly || !times || times.length === 0) return null;

  const i = nearestHourIndex(times, now);
  if (i < 0) return null;

  const temperature = at(hourly.temperature_2m, i, 0);

  /* Katman ayrımı ancak üçü de gelirse kuruluyor. Eksik bir katmanı
     sıfır saymak "o yükseklikte bulut yok" demek olurdu — oysa bilinen
     tek şey ölçümün gelmediği. */
  const low = hourly.cloud_cover_low?.[i];
  const mid = hourly.cloud_cover_mid?.[i];
  const high = hourly.cloud_cover_high?.[i];
  const complete =
    typeof low === 'number' && typeof mid === 'number' && typeof high === 'number';

  const visibilityM = hourly.visibility?.[i];

  return {
    cloudCover: at(hourly.cloud_cover, i, 0),
    humidity: at(hourly.relative_humidity_2m, i, 0),
    temperature,
    dewPoint: at(hourly.dew_point_2m, i, temperature),
    windSpeed: at(hourly.wind_speed_10m, i, 0),
    seeing: estimateSeeing({
      wind200hPa: at(hourly.wind_speed_200hPa, i, 0),
      wind500hPa: at(hourly.wind_speed_500hPa, i, 0),
      windSurface: at(hourly.wind_speed_10m, i, 0),
    }),
    observedAt: new Date(times[i]),
    source: 'open-meteo',
    layers: complete
      ? {
          low,
          mid,
          high,
          visibilityKm:
            typeof visibilityM === 'number'
              ? Math.round(visibilityM / 100) / 10
              : null,
        }
      : null,
  };
}

/** Seeing hesabı için üst atmosfer rüzgârı — meteoblue yolunda da kullanılır. */
export function parseUpperAir(
  raw: HourlyResponse,
  now: Date
): { wind200hPa: number; wind500hPa: number } | null {
  const times = raw.hourly?.time;
  if (!raw.hourly || !times || times.length === 0) return null;
  const i = nearestHourIndex(times, now);
  if (i < 0) return null;
  return {
    wind200hPa: at(raw.hourly.wind_speed_200hPa, i, 0),
    wind500hPa: at(raw.hourly.wind_speed_500hPa, i, 0),
  };
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
export async function fetchOpenMeteo(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<{
  conditions: SkyConditions | null;
  upperAir: { wind200hPa: number; wind500hPa: number } | null;
}> {
  const response = await fetch(skyConditionsUrl(latitude, longitude), {
    signal,
  });
  if (!response.ok) return { conditions: null, upperAir: null };

  const raw = (await response.json()) as HourlyResponse;
  const now = new Date();
  return {
    conditions: parseSkyConditions(raw, now),
    upperAir: parseUpperAir(raw, now),
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

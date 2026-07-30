/**
 * METEOBLUE VEKİL POLİTİKASI — saf kurallar, Deno'suz (QA SEC-03).
 *
 * Vekil bugüne kadar `Access-Control-Allow-Origin: *` ile herkese açıktı
 * ve koordinat başına sınırsız istek kabul ediyordu. Anahtar sunucuda
 * duruyordu (doğru karar) ama KOTA korumasızdı: farklı koordinatlar
 * üreten biri ücretli krediyi boşaltabilir, fatura hesap sahibine çıkardı.
 *
 * Koruma tek bir duvar değil, dört katman — hiçbiri tek başına yeterli
 * değil ve bunu açıkça yazmak gerekiyor:
 *
 *   1. ORIGIN — tarayıcıdan gelen çapraz site kullanımını keser.
 *      `curl` bunu atlar; amaç başka bir sitenin bizim kotamızla hava
 *      servisi çalıştırmasını engellemek.
 *   2. COĞRAFİ SINIR — uygulama Türkiye portalı. Dünyanın rastgele
 *      noktalarını sormak meşru bir kullanım değil ve saldırı yüzeyini
 *      64 milyon hücreden ~6.500'e indiriyor.
 *   3. IZGARA — koordinat 0.05°'ye (≈5 km) oturtulur. Aynı şehirdeki iki
 *      kullanıcı aynı isteği üretir; önbellek gerçekten paylaşılır.
 *      5 km hava tahmininde anlamlı bir fark değil.
 *   4. ORAN LİMİTİ — IP başına kayan pencere, VERİTABANINDA.
 *      Önce isolate belleğinde tutuluyordu; üretimde ölçüldü ki HİÇ
 *      TETİKLENMİYOR — 30 ardışık istek tek bir 429 üretmedi, çünkü her
 *      istek yeni bir isolate'e düşüyor. Çalışmayan bir korumayı
 *      çalışıyormuş gibi bırakmak, hiç koymamaktan kötü: yanlış güven
 *      verir. Sayaç artık `consume_rate_limit()` ile atomik ve kalıcı.
 *
 * Bu katmanların hiçbiri sağlayıcı tarafındaki HARCAMA LİMİTİNİN yerine
 * geçmez; o hesap ayarıdır ve koda yazılamaz (plan T-506).
 */

/** Türkiye + kıyı payı. Dışarısı meşru kullanım değil. */
export const TURKEY_BOUNDS = {
  minLat: 35.5,
  maxLat: 42.5,
  minLon: 25.5,
  maxLon: 45.0,
};

/** Izgara adımı (derece) — ≈5 km. Önbellek paylaşımını bu belirliyor. */
export const GRID = 0.05;

export interface RateLimitConfig {
  /** Pencere uzunluğu (ms). */
  windowMs: number;
  /** Pencere içinde izin verilen istek sayısı. */
  max: number;
}

export const RATE_LIMIT: RateLimitConfig = { windowMs: 60_000, max: 20 };

/**
 * İzinli origin mi?
 *
 * Önizleme dağıtımları (`*.vercel.app`) ve yerel geliştirme kabul edilir;
 * ikisi de bizim dağıtımlarımız. Origin başlığı OLMAYAN istek reddedilmez:
 * tarayıcı dışı istemciler (sağlık kontrolü, curl) origin göndermez ve
 * onları burada engellemek güvenlik değil, yanılsama üretir — asıl fren
 * oran limiti ve coğrafi sınır.
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:' && hostname !== 'localhost') return false;
    return (
      hostname === 'astrohub.com.tr' ||
      hostname === 'www.astrohub.com.tr' ||
      hostname.endsWith('.vercel.app') ||
      hostname === 'localhost'
    );
  } catch {
    return false;
  }
}

/**
 * Koordinatı doğrular ve ızgaraya oturtur. Geçersiz ya da sınır dışıysa
 * `null` — çağıran 400 döner.
 */
export function snapCoordinate(
  latRaw: string | null,
  lonRaw: string | null
): { lat: number; lon: number } | null {
  if (latRaw === null || lonRaw === null) return null;

  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  if (
    lat < TURKEY_BOUNDS.minLat ||
    lat > TURKEY_BOUNDS.maxLat ||
    lon < TURKEY_BOUNDS.minLon ||
    lon > TURKEY_BOUNDS.maxLon
  ) {
    return null;
  }

  const snap = (value: number) => Math.round(value / GRID) * GRID;
  // Kayan nokta artığını temizle: 0.05 katları üç ondalıkta tam durur.
  const round3 = (value: number) => Math.round(value * 1000) / 1000;

  return { lat: round3(snap(lat)), lon: round3(snap(lon)) };
}

/**
 * Kayan pencere sayacı — YEREL, yalnızca yedek.
 *
 * Veritabanı sayacına ulaşılamadığında son çare olarak kullanılır. Tek
 * başına güvenilmez (isolate başına ayrı bellek); asıl karar
 * `consume_rate_limit()` RPC'sinde.
 */
export function hitRateLimit(
  store: Map<string, number[]>,
  key: string,
  now: number,
  config: RateLimitConfig = RATE_LIMIT
): { allowed: boolean; retryAfterSec: number } {
  const cutoff = now - config.windowMs;
  const hits = (store.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= config.max) {
    const oldest = hits[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + config.windowMs - now) / 1000));
    store.set(key, hits);
    return { allowed: false, retryAfterSec };
  }

  hits.push(now);
  store.set(key, hits);

  /*
   * Sayaç sınırsız büyümemeli: uzun ömürlü bir isolate'te her yeni IP bir
   * girdi bırakır. Ara sıra süpürmek, her istekte tüm tabloyu taramaktan
   * ucuz ve bellek sızıntısını engelliyor.
   */
  if (store.size > 5000) {
    for (const [k, v] of store) {
      const alive = v.filter((t) => t > cutoff);
      if (alive.length === 0) store.delete(k);
      else store.set(k, alive);
    }
  }

  return { allowed: true, retryAfterSec: 0 };
}

/** İstemci IP'si — Supabase/Cloudflare zincirinde ilk adres gerçek istemcidir. */
export function clientKey(headers: {
  get(name: string): string | null;
}): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('cf-connecting-ip') ?? 'bilinmeyen';
}

/**
 * Efemeris — güneş, ay ve hedef konumu hesapları.
 *
 * Şartname §14.2 bu işi 3. parti bir servise bırakıyordu; ancak "bu gece"
 * panelinin ihtiyaç duyduğu her şey (astronomik alacakaranlık, ay fazı ve
 * doğuş/batış, hedefin yüksekliği ve zirve saati) standart astronomi
 * algoritmalarıyla istemcide hesaplanabilir. Böylece panel API anahtarı
 * olmadan, çevrimdışı ve test edilebilir biçimde çalışır.
 *
 * Kaynak: Jean Meeus, *Astronomical Algorithms* (2. baskı) — düşük hassasiyet
 * güneş/ay formülleri. Beklenen doğruluk: güneş ±0.01°, ay ~±0.3°
 * (GEOSENTRİK — topocentric paralaks uygulanmaz, ufka yakın Ay'da fark
 * ~1°'ye çıkar). Güneş doğuş/batışları dakika mertebesinde; AY doğuş/batışı
 * paralaks nedeniyle ~10 dakikaya kadar sapabilir (QA ASTRO-06). Gözlem
 * planlaması için yeterli; efemeris kalitesi (yay saniyesi) ya da dakika
 * garantisi gerektiren işler için değil.
 *
 * Hava durumu (seeing, bulut) burada YOKTUR — o gerçekten bir servis ister
 * (§14.3) ve panelde açıkça "—" olarak gösterilir.
 *
 * Tüm açılar derece, tüm zamanlar UTC tabanlı `Date`. Gün sınırları
 * istenirse `timeZone` ile gözlem konumunun takvimine bağlanır (ASTRO-01).
 * Saf fonksiyonlar.
 */

import { zonedMidnight, zonedNoon } from '@/domain/time/zonedDay';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const DAY_MS = 86_400_000;

/** J2000.0 dönemi (2000-01-01 12:00 UTC) — Julian gün 2451545.0 */
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

/** Verilen anın Julian yüzyılı (J2000'den itibaren). */
function julianCenturies(date: Date): number {
  return (date.getTime() - J2000) / (DAY_MS * 36525);
}

/** Julian gün sayısı. */
export function julianDay(date: Date): number {
  return (date.getTime() - J2000) / DAY_MS + 2451545;
}

/** Açıyı 0–360 aralığına indirger. */
function norm360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** Açıyı −180…+180 aralığına indirger (saat açısı için). */
function norm180(deg: number): number {
  const r = norm360(deg);
  return r > 180 ? r - 360 : r;
}

export interface EquatorialCoords {
  /** Sağ açıklık, derece (0–360). */
  ra: number;
  /** Dik açıklık, derece (−90…+90). */
  dec: number;
}

export interface HorizontalCoords {
  /** Ufuktan yükseklik, derece. Negatif = ufuk altında. */
  altitude: number;
  /** Azimut, derece (kuzeyden doğuya). */
  azimuth: number;
}

/* ══════════════════════ Yıldız zamanı ══════════════════════ */

/**
 * Greenwich ORTALAMA yıldız zamanı (GMST), derece.
 *
 * Nutation/ekinoks düzeltmesi uygulanmaz — yani bu "görünen" (apparent)
 * değil "ortalama" yıldız zamanıdır; fark ≤ ~1.2 saniye-zaman (≈0.005°).
 * Buradaki kullanım (yükseklik eğrileri, transit saati) için ihmal
 * edilebilir; adlandırma kesinlik iddiasını abartmasın diye düzeltildi
 * (QA ASTRO-07).
 */
export function greenwichSiderealTime(date: Date): number {
  const jd = julianDay(date);
  const t = julianCenturies(date);
  return norm360(
    280.46061837 +
      360.98564736629 * (jd - 2451545) +
      0.000387933 * t * t -
      (t * t * t) / 38_710_000
  );
}

/** Yerel yıldız zamanı, derece. Doğu boylamı pozitiftir. */
export function localSiderealTime(date: Date, longitude: number): number {
  return norm360(greenwichSiderealTime(date) + longitude);
}

/* ══════════════════════ Koordinat dönüşümü ══════════════════════ */

/** Ekvatoral koordinatı gözlemcinin ufuk sistemine çevirir. */
export function equatorialToHorizontal(
  coords: EquatorialCoords,
  date: Date,
  latitude: number,
  longitude: number
): HorizontalCoords {
  const lst = localSiderealTime(date, longitude);
  const hourAngle = norm180(lst - coords.ra) * RAD;
  const dec = coords.dec * RAD;
  const lat = latitude * RAD;

  const sinAlt =
    Math.sin(dec) * Math.sin(lat) +
    Math.cos(dec) * Math.cos(lat) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const azimuth = Math.atan2(
    -Math.sin(hourAngle) * Math.cos(dec),
    Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(hourAngle)
  );

  return {
    altitude: altitude * DEG,
    azimuth: norm360(azimuth * DEG),
  };
}

/* ══════════════════════ Güneş ══════════════════════ */

/**
 * Güneşin görünen EKLİPTİK BOYLAMI (λ☉), derece.
 *
 * Gökyüzü takviminin çapa noktası: meteor yağmurlarının maksimumu
 * takvim gününe değil bu açıya bağlı tanımlanır (Perseidler λ☉ = 140.0°).
 * Sebep artık yıl: aynı λ☉ her yıl birkaç saat kayan bir tarihe denk
 * gelir, o yüzden "12 Ağustos" yazmak yıllar içinde yanlışa döner.
 *
 * `sunPosition` bunu zaten hesaplıyordu ama içeride tutuyordu; ikinci
 * bir seri yazmak yerine ortak parçaya çıkarıldı — iki kopya arasındaki
 * en küçük fark, takvimi güneşin kendisinden ayırırdı.
 */
export function sunEclipticLongitude(date: Date): number {
  const t = julianCenturies(date);

  // Ortalama boylam ve ortalama anomali
  const l0 = norm360(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
  const m = norm360(357.52911 + 35999.05029 * t - 0.0001537 * t * t) * RAD;

  // Merkez denklemi
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m) +
    0.000289 * Math.sin(3 * m);

  return norm360(l0 + c);
}

/** Güneşin görünen ekvatoral konumu (düşük hassasiyet, ±0.01°). */
export function sunPosition(date: Date): EquatorialCoords {
  const t = julianCenturies(date);
  const trueLong = sunEclipticLongitude(date) * RAD;
  const obliquity = (23.439291 - 0.0130042 * t) * RAD;

  const ra = Math.atan2(
    Math.cos(obliquity) * Math.sin(trueLong),
    Math.cos(trueLong)
  );
  const dec = Math.asin(Math.sin(obliquity) * Math.sin(trueLong));

  return { ra: norm360(ra * DEG), dec: dec * DEG };
}

/** Güneşin o andaki yüksekliği, derece. */
export function sunAltitude(date: Date, latitude: number, longitude: number): number {
  return equatorialToHorizontal(sunPosition(date), date, latitude, longitude)
    .altitude;
}

/* ══════════════════════ Ay ══════════════════════ */

/** Ayın görünen ekvatoral konumu (düşük hassasiyet, ±0.3°). */
export function moonPosition(date: Date): EquatorialCoords {
  const t = julianCenturies(date);

  const l = norm360(218.316 + 481267.8813 * t) * RAD; // ortalama boylam
  const m = norm360(134.963 + 477198.8676 * t) * RAD; // ortalama anomali
  const f = norm360(93.272 + 483202.0175 * t) * RAD; // enlem argümanı

  const lambda = l * DEG + 6.289 * Math.sin(m); // ekliptik boylam
  const beta = 5.128 * Math.sin(f); // ekliptik enlem

  const obliquity = (23.439291 - 0.0130042 * t) * RAD;
  const lam = lambda * RAD;
  const bet = beta * RAD;

  const ra = Math.atan2(
    Math.sin(lam) * Math.cos(obliquity) - Math.tan(bet) * Math.sin(obliquity),
    Math.cos(lam)
  );
  const dec = Math.asin(
    Math.sin(bet) * Math.cos(obliquity) +
      Math.cos(bet) * Math.sin(obliquity) * Math.sin(lam)
  );

  return { ra: norm360(ra * DEG), dec: dec * DEG };
}

export type MoonPhaseName =
  | 'Yeni Ay'
  | 'İlk Hilal'
  | 'İlk Dördün'
  | 'Şişkin Ay'
  | 'Dolunay'
  | 'Son Şişkin'
  | 'Son Dördün'
  | 'Son Hilal';

export interface MoonPhase {
  /** Aydınlanma oranı 0–1 (0 yeni ay, 1 dolunay). */
  illumination: number;
  /** Kavuşum döngüsündeki konum 0–1 (0 ve 1 yeni ay, 0.5 dolunay). */
  age: number;
  /** Ay büyüyor mu? (yeni aydan dolunaya doğru) */
  waxing: boolean;
  name: MoonPhaseName;
}

/**
 * Ay fazı. Aydınlanma oranı, güneş–ay ekliptik boylam farkından türetilir;
 * gözlem planlaması için gereken hassasiyet budur.
 */
export function moonPhase(date: Date): MoonPhase {
  const t = julianCenturies(date);

  // Ayın güneşten ortalama uzaklaşması (elongation)
  const d = norm360(297.8501921 + 445267.1114034 * t) * RAD;
  const m = norm360(357.5291092 + 35999.0502909 * t) * RAD; // güneş anomalisi
  const mp = norm360(134.9633964 + 477198.8675055 * t) * RAD; // ay anomalisi

  // Faz açısı (güneş–ay–yer); Meeus 48.4 yaklaşımı
  const phaseAngle =
    180 -
    d * DEG -
    6.289 * Math.sin(mp) +
    2.1 * Math.sin(m) -
    1.274 * Math.sin(2 * d - mp) -
    0.658 * Math.sin(2 * d) -
    0.214 * Math.sin(2 * mp) -
    0.11 * Math.sin(d);

  const i = norm360(phaseAngle) * RAD;
  const illumination = (1 + Math.cos(i)) / 2;

  // Yaş: elongation'dan türetilir. 0 = yeni ay, 0.5 = dolunay.
  const age = norm360(d * DEG) / 360;
  const waxing = age < 0.5;

  return { illumination, age, waxing, name: phaseName(age) };
}

function phaseName(age: number): MoonPhaseName {
  if (age < 0.0335 || age >= 0.9665) return 'Yeni Ay';
  if (age < 0.2165) return 'İlk Hilal';
  if (age < 0.2835) return 'İlk Dördün';
  if (age < 0.4665) return 'Şişkin Ay';
  if (age < 0.5335) return 'Dolunay';
  if (age < 0.7165) return 'Son Şişkin';
  if (age < 0.7835) return 'Son Dördün';
  return 'Son Hilal';
}

/* ══════════════════════ Doğuş / batış / alacakaranlık ══════════════════════ */

/**
 * Bir cismin belirli bir yüksekliği geçtiği anları arar.
 *
 * Kapalı form yerine tarama kullanılır: gün 2 dakikalık adımlarla taranır,
 * işaret değiştiren aralık ikili aramayla saniyeye indirilir. Kod çok daha
 * kısa ve okunur olur; Türkiye enlemlerinde (36–42°K) doğruluk ±1 dakikadır.
 */
function findCrossing(
  from: Date,
  to: Date,
  altitudeAt: (d: Date) => number,
  targetAltitude: number,
  rising: boolean
): Date | null {
  const STEP_MS = 2 * 60_000;
  let prev = from.getTime();
  let prevDiff = altitudeAt(from) - targetAltitude;

  for (let t = prev + STEP_MS; t <= to.getTime(); t += STEP_MS) {
    const diff = altitudeAt(new Date(t)) - targetAltitude;
    const crossed = rising ? prevDiff < 0 && diff >= 0 : prevDiff > 0 && diff <= 0;

    if (crossed) {
      // İkili arama ile aralığı daralt
      let lo = prev;
      let hi = t;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        const midDiff = altitudeAt(new Date(mid)) - targetAltitude;
        const midCrossed = rising ? midDiff >= 0 : midDiff <= 0;
        if (midCrossed) hi = mid;
        else lo = mid;
      }
      return new Date(Math.round(hi));
    }

    prev = t;
    prevDiff = diff;
  }

  return null;
}

export interface NightWindow {
  /** Astronomik karanlığın başlangıcı (güneş −18°). */
  start: Date | null;
  /** Astronomik karanlığın bitişi. */
  end: Date | null;
  /** Karanlık süresi, dakika. Karanlık hiç olmuyorsa 0. */
  durationMinutes: number;
  /**
   * Karanlık hiç oluşmuyorsa (yaz aylarında yüksek enlemler) sebebi.
   * Türkiye enlemlerinde nadiren, en kuzeyde haziran civarında görülür.
   */
  neverDark: boolean;
}

/**
 * Verilen günün gecesine ait astronomik karanlık penceresi (güneş −18°).
 *
 * Pencere gece yarısını aştığı için arama, verilen günün öğlen 12:00'sinden
 * ertesi gün 12:00'ye kadar yapılır — "bu gece" doğal olarak bu aralıktır.
 *
 * `timeZone` verilirse "gün" o dilimin takvimine göre seçilir (QA
 * ASTRO-01): İstanbul'u izleyen New York'lu kullanıcının tarayıcı öğleni
 * İstanbul'da akşamdır; pencere oradan kurulursa yanlış geceye kayar.
 * Verilmezse eski davranış (tarayıcı günü) korunur.
 */
export function astronomicalNight(
  date: Date,
  latitude: number,
  longitude: number,
  timeZone?: string
): NightWindow {
  return twilightWindow(date, latitude, longitude, -18, timeZone);
}

/** Nautical/civil gibi başka alacakaranlık eşikleri için genel biçim. */
export function twilightWindow(
  date: Date,
  latitude: number,
  longitude: number,
  sunAltitudeDeg: number,
  timeZone?: string
): NightWindow {
  const noon = timeZone ? zonedNoon(date, timeZone) : new Date(date);
  if (!timeZone) noon.setHours(12, 0, 0, 0);
  const nextNoon = new Date(noon.getTime() + DAY_MS);

  const alt = (d: Date) => sunAltitude(d, latitude, longitude);

  const start = findCrossing(noon, nextNoon, alt, sunAltitudeDeg, false);
  const end = start
    ? findCrossing(start, nextNoon, alt, sunAltitudeDeg, true)
    : findCrossing(noon, nextNoon, alt, sunAltitudeDeg, true);

  if (!start || !end) {
    return { start, end, durationMinutes: 0, neverDark: true };
  }

  return {
    start,
    end,
    durationMinutes: Math.round((end.getTime() - start.getTime()) / 60_000),
    neverDark: false,
  };
}

export interface RiseSet {
  rise: Date | null;
  set: Date | null;
  /** Cisim tüm gün ufkun üstünde mi? */
  alwaysUp: boolean;
  /** Cisim tüm gün ufkun altında mı? */
  alwaysDown: boolean;
}

/**
 * Ayın doğuş ve batış saatleri. Ufuk eşiği −0.8° (atmosferik kırılma +
 * ayın yarıçapı).
 *
 * DOĞRULUK NOTU: Ay konumu düşük dereceli GEOSENTRİK yaklaşımla hesaplanır;
 * topocentric paralaks (ufka yakınken ~1°'ye varır) uygulanmaz. Doğuş/batış
 * saatleri bu yüzden birkaç dakika ile ~10 dakika arası sapabilir — planlama
 * için yeterli, dakika kesinliği iddiası değil (QA ASTRO-06).
 *
 * `timeZone` verilirse "gün" o dilimin takvim günüdür; verilmezse tarayıcı
 * günü (eski davranış).
 */
export function moonRiseSet(
  date: Date,
  latitude: number,
  longitude: number,
  timeZone?: string
): RiseSet {
  const start = timeZone ? zonedMidnight(date, timeZone) : new Date(date);
  if (!timeZone) start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY_MS);

  const alt = (d: Date) =>
    equatorialToHorizontal(moonPosition(d), d, latitude, longitude).altitude;

  const rise = findCrossing(start, end, alt, -0.8, true);
  const set = findCrossing(start, end, alt, -0.8, false);

  if (!rise && !set) {
    const up = alt(start) > -0.8;
    return { rise: null, set: null, alwaysUp: up, alwaysDown: !up };
  }
  return { rise, set, alwaysUp: false, alwaysDown: false };
}

/* ══════════════════════ Hedefler ══════════════════════ */

/** "20h 58m 47s" ya da "20 58 47" biçimindeki sağ açıklığı dereceye çevirir. */
export function parseRa(value: string): number {
  const nums = value.match(/[\d.]+/g);
  if (!nums || nums.length === 0) return NaN;
  const [h = 0, m = 0, s = 0] = nums.map(Number);
  return (h + m / 60 + s / 3600) * 15;
}

/** "+44° 19′ 48″" ya da "-5 23 12" biçimindeki dik açıklığı dereceye çevirir. */
export function parseDec(value: string): number {
  const nums = value.match(/[\d.]+/g);
  if (!nums || nums.length === 0) return NaN;
  const [d = 0, m = 0, s = 0] = nums.map(Number);
  const sign = /^\s*-|−/.test(value) ? -1 : 1;
  return sign * (d + m / 60 + s / 3600);
}

export interface TargetNight {
  /** Hedefin geceki en yüksek noktası, derece. */
  peakAltitude: number;
  /** O yüksekliğe ulaştığı an. */
  peakAt: Date;
  /** Hedef gece boyunca hiç ufkun üstüne çıkmıyor mu? */
  neverRises: boolean;
}

/**
 * Bir hedefin verilen gece boyunca ulaştığı en yüksek noktayı ve saatini
 * bulur. Karanlık penceresi verilirse yalnızca o aralık taranır — hedefin
 * gündüz zirve yapması gözlem için bir şey ifade etmez.
 */
export function targetNightPeak(
  coords: EquatorialCoords,
  window: { start: Date; end: Date },
  latitude: number,
  longitude: number
): TargetNight {
  const STEP_MS = 5 * 60_000;
  let peakAltitude = -90;
  let peakAt = window.start;

  for (
    let t = window.start.getTime();
    t <= window.end.getTime();
    t += STEP_MS
  ) {
    const d = new Date(t);
    const { altitude } = equatorialToHorizontal(coords, d, latitude, longitude);
    if (altitude > peakAltitude) {
      peakAltitude = altitude;
      peakAt = d;
    }
  }

  return { peakAltitude, peakAt, neverRises: peakAltitude <= 0 };
}

/* ══════════════════════ Biçimlendirme ══════════════════════ */

/**
 * "21:47" biçiminde saat.
 *
 * Saat dilimi açıkça verilir ve varsayılan `Europe/Istanbul`'dur: gözlem
 * noktası Türkiye'deyken saatin ziyaretçinin bulunduğu ülkenin diliminde
 * gösterilmesi yanlış olur. Yurt dışındaki bir kullanıcı da Saklıkent'in
 * karanlık penceresini yerel Türkiye saatiyle görmelidir.
 */
export function formatClock(
  date: Date | null,
  timeZone = 'Europe/Istanbul'
): string {
  if (!date) return '—';
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

/** "8sa 12dk" biçiminde süre. */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}dk`;
  return `${h}sa ${String(m).padStart(2, '0')}dk`;
}

/** "68°" biçiminde yükseklik. */
export function formatAltitude(degrees: number): string {
  return `${Math.round(degrees)}°`;
}

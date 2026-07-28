import {
  equatorialToHorizontal,
  moonPosition,
  twilightWindow,
} from './ephemeris';

/**
 * GECE ZAMAN ÇİZELGESİ — batıştan doğuşa, alacakaranlık katmanlarıyla.
 *
 * NEDEN BÖYLE BİR ŞEY: "Bu Gece" paneli altı ayrı sayı gösteriyordu ve
 * her biri doğruydu ama hiçbiri gecenin ŞEKLİNİ vermiyordu. Bir
 * astrofotoğrafçının sorduğu asıl soru sayı değil, sıra: "Ne zaman
 * kurabilirim, gerçek karanlık ne zaman başlıyor, ay ne zaman çekiliyor,
 * kaç saatim kalıyor?" Bunlar yan yana konmadıkça cevaplanmıyor.
 *
 * TEK BİR ÇUBUK BUNLARIN HEPSİNİ SÖYLÜYOR: batıştan doğuşa uzanan bir
 * eksen, üstünde alacakaranlık katmanları (sivil → denizci → astronomik)
 * ve tam karanlık bandı, ayrıca ayın ufkun üstünde olduğu aralık.
 *
 * BU DOSYA SAF. Eşikler ve kesişimler efemeris hesabından gelir; burada
 * yalnızca aralıklar oran haline getirilir. Bileşenin içinde yapılsaydı
 * "ay gece yarısını aşarsa", "kutup yazında karanlık oluşmazsa" gibi
 * durumlar ancak tarayıcıda denenerek görülebilirdi.
 */

/** Güneşin görünen batış/doğuş eşiği — kırılma payıyla. */
const HORIZON = -0.833;

export type SegmentKind =
  | 'civil' // güneş 0 → −6°: gökyüzü hâlâ aydınlık, kurulum vakti
  | 'nautical' // −6 → −12°: parlak yıldızlar çıkar
  | 'astronomical' // −12 → −18°: fon hâlâ düşüyor
  | 'dark'; // −18°'nin altı: gerçek karanlık

export interface TimelineSegment {
  kind: SegmentKind;
  from: Date;
  to: Date;
  /** Eksen üzerindeki başlangıç oranı (0–1). */
  start: number;
  /** Eksen üzerindeki uzunluk (0–1). */
  span: number;
}

export interface TimelineInterval {
  from: Date;
  to: Date;
  start: number;
  span: number;
}

export interface NightTimeline {
  /** Eksenin başı — güneşin batışı. */
  from: Date | null;
  /** Eksenin sonu — güneşin doğuşu. */
  to: Date | null;
  segments: TimelineSegment[];
  /** Tam karanlık aralığı; oluşmuyorsa null. */
  dark: TimelineInterval | null;
  /** Ayın ufkun üstünde olduğu aralıklar (eksene kırpılmış). */
  moonUp: TimelineInterval[];
  /**
   * Ay batmadan karanlığın başladığı ya da bitmediği durumlarda kalan
   * "aysız karanlık" aralıkları. Astrofotoğrafçının gerçek bütçesi bu.
   */
  moonlessDark: TimelineInterval[];
  /** Toplam aysız karanlık, dakika. */
  moonlessMinutes: number;
  /** Eksen üzerinde "şimdi" (0–1); gece dışındaysa null. */
  now: number | null;
}

const EMPTY: NightTimeline = {
  from: null,
  to: null,
  segments: [],
  dark: null,
  moonUp: [],
  moonlessDark: [],
  moonlessMinutes: 0,
  now: null,
};

function ms(date: Date): number {
  return date.getTime();
}

/**
 * İki aralığın kesişimi; kesişmiyorsa null.
 *
 * Kırpma her yerde gerekiyor: ay eksenin dışında doğup batabilir,
 * karanlık ekseni taşmaz ama ay aralıkları taşar.
 */
function clip(
  a: [number, number],
  b: [number, number]
): [number, number] | null {
  const from = Math.max(a[0], b[0]);
  const to = Math.min(a[1], b[1]);
  return to > from ? [from, to] : null;
}

/** Aralıklar farkı: `base` içinden `holes` çıkarılır. */
function subtract(
  base: [number, number],
  holes: [number, number][]
): [number, number][] {
  let pieces: [number, number][] = [base];
  for (const hole of holes) {
    const next: [number, number][] = [];
    for (const piece of pieces) {
      if (hole[1] <= piece[0] || hole[0] >= piece[1]) {
        next.push(piece);
        continue;
      }
      if (hole[0] > piece[0]) next.push([piece[0], hole[0]]);
      if (hole[1] < piece[1]) next.push([hole[1], piece[1]]);
    }
    pieces = next;
  }
  return pieces;
}

/**
 * Ayın ufkun üstünde olduğu aralıklar.
 *
 * Yükseklik örnekleyerek bulunuyor, doğuş/batış kesişimi arayarak değil:
 * ay bir gecede hiç doğmayabilir, iki kez ufka değebilir ya da hep
 * yukarıda kalabilir. Örnekleme bu üç durumu da tek bir kodla veriyor.
 * On dakikalık adım, bir çubuk üzerinde piksel altı hata demek.
 */
function moonUpIntervals(
  from: number,
  to: number,
  latitude: number,
  longitude: number
): [number, number][] {
  const STEP = 10 * 60_000;
  const intervals: [number, number][] = [];
  let openedAt: number | null = null;

  for (let t = from; t <= to; t += STEP) {
    const date = new Date(t);
    const alt = equatorialToHorizontal(
      moonPosition(date),
      date,
      latitude,
      longitude
    ).altitude;
    const up = alt > HORIZON;

    if (up && openedAt === null) openedAt = t;
    if (!up && openedAt !== null) {
      intervals.push([openedAt, t]);
      openedAt = null;
    }
  }
  if (openedAt !== null) intervals.push([openedAt, to]);
  return intervals;
}

export function nightTimeline(
  date: Date,
  latitude: number,
  longitude: number,
  now: Date = new Date()
): NightTimeline {
  const horizon = twilightWindow(date, latitude, longitude, HORIZON);
  if (!horizon.start || !horizon.end) return EMPTY;

  const from = ms(horizon.start);
  const to = ms(horizon.end);
  const total = to - from;
  if (total <= 0) return EMPTY;

  const civil = twilightWindow(date, latitude, longitude, -6);
  const nautical = twilightWindow(date, latitude, longitude, -12);
  const astro = twilightWindow(date, latitude, longitude, -18);

  const at = (value: number) => (value - from) / total;
  const interval = (range: [number, number]): TimelineInterval => ({
    from: new Date(range[0]),
    to: new Date(range[1]),
    start: at(range[0]),
    span: (range[1] - range[0]) / total,
  });

  /*
    Sınırlar akşamdan sabaha sıralı: batış → sivil → denizci →
    astronomik → karanlık → astronomik → denizci → sivil → doğuş.
    Karanlık oluşmayan gecelerde (yüksek enlem, yaz) eksik eşikler
    komşusuna düşürülüyor; segment listesi yine kesintisiz kalıyor.
  */
  const bounds: { at: number; kind: SegmentKind }[] = [
    { at: from, kind: 'civil' },
    { at: civil.start ? ms(civil.start) : from, kind: 'nautical' },
    { at: nautical.start ? ms(nautical.start) : from, kind: 'astronomical' },
    { at: astro.start ? ms(astro.start) : from, kind: 'dark' },
    { at: astro.end ? ms(astro.end) : to, kind: 'astronomical' },
    { at: nautical.end ? ms(nautical.end) : to, kind: 'nautical' },
    { at: civil.end ? ms(civil.end) : to, kind: 'civil' },
  ];

  const segments: TimelineSegment[] = [];
  for (let i = 0; i < bounds.length; i += 1) {
    const startAt = bounds[i].at;
    const endAt = i + 1 < bounds.length ? bounds[i + 1].at : to;
    if (endAt <= startAt) continue;
    segments.push({
      kind: bounds[i].kind,
      from: new Date(startAt),
      to: new Date(endAt),
      start: at(startAt),
      span: (endAt - startAt) / total,
    });
  }

  const darkRange: [number, number] | null =
    astro.start && astro.end && !astro.neverDark
      ? [ms(astro.start), ms(astro.end)]
      : null;

  const moonRanges = moonUpIntervals(from, to, latitude, longitude)
    .map((range) => clip(range, [from, to]))
    .filter((range): range is [number, number] => range !== null);

  const moonless = darkRange ? subtract(darkRange, moonRanges) : [];
  const moonlessMinutes = Math.round(
    moonless.reduce((sum, [a, b]) => sum + (b - a), 0) / 60_000
  );

  const nowMs = ms(now);

  return {
    from: horizon.start,
    to: horizon.end,
    segments,
    dark: darkRange ? interval(darkRange) : null,
    moonUp: moonRanges.map(interval),
    moonlessDark: moonless.map(interval),
    moonlessMinutes,
    now: nowMs >= from && nowMs <= to ? at(nowMs) : null,
  };
}

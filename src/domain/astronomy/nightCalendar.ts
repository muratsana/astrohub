/**
 * Gece takvimi — aylık karanlık pencere ve ay penceresi (§7.9, §14.2).
 *
 * `ephemeris.ts` tek bir gece için hesap yapar; bu modül onu aya yayar ve
 * planlama için asıl önemli olan büyüklüğü üretir: **aysız karanlık süre.**
 *
 * Neden aysız karanlık: astronomik karanlık 7 saat sürebilir ama dolunay
 * gökyüzündeyse deep-sky için o gecenin değeri neredeyse sıfırdır. Takvimde
 * "karanlık süresi" yerine "aysız karanlık" gösterilmesi, kullanıcının
 * gerçekten çekim yapabileceği geceyi işaret eder.
 *
 * Hesap tarama tabanlıdır (5 dakikalık adım). Kapalı form çözüm daha hızlı
 * olurdu ama ayın doğuş/batışı gece penceresini birden çok kez kesebiliyor
 * (ay gece ortasında doğup şafağa kadar kalabilir) ve tarama bu durumları
 * ekstra kod olmadan doğru sayıyor.
 */

import {
  astronomicalNight,
  moonPhase,
  moonRiseSet,
  equatorialToHorizontal,
  moonPosition,
} from './ephemeris';
import type { MoonPhase, NightWindow, RiseSet } from './ephemeris';
import { zonedMidnight, zonedTime } from '@/domain/time/zonedDay';

/** Tarama adımı. 5 dk, ±2.5 dakikalık bir hata payı demektir — takvim için fazlasıyla yeterli. */
const SCAN_STEP_MS = 5 * 60_000;

/** Ay bu yüksekliğin altındaysa gökyüzü pratikte "aysız" sayılır. */
const MOON_HORIZON_DEG = -0.8;

/**
 * Karanlık pencerenin ay ufkun altındayken geçen kısmı, dakika.
 *
 * Pencere yoksa (yaz gecesi karanlık oluşmuyorsa) 0 döner.
 */
export function moonlessDarkMinutes(
  night: NightWindow,
  latitude: number,
  longitude: number
): number {
  if (!night.start || !night.end || night.neverDark) return 0;

  let minutes = 0;
  for (
    let t = night.start.getTime();
    t < night.end.getTime();
    t += SCAN_STEP_MS
  ) {
    const at = new Date(t);
    const { altitude } = equatorialToHorizontal(
      moonPosition(at),
      at,
      latitude,
      longitude
    );
    if (altitude < MOON_HORIZON_DEG) {
      // Son adım pencerenin dışına taşabilir; taşan kısmı sayma.
      minutes += Math.min(SCAN_STEP_MS, night.end.getTime() - t) / 60_000;
    }
  }

  return Math.round(minutes);
}

export interface NightEntry {
  /** Gecenin başladığı takvim günü (yerel gün başlangıcı). */
  date: Date;
  night: NightWindow;
  moon: MoonPhase;
  moonTimes: RiseSet;
  /** Ay ufkun altındayken geçen karanlık süre, dakika. */
  moonlessMinutes: number;
  /** 0–100 arası gece kalite puanı. */
  score: number;
}

/**
 * Gece kalite puanı (0–100).
 *
 * İki bileşen: aysız karanlık süre (asıl belirleyici) ve ay aydınlanması
 * (ay geceyi kısmen paylaşıyorsa cezalandırır). Puan **mutlak bir ölçü
 * değil**, aynı ayın geceleri arasında sıralama içindir; ocakla haziranı
 * karşılaştırmak için tasarlanmadı — kuzey yarımkürede kış geceleri her
 * zaman kazanır.
 *
 * Referans: 6 saat (360 dk) aysız karanlık tam puandır. Bunun üstü de
 * 100'de kalır — 8 saatlik bir gece 6 saatlikten "daha iyi" değil, aynı
 * derecede iyidir; iki gecede de tüm hedef listesi çekilir.
 */
export function nightScore(moonlessMinutes: number, illumination: number): number {
  const durationScore = Math.min(moonlessMinutes / 360, 1) * 80;
  const moonScore = (1 - illumination) * 20;
  return Math.round(durationScore + moonScore);
}

/** Tek bir gecenin özeti. */
export function nightEntry(
  date: Date,
  latitude: number,
  longitude: number,
  timeZone?: string
): NightEntry {
  const dayStart = timeZone ? zonedMidnight(date, timeZone) : new Date(date);
  if (!timeZone) dayStart.setHours(0, 0, 0, 0);

  const night = astronomicalNight(dayStart, latitude, longitude, timeZone);
  const moon = moonPhase(dayStart);
  const moonTimes = moonRiseSet(dayStart, latitude, longitude, timeZone);
  const moonlessMinutes = moonlessDarkMinutes(night, latitude, longitude);

  return {
    date: dayStart,
    night,
    moon,
    moonTimes,
    moonlessMinutes,
    score: nightScore(moonlessMinutes, moon.illumination),
  };
}

/**
 * Bir ayın tüm geceleri.
 *
 * `month` 0 tabanlıdır (`Date` ile aynı) — takvim bileşeni zaten `Date`
 * üzerinden gezindiği için dönüştürme yapmak hata kaynağı olurdu.
 */
export function monthNights(
  year: number,
  month: number,
  latitude: number,
  longitude: number,
  timeZone?: string
): NightEntry[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const entries: NightEntry[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    /* Dilim verildiğinde günün temsilcisi o dilimin öğlenidir: gece
       yarısı temsilci alınırsa tarayıcı dilimiyle konum dilimi arasındaki
       fark günü bir ileri/geri kaydırabilir. */
    const dayDate = timeZone
      ? zonedTime(year, month + 1, day, 12, 0, timeZone)
      : new Date(year, month, day);
    entries.push(nightEntry(dayDate, latitude, longitude, timeZone));
  }

  return entries;
}

/**
 * Ayın en iyi geceleri — puana göre sıralı ilk `count` gece.
 *
 * Eşit puanda tarih sırası korunur: aynı kalitedeki iki geceden önce geleni
 * önermek, kullanıcının planını daha erken yapmasını sağlar.
 */
export function bestNights(entries: NightEntry[], count = 3): NightEntry[] {
  return [...entries]
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.score - a.entry.score || a.index - b.index)
    .slice(0, count)
    .map(({ entry }) => entry);
}

/**
 * Takvim ızgarası için haftalara böler.
 *
 * Hafta pazartesi başlar (TR takvim geleneği). Ayın ilk gününden önceki ve
 * son gününden sonraki boşluklar `null` ile doldurulur — bileşen boş hücre
 * çizer, komşu ayın günlerini göstermek takvimi kalabalıklaştırıyor.
 */
export function calendarWeeks(entries: NightEntry[]): (NightEntry | null)[][] {
  if (entries.length === 0) return [];

  // getDay(): 0 pazar … 6 cumartesi → pazartesi başlangıcına kaydır.
  const firstWeekday = (entries[0].date.getDay() + 6) % 7;
  const cells: (NightEntry | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...entries,
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (NightEntry | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** Ay fazının tek karakterlik sembolü — takvim hücresinde yer kaplamaz. */
export function moonGlyph(illumination: number, waxing: boolean): string {
  if (illumination < 0.05) return '●'; // yeni ay (karanlık disk)
  if (illumination > 0.95) return '○'; // dolunay
  if (illumination < 0.4) return waxing ? '☽' : '☾';
  return waxing ? '◑' : '◐';
}

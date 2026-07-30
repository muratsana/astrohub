/**
 * IANA ZAMAN DİLİMİNDE TAKVİM GÜNÜ ARİTMETİĞİ (QA ASTRO-01).
 *
 * Gece hesapları "bu takvim gününün gecesi" kavramına dayanır ve o gün,
 * TARAYICININ değil GÖZLEM KONUMUNUN gününe göre seçilmelidir. New
 * York'taki bir kullanıcı İstanbul'u seçtiğinde tarayıcı öğleni İstanbul
 * saatiyle 19:00'dur; arama penceresi oradan kurulursa bulunan karanlık
 * pencere bir önceki/sonraki geceye kayabilir.
 *
 * Kütüphane bilinçli olarak yok: ihtiyaç yalnızca "verilen dilimde bu anın
 * yılı/ayı/günü ne" ve "o dilimde şu duvar saatinin UTC karşılığı ne"
 * sorularıdır; ikisi de Intl.DateTimeFormat ile çözülür. Hesabın kendisi
 * her zaman UTC anları üzerinde yürür — dilim yalnızca gün sınırlarını ve
 * gösterimi belirler.
 */

/** Dilim başına bir biçimlendirici — kurulum pahalı, kullanım ucuz. */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let dtf = formatterCache.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      // 'h23': gece yarısı '24' değil '00' okunsun — Date.UTC ile uyum.
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(timeZone, dtf);
  }
  return dtf;
}

interface WallClock {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Verilen UTC anının, verilen dilimdeki duvar saati karşılığı. */
export function wallClockInZone(date: Date, timeZone: string): WallClock {
  const parts: Record<string, number> = {};
  for (const p of formatterFor(timeZone).formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

/** Dilimin o andaki UTC ofseti, dakika (İstanbul: +180). */
export function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const w = wallClockInZone(date, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  // Saniye altı kırpılır; ofsetler dakika hassasiyetindedir.
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/**
 * Verilen dilimdeki bir duvar saatinin UTC anı.
 *
 * DST sınırında ofset tahminle çözülür: önce anın ofseti varsayılır,
 * sonuç farklı bir ofsete düşerse bir kez düzeltilir. Yaz saatine
 * geçişte var olmayan saatler (örn. 02:30) geçiş sonrası ofsetle çözülür
 * — gün sınırı hesapları için yeterli ve deterministik.
 */
export function zonedTime(
  year: number,
  month: number, // 1–12
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const first = zoneOffsetMinutes(new Date(utcGuess), timeZone);
  const candidate = utcGuess - first * 60_000;
  const second = zoneOffsetMinutes(new Date(candidate), timeZone);
  return new Date(second === first ? candidate : utcGuess - second * 60_000);
}

/** Anın, verilen dilimde denk geldiği takvim gününün öğleni (UTC anı). */
export function zonedNoon(date: Date, timeZone: string): Date {
  const w = wallClockInZone(date, timeZone);
  return zonedTime(w.year, w.month, w.day, 12, 0, timeZone);
}

/** Anın, verilen dilimde denk geldiği takvim gününün gece yarısı (UTC anı). */
export function zonedMidnight(date: Date, timeZone: string): Date {
  const w = wallClockInZone(date, timeZone);
  return zonedTime(w.year, w.month, w.day, 0, 0, timeZone);
}

/**
 * Takvim günü anahtarı ("2026-07-30") — önbellek/karşılaştırma için.
 * `toDateString()`in dilim-duyarlı karşılığı: gün, tarayıcının değil
 * gözlem konumunun takvimine göre döner.
 */
export function zonedDayKey(date: Date, timeZone: string): string {
  const w = wallClockInZone(date, timeZone);
  const mm = String(w.month).padStart(2, '0');
  const dd = String(w.day).padStart(2, '0');
  return `${w.year}-${mm}-${dd}`;
}

/**
 * Gözlem / çekim planlayıcı (§7.10).
 *
 * Bir gecede birden çok hedef çekmek istiyorsanız asıl kısıt hedefin
 * yüksekliğidir: 30°'nin altında hava kütlesi iki katına çıkar, ışık
 * kirliliği ve seeing belirgin bozulur. Bu modül her hedefin gece içinde
 * **kullanılabilir penceresini** çıkarır ve pencereleri çakışmayacak biçimde
 * sıraya dizer.
 *
 * SIRALAMA STRATEJİSİ: "en erken biten önce" (earliest deadline first).
 * Batmak üzere olan hedef önce çekilir; zirvede uzun süre kalacak hedef
 * bekleyebilir. Zirve saatine göre sıralamak sezgisel görünür ama batan
 * hedefi kaçırtır — planlayıcının ilk kuralı, kaybedilecek olanı kurtarmaktır.
 *
 * Saf fonksiyonlar; `Date` dışında bağımlılığı yoktur.
 */

import { equatorialToHorizontal } from './ephemeris';
import type { EquatorialCoords } from './ephemeris';

/** Yükseklik eğrisi ve pencere aramasında kullanılan adım. */
const STEP_MS = 5 * 60_000;

export interface AltitudePoint {
  at: Date;
  altitude: number;
}

/** Hedefin verilen aralıktaki yükseklik eğrisi. */
export function altitudeCurve(
  coords: EquatorialCoords,
  window: { start: Date; end: Date },
  latitude: number,
  longitude: number,
  stepMinutes = 15
): AltitudePoint[] {
  const step = stepMinutes * 60_000;
  const points: AltitudePoint[] = [];

  for (let t = window.start.getTime(); t <= window.end.getTime(); t += step) {
    const at = new Date(t);
    points.push({
      at,
      altitude: equatorialToHorizontal(coords, at, latitude, longitude).altitude,
    });
  }

  return points;
}

export interface UsableWindow {
  start: Date;
  end: Date;
  /** Pencere içindeki en yüksek nokta. */
  peakAltitude: number;
  peakAt: Date;
  minutes: number;
}

/**
 * Hedefin gece penceresi içinde `minAltitude` üstünde kaldığı **en uzun**
 * kesintisiz aralık.
 *
 * En uzun aralık aranır çünkü hedef gece başında batıp şafağa doğru yeniden
 * doğabilir (kutup yakını cisimler); bu iki parçadan uzun olanı planlamaya
 * değer olandır. Hiç yükselmiyorsa `null`.
 */
export function usableWindow(
  coords: EquatorialCoords,
  night: { start: Date; end: Date },
  latitude: number,
  longitude: number,
  minAltitude = 30
): UsableWindow | null {
  let best: UsableWindow | null = null;
  let runStart: number | null = null;
  let runPeak = -90;
  let runPeakAt = night.start;

  const close = (endMs: number) => {
    if (runStart === null) return;
    const minutes = (endMs - runStart) / 60_000;
    if (!best || minutes > best.minutes) {
      best = {
        start: new Date(runStart),
        end: new Date(endMs),
        peakAltitude: runPeak,
        peakAt: runPeakAt,
        minutes,
      };
    }
    runStart = null;
    runPeak = -90;
  };

  for (let t = night.start.getTime(); t <= night.end.getTime(); t += STEP_MS) {
    const at = new Date(t);
    const { altitude } = equatorialToHorizontal(coords, at, latitude, longitude);

    if (altitude >= minAltitude) {
      if (runStart === null) runStart = t;
      if (altitude > runPeak) {
        runPeak = altitude;
        runPeakAt = at;
      }
    } else {
      close(t);
    }
  }
  close(night.end.getTime());

  return best;
}

export interface PlanRequest {
  id: string;
  coords: EquatorialCoords;
  /** Bu hedefe ayrılmak istenen süre, dakika. */
  requestedMinutes: number;
}

export interface ScheduledSlot {
  id: string;
  start: Date;
  end: Date;
  minutes: number;
  peakAltitude: number;
  peakAt: Date;
  /** İstenen sürenin ne kadarı karşılandı (0–1). */
  fulfillment: number;
}

export type SkipReason =
  | 'ufkun-altinda' // gece boyunca minimum yüksekliğe çıkmıyor
  | 'zaman-kalmadi'; // penceresi var ama gece dolu

export interface SkippedTarget {
  id: string;
  reason: SkipReason;
  /** Varsa hedefin kendi penceresi — kullanıcıya "şu saatte müsaitti" demek için. */
  window: UsableWindow | null;
}

export interface SessionPlan {
  scheduled: ScheduledSlot[];
  skipped: SkippedTarget[];
  /** Planlanan toplam süre, dakika. */
  totalMinutes: number;
  /** Gecenin planlanmadan kalan süresi, dakika. */
  idleMinutes: number;
}

/**
 * İstenen sürenin karşılanabilmesi için gereken en düşük oran.
 *
 * Yarısından azı karşılanan hedef planlanmaz: 2 saat isteyip 40 dakika almak
 * çoğu deep-sky hedefinde kullanılabilir bir sonuç vermez ve o süre başka
 * hedefe yarardı.
 */
const MIN_FULFILLMENT = 0.5;

/** Hedefleri gece penceresine çakışmayacak biçimde yerleştirir. */
export function planSession(
  requests: PlanRequest[],
  night: { start: Date; end: Date },
  latitude: number,
  longitude: number,
  minAltitude = 30
): SessionPlan {
  const windows = requests.map((request) => ({
    request,
    window: usableWindow(request.coords, night, latitude, longitude, minAltitude),
  }));

  const skipped: SkippedTarget[] = windows
    .filter((w) => w.window === null)
    .map((w) => ({ id: w.request.id, reason: 'ufkun-altinda' as const, window: null }));

  const candidates = windows
    .filter((w): w is { request: PlanRequest; window: UsableWindow } => w.window !== null)
    // En erken biten önce — batmak üzere olanı kurtar.
    .sort((a, b) => a.window.end.getTime() - b.window.end.getTime());

  const scheduled: ScheduledSlot[] = [];
  let cursor = night.start.getTime();

  for (const { request, window } of candidates) {
    const start = Math.max(cursor, window.start.getTime());
    const requestedMs = request.requestedMinutes * 60_000;
    const end = Math.min(start + requestedMs, window.end.getTime());
    const minutes = (end - start) / 60_000;
    const fulfillment = requestedMs > 0 ? (end - start) / requestedMs : 0;

    if (minutes <= 0 || fulfillment < MIN_FULFILLMENT) {
      skipped.push({ id: request.id, reason: 'zaman-kalmadi', window });
      continue;
    }

    scheduled.push({
      id: request.id,
      start: new Date(start),
      end: new Date(end),
      minutes,
      peakAltitude: window.peakAltitude,
      peakAt: window.peakAt,
      fulfillment: Math.min(fulfillment, 1),
    });
    cursor = end;
  }

  const totalMinutes = scheduled.reduce((s, slot) => s + slot.minutes, 0);
  const nightMinutes =
    (night.end.getTime() - night.start.getTime()) / 60_000;

  return {
    scheduled,
    skipped,
    totalMinutes,
    idleMinutes: Math.max(0, Math.round(nightMinutes - totalMinutes)),
  };
}

export const skipReasonLabels: Record<SkipReason, string> = {
  'ufkun-altinda': 'Gece boyunca yeterli yüksekliğe çıkmıyor',
  'zaman-kalmadi': 'Penceresi başka hedeflerle doldu',
};

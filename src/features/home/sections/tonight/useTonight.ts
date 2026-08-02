import { useEffect, useMemo, useState } from 'react';
import { useLocationContext } from '@/features/location/LocationContext';
import { useSkyConditions, type SkyState } from '@/features/weather/useSkyConditions';
import { FORECAST_DAYS } from '@/features/weather/openMeteo';
import { targets } from '@/features/targets/data';
import type { CelestialTarget } from '@/features/targets/data';
import {
  nightTimeline,
  type NightTimeline,
} from '@/domain/astronomy/nightTimeline';
import {
  moonPhase,
  moonRiseSet,
  parseDec,
  parseRa,
  targetNightPeak,
  type MoonPhase,
  type RiseSet,
  type TargetNight,
} from '@/domain/astronomy/ephemeris';
import { nightScore, type NightScore } from '@/domain/astronomy/nightScore';
import { zonedMidnight } from '@/domain/time/zonedDay';

/**
 * "BU GECE" MODÜLÜNÜN VERİ KATMANI.
 *
 * Panel üç kolona bölündü ve her kolon aynı gecenin farklı bir yüzünü
 * gösteriyor: karar, zaman, hedefler. Üçü de aynı çekirdek hesaptan
 * beslenmek zorunda — kolonların kendi `nightTimeline()` çağrısı olsaydı
 * skor bir gecenin, çizelge başka bir gecenin sayılarını gösterebilirdi
 * (gün dönümü tam o anda geçtiyse birebir bu olur).
 *
 * Bu yüzden hesap tek yerde: burada. Kolonlar saf sunum.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PAHALI HESAP DAKİKA İBRESİNDEN AYRILDI
 *
 * Efemeris hesabı ucuz değil: ay yüksekliği on dakikalık adımlarla
 * örnekleniyor ve katalogdaki 200'ün üzerinde hedef için gece zirvesi
 * aranıyor. Bunu dakikada bir tekrarlamak, ekranda hiçbir şey
 * değiştirmeden her dakika birkaç yüz bin trigonometrik işlem demekti.
 *
 * Ayrım şu: ağır hesap GÜNE ve KONUMA bağlı (`dayStartMs`), "şu an"
 * imleci ise dakikaya. İmleç, çizelgenin uçlarından tek bir bölme ile
 * çıkıyor — `timeline.now` kullanılmıyor çünkü o, hesabın yapıldığı
 * andaki değeri taşıyor ve bir saat sonra hâlâ aynı yerde durur.
 */

export interface TonightTarget {
  target: CelestialTarget;
  peak: TargetNight;
}

export interface TonightData {
  timeline: NightTimeline;
  moon: MoonPhase;
  moonTimes: RiseSet;
  /**
   * Bu gece ufkun üstüne çıkan hedefler, zirve yüksekliğine göre sıralı.
   *
   * KESİLMEDEN veriliyor: kolon önce çipe göre süzüp sonra kesiyor.
   * Burada altıya kesilseydi "Galaksi" çipi çoğu gece boş çıkardı —
   * ilk altı sırayı kümeler kapmışken katalogda onlarca galaksi varken.
   */
  ranked: TonightTarget[];
  conditions: SkyState;
  /** Hava verisi yokken null — skor uydurulmuyor. */
  score: NightScore | null;
  /** Dakikada bir güncellenen an. */
  now: Date;
  /** Eksen üzerinde "şu an" (0–1); gece dışındaysa null. */
  nowAt: number | null;
  dateLabel: string;
  timeZone: string;
  locationLabel: string;
  /** Bugünden kaç gün ileri bakılıyor. */
  offsetDays: number;
  /**
   * Seçilen gece hava tahmini ufkunun ötesinde mi?
   *
   * Efemerisin sınırı yok; bu bayrak yalnızca hava satırları için.
   * Arayüz bunu görünce "veri yok" demek yerine SEBEBİNİ söylüyor —
   * servis düşmüş sanılmasın.
   */
  beyondForecast: boolean;
}

/**
 * Dakikalık ibre — sekme gizliyken durur.
 *
 * Arka plandaki bir sekmede dakikada bir render etmek pil yakar ve hiç
 * kimse görmez. Sekme geri geldiğinde ÖNCE bir kere güncelleniyor:
 * gizliyken geçen süre kadar geride kalmış bir imleç, ilk bakışta yanlış
 * bilgi verir.
 */
function useMinuteTick(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    const start = () => {
      stop();
      setNow(new Date());
      timer = setInterval(() => setNow(new Date()), 60_000);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return now;
}

export function timelineClockPosition(
  timeline: Pick<NightTimeline, 'from' | 'to'>,
  now: Date
): number | null {
  if (!timeline.from || !timeline.to) return null;

  const from = timeline.from.getTime();
  const to = timeline.to.getTime();

  for (const edge of [timeline.from, timeline.to]) {
    const candidate = new Date(edge);
    candidate.setHours(
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );
    const value = candidate.getTime();
    if (value >= from && value <= to) return (value - from) / (to - from);
  }

  return null;
}

export function useTonight(offsetDays = 0): TonightData {
  const { location } = useLocationContext();
  const now = useMinuteTick();

  /*
   * Gün, tarayıcının değil GÖZLEM KONUMUNUN takvimine göre (ASTRO-01).
   * `offsetDays` ileri bir geceye kaydırıyor; efemeris için sınır yok.
   */
  const dayStartMs =
    zonedMidnight(now, location.timeZone).getTime() + offsetDays * 86_400_000;

  /*
   * HAVA SORGUSU GECENİN ORTASINA GÖRE.
   *
   * "Bugünün havası" diye bir şey yok — 03:00 ile 21:00 farklı hava.
   * Gözlem gecesinin ortası (yerel 01:00) o gecenin koşullarını temsil
   * eden en makul tek an: karanlık pencere neredeyse her mevsimde onu
   * kapsıyor.
   *
   * Bugün için `undefined` gönderiliyor, yani "şimdi": ekranda duran
   * kullanıcı için doğru olan, altı saat sonrasının tahmini değil şu
   * anki gökyüzü.
   */
  const weatherAt = useMemo(
    () =>
      offsetDays === 0
        ? undefined
        : new Date(dayStartMs + 25 * 3_600_000),
    [offsetDays, dayStartMs]
  );

  const conditions = useSkyConditions(weatherAt);

  const sky = useMemo(() => {
    const date = new Date(dayStartMs);
    const timeline = nightTimeline(
      date,
      location.latitude,
      location.longitude,
      date,
      location.timeZone
    );
    const moon = moonPhase(date);
    const moonTimes = moonRiseSet(
      date,
      location.latitude,
      location.longitude,
      location.timeZone
    );

    const ranked: TonightTarget[] = timeline.dark
      ? targets
          .map((target) => {
            const coords = { ra: parseRa(target.ra), dec: parseDec(target.dec) };
            if (Number.isNaN(coords.ra) || Number.isNaN(coords.dec)) return null;
            const peak = targetNightPeak(
              coords,
              { start: timeline.dark!.from, end: timeline.dark!.to },
              location.latitude,
              location.longitude
            );
            return peak.neverRises ? null : { target, peak };
          })
          .filter((entry): entry is TonightTarget => entry !== null)
          .sort((a, b) => b.peak.peakAltitude - a.peak.peakAltitude)
      : [];

    return { timeline, moon, moonTimes, ranked };
  }, [dayStartMs, location.latitude, location.longitude, location.timeZone]);

  const weather = conditions.data;
  const { timeline } = sky;

  /* Skor girdileri tek yerde kurulur; kolonlar kendi gece hesabını yapmaz. */
  const scoreInputs = useMemo(() => {
    if (!weather) return null;
    const darkMinutes = timeline.dark
      ? Math.round(
          (timeline.dark.to.getTime() - timeline.dark.from.getTime()) / 60_000
        )
      : 0;
    return {
      cloudCover: weather.cloudCover,
      seeingIndex: weather.seeing?.index ?? null,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      windGust: weather.windGust,
      transparencyIndex: weather.transparency?.index ?? null,
      temperature: weather.temperature,
      dewPoint: weather.dewPoint,
      darkMinutes,
      moonlessMinutes: timeline.moonlessMinutes,
      moonIllumination: sky.moon.illumination,
    };
  }, [weather, timeline, sky.moon.illumination]);

  /** Gözle gözlem skoru — panelin ana sayısı. */
  const score = useMemo(
    () => (scoreInputs ? nightScore(scoreInputs, 'gozlem') : null),
    [scoreInputs]
  );

  /*
   * İmleç oranı burada, `timeline.now` ile değil. Çizelge güne göre
   * hesaplanıyor ve o alan hesap anındaki değeri taşıyor; dakikalık ibre
   * ile birlikte hareket etmesi gereken tek şey bu bölme.
   */
  const nowAt = useMemo(() => {
    return timelineClockPosition(timeline, now);
  }, [timeline, now]);

  const dateLabel = useMemo(
    () =>
      new Date(dayStartMs).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
        timeZone: location.timeZone,
      }),
    [dayStartMs, location.timeZone]
  );

  return {
    ...sky,
    conditions,
    score,
    now,
    nowAt,
    dateLabel,
    timeZone: location.timeZone,
    locationLabel: location.label,
    offsetDays,
    beyondForecast: offsetDays >= FORECAST_DAYS,
  };
}

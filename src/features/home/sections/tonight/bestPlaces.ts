import { moonPhase } from '@/domain/astronomy/ephemeris';
import { nightTimeline } from '@/domain/astronomy/nightTimeline';

const TURKEY_TIME_ZONE = 'Europe/Istanbul';

interface CandidateSite {
  name: string;
  region: string;
  provinceSlug: string;
  coords: { latitude: number; longitude: number };
  bortle: number;
  altitude: number;
}

export interface BestPlace {
  site: CandidateSite;
  dsoScore: number;
  solarSystemScore: number;
  moonlessMinutes: number;
  darkMinutes: number;
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const CANDIDATES = [
  ['Palandöken Yaylası', 'Erzurum', 'erzurum', 39.8508, 41.2417, 2, 2400, 100],
  ['Nemrut Krater Çevresi', 'Bitlis', 'bitlis', 38.6543, 42.2297, 2, 2250, 65],
  ['Munzur Yaylaları', 'Tunceli', 'tunceli', 39.126, 39.2392, 2, 2100, 100],
  [
    'Saklıkent Gözlem Alanı',
    'Antalya',
    'antalya',
    36.8247,
    30.3353,
    3,
    1850,
    100,
  ],
  ['Alacabel Geçidi', 'Konya', 'konya', 37.1456, 31.9217, 3, 1800, 100],
  [
    'Kaz Dağları Güney Yamacı',
    'Çanakkale',
    'canakkale',
    39.7294,
    26.8392,
    3,
    1350,
    100,
  ],
  ['Göreme Kırsalı', 'Nevşehir', 'nevsehir', 38.6431, 34.8289, 3, 1100, 100],
  [
    'Erciyes Tekir Yaylası',
    'Kayseri',
    'kayseri',
    38.5318,
    35.4471,
    4,
    2150,
    100,
  ],
  ['Karagöl Yayla Hattı', 'Artvin', 'artvin', 41.3102, 42.2678, 3, 1700, 65],
  ['Datça Kırsalı', 'Muğla', 'mugla', 36.7408, 27.6836, 3, 650, 100],
] as const;

function siteQuality(
  bortleClass: number,
  altitudeMeters: number,
  horizon: number
): number {
  const bortle = clamp(((9 - bortleClass) / 8) * 100);
  const altitude = clamp((altitudeMeters / 2500) * 100);
  return bortle * 0.55 + altitude * 0.25 + horizon * 0.2;
}

function solarQuality(altitudeMeters: number, horizon: number): number {
  const altitude = clamp((altitudeMeters / 2500) * 100);
  return altitude * 0.7 + horizon * 0.3;
}

export function bestPlacesForNight(date: Date, limit = 10): BestPlace[] {
  const moon = moonPhase(date);

  return CANDIDATES.map(
    ([
      name,
      region,
      provinceSlug,
      latitude,
      longitude,
      bortle,
      altitude,
      horizon,
    ]) => {
      const site: CandidateSite = {
        name,
        region,
        provinceSlug,
        coords: { latitude, longitude },
        bortle,
        altitude,
      };
      const timeline = nightTimeline(
        date,
        latitude,
        longitude,
        date,
        TURKEY_TIME_ZONE
      );
      const darkMinutes = timeline.dark
        ? Math.round(
            (timeline.dark.to.getTime() - timeline.dark.from.getTime()) / 60_000
          )
        : 0;
      const moonlessMinutes = timeline.moonlessMinutes;
      const usableDark = clamp((moonlessMinutes / 360) * 100);
      const moonPenalty = clamp((1 - moon.illumination) * 100);
      const dsoScore = Math.round(
        siteQuality(bortle, altitude, horizon) * 0.35 +
          usableDark * 0.45 +
          moonPenalty * 0.2
      );
      const solarSystemScore = Math.round(
        solarQuality(altitude, horizon) * 0.75 +
          clamp((darkMinutes / 240) * 100) * 0.25
      );

      return {
        site,
        dsoScore: clamp(dsoScore),
        solarSystemScore: clamp(solarSystemScore),
        moonlessMinutes,
        darkMinutes,
      };
    }
  )
    .sort(
      (a, b) =>
        b.dsoScore - a.dsoScore ||
        b.solarSystemScore - a.solarSystemScore ||
        a.site.bortle - b.site.bortle
    )
    .slice(0, limit);
}

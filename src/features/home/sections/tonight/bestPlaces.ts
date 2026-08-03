import { moonPhase } from '@/domain/astronomy/ephemeris';
import { nightScore } from '@/domain/astronomy/nightScore';
import { nightTimeline } from '@/domain/astronomy/nightTimeline';
import { fetchOpenMeteo, type SkyConditions } from '@/features/weather/openMeteo';

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
  bestScore: number;
  bestProfile: 'dso' | 'solar';
  weatherBased: boolean;
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

function heuristicScores({
  bortle,
  altitude,
  horizon,
  moonlessMinutes,
  darkMinutes,
  moonIllumination,
}: {
  bortle: number;
  altitude: number;
  horizon: number;
  moonlessMinutes: number;
  darkMinutes: number;
  moonIllumination: number;
}) {
  const usableDark = clamp((moonlessMinutes / 360) * 100);
  const moonPenalty = clamp((1 - moonIllumination) * 100);
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
    dsoScore: clamp(dsoScore),
    solarSystemScore: clamp(solarSystemScore),
  };
}

function weatherScores({
  site,
  weather,
  moonIllumination,
  moonlessMinutes,
  darkMinutes,
}: {
  site: CandidateSite;
  weather: SkyConditions;
  moonIllumination: number;
  moonlessMinutes: number;
  darkMinutes: number;
}) {
  const inputs = {
    cloudCover: weather.cloudCover,
    seeingIndex: weather.seeing?.index ?? null,
    humidity: weather.humidity,
    windSpeed: weather.windSpeed,
    windGust: weather.windGust,
    transparencyIndex: weather.transparency?.index ?? null,
    temperature: weather.temperature,
    dewPoint: weather.dewPoint,
    darkMinutes,
    moonlessMinutes,
    moonIllumination,
    altitude: site.altitude,
    bortle: site.bortle,
  };

  return {
    dsoScore: nightScore(inputs, 'derinUzay').total,
    solarSystemScore: nightScore(inputs, 'gunesSistemi').total,
  };
}

export function bestPlacesForNight(
  date: Date,
  limit = 10,
  weatherBySite = new Map<string, SkyConditions | null>()
): BestPlace[] {
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
      const weather = weatherBySite.get(name) ?? null;
      const scores = weather
        ? weatherScores({
            site,
            weather,
            moonIllumination: moon.illumination,
            moonlessMinutes,
            darkMinutes,
          })
        : heuristicScores({
            bortle,
            altitude,
            horizon,
            moonlessMinutes,
            darkMinutes,
            moonIllumination: moon.illumination,
          });
      const dsoScore = clamp(scores.dsoScore);
      const solarSystemScore = clamp(scores.solarSystemScore);
      const bestProfile: BestPlace['bestProfile'] =
        dsoScore >= solarSystemScore ? 'dso' : 'solar';
      const bestScore = Math.max(dsoScore, solarSystemScore);

      return {
        site,
        dsoScore,
        solarSystemScore,
        bestScore,
        bestProfile,
        weatherBased: Boolean(weather),
        moonlessMinutes,
        darkMinutes,
      };
    }
  )
    .sort(
      (a, b) =>
        b.bestScore - a.bestScore ||
        b.dsoScore - a.dsoScore ||
        b.solarSystemScore - a.solarSystemScore ||
        a.site.bortle - b.site.bortle
    )
    .slice(0, limit);
}

export async function bestPlacesForNightWithWeather(
  date: Date,
  weatherAt: Date,
  limit = 10,
  signal?: AbortSignal
): Promise<BestPlace[]> {
  const entries = await Promise.all(
    CANDIDATES.map(async ([name, , , latitude, longitude]) => {
      const result = await fetchOpenMeteo(
        latitude,
        longitude,
        signal,
        weatherAt
      ).catch(() => ({ conditions: null }));
      return [name, result.conditions] as const;
    })
  );

  return bestPlacesForNight(date, limit, new Map(entries));
}

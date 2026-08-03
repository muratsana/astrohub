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
  southHorizon: 'Açık' | 'Kısmen açık' | 'Kapalı';
}

export interface BestPlace {
  site: CandidateSite;
  provinceSlug?: string;
  dsoScore: number;
  solarSystemScore: number;
  moonlessMinutes: number;
  darkMinutes: number;
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const CANDIDATES: CandidateSite[] = [
  {
    name: 'Palandöken Yaylası',
    region: 'Erzurum',
    provinceSlug: 'erzurum',
    coords: { latitude: 39.8508, longitude: 41.2417 },
    bortle: 2,
    altitude: 2400,
    southHorizon: 'Açık',
  },
  {
    name: 'Nemrut Krater Çevresi',
    region: 'Bitlis',
    provinceSlug: 'bitlis',
    coords: { latitude: 38.6543, longitude: 42.2297 },
    bortle: 2,
    altitude: 2250,
    southHorizon: 'Kısmen açık',
  },
  {
    name: 'Munzur Yaylaları',
    region: 'Tunceli',
    provinceSlug: 'tunceli',
    coords: { latitude: 39.126, longitude: 39.2392 },
    bortle: 2,
    altitude: 2100,
    southHorizon: 'Açık',
  },
  {
    name: 'Saklıkent Gözlem Alanı',
    region: 'Antalya',
    provinceSlug: 'antalya',
    coords: { latitude: 36.8247, longitude: 30.3353 },
    bortle: 3,
    altitude: 1850,
    southHorizon: 'Açık',
  },
  {
    name: 'Alacabel Geçidi',
    region: 'Konya',
    provinceSlug: 'konya',
    coords: { latitude: 37.1456, longitude: 31.9217 },
    bortle: 3,
    altitude: 1800,
    southHorizon: 'Açık',
  },
  {
    name: 'Kaz Dağları Güney Yamacı',
    region: 'Çanakkale',
    provinceSlug: 'canakkale',
    coords: { latitude: 39.7294, longitude: 26.8392 },
    bortle: 3,
    altitude: 1350,
    southHorizon: 'Açık',
  },
  {
    name: 'Göreme Kırsalı',
    region: 'Nevşehir',
    provinceSlug: 'nevsehir',
    coords: { latitude: 38.6431, longitude: 34.8289 },
    bortle: 3,
    altitude: 1100,
    southHorizon: 'Açık',
  },
  {
    name: 'Erciyes Tekir Yaylası',
    region: 'Kayseri',
    provinceSlug: 'kayseri',
    coords: { latitude: 38.5318, longitude: 35.4471 },
    bortle: 4,
    altitude: 2150,
    southHorizon: 'Açık',
  },
  {
    name: 'Karagöl Yayla Hattı',
    region: 'Artvin',
    provinceSlug: 'artvin',
    coords: { latitude: 41.3102, longitude: 42.2678 },
    bortle: 3,
    altitude: 1700,
    southHorizon: 'Kısmen açık',
  },
  {
    name: 'Datça Kırsalı',
    region: 'Muğla',
    provinceSlug: 'mugla',
    coords: { latitude: 36.7408, longitude: 27.6836 },
    bortle: 3,
    altitude: 650,
    southHorizon: 'Açık',
  },
];

function siteQuality(site: CandidateSite): number {
  const bortle = clamp(((9 - site.bortle) / 8) * 100);
  const altitude = clamp((site.altitude / 2500) * 100);
  const horizon =
    site.southHorizon === 'Açık'
      ? 100
      : site.southHorizon === 'Kısmen açık'
        ? 65
        : 30;
  return bortle * 0.55 + altitude * 0.25 + horizon * 0.2;
}

function solarQuality(site: CandidateSite): number {
  const altitude = clamp((site.altitude / 2500) * 100);
  const horizon =
    site.southHorizon === 'Açık'
      ? 100
      : site.southHorizon === 'Kısmen açık'
        ? 70
        : 35;
  return altitude * 0.7 + horizon * 0.3;
}

export function bestPlacesForNight(date: Date, limit = 10): BestPlace[] {
  const moon = moonPhase(date);

  return CANDIDATES.map((site) => {
    const timeline = nightTimeline(
      date,
      site.coords.latitude,
      site.coords.longitude,
      date,
      TURKEY_TIME_ZONE
    );
    const darkMinutes = timeline.dark
      ? Math.round(
          (timeline.dark.to.getTime() - timeline.dark.from.getTime()) / 60_000
        )
      : 0;
    const moonlessMinutes = timeline.moonlessMinutes;
    const moonless = darkMinutes > 0 ? moonlessMinutes / darkMinutes : 0;
    const usableDark = clamp((moonlessMinutes / 360) * 100);
    const moonPenalty = clamp((1 - moon.illumination) * 100);
    const dsoScore = Math.round(
      siteQuality(site) * 0.35 + usableDark * 0.45 + moonPenalty * 0.2
    );
    const solarSystemScore = Math.round(
      solarQuality(site) * 0.7 +
        clamp((darkMinutes / 240) * 100) * 0.1 +
        (1 - moonless) * 20
    );

    return {
      site,
      provinceSlug: site.provinceSlug,
      dsoScore: clamp(dsoScore),
      solarSystemScore: clamp(solarSystemScore),
      moonlessMinutes,
      darkMinutes,
    };
  })
    .sort(
      (a, b) =>
        b.dsoScore - a.dsoScore ||
        b.solarSystemScore - a.solarSystemScore ||
        a.site.bortle - b.site.bortle
    )
    .slice(0, limit);
}

/** Kamp/gözlem noktası tohum verisi (§8.5). Harita katmanı Faz 1.7'de. */

export interface ObservingSite {
  slug: string;
  name: string;
  region: string; // il/ilçe
  /**
   * Noktanın yaklaşık koordinatı.
   *
   * Yaklaşık olması bilinçli (§15.3): gözlem noktaları çoğunlukla kamuya
   * açık alanlar olsa da, kullanıcı katkısıyla eklenen noktalarda tam
   * koordinat mahremiyet ve alanın korunması açısından risklidir. Yakınlık
   * hesabı için birkaç yüz metrelik hata önemsizdir.
   */
  coords: { latitude: number; longitude: number };
  siteType: SiteType;
  bortle: number;
  sqm?: number;
  altitude: number; // metre
  roadAccess: RoadAccess;
  facilities: {
    water: boolean;
    toilet: boolean;
    electricity: boolean;
    cellSignal: boolean;
    tentArea: boolean;
    caravanOk: boolean;
  };
  southHorizon: 'Açık' | 'Kısmen açık' | 'Kapalı';
  bestMonths: string;
  description: string;
  warnings?: string[];
  gradient: string;
  rating: number; // 0-5
  reviewCount: number;
}

export type RoadAccess =
  | 'Asfalt'
  | 'Kısmen asfalt'
  | 'Stabilize'
  | '4x4 gerekir';

export type SiteType =
  'camping' | 'otel-pansiyon' | 'arazi' | 'milli-park' | 'ozel-mulk';

export const roadAccessOptions: RoadAccess[] = [
  'Asfalt',
  'Kısmen asfalt',
  'Stabilize',
  '4x4 gerekir',
];

export const siteTypeLabels: Record<SiteType, string> = {
  camping: 'Camping',
  'otel-pansiyon': 'Otel/Pansiyon',
  arazi: 'Arazi',
  'milli-park': 'Milli Park',
  'ozel-mulk': 'Özel Mülk',
};

export const sites: ObservingSite[] = [
  {
    slug: 'saklikent-antalya',
    name: 'Saklıkent Gözlem Alanı',
    region: 'Antalya',
    coords: { latitude: 36.8247, longitude: 30.3353 },
    siteType: 'camping',
    bortle: 3,
    sqm: 21.6,
    altitude: 1850,
    roadAccess: 'Kısmen asfalt',
    facilities: {
      water: true,
      toilet: true,
      electricity: true,
      cellSignal: true,
      tentArea: true,
      caravanOk: true,
    },
    southHorizon: 'Açık',
    bestMonths: 'Mayıs – Ekim',
    description:
      "TÜBİTAK Ulusal Gözlemevi yakınındaki plato; asfalt erişim ve tesis olanaklarıyla Türkiye'nin en erişilebilir karanlık gökyüzü noktalarından. Yaz gecelerinde bile serin olur.",
    warnings: ['Yaz hafta sonları kalabalık olabilir; erken yer tutun.'],
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #4c1d95 100%)',
    rating: 4.7,
    reviewCount: 128,
  },
  {
    slug: 'palandoken-yaylasi',
    name: 'Palandöken Yaylası',
    region: 'Erzurum',
    coords: { latitude: 39.8508, longitude: 41.2417 },
    siteType: 'arazi',
    bortle: 2,
    sqm: 21.9,
    altitude: 2400,
    roadAccess: 'Stabilize',
    facilities: {
      water: false,
      toilet: false,
      electricity: false,
      cellSignal: true,
      tentArea: true,
      caravanOk: false,
    },
    southHorizon: 'Açık',
    bestMonths: 'Haziran – Eylül',
    description:
      "Doğu Anadolu'nun en karanlık gökyüzülerinden; SQM 21.9 ölçümleriyle narrowband gerektirmeyen doğal kontrast. Tesis yok — tam donanımlı gelin.",
    warnings: [
      'Gece sıcaklığı yazın bile 5°C altına düşebilir.',
      'Son 3 km stabilize yol; yağışta zorlaşır.',
    ],
    gradient: 'linear-gradient(160deg, #020617 0%, #172554 60%, #312e81 100%)',
    rating: 4.9,
    reviewCount: 64,
  },
  {
    slug: 'camlidere-ankara',
    name: 'Çamlıdere Gözlem Noktası',
    region: 'Ankara',
    coords: { latitude: 40.4886, longitude: 32.4728 },
    siteType: 'camping',
    bortle: 4,
    sqm: 21.2,
    altitude: 1250,
    roadAccess: 'Asfalt',
    facilities: {
      water: true,
      toilet: false,
      electricity: false,
      cellSignal: true,
      tentArea: true,
      caravanOk: true,
    },
    southHorizon: 'Kısmen açık',
    bestMonths: 'Nisan – Kasım',
    description:
      "Ankara'ya 1 saat mesafede hafta sonu kaçamağı; başkentin ışık kubbesi kuzey ufkunu etkiler ama güney hedefleri için yeterli karanlık sunar.",
    gradient: 'linear-gradient(160deg, #0c1220 0%, #1e293b 55%, #475569 100%)',
    rating: 4.2,
    reviewCount: 96,
  },
  {
    slug: 'goreme-nevsehir',
    name: 'Göreme Kırsalı',
    region: 'Nevşehir',
    coords: { latitude: 38.6431, longitude: 34.8289 },
    siteType: 'milli-park',
    bortle: 3,
    sqm: 21.4,
    altitude: 1100,
    roadAccess: 'Stabilize',
    facilities: {
      water: false,
      toilet: false,
      electricity: false,
      cellSignal: true,
      tentArea: true,
      caravanOk: true,
    },
    southHorizon: 'Açık',
    bestMonths: 'Nisan – Ekim',
    description:
      "Peribacaları silüetiyle gece manzarası fotoğrafçılığının Türkiye'deki başkenti. Turistik bölgeden 10-15 dk uzaklaşınca Bortle 3 gökyüzü.",
    warnings: ['Balon uçuş sabahları erken saatte araç trafiği başlar.'],
    gradient: 'linear-gradient(160deg, #1c1917 0%, #78350f 55%, #b45309 100%)',
    rating: 4.6,
    reviewCount: 87,
  },
];

export function getSiteBySlug(slug: string): ObservingSite | undefined {
  return sites.find((s) => s.slug === slug);
}

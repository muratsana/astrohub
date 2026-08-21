import { commonsImage } from '../../lib/commons';

/** Kamp/gözlem noktası tohum verisi (§8.5). Harita katmanı Faz 1.7'de. */

export interface SiteImage {
  url: string;
  credit: string;
  licence: string;
}

export interface SiteSource {
  label: string;
  url: string;
}

export interface ObservingSite {
  id?: string;
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
  image?: SiteImage;
  sourceUrls?: SiteSource[];
}

export type RoadAccess =
  'Asfalt' | 'Kısmen asfalt' | 'Stabilize' | '4x4 gerekir';

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

function lpm(latitude: number, longitude: number, zoom = 8): string {
  return `https://lightpollutionmap.app/#zoom=${zoom}&lat=${latitude}&lon=${longitude}`;
}

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
    image: {
      url: commonsImage('TUG full site.jpg', 1200),
      credit: 'Wikimedia Commons — Azizkayihan',
      licence: 'CC BY-SA 4.0',
    },
    sourceUrls: [
      {
        label: 'TÜBİTAK Ulusal Gözlemevi / Bakırlıtepe görsel kaydı',
        url: 'https://commons.wikimedia.org/wiki/File:TUG_full_site.jpg',
      },
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(36.8247, 30.3353),
      },
    ],
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
    sourceUrls: [
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(39.8508, 41.2417),
      },
    ],
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
    sourceUrls: [
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(40.4886, 32.4728),
      },
    ],
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
    image: {
      url: commonsImage('Night in goreme 03.jpg', 1200),
      credit: 'Wikimedia Commons — Ramazancirakoglu',
      licence: 'CC BY-SA 4.0',
    },
    sourceUrls: [
      {
        label: 'Göreme gece görseli ve EXIF kaydı',
        url: 'https://commons.wikimedia.org/wiki/File:Night_in_goreme_03.jpg',
      },
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(38.6431, 34.8289),
      },
    ],
  },
  {
    slug: 'uludag-sarialan-bursa',
    name: 'Uludağ Sarıalan',
    region: 'Bursa',
    coords: { latitude: 40.1048, longitude: 29.1433 },
    siteType: 'milli-park',
    bortle: 4,
    sqm: 21.05,
    altitude: 1620,
    roadAccess: 'Asfalt',
    facilities: {
      water: true,
      toilet: true,
      electricity: false,
      cellSignal: true,
      tentArea: true,
      caravanOk: true,
    },
    southHorizon: 'Kısmen açık',
    bestMonths: 'Mayıs – Ekim',
    description:
      "Bursa'ya yakın, erişimi kolay ve kamp altyapısı olan yüksek orman kuşağı. Kuzeybatıdaki şehir ışığı belirgin; gökyüzü kalitesi için açık ve kuru geceleri seçin.",
    warnings: [
      'Milli park kuralları ve kamp alanı yoğunluğu önceden kontrol edilmeli.',
    ],
    gradient: 'linear-gradient(160deg, #052e16 0%, #14532d 52%, #0f172a 100%)',
    rating: 4.3,
    reviewCount: 58,
    image: {
      url: commonsImage('Uludağ Sarıalan view.jpg', 1200),
      credit: 'Wikimedia Commons — Uludağ Sarıalan',
      licence: 'CC BY-SA',
    },
    sourceUrls: [
      {
        label: 'Uludağ Milli Parkı / Sarıalan medya kaydı',
        url: 'https://commons.wikimedia.org/wiki/Category:Uluda%C4%9F_National_Park',
      },
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(40.1048, 29.1433),
      },
    ],
  },
  {
    slug: 'topuklu-yaylasi-denizli',
    name: 'Topuklu Yaylası',
    region: 'Denizli',
    coords: { latitude: 37.1992, longitude: 28.8486 },
    siteType: 'camping',
    bortle: 2,
    sqm: 21.82,
    altitude: 1700,
    roadAccess: 'Stabilize',
    facilities: {
      water: true,
      toilet: true,
      electricity: false,
      cellSignal: true,
      tentArea: true,
      caravanOk: false,
    },
    southHorizon: 'Açık',
    bestMonths: 'Haziran – Eylül',
    description:
      'Beyağaç çevresindeki yüksek yayla hattı; Ege iç kesimlerinde şehir ışığından kaçmak için güçlü bir seçenek. Saha kurulumu için rüzgâr ve nem tahminini kontrol edin.',
    warnings: ['Son bölüm stabilize olabilir; yağış sonrası zemin değişir.'],
    gradient: 'linear-gradient(160deg, #020617 0%, #0f766e 55%, #164e63 100%)',
    rating: 4.8,
    reviewCount: 42,
    sourceUrls: [
      {
        label: 'DarkSky International Türkiye karanlık gökyüzü parkı haberi',
        url: 'https://darksky.org/news/turkiyes-first-international-dark-sky-park-is-certified/',
      },
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(37.1992, 28.8486),
      },
    ],
  },
  {
    slug: 'meke-golu-konya',
    name: 'Meke Gölü Kırsalı',
    region: 'Konya',
    coords: { latitude: 37.6861, longitude: 33.6403 },
    siteType: 'arazi',
    bortle: 3,
    sqm: 21.45,
    altitude: 981,
    roadAccess: 'Kısmen asfalt',
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
      "Karapınar'ın düz ufuklu volkanik platosu; geniş güney ufku ve düşük yerleşim yoğunluğu nedeniyle meteor yağmuru ve geniş açı çekimler için uygun.",
    warnings: ['Koruma statüsü ve yerel erişim kısıtları kontrol edilmeli.'],
    gradient: 'linear-gradient(160deg, #1c1917 0%, #7c2d12 55%, #111827 100%)',
    rating: 4.4,
    reviewCount: 35,
    image: {
      url: commonsImage('Meke Lake.jpg', 1200),
      credit: 'Wikimedia Commons — .ilay.bulut',
      licence: 'CC BY-SA 4.0',
    },
    sourceUrls: [
      {
        label: 'Meke Gölü koordinat/rakım ve görsel kaydı',
        url: 'https://commons.wikimedia.org/wiki/File:Meke_Lake.jpg',
      },
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(37.6861, 33.6403),
      },
    ],
  },
  {
    slug: 'tuz-golu-sereflikochisar',
    name: 'Tuz Gölü Doğu Kıyısı',
    region: 'Ankara',
    coords: { latitude: 38.9306, longitude: 33.4375 },
    siteType: 'arazi',
    bortle: 3,
    sqm: 21.35,
    altitude: 905,
    roadAccess: 'Kısmen asfalt',
    facilities: {
      water: false,
      toilet: false,
      electricity: false,
      cellSignal: true,
      tentArea: true,
      caravanOk: true,
    },
    southHorizon: 'Açık',
    bestMonths: 'Mayıs – Ekim',
    description:
      'Düz ufuk isteyen panorama, meteor ve ay tutulması çekimleri için güçlü bir İç Anadolu alternatifi. Yazın sıcaklık farkı ve toz riski hesaba katılmalı.',
    warnings: [
      'Göl kıyısında zemin yumuşak olabilir; araçla rastgele giriş yapmayın.',
    ],
    gradient: 'linear-gradient(160deg, #111827 0%, #475569 55%, #f8fafc 100%)',
    rating: 4.1,
    reviewCount: 29,
    sourceUrls: [
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(38.9306, 33.4375),
      },
    ],
  },
  {
    slug: 'salda-golu-burdur',
    name: 'Salda Gölü Çevresi',
    region: 'Burdur',
    coords: { latitude: 37.5342, longitude: 29.6459 },
    siteType: 'milli-park',
    bortle: 3,
    sqm: 21.38,
    altitude: 1193,
    roadAccess: 'Asfalt',
    facilities: {
      water: true,
      toilet: true,
      electricity: false,
      cellSignal: true,
      tentArea: true,
      caravanOk: true,
    },
    southHorizon: 'Açık',
    bestMonths: 'Mayıs – Ekim',
    description:
      'Göl çevresi gece manzarası ve geniş açı Samanyolu çekimleri için uygun; koruma alanı kuralları nedeniyle yalnız izinli alanlarda kurulum yapılmalı.',
    warnings: [
      'Kıyı koruma kurallarına uyun; hassas alanlara tripod/araç sokmayın.',
    ],
    gradient: 'linear-gradient(160deg, #0f172a 0%, #0e7490 55%, #f8fafc 100%)',
    rating: 4.5,
    reviewCount: 51,
    image: {
      url: commonsImage('Lake Salda.jpg', 1200),
      credit: 'Wikimedia Commons — Huanforu',
      licence: 'CC BY-SA 4.0',
    },
    sourceUrls: [
      {
        label: 'Salda Gölü koordinat/rakım ve görsel kaydı',
        url: 'https://commons.wikimedia.org/wiki/File:Lake_Salda.jpg',
      },
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(37.5342, 29.6459),
      },
    ],
  },
  {
    slug: 'davraz-isparta',
    name: 'Davraz Dağı Yayla Hattı',
    region: 'Isparta',
    coords: { latitude: 37.7545, longitude: 30.7269 },
    siteType: 'arazi',
    bortle: 3,
    sqm: 21.42,
    altitude: 1650,
    roadAccess: 'Asfalt',
    facilities: {
      water: false,
      toilet: false,
      electricity: false,
      cellSignal: true,
      tentArea: true,
      caravanOk: true,
    },
    southHorizon: 'Kısmen açık',
    bestMonths: 'Haziran – Eylül',
    description:
      'Isparta şehir ışığından uzaklaşmak isteyenler için yüksek rakımlı ve erişimi makul bir seçenek. Kış aylarında yol ve buzlanma riski yüksektir.',
    warnings: ['Kayak sezonunda araç trafiği ve tesis ışıkları artar.'],
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e40af 55%, #e0f2fe 100%)',
    rating: 4.2,
    reviewCount: 24,
    image: {
      url: commonsImage('Davraz 2024.jpg', 1200),
      credit: 'Wikimedia Commons — Mount Davraz',
      licence: 'CC BY-SA',
    },
    sourceUrls: [
      {
        label: 'Davraz Dağı koordinat/rakım medya kaydı',
        url: 'https://commons.wikimedia.org/wiki/Category:Mount_Davraz',
      },
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(37.7545, 30.7269),
      },
    ],
  },
  {
    slug: 'nemrut-krater-bitlis',
    name: 'Nemrut Krater Gölü',
    region: 'Bitlis',
    coords: { latitude: 38.6396, longitude: 42.2481 },
    siteType: 'arazi',
    bortle: 2,
    sqm: 21.78,
    altitude: 2250,
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
      "Doğu Anadolu'da çok karanlık gökyüzü ve yüksek rakım sunan krater çevresi. Hava hızlı değişir; yalnız gidilmemeli ve yerel yol durumu teyit edilmeli.",
    warnings: ['Soğuk, rüzgâr ve vahşi yaşam riski için hazırlıklı olun.'],
    gradient: 'linear-gradient(160deg, #020617 0%, #1e3a8a 55%, #0369a1 100%)',
    rating: 4.8,
    reviewCount: 19,
    image: {
      url: commonsImage('Nemrut Lake.jpg', 1200),
      credit: 'Wikimedia Commons — Fatih YILMAZ',
      licence: 'CC BY-SA',
    },
    sourceUrls: [
      {
        label: 'Nemrut Krater Gölü koordinat/görsel kaydı',
        url: 'https://commons.wikimedia.org/wiki/File:Nemrut_Lake.jpg',
      },
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(38.6396, 42.2481),
      },
    ],
  },
  {
    slug: 'demirkazik-aladaglar',
    name: 'Aladağlar Demirkazık',
    region: 'Niğde',
    coords: { latitude: 37.8389, longitude: 35.1481 },
    siteType: 'arazi',
    bortle: 2,
    sqm: 21.86,
    altitude: 1600,
    roadAccess: 'Kısmen asfalt',
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
      "Aladağlar'ın kuru ve yüksek plato havası dar bant dışı derin uzay çekimleri için güçlü kontrast verir. Dağ koşulları nedeniyle hava ve rüzgâr kritik.",
    warnings: ['Gece sıcaklığı hızlı düşer; dağ güvenliği ekipmanı alın.'],
    gradient: 'linear-gradient(160deg, #020617 0%, #334155 55%, #f1f5f9 100%)',
    rating: 4.9,
    reviewCount: 27,
    sourceUrls: [
      {
        label: 'Demirkazık koordinat/rakım kaydı',
        url: 'https://mapcarta.com/12980044',
      },
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(37.8389, 35.1481),
      },
    ],
  },
  {
    slug: 'karagol-sahara-artvin',
    name: 'Karagöl Sahara Kırsalı',
    region: 'Artvin',
    coords: { latitude: 41.3137, longitude: 42.4728 },
    siteType: 'milli-park',
    bortle: 3,
    sqm: 21.55,
    altitude: 1550,
    roadAccess: 'Stabilize',
    facilities: {
      water: true,
      toilet: true,
      electricity: false,
      cellSignal: false,
      tentArea: true,
      caravanOk: false,
    },
    southHorizon: 'Kısmen açık',
    bestMonths: 'Temmuz – Eylül',
    description:
      "Karadeniz'de ışık kirliliği düşük, fakat bulut/nem riski yüksek bir saha. Şeffaflık tahmini iyi olduğunda geniş açı ve manzara astrofotoğrafı için değerli.",
    warnings: [
      'Nem, sis ve kapalı hava sık görülür; tahminleri yakından izleyin.',
    ],
    gradient: 'linear-gradient(160deg, #052e16 0%, #0f766e 55%, #020617 100%)',
    rating: 4.0,
    reviewCount: 16,
    sourceUrls: [
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(41.3137, 42.4728),
      },
    ],
  },
  {
    slug: 'kazdaglari-sarikiz',
    name: 'Kazdağları Sarıkız Hattı',
    region: 'Balıkesir',
    coords: { latitude: 39.7103, longitude: 26.8392 },
    siteType: 'milli-park',
    bortle: 4,
    sqm: 21.08,
    altitude: 1450,
    roadAccess: 'Stabilize',
    facilities: {
      water: false,
      toilet: false,
      electricity: false,
      cellSignal: true,
      tentArea: true,
      caravanOk: false,
    },
    southHorizon: 'Kısmen açık',
    bestMonths: 'Haziran – Eylül',
    description:
      "Kuzey Ege'de şehirlerden uzaklaşmak için pratik bir yüksek rota. Nem ve orman yangını riskleri nedeniyle izin, yol ve hava durumu kontrolü şart.",
    warnings: ['Milli park/orman erişim kuralları dönemsel değişebilir.'],
    gradient: 'linear-gradient(160deg, #14532d 0%, #365314 50%, #0f172a 100%)',
    rating: 4.1,
    reviewCount: 21,
    sourceUrls: [
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(39.7103, 26.8392),
      },
    ],
  },
  {
    slug: 'karadag-karaman',
    name: 'Karadağ Volkanik Platosu',
    region: 'Karaman',
    coords: { latitude: 37.3837, longitude: 33.1542 },
    siteType: 'arazi',
    bortle: 3,
    sqm: 21.58,
    altitude: 1650,
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
    bestMonths: 'Nisan – Ekim',
    description:
      'Karaman-Konya hattında geniş ufuklu, kuru ve düşük yerleşimli plato. Özellikle güney gökyüzü ve uzun odak derin uzay çekimleri için dengeli bir seçenek.',
    warnings: [
      'Arazi yolları gece yön bulmayı zorlaştırabilir; gündüz keşif yapın.',
    ],
    gradient: 'linear-gradient(160deg, #111827 0%, #7c2d12 55%, #f59e0b 100%)',
    rating: 4.3,
    reviewCount: 18,
    sourceUrls: [
      {
        label: 'LightPollutionMap koordinat kontrolü',
        url: lpm(37.3837, 33.1542),
      },
    ],
  },
];

export function getSiteBySlug(slug: string): ObservingSite | undefined {
  return sites.find((s) => s.slug === slug);
}

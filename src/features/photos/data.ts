import { COZUM_YOK, type AstroPhoto } from './types';
import { commonsImage } from '../../lib/commons';

/**
 * Galeri/detay demo verisi. Faz 1.2'de Supabase + object storage'a bağlanır;
 * bu dosya yalnızca UI'yi gerçekçi teknik veriyle doğrulamak içindir.
 */
/*
 * Tohum fotoğrafların alan çözümü yok — gerçek bir ölçüm değil, örnek
 * içerik. `COZUM_YOK` tek yerden geliyor ki sekiz kayda elle
 * yazılmasın ve biri unutulduğunda tip hatası yerine sessiz bir
 * tutarsızlık çıkmasın.
 */
const ham: Omit<AstroPhoto, 'solve'>[] = [
  {
    slug: 'ic434-at-basi-sho',
    title: 'At Başı ve Alev Bulutsusu',
    target: {
      name: 'At Başı Bulutsusu',
      catalog: 'IC 434',
      constellation: 'Orion',
    },
    type: 'deep-sky',
    user: { username: 'gokhanuzun', displayName: 'Gökhan Uzun' },
    description:
      'İki gecelik veriyle Orion kuşağının güneyindeki karanlık bulutsu. Kış mevsiminin favori hedefi.',
    gradient:
      'radial-gradient(120% 90% at 40% 60%, #dc2626 0%, #991b1b 40%, #1f0a0a 80%, #050a12 100%)',
    capturedAt: '2026-01-18',
    location: {
      label: 'Saklıkent, Antalya',
      visibility: 'approximate',
      bortle: 3,
      sqm: 21.6,
    },
    setup: {
      optic: 'Sky-Watcher Esprit 100 (550mm)',
      camera: 'ZWO ASI2600MM Pro',
      mount: 'Sky-Watcher EQ6-R Pro',
      guiding: 'ZWO OAG + ASI174MM Mini',
      filters: 'Antlia 3nm SHO seti',
      reducer: '0.8× flattener/reducer',
    },
    exposures: [
      { filter: 'Ha', frames: 36, exposureSeconds: 300 },
      { filter: 'OIII', frames: 24, exposureSeconds: 300 },
      { filter: 'SII', frames: 24, exposureSeconds: 300 },
    ],
    palette: 'SHO',
    versions: [
      {
        id: 'v1',
        label: 'v1 — İlk işleme',
        kind: 'ilk-isleme',
        publishedAt: '2026-01-22',
        note: 'Tek gecelik Ha verisiyle ilk deneme; OIII ve SII henüz yoktu.',
        gradient:
          'radial-gradient(120% 90% at 40% 60%, #9a3412 0%, #7c2d12 45%, #1c1917 82%, #050a12 100%)',
        exposures: [{ filter: 'Ha', frames: 18, exposureSeconds: 300 }],
        palette: 'Mono',
      },
      {
        id: 'v2',
        label: 'v2 — SHO birleşim',
        kind: 'yeni-entegrasyon',
        publishedAt: '2026-02-04',
        note: 'İkinci gecede OIII ve SII eklendi; kanallar Hubble paletiyle birleştirildi.',
        gradient:
          'radial-gradient(120% 90% at 40% 60%, #dc2626 0%, #991b1b 40%, #1f0a0a 80%, #050a12 100%)',
        exposures: [
          { filter: 'Ha', frames: 36, exposureSeconds: 300 },
          { filter: 'OIII', frames: 24, exposureSeconds: 300 },
          { filter: 'SII', frames: 24, exposureSeconds: 300 },
        ],
        palette: 'SHO',
      },
      {
        id: 'v3',
        label: 'v3 — Revize streç',
        kind: 'revize-isleme',
        publishedAt: '2026-03-11',
        note: 'Yıldız küçültme ve daha yumuşak streç; arka plan gradyanı yeniden düzeltildi.',
        gradient:
          'radial-gradient(120% 90% at 42% 58%, #ef4444 0%, #7f1d1d 42%, #170707 82%, #030509 100%)',
      },
    ],
    calibration: { darks: 30, flats: 25, bias: 50 },
    processing: {
      software: ['PixInsight', 'Photoshop'],
      steps:
        'WBPP → BlurXTerminator → kanal birleştirme → curves → NoiseXTerminator',
      aiDeclared: true,
    },
    license: 'CC BY-NC 4.0',
    likes: 421,
    comments: 58,
    editorsPick: true,
    year: 2026,
    city: 'Antalya',
  },
  {
    slug: 'ngc6302-kelebek-sho',
    title: 'Kelebek Bulutsusu',
    target: {
      name: 'Kelebek Bulutsusu',
      catalog: 'NGC 6302',
      constellation: 'Akrep',
    },
    type: 'deep-sky',
    user: { username: 'astrocan', displayName: 'Can Demir' },
    description:
      'Güney ufkuna yakın zorlu bir gezegenimsi bulutsu; alçak yükseklikte kısa pozlama pencereleriyle toplandı.',
    gradient:
      'radial-gradient(120% 90% at 50% 40%, #2b6cb0 0%, #6b46c1 35%, #1a1035 70%, #050a12 100%)',
    image: {
      url: commonsImage('NGC 6302 Hubble 2009.full.jpg'),
      credit: 'NASA, ESA, Hubble SM4 ERO Team',
      licence: 'Kamu malı',
    },
    capturedAt: '2025-07-18',
    location: {
      label: 'Saklıkent, Antalya',
      visibility: 'approximate',
      bortle: 3,
      sqm: 21.5,
    },
    setup: {
      optic: '8" f/4 Newton (800mm)',
      camera: 'ZWO ASI2600MM Pro',
      mount: 'EQ6-R Pro',
      guiding: 'OAG + ASI174MM Mini',
      filters: 'Antlia 3nm SHO seti',
    },
    exposures: [
      { filter: 'Ha', frames: 30, exposureSeconds: 180 },
      { filter: 'OIII', frames: 30, exposureSeconds: 180 },
    ],
    palette: 'HOO',
    calibration: { darks: 25, flats: 25, bias: 50 },
    processing: { software: ['PixInsight'] },
    license: 'CC BY-NC 4.0',
    likes: 341,
    comments: 45,
    editorsPick: true,
    year: 2025,
    city: 'Antalya',
  },
  {
    slug: 'm31-andromeda-lrgb',
    title: 'Andromeda Galaksisi',
    target: {
      name: 'Andromeda Galaksisi',
      catalog: 'M 31',
      constellation: 'Andromeda',
    },
    type: 'deep-sky',
    user: { username: 'mert_astro', displayName: 'Mert Yılmaz' },
    description:
      'Sonbahar sezonunun klasiği; 4 panelli mozaikten tek kare kırpım.',
    gradient:
      'radial-gradient(90% 70% at 55% 45%, #d6bca0 0%, #7c5c46 30%, #241a2e 65%, #050a12 100%)',
    image: {
      url: commonsImage('Andromeda galaxy.jpg'),
      credit: 'Wikimedia Commons — Andromeda Galaksisi',
      licence: 'CC BY-SA',
    },
    capturedAt: '2025-10-12',
    location: {
      label: 'Çamlıdere, Ankara',
      visibility: 'region',
      bortle: 4,
      sqm: 21.2,
    },
    setup: {
      optic: 'WO RedCat 51 (250mm)',
      camera: 'ZWO ASI2600MC Pro',
      mount: 'iOptron GEM28',
      guiding: '30mm guide scope + ASI120MM',
    },
    exposures: [{ filter: 'UV/IR-cut', frames: 96, exposureSeconds: 180 }],
    palette: 'RGB',
    versions: [
      {
        id: 'v1',
        label: 'v1 — RGB',
        kind: 'ilk-isleme',
        publishedAt: '2026-01-05',
        note: 'Yalnızca RGB kanallarıyla ilk işleme; toz şeritleri sönük kaldı.',
        gradient:
          'radial-gradient(90% 70% at 55% 45%, #b8a08c 0%, #6b5442 32%, #211a2b 68%, #050a12 100%)',
        palette: 'RGB',
      },
      {
        id: 'v2',
        label: 'v2 — LRGB',
        kind: 'yeni-entegrasyon',
        publishedAt: '2026-01-27',
        note: 'Luminans eklendi; toz şeritleri ve dış kollar belirgin hâle geldi.',
        gradient:
          'radial-gradient(90% 70% at 55% 45%, #d6bca0 0%, #7c5c46 30%, #241a2e 65%, #050a12 100%)',
        palette: 'LRGB',
      },
    ],
    calibration: { darks: 25, flats: 30 },
    processing: { software: ['Siril', 'GIMP'] },
    license: 'Tüm hakları saklıdır',
    likes: 312,
    comments: 41,
    year: 2025,
    city: 'Ankara',
  },
  {
    slug: 'ngc7000-kuzey-amerika-hoo',
    title: 'Kuzey Amerika Bulutsusu',
    target: {
      name: 'Kuzey Amerika Bulutsusu',
      catalog: 'NGC 7000',
      constellation: 'Kuğu',
    },
    type: 'deep-sky',
    user: { username: 'astrocan', displayName: 'Can Demir' },
    description:
      'Şehir merkezinden dual-band filtre ile; ışık kirliliğine rağmen HOO paleti.',
    gradient:
      'radial-gradient(120% 100% at 45% 55%, #c026d3 0%, #9d174d 35%, #3b0a24 70%, #050a12 100%)',
    image: {
      url: commonsImage('North America Nebula (NGC7000) in Hubble Palette.jpg'),
      credit: 'Wikimedia Commons — NGC 7000',
      licence: 'CC BY-SA 4.0',
    },
    capturedAt: '2025-08-02',
    location: {
      label: 'Kadıköy, İstanbul',
      visibility: 'region',
      bortle: 8,
      sqm: 18.1,
    },
    setup: {
      optic: 'Samyang 135mm f/2',
      camera: 'ZWO ASI533MC Pro',
      mount: 'Star Adventurer GTi',
      filters: 'Optolong L-eXtreme',
    },
    exposures: [{ filter: 'Dual-band', frames: 120, exposureSeconds: 120 }],
    palette: 'HOO',
    calibration: { darks: 20, flats: 20, bias: 30 },
    processing: { software: ['PixInsight'], aiDeclared: true },
    license: 'CC BY 4.0',
    likes: 254,
    comments: 19,
    year: 2025,
    city: 'İstanbul',
  },
  {
    slug: 'ay-kopernik-krateri',
    title: 'Kopernik Krateri',
    target: {
      name: 'Ay — Kopernik Krateri',
      catalog: 'Ay',
      constellation: '—',
    },
    type: 'ay',
    user: { username: 'cemyildirim', displayName: 'Cem Yıldırım' },
    description:
      'İyi seeing gecesinde 8" SCT ile lucky imaging; en iyi %10 kare stack.',
    gradient:
      'radial-gradient(70% 70% at 60% 40%, #e5e7eb 0%, #9ca3af 30%, #4b5563 55%, #111827 100%)',
    capturedAt: '2026-03-27',
    location: { label: 'İzmir', visibility: 'region' },
    setup: {
      optic: 'Celestron C8 SCT (2032mm)',
      camera: 'ZWO ASI662MC',
      mount: 'CGEM II',
      reducer: '2× Barlow',
    },
    exposures: [{ filter: 'IR-pass', frames: 5000, exposureSeconds: 0.005 }],
    palette: 'Mono',
    processing: { software: ['AutoStakkert!', 'RegiStax'] },
    license: 'CC BY-NC 4.0',
    likes: 176,
    comments: 12,
    year: 2026,
    city: 'İzmir',
  },
  {
    slug: 'samanyolu-kemeri-kapadokya',
    title: 'Kapadokya Üzerinde Samanyolu Kemeri',
    target: { name: 'Samanyolu', catalog: 'Geniş alan', constellation: '—' },
    type: 'genis-alan',
    user: { username: 'nightscaper', displayName: 'Elif Kaya' },
    description: 'Peribacaları ve galaktik merkez; 12 karelik panorama.',
    gradient:
      'linear-gradient(160deg, #1e293b 0%, #4c1d95 40%, #be185d 75%, #f59e0b 100%)',
    capturedAt: '2025-07-20',
    location: {
      label: 'Göreme, Nevşehir',
      visibility: 'approximate',
      bortle: 3,
      sqm: 21.4,
    },
    setup: {
      optic: 'Sigma 20mm f/1.4 Art',
      camera: 'Sony A7 III (modifiyeli)',
      mount: 'Tripod + panorama başlığı',
    },
    exposures: [{ filter: 'Yok', frames: 12, exposureSeconds: 15 }],
    palette: 'RGB',
    processing: { software: ['Lightroom', 'PTGui'] },
    license: 'Tüm hakları saklıdır',
    likes: 388,
    comments: 33,
    editorsPick: true,
    year: 2025,
    city: 'Nevşehir',
  },
  {
    slug: 'rozet-bulutsusu-sho',
    title: 'Rozet Bulutsusu',
    target: {
      name: 'Rozet Bulutsusu',
      catalog: 'NGC 2237',
      constellation: 'Tek Boynuz',
    },
    type: 'deep-sky',
    user: { username: 'deepsky_tr', displayName: 'Deniz Arslan' },
    description: 'Üç gecelik 9 saatlik SHO verisi; merkez küme NGC 2244 ile.',
    gradient:
      'radial-gradient(100% 100% at 50% 50%, #ef4444 0%, #7f1d1d 45%, #2a0a16 80%, #050a12 100%)',
    image: {
      url: commonsImage('Rosette Nebula NGC 2237 - C49.png'),
      credit: 'Wikimedia Commons — Rozet Bulutsusu',
      licence: 'CC BY-SA 3.0',
    },
    capturedAt: '2026-02-11',
    location: { label: 'Erzurum', visibility: 'region', bortle: 2, sqm: 21.9 },
    setup: {
      optic: '8" f/4 Newton (800mm)',
      camera: 'ZWO ASI1600MM Pro',
      mount: 'EQ6-R Pro',
      guiding: 'OAG + ASI290MM Mini',
      filters: 'ZWO 7nm SHO',
    },
    exposures: [
      { filter: 'Ha', frames: 40, exposureSeconds: 300 },
      { filter: 'OIII', frames: 34, exposureSeconds: 300 },
      { filter: 'SII', frames: 34, exposureSeconds: 300 },
    ],
    palette: 'SHO',
    calibration: { darks: 30, flats: 30, darkFlats: 30 },
    processing: { software: ['PixInsight'] },
    license: 'CC BY-NC-SA 4.0',
    likes: 288,
    comments: 41,
    year: 2026,
    city: 'Erzurum',
  },
  {
    slug: 'yildiz-izleri-agri',
    title: 'Ağrı Dağı Üzerinde Yıldız İzleri',
    target: {
      name: 'Kutup Yıldızı çevresi',
      catalog: 'Star trail',
      constellation: '—',
    },
    type: 'star-trail',
    user: { username: 'polaris34', displayName: 'Burak Şen' },
    description: '2 saatlik seri; 240 karenin StarStaX ile birleştirilmesi.',
    gradient: 'linear-gradient(180deg, #0f172a 0%, #1e3a5f 55%, #475569 100%)',
    capturedAt: '2025-09-05',
    location: {
      label: 'Doğubayazıt, Ağrı',
      visibility: 'approximate',
      bortle: 2,
    },
    setup: {
      optic: 'Canon 16-35mm f/2.8',
      camera: 'Canon EOS R6',
      mount: 'Tripod',
    },
    exposures: [{ filter: 'Yok', frames: 240, exposureSeconds: 30 }],
    palette: 'RGB',
    processing: { software: ['StarStaX', 'Lightroom'] },
    license: 'CC BY 4.0',
    likes: 176,
    comments: 12,
    year: 2025,
    city: 'Ağrı',
  },
  {
    slug: 'jupiter-buyuk-kirmizi-leke',
    title: 'Jüpiter ve Büyük Kırmızı Leke',
    target: { name: 'Jüpiter', catalog: 'Gezegen', constellation: '—' },
    type: 'gezegen',
    user: { username: 'planetary_tr', displayName: 'Selin Öztürk' },
    description:
      'Karşı konum haftasında derotasyon ile 6 videoluk birleştirme.',
    gradient:
      'radial-gradient(80% 80% at 50% 45%, #d9c4a0 0%, #b08355 35%, #6b4a2e 65%, #1a1208 100%)',
    capturedAt: '2026-01-04',
    location: { label: 'Bursa', visibility: 'region' },
    setup: {
      optic: 'SW 250P Dobson + EQ platform',
      camera: 'ZWO ASI664MC',
      mount: 'Dobson taban',
      reducer: '2.5× Barlow',
    },
    exposures: [{ filter: 'UV/IR-cut', frames: 60000, exposureSeconds: 0.008 }],
    palette: 'RGB',
    processing: { software: ['AutoStakkert!', 'WinJUPOS', 'RegiStax'] },
    license: 'CC BY-NC 4.0',
    likes: 203,
    comments: 27,
    year: 2026,
    city: 'Bursa',
  },
];

export const photos: AstroPhoto[] = ham.map((foto) => ({
  ...foto,
  solve: COZUM_YOK,
}));

export function getPhotoBySlug(slug: string): AstroPhoto | undefined {
  return photos.find((p) => p.slug === slug);
}
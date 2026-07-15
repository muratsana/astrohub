/** Astronomik hedef kataloğu — MVP tohum verisi (§8.2). Faz 1.4'te DB'ye taşınır. */

export type TargetKind =
  | 'galaksi'
  | 'emisyon-bulutsusu'
  | 'gezegenimsi-bulutsu'
  | 'kuresel-kume'
  | 'acik-kume'
  | 'karanlik-bulutsu'
  | 'sungerimsi-kalinti';

export const targetKindLabels: Record<TargetKind, string> = {
  galaksi: 'Galaksi',
  'emisyon-bulutsusu': 'Emisyon Bulutsusu',
  'gezegenimsi-bulutsu': 'Gezegenimsi Bulutsu',
  'kuresel-kume': 'Küresel Küme',
  'acik-kume': 'Açık Küme',
  'karanlik-bulutsu': 'Karanlık Bulutsu',
  'sungerimsi-kalinti': 'Süpernova Kalıntısı',
};

export interface CelestialTarget {
  slug: string;
  name: string;
  catalog: string; // birincil kod
  aliases: string[];
  kind: TargetKind;
  constellation: string;
  ra: string;
  dec: string;
  magnitude?: number;
  angularSize: string;
  bestMonths: string;
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  recommendedFocal: string;
  recommendedFilters: string;
  description: string;
  gradient: string;
}

export const targets: CelestialTarget[] = [
  {
    slug: 'm31-andromeda',
    name: 'Andromeda Galaksisi',
    catalog: 'M 31',
    aliases: ['NGC 224'],
    kind: 'galaksi',
    constellation: 'Andromeda',
    ra: '00s 42d 44sn',
    dec: "+41° 16'",
    magnitude: 3.4,
    angularSize: "178' × 63'",
    bestMonths: 'Eylül – Aralık',
    difficulty: 'Kolay',
    recommendedFocal: '135–600 mm',
    recommendedFilters: 'UV/IR-cut (geniş bant)',
    description:
      'Samanyolu\'na en yakın büyük galaksi; çıplak gözle görülebilen en uzak gökcisimlerinden. Geniş açısal boyutu nedeniyle kısa odaklarla bile etkileyici sonuç verir.',
    gradient:
      'radial-gradient(90% 70% at 55% 45%, #d6bca0 0%, #7c5c46 30%, #241a2e 65%, #050a12 100%)',
  },
  {
    slug: 'ic434-at-basi',
    name: 'At Başı Bulutsusu',
    catalog: 'IC 434',
    aliases: ['Barnard 33'],
    kind: 'karanlik-bulutsu',
    constellation: 'Orion',
    ra: '05s 40d 59sn',
    dec: "-02° 27'",
    angularSize: "8' × 6'",
    bestMonths: 'Kasım – Şubat',
    difficulty: 'Orta',
    recommendedFocal: '600–1200 mm',
    recommendedFilters: 'Ha (dar bant)',
    description:
      'Parlak IC 434 emisyon perdesinin önündeki ikonik karanlık bulutsu. Ha filtresiyle kontrast belirgin şekilde artar.',
    gradient:
      'radial-gradient(120% 100% at 45% 55%, #c026d3 0%, #9d174d 35%, #3b0a24 70%, #050a12 100%)',
  },
  {
    slug: 'ngc7000-kuzey-amerika',
    name: 'Kuzey Amerika Bulutsusu',
    catalog: 'NGC 7000',
    aliases: ['Caldwell 20'],
    kind: 'emisyon-bulutsusu',
    constellation: 'Kuğu',
    ra: '20s 59d 17sn',
    dec: "+44° 31'",
    magnitude: 4.0,
    angularSize: "120' × 100'",
    bestMonths: 'Haziran – Ekim',
    difficulty: 'Kolay',
    recommendedFocal: '135–400 mm',
    recommendedFilters: 'Ha/OIII dual-band veya SHO',
    description:
      'Kuğu takımyıldızındaki dev emisyon bölgesi; şehir içinden bile dual-band filtreyle çalışılabilir. Geniş alan setup\'larının klasiği.',
    gradient:
      'radial-gradient(120% 100% at 45% 55%, #be185d 0%, #7f1d1d 45%, #2a0a16 80%, #050a12 100%)',
  },
  {
    slug: 'ngc2237-rozet',
    name: 'Rozet Bulutsusu',
    catalog: 'NGC 2237',
    aliases: ['Caldwell 49'],
    kind: 'emisyon-bulutsusu',
    constellation: 'Tek Boynuz',
    ra: '06s 33d 45sn',
    dec: "+04° 59'",
    magnitude: 9.0,
    angularSize: "80' × 60'",
    bestMonths: 'Aralık – Mart',
    difficulty: 'Orta',
    recommendedFocal: '400–800 mm',
    recommendedFilters: 'SHO (dar bant)',
    description:
      'Merkezinde NGC 2244 açık kümesini barındıran halka biçimli emisyon bulutsusu; SHO paletinin en sevilen hedeflerinden.',
    gradient:
      'radial-gradient(100% 100% at 50% 50%, #ef4444 0%, #7f1d1d 45%, #2a0a16 80%, #050a12 100%)',
  },
  {
    slug: 'm42-orion',
    name: 'Orion Bulutsusu',
    catalog: 'M 42',
    aliases: ['NGC 1976'],
    kind: 'emisyon-bulutsusu',
    constellation: 'Orion',
    ra: '05s 35d 17sn',
    dec: "-05° 23'",
    magnitude: 4.0,
    angularSize: "85' × 60'",
    bestMonths: 'Kasım – Şubat',
    difficulty: 'Kolay',
    recommendedFocal: '400–1000 mm',
    recommendedFilters: 'UV/IR-cut; çekirdek için kısa pozlar (HDR)',
    description:
      'Gökyüzünün en parlak bulutsusu ve çoğu astrofotoğrafçının ilk deep-sky hedefi. Parlak çekirdeği için HDR tekniği önerilir.',
    gradient:
      'radial-gradient(110% 90% at 50% 45%, #f9a8d4 0%, #be185d 30%, #4c1d95 60%, #050a12 100%)',
  },
  {
    slug: 'm13-herkul',
    name: 'Herkül Küresel Kümesi',
    catalog: 'M 13',
    aliases: ['NGC 6205'],
    kind: 'kuresel-kume',
    constellation: 'Herkül',
    ra: '16s 41d 41sn',
    dec: "+36° 27'",
    magnitude: 5.8,
    angularSize: "20'",
    bestMonths: 'Nisan – Ağustos',
    difficulty: 'Kolay',
    recommendedFocal: '800–2000 mm',
    recommendedFilters: 'UV/IR-cut',
    description:
      'Kuzey yarımkürenin en görkemli küresel kümesi; yüz binlerce yıldızı çözümlemek için orta-uzun odak ister.',
    gradient:
      'radial-gradient(70% 70% at 50% 50%, #fef3c7 0%, #d9c4a0 25%, #6b5a3e 55%, #0f0d08 100%)',
  },
  {
    slug: 'ngc6302-kelebek',
    name: 'Kelebek Bulutsusu',
    catalog: 'NGC 6302',
    aliases: ['Caldwell 69'],
    kind: 'gezegenimsi-bulutsu',
    constellation: 'Akrep',
    ra: '17s 13d 44sn',
    dec: "-37° 06'",
    magnitude: 7.1,
    angularSize: "3'",
    bestMonths: 'Haziran – Ağustos',
    difficulty: 'Zor',
    recommendedFocal: '1200+ mm',
    recommendedFilters: 'Ha/OIII',
    description:
      'Türkiye\'den güney ufkuna yakın, alçak yükseklikte kalan zorlu bir gezegenimsi bulutsu; kısa gözlem penceresi ve iyi güney ufku gerektirir.',
    gradient:
      'radial-gradient(120% 90% at 50% 40%, #2b6cb0 0%, #6b46c1 35%, #1a1035 70%, #050a12 100%)',
  },
  {
    slug: 'ic1396-fil-hortumu',
    name: 'Fil Hortumu Bulutsusu',
    catalog: 'IC 1396',
    aliases: [],
    kind: 'emisyon-bulutsusu',
    constellation: 'Kral',
    ra: '21s 39d 06sn',
    dec: "+57° 30'",
    angularSize: "170' × 140'",
    bestMonths: 'Temmuz – Kasım',
    difficulty: 'Orta',
    recommendedFocal: '200–600 mm',
    recommendedFilters: 'SHO (dar bant)',
    description:
      'Kral takımyıldızındaki dev emisyon kompleksi; içindeki "fil hortumu" globülü uzun odaklarda ayrı bir hedef olarak çalışılır.',
    gradient:
      'radial-gradient(120% 100% at 45% 50%, #b91c1c 0%, #7c2d12 40%, #1f1408 75%, #050a12 100%)',
  },
];

export function getTargetBySlug(slug: string): CelestialTarget | undefined {
  return targets.find((t) => t.slug === slug);
}

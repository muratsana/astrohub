import { byNumber, byText, type ExplorerSpec } from '@/features/explorer/query';
import { siteTypeLabels, type ObservingSite } from './data';

/**
 * GÖZLEM NOKTALARININ DATA EXPLORER TANIMI (Faz 4).
 *
 * Bu sayfada HİÇ filtre yoktu — ne arama, ne sıralama. Katalog büyüdükçe
 * kullanıcı aradığı sahayı gözle taramak zorundaydı.
 *
 * BORTLE SAYI DEĞİL FACET OLARAK: sınıf 1–9 arası ayrık bir ölçek ve
 * kullanıcı "Bortle 2 veya 3" diye düşünüyor, "Bortle ≤ 3" diye değil.
 * Sayısal aralık süzgeci burada seçim listesinden daha kullanışlı olmazdı.
 */
export const sitesSpec: ExplorerSpec<ObservingSite> = {
  searchFields: (s) => [
    s.name,
    s.region,
    s.roadAccess,
    siteTypeLabels[s.siteType],
  ],

  facets: [
    {
      param: 'bortle',
      label: 'Bortle',
      valueOf: (s) => String(s.bortle),
      labelOf: (v) => `sınıf ${v}`,
    },
    {
      param: 'tur',
      label: 'Tür',
      valueOf: (s) => s.siteType,
      labelOf: (v) => siteTypeLabels[v as keyof typeof siteTypeLabels] ?? v,
    },
    { param: 'bolge', label: 'Bölge', valueOf: (s) => s.region },
    { param: 'yol', label: 'Yol', valueOf: (s) => s.roadAccess },
    {
      param: 'olanak',
      label: 'Olanak',
      /* Boolean alanlar tek bir çoklu-seçim facet'inde toplanıyor:
         kullanıcı "çadır VEYA karavan" diye düşünüyor, iki ayrı anahtar
         diye değil. */
      valueOf: (s) =>
        [
          s.facilities.tentArea ? 'cadir' : null,
          s.facilities.caravanOk ? 'karavan' : null,
        ].filter((v): v is string => v !== null),
      labelOf: (v) => (v === 'cadir' ? 'Çadır alanı' : 'Karavan uygun'),
    },
  ],

  sorts: [
    {
      value: 'karanlik',
      label: 'En karanlık',
      /* Bortle KÜÇÜKSE daha karanlık — ölçek ters. Varsayılan sıralama bu
         çünkü sayfaya gelen soru "en karanlık yer neresi". */
      compare: byNumber((s) => s.bortle, 'asc'),
    },
    {
      value: 'puan',
      label: 'En yüksek puan',
      compare: byNumber((s) => s.rating),
    },
    {
      value: 'rakim',
      label: 'En yüksek rakım',
      compare: byNumber((s) => s.altitude),
    },
    {
      value: 'bortle-yuksek',
      label: 'Bortle yüksekten düşüğe',
      compare: byNumber((s) => s.bortle),
    },
    { value: 'ad', label: 'Ad (A–Z)', compare: byText((s) => s.name) },
  ],

  defaultSort: 'karanlik',
};

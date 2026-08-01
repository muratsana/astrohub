import { byText, type ExplorerSpec } from '@/features/explorer/query';
import { targetKindLabels, type CelestialTarget } from './data';

/**
 * HEDEF KATALOĞUNUN DATA EXPLORER TANIMI (Faz 4).
 *
 * BU SAYFA EN SON TAŞINDI ve sebebi vardı: kendi araması
 * (`searchTargets`) genel motorun yapmadığı iki şey yapıyordu —
 * boşlukları yok sayıyordu ("m 31" ≡ "m31") ve sonucu ALAKAYA göre
 * sıralıyordu (tam eşleşme > baştan eşleşme > içinde geçme).
 *
 * Naif bir taşıma ikisini de sessizce kaybettirirdi: "m31" yazan
 * kullanıcı, alfabetik olarak önce gelen başka bir kaydı ilk sırada
 * görürdü. İkisi de ortak motora eklendi ve testlendi; ancak ondan sonra
 * bu tanım yazıldı.
 *
 * `relevance: true` yalnızca arama VARKEN devreye giriyor; terim boşken
 * kullanıcının seçtiği sıralama geçerli.
 */
export const targetsSpec: ExplorerSpec<CelestialTarget> = {
  /* Takma adlar arama alanında: M 31, NGC 224 ve Andromeda aynı hedef. */
  searchFields: (t) => [t.catalog, t.name, ...t.aliases, t.constellation],

  facets: [
    {
      param: 'tur',
      label: 'Tür',
      valueOf: (t) => t.kind,
      labelOf: (v) => targetKindLabels[v as keyof typeof targetKindLabels] ?? v,
    },
    { param: 'zorluk', label: 'Zorluk', valueOf: (t) => t.difficulty },
    { param: 'takimyildiz', label: 'Takımyıldız', valueOf: (t) => t.constellation },
  ],

  sorts: [
    { value: 'katalog', label: 'Katalog kodu', compare: byText((t) => t.catalog) },
    { value: 'ad', label: 'Ad (A–Z)', compare: byText((t) => t.name) },
    {
      value: 'takimyildiz',
      label: 'Takımyıldız',
      compare: byText((t) => t.constellation),
    },
  ],

  defaultSort: 'katalog',
  relevance: true,
};

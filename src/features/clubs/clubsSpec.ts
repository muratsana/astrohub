import { byText, type ExplorerSpec } from '@/features/explorer/query';
import { clubKindLabels, type AstronomyClub } from './data';

/**
 * TOPLULUKLARIN DATA EXPLORER TANIMI (Faz 4).
 *
 * İki filtre ürün açısından öne çıkıyor: **halka açık etkinlik** ve
 * **ortak ekipman**. Bunlar "bu topluluğa katılabilir miyim, teleskobum
 * yoksa ne olacak" sorusunun cevabı — yeni başlayan için türden çok daha
 * belirleyici. İkisi de birer facet.
 *
 * EVET/HAYIR FİLTRESİ FACET OLARAK: `valueOf` yalnızca koşul sağlandığında
 * bir değer üretiyor, sağlanmadığında `null`. Böylece "açık" seçimi o
 * kaydı geçirir, kapalı seçim hiçbir şey süzmez — üç durumlu bir onay
 * kutusu yazmaya gerek kalmıyor.
 */
export const clubsSpec: ExplorerSpec<AstronomyClub> = {
  searchFields: (c) => [c.name, c.city, c.summary],

  facets: [
    {
      param: 'tur',
      label: 'Tür',
      valueOf: (c) => c.kind,
      labelOf: (v) => clubKindLabels[v as keyof typeof clubKindLabels] ?? v,
    },
    {
      param: 'halka-acik',
      label: 'Halka açık etkinlik',
      valueOf: (c) => (c.publicEvents ? 'evet' : null),
      labelOf: () => 'var',
    },
    {
      param: 'ortak-ekipman',
      label: 'Ortak ekipman',
      valueOf: (c) => (c.sharedEquipment ? 'evet' : null),
      labelOf: () => 'var',
    },
    { param: 'sehir', label: 'Şehir', valueOf: (c) => c.city },
  ],

  sorts: [
    { value: 'ad', label: 'Ad (A–Z)', compare: byText((c) => c.name) },
    { value: 'sehir', label: 'Şehir', compare: byText((c) => c.city) },
    {
      value: 'uye',
      label: 'En çok üye',
      /* Üye sayısı olmayan kayıt sona düşüyor; 0 saymak "üyesi yok"
         demek olurdu, oysa bilinen tek şey sayının bildirilmediği. */
      compare: (a, b) =>
        (b.memberCount ?? -Infinity) - (a.memberCount ?? -Infinity),
    },
  ],

  defaultSort: 'ad',
};

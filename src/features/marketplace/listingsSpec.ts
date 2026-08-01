import { byNumber, byText, type ExplorerSpec } from '@/features/explorer/query';
import { equipmentCategoryLabels } from '@/features/equipment/data';
import type { Listing } from './data';

/**
 * PAZARYERİNİN DATA EXPLORER TANIMI (Faz 4).
 *
 * Sayfanın kendi sıralaması üç seçenekliydi (yeni / ucuz / pahalı) ve
 * arama ASCII katlamıyordu — "sanliurfa" yazan kullanıcı "Şanlıurfa"daki
 * ilanı bulamıyordu.
 *
 * ŞEHİR FACET OLARAK EKLENDİ: ikinci el ekipmanda elden teslim yaygın,
 * yani "hangi şehirde" fiyat kadar belirleyici bir soru. Sayfada bu
 * filtre hiç yoktu.
 */
export const listingsSpec: ExplorerSpec<Listing> = {
  searchFields: (l) => [l.title, l.city, l.seller.username],

  facets: [
    {
      param: 'kategori',
      label: 'Kategori',
      valueOf: (l) => l.category,
      labelOf: (v) =>
        equipmentCategoryLabels[v as keyof typeof equipmentCategoryLabels] ?? v,
    },
    { param: 'sehir', label: 'Şehir', valueOf: (l) => l.city },
    {
      param: 'faturali',
      label: 'Faturalı',
      valueOf: (l) => (l.hasInvoice ? 'evet' : null),
      labelOf: () => 'evet',
    },
    { param: 'durum', label: 'Durum', valueOf: (l) => l.condition },
  ],

  sorts: [
    {
      value: 'yeni',
      label: 'En yeni',
      compare: (a, b) => b.postedAt.localeCompare(a.postedAt),
    },
    { value: 'ucuz', label: 'En düşük fiyat', compare: byNumber((l) => l.price, 'asc') },
    { value: 'pahali', label: 'En yüksek fiyat', compare: byNumber((l) => l.price) },
    {
      value: 'satici',
      label: 'Satıcı puanı',
      compare: byNumber((l) => l.seller.rating),
    },
    { value: 'baslik', label: 'Başlık (A–Z)', compare: byText((l) => l.title) },
  ],

  defaultSort: 'yeni',
};

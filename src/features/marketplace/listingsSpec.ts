import { byNumber, byText, type ExplorerSpec } from '@/features/explorer/query';
import { equipmentCategoryLabels } from '@/features/equipment/data';
import { formatListingPrice, type Listing } from './data';

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
    /*
     * İLÇE — yalnızca VERİDE OLAN ilçeler listeleniyor.
     *
     * Şehir süzgeci 81 ilin tamamını gösteriyor çünkü liste sabit ve
     * kullanıcı kendi ilini arıyor. İlçe farklı: 974 seçenek arasından
     * ilan olmayan birini seçmek boş bir liste demek. `valueOf` ilçesi
     * olmayan kayıtta `null` döndüğü için sayım haritası kendiliğinden
     * yalnızca gerçek ilçeleri taşıyor ve hiç ilçe yoksa süzgeç
     * çizilmiyor.
     */
    { param: 'ilce', label: 'İlçe', valueOf: (l) => l.district ?? null },
    {
      param: 'faturali',
      label: 'Faturalı',
      valueOf: (l) => (l.hasInvoice ? 'evet' : null),
      labelOf: () => 'evet',
    },
    {
      param: 'teslim',
      label: 'Teslim',
      valueOf: (l) => (l.shippingOk ? 'kargo' : 'elden'),
      labelOf: (v) => (v === 'kargo' ? 'Kargo var' : 'Elden teslim'),
    },
    { param: 'durum', label: 'Durum', valueOf: (l) => l.condition },
  ],

  /*
   * FİYAT ARALIĞI FACET DEĞİL (§7.1 "sayısal aralık").
   *
   * Facet olarak kurulsaydı her ilan kendi fiyatının kutucuğunu açardı:
   * "48.500 ₺ (1)", "52.000 ₺ (1)"… İkinci elde iki ilanın aynı fiyatta
   * olması nadir, yani liste kayıt sayısı kadar uzun ve hiçbiri işe
   * yaramaz olurdu. Alıcı zaten değeri değil BÜTÇESİNİ biliyor.
   */
  ranges: [
    {
      param: 'fiyat',
      label: 'Fiyat',
      valueOf: (l) => l.price,
      step: 500,
      unit: '',
      format: (n) => formatListingPrice(n),
    },
  ],

  sorts: [
    {
      value: 'yeni',
      label: 'En yeni',
      compare: (a, b) => b.postedAt.localeCompare(a.postedAt),
    },
    {
      value: 'ucuz',
      label: 'En düşük fiyat',
      compare: byNumber((l) => l.price, 'asc'),
    },
    {
      value: 'pahali',
      label: 'En yüksek fiyat',
      compare: byNumber((l) => l.price),
    },
    {
      value: 'satici',
      label: 'Satıcı puanı',
      compare: byNumber((l) => l.seller.rating),
    },
    { value: 'baslik', label: 'Başlık (A–Z)', compare: byText((l) => l.title) },
  ],

  defaultSort: 'yeni',
};

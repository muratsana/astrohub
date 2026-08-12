import type { EquipmentCategory } from '../equipment/data';
import {
  contentStatusLabels,
  saleStateLabels,
  type ContentStatus,
  type SaleState,
} from '@/domain/content/status';

/** İlan tohum verisi (§7.13). Gerçek ilan akışı + moderasyon Faz 1.8'de. */

export type ListingCondition = 'Sıfır gibi' | 'Çok iyi' | 'İyi' | 'Yıpranmış';

/**
 * İlan durumu artık ORTAK KÜMENİN kendisi (FAZ 3).
 *
 * Eskiden bu tip beş değerlik kendi birleşimiydi: `draft | active |
 * reserved | sold | archived`. İkisi yayın durumu değildi — `reserved`
 * ve `sold` satış durumuydu ve ilan ikisinde de YAYINDA kalıyordu.
 * İkisini tek kolonda tutmak, "satıldı" demek için ilanı yayından
 * kaldırmak gibi görünen bir modele yol açıyordu.
 *
 * Ayrıldılar: yayın durumu `status` (ortak küme), satış durumu
 * `saleState`. Tip adı geriye dönük uyum için duruyor.
 */
export type ListingStatus = ContentStatus;

/** Satıcıya gösterilen durum etiketleri. */
export const listingStatusLabels = contentStatusLabels;

export type { SaleState };
export { saleStateLabels };

export interface Listing {
  /**
   * Veritabanı kimliği. Tohum kayıtlarda YOK ve bu bilinçli: ilan
   * fotoğrafları gerçek bir satıra bağlanıyor (0038). Tohum bir ilana
   * fotoğraf eklemeye çalışmak yabancı anahtar hatası verirdi; arayüz
   * `id` yokken yükleme denetimini hiç göstermiyor.
   */
  id?: string;
  /**
   * Satıcının kimliği — sahiplik kararı bununla veriliyor.
   *
   * `seller.username` bir GÖRÜNTÜ adı ve profil tablosundan geliyor;
   * adını değiştiren ya da profili henüz oluşmamış birinde sessizce
   * yanlış cevap verirdi.
   */
  sellerId?: string;
  slug: string;
  title: string;
  category: EquipmentCategory;
  price: number; // TL
  city: string;
  /**
   * İlçe adı — `districts` tablosundaki kanonik yazım.
   *
   * İSTEĞE BAĞLI ve öyle kalıyor: mevcut kayıtların hiçbirinde yok ve
   * zorunlu yapmak onları düzenlenemez hâle getirirdi. Süzgeçte
   * yalnızca dolu olanlar görünüyor — "belirtilmemiş" diye bir seçenek
   * yok, çünkü o bir yer adı değil, verinin yokluğu.
   */
  district?: string;
  condition: ListingCondition;
  hasInvoice: boolean;
  shippingOk: boolean;
  seller: {
    username: string;
    verified: boolean;
    rating: number;
    /** Satıcının platformdaki tamamlanmış satış sayısı. */
    sales?: number;
    memberSince?: string;
  };
  postedAt: string;
  gradient: string;
  /** İlan metni. */
  description?: string;
  /** Kutuda/pakette ne var. */
  includes?: string[];
  /** Ekipman veritabanındaki karşılığı — künye ve alternatifler oradan gelir. */
  equipmentSlug?: string;
  /** Kapak/ilk ilan fotoğrafının gösterim adresi. */
  imageUrl?: string;
  /** Pazarlık payı olup olmadığı; ilanda açıkça yazmak mesaj trafiğini azaltır. */
  negotiable?: boolean;
  /**
   * İlan durumu — yalnızca satıcının kendi listesinde anlamlı.
   *
   * Herkese açık listede taşınmıyor: orada zaten yalnızca yayındaki
   * ilanlar var, her karta "Yayında" rozeti basmak gürültü olurdu.
   * Tohum kayıtlarda tanımsız.
   */
  status?: ListingStatus;
  /** Satış durumu — yayın durumundan ayrı eksen (FAZ 3). */
  saleState?: SaleState;
}

export const listings: Listing[] = [
  {
    slug: 'eq6r-pro-temiz',
    title: 'Sky-Watcher EQ6-R Pro — kutulu, az kullanılmış',
    category: 'montur',
    price: 42000,
    city: 'İstanbul',
    condition: 'Çok iyi',
    hasInvoice: true,
    shippingOk: true,
    seller: {
      username: 'mert_astro',
      verified: true,
      rating: 4.9,
      sales: 4,
      memberSince: '2023-04',
    },
    postedAt: '2026-07-10',
    gradient: 'linear-gradient(135deg, #1e293b, #334155)',
    description:
      'İki yıl kullanıldı, hep kapalı alanda saklandı. Kutusu, köpüğü, karşı ağırlıkları ve orijinal kabloları tam. Belt-drive modifikasyonu yapılmadı; fabrika hâlinde. PHD2 ile ölçtüğüm periyodik hata ±8 yay saniyesi civarında, guiding tarafında sorun yaşamadım.',
    includes: [
      'Orijinal kutu ve köpük',
      '2× 5 kg karşı ağırlık',
      'Tripod ve uzatma kolonu',
      'SynScan el kumandası',
      'Güç adaptörü',
    ],
    equipmentSlug: 'sw-eq6r-pro',
    negotiable: true,
  },
  {
    slug: 'asi533mc-pro',
    title: 'ZWO ASI533MC Pro + tilt plate',
    category: 'astro-kamera',
    price: 28500,
    city: 'Ankara',
    condition: 'Sıfır gibi',
    hasInvoice: true,
    shippingOk: true,
    seller: {
      username: 'deepsky_tr',
      verified: true,
      rating: 5.0,
      sales: 11,
      memberSince: '2021-09',
    },
    postedAt: '2026-07-12',
    gradient: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
    description:
      'Sıfır ayarında, toplam 40 saat çekimde kullanıldı. Sensörde toz yok, soğutma −35°C’ye sorunsuz iniyor. Tilt plate ve 21 mm ara halka dâhil. Faturası mevcut, garantisi Mart 2027’ye kadar sürüyor.',
    includes: [
      'ZWO tilt plate',
      '21 mm ara halka',
      'USB 3.0 kablosu',
      '12V güç kablosu',
      'Fatura ve garanti belgesi',
    ],
    equipmentSlug: 'zwo-asi533mc',
    negotiable: false,
  },
  {
    slug: 'redcat51-ilk-sahibinden',
    title: 'William Optics RedCat 51 — ilk sahibinden',
    category: 'optik-tup',
    price: 24000,
    city: 'İzmir',
    condition: 'Çok iyi',
    hasInvoice: false,
    shippingOk: false,
    seller: {
      username: 'polaris34',
      verified: false,
      rating: 4.6,
      sales: 1,
      memberSince: '2024-02',
    },
    postedAt: '2026-07-08',
    gradient: 'linear-gradient(135deg, #7c2d12, #b45309)',
    description:
      'İlk sahibiyim, 2024 başında aldım. Optikte çizik ya da leke yok; yalnızca taşıma çantasının fermuarı yıpranmış. Bahtinov maskesi ve orijinal çanta ile birlikte veriyorum. Elden teslim tercih ederim.',
    includes: [
      'Orijinal taşıma çantası',
      'Bahtinov maskesi',
      'Vixen tipi kırlangıç kuyruğu',
    ],
    equipmentSlug: 'wo-redcat-51',
    negotiable: true,
  },
  {
    slug: 'lextreme-2inch',
    title: 'Optolong L-eXtreme 2" — kutusunda',
    category: 'filtre',
    price: 7500,
    city: 'Bursa',
    condition: 'İyi',
    hasInvoice: false,
    shippingOk: true,
    seller: {
      username: 'planetary_tr',
      verified: true,
      rating: 4.8,
      sales: 6,
      memberSince: '2022-11',
    },
    postedAt: '2026-07-13',
    gradient: 'linear-gradient(135deg, #14532d, #166534)',
    description:
      'Dual-band filtre, kutusunda ve kılıfında. Renkli kamerayla Ha+OIII hedeflerinde kullandım; cam yüzeyinde iz yok. Şehir içinde bulutsu çekiyorsanız gökyüzü fonunu belirgin biçimde bastırıyor.',
    includes: ['Orijinal plastik kutu', 'Mikrofiber bez'],
    equipmentSlug: 'optolong-lextreme',
    negotiable: false,
  },
];

export function getListingBySlug(slug: string): Listing | undefined {
  return listings.find((l) => l.slug === slug);
}

/**
 * Aynı kategorideki diğer ilanlar.
 *
 * Fiyat karşılaştırması, ikinci elde en çok sorulan soru ("bu fiyat normal
 * mi") için gereken bağlamı verir. İlan sayısı azken bu liste kısa kalır;
 * o zaman da gerçeği söylemiş oluruz — piyasada başka örnek yok.
 */
const RELATED_STOPWORDS = new Set([
  'bir',
  've',
  'ile',
  'icin',
  'için',
  'ilk',
  'sahibinden',
  'satilik',
  'satılık',
  'temiz',
  'komple',
  'set',
]);

function listingTokens(listing: Listing): Set<string> {
  return new Set(
    `${listing.title} ${listing.description ?? ''}`
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length > 2 && !RELATED_STOPWORDS.has(token))
  );
}

function relatedScore(source: Listing, candidate: Listing): number {
  if (
    source.equipmentSlug &&
    candidate.equipmentSlug &&
    source.equipmentSlug === candidate.equipmentSlug
  ) {
    return 100;
  }

  if (source.category !== candidate.category) return 0;

  const sourceTokens = listingTokens(source);
  const candidateTokens = listingTokens(candidate);
  let overlap = 0;
  for (const token of candidateTokens) {
    if (sourceTokens.has(token)) overlap += 1;
  }

  return overlap;
}

export function relatedListings(listing: Listing, limit = 4): Listing[] {
  return listings
    .filter((l) => l.slug !== listing.slug)
    .map((l) => ({ listing: l, score: relatedScore(listing, l) }))
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score || b.listing.price - a.listing.price)
    .map(({ listing: item }) => item)
    .slice(0, limit);
}

/** Kategorideki ilanların fiyat aralığı — tek ilan varsa null. */
export function priceRange(
  category: Listing['category']
): { min: number; max: number; median: number } | null {
  const prices = listings
    .filter((l) => l.category === category)
    .map((l) => l.price)
    .sort((a, b) => a - b);

  if (prices.length < 2) return null;

  const mid = Math.floor(prices.length / 2);
  return {
    min: prices[0],
    max: prices[prices.length - 1],
    median:
      prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid],
  };
}

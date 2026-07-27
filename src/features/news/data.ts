/**
 * Haber modülü tohum verisi.
 *
 * Haberler admin tarafından girilir ve kaynak şeffaflığı taşır: her kayıtta
 * kaynağın adı ve yayın tarihi bulunur (etkinlik modülündeki §8.4 ilkesinin
 * aynısı). CMS/DB bağlantısı Faz 1.8'de.
 */

export type NewsCategory =
  | 'gokyuzu-olayi'
  | 'uzay-misyonu'
  | 'kesif'
  | 'turkiye'
  | 'ekipman'
  | 'duyuru';

export const newsCategoryLabels: Record<NewsCategory, string> = {
  'gokyuzu-olayi': 'Gökyüzü Olayı',
  'uzay-misyonu': 'Uzay Misyonu',
  kesif: 'Keşif',
  turkiye: 'Türkiye',
  ekipman: 'Ekipman',
  duyuru: 'Duyuru',
};

export interface NewsItem {
  slug: string;
  title: string;
  category: NewsCategory;
  /** ISO tarih — listede tersten sıralanır. */
  publishedAt: string;
  summary: string;
  body: string[];
  /** Kaynak şeffaflığı: haberin dayandığı yayın. */
  source: { name: string; url?: string };
  /** Öne çıkan haber — ana sayfada ilk sırada gösterilir. */
  featured?: boolean;
  /** Yıldız alanı tonu (gerçek görsel gelene kadar). */
  tint: string;
}

export const news: NewsItem[] = [
  {
    slug: 'perseid-2026-zirve',
    title: 'Perseid meteor yağmuru 12 Ağustos gecesi zirve yapıyor',
    category: 'gokyuzu-olayi',
    publishedAt: '2026-07-24',
    featured: true,
    summary:
      'Yılın en verimli meteor yağmuru bu yıl küçülen ay evresiyle çakışıyor; karanlık gökyüzünde saatte 100 üzerinde meteor bekleniyor.',
    body: [
      'Perseid meteor yağmuru, Dünya’nın 109P/Swift-Tuttle kuyruklu yıldızının bıraktığı toz izinden geçmesiyle her yıl temmuz sonundan ağustos ortasına dek gözlenir. 2026 zirvesi 12 Ağustos gecesini 13 Ağustos’a bağlayan saatlere denk geliyor.',
      'Bu yıl zirve gecesi ay evresi gözlemi zorlaştırmıyor: ay gece yarısından önce batıyor ve en verimli saatler tamamen karanlık geçiyor. Şehir ışığından uzak, Bortle 4 ve altı bir noktada saatte 80–110 meteor görülebilir.',
      'Gözlem için teleskop gerekmez; çıplak gözle, sırtüstü uzanarak ve gökyüzünün mümkün olduğunca geniş bir bölümünü görecek şekilde bakmak en verimli yöntemdir. Gözün karanlığa uyum sağlaması 20–30 dakika sürer; bu süre boyunca beyaz ışıktan kaçınmak gerekir.',
    ],
    source: { name: 'IMO — International Meteor Organization' },
    tint: '232,150,110',
  },
  {
    slug: 'jwst-erken-galaksiler',
    title: 'JWST, beklenenden çok daha olgun erken evren galaksileri buldu',
    category: 'kesif',
    publishedAt: '2026-07-21',
    summary:
      'James Webb verileri, Büyük Patlama’dan 300 milyon yıl sonrasına ait galaksilerin mevcut oluşum modellerinin öngördüğünden daha kütleli olduğunu gösteriyor.',
    body: [
      'James Webb Uzay Teleskobu’nun derin alan gözlemleri, kırmızıya kayması 14’ün üzerinde olan galaksi adaylarını ortaya çıkardı. Bu, ışığın Büyük Patlama’dan yalnızca 300 milyon yıl sonra yola çıktığı anlamına geliyor.',
      'Bulgular, erken evrende yıldız oluşumunun mevcut modellerin öngördüğünden daha hızlı ilerlediğine işaret ediyor. Alternatif açıklamalar arasında ilk kuşak yıldızların farklı kütle dağılımına sahip olması ve süper kütleli kara delik tohumlarının katkısı bulunuyor.',
    ],
    source: { name: 'NASA / STScI' },
    tint: '150,185,235',
  },
  {
    slug: 'turkiye-karanlik-gokyuzu-parki',
    title: 'Türkiye’nin ikinci karanlık gökyüzü parkı için başvuru süreci başladı',
    category: 'turkiye',
    publishedAt: '2026-07-18',
    featured: true,
    summary:
      'Aladağlar bölgesindeki bir alan için uluslararası karanlık gökyüzü sertifikasyonu başvurusu yapıldı; ölçümler SQM 21.8 seviyesini gösteriyor.',
    body: [
      'Yerel yönetim ve astronomi dernekleri iş birliğiyle yürütülen çalışmada, bölgede bir yıl boyunca yapılan SQM ölçümlerinin ortalaması 21.8 mag/arcsec² olarak kaydedildi — bu Bortle 2 sınıfına karşılık geliyor.',
      'Sertifikasyon süreci, bölgedeki aydınlatma altyapısının karanlık gökyüzü dostu armatürlerle değiştirilmesini ve uzun vadeli bir aydınlatma yönetim planını şart koşuyor.',
      'Astrohub gözlem noktası kayıtlarında bölgeye ait ölçümler topluluk katkısıyla güncelleniyor.',
    ],
    source: { name: 'Astrohub Editör' },
    tint: '120,200,180',
  },
  {
    slug: 'yeni-cmos-sensor',
    title: 'Yeni nesil arka aydınlatmalı CMOS sensörler astro kameralara giriyor',
    category: 'ekipman',
    publishedAt: '2026-07-15',
    summary:
      'Düşük okuma gürültüsü ve yüksek kuantum verimiyle öne çıkan yeni sensör ailesi, kısa alt pozlarla çalışmayı pratik hâle getiriyor.',
    body: [
      'Yeni sensör kuşağı, 1.0 elektron altına inen okuma gürültüsü değerleriyle kısa alt poz stratejilerini daha uygulanabilir kılıyor. Bu, montür takip hatasının etkisini azaltarak orta segment kurulumlarda da keskin sonuç almayı kolaylaştırıyor.',
      'Öte yandan kısa alt poz, dosya sayısını ve işleme yükünü artırıyor; kalibrasyon kütüphanesi yönetimi daha kritik hâle geliyor.',
    ],
    source: { name: 'Üretici teknik bülteni' },
    tint: '200,180,140',
  },
  {
    slug: 'ay-tutulmasi-eylul',
    title: 'Eylül ayındaki tam ay tutulması Türkiye’den baştan sona izlenebilecek',
    category: 'gokyuzu-olayi',
    publishedAt: '2026-07-12',
    summary:
      'Tutulmanın bütünlük evresi 82 dakika sürecek ve ülkenin tamamından gözlenebilecek.',
    body: [
      'Ay, gölge konisinin merkezine yakın geçeceği için bütünlük evresi uzun sürecek. Tutulmanın tüm evreleri Türkiye’den ufuk üzerinde gerçekleşiyor.',
      'Tam ay tutulması çıplak gözle güvenle izlenebilir; herhangi bir filtre gerekmez. Fotoğraf için geniş dinamik aralık nedeniyle pozlama köşeleme (bracketing) önerilir.',
    ],
    source: { name: 'NASA Eclipse Web Site' },
    tint: '220,190,150',
  },
  {
    slug: 'astrohub-arsiv-acildi',
    title: 'Astrohub kayıt arşivi topluluk katkısına açıldı',
    category: 'duyuru',
    publishedAt: '2026-07-08',
    summary:
      'Artık her astrofotoğraf; hedef, optik, filtre, alt poz ve gökyüzü koşullarıyla birlikte arşivlenebiliyor.',
    body: [
      'Astrohub galerisi bir görsel akışı değil, bir çekim günlüğü olarak tasarlandı. Yüklenen her kare teknik künyesiyle saklanıyor; böylece sonucu üreten koşullar başkaları tarafından tekrar edilebiliyor.',
      'Konum gizliliği kullanıcının kararında: GPS verisi varsayılan olarak gizli, hassas noktalarda koordinat otomatik yuvarlanıyor.',
    ],
    source: { name: 'Astrohub Editör' },
    tint: '232,157,46',
  },
];

export function getNewsBySlug(slug: string): NewsItem | undefined {
  return news.find((n) => n.slug === slug);
}

/** Yayın tarihine göre yeniden eskiye sıralar. */
export function sortedNews(): NewsItem[] {
  return [...news].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

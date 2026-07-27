/**
 * Yazılar modülü — rehberler, eğitim yazıları ve işleme dersleri.
 *
 * Önceki "Eğitim Merkezi" modülünün yerini alır ve kapsamını genişletir:
 * yalnızca ders değil, teknik inceleme ve saha notu da barındırır.
 * CMS/DB bağlantısı Faz 1.8'de.
 */

export type ArticleLevel = 'Başlangıç' | 'Orta' | 'İleri';

export type ArticleCategory =
  | 'rehber'
  | 'isleme'
  | 'teknik'
  | 'gozlem'
  | 'inceleme';

export const articleCategoryLabels: Record<ArticleCategory, string> = {
  rehber: 'Başlangıç Rehberi',
  isleme: 'İşleme',
  teknik: 'Teknik',
  gozlem: 'Gözlem',
  inceleme: 'İnceleme',
};

export interface Article {
  slug: string;
  title: string;
  category: ArticleCategory;
  level: ArticleLevel;
  /** "15 dk okuma" gibi okuma süresi. */
  duration: string;
  publishedAt: string;
  author: string;
  summary: string;
  body: string[];
  tint: string;
}

export const articles: Article[] = [
  {
    slug: 'ilk-setup',
    title: "İlk Astrofotoğraf Setup'ını Kurmak",
    category: 'rehber',
    level: 'Başlangıç',
    duration: '15 dk okuma',
    publishedAt: '2026-07-20',
    author: 'Gökhan Uzun',
    summary:
      'Montür-öncelikli yaklaşım: bütçenin en büyük payı neden montüre gider; ilk teleskop ve kamera seçiminde yapılan tipik hatalar.',
    body: [
      'Astrofotoğrafçılıkta en sık yapılan hata, bütçenin büyük kısmını teleskoba ayırmaktır. Oysa uzun pozlarda görüntüyü belirleyen şey teleskop değil, montürün takip hassasiyetidir. Kötü bir montüre takılan iyi bir teleskop, iyi bir montüre takılan sıradan bir teleskoptan daha kötü sonuç verir.',
      'Pratik kural: toplam bütçenin yaklaşık yarısını montüre ayırın. Montürün taşıyabileceği yük, üretici beyanının yaklaşık %60’ı kadar kabul edilmelidir — fotoğraf yükü, görsel gözlem yükünden farklıdır.',
      'İlk optik için kısa odaklı bir apokromatik refraktör, uzun odaklı bir yansıtmalıdan çok daha affedicidir: takip hataları daha az belli olur, görüş alanı geniştir ve kadraj yapmak kolaydır.',
    ],
    tint: '232,157,46',
  },
  {
    slug: 'kalibrasyon',
    title: 'Dark, Flat ve Bias: Kalibrasyon Temelleri',
    category: 'isleme',
    level: 'Orta',
    duration: '20 dk okuma',
    publishedAt: '2026-07-16',
    author: 'Deniz Arslan',
    summary:
      'Kalibrasyon karelerinin her biri hangi kusuru düzeltir, kaç kare gerekir ve master kütüphanesi nasıl yönetilir.',
    body: [
      'Kalibrasyon kareleri sensörün ve optik yolun sistematik kusurlarını ölçer. Bias, okuma elektroniğinin sabit ofsetini; dark, sıcaklığa bağlı termal akımı; flat ise vinyetleme ve toz gölgelerini kaydeder.',
      'Kare sayısı gürültüyü karekök oranında azaltır: 16 dark 4 kat, 64 dark 8 kat iyileşme sağlar. Pratikte 20–30 dark ve 20–30 flat çoğu kurulum için yeterlidir.',
      'Soğutmalı kameralarda master dark kütüphanesi sıcaklık ve poz süresi bazında saklanabilir; flat ise optik yol her değiştiğinde (odak, filtre, kamera dönüşü) yenilenmelidir.',
    ],
    tint: '150,185,235',
  },
  {
    slug: 'sho-palet',
    title: 'SHO Paleti ile Narrowband İşleme',
    category: 'isleme',
    level: 'İleri',
    duration: '35 dk uygulama',
    publishedAt: '2026-07-11',
    author: 'Selin Kaya',
    summary:
      'Hubble paletinin mantığı; kanal atama, yıldız rengi düzeltme ve selektif doygunlukla dramatik ama doğal sonuçlar.',
    body: [
      'SHO paleti, kükürt (SII), hidrojen (Hα) ve oksijen (OIII) emisyon çizgilerini sırasıyla kırmızı, yeşil ve mavi kanallara atar. Sonuç gerçek renk değildir; farklı iyonların uzaysal dağılımını görünür kılan bir haritadır.',
      'Ham SHO atamasında görüntü baskın biçimde yeşil çıkar çünkü Hα en güçlü sinyaldir. Yeşili bastırıp kükürt ve oksijeni öne çıkarmak paletin karakteristik altın–turkuaz görünümünü verir.',
      'Yıldızlar narrowband’de doğal renklerini kaybeder. Yaygın çözüm, yıldızları ayrı bir RGB veriden alıp işlenmiş narrowband katmanın üzerine bindirmektir.',
    ],
    tint: '190,120,140',
  },
  {
    slug: 'polar-align',
    title: 'Polar Alignment Nasıl Yapılır?',
    category: 'teknik',
    level: 'Başlangıç',
    duration: '10 dk okuma',
    publishedAt: '2026-07-06',
    author: 'Mert Aydın',
    summary:
      'Kutup yıldızıyla hızlı hizalama, platesolve destekli yöntemler ve kutup görünmediğinde alternatifler.',
    body: [
      'Ekvatoral montürün dönüş ekseni Dünya’nın dönüş eksenine paralel olmalıdır. Bu hizalama ne kadar iyiyse, alan dönmesi (field rotation) o kadar az olur ve uzun pozlar temiz kalır.',
      'Polar scope ile yapılan klasik hizalama birkaç yay dakikası hassasiyet verir; bu, guide kullanan bir kurulum için genellikle yeterlidir. Daha iyisi için platesolve tabanlı yazılım yöntemleri yay saniyesi mertebesine iner.',
      'Kutup yıldızının görünmediği durumlarda (engel, güney yönü) sürüklenme (drift) yöntemi ya da yazılım destekli üç nokta hizalaması kullanılabilir.',
    ],
    tint: '150,185,235',
  },
  {
    slug: 'guiding-sorunlari',
    title: 'Guiding Sorunları ve Çözümleri',
    category: 'teknik',
    level: 'Orta',
    duration: '25 dk okuma',
    publishedAt: '2026-06-30',
    author: 'Deniz Arslan',
    summary:
      'RMS değeri nasıl okunur; backlash, kablo sürüklenmesi, rüzgâr ve dengesiz yük kaynaklı hataların teşhisi.',
    body: [
      'Guide RMS değeri tek başına anlamlı değildir; pixel scale ile birlikte okunmalıdır. 1.5"/piksel örneklemede 0.8" RMS sorunsuzken, 0.5"/piksel örneklemede aynı değer yıldızları belirgin biçimde şişirir.',
      'Yalnızca bir eksende bozulan grafik genellikle mekanik bir sorunu işaret eder: dengesiz yük, backlash ya da sıkışmış bir dişli. Her iki eksende eşzamanlı bozulma ise seeing, rüzgâr veya kablo sürüklenmesine işaret eder.',
      'Kablo yönetimi en çok küçümsenen etkendir. Montür dönerken gerilen bir kablo, düzenli aralıklarla tekrar eden ani sıçramalar üretir.',
    ],
    tint: '120,200,180',
  },
  {
    slug: 'bortle-olcegi',
    title: 'Bortle Ölçeği ve SQM: Gökyüzü Kalitesini Ölçmek',
    category: 'gozlem',
    level: 'Başlangıç',
    duration: '12 dk okuma',
    publishedAt: '2026-06-24',
    author: 'Selin Kaya',
    summary:
      'Bortle sınıfları pratikte ne anlama gelir; SQM ölçümü nasıl yapılır ve çekim planına nasıl yansır.',
    body: [
      'Bortle ölçeği 1 (en karanlık) ile 9 (şehir merkezi) arasında dokuz sınıfa ayrılır ve çıplak gözle görülebilen en sönük yıldız ile Samanyolu’nun görünürlüğüne dayanır. Öznel ama pratik bir ölçüttür.',
      'SQM (Sky Quality Meter) ise gökyüzü parlaklığını mag/arcsec² biriminde sayısal olarak ölçer. 21.5 ve üzeri değerler Bortle 3 ve altına karşılık gelir. Ölçüm ay ışığından ve yapay ışıktan uzakta, başucuna doğrultularak yapılmalıdır.',
      'Karanlık gökyüzü her hedef için aynı ölçüde kritik değildir: parlak gezegenler ve ay şehirden de çekilebilirken, sönük emisyon bulutsuları için karanlık gökyüzü ya da dar bant filtreler gerekir.',
    ],
    tint: '150,185,235',
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

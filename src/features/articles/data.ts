import { commonsImage } from '../../lib/commons';
import type { ContentBlock } from '@/domain/content/blocks';
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
  /**
   * Yazının kendi adresi — verilmezse `/yazi/<slug>` varsayılır.
   *
   * Bazı yazılar bir metin kaydı değil, kendi sayfası olan interaktif bir
   * belge (drizzle rehberi: dört hesaplayıcı ve canlı bir simülatör
   * taşıyor). Bunları `/yazi/<slug>` altında göstermek, gövdesi boş bir
   * kayıt uydurmak olurdu. Liste, şerit, arama ve "ilgili yazılar"
   * `articleHref()` üzerinden okuduğu için kart her yerde doğru yere
   * gidiyor; eski `/yazi/<slug>` adresi de yönlendirmeyle korunuyor.
   */
  href?: string;
  category: ArticleCategory;
  level: ArticleLevel;
  /** "15 dk okuma" gibi okuma süresi. */
  duration: string;
  publishedAt: string;
  author: string;
  summary: string;
  body: string[];
  bodyBlocks?: ContentBlock[];
  tint: string;
  /**
   * Kart görseli.
   *
   * LİSANS: yalnızca yeniden kullanımına izin veren kaynaklar — NASA/ESA
   * yayınları kamu malı, ESO görselleri CC BY 4.0. Kredi arayüzde
   * gösteriliyor; gösterilmediğinde CC BY ihlal edilir.
   *
   * KONUYLA İLGİLİ OLMAK ZORUNDA. Rehberlere rastgele bir bulutsu
   * koymak kartı süsler ama okuyucuya yalan söyler: polar alignment
   * yazısının yanındaki görsel kutup yıldızı izleri, narrowband
   * yazısınınki Hubble paletiyle işlenmiş bir kare. Görselin işi
   * dekorasyon değil, yazının ne hakkında olduğunu bir bakışta
   * söylemek.
   *
   * Adres çalışmazsa `RemoteImage` sessizce yıldız alanına düşer.
   */
  image?: {
    url: string;
    credit: string;
    licence: string;
  };
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
    image: {
      url: commonsImage('Two telescopes observing the night sky at the Paranal Observatory.jpg'),
      credit: 'ESO — Paranal Gözlemevi',
      licence: 'CC BY 4.0',
    },
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
    image: {
      url: commonsImage('Orion Nebula - Hubble 2006 mosaic.jpg'),
      credit: 'NASA, ESA, M. Robberto (STScI/ESA)',
      licence: 'Kamu malı',
    },
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
    image: {
      url: commonsImage('North America Nebula (NGC7000) in Hubble Palette.jpg'),
      credit: 'Wikimedia Commons — NGC 7000 (Hubble paleti)',
      licence: 'CC BY-SA 4.0',
    },
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
    image: {
      url: commonsImage('Circumpolar star trails.jpg'),
      credit: 'Wikimedia Commons — Kutup yıldızı çevresinde iz',
      licence: 'CC BY-SA',
    },
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
    image: {
      url: commonsImage('Milky Way over the VLT (dsc4081-cc).jpg'),
      credit: 'ESO — VLT üzerinde Samanyolu',
      licence: 'CC BY 4.0',
    },
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
    image: {
      url: commonsImage('Milky Way above ESO telescopes ( H9A2493P-CC).jpg'),
      credit: 'ESO — Karanlık gökyüzünde Samanyolu',
      licence: 'CC BY 4.0',
    },
  },
  /*
    SNR REHBERİ — gövdesi burada DEĞİL (drizzle kaydıyla aynı gerekçe:
    içerik derleme öncesi üretiliyor ve kendi sayfasında duruyor).
  */
  {
    slug: 'snr-rehberi',
    href: '/yazilar/snr-rehberi',
    title: 'Sinyal–Gürültü Oranı: Neden 4 Kat Süre 2 Kat İyileştirir',
    category: 'teknik',
    level: 'Orta',
    duration: '40 dk okuma',
    publishedAt: '2026-08-06',
    author: 'Astrohub',
    summary:
      'Fotoğrafınız neden hâlâ gürültülü? Cevap pozlama süresinde değil, topladığınız foton sayısında. Ve kötü haber şu: iyileşme gittikçe pahalılaşıyor. Canlı simülatörle gürültünüzün nereden geldiğini görün — çoğu zaman kamera değil gökyüzü.',
    body: [],
    tint: '255,157,46',
    image: {
      url: '/gorseller/snr-kapak.svg',
      credit: 'Astrohub — SNR şeması',
      licence: 'Astrohub',
    },
  },
  /*
    KUTUP HİZALAMASI REHBERİ — gövdesi burada DEĞİL (diğer iki rehber
    kaydıyla aynı gerekçe: içerik derleme öncesi üretiliyor ve kendi
    sayfasında duruyor).
  */
  {
    slug: 'kutup-hizalamasi',
    href: '/yazilar/kutup-hizalamasi',
    title: 'Kutup Hizalaması: Sıfırdan Tam Rehber',
    category: 'teknik',
    level: 'Orta',
    duration: '35 dk okuma',
    publishedAt: '2026-08-06',
    author: 'Astrohub',
    summary:
      'Herkes yapmanız gerektiğini söylüyor; kimse ne kadar iyi yapmanız gerektiğini söylemiyor. Sürüklenmeyi guiding siler, alan dönmesini silemez — farkı kendi ekipmanınızla, gerçek piksel ölçeğinde görün.',
    body: [],
    tint: '110,168,199',
    image: {
      url: '/gorseller/kutup-kapak.svg',
      credit: 'Astrohub — kutup hizalaması şeması',
      licence: 'Astrohub',
    },
  },
  /*
    DRIZZLE REHBERİ — gövdesi burada DEĞİL.

    Rehber 16 bölüm, 16 tablo, 11 infografik, dört hesaplayıcı ve canlı
    bir simülatörden oluşuyor; `/yazilar/drizzle-rehberi` altında kendi
    sayfası var ve içeriği derleme öncesi üretiliyor
    (`scripts/drizzle-icerik.mjs`). Buradaki kayıt yalnızca künye: yazı
    listede, ana sayfa şeridinde ve aramada görünsün diye. Gövdeyi
    kopyalamak aynı metni iki yerde tutmak olurdu ve ikisi ilk
    güncellemede ayrışırdı.
  */
  {
    slug: 'drizzle-rehberi',
    href: '/yazilar/drizzle-rehberi',
    /* Başlık sayfadakiyle BİREBİR aynı: kartta bir ad, açılan
       sayfada başka bir ad görmek okuyucuya doğru yere gelip gelmediğini
       sorgulatıyordu. */
    title: 'Astrofotoğrafçılıkta Drizzle',
    category: 'isleme',
    level: 'İleri',
    duration: '35 dk okuma',
    publishedAt: '2026-08-05',
    author: 'Astrohub',
    summary:
      'Yıldızlar kare kare mi çıkıyor, detay bir türlü gelmiyor mu? Hubble ekibinin aynı dert için bulduğu yöntem bahçenizdeki teleskopta da çalışıyor. Yağmur damlası benzetmesiyle, hiç bilmeyene göre anlatım — ve kendi setup’ınızda deneyebileceğiniz dört hesaplayıcı.',
    body: [],
    tint: '255,157,46',
    /*
      KAPAK DEPODA ÇİZİLDİ (`public/gorseller/drizzle-kapak.svg`).

      Bu dosyanın kuralı görselin "yazının ne hakkında olduğunu bir
      bakışta söylemesi". Drizzle bir gökcismi değil, bir yeniden
      örnekleme yöntemi — buraya bir bulutsu koymak, kartı süsleyip
      okuyucuya yanlış şey vaat etmek olurdu. Şema algoritmanın kendi
      metaforunu çiziyor: kaba pikseller küçültülüp ince bir ızgaraya
      damlıyor.

      Kredi alanı "Astrohub" diyor çünkü çizim bize ait; lisans satırı
      dış kaynaklarda CC BY şartını karşılamak için var, burada yalnızca
      kaynağı dürüstçe adlandırıyor.
    */
    image: {
      url: '/gorseller/drizzle-kapak.svg',
      credit: 'Astrohub — drizzle şeması',
      licence: 'Astrohub',
    },
  },
];

/**
 * Yazının gideceği adres.
 *
 * Çoğu yazı `/yazi/<slug>` altında duruyor; kendi sayfası olanlar `href`
 * taşıyor. Bağlantıyı kuran her yüzey (liste, ana sayfa şeridi, arama
 * dizini, "ilgili yazılar") bunu kullanmalı — aksi hâlde bir yüzey
 * güncellenmeyi unutur ve kart boş bir kayda gider.
 */
export function articleHref(article: Pick<Article, 'slug' | 'href'>): string {
  return article.href ?? `/yazi/${article.slug}`;
}

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

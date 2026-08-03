import { commonsImage } from '../../lib/commons';
import type { ContentBlock } from '@/domain/content/blocks';

/**
 * Haber modülü içeriği.
 *
 * KAYITLAR GERÇEK. Aşağıdaki her haber, Temmuz 2026 civarında yayımlanmış
 * gerçek bir duyuruya dayanır ve `source.url` o duyuruya gider. Uydurma
 * başlık yok: bir astronomi sitesinde "örnek haber", okuyucunun her satırı
 * sorgulamasına yol açar.
 *
 * GÖRSEL TELİFİ. `image` alanı yalnızca **yeniden kullanımına izin veren**
 * kaynaklar için doldurulur: NASA görselleri kamu malıdır, ESA/Hubble,
 * ESA/Webb ve ESO görselleri CC BY 4.0'dır (kaynak belirtmek şartıyla).
 * Telifi belirsiz hiçbir görsel siteye konmaz; o kayıtlarda alan boş kalır
 * ve kart kendi yıldız alanıyla çizilir. Kredi metni `image.credit`
 * alanındadır ve arayüzde gösterilir — CC BY'nin şartı budur.
 *
 * Dış adresler yüklenemezse (çevrimdışı kabuk, tek dosya önizleme, kaynağın
 * adresi değişmiş) `RemoteImage` sessizce yıldız alanına düşer.
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

export interface NewsImage {
  url: string;
  /**
   * Kredi görünür olmak zorunda: hem CC BY hem CC BY-SA bunu şart koşuyor.
   * NASA görselleri kamu malı olduğu için hukuken zorunlu değil, ama
   * kaynağı göstermek okuyucunun görseli doğrulayabilmesi demek.
   */
  credit: string;
  /**
   * Lisans metni serbest bırakıldı: Commons'ta aynı konunun iki dosyası
   * farklı lisanslarda olabiliyor (CC BY-SA 3.0 / 4.0 / kamu malı) ve
   * sabit bir birleşim tipi, doğru lisansı yazmayı engelliyordu.
   */
  licence: string;
}

export interface NewsItem {
  slug: string;
  title: string;
  category: NewsCategory;
  /** ISO tarih — listede tersten sıralanır. */
  publishedAt: string;
  summary: string;
  body: string[];
  bodyBlocks?: ContentBlock[];
  /** Kaynak şeffaflığı: haberin dayandığı yayın. */
  source: { name: string; url?: string };
  /** Öne çıkan haber — ana sayfada ilk sırada gösterilir. */
  featured?: boolean;
  /** Telifi uygun görsel. Yoksa kart kendi yıldız alanını çizer. */
  image?: NewsImage;
  /** Yıldız alanı tonu (görsel yokken). */
  tint: string;
}

const HUBBLE = (id: string): string =>
  `https://cdn.esahubble.org/archives/images/screen/${id}.jpg`;

export const news: NewsItem[] = [
  {
    slug: 'omega-centauri-kayip-kara-delik',
    title: "Hubble, Omega Centauri'nin ilk yıldız kütleli kara deliğini buldu",
    category: 'kesif',
    publishedAt: '2026-07-13',
    featured: true,
    summary:
      'oMEGACat BH-2 adı verilen kara delik 4,46 güneş kütlesinde ve bilinen kara delik çiftleri arasında en uzun yörünge dönemine sahip. Keşif Hubble arşiv verisiyle, Webb gözlemleri destekleyerek yapıldı.',
    body: [
      'Omega Centauri, Samanyolu\'nun en kütleli küresel kümesi ve on yıllardır "içinde kara delik var mı" tartışmasının merkezinde. Astronomlar bu kez arşive döndü: yirmi yıla yayılan Hubble görüntülerinde bir yıldızın konumundaki mikro salınım ölçüldü.',
      'Salınımın kaynağı görünmeyen bir eşlikçi — 4,46 güneş kütlesinde bir kara delik. Bu değer, Omega Centauri gibi metalce fakir bir ortamda beklenenden belirgin biçimde düşük; yıldız evrimi modelleri için doğrudan bir sınama demek.',
      'Çift, bilinen kara delik ikili sistemleri arasında en uzun yörünge dönemine sahip. Bulgular The Astrophysical Journal Letters\'da yayımlandı.',
    ],
    source: {
      name: 'ESA/Hubble',
      url: 'https://esahubble.org/news/heic2610/',
    },
    image: {
      url: HUBBLE('heic2610a'),
      credit: 'ESA/Hubble & NASA',
      licence: 'CC BY 4.0',
    },
    tint: '190,150,220',
  },
  {
    slug: 'beta-pictoris-d-webb',
    title: "Webb, Beta Pictoris sisteminde saklanan dev gezegeni ortaya çıkardı",
    category: 'kesif',
    publishedAt: '2026-07-22',
    featured: true,
    summary:
      'Astronominin en çok çalışılan sistemlerinden birinde, parlak toz diskinin arkasında gizlenen üçüncü bir dev gezegen bulundu. Beta Pictoris d, sistemdeki en geniş yörüngeye sahip.',
    body: [
      'Beta Pictoris kırk yıldır gözleniyor: genç bir yıldız, devasa bir toz diski ve gezegen oluşumunun canlı bir laboratuvarı. Buna rağmen sistemde üçüncü bir dev gezegen fark edilmemişti.',
      'Webb, gezegenin atmosferindeki karbon monoksit, su buharı ve metan izlerini yakaladı. Diskin parlaklığı doğrudan görüntülemeyi engellediği için tespit, tayf imzası üzerinden yapıldı.',
      'Beta Pictoris d, sistemde bilinen üç gezegen arasında en geniş yörüngeye sahip. Bu, disk-gezegen etkileşimi modellerinin sınanacağı yeni bir referans noktası.',
    ],
    source: {
      name: 'STScI',
      url: 'https://www.stsci.edu/contents/news-releases/2026/news-2026-126',
    },
    image: {
      url: commonsImage('Beta Pictoris.jpg'),
      credit: 'Wikimedia Commons — Beta Pictoris',
      licence: 'CC BY-SA',
    },
    tint: '150,185,235',
  },
  {
    slug: 'lhs-1140b-atmosfer',
    title:
      'Yaşanabilir bölgedeki kayalık bir gezegende ilk doğrulanmış atmosfer',
    category: 'kesif',
    publishedAt: '2026-07-21',
    summary:
      'LHS 1140 b, yıldızının yaşanabilir bölgesinde yer alan ve atmosferi doğrulanan ilk kayalık gezegen oldu. Sonuç, kırmızı cüce sistemlerinde atmosfer tutunabilirliği tartışmasını değiştiriyor.',
    body: [
      'Kırmızı cüce yıldızların çevresindeki kayalık gezegenler, yıldız parlamaları nedeniyle atmosferlerini kaybetmekle biliniyordu. Bu varsayım, yaşanabilirlik tartışmasının merkezindeydi.',
      'LHS 1140 b üzerinde yapılan gözlemler, gezegenin bir atmosfer taşıdığını doğruladı — hem de yıldızının yaşanabilir bölgesinde. Kayalık bir gezegende bu ilk kez doğrulanıyor.',
      'Sonuç tek başına "yaşam var" demek değil; ama atmosferin ayakta kalabildiğini göstermesi, hedef seçimi yapan gelecek gözlem programları için doğrudan bir yön veriyor.',
    ],
    source: {
      name: 'ScienceDaily',
      url: 'https://www.sciencedaily.com/news/space_time/astronomy/',
    },
    image: {
      url: commonsImage('Rosette Nebula NGC 2237 - C49.png'),
      credit: 'Wikimedia Commons — Rozet Bulutsusu',
      licence: 'CC BY-SA 3.0',
    },
    tint: '120,215,200',
  },
  {
    slug: 'en-eski-kuazarlar',
    title: 'Evren 670 milyon yaşındayken parlayan 31 kuazar bulundu',
    category: 'kesif',
    publishedAt: '2026-07-07',
    summary:
      'Bilinen en eski kuazarlardan 31 tanesi tespit edildi; ikisi şimdiye kadar saptanmış en erken kuazarlar. Erken evrende süperkütleli kara deliklerin ne kadar hızlı büyüdüğü sorusu yeniden açılıyor.',
    body: [
      'Kuazarlar, merkezindeki süperkütleli kara delik madde yutarken olağanüstü parlayan galaksi çekirdekleridir. Ne kadar erken görülürlerse, kara deliklerin o kadar hızlı büyüdüğü anlamına gelir.',
      'Yeni taramada bulunan 31 kuazarın en erken ikisi, evren yalnızca 670 milyon yaşındayken ışık yayıyordu. Bu, standart büyüme senaryolarının üst sınırını zorlayan bir zaman ölçeği.',
      'Bulgu, "tohum kara delik" modellerini — yıldız çöküşünden mi, doğrudan gaz çöküşünden mi doğdukları sorusunu — doğrudan ilgilendiriyor.',
    ],
    source: {
      name: 'ScienceDaily',
      url: 'https://www.sciencedaily.com/news/space_time/astronomy/',
    },
    tint: '232,140,110',
  },
  {
    slug: 'ngc-4696-kara-delik-beslenmesi',
    title: "Webb, NGC 4696'nın merkezindeki kara deliği besleyen gazı görüntüledi",
    category: 'kesif',
    publishedAt: '2026-07-17',
    summary:
      'James Webb, galaksinin merkezindeki süperkütleli kara deliğe akan gazı alışılmadık ayrıntıda kaydetti. Beslenme mekanizması ilk kez bu ölçekte izlenebiliyor.',
    body: [
      'Süperkütleli kara deliklerin nasıl beslendiği, galaksi evriminin en belirleyici ama en az gözlenebilen süreçlerinden biri. Gazın merkeze nasıl indiğini görmek, çözünürlük sorunudur.',
      'Webb\'in kızılötesi duyarlılığı, NGC 4696\'nın merkezine akan gaz yapılarını ayrıştırmayı mümkün kıldı. Görüntüler, akışın düzgün bir disk değil, düzensiz filamanlar hâlinde olduğunu gösteriyor.',
      'Bu ayrıntı önemli: beslenme düzensizse, kara deliğin aktiflik dönemleri de kesintili olur — gözlemlerde neden bazı galaksilerin "sessiz" göründüğünü açıklayabilir.',
    ],
    source: {
      name: 'ScienceDaily',
      url: 'https://www.sciencedaily.com/news/space_time/astronomy/',
    },
    image: {
      url: commonsImage('NGC 6302 Hubble 2009.full.jpg'),
      credit: 'NASA, ESA, Hubble SM4 ERO Team',
      licence: 'Kamu malı',
    },
    tint: '190,150,220',
  },
  {
    slug: 'gizli-beyaz-cuceler',
    title: 'Kırmızı cücelerin gölgesinde saklanan dört beyaz cüce bulundu',
    category: 'kesif',
    publishedAt: '2026-07-15',
    summary:
      "Hubble'ın morötesi gözlemleri, parlak kırmızı cüce eşlikçilerinin yanında görünmez kalan dört yakın beyaz cüceyi ortaya çıkardı.",
    body: [
      'Beyaz cüceler görünür ışıkta sönüktür; yanlarında parlak bir kırmızı cüce varsa gözlemde tümüyle kaybolurlar. Bu, yakın yıldız sayımlarında sistematik bir eksiklik anlamına gelir.',
      "Hubble'ın morötesi duyarlılığı denklemi tersine çevirdi: beyaz cüceler morötesinde baskın, kırmızı cüceler sönük. Dört yeni kayıt bu yolla ortaya çıktı.",
      'Yakın yıldız sayımının tamlığı, galaktik yıldız oluşum tarihini hesaplayan modeller için doğrudan girdi — eksik sayım, yanlış yaş demek.',
    ],
    source: {
      name: 'ScienceDaily',
      url: 'https://www.sciencedaily.com/news/space_time/astronomy/',
    },
    tint: '150,185,235',
  },
  {
    slug: 'ngc-4654-asimetrik-sarmal',
    title: "Hubble, Başak Kümesi'nde biçimi bozulmuş bir sarmalı görüntüledi",
    category: 'kesif',
    publishedAt: '2026-07-10',
    summary:
      'NGC 4654, hem bir komşu galaksiyle yakın karşılaşma hem de kümenin sıcak gazı içinden geçiş nedeniyle asimetrik bir sarmala dönüşmüş. Galaksi 55 milyon ışık yılı uzakta.',
    body: [
      'Galaksiler yalnız evrim geçirmez. NGC 4654 bunun ders kitabı örneği: bir yanında yakın karşılaşmanın çektiği gaz kuyruğu, diğer yanında kümenin sıcak gazının süpürdüğü kesik kenar.',
      'İkinci etki "ram basıncı sıyırması" olarak biliniyor — galaksi küme gazı içinden hızla geçerken kendi gazını arkasında bırakıyor ve yıldız oluşumu bir kenarda kesiliyor.',
      'Astrofotoğraf açısından hedef zor: 55 milyon ışık yılı uzaklıkta ve asimetri ancak uzun entegrasyonla ortaya çıkıyor.',
    ],
    source: {
      name: 'ESA/Hubble',
      url: 'https://esahubble.org/',
    },
    image: {
      url: commonsImage('Andromeda galaxy.jpg'),
      credit: 'Wikimedia Commons — Andromeda Galaksisi',
      licence: 'CC BY-SA',
    },
    tint: '150,185,235',
  },
  {
    slug: 'temmuz-2026-gokyuzu',
    title: 'Temmuz 2026 gökyüzü: çifte meteor yağmuru ve Samanyolu merkezi',
    category: 'gokyuzu-olayi',
    publishedAt: '2026-07-01',
    featured: true,
    summary:
      'Ay boyunca Delta Aquarid ve Perseid yağmurları üst üste biniyor, 14 Temmuz yeni ayı karanlık bir pencere açıyor ve Samanyolu merkezi çıplak gözle izlenebiliyor.',
    body: [
      '14 Temmuz yeni ayı, ayın en karanlık gecelerini getiriyor. Bu pencere, 17 Temmuz\'da başlayan Perseid etkinliğinin ilk günleri için elverişli bir zamanlama.',
      '30 Temmuz\'u 31\'e bağlayan gece Güney Delta Aquarid yağmuru zirveye çıkıyor. Kuzey yarımkürede etkinliği sınırlı ama Türkiye\'den izlenebiliyor.',
      'Ay boyunca Venüs, Mars, Satürn, Uranüs ve Neptün gözlemlenebilir durumda; Samanyolu merkezi gece başında yeterince yükseliyor.',
    ],
    source: {
      name: 'TÜBİTAK Bilim Genç',
      url: 'https://bilimgenc.tubitak.gov.tr/makale/temmuz-2026da-gokyuzu',
    },
    image: {
      url: commonsImage('North America Nebula (NGC7000) in Hubble Palette.jpg'),
      credit: 'Wikimedia Commons — NGC 7000',
      licence: 'CC BY-SA 4.0',
    },
    tint: '230,205,150',
  },
  {
    slug: 'tempel-2-kuyruklu-yildiz',
    title: '10P/Tempel 2 parlıyor: temmuz sonunda dürbünle seçilebilir',
    category: 'gokyuzu-olayi',
    publishedAt: '2026-07-05',
    summary:
      "Güneş'e yaklaşan 10P/Tempel 2 kuyruklu yıldızı, ay boyunca Oğlak takımyıldızı yakınında izlenebiliyor. Ay başında küçük teleskop gerekiyordu; ay sonuna doğru el dürbünü yetiyor.",
    body: [
      'Güneş çevresindeki turunu beş yılda tamamlayan 10P/Tempel 2, bu geçişinde gözlenebilir parlaklığa ulaştı.',
      'Temmuz boyunca Oğlak (Capricornus) takımyıldızı yakınlarında; ay başında küçük bir teleskop gerektiriyordu, ay sonuna doğru parlaklığı artarak basit bir el dürbünüyle bile seçilebilir hâle geliyor.',
      'Astrofotoğrafta kuyruklu yıldızlar ayrı bir disiplin: cisim yıldızlara göre hareket ettiği için uzun pozlarda ya çekirdek ya yıldızlar iz bırakır. Kısa poz + çekirdeğe hizalı yığınlama tercih edilir.',
    ],
    source: {
      name: 'Bilim ve Teknik',
      url: 'https://bilimteknik.tubitak.gov.tr/temmuz-2026nin-onemli-gok-olaylari/',
    },
    image: {
      url: commonsImage('Elephant Trunk Nebula.jpg'),
      credit: 'Wikimedia Commons — Fil Hortumu Bulutsusu',
      licence: 'CC BY-SA',
    },
    tint: '120,215,200',
  },
  {
    slug: 'ay-venus-regulus-yakinlasmasi',
    title: '17 Temmuz akşamı Ay, Venüs ve Regulus batı ufkunda buluştu',
    category: 'gokyuzu-olayi',
    publishedAt: '2026-07-16',
    summary:
      'Hilal evresindeki Ay, Venüs ve Aslan takımyıldızının en parlak yıldızı Regulus gün batımının hemen ardından batı ufkunda kısa süreli bir üçlü oluşturdu.',
    body: [
      'Yakınlaşma Aslan takımyıldızı yönünde gerçekleşti ve gün batımından sonra yalnızca kısa bir pencere boyunca izlenebildi — ufka yakın olaylar hızla batar.',
      'Bu tür üçlüler geniş açı astrofotoğraf için idealdir: 35–85 mm aralığında bir lens, üç cismi de manzarayla birlikte tek karede tutar.',
      'Ufka yakın çekimlerde asıl sorun atmosferik sönümlenme ve türbülans; alçak irtifada renk kayması belirginleşir ve beyaz dengesi düzeltmesi gerekir.',
    ],
    source: {
      name: 'Forbes Türkiye',
      url: 'https://www.forbes.com.tr/teknoloji/gokyuzunde-nadir-hizalanma-mars-ay-ve-ulker-yildiz-kumesi-bulusuyor',
    },
    tint: '230,205,150',
  },
  {
    slug: 'perseverance-maraton',
    title: "Perseverance, Mars'ta maraton mesafesini tamamladı",
    category: 'uzay-misyonu',
    publishedAt: '2026-07-18',
    summary:
      "NASA'nın Perseverance gezgini, Kızıl Gezegen üzerinde toplam 42,2 kilometre (26,2 mil) yol katederek maraton mesafesini tamamladı.",
    body: [
      'Perseverance, Jezero Krateri ve çevresinde örnek toplama görevini sürdürürken toplam sürüş mesafesi maraton eşiğini geçti.',
      'Mesafe kendi başına bir bilimsel sonuç değil ama dayanıklılığın ölçüsü: tekerlek aşınması, güç bütçesi ve otonom sürüş yazılımının güvenilirliği bu kilometrelerle sınanıyor.',
      'Toplanan örneklerin Dünya\'ya getirilmesi ayrı bir görev; gezginin görevi örnekleri güvenli noktalarda bırakmayı da içeriyor.',
    ],
    source: {
      name: 'ScienceDaily',
      url: 'https://www.sciencedaily.com/news/space_time/mars/',
    },
    image: {
      url: commonsImage('Orion Nebula - Hubble 2006 mosaic.jpg'),
      credit: 'NASA, ESA, M. Robberto (STScI/ESA)',
      licence: 'Kamu malı',
    },
    tint: '232,140,110',
  },
  {
    slug: 'rosalind-franklin-enstruman-testi',
    title: 'Rosalind Franklin gezgininin yaşam arama enstrümanı doğrulandı',
    category: 'uzay-misyonu',
    publishedAt: '2026-07-09',
    summary:
      "ExoMars'ın Rosalind Franklin gezginindeki enstrümanın, Mars'taki kararlı bileşikler arasındaki ince farkları ayırt edebildiği doğrulandı — kadim yaşam izi arayışı için kritik bir yetenek.",
    body: [
      'Mars yüzeyinde organik moleküllerin bozunmuş kalıntıları bulunuyor; sorun bunların biyolojik mi jeolojik mi olduğunu ayırt etmek.',
      'Test, enstrümanın kimyasal olarak çok benzeyen kararlı bileşikler arasındaki küçük farkları çözebildiğini gösterdi. Ayırt etme gücü olmadan toplanan veri, yoruma açık kalırdı.',
      'Gezginin matkabı yüzeyin iki metre altına inebiliyor — radyasyonun organik molekülleri parçalamadığı derinlik.',
    ],
    source: {
      name: 'ScienceDaily',
      url: 'https://www.sciencedaily.com/news/space_time/mars/',
    },
    tint: '232,140,110',
  },
  {
    slug: 'artemis-guney-kutbu',
    title: "Artemis programı rotayı Ay'ın Güney Kutbu'na çeviriyor",
    category: 'uzay-misyonu',
    publishedAt: '2026-07-04',
    summary:
      "NASA'nın Artemis programı, Apollo döneminin ekvator bölgelerinden ayrılarak keşfi çok daha zorlu olan Güney Kutbu'na yöneliyor. Sebep: kalıcı gölgeli kraterlerdeki su buzu.",
    body: [
      'Apollo inişleri ekvator kuşağındaydı: aydınlatma öngörülebilir, iletişim kolay, sıcaklık yönetilebilir. Güney Kutbu bunların hiçbirini sunmuyor.',
      'Karşılığında sunduğu şey su buzu: kalıcı gölgeli krater tabanlarında milyarlarca yıldır korunan buz, hem içme suyu hem yakıt (hidrojen + oksijen) anlamına geliyor.',
      'Bölgede Güneş ufka çok alçak açıyla vuruyor; uzun gölgeler ve keskin kontrast, hem iniş navigasyonunu hem yüzey operasyonunu zorlaştırıyor.',
    ],
    source: {
      name: 'NASA',
      url: 'https://www.nasa.gov/',
    },
    tint: '150,185,235',
  },
  {
    slug: 'chandra-250-yil-goruntuleri',
    title: 'Chandra, dört yeni derin uzay görüntüsü yayımladı',
    category: 'uzay-misyonu',
    publishedAt: '2026-07-03',
    summary:
      "NASA'nın Chandra X-ışını Gözlemevi, aralarında patlamış bir yıldızın da bulunduğu dört derin uzay görüntüsünü yayımladı.",
    body: [
      'Chandra X-ışını bandında çalışıyor: gözle görülmeyen, milyonlarca derecelik gazı haritalıyor. Süpernova kalıntıları bu bantta en çarpıcı görünen nesneler arasında.',
      'Yayımlanan görüntülerde X-ışını verisi, görünür ve kızılötesi gözlemlerle bindirilmiş — tek bir bant, nesnenin yalnızca bir katmanını gösteriyor.',
      'NASA görselleri kamu malıdır; kaynak belirtilerek serbestçe kullanılabilir.',
    ],
    source: {
      name: 'NASA / Chandra',
      url: 'https://www.nasa.gov/',
    },
    tint: '190,150,220',
  },
  {
    slug: 'dinozor-asteroidi-kokeni',
    title: 'Dinozorları yok eden asteroidin kökeni: nadir bir CO kondriti',
    category: 'kesif',
    publishedAt: '2026-07-11',
    summary:
      'Yeni analiz, Chicxulub çarpmasına yol açan cismin Güneş Sistemi\'nin uzak bir bölgesinden gelen, nadir görülen bir CO kondriti olduğunu gösteriyor.',
    body: [
      'Çarpma katmanındaki iz elementlerin oranı, cismin türü hakkında parmak izi işlevi görüyor. Yeni ölçümler bu izi nadir bir karbonlu kondrit sınıfına bağlıyor.',
      'Bu sınıf, Güneş Sistemi\'nin dış bölgelerinde oluşuyor — yani cisim iç sistemin yerlisi değil, sonradan gelmiş.',
      'Sonuç, çarpma olasılığı hesaplarını doğrudan ilgilendiriyor: tehdit havuzunun neresinden geldiğini bilmek, gelecekteki risk modellerini değiştiriyor.',
    ],
    source: {
      name: 'ScienceDaily',
      url: 'https://www.sciencedaily.com/news/space_time/solar_system/',
    },
    tint: '232,140,110',
  },
  {
    slug: 'asteroit-parcalanmasi-carpma-dalgasi',
    title: '800 milyon yıl önce bir asteroit parçalanması çarpma dalgası tetiklemiş',
    category: 'kesif',
    publishedAt: '2026-07-08',
    summary:
      'Bir asteroidin felaket ölçeğinde parçalanmasının, yaklaşık 800 milyon yıl önce iç Güneş Sistemi genelinde büyük bir çarpma dalgası başlatmış olabileceği öne sürüldü.',
    body: [
      'Ay ve Dünya üzerindeki krater yaşları belirli dönemlerde kümeleniyor. Bu kümelenme rastlantı değilse, kaynağı ortak bir olay olmalı.',
      'Öne sürülen senaryo: ana kuşakta bir asteroidin parçalanması, iç sisteme uzun süre boyunca enkaz besleyen bir akış yarattı.',
      'Senaryonun sınanabilir sonucu var — aynı dönemin göktaşlarında ortak bir bileşim imzası bulunmalı.',
    ],
    source: {
      name: 'ScienceDaily',
      url: 'https://www.sciencedaily.com/news/space_time/solar_system/',
    },
    tint: '230,205,150',
  },
  {
    slug: 'tubitak-2026-gok-olaylari-yilligi',
    title: 'TÜBİTAK Ulusal Gözlemevi 2026 Gök Olayları Yıllığı yayımlandı',
    category: 'turkiye',
    publishedAt: '2026-01-15',
    summary:
      "Ulusal Gözlemevi astronomlarının hazırladığı yıllık, Türkiye'den gözlenebilen güneş ve ay tutulmalarını, meteor yağmurlarını ve gezegen konumlarını kapsıyor.",
    body: [
      'Yıllık, gözlem planı yapan herkes için birincil kaynak: tarihler Türkiye saatiyle ve ülkeden görülebilirlik koşullarıyla birlikte veriliyor.',
      'Kapsam güneş ve ay tutulmaları, meteor yağmuru zirveleri, gezegen kavuşumları ve karşı konumları.',
      'Gözlem planlayıcımızdaki hesaplar bağımsız olarak Meeus algoritmalarıyla yapılıyor; yıllık, sonuçları karşılaştırmak için iyi bir denetim noktası.',
    ],
    source: {
      name: 'Bilim ve Teknik',
      url: 'https://bilimteknik.tubitak.gov.tr/2026-gok-olaylari-yilligi/',
    },
    tint: '150,185,235',
  },
  {
    slug: 'zerzevan-gokyuzu-etkinligi',
    title: "Zerzevan Kalesi'nde gökyüzü gözlem etkinliği ve bilim şenliği",
    category: 'turkiye',
    publishedAt: '2026-06-20',
    summary:
      'Diyarbakır Valiliği koordinasyonunda düzenlenen etkinlik, 27 Haziran 2026 Cumartesi günü 15.00–23.00 saatleri arasında Zerzevan Kalesi\'nde gerçekleştirildi.',
    body: [
      'Zerzevan Kalesi, Roma dönemi garnizon yerleşimi ve yeraltındaki Mithras Tapınağı ile biliniyor — arkeoloji ile gökyüzünü aynı gecede buluşturan az sayıdaki alandan biri.',
      'Program gündüz bilim şenliği, akşam teleskopla gözlem olarak kurgulandı.',
      'Güneydoğu\'nun kuru havası ve düşük ışık kirliliği, bölgeyi gözlem için avantajlı kılıyor.',
    ],
    source: {
      name: 'Gazete Detay',
      url: 'https://gazetedetay.com/zerzevan-kalesinde-gokyuzu-gozlem-etkinligi-ve-bilim-senligi-duzenlenecek',
    },
    tint: '230,205,150',
  },
  {
    slug: 'uggs-2026-erzurum',
    title: 'Ulusal Gökyüzü Gözlem Şenliği bu yıl Erzurum’da planlanıyor',
    category: 'turkiye',
    publishedAt: '2026-06-05',
    summary:
      'Yıllarca Antalya Bakırlıtepe ile özdeşleşen TÜBİTAK Ulusal Gökyüzü Gözlem Şenliği için 2026 tahmini programı 27–30 Ağustos, Erzurum Palandöken/Konaklı olarak duyuruldu.',
    body: [
      'Şenlik, Türkiye\'nin en köklü kamu astronomi etkinliği. Yer değişikliği, katılımcı kapasitesi ve ulaşım kısıtlarıyla ilgili.',
      'Palandöken\'in rakımı ve kuru kış havası gözlem açısından avantajlı; ağustos sonunda gece sıcaklıkları düşük olabiliyor.',
      'Kesin tarih ve başvuru takvimi TÜBİTAK resmî kanallarından duyuruluyor; başvurular genelde etkinlikten 1–2 ay önce açılıyor.',
    ],
    source: {
      name: 'TÜBİTAK Ulusal Gözlemevi',
      url: 'https://senlik.tug.tubitak.gov.tr/',
    },
    tint: '120,215,200',
  },
  {
    slug: 'haziran-2026-venus-jupiter',
    title: 'Haziran 2026: Venüs–Jüpiter kavuşumu ve Çilek Dolunayı',
    category: 'gokyuzu-olayi',
    publishedAt: '2026-06-01',
    summary:
      '9 Haziran’da Venüs ile Jüpiter kavuşuma girdi, 17 Haziran’da Jüpiter hilal Ay’a yaklaştı; ay ortasında Venüs, Ay, Jüpiter ve Merkür bir hat üzerinde sıralandı.',
    body: [
      'Kavuşumlar geniş açı çekim için en erişilebilir gökyüzü olayları: teleskop gerektirmiyor, tripod ve sabit bir lens yetiyor.',
      'Haziran ayı ayrıca yaz gündönümünü içeriyor — kuzey yarımkürede yılın en uzun günü, dolayısıyla en kısa astronomik karanlık penceresi.',
      'Vega, Deneb ve Altair’den oluşan Yaz Üçgeni haziranda belirginleşiyor ve ışık kirliliği olan bölgelerden bile seçilebiliyor.',
    ],
    source: {
      name: 'TÜBİTAK Bilim Genç',
      url: 'https://bilimgenc.tubitak.gov.tr/makale/haziran-2026da-gokyuzu',
    },
    tint: '190,150,220',
  },
];

/** Tarihe göre yeniden eskiye sıralı liste. */
export function sortedNews(): NewsItem[] {
  return [...news].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getNewsBySlug(slug: string): NewsItem | undefined {
  return news.find((item) => item.slug === slug);
}

/** Ana sayfa şeridi için: öne çıkanlar önce, sonra en yeniler. */
export function highlightNews(limit = 4): NewsItem[] {
  const sorted = sortedNews();
  const featured = sorted.filter((n) => n.featured);
  const rest = sorted.filter((n) => !n.featured);
  return [...featured, ...rest].slice(0, limit);
}

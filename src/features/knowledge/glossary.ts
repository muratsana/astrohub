/**
 * TERİMLER SÖZLÜĞÜ (§14.9).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `content_entries` — YENİ TABLO DEĞİL
 *
 * §14'ün açılışı "çakışan modülleri birleştir" diyor. §14.9'un istediği
 * her alan `content_entries`ta zaten var: seviye (`level`), okuma süresi
 * (`duration`), editoryal doğrulama (`status`), kaynak (`source_*`) ve
 * güncelleme tarihi (`updated_at`). Ayrı tablo; ikinci bir RLS
 * politikası, ikinci bir panel yüzeyi ve zamanla ayrışan iki "yayınla"
 * akışı demekti. `0065` yalnızca `kind` listesine iki değer ekliyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TOHUM KODDA, VERİTABANI ÜSTÜNE YAZIYOR
 *
 * Haber/yazıdaki `mergeWithSeed` deseninin aynısı: aynı `slug` gelirse
 * veritabanı kazanır. Metin TEK YERDE — SQL tohumu da yazsaydık aynı
 * cümle iki dosyada yaşar ve 0058'in `home_modules` tohumunda yaşadığımız
 * ayrışma tekrarlanırdı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TANIMLAR YERLEŞİK, UYDURMA DEĞİL
 *
 * Buradaki tanımlar amatör astronomi ve astrofotoğrafta YERLEŞİK
 * kullanımlardır (Bortle ölçeği, seeing, pixel scale, kalibrasyon
 * kareleri). Sayısal eşik verilen yerlerde "yaklaşık" deniyor ve kesin
 * bir kaynak iddia edilmiyor: §14.2'nin "bilimsel sonucu belirsiz
 * alanlarda kesinlik iddiası kullanma" kuralı burada da geçerli.
 *
 * `source` alanı BOŞ ve bu doğru: metinler Astrohub editoryal içeriği,
 * dışarıdan alıntı değil. Uydurma bir kaynak adresi yazmak, atıfın
 * kendisini değersizleştirirdi.
 */

export type GlossaryCategory =
  | 'gokyuzu'
  | 'optik'
  | 'kamera'
  | 'isleme'
  | 'kosullar';

export const glossaryCategoryLabels: Record<GlossaryCategory, string> = {
  gokyuzu: 'Gökyüzü',
  optik: 'Optik',
  kamera: 'Kamera',
  isleme: 'İşleme',
  kosullar: 'Koşullar',
};

/**
 * KATEGORİ → İLGİLİ ARAÇ.
 *
 * §14.9 "ilgili araçlar" istiyor. `content_entries`ta böyle bir sütun
 * yok ve EKLENMEDİ: panelden girilen bir terimin de araç bağlantısı
 * olmalı, oysa yeni bir sütun yalnızca kodda yazılan tohumu
 * zenginleştirirdi. Bağlantı KATEGORİDEN türetiliyor — hem tohum hem
 * veritabanı kaydı aynı davranıyor.
 *
 * Karşılığı olmayan kategori bağlantısız kalıyor; uydurma bir araç
 * göstermektense hiç göstermemek doğru.
 */
export const categoryTool: Partial<
  Record<GlossaryCategory, { label: string; to: string }>
> = {
  optik: { label: 'FoV Simülatörü', to: '/simulator' },
  kamera: { label: 'Pixel Scale Simülatörü', to: '/simulator' },
  kosullar: { label: 'Işık Kirliliği Haritası', to: '/araclar/isik-kirliligi' },
  gokyuzu: { label: 'Bu Gece Gökyüzünde', to: '/bu-gece' },
};

export interface GlossaryTerm {
  slug: string;
  /** Terimin kendisi. */
  title: string;
  /** Tek cümlelik tanım — listede görünen. */
  summary: string;
  /** Uzun açıklama; paragraflar. Boş olabilir. */
  body: string[];
  category: GlossaryCategory;
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    slug: 'bortle-olcegi',
    title: 'Bortle ölçeği',
    category: 'kosullar',
    summary:
      'Bir gözlem yerinin gökyüzü karanlığını 1 (en karanlık) ile 9 (şehir merkezi) arasında tarif eden dokuz basamaklı ölçek.',
    body: [
      'Ölçek çıplak gözle görülebilenleri temel alır: Samanyolu\'nun görünürlüğü, en sönük yıldızların parlaklığı, ufuktaki ışık kubbeleri. Ölçüm aleti gerektirmediği için saha karşılaştırmasında yaygın kullanılır.',
      'Sayısal bir ölçüm değil, tarifsel bir sınıflamadır: aynı yer için iki gözlemci komşu basamakları seçebilir. Daha nesnel karşılaştırma için SQM okuması kullanılır.',
    ],
  },
  {
    slug: 'sqm',
    title: 'SQM',
    category: 'kosullar',
    summary:
      'Gökyüzü parlaklığını yay saniyesi kare başına kadir (mag/arcsec²) cinsinden ölçen alet ve o aletin verdiği değer.',
    body: [
      'Sayı BÜYÜDÜKÇE gökyüzü karanlıktır — ölçek terstir. Şehir içinde 18 civarı değerler görülürken çok karanlık sahalarda 21,5 üstü okumalar alınır.',
      'Bortle\'ın aksine alet gerektirir ve tek bir yöne bakar; ufka yakın ışık kubbelerini zenit okuması göstermez.',
    ],
  },
  {
    slug: 'seeing',
    title: 'Seeing',
    category: 'kosullar',
    summary:
      'Atmosfer türbülansının yıldız görüntüsünü bulanıklaştırma miktarı; genellikle yay saniyesi cinsinden söylenir.',
    body: [
      'Seeing kötüyken yıldızlar noktadan çok titreşen küçük diskler hâline gelir ve teleskopun optik gücü ne olursa olsun ayrıntı kaybolur. Gezegen ve çift yıldız gözleminde belirleyici koşuldur.',
      'Karanlıkla ilgisi yoktur: çok karanlık bir gecede seeing kötü, şehir içinde iyi olabilir.',
    ],
  },
  {
    slug: 'seffaflik',
    title: 'Şeffaflık',
    category: 'kosullar',
    summary:
      'Atmosferin ışığı ne kadar geçirdiği; nem, toz ve ince bulut şeffaflığı düşürür.',
    body: [
      'Şeffaflık düşükken sönük hedefler (bulutsu, galaksi) kaybolur ama parlak hedeflerdeki ayrıntı seeing iyiyse korunabilir. Bu yüzden iki koşul ayrı ayrı kaydedilir.',
    ],
  },
  {
    slug: 'odak-uzakligi',
    title: 'Odak uzaklığı',
    category: 'optik',
    summary:
      'Teleskop ya da objektifin ışığı odakladığı mesafe; görüntü ölçeğini belirleyen ana değer.',
    body: [
      'Odak uzaklığı arttıkça görüntü büyür ve görüş alanı daralır. Aynı kamerayla 400 mm\'de bütün Orion Bulutsusu kadraja girerken 2000 mm\'de yalnızca Trapezium bölgesi kalır.',
    ],
  },
  {
    slug: 'odak-orani',
    title: 'Odak oranı (f/)',
    category: 'optik',
    summary:
      'Odak uzaklığının açıklığa bölümü; bir optiğin birim alana düşürdüğü ışık yoğunluğunu tarif eder.',
    body: [
      'Küçük f sayısı (f/4 gibi) geniş alanlı sönük hedeflerde daha kısa pozla sinyal toplar; büyük f sayısı (f/10) görüntü ölçeğini büyütür ama aynı sinyali toplamak daha uzun sürer.',
      '"Hızlı optik daha iyidir" genellemesi yanıltıcıdır: hedefin açısal boyutu ve kameranın piksel boyutu hesaba katılmadan f oranı tek başına bir şey söylemez.',
    ],
  },
  {
    slug: 'reducer',
    title: 'Reducer',
    category: 'optik',
    summary:
      'Odak uzaklığını kısaltarak görüş alanını genişleten ve odak oranını düşüren optik eleman.',
    body: [
      'Genellikle 0,8× ya da 0,63× çarpanla gelir. Doğru çalışması için üreticinin belirttiği geri odak (backfocus) mesafesine kurulması gerekir; yanlış mesafede köşelerde yıldız bozulması görülür.',
    ],
  },
  {
    slug: 'barlow',
    title: 'Barlow',
    category: 'optik',
    summary:
      'Odak uzaklığını çarpan (2×, 3×) ve görüş alanını daraltan optik eleman; reducer\'ın tersi.',
    body: [
      'Gezegen görüntülemede örneklemeyi artırmak için kullanılır. Görüntü büyürken aynı ışık daha geniş alana yayıldığı için parlaklık düşer.',
    ],
  },
  {
    slug: 'pixel-scale',
    title: 'Pixel scale',
    category: 'kamera',
    summary:
      'Bir pikselin gökyüzünde kapladığı açı; yay saniyesi/piksel cinsinden söylenir.',
    body: [
      'Piksel boyutu ve odak uzaklığından hesaplanır. Seeing ile birlikte değerlendirilir: seeing\'in izin verdiğinden çok daha ince bir örnekleme, ayrıntı kazandırmadan gürültüyü artırır.',
      'Sitedeki Pixel Scale Hesaplayıcı bu değeri setup\'ınız için hesaplar.',
    ],
  },
  {
    slug: 'ornekleme',
    title: 'Örnekleme (sampling)',
    category: 'kamera',
    summary:
      'Pixel scale ile seeing arasındaki ilişki; görüntünün yetersiz mi, uygun mu, aşırı mı örneklendiğini tarif eder.',
    body: [
      'Kabaca, seeing değerinin yarısı ile üçte biri arasında bir pixel scale "uygun" sayılır. Bu bir kural değil bir başlangıç noktasıdır; hedefe, kameraya ve işleme yaklaşımına göre kayar.',
    ],
  },
  {
    slug: 'guiding',
    title: 'Guiding',
    category: 'kamera',
    summary:
      'Uzun pozlarda montaj takip hatasını ikinci bir kamerayla ölçüp düzelten yöntem.',
    body: [
      'Rehber kamera bir yıldızı izler, yazılım kaymayı ölçer ve montaja düzeltme gönderir. Guiding olmadan poz süresi montajın kendi takip doğruluğuyla sınırlanır.',
    ],
  },
  {
    slug: 'dither',
    title: 'Dither',
    category: 'kamera',
    summary:
      'Pozlar arasında kadrajı birkaç piksel kaydırarak sabit sensör kusurlarının yığında sabitlenmesini engelleme.',
    body: [
      'Sıcak pikseller ve sabit desen gürültüsü her karede aynı yerde durur; kadraj kaydırılırsa hizalama sırasında bunlar farklı yerlere düşer ve yığında elenir.',
    ],
  },
  {
    slug: 'dark-kare',
    title: 'Dark kare',
    category: 'isleme',
    summary:
      'Kapak kapalıyken, light karelerle aynı poz süresi ve sıcaklıkta çekilen kalibrasyon karesi.',
    body: [
      'Sensörün karanlık akımını ve sıcak piksellerini ölçer. Poz süresi, ISO/gain ve sıcaklık light karelerle eşleşmezse dark kare düzeltmek yerine gürültü ekler.',
    ],
  },
  {
    slug: 'flat-kare',
    title: 'Flat kare',
    category: 'isleme',
    summary:
      'Düzgün aydınlatılmış bir yüzeye çekilen, optik yolun aydınlatma farklarını ölçen kalibrasyon karesi.',
    body: [
      'Vinyetlemeyi ve toz gölgelerini düzeltir. Odak ve kamera dönüşü light karelerle AYNI kalmalıdır; kamera söküldükten sonra çekilen flat, toz gölgelerini yanlış yere düşürür.',
    ],
  },
  {
    slug: 'bias-kare',
    title: 'Bias kare',
    category: 'isleme',
    summary:
      'Mümkün olan en kısa pozla, kapak kapalıyken çekilen ve okuma gürültüsünün taban seviyesini ölçen kare.',
    body: [
      'Sensörün her okumada eklediği sabit seviyeyi tarif eder. Bazı işleme akışlarında dark kareler bias içerdiği için ayrıca kullanılmaz.',
    ],
  },
  {
    slug: 'yigin',
    title: 'Yığınlama (stacking)',
    category: 'isleme',
    summary:
      'Çok sayıda pozu hizalayıp birleştirerek sinyal-gürültü oranını yükseltme.',
    body: [
      'Rastgele gürültü karelerin sayısıyla birlikte göreli olarak azalır; sinyal ise korunur. Bu yüzden toplam entegrasyon süresi, tek bir uzun pozdan çok daha belirleyicidir.',
    ],
  },
  {
    slug: 'narrowband',
    title: 'Narrowband',
    category: 'isleme',
    summary:
      'Yalnızca belirli emisyon dalga boylarını (Hα, OIII, SII) geçiren dar bantlı filtrelerle çekim.',
    body: [
      'Işık kirliliğinin ve Ay ışığının büyük bölümünü eler; bu yüzden şehirde ve dolunayda bile emisyon bulutsusu çekilebilir. Yansıma bulutsuları ve galaksiler için uygun değildir — onlar geniş bantta ışır.',
    ],
  },
  {
    slug: 'meridyen-donusu',
    title: 'Meridyen dönüşü',
    category: 'gokyuzu',
    summary:
      'Ekvatoral montajın, hedef meridyeni geçtiğinde teleskopu ayağa çarpmamak için ters tarafa çevirmesi.',
    body: [
      'Dönüşten sonra kadraj 180° dönmüş olur; işleme sırasında kareler buna göre hizalanmalıdır. Dönüş anı planlanmazsa gecenin ortasında çekim kesilir.',
    ],
  },
  {
    slug: 'transit',
    title: 'Transit (kulminasyon)',
    category: 'gokyuzu',
    summary:
      'Bir gök cisminin gökyüzündeki en yüksek noktaya, gözlemcinin meridyenine ulaştığı an.',
    body: [
      'Hedef transit anında en az atmosfer katmanından geçtiği için en net görünür. Gece planı genellikle hedeflerin transit saatlerine göre sıralanır.',
    ],
  },
  {
    slug: 'astronomik-karanlik',
    title: 'Astronomik karanlık',
    category: 'gokyuzu',
    summary:
      'Güneş ufkun 18° altına indiğinde başlayan, gökyüzünün alacakaranlık katkısından tamamen arındığı dönem.',
    body: [
      'Yaz aylarında Türkiye\'nin kuzeyinde bu pencere kısalır, bazı enlemlerde hiç oluşmaz. Sönük hedefler için kullanılabilir sürenin gerçek ölçüsü budur.',
    ],
  },
];

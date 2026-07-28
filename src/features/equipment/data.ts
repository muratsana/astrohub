import type { ConnectionStandard } from '@/domain/equipment/connections';

/** Ekipman veritabanı tohum verisi (§8.3). Admin panelinden veritabanına taşınır. */

/**
 * KATEGORİLER — görüntüleme zincirinin tamamı.
 *
 * Liste, bir astrofotoğraf kurulumunda ışığın izlediği sırayı takip
 * ediyor: optik → düzeltici/uzatıcı → filtre → kamera, ve bunları taşıyan
 * montür + odaklayıcı + kontrol. Alfabetik sıralamak, "reducer" ile
 * "oküler"i yan yana koyup zinciri okunmaz hâle getirirdi.
 *
 * Reducer ve barlow ayrı kategoriler çünkü ikisi de efektif odağı
 * değiştirir ve setup hesabına doğrudan girer; aksesuar kutusuna
 * atılsalardı FOV hesabı onları görmezdi.
 */
export type EquipmentCategory =
  | 'optik-tup'
  | 'lens'
  | 'reducer'
  | 'barlow'
  | 'filtre'
  | 'filtre-carki'
  | 'astro-kamera'
  | 'fotograf-makinesi'
  | 'okuler'
  | 'montur'
  | 'odaklayici'
  | 'guide'
  | 'kontrol'
  | 'aksesuar';

export const equipmentCategoryLabels: Record<EquipmentCategory, string> = {
  'optik-tup': 'Optik Tüp',
  lens: 'Fotoğraf Lensi',
  reducer: 'Reducer / Düzeltici',
  barlow: 'Barlow / Uzatıcı',
  filtre: 'Filtre',
  'filtre-carki': 'Filtre Çarkı',
  'astro-kamera': 'Astro Kamera',
  'fotograf-makinesi': 'Fotoğraf Makinesi',
  okuler: 'Oküler',
  montur: 'Montür',
  odaklayici: 'Odaklayıcı',
  guide: 'Guide Sistemi',
  kontrol: 'Kontrol ve Güç',
  aksesuar: 'Aksesuar',
};

/** Kategori sırası — arayüzdeki gruplamalar bu diziyi kullanır. */
export const equipmentCategoryOrder = Object.keys(
  equipmentCategoryLabels
) as EquipmentCategory[];

/**
 * Üretim durumu.
 *
 * "Bilinmiyor" ayrı bir değer: üretimden kalktığını doğrulayamadığımız bir
 * ürünü "güncel" saymak, ikinci el fiyatı araştıran kullanıcıyı yanıltır.
 */
export type ProductionStatus =
  | 'guncel'
  | 'uretimi-durduruldu'
  | 'eski-model'
  | 'bilinmiyor';

export const productionStatusLabels: Record<ProductionStatus, string> = {
  guncel: 'Güncel',
  'uretimi-durduruldu': 'Üretimi durduruldu',
  'eski-model': 'Eski model',
  bilinmiyor: 'Bilinmiyor',
};

/**
 * Teknik veri güven seviyesi.
 *
 * Katalogdaki her sayı aynı ağırlıkta değil: üreticinin datasheet'inden
 * gelen bir backfocus ile forumdan derlenmiş bir değer aynı yerde
 * durmamalı. Hesaplama motoru bu seviyeyi sonuca taşıyor, böylece
 * kullanıcı bir uyarının ne kadar sağlam bir veriye dayandığını görüyor.
 */
export type DataConfidence = 'dogrulanmis' | 'tek-kaynak' | 'inceleme-gerekli';

export const confidenceLabels: Record<DataConfidence, string> = {
  dogrulanmis: 'Üretici kaynağından doğrulandı',
  'tek-kaynak': 'Tek kaynaktan alındı',
  'inceleme-gerekli': 'Kaynaklar çelişiyor — inceleme gerekli',
};

/**
 * Setup zincirinde kullanılan optik ve mekanik ölçüler.
 *
 * HEPSİ İSTEĞE BAĞLI VE TAHMİN EDİLMEZ. Bir alan boşsa hesaplama motoru
 * o kontrolü "veri yetersiz" olarak işaretler; yaygın bir değeri varsayıp
 * hesabı tamamlamak, kullanıcıya kurulamayacak bir zinciri "uyumlu" diye
 * göstermek olurdu.
 */
export interface EquipmentOptics {
  /** Işığın geçtiği net açıklık, mm — vinyet hesabının girdisi. */
  clearApertureMm?: number;
  /** Düzeltilmiş görüntü çemberi çapı, mm. */
  imageCircleMm?: number;
  /** Bu parçanın optik yola kattığı uzunluk, mm (OAG, filtre çarkı, ara halka). */
  opticalLengthMm?: number;
  /** Düzelticinin sensöre kadar istediği mesafe, mm. */
  requiredBackfocusMm?: number;
  /** Kameranın flanş–sensör mesafesi, mm. */
  flangeDistanceMm?: number;
  /** Reducer (<1) ya da barlow (>1) çarpanı. */
  factor?: number;
  /** Filtre camının kalınlığı, mm — optik yolu ~1/3'ü kadar uzatır. */
  filterThicknessMm?: number;
  /** OAG prizmasının ölçüsü, mm — guide kamerası sensörüyle karşılaştırılır. */
  prismSizeMm?: number;
}

export interface EquipmentSource {
  kind: 'uretici' | 'datasheet' | 'kilavuz' | 'distributor' | 'arsiv';
  label: string;
  url?: string;
}

export interface EquipmentModel {
  /**
   * Veritabanı kimliği — yalnızca katalog veritabanından geldiğinde dolu.
   * Tohum dizide yok, çünkü tohum kayıtların UUID'si yok ve uydurmak,
   * var olmayan bir satıra referans üretmek olurdu. Yükleme akışı
   * kimliği bulamazsa ekipman bağını kurmuyor, adı künyede saklıyor.
   */
  id?: string;
  slug: string;
  brand: string;
  model: string;
  category: EquipmentCategory;
  /** Kategoriye göre değişen öne çıkan teknik özellikler (§9.2 iki katman) */
  specs: Record<string, string>;
  priceHint?: string; // yaklaşık segment
  /** Modelin ne işe yaradığını ve kime uygun olduğunu anlatan kısa metin. */
  summary?: string;
  /** Bu modelle çalışırken bilinmesi gereken pratik notlar. */
  notes?: string[];

  /* ── Setup zinciri için teknik alanlar ── */

  /**
   * Işığın giriş ve çıkış bağlantısı.
   *
   * `input` ışığın parçaya girdiği taraf (teleskoba bakan), `output`
   * kameraya bakan taraf. Kamera yalnızca `input` taşır, teleskop yalnızca
   * `output`. Bilinmiyorsa alan yok — uyumluluk kontrolü bunu "veri
   * yetersiz" sayar.
   */
  connections?: { input?: ConnectionStandard; output?: ConnectionStandard };
  optics?: EquipmentOptics;

  /* ── Kaynak ve doğrulama ── */

  productionStatus?: ProductionStatus;
  releaseYear?: number;
  discontinuedYear?: number;
  /** Teknik değerlerin alındığı kaynaklar. */
  sources?: EquipmentSource[];
  /** Verinin son doğrulandığı tarih (ISO). */
  verifiedAt?: string;
  confidence?: DataConfidence;
  /**
   * Ürün görseli.
   *
   * ÜRETİCİ FOTOĞRAFLARI KOPYALANMIYOR. Teleskop ve kamera üreticilerinin
   * ürün görselleri telifli ve çoğu katalog "yalnızca bayi kullanımı"
   * diyor; siteye kopyalamak izinsiz kullanım olurdu. Bu alan yalnızca
   * serbest lisanslı bir görsel varsa (ör. Wikimedia Commons) ya da
   * yönetici izinli bir görsel eklediğinde dolar.
   *
   * Boşsa kart, kategoriye özel çizilmiş bir simge gösterir — kırık
   * görsel ikonu ya da boş kutu değil.
   */
  image?: { url: string; credit: string; license: string };
}

export const equipment: EquipmentModel[] = [
  {
    slug: 'sw-evostar-80ed',
    brand: 'Sky-Watcher',
    model: 'Evostar 80ED',
    category: 'optik-tup',
    specs: { 'Açıklık': '80 mm', 'Odak': '600 mm', 'f/': '7.5', 'Tip': 'İkili ED', 'Ağırlık': '3.6 kg', 'Backfocus': '55 mm' },
    priceHint: 'Giriş segment',
    summary:
      'ED camlı ikili apokromatik; 600 mm odakla hem orta boy bulutsulara hem küçük galaksilere yeter. Astrofoto için 0.85x reducer ile 510 mm f/6.4\'e iner.',
    notes: [
      'Reducer olmadan kadraj köşelerinde alan eğriliği görünür.',
      'Odaklayıcı standart 2 inç; ağır kamera yükünde sarkma yapabilir.',
    ],
    connections: { output: '2in' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'wo-zs73-iii',
    brand: 'William Optics',
    model: 'ZenithStar 73 III',
    category: 'optik-tup',
    specs: { 'Açıklık': '73 mm', 'Odak': '430 mm', 'f/': '5.9', 'Tip': 'İkili APO', 'Ağırlık': '2.4 kg', 'Backfocus': '55 mm' },
    priceHint: 'Orta segment',
    summary:
      'Taşınabilir 73 mm ikili APO; Flat73A düzelticisiyle tam kareye kadar düz alan verir.',
    connections: { output: 'M48x0.75' },
    optics: { requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'wo-gt81-iii',
    brand: 'William Optics',
    model: 'GT81 III',
    category: 'optik-tup',
    specs: { 'Açıklık': '81 mm', 'Odak': '478 mm', 'f/': '5.9', 'Tip': 'Üçlü APO', 'Ağırlık': '3.6 kg', 'Backfocus': '55 mm' },
    priceHint: 'Orta segment',
    summary:
      'Üçlü APO camla renk hatası pratikte kaybolur; 478 mm odak geniş alanla detay arasında iyi bir orta nokta.',
    connections: { output: 'M48x0.75' },
    optics: { requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'askar-fra600',
    brand: 'Askar',
    model: 'FRA600',
    category: 'optik-tup',
    specs: { 'Açıklık': '108 mm', 'Odak': '600 mm', 'f/': '5.6', 'Tip': 'Beşli Petzval', 'Ağırlık': '5.5 kg', 'Backfocus': '55 mm' },
    priceHint: 'Üst segment',
    summary:
      'Petzval tasarımı düzeltici gerektirmez: kutudan çıktığı hâliyle tam kare sensörde düz alan verir. 0.7x reducer ile 420 mm f/3.9\'a iner.',
    notes: [
      'Petzval olduğu için ayrı flattener alınmaz — toplam maliyeti düşürür.',
      '5.5 kg tüp, 13 kg sınıfı montür ister.',
    ],
    connections: { output: 'M54x0.75' },
    optics: { imageCircleMm: 44, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'askar-107phq',
    brand: 'Askar',
    model: '107PHQ',
    category: 'optik-tup',
    specs: { 'Açıklık': '107 mm', 'Odak': '749 mm', 'f/': '7', 'Tip': 'Dörtlü APO', 'Ağırlık': '6.5 kg', 'Backfocus': '55 mm' },
    priceHint: 'Üst segment',
    summary:
      'Dörtlü tasarım; 749 mm odakla galaksi ve küçük bulutsu hedeflerinde detay verir.',
    connections: { output: 'M54x0.75' },
    optics: { imageCircleMm: 44, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'takahashi-fsq106edx4',
    brand: 'Takahashi',
    model: 'FSQ-106EDX4',
    category: 'optik-tup',
    specs: { 'Açıklık': '106 mm', 'Odak': '530 mm', 'f/': '5', 'Tip': 'Petzval APO', 'Ağırlık': '7.2 kg', 'Backfocus': '56 mm' },
    priceHint: 'Profesyonel',
    summary:
      'Astrofotoğrafta referans kabul edilen Petzval astrograf; 88 mm görüntü dairesi orta format sensörü bile örter.',
    notes: [
      'Kutudan f/5; 645 reducer ile 380 mm f/3.6\'ya iner.',
      'Fiyatı çoğu montürün üzerinde — bütçe planı buna göre yapılmalı.',
    ],
    connections: { output: 'Takahashi M56' },
    optics: { imageCircleMm: 88, requiredBackfocusMm: 56 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'takahashi-fc100dz',
    brand: 'Takahashi',
    model: 'FC-100DZ',
    category: 'optik-tup',
    specs: { 'Açıklık': '100 mm', 'Odak': '800 mm', 'f/': '8', 'Tip': 'İkili florit', 'Ağırlık': '4.4 kg', 'Backfocus': '56 mm' },
    priceHint: 'Profesyonel',
    summary:
      'Florit ikili; gezegen ve çift yıldız gözlemi için keskinlik referansı. Astrofotoda reducer ile kullanılır.',
    connections: { output: 'Takahashi M56' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'celestron-edgehd-925',
    brand: 'Celestron',
    model: 'EdgeHD 925',
    category: 'optik-tup',
    specs: { 'Açıklık': '235 mm', 'Odak': '2350 mm', 'f/': '10', 'Tip': 'Schmidt-Cassegrain', 'Ağırlık': '9.5 kg', 'Backfocus': '133 mm' },
    priceHint: 'Üst segment',
    summary:
      'Alan düzleştirmeli SCT; uzun odakta küçük galaksiler ve gezegenimsi bulutsular için. 0.7x reducer ile 1645 mm f/7.',
    notes: [
      'Uzun odak, 1 yay saniyesinin altında guiding hatası ister.',
      'Soğuma süresi uzundur; kurulumdan en az 45 dakika önce dışarı çıkarılmalı.',
    ],
    connections: { output: 'Celestron EdgeHD' },
    optics: { imageCircleMm: 42, requiredBackfocusMm: 133.35 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'celestron-c11',
    brand: 'Celestron',
    model: 'C11 (11\\" SCT)',
    category: 'optik-tup',
    specs: { 'Açıklık': '280 mm', 'Odak': '2800 mm', 'f/': '10', 'Tip': 'Schmidt-Cassegrain', 'Ağırlık': '12.5 kg', 'Backfocus': '105 mm' },
    priceHint: 'Üst segment',
    summary:
      '280 mm açıklık, gezegen görüntülemede çözünürlük sınırını yükseltir. Derin uzayda uzun odak nedeniyle sabır ister.',
    connections: { output: 'Celestron SCT' },
    optics: { requiredBackfocusMm: 105 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'gso-rc8',
    brand: 'GSO',
    model: 'RC8 Ritchey-Chrétien',
    category: 'optik-tup',
    specs: { 'Açıklık': '203 mm', 'Odak': '1624 mm', 'f/': '8', 'Tip': 'Ritchey-Chrétien', 'Ağırlık': '8.2 kg', 'Backfocus': '55 mm' },
    priceHint: 'Orta segment',
    summary:
      'Profesyonel gözlemevlerinin optik tasarımının ekonomik sürümü; koma yok, ama kolimasyon disiplini ister.',
    notes: [
      'Kolimasyonu hassastır ve nakliyede bozulabilir.',
      'Alan düzleştirici olmadan köşelerde alan eğriliği kalır.',
    ],
    connections: { output: 'M90x1' },
    optics: { requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'es-ed102',
    brand: 'Explore Scientific',
    model: 'ED102 FCD-100',
    category: 'optik-tup',
    specs: { 'Açıklık': '102 mm', 'Odak': '714 mm', 'f/': '7', 'Tip': 'Üçlü APO', 'Ağırlık': '5.4 kg', 'Backfocus': '55 mm' },
    priceHint: 'Orta segment',
    summary:
      'FCD-100 camlı üçlü; 714 mm odakla hem görsel hem fotoğrafik kullanıma uygun.',
    connections: { output: '2in' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sharpstar-61edph-iii',
    brand: 'Sharpstar',
    model: '61EDPH III',
    category: 'optik-tup',
    specs: { 'Açıklık': '61 mm', 'Odak': '335 mm', 'f/': '5.5', 'Tip': 'Üçlü APO', 'Ağırlık': '1.6 kg', 'Backfocus': '55 mm' },
    priceHint: 'Giriş segment',
    summary:
      'Sırt çantasına giren 61 mm üçlü; 335 mm odakta çok geniş kadraj. İlk astrograf olarak sık önerilir.',
    connections: { output: 'M48x0.75' },
    optics: { requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sw-150pds',
    brand: 'Sky-Watcher',
    model: '150PDS Newton',
    category: 'optik-tup',
    specs: { 'Açıklık': '150 mm', 'Odak': '750 mm', 'f/': '5', 'Tip': 'Newton', 'Ağırlık': '5.6 kg', 'Backfocus': '55 mm' },
    priceHint: 'Giriş segment',
    summary:
      'Fotoğrafa uygun odaklayıcılı 6 inç Newton; açıklık başına en ucuz sinyal.',
    notes: [
      'Koma düzeltici (MPCC/GPU) neredeyse zorunludur.',
      'Her kurulumda kolimasyon kontrolü gerekir.',
    ],
    connections: { output: '2in' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'celestron-nexstar-6se',
    brand: 'Celestron',
    model: 'NexStar 6SE',
    category: 'optik-tup',
    specs: { 'Açıklık': '150 mm', 'Odak': '1500 mm', 'f/': '10', 'Tip': 'Schmidt-Cassegrain', 'Ağırlık': '9.5 kg', 'Backfocus': '105 mm' },
    priceHint: 'Giriş segment',
    summary:
      'Tek parça GoTo SCT; gezegen ve Ay görüntülemede taşınabilir bir başlangıç.',
    notes: [
      'Altazimut kaide uzun pozda alan dönmesi yapar; derin uzay için ekvatoryal kama gerekir.',
    ],
    connections: { output: 'Celestron SCT' },
    optics: { requiredBackfocusMm: 105 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sigma-105mm-f14-art',
    brand: 'Sigma',
    model: '105mm f/1.4 DG HSM Art',
    category: 'lens',
    specs: { 'Odak': '105 mm', 'Açıklık': '75 mm', 'f/': '1.4', 'Bağlantı': 'EF / E / L', 'Ağırlık': '1.6 kg', 'Backfocus': '0 mm' },
    priceHint: 'Üst segment',
    summary:
      'Çok hızlı orta tele; f/2\'ye kısıldığında yıldızlar köşelere kadar toparlanır. Geniş alan mozaiklerinde sık kullanılır.',
    notes: [
      '1.6 kg ağırlık, hafif takip montürlerinde denge sorunu yapar.',
    ],
    connections: { output: 'Canon EF' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'samyang-14mm-f28',
    brand: 'Samyang',
    model: '14mm f/2.8 MF',
    category: 'lens',
    specs: { 'Odak': '14 mm', 'Açıklık': '5 mm', 'f/': '2.8', 'Bağlantı': 'EF / F / E', 'Ağırlık': '0.55 kg', 'Backfocus': '0 mm' },
    priceHint: 'Giriş segment',
    summary:
      'Manzara ve Samanyolu panoramaları için ekonomik ultra geniş açı.',
    connections: { output: 'Canon EF' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'canon-ef-200mm-f28l',
    brand: 'Canon',
    model: 'EF 200mm f/2.8L II USM',
    category: 'lens',
    specs: { 'Odak': '200 mm', 'Açıklık': '71 mm', 'f/': '2.8', 'Bağlantı': 'EF', 'Ağırlık': '0.77 kg', 'Backfocus': '0 mm' },
    priceHint: 'Orta segment',
    summary:
      'Sabit 200 mm L serisi; f/4\'e kısılınca astrofoto için temiz yıldız gösterir.',
    connections: { output: 'Canon EF' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sony-fe-20mm-f18g',
    brand: 'Sony',
    model: 'FE 20mm f/1.8 G',
    category: 'lens',
    specs: { 'Odak': '20 mm', 'Açıklık': '11 mm', 'f/': '1.8', 'Bağlantı': 'E', 'Ağırlık': '0.37 kg', 'Backfocus': '0 mm' },
    priceHint: 'Orta segment',
    summary:
      'Gece manzarası için hızlı geniş açı; köşe koması düşük.',
    connections: { output: 'Sony E' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sigma-40mm-f14-art',
    brand: 'Sigma',
    model: '40mm f/1.4 DG HSM Art',
    category: 'lens',
    specs: { 'Odak': '40 mm', 'Açıklık': '29 mm', 'f/': '1.4', 'Bağlantı': 'EF / E / L', 'Ağırlık': '1.2 kg', 'Backfocus': '0 mm' },
    priceHint: 'Üst segment',
    summary:
      'Sinema serisi optik kalitesi; Samanyolu panellerinde yıldız şişmesi çok düşük.',
    connections: { output: 'Canon EF' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'celestron-reducer-07x-edgehd8',
    brand: 'Celestron',
    model: '0.7x Reducer (EdgeHD 8\\")',
    category: 'reducer',
    specs: { 'Çarpan': '0.7x', 'Uyum': 'EdgeHD 8\\"', 'Sonuç odak': '1422 mm', 'Sonuç f/': '7' },
    priceHint: 'Orta segment',
    summary:
      'EdgeHD 8 inçi f/10\'dan f/7\'ye indirir: aynı sinyal için poz süresi yarıya iner.',
    notes: [
      'Yalnızca EdgeHD 8 inç ile uyumlu; diğer SCT\'lerde alan bozulur.',
    ],
    connections: { input: 'Celestron EdgeHD', output: 'M42x0.75' },
    optics: { factor: 0.7, requiredBackfocusMm: 105, imageCircleMm: 42 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'starizona-nexus-075x',
    brand: 'Starizona',
    model: 'Nexus 0.75x',
    category: 'reducer',
    specs: { 'Çarpan': '0.75x', 'Uyum': 'f/4 Newton', 'Sonuç f/': '3', 'Backfocus': '55 mm' },
    priceHint: 'Üst segment',
    summary:
      'f/4 Newton\'u f/3\'e indiren reducer-düzeltici; hızlı sistemlerde toplam süreyi ciddi kısaltır.',
    notes: [
      'Backfocus toleransı ±1 mm; ara halkalar tam ölçülmeli.',
    ],
    connections: { input: '2in', output: 'M48x0.75' },
    optics: { factor: 0.75, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'wo-flat6aiii',
    brand: 'William Optics',
    model: 'Flat6AIII Flattener',
    category: 'reducer',
    specs: { 'Çarpan': '1.0x', 'Uyum': 'ZS73 / GT81', 'Backfocus': '55 mm' },
    priceHint: 'Orta segment',
    summary:
      'Odağı değiştirmeden alanı düzleştirir; tam kare sensörde köşe yıldızlarını toparlar.',
    connections: { input: 'M48x0.75', output: 'M48x0.75' },
    optics: { factor: 1.0, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'askar-reducer-07x-fra400',
    brand: 'Askar',
    model: '0.7x Reducer (FRA400/600)',
    category: 'reducer',
    specs: { 'Çarpan': '0.7x', 'Uyum': 'FRA400 / FRA600', 'Sonuç odak': '280 mm', 'Sonuç f/': '3.9' },
    priceHint: 'Orta segment',
    summary:
      'FRA400\'ü 280 mm f/3.9\'a indirir; geniş alan dar bant çalışmaları için hızlı bir kombinasyon.',
    connections: { input: 'M54x0.75', output: 'M48x0.75' },
    optics: { factor: 0.7, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sw-reducer-085x',
    brand: 'Sky-Watcher',
    model: '0.85x Reducer/Corrector',
    category: 'reducer',
    specs: { 'Çarpan': '0.85x', 'Uyum': 'Evostar 80ED', 'Sonuç odak': '510 mm', 'Sonuç f/': '6.4' },
    priceHint: 'Giriş segment',
    summary:
      'Evostar 80ED için hem odak kısaltıcı hem alan düzleştirici.',
    connections: { input: '2in', output: 'M48x0.75' },
    optics: { factor: 0.85, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'takahashi-645-reducer',
    brand: 'Takahashi',
    model: '645 Reducer QE 0.72x',
    category: 'reducer',
    specs: { 'Çarpan': '0.72x', 'Uyum': 'FSQ-106', 'Sonuç odak': '380 mm', 'Sonuç f/': '3.6' },
    priceHint: 'Profesyonel',
    summary:
      'FSQ-106\'yı f/3.6\'ya indirir; dar bant projelerinde toplam süreyi yarıdan fazla kısaltır.',
    connections: { input: 'Takahashi M56', output: 'M54x0.75' },
    optics: { factor: 0.72, requiredBackfocusMm: 56, imageCircleMm: 88 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'baader-mpcc-mk3',
    brand: 'Baader',
    model: 'MPCC Mark III Koma Düzeltici',
    category: 'reducer',
    specs: { 'Çarpan': '1.0x', 'Uyum': 'f/4–f/6 Newton', 'Backfocus': '55 mm' },
    priceHint: 'Giriş segment',
    summary:
      'Newton komasını düzelten standart çözüm; odağı değiştirmez.',
    notes: [
      'Backfocus 55 mm — T2 halka zinciri buna göre kurulmalı.',
    ],
    connections: { input: '2in', output: 'M48x0.75' },
    optics: { factor: 1.0, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'ts-gpu-coma-corrector',
    brand: 'TS-Optics',
    model: 'GPU Koma Düzeltici',
    category: 'reducer',
    specs: { 'Çarpan': '1.0x', 'Uyum': 'f/4–f/5 Newton', 'Backfocus': '55 mm' },
    priceHint: 'Orta segment',
    summary:
      'Hızlı Newton\'larda MPCC\'ye göre daha geniş düz alan verir.',
    connections: { input: '2in', output: 'M48x0.75' },
    optics: { factor: 1.0, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'gso-reducer-075x-rc',
    brand: 'GSO',
    model: '0.75x CCD Reducer (RC)',
    category: 'reducer',
    specs: { 'Çarpan': '0.75x', 'Uyum': 'RC8', 'Sonuç odak': '1218 mm', 'Sonuç f/': '6' },
    priceHint: 'Giriş segment',
    summary:
      'RC8\'i 1218 mm f/6\'ya indirir ve alanı düzleştirir.',
    connections: { input: 'M90x1', output: 'M48x0.75' },
    optics: { factor: 0.75, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'televue-powermate-2x',
    brand: 'Tele Vue',
    model: 'Powermate 2x (1.25\\")',
    category: 'barlow',
    specs: { 'Çarpan': '2x', 'Bağlantı': '1.25\\"', 'Tip': 'Telesantrik' },
    priceHint: 'Orta segment',
    summary:
      'Klasik barlow\'un aksine çıkış ışını telesantriktir: kamera mesafesi değişse de çarpan sabit kalır.',
    notes: [
      'Gezegen görüntülemede f/oranını sensöre uygun seviyeye çıkarmanın standart yolu.',
    ],
    connections: { input: '1.25in', output: '1.25in' },
    optics: { factor: 2.0 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'televue-powermate-25x',
    brand: 'Tele Vue',
    model: 'Powermate 2.5x (1.25\\")',
    category: 'barlow',
    specs: { 'Çarpan': '2.5x', 'Bağlantı': '1.25\\"', 'Tip': 'Telesantrik' },
    priceHint: 'Orta segment',
    summary:
      '2x ile 4x arasındaki boşluğu doldurur; orta açıklıklı SCT\'lerde en çok kullanılan çarpan.',
    connections: { input: '1.25in', output: '1.25in' },
    optics: { factor: 2.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'televue-powermate-4x',
    brand: 'Tele Vue',
    model: 'Powermate 4x (1.25\\")',
    category: 'barlow',
    specs: { 'Çarpan': '4x', 'Bağlantı': '1.25\\"', 'Tip': 'Telesantrik' },
    priceHint: 'Orta segment',
    summary:
      'Büyük açıklıklı teleskoplarda Ay ve gezegen detayı için; seeing iyi değilse kazanç vermez.',
    notes: [
      'Aşırı büyütme boş büyütmedir: f/oranı piksel boyutunun ~5 katını aşmamalı.',
    ],
    connections: { input: '1.25in', output: '1.25in' },
    optics: { factor: 4.0 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'es-focal-extender-2x',
    brand: 'Explore Scientific',
    model: '2x Focal Extender',
    category: 'barlow',
    specs: { 'Çarpan': '2x', 'Bağlantı': '1.25\\"', 'Tip': 'Telesantrik' },
    priceHint: 'Giriş segment',
    summary:
      'Powermate\'e ekonomik alternatif; benzer telesantrik tasarım.',
    connections: { input: '1.25in', output: '1.25in' },
    optics: { factor: 2.0 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'baader-vip-barlow-2x',
    brand: 'Baader',
    model: 'VIP Barlow 2x',
    category: 'barlow',
    specs: { 'Çarpan': '2x (modüler)', 'Bağlantı': '1.25\\" / 2\\"', 'Tip': 'Modüler' },
    priceHint: 'Orta segment',
    summary:
      'Ara halkalarla çarpanı 1.3x–3x arasında değiştirilebilen modüler barlow.',
    connections: { input: '1.25in', output: '1.25in' },
    optics: { factor: 2.0 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-barlow-2x',
    brand: 'ZWO',
    model: '2x Barlow',
    category: 'barlow',
    specs: { 'Çarpan': '2x', 'Bağlantı': '1.25\\"', 'Tip': 'Akromatik' },
    priceHint: 'Giriş segment',
    summary:
      'ASI kameralarla uyumlu ekonomik barlow.',
    connections: { input: '1.25in', output: '1.25in' },
    optics: { factor: 2.0 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'antlia-alpt-5nm',
    brand: 'Antlia',
    model: 'ALP-T 5nm Dual Band',
    category: 'filtre',
    specs: { 'Bant': 'Ha 5nm + OIII 5nm', 'Ölçü': '2\\" / 36 mm', 'Tip': 'Dual band' },
    priceHint: 'Üst segment',
    summary:
      'Tek pozda Ha ve OIII toplar; renkli sensörle SHO benzeri sonuç için en sık tercih edilen filtre.',
    notes: [
      'f/4\'ten hızlı sistemlerde bant kayması nedeniyle verim düşer.',
    ],
    optics: { filterThicknessMm: 2.0 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'optolong-l-ultimate',
    brand: 'Optolong',
    model: 'L-Ultimate 3nm',
    category: 'filtre',
    specs: { 'Bant': 'Ha 3nm + OIII 3nm', 'Ölçü': '2\\"', 'Tip': 'Dual band' },
    priceHint: 'Üst segment',
    summary:
      '3nm dar bantla Ay ışığı ve şehir ışığını büyük ölçüde keser; renkli kameralarda kontrastı belirgin artırır.',
    optics: { filterThicknessMm: 2.0 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-duo-band',
    brand: 'ZWO',
    model: 'Duo-Band',
    category: 'filtre',
    specs: { 'Bant': 'Ha 18nm + OIII 10nm', 'Ölçü': '2\\"', 'Tip': 'Dual band' },
    priceHint: 'Giriş segment',
    summary:
      'Ekonomik dual band; ilk dar bant denemesi için yeterli.',
    optics: { filterThicknessMm: 2.0 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'astronomik-cls-ccd',
    brand: 'Astronomik',
    model: 'CLS-CCD',
    category: 'filtre',
    specs: { 'Bant': 'Geniş (LP)', 'Ölçü': '2\\"', 'Tip': 'Işık kirliliği' },
    priceHint: 'Giriş segment',
    summary:
      'Sodyum ve cıva lambalarının bantlarını keser; eski sokak aydınlatması olan bölgelerde işe yarar.',
    notes: [
      'Beyaz LED aydınlatmaya karşı etkisi sınırlıdır — spektrumu sürekli.',
    ],
  },
  {
    slug: 'baader-neodymium',
    brand: 'Baader',
    model: 'Neodymium Moon & Skyglow',
    category: 'filtre',
    specs: { 'Bant': 'Kontrast', 'Ölçü': '1.25\\" / 2\\"', 'Tip': 'Görsel + gezegen' },
    priceHint: 'Giriş segment',
    summary:
      'Gezegen görüntülemede kontrastı artıran neodimyum cam.',
  },
  {
    slug: 'astrodon-gen2-lrgb',
    brand: 'Astrodon',
    model: 'Gen2 E-Series LRGB Seti',
    category: 'filtre',
    specs: { 'Bant': 'L + R + G + B', 'Ölçü': '36 mm', 'Tip': 'Geniş bant seti' },
    priceHint: 'Profesyonel',
    summary:
      'Mono kamera ile renkli görüntü için referans LRGB seti; kanal geçişleri hâle üretmeyecek şekilde tasarlanmış.',
    optics: { filterThicknessMm: 3.0, clearApertureMm: 34 },
    productionStatus: 'uretimi-durduruldu',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'chroma-oiii-3nm',
    brand: 'Chroma',
    model: 'OIII 3nm',
    category: 'filtre',
    specs: { 'Bant': 'OIII 3nm', 'Ölçü': '36 mm', 'Tip': 'Dar bant' },
    priceHint: 'Profesyonel',
    summary:
      'Süpernova kalıntıları ve gezegenimsi bulutsularda belirleyici kanal.',
    optics: { filterThicknessMm: 3.0, clearApertureMm: 34 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'baader-sii-65nm',
    brand: 'Baader',
    model: 'SII 6.5nm CMOS',
    category: 'filtre',
    specs: { 'Bant': 'SII 6.5nm', 'Ölçü': '36 mm', 'Tip': 'Dar bant' },
    priceHint: 'Üst segment',
    summary:
      'SHO paletinin en zayıf sinyalli kanalı; uzun toplam süre ister.',
    optics: { filterThicknessMm: 2.0, clearApertureMm: 34 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'thousand-oaks-solar',
    brand: 'Thousand Oaks',
    model: 'Beyaz Işık Güneş Filtresi',
    category: 'filtre',
    specs: { 'Bant': 'ND 5', 'Tip': 'Güneş (ön açıklık)', 'Uyum': 'Açıklığa göre' },
    priceHint: 'Giriş segment',
    summary:
      'Teleskobun ÖNÜNE takılan güneş filtresi; leke ve fakula gözlemi için.',
    notes: [
      'Oküler ucuna takılan güneş filtreleri ısıyla çatlar ve kalıcı körlük riski taşır — yalnızca ön açıklık filtresi kullanılmalı.',
      'Her kullanımdan önce delik ve çizik kontrolü yapılmalı.',
    ],
  },
  {
    slug: 'zwo-efw-8x125',
    brand: 'ZWO',
    model: 'EFW 8x1.25\\"',
    category: 'filtre-carki',
    specs: { 'Yuva': '8 × 1.25\\"', 'Kalınlık': '20 mm', 'Bağlantı': 'USB' },
    priceHint: 'Orta segment',
    summary:
      'Sekiz yuvalı motorlu filtre çarkı; LRGB + SHO setini tek gecede kullanmayı mümkün kılar.',
    connections: { input: 'M42x0.75', output: 'M42x0.75' },
    optics: { opticalLengthMm: 20, clearApertureMm: 27 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'qhy-cfw3-m',
    brand: 'QHY',
    model: 'CFW3 M (7×36 mm)',
    category: 'filtre-carki',
    specs: { 'Yuva': '7 × 36 mm', 'Kalınlık': '21 mm', 'Bağlantı': 'USB / kamera' },
    priceHint: 'Üst segment',
    summary:
      'QHY kameralarla doğrudan bağlanır; ince gövdesi backfocus bütçesini rahatlatır.',
    connections: { input: 'M54x0.75', output: 'M54x0.75' },
    optics: { opticalLengthMm: 21, clearApertureMm: 34 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sx-usb-filter-wheel',
    brand: 'Starlight Xpress',
    model: 'USB Filtre Çarkı',
    category: 'filtre-carki',
    specs: { 'Yuva': '7 × 36 mm', 'Kalınlık': '19 mm', 'Bağlantı': 'USB' },
    priceHint: 'Üst segment',
    summary:
      'Çok ince gövde; kısa backfocus\'lu sistemlerde tercih edilir.',
    connections: { input: 'M42x0.75', output: 'M42x0.75' },
    optics: { opticalLengthMm: 19, clearApertureMm: 34 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-asi6200mm',
    brand: 'ZWO',
    model: 'ASI6200MM Pro',
    category: 'astro-kamera',
    specs: { 'Sensör': 'IMX455 mono', 'Piksel': '3.76 µm', 'Çözünürlük': '9576×6388', 'Soğutma': '-35°C delta', 'Ağırlık': '0.7 kg', 'Backfocus': '17.5 mm' },
    priceHint: 'Profesyonel',
    summary:
      'Tam kare mono CMOS; 62 megapiksel ve 16 bit ADC ile geniş alan mozaiklerinde panel sayısını düşürür.',
    notes: [
      'Tam kare alan, düzeltici seçimini kritik hâle getirir.',
      'Dosya boyutları büyüktür; gece başına 40–60 GB olağandır.',
    ],
    connections: { input: 'M42x0.75' },
    optics: { flangeDistanceMm: 17.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-asi1600mm',
    brand: 'ZWO',
    model: 'ASI1600MM Pro',
    category: 'astro-kamera',
    specs: { 'Sensör': 'IMX / Panasonic mono', 'Piksel': '3.8 µm', 'Çözünürlük': '4656×3520', 'Soğutma': '-40°C delta', 'Ağırlık': '0.41 kg', 'Backfocus': '6.5 mm' },
    priceHint: 'Orta segment',
    summary:
      'Dar bant çalışmalarına giriş yapan bir kuşağın kamerası; düşük okuma gürültüsü, küçük kuyu derinliği.',
    notes: [
      'Kuyu derinliği düşük olduğu için parlak yıldızlar kolay doyar; kısa pozla HDR harmanı gerekir.',
    ],
    connections: { input: 'M42x0.75' },
    optics: { flangeDistanceMm: 6.5 },
    productionStatus: 'uretimi-durduruldu',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-asi183mm',
    brand: 'ZWO',
    model: 'ASI183MM Pro',
    category: 'astro-kamera',
    specs: { 'Sensör': 'IMX183 mono', 'Piksel': '2.4 µm', 'Çözünürlük': '5496×3672', 'Soğutma': '-35°C delta', 'Ağırlık': '0.41 kg', 'Backfocus': '6.5 mm' },
    priceHint: 'Orta segment',
    summary:
      'Küçük piksel; kısa odaklı teleskoplarda örneklemeyi yükseltir.',
    notes: [
      '2.4 µm piksel, 1000 mm üzeri odakta aşırı örnekleme yapar.',
    ],
    connections: { input: 'M42x0.75' },
    optics: { flangeDistanceMm: 6.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'qhy-600m',
    brand: 'QHY',
    model: 'QHY600M Pro',
    category: 'astro-kamera',
    specs: { 'Sensör': 'IMX455 mono', 'Piksel': '3.76 µm', 'Çözünürlük': '9576×6388', 'Soğutma': '-35°C delta', 'Ağırlık': '0.85 kg', 'Backfocus': '17.5 mm' },
    priceHint: 'Profesyonel',
    summary:
      'Tam kare mono; entegre filtre çarkı seçenekleriyle kısa backfocus zinciri kurulabilir.',
    connections: { input: 'M54x0.75' },
    optics: { flangeDistanceMm: 17.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'player-one-uranus-c',
    brand: 'Player One',
    model: 'Uranus-C',
    category: 'astro-kamera',
    specs: { 'Sensör': 'IMX585 renkli', 'Piksel': '2.9 µm', 'Çözünürlük': '3856×2180', 'Soğutma': 'Yok', 'Ağırlık': '0.13 kg', 'Backfocus': '12.5 mm' },
    priceHint: 'Orta segment',
    summary:
      'Yüksek kare hızı ve düşük gürültü; gezegen ve Ay görüntülemede tercih edilir.',
    connections: { input: '1.25in' },
    optics: { flangeDistanceMm: 12.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-asi715mc',
    brand: 'ZWO',
    model: 'ASI715MC',
    category: 'astro-kamera',
    specs: { 'Sensör': 'IMX715 renkli', 'Piksel': '1.45 µm', 'Çözünürlük': '3864×2180', 'Soğutma': 'Yok', 'Ağırlık': '0.12 kg', 'Backfocus': '12.5 mm' },
    priceHint: 'Giriş segment',
    summary:
      'Çok küçük piksel; uzun odaklı SCT\'lerde barlow\'suz yüksek örnekleme sağlar.',
    connections: { input: '1.25in' },
    optics: { flangeDistanceMm: 12.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'canon-eos-ra',
    brand: 'Canon',
    model: 'EOS Ra',
    category: 'fotograf-makinesi',
    specs: { 'Sensör': 'Tam kare CMOS', 'Piksel': '5.36 µm', 'Çözünürlük': '6720×4480', 'Bağlantı': 'RF', 'Ağırlık': '0.66 kg', 'Backfocus': '20 mm' },
    priceHint: 'Üst segment',
    summary:
      'Fabrikada Ha geçirgenliği dört kat artırılmış astrofotoğraf sürümü; modifiye gerektirmez.',
    notes: [
      'Ha duyarlılığı yüksek olduğu için gündüz fotoğrafında beyaz dengesi kayar.',
    ],
    connections: { input: 'Canon RF' },
    optics: { flangeDistanceMm: 20 },
    productionStatus: 'uretimi-durduruldu',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'canon-eos-r6-ii',
    brand: 'Canon',
    model: 'EOS R6 Mark II',
    category: 'fotograf-makinesi',
    specs: { 'Sensör': 'Tam kare CMOS', 'Piksel': '5.94 µm', 'Çözünürlük': '6000×4000', 'Bağlantı': 'RF', 'Ağırlık': '0.67 kg', 'Backfocus': '20 mm' },
    priceHint: 'Üst segment',
    summary:
      'Büyük piksel, düşük gürültü; gece manzarası ve geniş alan için güçlü bir gövde.',
    connections: { input: 'Canon RF' },
    optics: { flangeDistanceMm: 20 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'nikon-z6-iii',
    brand: 'Nikon',
    model: 'Z6 III',
    category: 'fotograf-makinesi',
    specs: { 'Sensör': 'Tam kare CMOS', 'Piksel': '5.94 µm', 'Çözünürlük': '6048×4032', 'Bağlantı': 'Z', 'Ağırlık': '0.76 kg', 'Backfocus': '16 mm' },
    priceHint: 'Üst segment',
    summary:
      'Kısmen yığılmış sensör; uzun pozda ısı gürültüsü kontrollü.',
    connections: { input: 'Nikon Z' },
    optics: { flangeDistanceMm: 16 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sony-a7-iv',
    brand: 'Sony',
    model: 'A7 IV',
    category: 'fotograf-makinesi',
    specs: { 'Sensör': 'Tam kare CMOS', 'Piksel': '5.12 µm', 'Çözünürlük': '7008×4672', 'Bağlantı': 'E', 'Ağırlık': '0.66 kg', 'Backfocus': '18 mm' },
    priceHint: 'Üst segment',
    summary:
      '33 megapiksel tam kare; geniş alan mozaiklerinde çözünürlük avantajı verir.',
    connections: { input: 'Sony E' },
    optics: { flangeDistanceMm: 18 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'canon-eos-6d',
    brand: 'Canon',
    model: 'EOS 6D',
    category: 'fotograf-makinesi',
    specs: { 'Sensör': 'Tam kare CMOS', 'Piksel': '6.55 µm', 'Çözünürlük': '5472×3648', 'Bağlantı': 'EF', 'Ağırlık': '0.77 kg', 'Backfocus': '44 mm' },
    priceHint: 'Giriş segment',
    summary:
      'İkinci elde ulaşılabilir tam kare; büyük pikselleri sayesinde gürültü seviyesi hâlâ rekabetçi.',
    notes: [
      'Ha modifiyesi yaygın ve tersine çevrilebilir — ikinci elde modifiyeli örnekler bulunur.',
    ],
    connections: { input: 'Canon EF' },
    optics: { flangeDistanceMm: 44 },
    productionStatus: 'uretimi-durduruldu',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'televue-ethos-13',
    brand: 'Tele Vue',
    model: 'Ethos 13mm',
    category: 'okuler',
    specs: { 'Odak': '13 mm', 'Görüş alanı': '100°', 'Bağlantı': '1.25\\" / 2\\"' },
    priceHint: 'Profesyonel',
    summary:
      '100 derece görünür alan; gözü kadraja değil manzaraya bakıyormuş hissi verir.',
  },
  {
    slug: 'televue-delos-10',
    brand: 'Tele Vue',
    model: 'Delos 10mm',
    category: 'okuler',
    specs: { 'Odak': '10 mm', 'Görüş alanı': '72°', 'Bağlantı': '1.25\\"' },
    priceHint: 'Üst segment',
    summary:
      '20 mm göz mesafesi; gözlüklü gözlemciler için rahat.',
  },
  {
    slug: 'es-82-88mm',
    brand: 'Explore Scientific',
    model: '82° 8.8mm',
    category: 'okuler',
    specs: { 'Odak': '8.8 mm', 'Görüş alanı': '82°', 'Bağlantı': '1.25\\"' },
    priceHint: 'Orta segment',
    summary:
      'Geniş alanlı okülerlerde fiyat/performans dengesi.',
  },
  {
    slug: 'baader-hyperion-24',
    brand: 'Baader',
    model: 'Hyperion 24mm',
    category: 'okuler',
    specs: { 'Odak': '24 mm', 'Görüş alanı': '68°', 'Bağlantı': '1.25\\" / 2\\"' },
    priceHint: 'Orta segment',
    summary:
      'Modüler yapı; ara halkalarla odak uzunluğu değiştirilebilir.',
  },
  {
    slug: 'sw-super-plossl-25',
    brand: 'Sky-Watcher',
    model: 'Super Plössl 25mm',
    category: 'okuler',
    specs: { 'Odak': '25 mm', 'Görüş alanı': '52°', 'Bağlantı': '1.25\\"' },
    priceHint: 'Giriş segment',
    summary:
      'Teleskopla birlikte gelen standart oküler; ilk gözlemler için yeterli.',
  },
  {
    slug: 'pentax-xw-14',
    brand: 'Pentax',
    model: 'XW 14mm',
    category: 'okuler',
    specs: { 'Odak': '14 mm', 'Görüş alanı': '70°', 'Bağlantı': '1.25\\" / 2\\"' },
    priceHint: 'Profesyonel',
    summary:
      'Alan boyunca keskinlik ve 20 mm göz mesafesi; gezegen ve derin uzayda dengeli.',
  },
  {
    slug: 'sw-az-gti',
    brand: 'Sky-Watcher',
    model: 'AZ-GTi',
    category: 'montur',
    specs: { 'Yük kapasitesi': '5 kg', 'Tip': 'Altazimut (GoTo, Wi-Fi)', 'Ağırlık': '1.3 kg' },
    priceHint: 'Giriş segment',
    summary:
      'Wi-Fi üzerinden telefonla kontrol edilen taşınabilir GoTo; ekvatoryal moda dönüştürülebilir.',
    notes: [
      'Altazimut modda uzun poz alan dönmesi yapar; derin uzay için EQ modu ve kama gerekir.',
    ],
  },
  {
    slug: 'zwo-am3',
    brand: 'ZWO',
    model: 'AM3 Harmonik Montür',
    category: 'montur',
    specs: { 'Yük kapasitesi': '8 kg', 'Tip': 'Harmonik dişli (GoTo)', 'Ağırlık': '3.9 kg' },
    priceHint: 'Üst segment',
    summary:
      'Karşı ağırlık gerektirmeyen harmonik dişli; 3.9 kg gövdeyle sahaya taşımayı kolaylaştırır.',
    notes: [
      'Harmonik dişlilerde periyodik hata yüksek frekanslıdır; kısa guide pozları (1–2 sn) gerekir.',
      'Karşı ağırlık gerekmez — 8 kg kapasite karşı ağırlıksız değerdir.',
    ],
  },
  {
    slug: 'ioptron-hem27',
    brand: 'iOptron',
    model: 'HEM27',
    category: 'montur',
    specs: { 'Yük kapasitesi': '13.5 kg', 'Tip': 'Harmonik dişli (GoTo)', 'Ağırlık': '5.5 kg' },
    priceHint: 'Üst segment',
    summary:
      'Dahili kutup arama kamerası seçenekli harmonik montür.',
  },
  {
    slug: 'rainbow-astro-rst135e',
    brand: 'Rainbow Astro',
    model: 'RST-135E',
    category: 'montur',
    specs: { 'Yük kapasitesi': '20 kg', 'Tip': 'Harmonik dişli (GoTo)', 'Ağırlık': '3.4 kg' },
    priceHint: 'Profesyonel',
    summary:
      '3.4 kg gövde ile 20 kg taşıyan harmonik montür; seyahat astrofotoğrafının referansı.',
  },
  {
    slug: '10micron-gm1000',
    brand: '10Micron',
    model: 'GM1000 HPS',
    category: 'montur',
    specs: { 'Yük kapasitesi': '25 kg', 'Tip': 'Ekvatoryal (mutlak enkoder)', 'Ağırlık': '17 kg' },
    priceHint: 'Profesyonel',
    summary:
      'Mutlak enkoderli montür; doğru modelleme ile guiding olmadan uzun poz alabilir.',
    notes: [
      'Guiding\'siz çalışmak için 20+ yıldızlık gökyüzü modeli kurulması gerekir.',
    ],
  },
  {
    slug: 'pegasus-focuscube-2',
    brand: 'Pegasus Astro',
    model: 'FocusCube 2',
    category: 'odaklayici',
    specs: { 'Tip': 'Motorlu odak', 'Bağlantı': 'USB', 'Uyum': 'Çoğu odaklayıcı' },
    priceHint: 'Orta segment',
    summary:
      'Sıcaklık sensörlü motorlu odak; gece boyunca odak kaymasını otomatik telafi eder.',
  },
  {
    slug: 'moonlite-csl-25',
    brand: 'MoonLite',
    model: 'CSL 2.5\\" Odaklayıcı',
    category: 'odaklayici',
    specs: { 'Tip': 'Crayford', 'Çap': '2.5\\"', 'Taşıma': '5 kg+' },
    priceHint: 'Üst segment',
    summary:
      'Ağır kamera zincirlerinde sarkma yapmayan sağlam gövde.',
  },
  {
    slug: 'baader-steeltrack-diamond',
    brand: 'Baader',
    model: 'Steeltrack Diamond',
    category: 'odaklayici',
    specs: { 'Tip': 'Diamond Steeltrack', 'Çap': '2\\"', 'Taşıma': '6 kg' },
    priceHint: 'Üst segment',
    summary:
      'Çelik bilyeli tasarım; yüksek yükte kayma yapmaz.',
  },
  {
    slug: 'zwo-asi220mm-mini',
    brand: 'ZWO',
    model: 'ASI220MM Mini',
    category: 'guide',
    specs: { 'Sensör': 'IMX462 mono', 'Piksel': '2.9 µm', 'Çözünürlük': '1920×1080', 'Kullanım': 'Guide' },
    priceHint: 'Giriş segment',
    summary:
      'IMX462\'nin yüksek IR duyarlılığı sayesinde sönük guide yıldızlarını da yakalar.',
    connections: { input: '1.25in' },
    optics: { flangeDistanceMm: 12.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'qhy5iii-462c',
    brand: 'QHY',
    model: 'QHY5III-462C',
    category: 'guide',
    specs: { 'Sensör': 'IMX462 renkli', 'Piksel': '2.9 µm', 'Çözünürlük': '1920×1080', 'Kullanım': 'Guide + gezegen' },
    priceHint: 'Orta segment',
    summary:
      'Hem guide hem gezegen kamerası olarak kullanılır; IR bandında Venüs bulut yapısını gösterir.',
    connections: { input: '1.25in' },
    optics: { flangeDistanceMm: 12.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'askar-oag-m',
    brand: 'Askar',
    model: 'OAG-M',
    category: 'guide',
    specs: { 'Tip': 'Off-axis guider', 'Kalınlık': '10 mm', 'Prizma': '8×8 mm' },
    priceHint: 'Orta segment',
    summary:
      'İnce gövdeli off-axis guider; backfocus bütçesi dar sistemlerde tercih edilir.',
    connections: { input: 'M42x0.75', output: 'M42x0.75' },
    optics: { opticalLengthMm: 10, prismSizeMm: 8 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'wo-uniguide-50',
    brand: 'William Optics',
    model: 'UniGuide 50mm',
    category: 'guide',
    specs: { 'Açıklık': '50 mm', 'Odak': '200 mm', 'Tip': 'Guide teleskobu' },
    priceHint: 'Giriş segment',
    summary:
      'Hafif guide teleskobu; kısa odaklı ana teleskoplarda yeterli.',
    notes: [
      'Uzun odaklı ana teleskoplarda diferansiyel esneme nedeniyle OAG tercih edilmeli.',
    ],
    connections: { output: '1.25in' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-asiair-plus',
    brand: 'ZWO',
    model: 'ASIAIR Plus',
    category: 'kontrol',
    specs: { 'Tip': 'Gömülü kontrol', 'Bağlantı': 'Wi-Fi + 4×USB', 'Güç çıkışı': '4×12V' },
    priceHint: 'Orta segment',
    summary:
      'Kamera, montür, odaklayıcı ve guide\'ı tek kutudan yöneten gömülü bilgisayar; kurulumdan çekime kadar telefonla sürülür.',
    notes: [
      'Yalnızca ZWO kameralarıyla tam uyumlu; başka marka kamera desteklenmez.',
    ],
  },
  {
    slug: 'zwo-asiair-mini',
    brand: 'ZWO',
    model: 'ASIAIR Mini',
    category: 'kontrol',
    specs: { 'Tip': 'Gömülü kontrol', 'Bağlantı': 'Wi-Fi + 2×USB', 'Güç çıkışı': '2×12V' },
    priceHint: 'Giriş segment',
    summary:
      'Küçük kurulumlar için ASIAIR\'in kompakt sürümü.',
  },
  {
    slug: 'pegasus-upbv2',
    brand: 'Pegasus Astro',
    model: 'Ultimate Powerbox v2',
    category: 'kontrol',
    specs: { 'Tip': 'Güç ve dağıtım', 'Çıkış': '4×12V + 4×ayarlı', 'Ekstra': 'Çiy ısıtıcı + hava sensörü' },
    priceHint: 'Üst segment',
    summary:
      'Tek kablodan tüm kurulumu besler; çiy ısıtıcı gücünü nem ölçümüne göre otomatik ayarlar.',
    notes: [
      'Sahada kablo sayısını üçte bire indirir — takılıp montürü sarsma riskini de düşürür.',
    ],
  },
  {
    slug: 'primalucelab-eagle5',
    brand: 'PrimaLuceLab',
    model: 'Eagle 5',
    category: 'kontrol',
    specs: { 'Tip': 'Gömülü bilgisayar', 'İşletim': 'Windows', 'Güç çıkışı': '8 kanal' },
    priceHint: 'Profesyonel',
    summary:
      'Teleskoba monte edilen Windows bilgisayar; NINA ve PixInsight gibi masaüstü yazılımları sahada çalıştırır.',
  },
  {
    slug: 'mele-quieter-4c',
    brand: 'Mele',
    model: 'Quieter 4C Mini PC',
    category: 'kontrol',
    specs: { 'Tip': 'Mini bilgisayar', 'İşletim': 'Windows', 'Güç': '12V' },
    priceHint: 'Giriş segment',
    summary:
      'Fansız mini PC; 12 V ile beslenip teleskoba bantlanarak sahada NINA çalıştırılır.',
    notes: [
      'Fansız olması toz ve nem açısından avantaj; yaz gecelerinde ısınmaya dikkat edilmeli.',
    ],
  },
  {
    slug: 'adm-vixen-dovetail',
    brand: 'ADM',
    model: 'Vixen Kırlangıç Kuyruğu',
    category: 'aksesuar',
    specs: { 'Tip': 'Vixen ray', 'Uzunluk': '330 mm', 'Malzeme': 'Alüminyum' },
    priceHint: 'Giriş segment',
    summary:
      'Standart Vixen rayı; hafif tüplerde dengeyi ayarlamak için yeterli.',
  },
  {
    slug: 'bahtinov-mask',
    brand: 'Genel',
    model: 'Bahtinov Maskesi',
    category: 'aksesuar',
    specs: { 'Tip': 'Odak maskesi', 'Uyum': 'Açıklığa göre' },
    priceHint: 'Giriş segment',
    summary:
      'Parlak bir yıldızda üç ışın deseni üreterek odağı gözle ayarlanabilir hâle getirir.',
    notes: [
      'Odak kontrolünün en ucuz ve en güvenilir yolu; motorlu odak varken bile yedek olarak taşınır.',
    ],
  },
  {
    slug: 'astrozap-dew-shield',
    brand: 'AstroZap',
    model: 'Çiy Siperi',
    category: 'aksesuar',
    specs: { 'Tip': 'Çiy siperi', 'Uyum': 'Tüp çapına göre' },
    priceHint: 'Giriş segment',
    summary:
      'Ön camda çiy oluşumunu geciktirir; ısıtıcı gerekmeden geceyi kurtarabilir.',
  },
  {
    slug: 'baader-dew-heater',
    brand: 'Baader',
    model: 'Çiy Isıtıcı Bandı',
    category: 'aksesuar',
    specs: { 'Tip': 'Isıtıcı bant', 'Güç': '12V', 'Uyum': 'Tüp çapına göre' },
    priceHint: 'Giriş segment',
    summary:
      'Ön camı çiy noktasının birkaç derece üzerinde tutar.',
    notes: [
      'Fazla ısıtmak tüp içinde hava türbülansı yaratır ve keskinliği düşürür; ısıtıcı kontrolcüsüyle kullanılmalı.',
    ],
  },
  {
    slug: 'berlebach-planet-tripod',
    brand: 'Berlebach',
    model: 'Planet Ahşap Tripod',
    category: 'aksesuar',
    specs: { 'Tip': 'Tripod', 'Malzeme': 'Dişbudak ağacı', 'Taşıma': '40 kg' },
    priceHint: 'Üst segment',
    summary:
      'Ahşap gövde titreşimi metalden hızlı söndürür; rüzgârlı sahalarda fark yaratır.',
  },
  {
    slug: 'sw-esprit-100',
    brand: 'Sky-Watcher',
    model: 'Esprit 100ED',
    category: 'optik-tup',
    specs: { Açıklık: '100 mm', Odak: '550 mm', 'f/': '5.5', Tip: 'Üçlü APO' },
    priceHint: 'Üst segment',
    summary:
      'Üçlü apokromatik cam, tam kare sensörü dolduran düz alan ve 550 mm odak: kısa odak geniş alanla uzun odak detayı arasında en dengeli aralık.',
    notes: [
      'Standart backfocus 55 mm — flattener ile birlikte satılır.',
      '6.4 kg tüp ağırlığı, görüntüleme için en az 13 kg sınıfı montür ister.',
    ],
    connections: { output: 'M48x0.75' },
    optics: { imageCircleMm: 44, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'wo-redcat-51',
    brand: 'William Optics',
    model: 'RedCat 51',
    category: 'optik-tup',
    specs: {
      Açıklık: '51 mm',
      Odak: '250 mm',
      'f/': '4.9',
      Tip: 'Petzval APO',
    },
    priceHint: 'Orta segment',
    summary:
      'Petzval tasarımı sayesinde düzeltici gerektirmeyen, 250 mm odakta çok geniş alan veren taşınabilir bir astrograf. İlk ciddi astrofoto optiği olarak sık önerilir.',
    notes: [
      'Sabit odak kilidi vardır; sıcaklık değişiminde odak kayması düşüktür.',
      'Hafifliği taşınabilir montürlerle uyumlu kılar.',
    ],
    connections: { output: 'M48x0.75' },
    optics: { imageCircleMm: 44, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sw-200p-f4',
    brand: 'Sky-Watcher',
    model: '200P f/4 Newton',
    category: 'optik-tup',
    specs: { Açıklık: '203 mm', Odak: '800 mm', 'f/': '4', Tip: 'Newton' },
    priceHint: 'Orta segment',
    summary:
      'f/4 hızıyla kısa pozlarda derin sinyal toplayan 8 inç Newton. Aynı açıklıkta en ekonomik çözüm, karşılığında koma düzeltici ve kolimasyon disiplini ister.',
    notes: [
      'Koma düzeltici zorunludur; düzelticisiz köşe yıldızları kanat açar.',
      'Her kurulumda kolimasyon kontrolü gerekir.',
      "Tüp uzunluğu rüzgâra açık alanlarda guiding'i zorlar.",
    ],
    connections: { output: '2in' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sw-eq6r-pro',
    brand: 'Sky-Watcher',
    model: 'EQ6-R Pro',
    category: 'montur',
    specs: {
      'Yük kapasitesi': '20 kg',
      Tip: 'Ekvatoryal (GoTo)',
      Ağırlık: '17.7 kg',
    },
    priceHint: 'Üst segment',
    summary:
      "20 kg nominal kapasiteli belt-drive ekvatoryal montür. Orta sınıf astrofotoğrafın omurgası; 8–10 kg'lık kurulumları rahat taşır.",
    notes: [
      "Görüntüleme için gerçekçi yük sınırı ~12 kg (nominal kapasitenin %60'ı).",
      '17.7 kg gövde ağırlığı sahaya taşımayı tek başına zorlaştırır.',
    ],
  },
  {
    slug: 'ioptron-gem28',
    brand: 'iOptron',
    model: 'GEM28',
    category: 'montur',
    specs: {
      'Yük kapasitesi': '12.7 kg',
      Tip: 'Ekvatoryal (GoTo)',
      Ağırlık: '4.5 kg',
    },
    priceHint: 'Orta segment',
    summary:
      '12.7 kg kapasiteye karşılık 4.5 kg gövde: taşınabilirlik/kapasite oranı yüksek seyahat montürü.',
    notes: [
      "Kısa ve orta odaklı APO'larla iyi eşleşir.",
      "Uzun Newton'larda rüzgâr etkisi belirginleşir.",
    ],
  },
  {
    slug: 'sw-star-adventurer-gti',
    brand: 'Sky-Watcher',
    model: 'Star Adventurer GTi',
    category: 'montur',
    specs: {
      'Yük kapasitesi': '5 kg',
      Tip: 'Taşınabilir GoTo',
      Ağırlık: '2.6 kg',
    },
    priceHint: 'Giriş segment',
    summary:
      'Sırt çantasına giren GoTo takip montürü. Kamera + kısa odak lens ya da hafif bir astrograf için tasarlandı.',
    notes: [
      "5 kg nominal kapasite; görüntülemede 2.5–3 kg'ı geçmemek gerekir.",
      'Geniş alan ve Samanyolu çekimleri için yeterli.',
    ],
  },
  {
    slug: 'zwo-asi2600mm',
    brand: 'ZWO',
    model: 'ASI2600MM Pro',
    category: 'astro-kamera',
    specs: {
      Sensör: 'APS-C mono',
      Piksel: '3.76 µm',
      Çözünürlük: '6248×4176',
      Soğutma: '-35°C',
    },
    priceHint: 'Üst segment',
    summary:
      'APS-C mono sensör, 3.76 µm piksel ve düşük okuma gürültüsü. Dar bant SHO çalışmalarının referans kamerası.',
    notes: [
      'Mono sensör filtre tekerleği ve filtre seti gerektirir — bütçe hesabı kamera ile bitmez.',
      'Backfocus 17.5 mm; ara halka hesabına bunu dâhil edin.',
    ],
    connections: { input: 'M42x0.75' },
    optics: { flangeDistanceMm: 17.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-asi533mc',
    brand: 'ZWO',
    model: 'ASI533MC Pro',
    category: 'astro-kamera',
    specs: {
      Sensör: '1" renkli',
      Piksel: '3.76 µm',
      Çözünürlük: '3008×3008',
      Soğutma: '-35°C',
    },
    priceHint: 'Orta segment',
    summary:
      'Kare 1 inç renkli sensör; tek pozda renk verdiği için tek gecelik çekimlerde verimli. Kare kadraj, kompozisyonu döndürme derdinden kurtarır.',
    notes: [
      'Amp glow göstermez, kalibrasyon basittir.',
      'Küçük sensör kısa odakta dar alan demektir; mozaik ihtiyacı doğabilir.',
    ],
    connections: { input: 'M42x0.75' },
    optics: { flangeDistanceMm: 6.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'antlia-3nm-sho',
    brand: 'Antlia',
    model: '3nm SHO Seti (36mm)',
    category: 'filtre',
    specs: { 'Bant genişliği': '3 nm', Boyut: '36 mm', Set: 'Ha / OIII / SII' },
    priceHint: 'Üst segment',
    summary:
      '3 nm bant genişliği ay ışığını ve şehir parazitini büyük ölçüde keser. Bortle 6+ gökyüzünde dar bant çekimi mümkün kılar.',
    notes: [
      'Dar bant, f/4 ve altı hızlı optiklerde bant kayması yaşayabilir.',
      '36 mm boyut, APS-C sensörde vinyetlemesiz kapsama sağlar.',
    ],
    optics: { filterThicknessMm: 2.0, clearApertureMm: 34 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'optolong-lextreme',
    brand: 'Optolong',
    model: 'L-eXtreme',
    category: 'filtre',
    specs: { 'Bant genişliği': '7 nm dual', Boyut: '2"', Set: 'Ha + OIII' },
    priceHint: 'Orta segment',
    summary:
      'Ha ve OIII bantlarını tek filtrede birleştirir; renkli kameralarla tek gecede iki kanal toplamayı sağlar.',
    notes: [
      'Renkli (OSC) kameralar için tasarlandı; mono kamerada tekil filtreler daha verimli.',
      '7 nm bant, ay ışığında 3 nm kadar agresif değildir.',
    ],
    optics: { filterThicknessMm: 2.0 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-asi174mini',
    brand: 'ZWO',
    model: 'ASI174MM Mini',
    category: 'guide',
    specs: { Sensör: '1/1.2" mono', Piksel: '5.86 µm', Kullanım: 'OAG guide' },
    priceHint: 'Orta segment',
    summary:
      "5.86 µm piksel ve büyük sensör alanı, OAG'de yıldız bulmayı kolaylaştırır — dar prizma alanında en kritik özellik.",
    notes: [
      'OAG kullanımı için tasarlanmıştır; ayrı guide teleskopunda da çalışır.',
      'Büyük piksel, uzun odakta guide ölçeğini kabalaştırır.',
    ],
    connections: { input: '1.25in' },
    optics: { flangeDistanceMm: 12.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-oag-l',
    brand: 'ZWO',
    model: 'OAG-L',
    category: 'guide',
    specs: { Tip: 'Off-axis guider', Prizma: '12×12 mm', Backfocus: '16.5 mm' },
    priceHint: 'Orta segment',
    summary:
      'Off-axis guider: guide kamerayı ana optiğin ışık yolundan besler, diferansiyel esnemeyi ortadan kaldırır.',
    notes: [
      '16.5 mm backfocus tüketir — ara halka hesabını buna göre yapın.',
      'Uzun odakta ayrı guide teleskopuna göre belirgin üstündür.',
    ],
    connections: { input: 'M42x0.75', output: 'M42x0.75' },
    optics: { opticalLengthMm: 16.5, prismSizeMm: 12 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'pegasus-pocket-powerbox',
    brand: 'Pegasus Astro',
    model: 'Pocket Powerbox Advance',
    category: 'kontrol',
    specs: { Çıkış: '4× 12V + 2× dew', Kontrol: 'USB', Sensör: 'Sıcaklık/nem' },
    priceHint: 'Orta segment',
    summary:
      'Sahada kablo karmaşasını tek kutuya indirir: dört 12V çıkış, iki ısıtıcı bandı kanalı ve USB üzerinden kontrol.',
    notes: [
      'Çiy noktası sensörü ısıtıcıyı otomatik yönetir.',
      'Tek kablo ile montüre güç ve veri taşımayı mümkün kılar.',
    ],
  },

  /* ─────────────── OPTİK TÜPLER ─────────────── */
  {
    slug: 'sw-evostar-72ed',
    brand: 'Sky-Watcher',
    model: 'Evostar 72ED',
    category: 'optik-tup',
    specs: { Açıklık: '72 mm', Odak: '420 mm', 'f/': '5.8', Tip: 'İkili ED' },
    priceHint: 'Giriş segment',
    summary:
      'İlk astrograf olarak en sık önerilen ikili ED refraktör. 420 mm odak geniş alan verir, 2 kg ağırlık taşınabilir montürlerle çalışır.',
    notes: [
      'Düz alan için ayrı flattener gerekir; düzelticisiz köşelerde bozulma belirgindir.',
      'İkili cam, üçlü APO kadar renk düzeltmesi vermez — parlak yıldızlarda hafif mor hâle görülebilir.',
    ],
    connections: { output: '2in' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sw-esprit-120',
    brand: 'Sky-Watcher',
    model: 'Esprit 120ED',
    category: 'optik-tup',
    specs: { Açıklık: '120 mm', Odak: '840 mm', 'f/': '7', Tip: 'Üçlü APO' },
    priceHint: 'Üst segment',
    summary:
      '840 mm odakta üçlü apokromat: galaksi ve gezegenimsi bulutsu gibi küçük hedeflerde ölçek verirken tam kare sensörü düz alanla doldurur.',
    notes: [
      'Yaklaşık 9 kg tüp ağırlığı, görüntüleme için 20 kg sınıfı montür ister.',
      'Uzun odak, guiding hassasiyetini doğrudan artırır — OAG önerilir.',
    ],
    connections: { output: 'M48x0.75' },
    optics: { imageCircleMm: 44, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'wo-gt71',
    brand: 'William Optics',
    model: 'GT71',
    category: 'optik-tup',
    specs: { Açıklık: '71 mm', Odak: '420 mm', 'f/': '5.9', Tip: 'İkili FPL-53' },
    priceHint: 'Orta segment',
    summary:
      'FPL-53 camlı ikili apokromat; 420 mm odakla geniş alan bulutsularında dengeli bir başlangıç optiği.',
    notes: ['Flat6AII düzelticiyle f/4.9 indirgeme mümkün.'],
    connections: { output: 'M48x0.75' },
    optics: { requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'askar-fra400',
    brand: 'Askar',
    model: 'FRA400',
    category: 'optik-tup',
    specs: { Açıklık: '72 mm', Odak: '400 mm', 'f/': '5.6', Tip: 'Petzval quintuplet' },
    priceHint: 'Orta segment',
    summary:
      'Beş elemanlı Petzval tasarımı: düzeltici gerektirmez, tam kare kapsama alanı sunar. 0.7× reducer ile 280 mm f/3.9 çalışabilir.',
    notes: [
      'Düzeltici gerekmemesi backfocus hesabını basitleştirir.',
      'Reducer takıldığında kapsama alanı APS-C ile sınırlanır.',
    ],
    connections: { output: 'M54x0.75' },
    optics: { imageCircleMm: 44, requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sw-quattro-150p',
    brand: 'Sky-Watcher',
    model: 'Quattro 150P',
    category: 'optik-tup',
    specs: { Açıklık: '150 mm', Odak: '600 mm', 'f/': '4', Tip: 'Newton' },
    priceHint: 'Orta segment',
    summary:
      'f/4 hızında 6 inç Newton. Aynı açıklıkta apokromat fiyatının çok altında; karşılığında kolimasyon ve koma düzeltici disiplini ister.',
    notes: [
      'Aplanatik koma düzeltici zorunludur.',
      'Açık tüp, çiylenme ve toz açısından refraktörden hassastır.',
    ],
    connections: { output: '2in' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'celestron-edgehd-8',
    brand: 'Celestron',
    model: 'EdgeHD 8"',
    category: 'optik-tup',
    specs: { Açıklık: '203 mm', Odak: '2032 mm', 'f/': '10', Tip: 'Schmidt-Cassegrain' },
    priceHint: 'Üst segment',
    summary:
      '2032 mm odakta düz alanlı SCT. Gezegen, gezegenimsi bulutsu ve küçük galaksilerde ölçek verir; 0.7× reducer ile 1422 mm f/7 çalışır.',
    notes: [
      'Uzun odak, guiding hatasını büyütür — OAG neredeyse zorunlu.',
      'Kapalı tüp termal dengeye geç gelir; çekimden en az 45 dk önce dışarı çıkarın.',
    ],
    connections: { output: 'Celestron EdgeHD' },
    optics: { imageCircleMm: 42, requiredBackfocusMm: 133.35 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'ts-optics-photoline-130',
    brand: 'TS Optics',
    model: 'PhotoLine 130 f/7',
    category: 'optik-tup',
    specs: { Açıklık: '130 mm', Odak: '910 mm', 'f/': '7', Tip: 'Üçlü APO' },
    priceHint: 'Üst segment',
    summary:
      '130 mm açıklıkla ışık toplama ve 910 mm odakla ölçeği birleştiren üçlü apokromat; reducer ile f/5.6 çalışabilir.',
    notes: ['10 kg üzeri tüp ağırlığı, 25 kg sınıfı montür ister.'],
    connections: { output: 'M68x1' },
    optics: { requiredBackfocusMm: 55 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },

  /* ─────────────── FOTOĞRAF LENSLERİ ─────────────── */
  {
    slug: 'samyang-135mm-f2',
    brand: 'Samyang',
    model: '135mm f/2 ED UMC',
    category: 'lens',
    specs: { Odak: '135 mm', 'f/': '2.0', Bağlantı: 'Çoklu', Tip: 'Manuel odak' },
    priceHint: 'Orta segment',
    summary:
      'Geniş alan astrofotoğrafının referans lensi. f/2 hızı ve keskin köşeleriyle Ha bölgelerini kısa pozlarda çıkarır; takip montürüyle bile derin sonuç verir.',
    notes: [
      'f/2.8’e kısmak köşe yıldızlarını belirgin düzeltir.',
      'Manuel odak; canlı görüntüde parlak bir yıldızla odaklanmak gerekir.',
    ],
    connections: { output: 'Canon EF' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sigma-art-14mm-f18',
    brand: 'Sigma',
    model: 'Art 14mm f/1.8 DG HSM',
    category: 'lens',
    specs: { Odak: '14 mm', 'f/': '1.8', Bağlantı: 'Çoklu', Tip: 'Ultra geniş' },
    priceHint: 'Üst segment',
    summary:
      'Samanyolu manzara çekimlerinin en hızlı ultra geniş seçeneklerinden. 14 mm’de f/1.8, tek karede yeryüzü ve gökyüzünü birlikte tutar.',
    notes: [
      'Ön eleman kabarık; standart vidalı filtre takılamaz.',
      '1.1 kg ağırlık, hafif takip montürlerinde denge sorunu yaratır.',
    ],
    connections: { output: 'Canon EF' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'canon-rf-50mm-f18',
    brand: 'Canon',
    model: 'RF 50mm f/1.8 STM',
    category: 'lens',
    specs: { Odak: '50 mm', 'f/': '1.8', Bağlantı: 'Canon RF', Tip: 'Standart' },
    priceHint: 'Giriş segment',
    summary:
      'Ucuz ve hafif standart lens; f/2.8–f/4 aralığına kısıldığında geniş alan takım yıldız çekimleri için yeterli keskinlik verir.',
    notes: ['Tam açıkta köşelerde koma belirgindir; kısmak gerekir.'],
    connections: { output: 'Canon RF' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'nikon-z-20mm-f18',
    brand: 'Nikon',
    model: 'NIKKOR Z 20mm f/1.8 S',
    category: 'lens',
    specs: { Odak: '20 mm', 'f/': '1.8', Bağlantı: 'Nikon Z', Tip: 'Geniş açı' },
    priceHint: 'Üst segment',
    summary:
      'Köşe performansı yüksek geniş açı; 20 mm odak, Samanyolu yayını manzarayla birlikte çerçeveler ve 77 mm vidalı filtre kabul eder.',
    notes: ['Vidalı filtre kabul etmesi, ışık kirliliği filtresi kullanımını mümkün kılar.'],
    connections: { output: 'Nikon Z' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },

  /* ─────────────── MONTÜRLER ─────────────── */
  {
    slug: 'sw-heq5-pro',
    brand: 'Sky-Watcher',
    model: 'HEQ5 Pro',
    category: 'montur',
    specs: { Tip: 'Ekvatoryal (GoTo)', 'Yük kapasitesi': '11 kg', Ağırlık: '9.7 kg' },
    priceHint: 'Orta segment',
    summary:
      'Astrofotoğrafa giriş montürünün klasiği. 11 kg nominal kapasiteyle 5–6 kg’lık görüntüleme kurulumlarını taşır ve tek kişi sahaya götürebilir.',
    notes: [
      'Görüntülemede gerçekçi sınır ~6.5 kg (nominalin %60’ı).',
      'Belt-drive dönüşümü periyodik hatayı belirgin düşürür.',
    ],
  },
  {
    slug: 'zwo-am5',
    brand: 'ZWO',
    model: 'AM5 Harmonik',
    category: 'montur',
    specs: { Tip: 'Harmonik dişli (GoTo)', 'Yük kapasitesi': '20 kg', Ağırlık: '5.5 kg' },
    priceHint: 'Üst segment',
    summary:
      'Harmonik dişli montür: 5.5 kg gövdeyle karşı ağırlıksız 13 kg taşır. Taşınabilirlik/kapasite oranında sınıfının en yükseklerinden.',
    notes: [
      'Harmonik dişlide periyodik hata yüksek frekanslıdır; guiding neredeyse zorunlu.',
      'Karşı ağırlıksız kullanım rüzgârda denge marjını daraltır.',
    ],
  },
  {
    slug: 'ioptron-cem70',
    brand: 'iOptron',
    model: 'CEM70',
    category: 'montur',
    specs: { Tip: 'Merkez dengeli ekvatoryal', 'Yük kapasitesi': '31.7 kg', Ağırlık: '15.4 kg' },
    priceHint: 'Üst segment',
    summary:
      'Merkez dengeli tasarım yükü tek noktada toplar; 31.7 kg kapasiteyle uzun odaklı SCT ve büyük refraktörleri taşır.',
    notes: ['Yerleşik kutup arama kamerası seçeneği kurulum süresini kısaltır.'],
  },
  {
    slug: 'sw-eq8-r-pro',
    brand: 'Sky-Watcher',
    model: 'EQ8-R Pro',
    category: 'montur',
    specs: { Tip: 'Ekvatoryal (GoTo)', 'Yük kapasitesi': '50 kg', Ağırlık: '25.5 kg' },
    priceHint: 'Profesyonel',
    summary:
      'Sabit gözlemevi sınıfı montür. 50 kg kapasite, uzun odaklı büyük açıklıkları taşır; taşınabilirlik hedeflenmemiştir.',
    notes: ['25.5 kg gövde tek kişiyle taşınmaz; sabit kurulum içindir.'],
  },

  /* ─────────────── ASTRO KAMERALAR ─────────────── */
  {
    slug: 'zwo-asi2600mc',
    brand: 'ZWO',
    model: 'ASI2600MC Pro',
    category: 'astro-kamera',
    specs: {
      Sensör: 'APS-C renkli',
      Piksel: '3.76 µm',
      Çözünürlük: '6248×4176',
      Soğutma: '-35°C',
    },
    priceHint: 'Üst segment',
    summary:
      'ASI2600MM’in renkli kardeşi. Filtre tekerleği gerektirmediği için toplam maliyeti düşük; tek gecede renkli sonuç verir.',
    notes: [
      'Dar bant için dual-band filtre gerekir; SHO paleti mono kadar esnek değildir.',
      'Backfocus 17.5 mm.',
    ],
    connections: { input: 'M42x0.75' },
    optics: { flangeDistanceMm: 17.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-asi294mc',
    brand: 'ZWO',
    model: 'ASI294MC Pro',
    category: 'astro-kamera',
    specs: {
      Sensör: '4/3" renkli',
      Piksel: '4.63 µm',
      Çözünürlük: '4144×2822',
      Soğutma: '-35°C',
    },
    priceHint: 'Orta segment',
    summary:
      '4.63 µm büyük piksel, kısa odaklı optiklerde iyi örnekleme verir ve düşük ışıkta duyarlılığı yüksektir.',
    notes: ['Bin1 modunda amp glow görülebilir; dark kalibrasyonu önemlidir.'],
    connections: { input: 'M42x0.75' },
    optics: { flangeDistanceMm: 17.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'qhy-268m',
    brand: 'QHYCCD',
    model: 'QHY268M',
    category: 'astro-kamera',
    specs: {
      Sensör: 'APS-C mono',
      Piksel: '3.76 µm',
      Çözünürlük: '6280×4210',
      Soğutma: '-35°C',
    },
    priceHint: 'Üst segment',
    summary:
      'IMX571 tabanlı mono kamera; ASI2600MM ile aynı sensörü farklı gövde ve okuma modlarıyla kullanır.',
    notes: ['Mod seçimi (Photographic / High Gain) gürültü karakterini değiştirir.'],
    connections: { input: 'M54x0.75' },
    optics: { flangeDistanceMm: 17.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'player-one-poseidon-c',
    brand: 'Player One',
    model: 'Poseidon-C Pro',
    category: 'astro-kamera',
    specs: {
      Sensör: 'APS-C renkli',
      Piksel: '3.76 µm',
      Çözünürlük: '6248×4176',
      Soğutma: '-35°C',
    },
    priceHint: 'Orta segment',
    summary:
      'IMX571 renkli sensörü daha uygun fiyatla sunan alternatif gövde; DPS teknolojisiyle amp glow bastırılıyor.',
    notes: ['Backfocus 17.5 mm — ZWO muadilleriyle aynı ara halka hesabı geçerli.'],
    connections: { input: 'M42x0.75' },
    optics: { flangeDistanceMm: 17.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-asi678mc',
    brand: 'ZWO',
    model: 'ASI678MC',
    category: 'astro-kamera',
    specs: {
      Sensör: '1/1.8" renkli',
      Piksel: '2 µm',
      Çözünürlük: '3840×2160',
      Kullanım: 'Gezegen / video',
    },
    priceHint: 'Giriş segment',
    summary:
      '2 µm piksel ve yüksek kare hızı: gezegen görüntülemede "lucky imaging" için tasarlandı. Soğutmasız, video akışı odaklı.',
    notes: [
      'Derin uzayda küçük sensör dar alan verir; gezegen ve Ay için tercih edilir.',
      'Yüksek kare hızı USB 3.0 ve hızlı disk ister.',
    ],
    connections: { input: '1.25in' },
    optics: { flangeDistanceMm: 12.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },

  /* ─────────────── FİLTRELER ─────────────── */
  {
    slug: 'optolong-lpro',
    brand: 'Optolong',
    model: 'L-Pro',
    category: 'filtre',
    specs: { Tip: 'Geniş bant', Boyut: '2"', Kullanım: 'Işık kirliliği' },
    priceHint: 'Orta segment',
    summary:
      'Geniş bant ışık kirliliği filtresi: sodyum ve cıva hatlarını bastırır, yıldız renklerini büyük ölçüde korur. Galaksi ve küme çekimlerinde dar banda alternatiftir.',
    notes: ['Dar bant kadar agresif değildir; Bortle 7+ altında kazancı sınırlıdır.'],
    optics: { filterThicknessMm: 2.0 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'idas-nbz',
    brand: 'IDAS',
    model: 'NBZ (Ha+OIII)',
    category: 'filtre',
    specs: { 'Bant genişliği': '12 nm dual', Boyut: '2"', Set: 'Ha + OIII' },
    priceHint: 'Üst segment',
    summary:
      'Renkli kameralar için dual-band filtre. 12 nm bant, hızlı optiklerde (f/2–f/4) bant kaymasına dar bantlardan daha dayanıklı.',
    notes: ['Hızlı optiklerde 3 nm filtrelere göre belirgin avantajı vardır.'],
    optics: { filterThicknessMm: 2.0 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'baader-uv-ir-cut',
    brand: 'Baader',
    model: 'UV/IR-Cut',
    category: 'filtre',
    specs: { Tip: 'Geniş bant', Boyut: '2"', Kullanım: 'Luminans / OSC' },
    priceHint: 'Giriş segment',
    summary:
      'Morötesi ve kızılötesini keserek apokromatik olmayan optiklerde odak kaymasını ve hâleyi engeller. Renkli kameralarda temel filtre.',
    notes: ['Işık kirliliği bastırmaz; yalnızca bant sınırlar.'],
    optics: { filterThicknessMm: 2.0 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'chroma-3nm-ha',
    brand: 'Chroma',
    model: '3nm Ha',
    category: 'filtre',
    specs: { 'Bant genişliği': '3 nm', Boyut: '36 mm', Set: 'Tekil Ha' },
    priceHint: 'Profesyonel',
    summary:
      'Referans sınıfı dar bant filtre. Yansıma hâlesi bastırma performansıyla parlak yıldızların yanındaki hedeflerde tercih edilir.',
    notes: ['Fiyatı yüksek; kazancı özellikle parlak yıldız içeren alanlarda görülür.'],
    optics: { filterThicknessMm: 3.0, clearApertureMm: 34 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'baader-solar-continuum',
    brand: 'Baader',
    model: 'Solar Continuum',
    category: 'filtre',
    specs: { 'Bant genişliği': '10 nm', Boyut: '2"', Kullanım: 'Güneş (beyaz ışık)' },
    priceHint: 'Orta segment',
    summary:
      '540 nm çevresinde dar bant: beyaz ışık güneş gözleminde granülasyon ve leke detayını belirgin artırır.',
    notes: [
      'TEK BAŞINA KULLANILMAZ — mutlaka objektif önü güneş filtresiyle birlikte.',
      'Filtresiz güneş gözlemi kalıcı görme kaybına yol açar.',
    ],
  },

  /* ─────────────── GUIDE ve AKSESUAR ─────────────── */
  {
    slug: 'zwo-asi120mm-mini',
    brand: 'ZWO',
    model: 'ASI120MM Mini',
    category: 'guide',
    specs: { Sensör: '1/3" mono', Piksel: '3.75 µm', Kullanım: 'Guide' },
    priceHint: 'Giriş segment',
    summary:
      'En yaygın guide kamerası. Küçük sensörü ayrı guide teleskopuyla iyi çalışır; OAG’de yıldız bulmak zorlaşabilir.',
    notes: ['OAG kullanacaksanız daha büyük sensörlü bir kamera tercih edin.'],
    connections: { input: '1.25in' },
    optics: { flangeDistanceMm: 12.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'sv-bony-sv106-guidescope',
    brand: 'SVBONY',
    model: 'SV106 50mm Guide Scope',
    category: 'guide',
    specs: { Açıklık: '50 mm', Odak: '190 mm', Tip: 'Guide teleskopu' },
    priceHint: 'Giriş segment',
    summary:
      'Hafif 50 mm guide teleskopu. Kısa ve orta odaklı ana optiklerde yeterli; uzun odakta diferansiyel esneme sorun çıkarır.',
    notes: ['1000 mm üzeri ana odakta OAG’ye geçmek gerekir.'],
    connections: { output: '1.25in' },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'zwo-eaf',
    brand: 'ZWO',
    model: 'EAF Elektronik Odaklayıcı',
    category: 'odaklayici',
    specs: { Tip: 'Elektronik odak', Kontrol: 'USB', Kullanım: 'Otomatik odak' },
    priceHint: 'Orta segment',
    summary:
      'Sıcaklık değiştikçe odak kayar; elektronik odaklayıcı gece boyunca otomatik yeniden odaklama yapar ve odak için tüpe dokunmayı ortadan kaldırır.',
    notes: ['Otomatik odak rutini, uzun gecelerde kaybedilen kare sayısını belirgin düşürür.'],
  },
  {
    slug: 'zwo-efw-7x36',
    brand: 'ZWO',
    model: 'EFW 7×36mm',
    category: 'filtre-carki',
    specs: { Tip: 'Filtre tekerleği', Yuva: '7 × 36 mm', Kontrol: 'USB' },
    priceHint: 'Orta segment',
    summary:
      'Mono kamerayla SHO + LRGB çalışmak için yedi yuvalı motorlu filtre tekerleği. Filtre değişimini gece boyunca otomatikleştirir.',
    notes: ['20 mm backfocus tüketir; ara halka hesabına dâhil edin.'],
    connections: { input: 'M42x0.75', output: 'M42x0.75' },
    optics: { opticalLengthMm: 20, clearApertureMm: 34 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'pegasus-falcon-rotator',
    brand: 'Pegasus Astro',
    model: 'Falcon Rotator',
    category: 'aksesuar',
    specs: { Tip: 'Alan döndürücü', Kontrol: 'USB', Kullanım: 'Kadraj açısı' },
    priceHint: 'Üst segment',
    summary:
      'Kamerayı optiğe göre döndürerek kadraj açısını yazılımdan ayarlar. Mozaik ve panel hizalamada elle döndürmenin getirdiği hatayı ortadan kaldırır.',
    notes: ['Backfocus tüketir; kurulum planına dâhil edilmeli.'],
    connections: { input: 'M48x0.75', output: 'M48x0.75' },
    optics: { opticalLengthMm: 21.5 },
    productionStatus: 'guncel',
    confidence: 'tek-kaynak',
  },
  {
    slug: 'losmandy-dovetail',
    brand: 'Losmandy',
    model: 'D Serisi Kırlangıç Kuyruğu',
    category: 'aksesuar',
    specs: { Tip: 'Bağlantı rayı', Genişlik: '75 mm', Kullanım: 'Tüp bağlantısı' },
    priceHint: 'Orta segment',
    summary:
      'Geniş (75 mm) bağlantı rayı: ağır tüplerde Vixen tipi dar raya göre belirgin daha rijit bağlantı verir ve esnemeyi azaltır.',
    notes: ['Montürün Losmandy uyumlu satıcı çenesi olmalı.'],
  },
];

/**
 * Marka adını URL parçasına çevirir: "Sky-Watcher" → "sky-watcher".
 *
 * URL deseni §20'de `/ekipman/:brand/:slug` olarak sabitlendi. Markanın
 * URL'de olması, "ZWO ürünleri" gibi bir kırılımı ileride kırık bağlantı
 * üretmeden açmayı mümkün kılıyor.
 */
export function brandSlug(brand: string): string {
  return brand
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Modelin detay sayfası yolu. */
export function equipmentPath(model: EquipmentModel): string {
  return `/ekipman/${brandSlug(model.brand)}/${model.slug}`;
}

/**
 * Model slug'ından kaydı bulur.
 *
 * Marka parçası **doğrulanmaz**, yalnızca okunabilirlik ve gelecekteki marka
 * kırılımı için URL'de durur: marka adı düzeltilirse (yazım hatası, birleşme)
 * eski bağlantı çalışmaya devam etmeli. Kanonik adres `equipmentPath` ile
 * üretilir ve sayfa kendi canonical etiketini basar.
 */
export function getEquipmentBySlug(slug: string): EquipmentModel | undefined {
  return equipment.find((e) => e.slug === slug);
}

/** Aynı kategorideki diğer modeller (karşılaştırma önerisi için). */
export function relatedEquipment(
  model: EquipmentModel,
  limit = 4
): EquipmentModel[] {
  return equipment
    .filter((e) => e.category === model.category && e.slug !== model.slug)
    .slice(0, limit);
}

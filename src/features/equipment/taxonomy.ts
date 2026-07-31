/**
 * EKİPMAN TAKSONOMİSİ — kategoriler, tipler ve etiketler.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN KATALOGDAN AYRI DOSYA
 *
 * Bu tanımlar `data.ts` içindeydi; oradaki `equipment` dizisiyle aynı
 * modülde. Sonuç ölçüldü ve şuydu: ana sayfadaki "Son ilanlar" şeridi
 * yalnızca `equipmentCategoryLabels` (on satırlık bir etiket haritası)
 * için 80 kB'lık ürün kataloğunu ilk rota paketine çekiyordu. Katalog
 * ana sayfada HİÇ KULLANILMIYOR.
 *
 * Tree-shaking bunu kendiliğinden çözmedi: aynı modüldeki yardımcılar
 * (`brandSlug`, `equipmentPath`, `getEquipmentBySlug`) diziye
 * dokunuyor ve paketleyici modülü bütün olarak tutuyor.
 *
 * Ayrım şu sınırda: BURADA kataloğun ŞEKLİ (hangi kategoriler var, nasıl
 * adlandırılıyor), `data.ts`te kataloğun KENDİSİ. Şekil her yerde
 * lazım ve küçük; içerik yalnızca ekipman sayfalarında lazım ve büyük.
 * ══════════════════════════════════════════════════════════════════════
 */

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

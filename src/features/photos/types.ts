import type { FilterExposure } from '@/domain/photography/integration';
import type { PhotoVersion } from '@/domain/photography/versions';

/**
 * Fotoğraf modülü tipleri (§8.1 ana ilişkiler). MVP'de mock veri ile çalışır;
 * Supabase bağlandığında aynı tipler `astro_photos` + ilişkili tablolardan
 * beslenecektir (§9.2).
 */

export type PhotoType =
  | 'deep-sky'
  | 'gezegen'
  | 'ay'
  | 'gunes'
  | 'genis-alan'
  | 'star-trail'
  | 'gece-manzarasi';

export const photoTypeLabels: Record<PhotoType, string> = {
  'deep-sky': 'Deep Sky',
  gezegen: 'Gezegen',
  ay: 'Ay',
  gunes: 'Güneş',
  'genis-alan': 'Geniş Alan',
  'star-trail': 'Star Trail',
  'gece-manzarasi': 'Gece Manzarası',
};

/**
 * Kayıt durumu — `astro_photos.status` enum'unun aynısı.
 *
 * Galeri yalnızca `published` gösteriyor, bu yüzden durum uzun süre
 * arayüze hiç taşınmadı. Ama KOTA bu üç değerin ikisini ayrı ayrı
 * sayıyor (yayımlanan sınırlı, taslak ayrı sınırlı) ve sahibinin kendi
 * listesi üçünü de görmek zorunda: arşivlediği kaydı göremeyen kullanıcı
 * onu geri yayına alamaz.
 */
export type PhotoStatus = 'draft' | 'published' | 'archived';

/** Sahibine gösterilen durum etiketleri. */
export const photoStatusLabels: Record<PhotoStatus, string> = {
  draft: 'Taslak',
  published: 'Yayında',
  archived: 'Arşivde',
};

/**
 * FOTOĞRAF LİSANSI — TEK KURAL, SEÇENEK YOK.
 *
 * Yükleme sihirbazında dört seçenekli bir açılır liste vardı (Tüm
 * hakları saklıdır / CC BY / CC BY-NC / CC BY-NC-SA). Pratikte seçim
 * yapılmıyordu: çoğu kullanıcı CC türevleri arasındaki farkı bilmiyor
 * ve varsayılanı olduğu gibi bırakıyordu — yani ekranda bir hukuki
 * karar soruluyor ama gerçekte alınmıyordu.
 *
 * Kural artık kullanım şartlarında yazılı ve herkes için aynı: eserin
 * hakları sahibinde kalır, Astrohub kaynak göstermek şartıyla
 * kullanabilir. Yükleme ekranındaki onay kutusu bu metne atıf yapıyor.
 *
 * Sabit burada duruyor çünkü hem yükleme akışı hem fotoğraf sayfası
 * aynı metni gösteriyor; iki yerde yazılsaydı biri güncellenip diğeri
 * eskir ve kullanıcıya iki farklı lisans gösterilirdi.
 */
export const PHOTO_LICENSE =
  'Hakları sahibinde · Astrohub kaynak göstererek kullanabilir';

/**
 * ALAN ÇÖZÜMÜ (plate solve) — ÖLÇÜM, İDDİA DEĞİL.
 *
 * Künyedeki hedef adını kullanıcı yazıyor; buradaki değerler ise
 * fotoğraftaki yıldız desenlerinden hesaplanıyor. İkisi ayrı tutuluyor
 * ve bu alanlar sunucu dışından yazılamıyor (migration 0032).
 *
 * `durum` neden ayrı: boş değerler "henüz çözülmedi" ile "çözülemedi"yi
 * ayırt edemezdi. Arayüzde bunlar farklı iki cümle — biri beklemeyi,
 * diğeri sonucu anlatıyor.
 */
export interface PlateSolve {
  durum: 'yok' | 'kuyrukta' | 'cozuldu' | 'basarisiz';
  /** Alan merkezi, DERECE (katalog RA'yı saat tutuyor; birim adında). */
  raDeg: number | null;
  decDeg: number | null;
  /** Kuzeye göre dönüklük. */
  rotationDeg: number | null;
  /** Piksel başına yay saniyesi — gösterim kopyasının ölçeği. */
  scaleArcsecPx: number | null;
  fieldWidthDeg: number | null;
  fieldHeightDeg: number | null;
  provider: string | null;
  error: string | null;
}

/**
 * Çözüm yapılmamış kayıtların varsayılanı.
 *
 * Tohum verinin ve 0032 öncesi satırların hepsi bu durumda. `cozuldu`
 * varsayıp boş değerler göstermek, ölçüm yapılmış ama sonucu kaybolmuş
 * gibi okunurdu.
 */
export const COZUM_YOK: PlateSolve = {
  durum: 'yok',
  raDeg: null,
  decDeg: null,
  rotationDeg: null,
  scaleArcsecPx: null,
  fieldWidthDeg: null,
  fieldHeightDeg: null,
  provider: null,
  error: null,
};

/**
 * DOSYADAN OKUNAN KÜNYE (EXIF).
 *
 * `setup` alanı KULLANICININ yazdığı ekipman künyesi; buradakiler
 * dosyanın kendisinden okunan değerler. Ayrı duruyorlar çünkü ikisi
 * çeliştiğinde hangisinin ne olduğu bilinmeli — plate solve tarafındaki
 * "iddia / ölçüm" ayrımının aynısı.
 *
 * GPS KOORDİNATI YOK, yalnızca `gpsPresent` bayrağı var: konum §15.3
 * gereği varsayılan olarak gizli ve veritabanına hiç yazılmıyor. Bayrak,
 * sahibine "dosyanda konum verisi vardı, yayımlamadık" diyebilmek için.
 */
export interface PhotoExif {
  camera: string | null;
  lens: string | null;
  iso: number | null;
  /** Odak uzaklığı, mm. */
  focalMm: number | null;
  /** Diyafram f sayısı (f/2.8 → 2.8). */
  apertureF: number | null;
  /** TEK KARENİN poz süresi, saniye — toplam entegrasyon ayrı. */
  exposureSeconds: number | null;
  gpsPresent: boolean;
}

/** Künyede gösterilecek bir şey var mı — GPS bayrağı tek başına yetmez. */
export function exifHasValues(exif: PhotoExif | undefined): boolean {
  if (!exif) return false;
  return (
    exif.camera !== null ||
    exif.lens !== null ||
    exif.iso !== null ||
    exif.focalMm !== null ||
    exif.apertureF !== null ||
    exif.exposureSeconds !== null
  );
}

export type ProcessingPalette = 'RGB' | 'LRGB' | 'SHO' | 'HOO' | 'Mono';

/** Konum görünürlüğü (§15.3): tam / yaklaşık / bölge / gizli */
export type LocationVisibility = 'exact' | 'approximate' | 'region' | 'hidden';

export interface AstroPhoto {
  /**
   * Veritabanı kimliği. Tohum kayıtlarda YOK ve bu bilinçli: beğeni ve
   * yorum gerçek bir satıra bağlanır. Tohum bir fotoğrafa beğeni yazmaya
   * çalışmak yabancı anahtar hatası verirdi; arayüz `id` yokken bu
   * düğmeleri hiç göstermiyor.
   */
  id?: string;
  /**
   * Kaydın sahibinin kimliği.
   *
   * `user.username` GÖRÜNTÜ adı ve profil tablosundan geliyor; sahiplik
   * kararı ona bakılarak verilemez (kullanıcı adı değişebilir, profil
   * henüz oluşmamış olabilir). Revizyon yükleme gibi sahibe özel
   * eylemler bu alanı oturumdaki kimlikle karşılaştırıyor.
   */
  ownerId?: string;
  slug: string;
  title: string;
  /** Astronomik hedef (canonical ad + katalog kodu) */
  target: { name: string; catalog: string; constellation: string };
  type: PhotoType;
  user: { username: string; displayName: string };
  description: string;
  /** Placeholder gradyanı — gerçek görsel yokken kullanılır. */
  gradient: string;
  /**
   * Görsel adresi ve kredisi.
   *
   * Tohum kayıtlarda telifi uygun (kamu malı / CC BY-SA) örnek görseller
   * kullanılıyor; kullanıcı yüklemelerinde `photos` bucket'ındaki
   * küçültülmüş kopyanın genel adresi buraya gelir. Yoksa ya da
   * yüklenemezse kart kendi yıldız alanını çizer.
   */
  image?: { url: string; credit: string; licence: string };
  /** Paylaşım/indirme tercihleri. Orijinal dosya private bucket'ta kalır. */
  access?: {
    allowDownload: boolean;
    watermarkRequired: boolean;
  };
  capturedAt: string; // ISO tarih
  location: {
    label: string; // "Saklıkent, Antalya" | "Antalya (bölge)"
    visibility: LocationVisibility;
    bortle?: number;
    sqm?: number;
  };
  setup: {
    optic: string;
    camera: string;
    mount: string;
    guiding?: string;
    filters?: string;
    reducer?: string;
  };
  exposures: FilterExposure[];
  /** Dosyadan okunan künye — kullanıcının yazdığı `setup`tan ayrı. */
  exif?: PhotoExif;
  /**
   * Gösterim kopyasının piksel ölçüsü. Tam çözünürlük görüntüleyicisi
   * yakınlaştırma sınırını buradan hesaplıyor; bilinmiyorsa yakınlaştırma
   * kapalı kalıyor (uydurma bir sınırla yakınlaştırmak, bulanık bir
   * görüntüyü "tam çözünürlük" diye sunmak olurdu).
   */
  pixels?: { width: number; height: number };
  palette: ProcessingPalette;
  /**
   * Aynı kaydın işleme sürümleri (§8.1). Kotada ayrı fotoğraf sayılmaz
   * (§4.2) — kural `domain/photography/versions` içinde.
   *
   * Liste **eskiden yeniye** sıralıdır; son eleman yayında olan sürümdür.
   */
  versions?: PhotoVersion[];
  calibration?: {
    darks?: number;
    flats?: number;
    bias?: number;
    darkFlats?: number;
  };
  processing: {
    software: string[];
    steps?: string;
    aiDeclared?: boolean; // AI beyanı (§15.5)
  };
  license: string;
  /** Alan çözümü — ölçüm. Hiç istenmemişse `durum: 'yok'`. */
  solve: PlateSolve;
  likes: number;
  comments: number;
  /**
   * PUAN — 10 üzerinden, yarışma altyapısının temeli.
   *
   * Ortalama SAKLANMIYOR, toplam ve sayı saklanıyor (0036); burada da
   * aynı ikili duruyor. `ortalama` alanı türetilmiş olsaydı iki farklı
   * yerde iki farklı yuvarlama çıkardı.
   *
   * Oy yokken `sayi: 0` — ortalama hesaplanmıyor ve arayüz "henüz
   * puanlanmadı" diyor. Sıfır oyluk bir ortalamayı 0.0 göstermek,
   * fotoğrafı herkesin sıfır verdiği bir kare gibi gösterirdi.
   */
  rating: { toplam: number; sayi: number };
  editorsPick?: boolean;
  year: number;
  city: string;
}

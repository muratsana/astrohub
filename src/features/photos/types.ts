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
  editorsPick?: boolean;
  year: number;
  city: string;
}

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
  likes: number;
  comments: number;
  editorsPick?: boolean;
  year: number;
  city: string;
}

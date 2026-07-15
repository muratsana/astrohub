import type { FilterExposure } from '@/domain/photography/integration';

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
  slug: string;
  title: string;
  /** Astronomik hedef (canonical ad + katalog kodu) */
  target: { name: string; catalog: string; constellation: string };
  type: PhotoType;
  user: { username: string; displayName: string };
  description: string;
  /** Placeholder gradyanı — gerçek görsel pipeline'ı Faz 1.2'de */
  gradient: string;
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

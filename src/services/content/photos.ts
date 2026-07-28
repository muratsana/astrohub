import type { SupabaseClient } from '@supabase/supabase-js';
import { photos as photosSeed } from '@/features/photos/data';
import type {
  AstroPhoto,
  LocationVisibility,
  PhotoType,
  ProcessingPalette,
} from '@/features/photos/types';
import type { PhotoVersion } from '@/domain/photography/versions';
import { gradientFromSeed } from '@/components/media/tints';
import { publicPhotoUrl } from '@/services/photos/upload';
import { useCatalog } from './useCatalog';
import type { ContentSelection } from './select';

/**
 * FOTOĞRAF KATALOĞU — yükleme akışının çıktısını görünür kılan katman.
 *
 * BU KATMAN OLMADAN YÜKLEME BİR HİÇE YAZIYORDU: `services/photos/upload`
 * satırı `astro_photos`a, dosyayı `photos` bucket'ına koyuyordu ama galeri
 * uygulamanın içindeki tohum diziyi okuyordu. Kullanıcı fotoğrafını
 * yükleyip hiçbir yerde göremiyordu. Diğer beş katalogla aynı desen
 * burada da kuruldu.
 *
 * YALNIZCA YAYINDAKİLER. `status = 'published'` filtresi hem taslakları
 * hem moderasyondan geçmemişleri dışarıda tutuyor. RLS zaten aynı sınırı
 * çiziyor; buradaki filtre onun yerine geçmiyor, sorguyu küçültüyor.
 *
 * BİRLEŞİMLER TEK SORGUDA. PostgREST gömülü kaynakları (`profiles`,
 * `celestial_objects`, `photo_exposures`, `photo_versions`) aynı istekte
 * getiriyor. Ayrı sorgular N+1 demekti: yirmi fotoğraf için altmış istek.
 *
 * EKSİK ALAN UYDURULMUYOR. Şemada karşılığı olmayan alanlar (`processing`,
 * `calibration`) yükleme sırasında `setup_text` içine yazılıyor; orada da
 * yoksa boş bırakılıyor. Tohum kayıttaki bir değeri veritabanı kaydına
 * kopyalamak, olmayan bir künyeyi var göstermek olurdu.
 */

interface ExposureRow {
  filter: string;
  frames: number;
  exposure_seconds: number | string;
  position: number | null;
}

interface VersionRow {
  id: string;
  label: string;
  kind: string;
  note: string | null;
  palette: string | null;
  published_at: string | null;
  position: number | null;
}

interface PhotoRow {
  slug: string;
  title: string;
  description: string | null;
  photo_type: string;
  palette: string | null;
  captured_at: string | null;
  published_at: string | null;
  target_label: string | null;
  location_label: string | null;
  location_visibility: string | null;
  bortle: number | null;
  sqm: number | string | null;
  license: string | null;
  ai_declared: boolean | null;
  like_count: number | null;
  comment_count: number | null;
  display_path: string | null;
  thumb_path: string | null;
  setup_text: Record<string, unknown> | null;
  profiles: { username: string; display_name: string | null } | null;
  celestial_objects: {
    name: string;
    catalog: string;
    constellation: string | null;
  } | null;
  photo_exposures: ExposureRow[] | null;
  photo_versions: VersionRow[] | null;
}

const PHOTO_TYPES: PhotoType[] = [
  'deep-sky',
  'gezegen',
  'ay',
  'gunes',
  'genis-alan',
  'star-trail',
  'gece-manzarasi',
];

const PALETTES: ProcessingPalette[] = ['RGB', 'LRGB', 'SHO', 'HOO', 'Mono'];

const VISIBILITIES: LocationVisibility[] = [
  'exact',
  'approximate',
  'region',
  'hidden',
];

function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** `setup_text` içinden metin okur — jsonb serbest biçimli. */
function text(bag: Record<string, unknown> | null, key: string): string | undefined {
  const value = bag?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function count(bag: Record<string, unknown> | null, key: string): number | undefined {
  const value = bag?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * "Saklıkent, Antalya" → "Antalya".
 *
 * Şehir ayrı bir kolon değil çünkü konum görünürlüğü kullanıcıya ait:
 * "bölge" seçen biri ilçe adı yazmıyor. Etiketin son parçası pratikte her
 * zaman şehir; virgül yoksa etiketin kendisi kullanılıyor.
 */
export function cityFromLabel(label: string | null): string {
  if (!label) return 'Bilinmiyor';
  const parts = label.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : 'Bilinmiyor';
}

/**
 * Sürümler eskiden yeniye sıralanıyor — son eleman yayında olan.
 *
 * Sıra `position` kolonundan geliyor, tarihten değil: aynı gün iki sürüm
 * yayımlanırsa tarih ikisini ayırmaz ve karşılaştırma sürgüsü rastgele
 * bir sıraya düşerdi.
 */
function mapVersions(rows: VersionRow[] | null): PhotoVersion[] | undefined {
  if (!rows || rows.length === 0) return undefined;
  return [...rows]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((row) => ({
      id: row.id,
      label: row.label,
      kind: row.kind as PhotoVersion['kind'],
      note: row.note ?? '',
      publishedAt: row.published_at ?? '',
      gradient: gradientFromSeed(row.id),
      palette: row.palette ?? undefined,
    }));
}

export function mapPhotoRow(row: PhotoRow): AstroPhoto {
  const bag = row.setup_text;
  const capturedAt = row.captured_at ?? row.published_at ?? '';

  const displayUrl = publicPhotoUrl(row.display_path ?? row.thumb_path);
  const owner = row.profiles;

  return {
    slug: row.slug,
    title: row.title,
    target: {
      /* Katalog nesnesi bağlıysa kanonik ad oradan; değilse kullanıcının
         yazdığı serbest etiket. İkisi de yoksa başlık kullanılıyor —
         boş bir hedef alanı kartı bozardı. */
      name: row.celestial_objects?.name ?? row.target_label ?? row.title,
      catalog: row.celestial_objects?.catalog ?? row.target_label ?? '',
      constellation: row.celestial_objects?.constellation ?? '',
    },
    type: (PHOTO_TYPES.includes(row.photo_type as PhotoType)
      ? row.photo_type
      : 'deep-sky') as PhotoType,
    user: {
      username: owner?.username ?? 'bilinmiyor',
      displayName: owner?.display_name ?? owner?.username ?? 'Bilinmiyor',
    },
    description: row.description ?? '',
    gradient: gradientFromSeed(row.slug),
    image: displayUrl
      ? {
          url: displayUrl,
          /* Kredi fotoğrafı çekene ait; lisans kullanıcının seçtiği. */
          credit: owner?.display_name ?? owner?.username ?? 'Astrohub kullanıcısı',
          licence: row.license ?? 'Tüm hakları saklıdır',
        }
      : undefined,
    capturedAt,
    location: {
      label: row.location_label ?? 'Belirtilmemiş',
      visibility: (VISIBILITIES.includes(
        row.location_visibility as LocationVisibility
      )
        ? row.location_visibility
        : 'hidden') as LocationVisibility,
      bortle: row.bortle ?? undefined,
      sqm: num(row.sqm) ?? undefined,
    },
    setup: {
      optic: text(bag, 'optic') ?? '',
      camera: text(bag, 'camera') ?? '',
      mount: text(bag, 'mount') ?? '',
      guiding: text(bag, 'guide') ?? text(bag, 'guiding'),
      filters: text(bag, 'filter') ?? text(bag, 'filters'),
      reducer: text(bag, 'reducer'),
    },
    exposures: [...(row.photo_exposures ?? [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((e) => ({
        filter: e.filter,
        frames: e.frames,
        exposureSeconds: num(e.exposure_seconds) ?? 0,
      })),
    palette: (PALETTES.includes(row.palette as ProcessingPalette)
      ? row.palette
      : 'RGB') as ProcessingPalette,
    versions: mapVersions(row.photo_versions),
    calibration: {
      darks: count(bag, 'darks'),
      flats: count(bag, 'flats'),
      bias: count(bag, 'bias'),
      darkFlats: count(bag, 'darkFlats'),
    },
    processing: {
      /* Yazılım listesi serbest metin olarak geliyor; virgülle ayrılmış
         bir dizeyi listeye çeviriyoruz. Yoksa boş liste — "PixInsight"
         varsaymak künyeye yalan yazmak olurdu. */
      software: (text(bag, 'software') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      steps: text(bag, 'steps'),
      aiDeclared: row.ai_declared ?? false,
    },
    license: row.license ?? 'Tüm hakları saklıdır',
    likes: row.like_count ?? 0,
    comments: row.comment_count ?? 0,
    year: capturedAt ? new Date(capturedAt).getFullYear() : 0,
    city: cityFromLabel(row.location_label),
  };
}

const SELECT =
  'slug, title, description, photo_type, palette, captured_at, published_at, ' +
  'target_label, location_label, location_visibility, bortle, sqm, license, ' +
  'ai_declared, like_count, comment_count, display_path, thumb_path, setup_text, ' +
  /* Gömme ipucu ZORUNLU: `user_id` kolonunda iki yabancı anahtar var —
     biri `auth.users`a (kimlik bütünlüğü), biri `profiles`a (0015, gömme
     için). İpucu olmadan PostgREST hangisini izleyeceğini bilemiyor ve
     "more than one relationship was found" diyerek sorguyu reddediyor. */
  'profiles!astro_photos_user_id_profiles_fkey(username, display_name), ' +
  'celestial_objects(name, catalog, constellation), ' +
  'photo_exposures(filter, frames, exposure_seconds, position), ' +
  'photo_versions(id, label, kind, note, palette, published_at, position)';

async function fetchPhotos(client: SupabaseClient): Promise<AstroPhoto[]> {
  const { data, error } = await client
    .from('astro_photos')
    .select(SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    /* Ana sayfa on karo, galeri sayfası filtreleme yapıyor. İki yüz kayıt
       ikisine de fazlasıyla yetiyor ve tarayıcıya bütün arşivi indirmiyor.
       Sunucu taraflı sayfalama katalog büyüdüğünde gerekecek. */
    .limit(200);

  if (error) throw new Error(error.message);
  return (data as unknown as PhotoRow[]).map(mapPhotoRow);
}

/** Fotoğraflar: veritabanı varsa oradan, yoksa tohum diziden. */
export function usePhotoCatalog(): ContentSelection<AstroPhoto> {
  return useCatalog('fotograf', photosSeed, fetchPhotos);
}

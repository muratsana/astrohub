import {
  CONTENT_STATUSES,
  PUBLIC_CONTENT_STATUS,
} from '@/domain/content/status';
import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { photos as photosSeed } from '@/features/photos/data';
import {
  exifHasValues,
  type AstroPhoto,
  type LocationVisibility,
  type PhotoStatus,
  type PhotoType,
  type ProcessingPalette,
} from '@/features/photos/types';
import type { PhotoVersion } from '@/domain/photography/versions';
import { gradientFromSeed } from '@/components/media/tints';
import { getSupabase } from '@/services/supabase/client';
import { publicPhotoUrl } from '@/services/photos/publicUrl';
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
 * YALNIZCA YAYINDAKİLER. `status = 'yayinda'` filtresi hem taslakları
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
  session_id?: string | null;
}

interface CaptureSessionRow {
  id: string;
  starts_on: string;
  ends_on: string | null;
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
  storage_path: string | null;
}

interface PhotoRow {
  id: string;
  user_id?: string | null;
  solve_status?: string | null;
  solve_ra_deg?: number | null;
  solve_dec_deg?: number | null;
  solve_rotation_deg?: number | null;
  solve_scale_arcsec_px?: number | null;
  solve_field_width_deg?: number | null;
  solve_field_height_deg?: number | null;
  solve_parity?: number | null;
  solve_provider?: string | null;
  solve_error?: string | null;
  slug: string;
  title: string;
  description: string | null;
  photo_type: string;
  palette: string | null;
  captured_at: string | null;
  published_at: string | null;
  target_label: string | null;
  location_label: string | null;
  city?: string | null;
  district?: string | null;
  location_visibility: string | null;
  bortle: number | null;
  sqm: number | string | null;
  license: string | null;
  allow_download?: boolean | null;
  watermark_required?: boolean | null;
  ai_declared: boolean | null;
  like_count: number | null;
  comment_count: number | null;
  rating_sum?: number | null;
  rating_count?: number | null;
  editors_pick?: boolean | null;
  display_path: string | null;
  thumb_path: string | null;
  thumb_crop?: { zoom: number; panX: number; panY: number } | null;
  width: number | null;
  height: number | null;
  exif_camera?: string | null;
  exif_lens?: string | null;
  exif_iso?: number | null;
  exif_focal_mm?: number | string | null;
  exif_aperture_f?: number | string | null;
  exif_exposure_seconds?: number | string | null;
  exif_gps_present?: boolean | null;
  setup_text: Record<string, unknown> | null;
  profiles: { username: string; display_name: string | null } | null;
  celestial_objects: {
    name: string;
    catalog: string;
    constellation: string | null;
  } | null;
  photo_exposures: ExposureRow[] | null;
  photo_capture_sessions?: CaptureSessionRow[] | null;
  photo_versions: VersionRow[] | null;
  photo_of_week_rounds?: Array<{
    iso_year: number;
    iso_week: number;
    status: string;
  }> | null;
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
function text(
  bag: Record<string, unknown> | null,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = bag?.[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return undefined;
}

function count(
  bag: Record<string, unknown> | null,
  key: string
): number | undefined {
  const value = bag?.[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * "Saklıkent, Antalya" → "Antalya".
 *
 * ARTIK YALNIZCA ESKİ KAYITLAR İÇİN. `20260807160000` ile `city` ve
 * `district` gerçek kolonlar oldu ve yükleme formunda zorunlu; yeni
 * kayıtlarda tahmine gerek yok.
 *
 * Bu fonksiyonun neden yetersiz olduğu da orada yazılı: "Saklıkent,
 * Antalya" doğru çalışıyor ama "Antalya, Saklıkent" yanlış sonuç
 * veriyor ve "evin balkonu" yazan biri "Evin Balkonu" adında bir şehir
 * üretiyordu. Kolonu olmayan eski satırlar için elimizdeki tek şey bu
 * tahmin — silmek onları süzgeçten tamamen düşürürdü.
 */
export function cityFromLabel(label: string | null): string {
  if (!label) return 'Bilinmiyor';
  const parts = label
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
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
      /*
       * Sürümün kendi görseli `photos` bucket'ında ve yol saklanıyor,
       * tam adres değil (0009). Yol boşsa alan `undefined` kalıyor ve
       * sürgü yer tutucuya düşüp bunu söylüyor.
       */
      imageUrl: publicPhotoUrl(row.storage_path) ?? undefined,
      storagePath: row.storage_path ?? undefined,
      palette: row.palette ?? undefined,
    }));
}

export function mapPhotoRow(row: PhotoRow): AstroPhoto {
  const bag = row.setup_text;

  /*
   * Çözüm alanları eski satırlarda ve tohum veride yok; `durum: 'yok'`
   * bunun doğru karşılığı. `cozuldu` varsayıp boş değerler göstermek,
   * ölçüm yapılmış ama sonucu kaybolmuş gibi okunurdu.
   */
  const solve: AstroPhoto['solve'] = {
    durum: (row.solve_status as AstroPhoto['solve']['durum'] | null) ?? 'yok',
    raDeg: row.solve_ra_deg ?? null,
    decDeg: row.solve_dec_deg ?? null,
    rotationDeg: row.solve_rotation_deg ?? null,
    scaleArcsecPx: row.solve_scale_arcsec_px ?? null,
    fieldWidthDeg: row.solve_field_width_deg ?? null,
    fieldHeightDeg: row.solve_field_height_deg ?? null,
    parity: row.solve_parity ?? null,
    provider: row.solve_provider ?? null,
    error: row.solve_error ?? null,
  };
  const capturedAt = row.captured_at ?? row.published_at ?? '';

  const displayUrl = publicPhotoUrl(row.display_path ?? row.thumb_path);
  /* Izgara için küçük kopya. `display_path`e düşmüyoruz: düşseydi alan yine
     büyük dosyayı indirirdi ve `thumbUrl`ün varlığı "küçük kopya var"
     anlamını yitirirdi. Yoksa çağıran taraf bilerek `url`e düşüyor. */
  const thumbUrl = publicPhotoUrl(row.thumb_path) ?? undefined;
  const owner = row.profiles;

  return {
    id: row.id,
    ownerId: row.user_id ?? undefined,
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
          thumbUrl,
          /* Kredi fotoğrafı çekene ait; lisans kullanıcının seçtiği. */
          credit:
            owner?.display_name ?? owner?.username ?? 'Astrohub kullanıcısı',
          licence: row.license ?? 'Tüm hakları saklıdır',
        }
      : undefined,
    access: {
      allowDownload: row.allow_download ?? false,
      watermarkRequired: row.watermark_required ?? true,
    },
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
      optic: text(bag, 'optic', 'Optik') ?? '',
      camera: text(bag, 'camera', 'Kamera') ?? '',
      mount: text(bag, 'mount', 'Montür') ?? '',
      guiding: text(bag, 'guide', 'guiding', 'Guide'),
      filters: text(bag, 'filter', 'filters', 'Filtre'),
      reducer: text(bag, 'reducer', 'Reducer'),
    },
    /*
     * EXIF alanları 0035 öncesi satırlarda yok. Hepsi boşsa `exif` hiç
     * kurulmuyor — boş bir nesne göndermek, arayüzde "künye var ama
     * hepsi tire" gibi bir bölüm çizdirirdi.
     */
    exif: (() => {
      const exif = {
        camera: row.exif_camera ?? null,
        lens: row.exif_lens ?? null,
        iso: row.exif_iso ?? null,
        focalMm: num(row.exif_focal_mm),
        apertureF: num(row.exif_aperture_f),
        exposureSeconds: num(row.exif_exposure_seconds),
        gpsPresent: row.exif_gps_present ?? false,
      };
      return exifHasValues(exif) || exif.gpsPresent ? exif : undefined;
    })(),
    /* Sıfır ya da eksik ölçü "bilinmiyor" demek; 0×0 bir görüntü yok. */
    pixels:
      row.width && row.height
        ? { width: row.width, height: row.height }
        : undefined,
    exposures: [...(row.photo_exposures ?? [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((e) => ({
        filter: e.filter,
        frames: e.frames,
        exposureSeconds: num(e.exposure_seconds) ?? 0,
        sessionId: e.session_id ?? undefined,
      })),
    /* Çekim oturumları (sezonlar). Tablo boşsa `captured_at`ten tek bir
       örtük oturum türetiliyor — eski kayıtlar da "tek gece" gibi okunur. */
    captureSessions: (() => {
      const satirlar = [...(row.photo_capture_sessions ?? [])].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0)
      );
      if (satirlar.length > 0) {
        return satirlar.map((s) => ({
          id: s.id,
          startsOn: s.starts_on,
          endsOn: s.ends_on,
        }));
      }
      const tekTarih = row.captured_at ?? undefined;
      return tekTarih
        ? [{ id: `captured-${row.id}`, startsOn: tekTarih, endsOn: null }]
        : [];
    })(),
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
      software: (text(bag, 'software', 'Yazılım') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      steps: text(bag, 'steps'),
      aiDeclared: row.ai_declared ?? false,
    },
    solve,
    license: row.license ?? 'Tüm hakları saklıdır',
    likes: row.like_count ?? 0,
    comments: row.comment_count ?? 0,
    rating: {
      toplam: row.rating_sum ?? 0,
      sayi: row.rating_count ?? 0,
    },
    editorsPick: row.editors_pick ?? false,
    photoOfWeekWins: (row.photo_of_week_rounds ?? [])
      .filter((round) => ['sonuclandi', 'yayinda'].includes(round.status))
      .map(
        (round) =>
          `${round.iso_year}-${String(round.iso_week).padStart(2, '0')}`
      ),
    year: capturedAt ? new Date(capturedAt).getFullYear() : 0,
    /* Gerçek kolon varsa O kullanılıyor; yoksa eski etiketten tahmin.
       Sıra önemli: tahmin bir yedek, ana yol değil. */
    city: row.city ?? cityFromLabel(row.location_label),
    district: row.district ?? undefined,
    /* Kart kadrajı — yalnızca kullanıcı seçtiyse dolu; yoksa kart CSS ile
       ortalıyor (C10). Sonradan yeniden kadraj bu değerle açılıyor. */
    thumbCrop: row.thumb_crop ?? undefined,
  };
}

const SELECT =
  'id, user_id, slug, title, description, photo_type, palette, captured_at, published_at, ' +
  'target_label, city, district, location_label, location_visibility, bortle, sqm, license, ' +
  'allow_download, watermark_required, ' +
  'ai_declared, like_count, comment_count, rating_sum, rating_count, editors_pick, ' +
  'display_path, thumb_path, thumb_crop, setup_text, ' +
  'width, height, exif_camera, exif_lens, exif_iso, exif_focal_mm, ' +
  'exif_aperture_f, exif_exposure_seconds, exif_gps_present, ' +
  'solve_status, solve_ra_deg, solve_dec_deg, solve_rotation_deg, ' +
  'solve_scale_arcsec_px, solve_field_width_deg, solve_field_height_deg, ' +
  'solve_parity, ' +
  'solve_provider, solve_error, ' +
  /* Gömme ipucu ZORUNLU: `user_id` kolonunda iki yabancı anahtar var —
     biri `auth.users`a (kimlik bütünlüğü), biri `profiles`a (0015, gömme
     için). İpucu olmadan PostgREST hangisini izleyeceğini bilemiyor ve
     "more than one relationship was found" diyerek sorguyu reddediyor. */
  'profiles!astro_photos_user_id_profiles_fkey(username, display_name), ' +
  'celestial_objects(name, catalog, constellation), ' +
  'photo_exposures(filter, frames, exposure_seconds, position, session_id), ' +
  'photo_capture_sessions(id, starts_on, ends_on, position), ' +
  'photo_of_week_rounds!photo_of_week_rounds_winner_photo_id_fkey(iso_year, iso_week, status), ' +
  'photo_versions(id, label, kind, note, palette, published_at, position, storage_path)';

/**
 * Galeriye — ve dolayısıyla `/fotograf/:slug` sayfasına — giren tek durum.
 *
 * Detay sayfası fotoğrafı kataloğun içinden arıyor; katalog yalnızca bu
 * durumu çekiyor. Yani taslak ve arşivlenmiş kayıtların herkese açık
 * sayfası YOK — sahibi RLS sayesinde satırı okuyabilse bile.
 *
 * Dışa açık: sahibinin kendi listesinde (`/panel/fotograflar`) hangi
 * satırın tıklanabileceğine bu değer karar veriyor. Ayrı bir sabit
 * tutmak, panelin kullanıcıyı "Fotoğraf bulunamadı" sayfasına
 * göndermesi demekti.
 */
export const PUBLIC_PHOTO_STATUS: PhotoStatus = PUBLIC_CONTENT_STATUS;

/** Fotoğrafın herkese açık detay sayfası var mı? */
export function isPhotoPubliclyVisible(status: PhotoStatus): boolean {
  return status === PUBLIC_PHOTO_STATUS;
}

async function fetchPhotos(client: SupabaseClient): Promise<AstroPhoto[]> {
  const { data, error } = await client
    .from('astro_photos')
    .select(SELECT)
    .eq('status', PUBLIC_PHOTO_STATUS)
    /*
     * SİLİNMİŞ KAYIT PUBLIC LİSTEDE DURMAZ.
     *
     * RLS bunu tek başına halletmiyor ve bu bilinçli: okuma politikası
     * `app.icerik_gorunur(status, deleted_at)` YANINDA sahiplik ve rol
     * dallarını da taşıyor (`or seller_id = auth.uid() or app.is_admin()
     * or app.has_role('moderator')`) — sahibi kendi taslağını, yönetici
     * de her kaydı görebilsin diye. Sonuç olarak soft-delete edilmiş bir
     * kayıt, SAHİBİNE ve YÖNETİCİYE public sayfada görünmeye devam
     * ediyordu; panel ise aynı kayıt için "public'te görünmüyor" diyordu.
     *
     * Ziyaretçi için sızıntı yok (onda yalnızca `icerik_gorunur` dalı
     * çalışıyor), ama sahibi hangi ilanın canlı hangisinin silinmiş
     * olduğunu ayırt edemiyordu. Süzgeç bu yüzden sorguda.
     */
    .is('deleted_at', null)
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

/* ══════════════════════ Sahibinin kendi fotoğrafları ══════════════════════ */

/** Panel listesi için gereken en küçük kayıt — künyenin tamamı değil. */
export interface MyPhotoSummary {
  id: string;
  slug: string;
  title: string;
  status: PhotoStatus;
  /** Çekim tarihi; yoksa yayın tarihi, o da yoksa boş. */
  capturedAt: string;
  thumbUrl: string | null;
}

export interface MyPhotosState {
  photos: MyPhotoSummary[];
  /** Kotayı tüketen kayıt sayısı — `app.active_photo_count` ile aynı tanım. */
  published: number;
  /** Ayrı sınıra tabi taslaklar (`MAX_DRAFT_PHOTOS`). */
  drafts: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const PHOTO_STATUSES: readonly PhotoStatus[] = CONTENT_STATUSES;

/*
 * Panel listesi künyenin tamamını istemiyor. Katalog `SELECT`'i beş tablo
 * gömüyor (profil, katalog nesnesi, pozlar, sürümler); panelde tek satır
 * için başlık, durum ve tarih yetiyor. Aynı sorguyu yeniden kullanmak,
 * bir liste çizmek için kullanıcının bütün arşivini indirmek olurdu.
 */
const MY_PHOTO_SELECT =
  'id, slug, title, status, captured_at, published_at, thumb_path, display_path';

interface MyPhotoRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  captured_at: string | null;
  published_at: string | null;
  thumb_path: string | null;
  display_path: string | null;
}

const EMPTY_MY_PHOTOS = {
  photos: [] as MyPhotoSummary[],
  published: 0,
  drafts: 0,
};

/**
 * Oturum açmış kullanıcının KENDİ fotoğrafları — her durumdan.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `usePhotoCatalog` YETMİYOR — `useMyListings` ile aynı iki sebep
 *
 * 1. `fetchPhotos` yalnızca `status = 'yayinda'` çekiyor. Taslağını ve
 *    arşivlediği kaydı göremeyen kullanıcı ne taslağını bitirebilir ne
 *    arşivlediğini geri yayına alabilir — üstelik panelin "Taslak"
 *    sayacı da hep 0 gösterirdi.
 * 2. `useCatalog` tablo boşken TOHUM veriye düşüyor. Galeride bu doğru
 *    (site boş görünmesin), burada felaket: hiç fotoğraf yüklememiş
 *    kullanıcı yabancı kareleri "senin fotoğrafların" diye görürdü.
 *
 * SAYILAR AYRICA DÖNÜYOR ÇÜNKÜ KOTA KUTUSU PANELİN HER BÖLÜMÜNDE VAR.
 * `published` sayısı `app.active_photo_count` ile birebir aynı tanımı
 * kullanıyor (yalnızca `published`, sürümler sayılmaz). İki taraf
 * ayrışırsa kazanan veritabanı; buradaki sayı hızlı geri bildirim.
 */
export function useMyPhotos(userId: string | undefined): MyPhotosState {
  const [state, setState] = useState(EMPTY_MY_PHOTOS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const clientPromise = userId ? getSupabase() : null;
    if (!userId || !clientPromise) {
      setState(EMPTY_MY_PHOTOS);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    clientPromise
      .then(async (client) => {
        const { data, error: queryError } = await client
          .from('astro_photos')
          .select(MY_PHOTO_SELECT)
          .eq('user_id', userId)
          /* Çekim tarihi boş olabilir (eski kayıtlar), yayın tarihi
             taslakta boş. Sıralama kolonu olarak `created_at` ikisinde de
             dolu — liste hiçbir durumda rastgele sıraya düşmüyor. */
          .order('created_at', { ascending: false })
          .limit(200);
        if (queryError) throw new Error(queryError.message);
        return (data as unknown as MyPhotoRow[]).map(mapMyPhotoRow);
      })
      .then((photos) => {
        if (!active) return;
        setState({
          photos,
          published: photos.filter((p) => p.status === 'yayinda').length,
          drafts: photos.filter((p) => p.status === 'taslak').length,
        });
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Fotoğraflar okunamadı');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, loading, error, refresh };
}

function mapMyPhotoRow(row: MyPhotoRow): MyPhotoSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    /* Tanınmayan durum `draft` sayılıyor: bilinmeyen bir değeri "Yayında"
       göstermek, kullanıcıya kaydının galeride olduğunu söylemek olurdu.
       Taslak varsaymak yalnızca "henüz görünmüyor" der. */
    status: PHOTO_STATUSES.includes(row.status as PhotoStatus)
      ? (row.status as PhotoStatus)
      : 'taslak',
    capturedAt: row.captured_at ?? row.published_at ?? '',
    thumbUrl: publicPhotoUrl(row.thumb_path ?? row.display_path),
  };
}

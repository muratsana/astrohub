import { getSupabase } from '@/services/supabase/client';
import {
  renderResized,
  storagePath,
  extensionOf,
  DISPLAY_MAX_EDGE,
  THUMB_MAX_EDGE,
} from '@/domain/photography/resize';
import { checkUploadSize } from '@/domain/membership/quota';
import { sanitizeText } from '@/lib/sanitize';

/**
 * FOTOĞRAF YÜKLEME AKIŞI.
 *
 * Sıra bilinçli: önce satır, sonra dosyalar, sonra satırın yollarla
 * güncellenmesi.
 *
 *   1. `astro_photos` satırı TASLAK olarak açılır (kimlik burada doğar).
 *   2. Küçültülmüş kopyalar ve orijinal, `<user>/<photo_id>/…` yoluna
 *      yüklenir — kimlik olmadan yol kurulamaz, bu yüzden satır önce.
 *   3. Satır yollarla güncellenir; kullanıcı isterse yayımlar.
 *
 * Ters sıra (önce dosya) daha "doğal" görünür ama sahipsiz nesne bırakır:
 * yükleme bitip satır açılmadan bağlantı koparsa, bucket'ta kime ait
 * olduğu bilinmeyen bir dosya kalır. Bu sırada ise kopan bağlantı yalnızca
 * görselsiz bir taslak bırakır — kullanıcı görür ve siler.
 *
 * YAYIN AYRI BİR ADIM. Kota tetikleyicisi yalnızca yayına geçişte çalışır
 * (§4.2); taslak açmak kotayı tüketmez. Böylece kotası dolu bir kullanıcı
 * da fotoğrafını hazırlayıp bekletebilir.
 */

export interface UploadInput {
  file: File;
  userId: string;
  slug: string;
  title: string;
  photoType: string;
  description?: string;
  capturedAt?: string;
  locationLabel?: string;
  locationVisibility?: 'exact' | 'approximate' | 'region' | 'hidden';
  license?: string;
  aiDeclared?: boolean;
  /** Ekipman künyesi — serbest metin; katalog bağı ayrı alanlarda. */
  setup?: Record<string, string>;
  opticId?: string | null;
  cameraId?: string | null;
  mountId?: string | null;
  /** Katalogdaki hedefin veritabanı kimliği; yoksa yalnızca etiket saklanır. */
  objectId?: string | null;
  /** Çekimde kullanılan kayıtlı setup — künye ayrıca saklanır. */
  setupId?: string | null;
  /** Hedefin okunabilir adı — katalog bağı kurulamasa da künye eksik kalmasın. */
  targetLabel?: string | null;
  exposures?: { filter: string; frames: number; exposureSeconds: number }[];
}

export interface UploadResult {
  photoId: string;
  displayPath: string;
  thumbPath: string;
  originalPath: string | null;
  width: number;
  height: number;
  /** Küçültme yapıldı mı — arayüz kullanıcıya bunu söylüyor. */
  optimized: boolean;
}

export type UploadProgress =
  | 'hazirlaniyor'
  | 'kucultuluyor'
  | 'yukleniyor'
  | 'kaydediliyor';

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export async function uploadPhoto(
  input: UploadInput,
  onProgress?: (stage: UploadProgress) => void
): Promise<UploadResult> {
  const verdict = checkUploadSize(input.file.size);
  if (verdict.kind === 'reject') throw new Error(verdict.reason);

  onProgress?.('hazirlaniyor');
  const supabase = await client();

  /* ── 1. Taslak satır ── */
  const { data: created, error: insertError } = await supabase
    .from('astro_photos')
    .insert({
      user_id: input.userId,
      slug: input.slug,
      title: sanitizeText(input.title, { maxLength: 160 }),
      description: sanitizeText(input.description ?? '', {
        multiline: true,
        maxLength: 5000,
      }),
      photo_type: input.photoType,
      object_id: input.objectId ?? null,
      setup_id: input.setupId ?? null,
      target_label: input.targetLabel
        ? sanitizeText(input.targetLabel, { maxLength: 160 })
        : null,
      status: 'draft',
      captured_at: input.capturedAt || null,
      location_label: input.locationLabel || null,
      location_visibility: input.locationVisibility ?? 'approximate',
      license: input.license ?? 'Tüm hakları saklıdır',
      ai_declared: input.aiDeclared ?? false,
      optic_id: input.opticId ?? null,
      camera_id: input.cameraId ?? null,
      mount_id: input.mountId ?? null,
      setup_text: input.setup ?? {},
      bytes: input.file.size,
    })
    .select('id')
    .single();

  if (insertError) throw new Error(insertError.message);
  const photoId = (created as { id: string }).id;

  /* ── 2. Kopyalar ── */
  onProgress?.('kucultuluyor');
  const display = await renderResized(input.file, DISPLAY_MAX_EDGE);
  const thumb = await renderResized(input.file, THUMB_MAX_EDGE);

  if (!display || !thumb) {
    /*
     * Tarayıcı küçültemedi (createImageBitmap yok ya da biçim
     * desteklenmiyor). Yarım kalmış taslağı bırakmıyoruz: kullanıcı
     * panelinde görselsiz bir kayıt görüp ne olduğunu anlamaya
     * çalışmasın.
     */
    await supabase.from('astro_photos').delete().eq('id', photoId);
    throw new Error(
      'Görsel bu tarayıcıda işlenemedi. JPEG ya da PNG deneyin; TIFF desteği tarayıcıya göre değişir.'
    );
  }

  onProgress?.('yukleniyor');
  const displayPath = storagePath(input.userId, photoId, 'display');
  const thumbPath = storagePath(input.userId, photoId, 'thumb');

  const uploads = await Promise.all([
    supabase.storage
      .from('photos')
      .upload(displayPath, display.blob, { contentType: 'image/jpeg', upsert: true }),
    supabase.storage
      .from('photos')
      .upload(thumbPath, thumb.blob, { contentType: 'image/jpeg', upsert: true }),
  ]);

  const failed = uploads.find((u) => u.error);
  if (failed?.error) {
    await supabase.from('astro_photos').delete().eq('id', photoId);
    throw new Error(failed.error.message);
  }

  /*
   * ORİJİNAL GİZLİ BUCKET'A. Başarısız olursa akış durmuyor: gösterilecek
   * kopyalar zaten yüklendi ve kullanıcının emeğini bir arşivleme hatası
   * yüzünden çöpe atmak orantısız olurdu. Eksiklik `original_path`'in boş
   * kalmasıyla görünür.
   */
  const originalPath = storagePath(
    input.userId,
    photoId,
    'original',
    extensionOf(input.file.name)
  );
  const { error: originalError } = await supabase.storage
    .from('photo-originals')
    .upload(originalPath, input.file, {
      contentType: input.file.type || 'application/octet-stream',
      upsert: true,
    });

  /* ── 3. Yolları yaz ── */
  onProgress?.('kaydediliyor');
  const { error: updateError } = await supabase
    .from('astro_photos')
    .update({
      display_path: displayPath,
      thumb_path: thumbPath,
      original_path: originalError ? null : originalPath,
      width: display.size.width,
      height: display.size.height,
    })
    .eq('id', photoId);

  if (updateError) throw new Error(updateError.message);

  if (input.exposures && input.exposures.length > 0) {
    const rows = input.exposures
      .filter((e) => e.frames > 0 && e.exposureSeconds > 0)
      .map((e, index) => ({
        photo_id: photoId,
        filter: e.filter,
        frames: e.frames,
        exposure_seconds: e.exposureSeconds,
        position: index,
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from('photo_exposures').insert(rows);
      if (error) throw new Error(error.message);
    }
  }

  return {
    photoId,
    displayPath,
    thumbPath,
    originalPath: originalError ? null : originalPath,
    width: display.size.width,
    height: display.size.height,
    optimized: verdict.kind === 'optimize',
  };
}

/**
 * Taslağı yayına alır.
 *
 * Kota kontrolü burada YAPILMAZ — veritabanı tetikleyicisi yapar (§4.2).
 * İstemcide ikinci bir kontrol koymak, iki sınırın ayrışması riskini
 * getirir ve hiçbir güvence eklemez. Tetikleyicinin hata mesajı zaten
 * kotayı ve kademeyi söylüyor; onu olduğu gibi yukarı taşıyoruz.
 */
export async function publishPhoto(photoId: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('astro_photos')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', photoId);

  if (error) throw new Error(error.message);
}

/** `photos` bucket'ı genel; yol doğrudan adrese çevrilebiliyor. */
export function publicPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!base) return null;
  return `${base}/storage/v1/object/public/photos/${path}`;
}

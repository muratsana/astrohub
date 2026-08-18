import { getSupabase } from '@/services/supabase/client';
import { renderResized } from '@/domain/photography/resize';
import { checkImageFormat, readHead } from '@/domain/photography/fileType';
import { listingPhotoUrl } from './photoUrl';

/**
 * İLAN FOTOĞRAFLARI — yükleme ve okuma.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ASTROFOTOĞRAF BORU HATTININ AYNISI DEĞİL
 *
 * İki akış aynı `renderResized` ve `checkImageFormat` işlevlerini
 * kullanıyor ama üç yerde AYRILIYOR ve üçü de bilinçli:
 *
 *   1. ARŞİV KOPYASI YOK. Astrofotoğrafta ham dosya gizli kovaya da
 *      yazılıyor çünkü eser o. İlan fotoğrafı bir kanıt belgesi;
 *      gösterim kopyası bu iş için yeterli ve her ilan için 40 MB ham
 *      dosya saklamak depolamayı boşa yakardı.
 *
 *   2. DAHA KÜÇÜK KENAR. 1600 px, astrofotoğraftaki 2048 değil. Alıcı
 *      çiziği görmek istiyor, yıldız alanını incelemiyor.
 *
 *   3. EXIF OKUNMUYOR. İlan fotoğrafında kamera künyesinin bir anlamı
 *      yok — ve okumak, satıcının evinin GPS koordinatını taşıyan bir
 *      alanı hiç ellememek varken elleme riski demekti.
 */

/** İlan fotoğrafında en uzun kenar. */
export const LISTING_MAX_EDGE = 1600;

/**
 * İlan başına üst sınır (A07). Asıl kural veritabanı tetikleyicisinde —
 * istemci sabiti onunla AYNI olmak zorunda, yoksa arayüz izin verip
 * tetikleyici reddeder. İkisi 20260819010000 migration'ında 5'e indirildi.
 */
export const LISTING_PHOTO_LIMIT = 5;

export interface ListingPhoto {
  id: string;
  url: string;
  position: number;
  width: number | null;
  height: number | null;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

interface PhotoRow {
  id: string;
  storage_path: string;
  position: number;
  width: number | null;
  height: number | null;
}

/** Bir ilanın fotoğrafları, kapak önce. */
export async function fetchListingPhotos(
  listingId: string
): Promise<ListingPhoto[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('listing_photos')
    .select('id, storage_path, position, width, height')
    .eq('listing_id', listingId)
    .order('position');

  if (error) throw new Error(error.message);

  const photos: ListingPhoto[] = [];
  for (const row of (data ?? []) as PhotoRow[]) {
    const url = listingPhotoUrl(row.storage_path);
    /* Adresi kurulamayan satır atlanıyor: kırık bir görsel ikonu
       göstermek, hiç göstermemekten kötü. */
    if (!url) continue;
    photos.push({
      id: row.id,
      url,
      position: row.position,
      width: row.width,
      height: row.height,
    });
  }
  return photos;
}

export interface UploadListingPhotoInput {
  listingId: string;
  userId: string;
  file: File;
  /** Kaçıncı sıraya konacak; 0 kapak. */
  position: number;
}

/**
 * İlan fotoğrafı yükler.
 *
 * SIRA: dosya → satır. Astrofotoğraftakinin tersi ve sebebi farklı —
 * orada yol kayıt kimliğinden türüyor, dolayısıyla satır önce açılmak
 * zorunda. Burada yol ilan kimliği ve sıradan türüyor; ikisi de yükleme
 * öncesi biliniyor. Bu sırada kopan bir yükleme geride yalnızca sahipsiz
 * bir nesne bırakıyor; ters sırada panelde görseli olmayan bir satır
 * kalırdı ve galeri onu boş kare olarak çizerdi.
 */
export async function uploadListingPhoto(
  input: UploadListingPhotoInput
): Promise<ListingPhoto> {
  const format = checkImageFormat(await readHead(input.file), input.file.type);
  if (format.kind === 'reject') throw new Error(format.reason);

  const resized = await renderResized(input.file, LISTING_MAX_EDGE);
  if (!resized) {
    throw new Error(
      format.kind === 'risky'
        ? format.reason
        : 'Görsel bu tarayıcıda işlenemedi. JPEG ya da PNG deneyin.'
    );
  }

  const supabase = await client();
  const path = `${input.userId}/${input.listingId}/${input.position}-${Math.random()
    .toString(36)
    .slice(2, 8)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('listings')
    .upload(path, resized.blob, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { data, error: insertError } = await supabase
    .from('listing_photos')
    .insert({
      listing_id: input.listingId,
      storage_path: path,
      position: input.position,
      width: resized.size.width,
      height: resized.size.height,
    })
    .select('id')
    .single();

  if (insertError) {
    /* Satır açılamadıysa nesne geride kalmasın. Temizlik hatası
       yutuluyor: kullanıcıya gösterilecek olan asıl hata. */
    try {
      await supabase.storage.from('listings').remove([path]);
    } catch (cause) {
      console.error('geri alma: ilan görseli silinemedi', cause);
    }
    throw new Error(insertError.message);
  }

  return {
    id: (data as { id: string }).id,
    url: listingPhotoUrl(path)!,
    position: input.position,
    width: resized.size.width,
    height: resized.size.height,
  };
}

/**
 * Fotoğrafları verilen sıraya göre yeniden konumlandırır (A09 sırala).
 *
 * `orderedIds` kapaktan sona istenen sıra; her satırın `position`ı
 * indeksine eşitleniyor. Sıra kolonu benzersiz değil (yalnızca dizin),
 * bu yüzden ara adımda çakışma olmuyor — tek tek güncellenebiliyor.
 */
export async function reorderListingPhotos(orderedIds: string[]): Promise<void> {
  const supabase = await client();
  for (let i = 0; i < orderedIds.length; i += 1) {
    const { error } = await supabase
      .from('listing_photos')
      .update({ position: i })
      .eq('id', orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}

/** Fotoğrafı hem tablodan hem kovadan siler. */
export async function deleteListingPhoto(
  id: string,
  url: string
): Promise<void> {
  const supabase = await client();

  const { error } = await supabase.from('listing_photos').delete().eq('id', id);
  if (error) throw new Error(error.message);

  /* Yolu adresten geri çıkarıyoruz: satır zaten silindi, ikinci bir
     sorguyla yolu okumak için artık geç. */
  const marker = '/object/public/listings/';
  const at = url.indexOf(marker);
  if (at < 0) return;

  try {
    await supabase.storage.from('listings').remove([url.slice(at + marker.length)]);
  } catch (cause) {
    console.error('ilan görseli silinemedi', cause);
  }
}

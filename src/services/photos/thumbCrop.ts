import { getSupabase } from '@/services/supabase/client';
import { renderKadrajBlob } from '@/domain/profile/avatar';
import { THUMB_MAX_EDGE } from '@/domain/photography/resize';
import { publicPhotoUrl } from './publicUrl';
import type { Kadraj } from '@/domain/profile/kadraj';

/**
 * KART KADRAJINI YÜKLEMEDEN SONRA YENİDEN DÜZENLEME (C09, C11, C12).
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAYNAK: GÖSTERİM KOPYASI
 *
 * Yeniden kadraj yaparken orijinal dosya elimizde yok (tarayıcıdan çıktı,
 * gizli kovada duruyor). Kaynak olarak gösterim kopyası (2048 px, public)
 * kullanılıyor: kart 640 px olduğundan 2048'den kırpmak yeterince keskin.
 *
 * ══════════════════════════════════════════════════════════════════════
 * VERSİYONLU YOL — ÖNBELLEK İÇİN (C11)
 *
 * Yeni thumb aynı ada YAZILAMAZ: tarayıcı ve CDN eski kopyayı önbellekte
 * tutar ve kullanıcı "kadrajı değiştirdim ama eskisi duruyor" der (avatar
 * yolunun zaman damgalı olmasının aynı sebebi). Yeni thumb zaman damgalı
 * bir yola gidiyor, satır ona işaret ediyor, ESKİ thumb siliniyor (C12).
 * Silme düşse bile yeni kadraj görünür; artık boşta kalan eski dosyayı
 * yaşam döngüsü temizliği topluyor.
 */

/** Versiyonlu kart thumbnail yolu — zaman damgalı (C11). */
export function versionedThumbPath(
  userId: string,
  photoId: string,
  now = Date.now()
): string {
  return `${userId}/${photoId}/thumb-${now}.jpg`;
}

export interface UpdateThumbCropInput {
  photoId: string;
  userId: string;
  /** Kaynak dosya (gösterim kopyasından çağıran tarafça getirildi). */
  sourceFile: File;
  kadraj: Kadraj;
  /** Silinecek eski thumb yolu (varsa). */
  oldThumbPath: string | null;
  now?: number;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

/**
 * Kart kadrajını yeniden üretip satıra bağlar; eski türevi güvenle siler.
 */
export async function updateThumbCrop(
  input: UpdateThumbCropInput
): Promise<{ thumbPath: string }> {
  const blob = await renderKadrajBlob(input.sourceFile, input.kadraj, {
    width: THUMB_MAX_EDGE,
    height: THUMB_MAX_EDGE,
    maxBytes: 1_000_000,
  });

  const supabase = await client();
  const yeniYol = versionedThumbPath(input.userId, input.photoId, input.now);

  const { error: yukleme } = await supabase.storage
    .from('photos')
    .upload(yeniYol, blob, { contentType: 'image/jpeg', upsert: false });
  if (yukleme) throw new Error(yukleme.message);

  const { error: guncelle } = await supabase
    .from('astro_photos')
    .update({ thumb_path: yeniYol, thumb_crop: input.kadraj })
    .eq('id', input.photoId);
  if (guncelle) {
    /* Satır güncellenemediyse yeni nesne boşta kalmasın. */
    try {
      await supabase.storage.from('photos').remove([yeniYol]);
    } catch (cause) {
      console.error('geri alma: yeni thumb silinemedi', cause);
    }
    throw new Error(guncelle.message);
  }

  /* Eski türevi sil (C12). Satır artık yeniye işaret ediyor; silme düşse
     bile kullanıcı doğru kadrajı görüyor, eski dosya yalnızca boşta kalıyor
     ve GC onu topluyor. Kendi yeni yolumuzu asla silmiyoruz. */
  if (input.oldThumbPath && input.oldThumbPath !== yeniYol) {
    try {
      await supabase.storage.from('photos').remove([input.oldThumbPath]);
    } catch (cause) {
      console.error('eski thumb silinemedi', cause);
    }
  }

  return { thumbPath: yeniYol };
}

/** Genel adresten depo yolunu geri çıkarır (eski thumb'ı silmek için). */
export function thumbPathFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const marker = '/object/public/photos/';
  const at = url.indexOf(marker);
  return at < 0 ? null : url.slice(at + marker.length);
}

/** Public thumb adresini yeniden kurar (yol → URL). */
export function thumbUrlFromPath(path: string): string | null {
  return publicPhotoUrl(path);
}

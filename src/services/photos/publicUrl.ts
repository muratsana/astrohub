/**
 * FOTOĞRAF GENEL ADRESİ — ilk pakete giren tek parça.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `upload.ts`TEN AYRILDI
 *
 * `services/content/photos.ts` (galeri, ana sayfa, foto kartları) bu
 * fonksiyon İÇİN `services/photos/upload`ı içe aktarıyordu. Sonuç
 * ölçüldü: yükleme boru hattının tamamı — görsel yeniden boyutlama,
 * EXIF ayrıştırma, doğrulama, plate solve çağrısı, ~17,6 kB ham kod —
 * İLK YÜKLENEN JS'e giriyordu. Galeriyi açan ziyaretçi hiçbir zaman
 * yükleme yapmayacak olsa bile o kodu indiriyordu.
 *
 * Fonksiyonun kendisi beş satır ve hiçbir şeye bağlı değil. Ayrı
 * dosyada durması, "adresi oku" ile "dosya yükle" arasındaki farkı da
 * modül sınırına yazıyor.
 *
 * `upload.ts` bunu yeniden dışa aktarıyor: mevcut çağıranlar
 * değişmedi ve yükleme sihirbazı tek yerden içe aktarmaya devam ediyor.
 */

/** `photos` bucket'ı genel; yol doğrudan adrese çevrilebiliyor. */
export function publicPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!base) return null;
  return `${base}/storage/v1/object/public/photos/${path}`;
}

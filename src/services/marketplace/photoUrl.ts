/**
 * `listings` kovasındaki nesnenin genel adresi.
 *
 * Yol saklanıyor, URL üretiliyor: proje/CDN adresi değişirse satırlar
 * elden geçmesin.
 */
export function listingPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}/storage/v1/object/public/listings/${path}`;
}

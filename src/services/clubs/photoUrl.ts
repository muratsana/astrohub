/**
 * `club-photos` kovasındaki nesnenin genel adresi.
 *
 * Satırda tam URL değil yol saklanır. Supabase proje adresi değişirse
 * veriyi taşımadan yalnızca ortam değişkeni değişir.
 */
export function clubPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}/storage/v1/object/public/club-photos/${path}`;
}

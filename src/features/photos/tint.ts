import { tintFor } from '@/components/media/tints';
import { targets } from '@/features/targets/data';

/**
 * Fotoğrafın hedef türünü katalogdan bulup yıldız alanı tonunu seçer.
 *
 * `PhotoCard` içinde durursa dosya hem bileşen hem yardımcı fonksiyon
 * dışa aktarır ve Vite'ın hızlı yenilemesi (fast refresh) o dosyada
 * çalışmaz — geliştirirken her düzenlemede sayfa tam yenilenir.
 */
export function tintForPhoto(catalog: string): string {
  const target = targets.find(
    (t) => t.catalog === catalog || t.aliases.includes(catalog)
  );
  return tintFor(target?.kind);
}

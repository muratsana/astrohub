/**
 * Yıldız alanı tonları — hedef türüne göre bulutsu rengi.
 *
 * Bileşen dosyasından ayrı tutulur: `StarField.tsx` yalnızca bileşen
 * dışa aktarır ve hızlı yenileme (fast refresh) sorunsuz çalışır.
 */

/** Hedef türüne göre bulutsu tonu — emisyon kırmızı, galaksi mavi vb. */
export function tintFor(kind: string | undefined): string {
  switch (kind) {
    case 'emisyon-bulutsusu':
    case 'sungerimsi-kalinti':
      return '232,140,110';
    case 'gezegenimsi-bulutsu':
      return '120,215,200';
    case 'karanlik-bulutsu':
      return '190,120,140';
    case 'kuresel-kume':
    case 'acik-kume':
      return '230,205,150';
    case 'galaksi':
    default:
      return '150,185,235';
  }
}

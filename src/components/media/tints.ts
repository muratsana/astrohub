/**
 * Yıldız alanı tonları — hedef türüne göre bulutsu rengi.
 *
 * Bileşen dosyasından ayrı tutulur: `StarField.tsx` yalnızca bileşen
 * dışa aktarır ve hızlı yenileme (fast refresh) sorunsuz çalışır.
 */

/**
 * Tohuma göre kararlı ton seçimi.
 *
 * Etkinlik, gözlem noktası gibi bir "tür"ü olmayan kayıtlar için. Aynı slug
 * her zaman aynı rengi verir; liste yeniden sıralansa da kartlar renk
 * değiştirmez. Veri dosyalarındaki `gradient` alanı bir CSS gradyanıdır ve
 * buraya geçirilemez (StarField `"r,g,b"` bekler).
 */
const seedPalette = [
  '150,185,235', // soğuk mavi
  '120,215,200', // yeşilimsi
  '230,205,150', // sıcak sarı
  '190,150,220', // mor
  '232,140,110', // kırmızımsı
];

export function tintFromSeed(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return seedPalette[(h >>> 0) % seedPalette.length];
}

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

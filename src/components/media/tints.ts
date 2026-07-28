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

/**
 * Tohuma göre kararlı CSS gradyanı.
 *
 * Veri dosyalarındaki kayıtlar kendi `gradient` alanını taşır; ama
 * veritabanından gelen satırlarda böyle bir kolon yok ve olmamalı —
 * gradyan bir sunum tercihi, içerik değil. Editörün her kayıt için CSS
 * yazması gerekseydi katalog yönetimi tasarım işine dönerdi.
 *
 * Aynı slug her zaman aynı gradyanı verir, yani liste yeniden sıralansa
 * ya da sayfa yeniden yüklense kart kimliğini korur.
 */
const seedGradients = [
  'linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #4c1d95 100%)',
  'linear-gradient(160deg, #020617 0%, #172554 60%, #312e81 100%)',
  'linear-gradient(150deg, #0b1120 0%, #1e293b 55%, #334155 100%)',
  'linear-gradient(165deg, #0c0a1d 0%, #2e1065 55%, #4c1d95 100%)',
  'linear-gradient(155deg, #0a0f1a 0%, #14532d 60%, #166534 100%)',
];

export function gradientFromSeed(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return seedGradients[(h >>> 0) % seedGradients.length];
}

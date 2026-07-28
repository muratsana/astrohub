/**
 * IŞIK KİRLİLİĞİ HARİTASI GÖMÜSÜ — adres üretimi.
 *
 * Harita üçüncü tarafın: lightpollutionmap.app kendi gömme uç noktasını
 * ve paylaşım kodunu yayımlıyor. Kendi veri setimizi lisanslamadan bir
 * harita boyamak yerine, izin verilmiş bir gömüyü kullanıyoruz.
 *
 * ADRES ÜRETİMİ NEDEN AYRI BİR DOSYADA: gömü adresi bir sunum ayrıntısı
 * değil, sözleşme. Parametre adları (`lat`, `lng`, `zoom`, `opacity`) ve
 * kabul ettikleri aralıklar karşı tarafa ait; bileşenin içinde şablon
 * dizesi olarak dursaydı sınır kontrolü de oraya karışır ve test
 * edilemezdi. Burada saf bir fonksiyon: girdi sayılar, çıktı adres.
 *
 * SINIRLAR KIRPILIYOR, REDDEDİLMİYOR. Kullanıcı sürgüsü zaten aralık
 * dışına çıkamaz ama konum bağlamından gelen koordinat bozuk olabilir
 * (ör. henüz çözülmemiş cihaz konumu). Bozuk koordinatla adres üretmek
 * karşı tarafta boş bir harita demek; kırpmak en azından bir yer
 * gösteriyor.
 */

export const LIGHT_POLLUTION_HOST = 'https://lightpollutionmap.app';

/** Gömü çerçevesinin izin verdiği yakınlaştırma aralığı. */
export const ZOOM_RANGE = { min: 3, max: 12 } as const;

/** Işık kirliliği katmanının saydamlığı — %0 sadece altlık, %100 tam katman. */
export const OPACITY_RANGE = { min: 0, max: 100 } as const;

export interface MapView {
  lat: number;
  lng: number;
  zoom: number;
  /** Yüzde (0–100). */
  opacity: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Koordinatı beş ondalığa yuvarlar (≈ 1 m çözünürlük).
 *
 * Daha fazlası hem anlamsız hem de adresi gereksiz uzatıyor; ayrıca
 * kullanıcının tam konumunu üçüncü tarafa metre altı hassasiyetle
 * bildirmenin bir faydası yok.
 */
function coord(value: number): string {
  return clamp(value, -180, 180).toFixed(5);
}

export function normalizeView(view: MapView): MapView {
  return {
    lat: clamp(view.lat, -85, 85),
    lng: clamp(view.lng, -180, 180),
    zoom: Math.round(clamp(view.zoom, ZOOM_RANGE.min, ZOOM_RANGE.max)),
    opacity: Math.round(
      clamp(view.opacity, OPACITY_RANGE.min, OPACITY_RANGE.max)
    ),
  };
}

/** `<iframe src>` için gömü adresi. */
export function embedUrl(view: MapView): string {
  const v = normalizeView(view);
  return (
    `${LIGHT_POLLUTION_HOST}/embed` +
    `?lat=${coord(v.lat)}&lng=${coord(v.lng)}&zoom=${v.zoom}&opacity=${v.opacity}`
  );
}

/**
 * Aynı görünümün tam sayfa adresi — "yeni sekmede aç" ve paylaşım için.
 *
 * Gömü adresini paylaşmak, karşı tarafa kontrolsüz bir çerçeve açmak
 * olurdu; paylaşılan bağlantı haritanın kendi sitesine gitmeli.
 */
export function fullUrl(view: MapView): string {
  const v = normalizeView(view);
  return (
    `${LIGHT_POLLUTION_HOST}/` +
    `?lat=${coord(v.lat)}&lng=${coord(v.lng)}&zoom=${v.zoom}&opacity=${v.opacity}`
  );
}

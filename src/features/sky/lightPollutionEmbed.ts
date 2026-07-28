/**
 * IŞIK KİRLİLİĞİ — döşeme kaynakları ve dış bağlantı.
 *
 * TARİHÇE, ÇÜNKÜ TEKRARLANMASIN: harita önce lightpollutionmap.app'in
 * paylaş penceresinde verdiği `<iframe>` gömüsüyle yapılmıştı. Canlıda
 * çerçeve hiç açılmadı ve konsol sebebi gösterdi:
 *
 *   Refused to display 'https://lightpollutionmap.app/' in a frame
 *   because it set 'X-Frame-Options' to 'sameorigin'.
 *
 * Hatadaki adres `/embed?...` değil, sitenin KÖKÜ — yani `/embed` isteği
 * köke yönleniyor ve kök çerçevelenmeyi reddediyor. Sağlayıcının verdiği
 * gömme kodu o sitede çalışan bir uç noktaya karşılık gelmiyor. Koordinat
 * biçimini onlarınkine eşitlemek (beş yerine altı ondalık) da değiştirmedi.
 *
 * Bu yüzden harita artık kendi bileşenimiz: standart döşeme servislerinden
 * gelen görüntüleri kendimiz konumlandırıyoruz (`TileMap`, `tileMath`).
 * Sağlayıcıya giden bağlantı duruyor — onların Bortle/SQM analiz paneli
 * bizde yok ve kullanıcının oraya gitmek istemesi meşru.
 */

export const LIGHT_POLLUTION_HOST = 'https://lightpollutionmap.app';

/** Haritanın izin verdiği yakınlaştırma aralığı. */
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

/** Koordinat biçimi — sağlayıcının kendi paylaşım adresiyle aynı. */
function coord(value: number): string {
  return clamp(value, -180, 180).toFixed(6);
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

/**
 * Aynı görünümün sağlayıcıdaki tam sayfa adresi — "ayrıntılı analiz"
 * bağlantısı için.
 */
export function fullUrl(view: MapView): string {
  const v = normalizeView(view);
  return (
    `${LIGHT_POLLUTION_HOST}/` +
    `?lat=${coord(v.lat)}&lng=${coord(v.lng)}&zoom=${v.zoom}&opacity=${v.opacity}`
  );
}

/* ── Döşeme kaynakları ─────────────────────────────────────────────── */

interface Tile {
  x: number;
  y: number;
  z: number;
}

/**
 * ALTLIK — CARTO'nun OpenStreetMap türevi döşemeleri.
 *
 * Koyu ve açık iki sürümü var; site teması hangisiyse o kullanılıyor.
 * Standart OSM döşemesi koyu arayüzün ortasında beyaz bir dikdörtgen
 * gibi duruyordu ve gece kullanılan bir sayfada bu bir tasarım tercihi
 * değil, göz kamaştırması.
 *
 * Alt alan adı (a/b/c) döşeme koordinatından türetiliyor: tarayıcı aynı
 * ana bağlantı sayısını alan adı başına sınırlar, üç ad paralelliği
 * üçe katlar. Sabit değil türetilmiş olması, aynı döşemenin her
 * boyamada aynı adresten istenmesini ve önbellekte kalmasını sağlıyor.
 */
export function basemapSource(dark: boolean) {
  const style = dark ? 'dark_all' : 'light_all';
  return {
    id: `carto:${style}`,
    maxZoom: 19,
    url: (tile: Tile) =>
      `https://${'abc'[(tile.x + tile.y) % 3]}.basemaps.cartocdn.com/` +
      `${style}/${tile.z}/${tile.x}/${tile.y}.png`,
  };
}

export const BASEMAP_CREDIT = '© OpenStreetMap katkıcıları · © CARTO';

/**
 * IŞIK KİRLİLİĞİ KATMANI — David J. Lorenz'in dünya atlası döşemeleri.
 *
 * VIIRS uydu ölçümlerinden türetilmiş, yıllık yayımlanan açık bir veri
 * seti; lightpollutionmap.info dahil pek çok site aynı kaynağı kullanır.
 *
 * BİRDEN FAZLA YIL DENENİYOR. Bu ortamdan (kapalı ağ) hangi yılın
 * yayımda olduğunu doğrulayamadım ve yanlış bir adres, katmanı sessizce
 * boş bırakırdı — kullanıcı bunu "burada ışık kirliliği yok" diye okur.
 * Bu yüzden liste sırayla deneniyor: bir kaynağın hiçbir döşemesi
 * gelmezse bir sonrakine geçilir, hepsi tükenirse katmanın yüklenemediği
 * açıkça yazılır. Uydurma bir veri gösterilmez.
 *
 * `maxZoom` 8: veri kabaca 750 m çözünürlüklü, daha ileri yakınlaştırma
 * yeni bilgi taşımaz. Üstünde döşeme büyütülerek çizilir.
 */
export const OVERLAY_SOURCES = ['lp2022', 'lp2024', 'lp2020'].map((year) => ({
  id: year,
  year: year.replace('lp', ''),
  maxZoom: 8,
  url: (tile: Tile) =>
    `https://djlorenz.github.io/astronomy/${year}/overlay/tiles/` +
    `tile_${tile.z}_${tile.x}_${tile.y}.png`,
}));

export const OVERLAY_CREDIT = 'Işık kirliliği katmanı: D. J. Lorenz, VIIRS';

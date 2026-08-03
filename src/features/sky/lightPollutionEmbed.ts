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

export interface OverlaySource {
  id: string;
  /** Seçicide görünen ad. */
  label: string;
  /** Katmanın altında yazan kaynak — hangi veriye baktığı gizlenmemeli. */
  credit: string;
  /**
   * Lejantın hangi ölçeği anlattığı.
   *
   * `atlas`: karanlıktan şehre giden renk ölçeği (Bortle'a boyanmış).
   * `radiance`: ham gece parlaklığı — renk ölçeği yok, yalnızca ışık var.
   * İkisine aynı lejantı koymak, ham görüntüye sahip olmadığı bir ölçek
   * atfetmek olurdu.
   */
  legend: 'atlas' | 'radiance';
  maxZoom: number;
  url: (tile: Tile) => string;
  /**
   * `screen`: siyahı yok sayıp ışığı toplar. Gece ışıkları görüntüsü
   * (siyah zemin + parlak şehirler) altlığın üstüne ancak böyle
   * bindirilebilir; normal çizimde altlığı tümden karartırdı.
   */
  blend?: 'screen';
  /** Bu katman yalnızca koyu altlıkla anlamlı mı? */
  needsDarkBasemap?: boolean;
}

/**
 * IŞIK KİRLİLİĞİ KATMANI.
 *
 * Eski Lorenz atlas adresleri 404, tarihli Black Marble adresleri 400
 * dönüyordu. Kullanıcıya çalışan bir kaynak seçiyormuş izlenimi veren
 * dokuz maddelik yedek listesi bu nedenle kaldırıldı. NASA GIBS'in
 * yayımladığı VIIRS City Lights 2012 WMTS döşemesi 2026-08-03'te gerçek
 * bir döşeme isteğiyle doğrulandı (HTTP 200). Bu görüntü Bortle sınıfı
 * değil, ham gece parlaklığıdır; arayüz bunu açıkça söyler.
 *
 * `maxZoom` 8: iki veri de kabaca 750 m çözünürlüklü, daha ileri
 * yakınlaştırma yeni bilgi taşımaz. Üstünde döşeme büyütülerek çizilir.
 */
function gibs(
  id: string,
  layer: string,
  time: string,
  label: string
): OverlaySource {
  return {
    id,
    label,
    credit: `Gece ışıkları: NASA GIBS · ${layer} (ham parlaklık)`,
    legend: 'radiance',
    maxZoom: 8,
    blend: 'screen',
    needsDarkBasemap: true,
    /* WMTS REST sırası satır/sütun: {TileMatrix}/{TileRow}/{TileCol},
       yani z/y/x. x/y yer değiştirirse harita aynasal kayar. */
    url: (tile: Tile) =>
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/` +
      `default/${time}/GoogleMapsCompatible_Level8/${tile.z}/${tile.y}/${tile.x}.jpg`,
  };
}

export const OVERLAY_SOURCES: OverlaySource[] = [
  gibs(
    'gibs:city-lights',
    'VIIRS_CityLights_2012',
    'default',
    'NASA Earth at Night (2012)'
  ),
];

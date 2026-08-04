/**
 * DÖŞEME HARİTASI MATEMATİĞİ — Web Mercator (EPSG:3857).
 *
 * NEDEN KENDİ HARİTAMIZ: ışık kirliliği haritası önce
 * lightpollutionmap.app'in yayımladığı `<iframe>` gömüsüyle çalışıyordu.
 * Canlıda çerçeve hiç açılmadı; tarayıcı konsolu sebebi gösterdi:
 *
 *   Refused to display 'https://lightpollutionmap.app/' in a frame
 *   because it set 'X-Frame-Options' to 'sameorigin'.
 *
 * Adresteki yol dikkat: hata `/embed?...` için değil, sitenin KÖKÜ için.
 * Yani `/embed` isteği köke yönleniyor ve kök çerçevelenmeyi reddediyor —
 * sağlayıcının paylaş penceresinde verdiği gömme kodu, o sitede çalışan
 * bir uç noktaya karşılık gelmiyor. Parametre biçimini değiştirmek (beş
 * yerine altı ondalık) bunu düzeltmedi; düzeltmesi de beklenemezdi.
 *
 * Bu yüzden harita artık bizim: standart döşeme (tile) servislerinden
 * gelen görüntüleri kendimiz konumlandırıyoruz. Çerçeve yok, dolayısıyla
 * X-Frame-Options da yok; kaydırma/yakınlaştırma bizim kodumuzda, üstteki
 * şehir seçicisiyle aynı konum kavramını paylaşıyor.
 *
 * BU DOSYA SAF: girdi sayılar, çıktı sayılar. DOM yok, React yok. Harita
 * hatalarının çoğu koordinat dönüşümünde olur ve tarayıcıda gözle
 * ayıklanması pahalıdır; burada test edilebilir duruyor.
 */

/** Standart döşeme kenarı (piksel). */
export const TILE_SIZE = 256;
const RETINA_DPR = 1.5;

export function tileRenderZoom(
  zoom: number,
  sourceMaxZoom: number,
  devicePixelRatio = 1
): number {
  const boost = devicePixelRatio >= RETINA_DPR ? 1 : 0;
  return Math.min(sourceMaxZoom, zoom + boost);
}

/**
 * Mercator izdüşümü kutupları sonsuza taşır; tüm dünya haritaları enlemi
 * bu değerde keser (dünya böylece tam kare olur).
 */
export const MAX_LATITUDE = 85.05112878;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TilePlacement {
  /** Döşeme sütunu (sarmalanmış: her zaman 0..2^z-1). */
  x: number;
  /** Döşeme satırı. */
  y: number;
  z: number;
  /** Görünüm alanı içindeki sol kenar (piksel). */
  left: number;
  /** Görünüm alanı içindeki üst kenar (piksel). */
  top: number;
  /** Kenar uzunluğu (piksel) — üst yakınlaştırmadan büyütülen katmanlarda 256'dan büyük olabilir. */
  size: number;
  /** React listesi ve hata takibi için kararlı anahtar. */
  key: string;
}

export function clampLatitude(lat: number): number {
  if (!Number.isFinite(lat)) return 0;
  return Math.min(MAX_LATITUDE, Math.max(-MAX_LATITUDE, lat));
}

/**
 * Boylamı -180..180 aralığına SARMALAR, kırpmaz.
 *
 * Kırpmak, dünyanın kenarında kaydırırken haritayı tarih çizgisinde
 * duvara toslatırdı; sarmalamak kullanıcının doğuya doğru gitmeye devam
 * etmesine izin verir — gerçek haritaların davranışı budur.
 */
export function wrapLongitude(lng: number): number {
  if (!Number.isFinite(lng)) return 0;
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/** Boylam → kesirli döşeme sütunu. */
export function lngToTileX(lng: number, zoom: number): number {
  return ((wrapLongitude(lng) + 180) / 360) * 2 ** zoom;
}

/** Enlem → kesirli döşeme satırı. */
export function latToTileY(lat: number, zoom: number): number {
  const rad = (clampLatitude(lat) * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
  return y * 2 ** zoom;
}

/** Kesirli döşeme sütunu → boylam. */
export function tileXToLng(x: number, zoom: number): number {
  return (x / 2 ** zoom) * 360 - 180;
}

/** Kesirli döşeme satırı → enlem. */
export function tileYToLat(y: number, zoom: number): number {
  const n = Math.PI * (1 - (2 * y) / 2 ** zoom);
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
}

/**
 * Merkezi piksel cinsinden kaydırır.
 *
 * `dx`/`dy` fare hareketidir: kullanıcı haritayı sağa sürüklerse merkez
 * SOLA gider — işaret bu yüzden ters.
 */
export function panBy(
  center: LatLng,
  dxPixels: number,
  dyPixels: number,
  zoom: number
): LatLng {
  const scale = TILE_SIZE;
  const x = lngToTileX(center.lng, zoom) - dxPixels / scale;
  const y = latToTileY(center.lat, zoom) - dyPixels / scale;
  const maxY = 2 ** zoom;
  return {
    lat: clampLatitude(tileYToLat(Math.min(maxY, Math.max(0, y)), zoom)),
    lng: wrapLongitude(tileXToLng(x, zoom)),
  };
}

/**
 * Görünüm alanı içinde bir noktanın (ör. imlecin) coğrafi karşılığı.
 *
 * Yakınlaştırırken imlecin altındaki noktayı sabit tutmak için gerekiyor;
 * bu olmadan tekerlek her zaman ekranın ortasına yakınlaşır ve kullanıcı
 * baktığı yeri kaybeder.
 */
export function pointToLatLng(
  center: LatLng,
  zoom: number,
  width: number,
  height: number,
  px: number,
  py: number
): LatLng {
  const x = lngToTileX(center.lng, zoom) + (px - width / 2) / TILE_SIZE;
  const y = latToTileY(center.lat, zoom) + (py - height / 2) / TILE_SIZE;
  return {
    lat: clampLatitude(tileYToLat(y, zoom)),
    lng: wrapLongitude(tileXToLng(x, zoom)),
  };
}

export interface ViewportRequest {
  center: LatLng;
  /** Döşemelerin isteneceği yakınlaştırma. */
  zoom: number;
  width: number;
  height: number;
  /**
   * Döşemenin ekrandaki boyu. Varsayılan 256.
   *
   * ÜST KATMANI BÜYÜTMEK İÇİN: ışık kirliliği katmanı sınırlı bir
   * yakınlaştırmaya kadar üretilmiş. Daha yakına gidildiğinde katmanı
   * kesmek yerine üst yakınlaştırmanın döşemesi büyütülerek çiziliyor —
   * `zoom` küçük, `tileSize` büyük verilir ve dünya piksel genişliği
   * (2^zoom × tileSize) altlık katmanla aynı kalır, yani hizalanır.
   */
  tileSize?: number;
}

/**
 * Görünüm alanını kaplayan döşemeleri ve her birinin piksel konumunu
 * verir.
 *
 * SÜTUNLAR SARMALANIR, SATIRLAR KIRPILIR: doğuya doğru kaydırma dünyayı
 * tekrarlar (tarih çizgisi bir duvar değildir), ama kutupların ötesinde
 * döşeme yoktur — o satırlar hiç istenmez, boş bırakılır.
 */
export function visibleTiles(request: ViewportRequest): TilePlacement[] {
  const { center, zoom, width, height } = request;
  const size = request.tileSize ?? TILE_SIZE;
  if (!(width > 0) || !(height > 0)) return [];

  const count = 2 ** zoom;
  const originX = lngToTileX(center.lng, zoom) * size - width / 2;
  const originY = latToTileY(center.lat, zoom) * size - height / 2;

  const firstCol = Math.floor(originX / size);
  const lastCol = Math.floor((originX + width - 1) / size);
  const firstRow = Math.max(0, Math.floor(originY / size));
  const lastRow = Math.min(count - 1, Math.floor((originY + height - 1) / size));

  const tiles: TilePlacement[] = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let col = firstCol; col <= lastCol; col += 1) {
      const x = ((col % count) + count) % count;
      tiles.push({
        x,
        y: row,
        z: zoom,
        left: Math.round(col * size - originX),
        top: Math.round(row * size - originY),
        size,
        /* Anahtar SARMALANMAMIŞ sütunu taşır: tarih çizgisinin iki
           yanında aynı döşeme iki kez çizilir ve ikisi ayrı DOM
           düğümü olmalıdır. */
        key: `${zoom}/${col}/${row}`,
      });
    }
  }
  return tiles;
}

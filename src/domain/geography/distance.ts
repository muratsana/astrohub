/**
 * Coğrafi mesafe ve harita izdüşümü (§8.6, §14.4).
 *
 * PostGIS gelene kadar yakınlık sıralaması istemcide yapılır; hesap sunucuya
 * taşındığında `ST_Distance` aynı sonucu verir çünkü ikisi de büyük çember
 * mesafesi kullanır. İmza korunacak biçimde tasarlandı.
 *
 * Harita izdüşümü, tile sağlayıcısı bağlanana kadar kullanılan **şematik**
 * dağılım görünümü içindir. Web Mercator değil, basit eşdikdörtgen (plate
 * carrée) izdüşüm: Türkiye'nin enlem aralığında (36–42°) ikisi arasındaki
 * fark birkaç piksel, ve şematik görünümde coğrafi doğruluk iddiası yok.
 */

const EARTH_RADIUS_KM = 6371;
const RAD = Math.PI / 180;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * İki nokta arasındaki büyük çember (haversine) mesafesi, km.
 *
 * Düz Öklid mesafesi Türkiye ölçeğinde bile yanıltır: boylam dereceleri
 * 40°K'de enlem derecelerinin yalnızca %77'si kadar yer kaplar, doğu–batı
 * mesafeler sistematik olarak abartılı çıkar.
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = (b.latitude - a.latitude) * RAD;
  const dLon = (b.longitude - a.longitude) * RAD;
  const lat1 = a.latitude * RAD;
  const lat2 = b.latitude * RAD;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Mesafeyi okunur biçimde yazar: 850 m / 12 km / 340 km. */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/**
 * Türkiye'yi kapsayan kaba sınır kutusu.
 *
 * Şematik haritanın çerçevesi budur; ülke dışındaki bir nokta kutunun dışına
 * taşmasın diye `projectToBox` değerleri 0–1 aralığına kırpar.
 */
export const TURKEY_BOUNDS = {
  minLat: 35.8,
  maxLat: 42.2,
  minLon: 25.6,
  maxLon: 44.9,
} as const;

export interface BoxPosition {
  /** Soldan oran, 0–1. */
  x: number;
  /** Üstten oran, 0–1. */
  y: number;
}

/**
 * Koordinatı sınır kutusu içinde 0–1 aralığına taşır.
 *
 * `y` ters çevrilir: ekran koordinatı yukarıdan aşağı artar, enlem ise
 * kuzeye doğru. Bu çevirmeyi unutmak, haritayı sessizce aynalar.
 */
export function projectToBox(
  point: GeoPoint,
  bounds: typeof TURKEY_BOUNDS = TURKEY_BOUNDS
): BoxPosition {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return {
    x: clamp((point.longitude - bounds.minLon) / (bounds.maxLon - bounds.minLon)),
    y: clamp(1 - (point.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)),
  };
}

/** Bir noktanın sınır kutusu içinde olup olmadığı. */
export function isWithinBounds(
  point: GeoPoint,
  bounds: typeof TURKEY_BOUNDS = TURKEY_BOUNDS
): boolean {
  return (
    point.latitude >= bounds.minLat &&
    point.latitude <= bounds.maxLat &&
    point.longitude >= bounds.minLon &&
    point.longitude <= bounds.maxLon
  );
}

/**
 * Verilen noktaya göre yakınlık sırası.
 *
 * Koordinatı olmayan kayıtlar (çevrimiçi etkinlikler gibi) listenin sonuna
 * değil, **ayrı bir listeye** çıkarılır — "sonsuz km uzakta" göstermek
 * kullanıcıya yanlış bilgi verir.
 */
export function sortByProximity<T>(
  items: T[],
  origin: GeoPoint,
  getCoords: (item: T) => GeoPoint | undefined
): { located: { item: T; distanceKm: number }[]; unlocated: T[] } {
  const located: { item: T; distanceKm: number }[] = [];
  const unlocated: T[] = [];

  for (const item of items) {
    const coords = getCoords(item);
    if (!coords) {
      unlocated.push(item);
      continue;
    }
    located.push({ item, distanceKm: haversineKm(origin, coords) });
  }

  located.sort((a, b) => a.distanceKm - b.distanceKm);
  return { located, unlocated };
}

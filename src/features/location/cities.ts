/**
 * Gözlem konumu ön ayarları — "bu gece" hesapları için (§7.9).
 *
 * Koordinatlar il merkezleridir; efemeris hesabı için gereken hassasiyet
 * budur (1 km'lik fark alacakaranlık saatini birkaç saniye değiştirir).
 * `bortle` alanı il merkezinin tipik gökyüzü kalitesidir ve yalnızca bir
 * bağlam ipucudur — gerçek ölçüm gözlem noktası kayıtlarından gelir.
 */

export interface City {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** İl merkezinin tipik Bortle sınıfı — kaba bir gösterge. */
  bortle: number;
}

/** Tüm Türkiye konumları aynı saat dilimindedir. */
export const TURKEY_TIME_ZONE = 'Europe/Istanbul';

export const cities: City[] = [
  { id: 'istanbul', name: 'İstanbul', latitude: 41.0082, longitude: 28.9784, bortle: 9 },
  { id: 'ankara', name: 'Ankara', latitude: 39.9334, longitude: 32.8597, bortle: 8 },
  { id: 'izmir', name: 'İzmir', latitude: 38.4237, longitude: 27.1428, bortle: 8 },
  { id: 'antalya', name: 'Antalya', latitude: 36.8969, longitude: 30.7133, bortle: 8 },
  { id: 'bursa', name: 'Bursa', latitude: 40.1885, longitude: 29.061, bortle: 8 },
  { id: 'adana', name: 'Adana', latitude: 37.0, longitude: 35.3213, bortle: 8 },
  { id: 'konya', name: 'Konya', latitude: 37.8746, longitude: 32.4932, bortle: 7 },
  { id: 'kayseri', name: 'Kayseri', latitude: 38.7312, longitude: 35.4787, bortle: 7 },
  { id: 'gaziantep', name: 'Gaziantep', latitude: 37.0662, longitude: 37.3833, bortle: 7 },
  { id: 'diyarbakir', name: 'Diyarbakır', latitude: 37.9144, longitude: 40.2306, bortle: 7 },
  { id: 'trabzon', name: 'Trabzon', latitude: 41.0027, longitude: 39.7168, bortle: 7 },
  { id: 'erzurum', name: 'Erzurum', latitude: 39.9043, longitude: 41.2679, bortle: 6 },
  { id: 'van', name: 'Van', latitude: 38.4891, longitude: 43.4089, bortle: 6 },
  { id: 'mugla', name: 'Muğla', latitude: 37.2153, longitude: 28.3636, bortle: 6 },
  { id: 'canakkale', name: 'Çanakkale', latitude: 40.1553, longitude: 26.4142, bortle: 6 },
];

/** İlk açılışta kullanılan konum. */
export const DEFAULT_CITY_ID = 'istanbul';

export function findCity(id: string): City | undefined {
  return cities.find((c) => c.id === id);
}

/**
 * Verilen koordinata en yakın şehri bulur — tarayıcı konum izni verildiğinde
 * ekranda gösterilecek etiketi üretmek için. Küçük mesafelerde yeterli olan
 * düz haversine kullanılır.
 */
export function nearestCity(latitude: number, longitude: number): City {
  const R = 6371;
  const rad = Math.PI / 180;

  let best = cities[0];
  let bestDistance = Infinity;

  for (const city of cities) {
    const dLat = (city.latitude - latitude) * rad;
    const dLon = (city.longitude - longitude) * rad;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(latitude * rad) *
        Math.cos(city.latitude * rad) *
        Math.sin(dLon / 2) ** 2;
    const distance = 2 * R * Math.asin(Math.sqrt(a));

    if (distance < bestDistance) {
      bestDistance = distance;
      best = city;
    }
  }

  return best;
}

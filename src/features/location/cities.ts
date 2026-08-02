/**
 * TÜRKİYE'NİN 81 İLİ — gözlem konumu ön ayarları (§4.1, §7.9).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN KODA GÖMÜLÜ — VE NEDEN 81'İN TAMAMI
 *
 * İl listesinin asıl kaynağı `provinces` tablosu (`0040`). Bu dosya onun
 * kopyası değil, VERİTABANI YOKKEN çalışan yedeği; ama iki yerde yedek
 * olmaktan çıkıp tek kaynak oluyor:
 *
 *   1. ŞEHİR SEO ROTALARI. `/{sehir}-astronomi-etkinlikleri` adresleri
 *      derleme zamanında üretiliyor (bkz. `features/city/routes.ts`).
 *      Derleme sırasında veritabanı yok, dolayısıyla liste kodda olmak
 *      ZORUNDA. Uzun süre 15 ille sınırlıydı; artık 81'i de sayfa alıyor.
 *   2. TEK DOSYA ÖNİZLEME ve testler. Orada Supabase yapılandırması
 *      bulunmuyor; 15 ille açılan bir seçici, kullanıcının ilini hiç
 *      bulamadığı bir seçici demekti.
 *
 * Koordinatlar `provinces` tablosundan alındı ve İL MERKEZLERİDİR;
 * efemeris için gereken hassasiyet budur (1 km'lik fark alacakaranlığı
 * birkaç saniye kaydırır). Daha ince konum için ilçe seçimi
 * (`services/content/districts.ts`) ya da cihaz konumu kullanılıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PLAKA KODU TAŞINIYOR
 *
 * Daha önce bu listede kod yoktu ve yedeğe düşüldüğünde `provinces.ts`
 * uydurma NEGATİF kodlar üretiyordu. Sonucu şuydu: yapılandırma yokken
 * ilçe seçici hiç çalışmıyordu, çünkü ilçeler gerçek plaka koduyla
 * sorgulanıyor. Kodlar artık burada; yedek yol da ilçe getirebiliyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BORTLE ALANI 15 İLDE DOLU, 66 İLDE BOŞ — BİLEREK
 *
 * Bortle bir ÖLÇÜM. Elimizde on beş il merkezi için gözleme dayalı tipik
 * değer var; kalan altmış altısı için yok. Nüfusa ya da uydu görüntüsüne
 * bakıp sayı üretmek, kullanıcının gökyüzü beklentisini yanlış kurardı:
 * "Bortle 6" yazan bir ilde Samanyolu göreceğini sanıp yola çıkan biri
 * için bu, boş bırakmaktan daha kötü. Alan `undefined` kaldığında arayüz
 * sayı yerine "—" gösteriyor ve gerçek ölçüm gözlem noktası kayıtlarından
 * geliyor.
 */

export interface City {
  /** Plaka kodu — kanonik ve değişmez kimlik; `provinces.code` ile aynı. */
  code: number;
  /** Adres parçası ve arama anahtarı; `provinces.slug` ile aynı. */
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Ölçülmüş tipik Bortle sınıfı; ÖLÇÜM YOKSA tanımsız (yukarıya bak). */
  bortle?: number;
}

/** Tüm Türkiye konumları aynı saat dilimindedir. */
export const TURKEY_TIME_ZONE = 'Europe/Istanbul';

/**
 * Satırlar nesne değil DİZİ olarak yazılı.
 *
 * Seksen bir nesne literali dört alan adını seksen bir kez tekrarlardı;
 * demet biçimi paketten yaklaşık 1 kB (gzip) kazandırıyor ve bu dosya
 * ilk yüklenen parçanın içinde. Okunurluk kaybı, hemen altındaki tek
 * eşlemeyle karşılanıyor.
 *
 * Sıra: plaka, kimlik, ad, enlem, boylam. Alfabetik — `provinces`
 * tablosundaki `sort_order` ile birebir aynı.
 */
type CityRow = [
  code: number,
  id: string,
  name: string,
  latitude: number,
  longitude: number,
];

const ROWS: CityRow[] = [
  [1, 'adana', 'Adana', 37.0, 35.3213],
  [2, 'adiyaman', 'Adıyaman', 37.7648, 38.2786],
  [3, 'afyonkarahisar', 'Afyonkarahisar', 38.7507, 30.5567],
  [4, 'agri', 'Ağrı', 39.7191, 43.0503],
  [68, 'aksaray', 'Aksaray', 38.3687, 34.037],
  [5, 'amasya', 'Amasya', 40.6499, 35.8353],
  [6, 'ankara', 'Ankara', 39.9334, 32.8597],
  [7, 'antalya', 'Antalya', 36.8969, 30.7133],
  [75, 'ardahan', 'Ardahan', 41.1105, 42.7022],
  [8, 'artvin', 'Artvin', 41.1828, 41.8183],
  [9, 'aydin', 'Aydın', 37.856, 27.8416],
  [10, 'balikesir', 'Balıkesir', 39.6484, 27.8826],
  [74, 'bartin', 'Bartın', 41.6344, 32.3375],
  [72, 'batman', 'Batman', 37.8812, 41.1351],
  [69, 'bayburt', 'Bayburt', 40.2552, 40.2249],
  [11, 'bilecik', 'Bilecik', 40.1451, 29.9799],
  [12, 'bingol', 'Bingöl', 38.8854, 40.4966],
  [13, 'bitlis', 'Bitlis', 38.4006, 42.1095],
  [14, 'bolu', 'Bolu', 40.7392, 31.6089],
  [15, 'burdur', 'Burdur', 37.7203, 30.2908],
  [16, 'bursa', 'Bursa', 40.1885, 29.061],
  [17, 'canakkale', 'Çanakkale', 40.1553, 26.4142],
  [18, 'cankiri', 'Çankırı', 40.6013, 33.6134],
  [19, 'corum', 'Çorum', 40.5506, 34.9556],
  [20, 'denizli', 'Denizli', 37.7765, 29.0864],
  [21, 'diyarbakir', 'Diyarbakır', 37.9144, 40.2306],
  [81, 'duzce', 'Düzce', 40.8438, 31.1565],
  [22, 'edirne', 'Edirne', 41.6818, 26.5623],
  [23, 'elazig', 'Elazığ', 38.681, 39.2264],
  [24, 'erzincan', 'Erzincan', 39.75, 39.5],
  [25, 'erzurum', 'Erzurum', 39.9043, 41.2679],
  [26, 'eskisehir', 'Eskişehir', 39.7767, 30.5206],
  [27, 'gaziantep', 'Gaziantep', 37.0662, 37.3833],
  [28, 'giresun', 'Giresun', 40.9128, 38.3895],
  [29, 'gumushane', 'Gümüşhane', 40.4386, 39.5086],
  [30, 'hakkari', 'Hakkâri', 37.5744, 43.7408],
  [31, 'hatay', 'Hatay', 36.2025, 36.1606],
  [76, 'igdir', 'Iğdır', 39.888, 44.0048],
  [32, 'isparta', 'Isparta', 37.7648, 30.5566],
  [34, 'istanbul', 'İstanbul', 41.0082, 28.9784],
  [35, 'izmir', 'İzmir', 38.4237, 27.1428],
  [46, 'kahramanmaras', 'Kahramanmaraş', 37.5858, 36.9371],
  [78, 'karabuk', 'Karabük', 41.2061, 32.6204],
  [70, 'karaman', 'Karaman', 37.1811, 33.215],
  [36, 'kars', 'Kars', 40.6013, 43.0975],
  [37, 'kastamonu', 'Kastamonu', 41.3887, 33.7827],
  [38, 'kayseri', 'Kayseri', 38.7312, 35.4787],
  [79, 'kilis', 'Kilis', 36.7184, 37.1212],
  [71, 'kirikkale', 'Kırıkkale', 39.8468, 33.5153],
  [39, 'kirklareli', 'Kırklareli', 41.7333, 27.2167],
  [40, 'kirsehir', 'Kırşehir', 39.1425, 34.1709],
  [41, 'kocaeli', 'Kocaeli', 40.8533, 29.8815],
  [42, 'konya', 'Konya', 37.8746, 32.4932],
  [43, 'kutahya', 'Kütahya', 39.4167, 29.9833],
  [44, 'malatya', 'Malatya', 38.3552, 38.3095],
  [45, 'manisa', 'Manisa', 38.6191, 27.4289],
  [47, 'mardin', 'Mardin', 37.3212, 40.7245],
  [33, 'mersin', 'Mersin', 36.8, 34.6333],
  [48, 'mugla', 'Muğla', 37.2153, 28.3636],
  [49, 'mus', 'Muş', 38.9462, 41.7539],
  [50, 'nevsehir', 'Nevşehir', 38.6939, 34.6857],
  [51, 'nigde', 'Niğde', 37.9667, 34.6833],
  [52, 'ordu', 'Ordu', 40.9839, 37.8764],
  [80, 'osmaniye', 'Osmaniye', 37.0742, 36.2464],
  [53, 'rize', 'Rize', 41.0201, 40.5234],
  [54, 'sakarya', 'Sakarya', 40.7569, 30.3783],
  [55, 'samsun', 'Samsun', 41.2867, 36.33],
  [63, 'sanliurfa', 'Şanlıurfa', 37.1591, 38.7969],
  [56, 'siirt', 'Siirt', 37.9333, 41.95],
  [57, 'sinop', 'Sinop', 42.0231, 35.1531],
  [73, 'sirnak', 'Şırnak', 37.4187, 42.4918],
  [58, 'sivas', 'Sivas', 39.7477, 37.0179],
  [59, 'tekirdag', 'Tekirdağ', 40.9833, 27.5167],
  [60, 'tokat', 'Tokat', 40.3167, 36.55],
  [61, 'trabzon', 'Trabzon', 41.0027, 39.7168],
  [62, 'tunceli', 'Tunceli', 39.1079, 39.5401],
  [64, 'usak', 'Uşak', 38.6823, 29.4082],
  [65, 'van', 'Van', 38.4891, 43.4089],
  [77, 'yalova', 'Yalova', 40.65, 29.2667],
  [66, 'yozgat', 'Yozgat', 39.8181, 34.8147],
  [67, 'zonguldak', 'Zonguldak', 41.4564, 31.7987],
];

/**
 * ÖLÇÜLMÜŞ il merkezi Bortle değerleri.
 *
 * Ayrı bir tabloda çünkü satırların çoğunda yok; demetin beşinci alanı
 * yapılsaydı altmış altı satırda `undefined` yazardı ve "bilinmiyor"
 * kaydı, "sıfır" ya da "unutulmuş" ile karışırdı. Buradaki her anahtar
 * bir iddia: değeri olan illerde ölçüme dayanan bir bilgi var.
 */
const BORTLE: Record<string, number> = {
  istanbul: 9,
  ankara: 8,
  izmir: 8,
  antalya: 8,
  bursa: 8,
  adana: 8,
  konya: 7,
  kayseri: 7,
  gaziantep: 7,
  diyarbakir: 7,
  trabzon: 7,
  erzurum: 6,
  van: 6,
  mugla: 6,
  canakkale: 6,
};

export const cities: City[] = ROWS.map(([code, id, name, latitude, longitude]) => {
  const city: City = { code, id, name, latitude, longitude };
  const bortle = BORTLE[id];
  if (bortle !== undefined) city.bortle = bortle;
  return city;
});

/** İlk açılışta kullanılan konum. */
export const DEFAULT_CITY_ID = 'istanbul';

const byId = new Map(cities.map((c) => [c.id, c]));

export function findCity(id: string): City | undefined {
  return byId.get(id);
}

/** Plaka kodundan il — ilçe seçimi kodla çalıştığı için gerekiyor. */
export function findCityByCode(code: number): City | undefined {
  return cities.find((c) => c.code === code);
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

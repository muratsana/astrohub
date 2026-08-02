/**
 * ŞEHİR SAYFASININ İNDEKSLENMEYE DEĞİP DEĞMEDİĞİ (§15.3).
 *
 * ══════════════════════════════════════════════════════════════════════
 * SORUN BU OTURUMDA BEŞ KAT BÜYÜDÜ
 *
 * Şehir sayfaları uzun süre on beş ille sınırlıydı ve on beşi de gerçek
 * içerik taşıyordu. Liste 81'e çıkarıldığında sayfa sayısı 5,4 katına
 * çıktı ama İÇERİK çıkmadı: Bayburt'ta etkinlik yok, kulüp yok, yakında
 * kayıtlı gözlem sahası yok.
 *
 * Geriye kalan tek şey şablon ve o şehrin koordinatından hesaplanan
 * karanlık penceresi. Sayı olarak biricik, YAPI olarak 81 sayfada aynı —
 * arama motorunun "doorway page" dediği tam olarak bu. Belge bunu adıyla
 * yasaklıyor: "boş şehir sayfasını ince içerikle indexlememe".
 *
 * ══════════════════════════════════════════════════════════════════════
 * NOINDEX SAYFAYI KAPATMAK DEĞİL
 *
 * Sayfa ziyaretçiye AÇIK kalıyor ve işe yarıyor: Bayburt'a bakan biri
 * bu gecenin karanlık penceresini görüyor. Değişen tek şey, arama
 * motoruna "bunu dizine ekle" demememiz.
 *
 * `noindex, follow` — `nofollow` DEĞİL: sayfadaki bağlantılar (yakın
 * sahalar, etkinlikler) izlenmeye devam etsin. İnce olan sayfa, işaret
 * ettiği içerik değil.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TEK KURAL, İKİ ÇAĞIRAN
 *
 * Kural hem sayfada (`<meta robots>`) hem sitemap'te geçerli olmak
 * zorunda: `noindex` bir sayfayı sitemap'te listelemek arama motoruna
 * çelişkili iki sinyal göndermek demek — "bunu indeksle" ve "indeksleme".
 *
 * İki yerde iki kopya kural yazmak, bu deponun defalarca yakaladığı
 * hatanın (bir taraf yazıyor, öteki okumuyor) yeni bir örneği olurdu.
 * O yüzden kural burada, saf ve tek.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DERLEME ZAMANI İLE ÇALIŞMA ZAMANI AYNI VERİYİ GÖRMÜYOR — BİLEREK
 *
 * Sayfa canlı katalogları okuyor, sitemap derleme anındaki listeyi.
 * Bir şehre bugün etkinlik eklenirse sayfa hemen indekslenebilir hâle
 * geliyor, sitemap ise bir sonraki derlemede öğreniyor. Bu bir kusur
 * değil: sitemap zaten periyodik bir bildirim ve `noindex`in kalkması
 * sayfanın kendisinde anında görünüyor. Ters yön de güvenli — sitemap'te
 * olmayan bir sayfa yine de taranabilir.
 */

/**
 * "Yakın" sayılan yarıçap, km.
 *
 * `CityPage`in yerel sabitiydi ve sitemap onu göremiyordu — yani iki
 * taraf aynı şehri farklı sayabilirdi. Ölçüt kuralla birlikte buraya
 * taşındı.
 */
export const NEARBY_KM = 200;

/** İki nokta arası uzaklık için gereken en küçük şekil. */
export interface CityPoint {
  latitude: number;
  longitude: number;
}

/**
 * Etkinlik bu şehre mi ait?
 *
 * ŞEHİR ADI VEYA MESAFE. Etkinlikte ikisi de anlamlı: "Ankara'da"
 * yazan bir atölye adla eşleşiyor, Ankara'ya 90 km'deki bir gözlem
 * şenliği ise Ankaralı için hâlâ ulaşılabilir.
 */
export function eventBelongsToCity(
  city: CityPoint & { name: string },
  event: { city: string; coords?: CityPoint | null },
  distanceKm: (a: CityPoint, b: CityPoint) => number
): boolean {
  if (event.city === city.name) return true;
  if (!event.coords) return false;
  return distanceKm(city, event.coords) <= NEARBY_KM;
}

/**
 * Gözlem sahası bu şehrin yakınında mı?
 *
 * Yarıçap etkinliğin 1,5 katı: sahaya gitmek zaten bir yolculuk ve
 * karanlık gökyüzü tanım gereği şehirden uzakta.
 */
export function siteIsNearCity(
  city: CityPoint,
  site: { coords: CityPoint },
  distanceKm: (a: CityPoint, b: CityPoint) => number
): boolean {
  return distanceKm(city, site.coords) <= NEARBY_KM * 1.5;
}

/**
 * Kulüp bu şehre mi ait?
 *
 * MESAFE DEĞİL AD. Bir kulüp "Ankara'ya 180 km" diye tarif edilmez,
 * bir şehre aittir; etkinlikte mesafe anlamlı (yola çıkılır), kurumda
 * değil.
 */
export function clubBelongsToCity(
  city: { name: string },
  club: { city: string }
): boolean {
  return club.city === city.name;
}

export interface CitySubstance {
  /** Şehirde ya da yakınındaki etkinlik sayısı. */
  events: number;
  /** Şehre kayıtlı kulüp/topluluk sayısı. */
  clubs: number;
  /** Yakındaki gözlem sahası sayısı. */
  sites: number;
}

/**
 * Sayfa dizine sunulacak kadar kendine ait içerik taşıyor mu?
 *
 * EŞİK BİR: üç kümeden herhangi birinde tek bir kayıt yeterli. Daha
 * yükseği (ör. "en az üç etkinlik") gerçek ama küçük şehirleri
 * cezalandırırdı — Bilecik'teki tek kulüp o sayfayı arayan kişi için
 * sayfanın TAMAMI.
 *
 * Karanlık penceresi bilerek SAYILMIYOR. Her şehirde var, yani ölçüt
 * olarak kullanılsaydı hiçbir sayfayı elemezdi ve kural bir kural
 * olmaktan çıkardı.
 */
export function cityPageIsIndexable(counts: CitySubstance): boolean {
  return counts.events > 0 || counts.clubs > 0 || counts.sites > 0;
}

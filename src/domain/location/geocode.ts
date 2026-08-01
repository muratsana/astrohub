/**
 * TERS COĞRAFİ KODLAMA — koordinattan yer adına (§4.2).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ÖNCEKİ DURUM: 15 ŞEHRE YUVARLANAN BİR ÜLKE
 *
 * Cihaz konumu alındığında etiket `nearestCity` ile üretiliyordu ve o
 * fonksiyon uygulamanın içindeki 15 şehirlik ön ayar listesine bakıyordu.
 * Sivas'taki kullanıcıya "Kayseri", Rize'dekine "Trabzon", Muş'takine
 * "Van" yazıyordu. Yanlış il adı yalnızca kozmetik değil: kullanıcı
 * gördüğü etikete bakıp konumun doğru alındığını sanıyordu.
 *
 * Artık aday listesi 81 ilin tamamı (`provinces` tablosu). Hesap
 * DEĞİŞMEDİ — değişen, hangi listeye bakıldığı.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NEDEN ADAPTER
 *
 * Belge sağlayıcının değiştirilebilir olmasını istiyor. Bugün dışarıya
 * çıkmayan yerel bir çözücü kullanılıyor; bunun bilinçli sebebi var:
 *
 * · Koordinat KİŞİSEL VERİ. Ters kodlama için üçüncü bir servise
 *   göndermek, "koordinat sunucuya gönderilmez" cümlesini bozardı.
 * · Ülke içi il çözünürlüğünde uzak bir servise ihtiyaç yok; 81 nokta
 *   arasından en yakınını bulmak birkaç mikrosaniye.
 *
 * Sağlayıcı gerektiğinde (ilçe/mahalle çözünürlüğü) `ReverseGeocoder`
 * arayüzünü uygulayan başka bir nesne verilerek değiştirilir; çağıran
 * taraf değişmez.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SINIR VE VPN DURUMU — "EN YAKIN" HER ZAMAN "DOĞRU" DEĞİL
 *
 * En yakın komşuyu koşulsuz döndüren bir çözücü, Sofya'daki bir VPN
 * çıkışına "Kırklareli", Atina'dakine "Muğla" der. Kullanıcı Türkiye'de
 * olmadığı hâlde bir il adı görür ve efemeris hesabının o ile göre
 * yapıldığını sanır.
 *
 * Bu yüzden mesafe eşiği var: en yakın il `MAX_MATCH_KM`den uzaksa
 * eşleşme YOK sayılıyor ve `null` dönüyor. Çağıran taraf o zaman il adı
 * uydurmuyor, "cihaz konumu" diyor. Hesap yine gerçek koordinatla
 * yapılıyor — yalnızca ETİKET iddiasız kalıyor.
 *
 * 250 km: Türkiye'nin en büyük ili Konya'nın yarıçapı ~150 km, en uzak
 * il merkezi–sınır mesafesi bunun altında. 250 km ülke içindeki her
 * noktayı rahatça kapsar, komşu ülkelerin iç bölgelerini kapsamaz.
 */

export interface GeoPlace {
  name: string;
  latitude: number;
  longitude: number;
  /** Çağıranın kaydı geri bulması için — il slug'ı. */
  ref?: string;
}

export interface ReverseGeocodeMatch {
  label: string;
  ref?: string;
  latitude: number;
  longitude: number;
  /** Koordinatın eşleşen yer merkezine uzaklığı. */
  distanceKm: number;
}

/**
 * Sağlayıcı arayüzü. Eşleşme bulunamazsa `null` — hata değil, "bilmiyorum".
 */
export interface ReverseGeocoder {
  resolve(
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodeMatch | null>;
}

/** Bu mesafeden uzak eşleşme kabul edilmiyor (bkz. dosya başı). */
export const MAX_MATCH_KM = 250;

const EARTH_RADIUS_KM = 6371;
const RAD = Math.PI / 180;

/**
 * İki koordinat arasındaki büyük daire mesafesi (km).
 *
 * Haversine: ülke ölçeğinde metrelik hata verir, il eşlemesi için fazlasıyla
 * yeterli. Düz Öklid mesafesi kullanmak, Türkiye enlemlerinde boylam
 * farkını ~%25 fazla ağırlıklandırırdı (cos(39°) ≈ 0.78) — doğu-batı
 * komşular arasında yanlış ile düşürebilirdi.
 */
export function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  const dLat = (bLat - aLat) * RAD;
  const dLon = (bLon - aLon) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * RAD) * Math.cos(bLat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Listedeki en yakın yer ve uzaklığı; liste boşsa `null`.
 *
 * Eşiği UYGULAMIYOR — bu ayrım bilinçli: "en yakın hangisi" ile "bu
 * eşleşme kabul edilebilir mi" iki ayrı soru ve ikincisi çağırana ait
 * (harita farklı, etiket farklı eşik isteyebilir).
 */
export function nearestPlace(
  places: readonly GeoPlace[],
  latitude: number,
  longitude: number
): ReverseGeocodeMatch | null {
  let best: ReverseGeocodeMatch | null = null;

  for (const place of places) {
    const distanceKm = haversineKm(
      latitude,
      longitude,
      place.latitude,
      place.longitude
    );
    if (!best || distanceKm < best.distanceKm) {
      best = {
        label: place.name,
        ref: place.ref,
        latitude: place.latitude,
        longitude: place.longitude,
        distanceKm,
      };
    }
  }

  return best;
}

/**
 * Yerel çözücü — dışarıya istek atmaz.
 *
 * @param load Aday listesini veren işlev. İşlev olarak alınıyor çünkü il
 *   listesi asenkron geliyor (veritabanı) ve çözücü kurulurken hazır
 *   olmayabilir; ayrıca liste tazelendiğinde çözücüyü yeniden kurmak
 *   gerekmiyor.
 * @param maxMatchKm Kabul eşiği; sınır/VPN durumu için (bkz. dosya başı).
 */
export function createLocalReverseGeocoder(
  load: () => Promise<readonly GeoPlace[]>,
  maxMatchKm: number = MAX_MATCH_KM
): ReverseGeocoder {
  return {
    async resolve(latitude, longitude) {
      /* Geçersiz koordinatta liste bile istenmiyor: NaN karşılaştırması
         her zaman false döner ve sessizce listenin ilk kaydı "en yakın"
         seçilirdi. */
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      let places: readonly GeoPlace[];
      try {
        places = await load();
      } catch {
        /* Liste okunamadıysa etiket üretilmiyor. Sağlayıcı hatasının
           doğru karşılığı yanlış bir il adı değil, adsızlık. */
        return null;
      }

      const match = nearestPlace(places, latitude, longitude);
      if (!match || match.distanceKm > maxMatchKm) return null;
      return match;
    },
  };
}

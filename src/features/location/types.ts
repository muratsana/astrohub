/**
 * Konum katmanının paylaşılan türleri.
 *
 * `LocationContext` bir BİLEŞEN dosyası; tür almak için onu içe aktarmak,
 * kimlik katmanını ve testleri React ağacına bağlıyordu. Türler burada
 * duruyor ve kimse kimseyi ağaca sürüklemiyor.
 */

export type LocationSource = 'default' | 'city' | 'device';

/** Konum izni akışının hangi aşamada olduğu. */
export type PermissionState =
  | 'unasked' // kullanıcıya henüz sorulmadı
  | 'granted' // cihaz konumu kullanılıyor
  | 'denied' // reddedildi ya da hata aldı
  | 'dismissed' // "şehir seçeyim" dendi
  | 'pending'; // tarayıcı diyaloğu açık

export interface ObservingLocation {
  /** Ekranda gösterilecek ad. */
  label: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  source: LocationSource;
  /**
   * Konum bir ŞEHİR ön ayarından geliyorsa o şehrin slug'ı.
   *
   * Cihaz konumunda YOK ve olmaması bilinçli: bu alan paylaşılabilir
   * bağlantıya yazılıyor (`/bu-gece?sehir=...`) ve cihaz konumunun
   * paylaşılacak bir karşılığı olmamalı — kullanıcının nerede gözlem
   * yaptığını yayımlamak §14.4'ün korumaya çalıştığı şey.
   */
  cityId?: string;
  /**
   * İlçe seçildiyse onun slug'ı ve adı.
   *
   * KOORDİNAT İLÇE MERKEZİNDEN geliyor ve bu bir YAKLAŞIKLIK: gözlem
   * yeri merkezde değil, çoğu zaman şehirden uzakta. Cihaz konumu bir
   * ÖLÇÜM; arayüz ikisini ayrı gösteriyor.
   */
  districtId?: string;
  districtName?: string;
  /**
   * Kullanıcının bulunduğu İLİN ADI — 81 ilden biri, kanonik yazımıyla.
   *
   * `label`DEN AYRI VE ONUN YERİNE GEÇMEZ. `label` gösterim için: kaynağa
   * göre "İstanbul", "Ankara / Çankaya" ya da eşleşme yoksa "Cihaz konumu"
   * olabiliyor. Bu alan bir VERİ: doluysa `provinces` listesinde birebir
   * karşılığı olduğu garanti, boşsa il bilinmiyor demek.
   *
   * Ayrımın somut sebebi ilan formuydu. Şehir alanı `label` ile
   * dolduruluyordu; cihaz konumu kullanan biri formu "Cihaz konumu"
   * seçili buluyor, fark etmeden kaydedince pazaryeri süzgecine il
   * olmayan bir değer giriyordu. Etiketi ayrıştırıp il adını geri
   * çıkarmak (`split(' / ')`) aynı bilgiyi ikinci kez, kırılgan biçimde
   * üretmek olurdu.
   *
   * `cityId` bunun yerine geçmiyor: o alan cihaz konumunda BİLEREK boş
   * (paylaşılabilir bağlantı ondan kuruluyor, §14.4). Bu alan bir kayda
   * işaret etmiyor, bir ad taşıyor.
   */
  provinceName?: string;
  /** Şehir ön ayarından geliyorsa tipik Bortle sınıfı. */
  bortle?: number;
}

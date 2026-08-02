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
  /** Şehir ön ayarından geliyorsa tipik Bortle sınıfı. */
  bortle?: number;
}

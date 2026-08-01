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
  /** Şehir ön ayarından geliyorsa tipik Bortle sınıfı. */
  bortle?: number;
}

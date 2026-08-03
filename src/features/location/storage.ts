import type { LocationSource, PermissionState } from './types';

/**
 * KONUM KAYDI — tarayıcıda kalan tek yer.
 *
 * Kayıt `LocationContext` içindeydi. Ayrı dosyaya çıkmasının sebebi
 * §4.2'nin son maddesi: "çıkış yapıldığında kişisel konum verisi güvenli
 * biçimde temizlenmeli". Temizliği yapacak olan `AuthContext`; onun
 * konum SAĞLAYICISINI içe aktarması, kimlik katmanını arayüz ağacına
 * bağlamak olurdu. İkisi de bu küçük modülü tanıyor, birbirini değil.
 *
 * NE SAKLANIYOR: cihaz konumunda ham koordinat (yalnızca burada, sunucuya
 * gitmiyor), şehir seçiminde il kodu/slug'ı, bir de izin durumu.
 * Koordinat kişisel veridir — ortak bilgisayarda oturum kapatan
 * kullanıcının nereden gözlem yaptığı tarayıcıda kalmamalı.
 */

const STORAGE_KEY = 'astrohub:location';

export interface StoredLocation {
  source: LocationSource;
  /** İl slug'ı — `provinces.slug` ya da tohum şehir kimliği. */
  cityId?: string;
  latitude?: number;
  longitude?: number;
  label?: string;
  /**
   * Cihaz konumu bir ilçeye yeterince yakınsa o ilçenin adı.
   *
   * Etiketin içinde zaten var ("Ankara / Çankaya"); ayrı alan, yenilemeden
   * sonra durumun etiketle TUTARLI dönmesi için. Yalnız etiketi saklasaydık
   * `districtName` yenilemede boşalır, aynı ekran iki farklı duruma
   * karşılık gelirdi.
   */
  districtName?: string;
  /** Cihaz konumunda çözülen il adı — `cityId` orada bilerek boş. */
  provinceName?: string;
  /** Gözlem noktası seçildiyse rakım. */
  altitude?: number;
  permission?: PermissionState;
}

export function readStoredLocation(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredLocation) : null;
  } catch {
    return null;
  }
}

export function writeStoredLocation(value: StoredLocation): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Depolama yoksa seçim yalnızca bu oturumda geçerli olur.
  }
}

/**
 * Kaydı siler — çıkışta çağrılıyor.
 *
 * TAMAMI SİLİNİYOR, YALNIZCA KOORDİNAT DEĞİL. Şehir seçimi de kişisel
 * bir ipucu: ortak bilgisayarda bir sonraki kullanıcının açılışta
 * "Erzurum" görmesi, önceki kişinin nerede olduğunu söyler. Silmenin
 * bedeli bir kez daha şehir seçmek; saklamanın bedeli sızıntı.
 */
export function clearStoredLocation(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Depolama erişilemiyorsa silinecek bir şey de yok.
  }
}

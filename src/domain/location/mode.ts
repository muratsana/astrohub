/**
 * KONUM MODU — açık durum makinesi (Faz 1.2).
 *
 * ══════════════════════════════════════════════════════════════════════
 * DÜZELTİLEN HATA
 *
 * Kullanıcı manuel bir şehir seçtikten sonra GPS'e dönemiyordu. Sebep
 * mimariydi: tek bir `permission` değişkeni HEM tarayıcı iznini HEM de
 * kullanıcının tercihini taşıyordu. Şehir seçmek onu `dismissed`
 * yapıyor, `dismissed` da GPS önerisini kapatıyordu — yani manuel seçim,
 * izni hiç reddetmemiş bir kullanıcıda bile GPS yolunu kalıcı kapatıyordu.
 *
 * İkisi artık AYRI:
 *   · `mode`       — kullanıcının ne istediği (AUTO_GPS / MANUAL)
 *   · `permission` — tarayıcının ne dediği (granted / denied / prompt)
 *
 * Manuel seçim yalnızca `mode`u değiştiriyor. İzin hâlâ verilebilir
 * durumda olduğu için "Otomatik konuma dön" her zaman çalışıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İKİ KONUM AYRI SAKLANIYOR
 *
 * `lastManual` ve `lastGps` ayrı alanlar. Tek alan olsaydı kullanıcı
 * GPS'e geçip geri döndüğünde seçtiği şehir kaybolurdu ve listeden
 * yeniden bulması gerekirdi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DENIED KALICI DEĞİL
 *
 * Kullanıcı tarayıcı ayarlarından izni sonradan açabilir. `DENIED`
 * durumundan `AUTO_GPS`a geçiş AÇIK: `requestAuto` her durumdan
 * çağrılabiliyor. Kapalı olsaydı, izni açan kullanıcı sekmeyi kapatıp
 * açmadan GPS kullanamazdı.
 *
 * Ama İZİNSİZ PROMPT TETİKLENMİYOR: `shouldPrompt` yalnızca izin
 * `denied` DEĞİLKEN true. Reddedilmiş bir tarayıcıda `getCurrentPosition`
 * çağırmak sessizce anında hata döndürür ve kullanıcı hiçbir şey olmamış
 * gibi görür — bu yüzden çağrılmıyor, yerine "ayarlardan nasıl açılır"
 * anlatılıyor.
 */

export type LocationMode =
  /** Cihaz konumu kullanılıyor ya da isteniyor. */
  | 'AUTO_GPS'
  /** Kullanıcı listeden şehir seçti. */
  | 'MANUAL'
  /** Tarayıcı iznini reddetti. */
  | 'DENIED'
  /** Tarayıcıda geolocation yok ya da güvensiz bağlam (HTTP). */
  | 'UNAVAILABLE'
  /** İstek yapıldı ama başarısız oldu (zaman aşımı, servis kapalı). */
  | 'ERROR';

export interface LocationFix {
  label: string;
  latitude: number;
  longitude: number;
  /** Şehir ön ayarındansa plaka kodu ya da slug. */
  ref?: string;
}

export interface LocationState {
  mode: LocationMode;
  /** Son başarılı cihaz konumu — moddan bağımsız saklanıyor. */
  lastGps: LocationFix | null;
  /** Son elle seçilen konum — moddan bağımsız saklanıyor. */
  lastManual: LocationFix | null;
  /** Kullanıcıya gösterilecek son hata metni; mod değişince temizlenir. */
  error: string | null;
}

export const INITIAL_STATE: LocationState = {
  mode: 'MANUAL',
  lastGps: null,
  lastManual: null,
  error: null,
};

export type LocationEvent =
  /** Kullanıcı "Konumumu kullan" / "Otomatik konuma dön" dedi. */
  | { type: 'REQUEST_AUTO' }
  /** Cihaz konumu geldi. */
  | { type: 'GPS_OK'; fix: LocationFix }
  /** Kullanıcı izni reddetti. */
  | { type: 'GPS_DENIED' }
  /** Tarayıcıda geolocation yok ya da bağlam güvensiz. */
  | { type: 'GPS_UNAVAILABLE' }
  /** Başka bir hata (zaman aşımı, konum servisi kapalı). */
  | { type: 'GPS_ERROR'; message: string }
  /** Kullanıcı listeden şehir seçti. */
  | { type: 'SELECT_MANUAL'; fix: LocationFix };

export function reduce(state: LocationState, event: LocationEvent): LocationState {
  switch (event.type) {
    case 'REQUEST_AUTO':
      /*
       * HER DURUMDAN çağrılabiliyor — DENIED ve ERROR dahil. Kullanıcı
       * tarayıcı ayarlarından izni açmış olabilir ve bunu bize haber
       * verecek bir olay yok; tek yol yeniden denemek.
       */
      return { ...state, mode: 'AUTO_GPS', error: null };

    case 'GPS_OK':
      return { ...state, mode: 'AUTO_GPS', lastGps: event.fix, error: null };

    case 'GPS_DENIED':
      /*
       * Manuel konum KORUNUYOR. Reddedilen izin, kullanıcının daha önce
       * seçtiği şehri silmemeli — aksi hâlde ekran boşalır.
       */
      return { ...state, mode: 'DENIED', error: null };

    case 'GPS_UNAVAILABLE':
      return { ...state, mode: 'UNAVAILABLE', error: null };

    case 'GPS_ERROR':
      return { ...state, mode: 'ERROR', error: event.message };

    case 'SELECT_MANUAL':
      /*
       * ASIL DÜZELTME. Manuel seçim yalnızca modu değiştiriyor; izinle
       * ilgili hiçbir şeye dokunmuyor. Eski kodda bu, GPS önerisini
       * kalıcı olarak kapatıyordu.
       */
      return { ...state, mode: 'MANUAL', lastManual: event.fix, error: null };

    default:
      return state;
  }
}

/**
 * O anda gösterilecek konum.
 *
 * AUTO_GPS'te henüz konum gelmediyse manuel olana düşüyor: boş bir
 * ekran yerine son bilinen konum gösteriliyor ve üstünde "aranıyor"
 * durumu duruyor.
 */
export function activeFix(state: LocationState): LocationFix | null {
  if (state.mode === 'AUTO_GPS' && state.lastGps) return state.lastGps;
  return state.lastManual ?? state.lastGps;
}

/**
 * Tarayıcıya konum sorulmalı mı?
 *
 * `DENIED`de FALSE: reddedilmiş bir tarayıcıda `getCurrentPosition`
 * anında hata döndürür, kullanıcı hiçbir diyalog görmez ve "tıkladım
 * ama bir şey olmadı" der. Onun yerine ayar yönergesi gösteriliyor.
 */
export function shouldPrompt(state: LocationState): boolean {
  return state.mode === 'AUTO_GPS';
}

/** Kullanıcıya tarayıcı ayarı anlatılmalı mı? */
export function needsPermissionHelp(state: LocationState): boolean {
  return state.mode === 'DENIED';
}

/**
 * "Otomatik konuma dön" düğmesi görünür mü?
 *
 * HER ZAMAN — `AUTO_GPS` dışında. `UNAVAILABLE`da bile görünüyor çünkü
 * kullanıcı tarayıcısını değiştirmiş ya da HTTPS'e geçmiş olabilir;
 * düğmeyi gizlemek onu çıkmaza sokardı.
 */
export function canReturnToAuto(state: LocationState): boolean {
  return state.mode !== 'AUTO_GPS';
}

/** Mod için kullanıcıya gösterilecek kısa açıklama. */
export const modeLabels: Record<LocationMode, string> = {
  AUTO_GPS: 'Cihaz konumu',
  MANUAL: 'Elle seçildi',
  DENIED: 'Konum izni kapalı',
  UNAVAILABLE: 'Cihaz konumu desteklenmiyor',
  ERROR: 'Konum alınamadı',
};

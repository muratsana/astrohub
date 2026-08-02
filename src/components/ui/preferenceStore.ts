/**
 * ARAYÜZ TERCİHİ KAYIT DEFTERİ — hesap katmanının bağlantı noktası.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BİR DEFTER, DOĞRUDAN ÇAĞRI DEĞİL
 *
 * `useStoredChoice` bir TASARIM SİSTEMİ kancası (`components/ui`).
 * Hesapta saklama Supabase ve oturum gerektiriyor, yani
 * `features/`e ait. Kancanın oradan içe aktarma yapması, tasarım
 * sisteminin ürün katmanına bağlanması demekti — ok ters yöne
 * bakardı ve `components/ui` tek başına test edilemez hâle gelirdi.
 *
 * Defter bu bağı tersine çeviriyor: burası React'sız, Supabase'siz,
 * yalnızca bir kayıt noktası. Ürün katmanı (`UiPreferencesProvider`)
 * kendini BURAYA yazıyor; kanca yalnızca deftere bakıyor. Adaptör
 * kaydedilmemişse (testler, önizleme derlemesi, oturumsuz kullanıcı)
 * her şey `localStorage` ile çalışmaya devam ediyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ABONELİK VAR, ÇÜNKÜ HESAP DEĞERİ SONRA GELİYOR
 *
 * Kanca ilk karede `localStorage`u okuyor (anında, titremesiz). Hesap
 * satırları bir ağ turu sonra geliyor. Abonelik olmasaydı kanca o
 * değeri hiç görmezdi ve "başka cihazda seçtiğim görünüm" hiçbir zaman
 * uygulanmazdı — özelliğin tamamı bu tur için var.
 */

export interface PreferenceAdapter {
  /** Hesapta saklı değer; yoksa `null`. */
  get(key: string): string | null;
  /** Hesaba yazar. Hata yutuluyor — tercih kaybı ekran hatası değil. */
  set(key: string, value: string): void;
}

type Listener = () => void;

let adapter: PreferenceAdapter | null = null;
const listeners = new Set<Listener>();

/**
 * Ürün katmanı kendini kaydeder.
 *
 * `null` GEÇMEK KAYDI SİLER ve bu oturum kapanışında gerekli: çıkış
 * yapan kullanıcının hesap değerleri bir sonraki kullanıcıya
 * sızmamalı.
 */
export function setPreferenceAdapter(next: PreferenceAdapter | null): void {
  adapter = next;
  for (const listener of listeners) listener();
}

/** Hesaptaki değer; adaptör yoksa ya da satır yoksa `null`. */
export function readPreference(key: string): string | null {
  return adapter?.get(key) ?? null;
}

/** Hesaba yazar; adaptör yoksa sessizce hiçbir şey yapmaz. */
export function writePreference(key: string, value: string): void {
  adapter?.set(key, value);
}

/** Hesap değerleri değiştiğinde haber verir. */
export function subscribePreferences(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Adaptörün değiştiğini duyurur — satırlar yüklendiğinde çağrılıyor. */
export function notifyPreferenceChange(): void {
  for (const listener of listeners) listener();
}

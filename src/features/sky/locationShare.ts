/**
 * GECE KONUM PARAMETRESİ (§3.4 "URL ile paylaşılabilir konum").
 *
 * ══════════════════════════════════════════════════════════════════════
 * ŞEHİR SLUG'I OKUNUYOR, KOORDİNAT DEĞİL
 *
 * §3.4'ün tarih satırı çoktan kapanmıştı (`?gece=2026-08-08`); konum
 * satırı "konum `LocationContext`te, URL'ye bağlı değil" diye açıkta
 * duruyordu. Adresten yalnız şehir slug'ı okunur:
 *
 *   ✓ `?sehir=ankara` — il merkezi zaten herkese açık bir nokta;
 *     taşınan şey kişisel bir konum değil, bir referans.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TARİH GİBİ, OFFSET DEĞİL
 *
 * Tarih paylaşımında offset yerine mutlak tarih yazılmıştı ki bağlantı
 * ertesi gün başka geceyi göstermesin. Aynı düşünce burada da geçerli:
 * "seçili şehir" değil, ŞEHRİN KENDİSİ yazılıyor — bağlantıyı açan
 * kişinin kendi seçimi bağlantıyı değiştirmiyor.
 */

/** Adres çubuğunda konumu taşıyan parametre. */
export const CITY_PARAM = 'sehir';

/**
 * Adresten şehir slug'ı okur.
 *
 * BİÇİM DOĞRULANIYOR: veri adres çubuğundan geliyor ve slug bir
 * `provinces` aramasına giriyor. Biçimsiz bir değer aramada zaten
 * eşleşmezdi, ama kapıyı burada tutmak niyeti de yazıyor.
 */
export function readCityParam(search: string): string | null {
  const ham = new URLSearchParams(search).get(CITY_PARAM);
  if (!ham) return null;
  const temiz = ham.trim().toLowerCase();
  return /^[a-z0-9-]{2,60}$/.test(temiz) ? temiz : null;
}

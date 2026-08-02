import type { ObservingLocation } from '@/features/location/types';

/**
 * PAYLAŞILABİLİR KONUM (§3.4 "URL ile paylaşılabilir konum").
 *
 * ══════════════════════════════════════════════════════════════════════
 * ŞEHİR SLUG'I PAYLAŞILIYOR, KOORDİNAT DEĞİL
 *
 * §3.4'ün tarih satırı çoktan kapanmıştı (`?gece=2026-08-08`); konum
 * satırı "konum `LocationContext`te, URL'ye bağlı değil" diye açıkta
 * duruyordu. Kapatmanın iki yolu vardı ve biri seçilmedi:
 *
 *   ✗ `?enlem=39.93&boylam=32.86` — çalışırdı ve YANLIŞ olurdu. Cihaz
 *     konumu kullanan biri "bu geceye bak" diye bağlantı gönderdiğinde
 *     bahçesinin GPS'ini de göndermiş olurdu. §14.4 tam olarak bunu
 *     korumaya çalışıyor ve `planShare.ts` aynı kararı gece planı için
 *     zaten vermişti.
 *   ✓ `?sehir=ankara` — il merkezi zaten herkese açık bir nokta;
 *     paylaşılan şey kişisel bir konum değil, bir referans.
 *
 * SONUÇ: cihaz konumu PAYLAŞILAMIYOR ve bu bir eksiklik değil, kuralın
 * kendisi. Arayüz düğmeyi gizlemek yerine sebebini yazıyor — sessizce
 * çalışmayan bir düğme, açıkça çalışmayan bir düğmeden kötü.
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
 * Konumdan paylaşılabilir şehir slug'ı; paylaşılamıyorsa `null`.
 *
 * `device` kaynağı `null` dönüyor (başlıktaki gerekçe). `default`
 * kaynağı — kullanıcının hiç seçim yapmadığı başlangıç şehri — DÖNÜYOR:
 * o da bir il merkezi ve bağlantıyı açan kişinin aynı geceyi görmesi
 * için gerekli.
 */
export function shareableCityId(location: ObservingLocation): string | null {
  if (location.source === 'device') return null;
  return location.cityId ?? null;
}

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

/**
 * Mevcut adrese şehri yazar; paylaşılamıyorsa parametreyi KALDIRIR.
 *
 * Kaldırma önemli: kullanıcı `?sehir=ankara` bağlantısını açıp sonra
 * cihaz konumuna geçerse, adreste kalan eski parametre bir dahaki
 * yüklemede onu Ankara'ya geri atardı — kendi seçimini geri alan bir
 * adres.
 */
export function withCityParam(
  url: string,
  cityId: string | null
): string {
  const u = new URL(url, 'https://astrohub.local');
  if (cityId) u.searchParams.set(CITY_PARAM, cityId);
  else u.searchParams.delete(CITY_PARAM);
  return `${u.pathname}${u.search}${u.hash}`;
}

/**
 * CAPTCHA YAPILANDIRMASI — bileşen içermeyen saf katman.
 *
 * `captchaEnabled` hem `Captcha` bileşeninin yanında hem formlarda
 * lazım. Aynı dosyadan hem bileşen hem sabit dışa vermek hızlı
 * yenilemeyi (fast refresh) bozuyor, o yüzden ayrı.
 *
 * SİTE ANAHTARI GİZLİ DEĞİLDİR ve tarayıcıda görünmesi tasarım gereği.
 * Gizli anahtar Supabase Dashboard → Attack Protection içinde durur ve
 * doğrulamayı Supabase yapar; ikisi karıştırılırsa doğrulama her zaman
 * başarısız olur.
 */

export const CAPTCHA_PROVIDER = (
  (import.meta.env.VITE_CAPTCHA_PROVIDER as string) || 'turnstile'
).trim();

export const CAPTCHA_SITE_KEY = (
  import.meta.env.VITE_CAPTCHA_SITE_KEY as string | undefined
)?.trim();

/**
 * Site anahtarı tanımlıysa CAPTCHA aktiftir; form token bekler.
 *
 * Anahtar yoksa doğrulama tamamen devre dışı kalır ve formlar eskisi
 * gibi çalışır: yapılandırılmamış bir güvenlik katmanı yüzünden giriş
 * ekranının kilitlenmesi, korumanın kendisinden büyük bir sorun olurdu.
 */
export const captchaEnabled = Boolean(CAPTCHA_SITE_KEY);

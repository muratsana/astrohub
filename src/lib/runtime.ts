/**
 * ÇALIŞMA ORTAMI BAYRAKLARI.
 *
 * Tek dosya önizleme derlemesi (`vite.preview.config.ts`) uygulamayı katı
 * bir CSP altında, dış istek yapamayacak biçimde çalıştırır: hava servisi,
 * Supabase, hiçbir uzak uç nokta erişilebilir değildir. Bu bir arıza değil,
 * o derlemenin tanımı.
 *
 * Ayrımı bilmek arayüz için önemli: "servise ulaşılamadı" ile "bu
 * derlemede dış servis kapalı" aynı cümle değil. Birincisi kullanıcıya
 * beklemesi ya da tekrar denemesi gerektiğini düşündürür; ikincisi
 * beklemenin işe yaramayacağını söyler.
 */

/** Tek dosya önizleme derlemesi mi? Yalnızca o yapılandırma bu bayrağı verir. */
export const isSingleFilePreview =
  import.meta.env.VITE_PREVIEW_EDITOR === 'true';

/**
 * Dış ağ isteği yapılabilir mi?
 *
 * Şimdilik tek belirleyici önizleme derlemesi. Ayrı bir ad taşıması
 * bilinçli: çağıran yerler "önizleme mi" diye değil, "ağ var mı" diye
 * sormalı — yarın başka bir kapalı ortam eklendiğinde tek bu dosya değişir.
 */
export const hasNetworkAccess = !isSingleFilePreview;

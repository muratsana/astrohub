/**
 * İÇERİK GÖRSELİ İÇİN İZİNLİ KONAKLAR.
 *
 * ── NEDEN ŞEMA "HERHANGİ BİR https" DEMİYOR ───────────────────────────
 *
 * Çünkü tarayıcı öyle demiyor. `Content-Security-Policy` başlığındaki
 * `img-src` bir BEYAZ LİSTE (`scripts/csp.mjs`); listede olmayan bir
 * konaktan gelen görsel üretimde YÜKLENMEZ. Üstelik sessizce: sunucu
 * hata vermez, günlüğe düşmez, yalnızca okurun konsolunda bir ihlal
 * satırı belirir ve yazının ortasında kırık bir kutu kalır.
 *
 * Şema herhangi bir https adresini kabul etseydi, editör görseli
 * ekleyip önizlemede görebilir (yerel geliştirmede CSP başlığı yok),
 * yayınlayabilir ve kırıldığını hiç öğrenemezdi. Doğrulamayı buraya
 * çekmek, o sessiz kırılmayı KAYDETME ANINDA görünür bir hataya
 * çeviriyor.
 *
 * `/gorseller/` özel durumu dış adres değil, sürümlenen statik içeriktir.
 * CSP'deki `'self'` ile aynı izin alanındadır ve yalnızca bu klasör açılır.
 *
 * ── LİSTE NEDEN `img-src`İN TAMAMI DEĞİL ──────────────────────────────
 *
 * `img-src` harita karolarını ve DSS önizleme servisini de içeriyor;
 * onlar yazıya görsel koymanın yolu değil, başka özelliklerin altyapısı.
 * Buradaki liste editoryal kaynaklarla sınırlı: sitenin kendi depolaması
 * ve tohum içeriğin görsellerinin geldiği iki kaynak.
 *
 * ── YENİ KONAK EKLEMEK ────────────────────────────────────────────────
 *
 * İki dosya birlikte değişir: `scripts/csp.mjs` (tarayıcı izni) ve bu
 * liste (kaydetme izni). Yalnızca birini değiştirmek ya kırık görsel ya
 * da reddedilen geçerli adres demek; `imageHosts.test.ts` ikisinin
 * ayrışmasını yakalıyor.
 */
export const CONTENT_IMAGE_HOSTS = [
  /* Sitenin kendi statik içerik görselleri. */
  "'self'",
  /* Sitenin kendi depolaması — yüklenen her görselin normal yolu. */
  'https://*.supabase.co',
  'https://commons.wikimedia.org',
  'https://upload.wikimedia.org',
  'https://cdn.esahubble.org',
] as const;

/**
 * Adres izinli bir konaktan mı geliyor?
 *
 * `https://*.supabase.co` gibi joker girdilerde SONEK eşleşmesi
 * yapılıyor ve noktayla birlikte: `*.supabase.co` kuralı
 * `kotusupabase.co` konağını EŞLEŞTİRMEMELİ. CSP'nin kendi kuralı da
 * budur; burada gevşek davransaydık şema, tarayıcının reddedeceği bir
 * adresi kabul ederdi.
 */
export function isAllowedImageHost(src: string): boolean {
  if (src.startsWith('/gorseller/') && !src.includes('..')) return true;

  let host: string;
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:') return false;
    host = url.hostname.toLowerCase();
  } catch {
    return false;
  }

  return CONTENT_IMAGE_HOSTS.some((entry) => {
    const pattern = entry.replace(/^https:\/\//, '').toLowerCase();
    return pattern.startsWith('*.')
      ? host.endsWith(pattern.slice(1)) && host.length > pattern.length - 1
      : host === pattern;
  });
}

/**
 * GÜVENLİ URL DOĞRULAMA (§15.4).
 *
 * Kullanıcıdan ya da dış kaynaktan gelen bir adres doğrudan `href`/`src`
 * içine yazılamaz. `javascript:` şeması, tıklandığında sayfanın kendi
 * kaynağında betik çalıştırır (XSS); `data:` şeması sayfa gibi davranan
 * içerik taşıyabilir. React bu ikisini otomatik engellemez — `href` için
 * herhangi bir dizeyi olduğu gibi basar.
 *
 * KURAL: yalnızca `http` ve `https` geçer. Onun dışındaki her şey `null`
 * döner ve arayüz bağlantıyı **düz metin** olarak gösterir. Şüpheli adresi
 * "temizlemeye" çalışmıyoruz; temizleme denemeleri (şema silme, kaçış
 * çözme) bu sınıfta tarihsel olarak en çok atlatılan yaklaşımdır.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Adresi doğrular; güvenliyse normalize edilmiş hâlini, değilse `null` döner.
 *
 * Göreli adresler de kabul edilmez: bu fonksiyon **dış** bağlantılar içindir,
 * uygulama içi gezinme `<Link to>` ile yapılır.
 */
export function safeUrl(value: string | undefined | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  /*
   * Kontrol karakterleri ve boşluklar şema kontrolünü atlatmak için
   * kullanılır: "java\tscript:alert(1)" bazı ortamlarda çalışabiliyor.
   * URL ayrıştırıcısına vermeden önce reddediyoruz.
   */
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0020]/.test(trimmed)) return null;

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Adres güvenli bir http(s) adresi mi? */
export function isSafeUrl(value: string | undefined | null): boolean {
  return safeUrl(value) !== null;
}

/**
 * Bağlantı metninde gösterilecek kısa alan adı: "https://www.esa.int/x/y"
 * → "esa.int". Kullanıcı nereye gittiğini tıklamadan görebilmeli.
 */
export function displayHost(value: string | undefined | null): string | null {
  const safe = safeUrl(value);
  if (!safe) return null;
  try {
    return new URL(safe).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Dış bağlantılar için zorunlu `rel` değeri.
 *
 * `noopener` olmadan açılan sekme `window.opener` üzerinden bizim sayfamızı
 * başka bir adrese yönlendirebilir (tabnabbing). `noreferrer` referans
 * bilgisini sızdırmaz; `nofollow` derecelendirmeyi devretmez — kullanıcı
 * içeriğindeki bağlantılar için gerekli.
 */
export const EXTERNAL_LINK_REL = 'noopener noreferrer nofollow';

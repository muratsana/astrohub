/**
 * FORM TASLAĞI — UZUN FORMLARDA YAZILANI KAYBETMEMEK.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAPANAN HATA
 *
 * Kayıt formunda "Kullanım Koşulları" ya da "KVKK Aydınlatma Metni"
 * bağlantısına tıklayan kullanıcı metni okuyup tarayıcının geri
 * düğmesine bastığında BOŞ bir form buluyordu. Sebep sıradan: istemci
 * tarafı yönlendirici sayfayı gerçekten terk etmiyor, React formu
 * söküyor — ve söküldüğü anda alanların içindekiler yok oluyor.
 * Tarayıcının kendi geri-ileri önbelleği (bfcache) burada devreye
 * girmiyor çünkü ortada bir sayfa yüklemesi yok.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ŞİFRE SAKLANMIYOR
 *
 * Denetim maddesi "e-posta/şifre ve diğer girilmiş alanlar
 * kaybolmamalı" diyor. Şifre BİLEREK dışarıda bırakıldı.
 *
 * `sessionStorage` aynı kaynaktaki her betiğe açık: siteye bir gün XSS
 * bulaşırsa, orada duran düz metin şifre doğrudan okunur. Bir kayıt
 * formunun rahatlığı için kullanıcının şifresini o riske atmak orantısız
 * — üstelik kazanç da küçük, çünkü asıl kayıp e-posta ve onay
 * kutularıydı, şifreyi tarayıcının kendi şifre yöneticisi zaten
 * dolduruyor.
 *
 * Asıl çözüm bu yüzden depolama değil, formdan HİÇ ayrılmamak: yasal
 * metinler yeni sekmede açılıyor. Taslak, o yolun dışından gelen
 * dönüşler için (elle yazılan adres, orta tık, tarayıcı hareketi) ikinci
 * bir emniyet.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN sessionStorage, localStorage DEĞİL
 *
 * Taslak sekme kapanınca gitmeli. `localStorage` yarım kalmış bir kayıt
 * formunu ortak bir bilgisayarda günlerce saklardı; kimse bunu istemez.
 */

const ONEK = 'astrohub.taslak.';

/** Depolama yoksa (SSR, ön-render, gizli mod kısıtı) sessizce geç. */
function depo(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function taslakOku<T extends Record<string, unknown>>(
  anahtar: string
): Partial<T> | null {
  const d = depo();
  if (!d) return null;
  try {
    const ham = d.getItem(ONEK + anahtar);
    if (!ham) return null;
    const deger = JSON.parse(ham);
    /* Dizi ya da ilkel bir değer buraya ancak elle kurcalamayla girer;
       forma yedirmek yerine yok sayıyoruz. */
    return deger && typeof deger === 'object' && !Array.isArray(deger)
      ? (deger as Partial<T>)
      : null;
  } catch {
    return null;
  }
}

export function taslakYaz<T extends Record<string, unknown>>(
  anahtar: string,
  deger: Partial<T>
): void {
  const d = depo();
  if (!d) return;
  try {
    d.setItem(ONEK + anahtar, JSON.stringify(deger));
  } catch {
    /* Kota dolmuş ya da depolama kapalı. Taslak bir kolaylık; onun
       yüzünden formu düşürmek olmaz. */
  }
}

export function taslakSil(anahtar: string): void {
  const d = depo();
  if (!d) return;
  try {
    d.removeItem(ONEK + anahtar);
  } catch {
    /* aynı gerekçe */
  }
}

/**
 * Saklanmayacak alanları ayıklar.
 *
 * Liste ALANIN ADIYLA veriliyor, tipiyle değil: "şifre gibi görünen
 * alanı bul" türü bir sezgi, bir gün `sifreIpucu` gibi masum bir alanı
 * eler ya da `token` gibi tehlikelisini kaçırırdı. Çağıran ne
 * saklanmayacağını açıkça yazıyor.
 */
export function gizliAlanlariAyikla<T extends Record<string, unknown>>(
  deger: T,
  gizli: readonly (keyof T & string)[]
): Partial<T> {
  const kume = new Set<string>(gizli);
  const cikti: Partial<T> = {};
  for (const [ad, v] of Object.entries(deger)) {
    if (kume.has(ad)) continue;
    /* Boş dizeyi saklamıyoruz: geri dönüşte forma boş değer basmak,
       tarayıcının otomatik doldurmasını ezmek olurdu. */
    if (v === '' || v === undefined || v === null) continue;
    cikti[ad as keyof T] = v as T[keyof T];
  }
  return cikti;
}

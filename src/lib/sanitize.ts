/**
 * KULLANICI METNİ TEMİZLEME (§15.4).
 *
 * NEDEN GEREKLİ — React zaten kaçış yapmıyor mu?
 * Yapıyor: JSX içine konan bir dize asla HTML olarak yorumlanmaz, bu yüzden
 * `<script>` yazan bir kullanıcı yalnızca o metni görür. Ama kaçış her yerde
 * yeterli değil:
 *
 *   · `<meta name="description">` içeriği, arama sonucu ve paylaşım
 *     önizlemesinde ham metin olarak görünür; kullanıcı metnindeki etiketler
 *     orada çirkin görünür ve bazı tarayıcılarda kırpılır.
 *   · Görünmez karakterler (sıfır genişlikli boşluk, yön değiştirme
 *     işaretleri) başlıkları taklit etmek ve moderasyon aramasından kaçmak
 *     için kullanılır: sıfır genişlikli boşluk içeren bir ad, gözle
 *     "admin" adından ayırt edilemez.
 *   · Ard arda yüzlerce satır sonu, akışta kartı ekran boyu uzatır.
 *
 * Bu modül **HTML'e izin vermez**; amaç zengin metin desteklemek değil,
 * düz metni güvenli ve okunur kılmak. Zengin metin gerektiğinde (forum
 * gövdesi Markdown'a geçerse) ayrı bir işleyici ve beyaz liste gerekir.
 */

/**
 * Görünmez karakterler: sıfır genişlikli boşluk/birleştirici, yön değiştirme
 * işaretleri ve kelime birleştirici. Kullanıcı adı taklidinde ve moderasyon
 * aramasından kaçmakta kullanılırlar.
 */
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;

/** Yazdırılamayan kontrol karakterleri (sekme ve satır sonu hariç). */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Basit HTML etiketleri. */
const TAGS = /<\/?[a-zA-Z][^>]*>/g;

/**
 * HTML etiketlerini söker.
 *
 * Etiket içindeki metin korunur: "<b>Merhaba</b>" → "Merhaba". Bu bir
 * güvenlik önlemi değil (React zaten kaçış yapıyor), okunabilirlik önlemi.
 */
export function stripHtml(value: string): string {
  return value.replace(TAGS, '');
}

export interface SanitizeOptions {
  /** Satır sonlarına izin ver (forum gövdesi gibi çok satırlı alanlar). */
  multiline?: boolean;
  /** Üst sınır; aşan metin kırpılır ve sonuna "…" eklenir. */
  maxLength?: number;
}

/**
 * Kullanıcı metnini görüntülemeye hazırlar.
 *
 * Sırası önemli: önce etiketler sökülür, sonra görünmez karakterler
 * temizlenir, en sonda boşluk sadeleştirilir. Ters sırada, sökülen bir
 * etiketin bıraktığı çift boşluk metinde kalır.
 */
export function sanitizeText(
  value: string | undefined | null,
  options: SanitizeOptions = {}
): string {
  if (!value) return '';
  const { multiline = false, maxLength } = options;

  let out = stripHtml(value).replace(INVISIBLE, '').replace(CONTROL, '');

  if (multiline) {
    // Satır sonu korunur ama üç ve fazlası ikiye indirilir: paragraf ayrımı
    // kalsın, ekran boyu boşluk kalmasın.
    out = out
      .replace(/\r\n?/g, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+\n/g, '\n')
      .trim();
  } else {
    out = out.replace(/\s+/g, ' ').trim();
  }

  if (maxLength !== undefined && out.length > maxLength) {
    // Kelime ortasından kesmemek için son boşluğa kadar geri sar.
    const cut = out.slice(0, maxLength);
    const lastSpace = cut.lastIndexOf(' ');
    out = (lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
  }

  return out;
}

/**
 * Meta açıklaması için tek satırlık özet (§16.2).
 *
 * Arama sonuçlarında yaklaşık 155 karakter gösterilir; daha uzunu kırpılır
 * ve cümle yarıda kalır. Kırpmayı biz yaparsak en azından kelime sınırında
 * kalır.
 */
export function metaDescription(value: string | undefined | null): string {
  return sanitizeText(value, { maxLength: 155 });
}

/**
 * Görüntülenecek kullanıcı adı.
 *
 * Yalnızca harf, rakam, alt çizgi ve tire bırakılır. Kullanıcı adları
 * profil adresine (`/profil/:username`) girdiği için burada gevşek
 * davranmak, adres uzayına kontrolsüz karakter sokmak demektir.
 */
export function sanitizeUsername(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 32);
}

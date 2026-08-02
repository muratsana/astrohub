/**
 * CSV DIŞA AKTARMA (Faz 4 — "yalnızca yetkili admin için").
 *
 * ══════════════════════════════════════════════════════════════════════
 * RFC 4180 — VE ONUN ÖTESİNDE İKİ ŞEY
 *
 * Alan tırnaklama, tırnak kaçışlama ve CRLF satır sonu standardın
 * kendisi. Standarda GİRMEYEN ama gerçek dünyada gereken iki şey daha
 * var ve ikisi de aşağıda:
 *
 *   1. BOM (`\uFEFF`). Excel, BOM'suz bir CSV'yi sistem kod sayfasıyla
 *      açıyor ve Türkçe harfler bozuluyor ("Çankırı" → "Ã‡ankÄ±rÄ±").
 *      Dosya UTF-8; BOM bunu söyleyen tek işaret.
 *   2. FORMÜL ENJEKSİYONU KORUMASI (aşağıda).
 *
 * ══════════════════════════════════════════════════════════════════════
 * FORMÜL ENJEKSİYONU — DIŞA AKTARMANIN GERÇEK RİSKİ
 *
 * Excel ve LibreOffice, `=`, `+`, `-`, `@` ile başlayan bir hücreyi
 * FORMÜL sayıyor. Sitede kullanıcı adı `=HYPERLINK("http://…")` olan
 * biri varsa, o satırı dışa aktaran YÖNETİCİ dosyayı açtığında hücre
 * çalışıyor. Yani saldırı kullanıcıdan yöneticiye, veri yoluyla
 * geçiyor.
 *
 * Koruma: böyle bir hücrenin başına tek tırnak konuyor. Tırnak
 * hücrenin GÖRÜNEN değerini bozmuyor (elektronik tablo onu metin
 * işareti sayıp gizliyor) ama formül olmasını engelliyor.
 *
 * Sekme ve satır başı da listede: ikisi de bazı sürümlerde formül
 * ayrıştırıcısını tetikliyor.
 */

/** Hücre bir formül olarak yorumlanabilir mi? */
const TEHLIKELI_BAS = /^[=+\-@\t\r]/;

/**
 * Tek hücreyi CSV alanına çevirir.
 *
 * `null`/`undefined` BOŞ hücre oluyor, `"null"` metni değil: dışa
 * aktarılan tabloda "null" yazan bir hücre, gerçekten o metni taşıyan
 * bir kayıttan ayırt edilemezdi.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  let metin =
    value instanceof Date
      ? value.toISOString()
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);

  if (TEHLIKELI_BAS.test(metin)) metin = `'${metin}`;

  /* Tırnak, virgül ya da satır sonu varsa alan tırnaklanır ve içerideki
     tırnaklar ikilenir (RFC 4180 §2.7). */
  if (/["\n\r,;]/.test(metin)) {
    return `"${metin.replace(/"/g, '""')}"`;
  }
  return metin;
}

export interface CsvColumn<T> {
  /** Başlık satırında görünen ad. */
  label: string;
  /** Kayıttan hücre değerini çıkarır. */
  value: (item: T) => unknown;
}

/**
 * Kayıtları CSV metnine çevirir.
 *
 * BAŞLIK SATIRI HER ZAMAN VAR — boş listede bile. Sütun adları olmayan
 * bir dosya, açan kişiye hangi verinin dışa aktarıldığını söylemez;
 * "hiç kayıt yok" bilgisi de başlıklarla birlikte daha anlaşılır.
 */
export function toCsv<T>(rows: readonly T[], columns: CsvColumn<T>[]): string {
  const satirlar = [
    columns.map((c) => csvCell(c.label)).join(','),
    ...rows.map((row) => columns.map((c) => csvCell(c.value(row))).join(',')),
  ];
  /* BOM + CRLF: ikisi de Excel içindir (başlıktaki gerekçe). */
  return `\uFEFF${satirlar.join('\r\n')}\r\n`;
}

/**
 * Dosya adı — modül ve tarihle.
 *
 * Tarih dosya adında: aynı klasöre birden çok gün indirilebilsin ve
 * hangisinin ne zaman alındığı dosyayı açmadan görünsün.
 */
export function csvFileName(module: string, now = new Date()): string {
  return `astrohub-${module}-${now.toISOString().slice(0, 10)}.csv`;
}

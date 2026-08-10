import { safeUrl } from '@/lib/url';

/**
 * SATIR İÇİ BİÇİMLENDİRME (FAZ 7 · zengin editör).
 *
 * ── NEDEN AYRI BİR BLOK TÜRÜ DEĞİL ────────────────────────────────────
 *
 * "Kalın", "eğik" ve "bağlantı" cümlenin İÇİNDE yaşıyor; blok olamazlar.
 * Blokların `text` alanını yapılandırılmış bir parça dizisine
 * (`{kind:'strong', text:'…'}`) çevirmek de mümkündü ama pahalıydı:
 * kayıtlı her içeriğin göç etmesi, `blocksToText`, arama özeti, meta
 * açıklaması ve içe aktarma yolunun hepsinin yeniden yazılması gerekirdi.
 *
 * Seçilen yol: DEPOLAMA DÜZ METİN KALIYOR, biçim ÇİZİM ANINDA
 * ayrıştırılıyor. Kayıtlı içerik olduğu gibi çalışmaya devam ediyor, göç
 * yok, `blocksToText` çalışmaya devam ediyor (işaretleri `stripInline`
 * söküyor).
 *
 * ── HAM HTML YİNE YOK ─────────────────────────────────────────────────
 *
 * Ayrıştırıcı HTML üretmiyor; React'ın çizeceği PARÇALAR üretiyor.
 * `dangerouslySetInnerHTML` bu dosyanın hiçbir tüketicisinde yok, olması
 * da gerekmiyor. `sanitizeText` etiketleri zaten söküyor; buradaki
 * işaretler (`*`, `[`, `]`) etiket değil, bu yüzden temizlikten sağ
 * çıkıyorlar.
 *
 * ── SÖZDİZİMİ BİLEREK DAR ─────────────────────────────────────────────
 *
 *     **kalın**      *eğik*      [metin](/ic-yol)      [metin](https://…)
 *
 * Markdown'ın tamamı değil. Başlık, liste ve alıntı zaten BLOK olarak
 * var; onları bir de metin içinde desteklemek aynı şeyin iki yolu
 * olurdu ve yazan kişi hangisinin kazandığını bilemezdi.
 *
 * ── YANLIŞ POZİTİF TEHLİKESİ ──────────────────────────────────────────
 *
 * Bu ayrıştırıcı BUGÜNE KADAR YAZILMIŞ içeriğin üstünde de çalışacak;
 * kimse o metinleri biçimlendirme niyetiyle yazmadı. "3*4*5" ya da
 * dipnot işareti "[1]" bir anda eğik yazıya ya da bağlantıya dönseydi,
 * özellik eski içeriği bozmuş olurdu. Bu yüzden kurallar dar:
 *
 *   · Yıldızın hemen içi boşluk olamaz (`* a *` biçim değil).
 *   · Açılış yıldızından ÖNCE ve kapanış yıldızından SONRA harf/rakam
 *     olamaz — "3*4*5" düz metin kalıyor.
 *   · İşaretin içinde ikinci bir yıldız olamaz.
 *   · Bağlantı hedefi ya `/` ile başlayan uygulama içi yol ya da
 *     `safeUrl`den geçen http(s) adresi olmalı; "[1]" ya da
 *     "[bkz](javascript:…)" olduğu gibi metin kalıyor.
 *
 * Kural şüphede DÜZ METİN lehine: biçimlenmemiş bir cümle okunur, yanlış
 * biçimlenmiş bir cümle bozuktur.
 */

/** Ayrıştırılmış tek parça. */
export type InlineSpan =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'em'; text: string }
  /**
   * `href` uygulama içi yol (`/galeri`) ya da doğrulanmış http(s) adresi.
   * Hangisi olduğunu `external` söylüyor: içeride `<Link>`, dışarıda
   * `rel` taşıyan `<a>` gerekiyor ve bu kararı çizen taraf veremez —
   * bilgi burada üretiliyor.
   */
  | { kind: 'link'; text: string; href: string; external: boolean };

/**
 * Bağlantı, kalın, eğik. Sıra önemli: bağlantı metni yıldız içerebilir
 * ve önce yakalanmazsa yıldız kuralı bağlantıyı ortasından böler.
 */
const PATTERN =
  /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;

/** Harf ya da rakam — yıldız sınırında bunlara bakılıyor. */
const WORD = /[\p{L}\p{N}]/u;

/**
 * Uygulama içi yol mu?
 *
 * `//baska-site.example` bir yol DEĞİL, şemasız mutlak adres: tarayıcı
 * onu dış siteye götürür. Tek eğik çizgiyle başlayıp ikincisiyle
 * devam etmeyen adresler kabul ediliyor.
 */
function internalPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//');
}

/** Yıldızlı işaretin sınırı gerçekten biçim mi, yoksa çarpma mı? */
function starBoundary(source: string, start: number, end: number): boolean {
  const before = start > 0 ? source[start - 1] : '';
  const after = end < source.length ? source[end] : '';
  return !WORD.test(before || ' ') && !WORD.test(after || ' ');
}

/** İçerik boşlukla başlayıp bitmemeli: "* a *" biçim değil, yıldızlı liste. */
function tightContent(value: string): boolean {
  return value.length > 0 && value.trim() === value;
}

/**
 * Düz metni parçalara ayırır.
 *
 * Hiçbir işaret yoksa tek bir `text` parçası döner — çağıran taraf için
 * "biçimlendirilmemiş metin" ayrı bir durum değil.
 */
export function parseInline(source: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let cursor = 0;

  /* Düz metni sona ekler; ard arda gelen düz parçalar birleştiriliyor ki
     çizimde gereksiz `<span>` yığılmasın. */
  function pushText(value: string) {
    if (!value) return;
    const last = spans.at(-1);
    if (last?.kind === 'text') last.text += value;
    else spans.push({ kind: 'text', text: value });
  }

  PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PATTERN.exec(source)) !== null) {
    const [whole, linkText, linkHref, strongText, emText] = match;
    const start = match.index;
    const end = start + whole.length;

    let span: InlineSpan | null = null;

    if (linkText !== undefined) {
      const external = safeUrl(linkHref);
      if (internalPath(linkHref)) {
        span = { kind: 'link', text: linkText, href: linkHref, external: false };
      } else if (external) {
        span = { kind: 'link', text: linkText, href: external, external: true };
      }
    } else if (strongText !== undefined) {
      if (tightContent(strongText) && starBoundary(source, start, end)) {
        span = { kind: 'strong', text: strongText };
      }
    } else if (emText !== undefined) {
      if (tightContent(emText) && starBoundary(source, start, end)) {
        span = { kind: 'em', text: emText };
      }
    }

    /* Kural tutmadıysa parça DÜZ METİN olarak geçiyor — sessizce
       yutulmuyor. Yazan kişi ekranda ne yazdıysa onu görüyor. */
    pushText(source.slice(cursor, start));
    if (span) spans.push(span);
    else pushText(whole);
    cursor = end;
  }

  pushText(source.slice(cursor));
  return spans;
}

/**
 * İşaretleri söker, metni bırakır.
 *
 * Meta açıklaması, arama özeti ve paylaşım önizlemesi için: oralarda
 * biçim çizilmiyor, dolayısıyla "**Merhaba**" yazması ham işaret
 * sızdırmak olurdu. Bağlantıda ADRES DEĞİL METİN kalıyor — özet cümlesi
 * okunmalı, tıklanmayacak.
 */
export function stripInline(source: string): string {
  return parseInline(source)
    .map((span) => span.text)
    .join('');
}

/** Metinde çizilecek bir biçim var mı? Editörün önizleme rozeti için. */
export function hasInlineMarkup(source: string): boolean {
  return parseInline(source).some((span) => span.kind !== 'text');
}

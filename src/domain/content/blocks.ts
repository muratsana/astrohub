import { z } from 'zod';
import { sanitizeText } from '@/lib/sanitize';
import { stripInline } from './inline';
import { isAllowedImageHost } from './imageHosts';
import { isValidYoutubeId } from '@/features/tv/types';

const text = z.string().trim().min(1).max(20_000);

/**
 * GÖRSEL ADRESİ MUTLAK, `https` VE CSP'NİN TANIDIĞI BİR KONAKTAN.
 *
 * İlk iki kural `hero_slides` ile aynı (`heroSlides.ts` · `guvenliAdres`):
 * şemasız (`//baska-site`) ve `http` adresler dışarıda. Uygulama içi yol
 * da kabul edilmiyor — içerik görselleri depolama kovasından geliyor ve o
 * kovanın herkese açık adresi zaten mutlak.
 *
 * Üçüncü kuralın gerekçesi `imageHosts.ts` başında: `img-src` bir beyaz
 * liste ve dışarıdaki konak üretimde SESSİZCE yüklenmiyor. Doğrulamayı
 * kaydetme anına çekmek, o sessiz kırılmayı görünür bir hataya çeviriyor.
 */
const imageSrc = z
  .string()
  .trim()
  .refine(isAllowedImageHost, 'Görsel adresi izinli bir konaktan olmalı');

/** Tablo hücresi. Boş hücre geçerli: tablolarda boşluk anlam taşır. */
const cell = z.string().trim().max(500);

export const ContentBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text }),
  z.object({
    type: z.literal('heading'),
    level: z.union([z.literal(2), z.literal(3)]),
    text: text.max(300),
  }),
  z.object({ type: z.literal('quote'), text }),
  z.object({
    type: z.literal('list'),
    style: z.enum(['bullet', 'ordered']),
    items: z.array(text.max(1_000)).min(1).max(100),
  }),
  z.object({
    type: z.literal('callout'),
    tone: z.enum(['info', 'warning']),
    title: z.string().trim().max(120).optional(),
    text,
  }),

  /*
   * GÖRSEL — `alt` ZORUNLU.
   *
   * İsteğe bağlı olsaydı boş geçilirdi ve ekran okuyucu kullanan okur
   * için görsel hiç yokmuş gibi olurdu. Süsleme amaçlı görsel bu editörde
   * yok: yazının içine konan her görsel bir şey ANLATIYOR, dolayısıyla
   * anlatılabilir.
   *
   * `credit` ayrı alan, `caption`ın içine sıkıştırılmıyor: telif sahibi
   * makine tarafından okunabilir kalmalı ve alt yazıdan farklı
   * biçimleniyor. Zorunlu DEĞİL, çünkü sitenin kendi fotoğrafında
   * tekrar olurdu.
   */
  z.object({
    type: z.literal('image'),
    src: imageSrc,
    alt: z.string().trim().min(1).max(300),
    caption: z.string().trim().max(300).optional(),
    credit: z.string().trim().max(160).optional(),
  }),

  /*
   * TABLO — satırlar dikdörtgen olmak ZORUNDA DEĞİL.
   *
   * Şema hücre sayısını satır bazında serbest bırakıyor, çizim tarafı
   * eksik hücreleri boşla tamamlıyor. Katı dikdörtgen kuralı, içe
   * aktarılan tek bir bozuk satır yüzünden tablonun tamamını
   * düşürürdü — oysa eksik hücre okunabilir bir tabloyu bozmuyor.
   *
   * `header` ayrı: başlık satırını `rows`un ilk elemanı saymak, çizimde
   * "ilk satır başlık mı" sorusunu her seferinde tahmin etmek olurdu.
   */
  z.object({
    type: z.literal('table'),
    caption: z.string().trim().max(300).optional(),
    header: z.array(cell).min(1).max(8).optional(),
    rows: z.array(z.array(cell).min(1).max(8)).min(1).max(200),
  }),

  /*
   * MEDYA — ADRES DEĞİL KİMLİK SAKLANIYOR.
   *
   * `tv_broadcasts` ile birebir aynı disiplin (`features/tv/types.ts`):
   * `<iframe src>` yoluna giden bir alanda tam URL saklamak, o alana
   * yazabilen birine oynatıcıyı bambaşka bir siteye çevirme imkânı verir.
   * Burada yalnızca YouTube video kimliği duruyor, adres kodda kuruluyor
   * ve kimlik biçime uymuyorsa blok hiç çizilmiyor.
   *
   * Sağlayıcı listesi CSP'ye bağlı: `scripts/csp.mjs` yalnızca
   * `youtube-nocookie.com` ve `open.spotify.com` için `frame-src` açıyor.
   * Üçüncü bir sağlayıcı eklemek önce o dosyayı değiştirmeyi gerektirir —
   * aksi hâlde gömü canlıda sessizce boş çerçeve olurdu.
   *
   * `title` zorunlu: `<iframe>`in erişilebilir adı yoksa ekran okuyucu
   * çerçeveyi "iframe" diye okur.
   */
  z.object({
    type: z.literal('embed'),
    provider: z.literal('youtube'),
    /*
     * Doğrulama BLOĞUN DEĞİL ALANIN üstünde: `discriminatedUnion` yalnızca
     * düz nesne seçenekleri kabul ediyor, blok düzeyinde `.refine`
     * eklenirse birleşim ayrımcı alanı bulamıyor. Alan düzeyinde aynı
     * sonucu veriyor ve kural tek yerden (`isValidYoutubeId`) okunuyor.
     */
    videoId: z
      .string()
      .trim()
      .refine((id) => isValidYoutubeId('video', id), 'Geçersiz video kimliği'),
    title: z.string().trim().min(1).max(200),
  }),
]);

export const ContentBlocksSchema = z.array(ContentBlockSchema).max(500);

export type ContentBlock = z.infer<typeof ContentBlockSchema>;

export function paragraphsToBlocks(paragraphs: string[]): ContentBlock[] {
  return paragraphs
    .map((value) => sanitizeText(value, { multiline: true }))
    .filter(Boolean)
    .map((value) => ({ type: 'paragraph' as const, text: value }));
}

export function parseContentBlocks(
  value: unknown,
  legacyParagraphs: string[] = []
): ContentBlock[] {
  const parsed = ContentBlocksSchema.safeParse(value);
  return parsed.success && parsed.data.length > 0
    ? parsed.data
    : paragraphsToBlocks(legacyParagraphs);
}

/**
 * Eski istemciler ve arama özeti için kayıplı fakat güvenli düz metin.
 *
 * ── BU ÇIKTININ İKİ İŞİ VAR ───────────────────────────────────────────
 *
 * Birincisi arama ve meta açıklaması. İkincisi YEDEK: `parseContentBlocks`
 * blok dizisini bir bütün olarak doğruluyor, yani TEK bozuk blok tüm
 * diziyi düşürüyor ve okur `body` sütununa, yani bu fonksiyonun ürettiği
 * paragraflara iner. Aynı şey eski bir istemci (önbellekte kalmış bundle)
 * yeni bir blok türüyle karşılaştığında da olur. Bu yüzden yeni türlerin
 * hepsi burada BİR ŞEY döndürüyor: sessizce boşluk döndürselerdi, yedeğe
 * düşen okur görselin ve tablonun yerinde hiçbir iz göremezdi.
 *
 * ── SATIR İÇİ İŞARETLER SÖKÜLÜYOR ─────────────────────────────────────
 *
 * Çıktı meta etiketine ve arama sonucuna giriyor; oralarda biçim
 * çizilmiyor. Sökülmeseydi paylaşım önizlemesinde "**Merhaba**" yazardı.
 */
export function blocksToParagraphs(blocks: ContentBlock[]): string[] {
  return blocks.flatMap((block) => {
    if (block.type === 'list') return block.items.map(stripInline);

    /* Görselin metni alt yazısı; yoksa alternatif metni. İkisi de içerik:
       biri okura, diğeri ekran okuyucuya aynı şeyi anlatıyor. */
    if (block.type === 'image') return [block.caption || block.alt];

    /* Tabloda hücreler satır satır birleşiyor. Sütun ayracı olarak boşluk
       değil " · " kullanılıyor: düz metne dökülmüş bir tabloda hücre
       sınırı kaybolursa iki ayrı değer tek sayıya yapışır. */
    if (block.type === 'table') {
      const satirlar = [...(block.header ? [block.header] : []), ...block.rows];
      return [
        ...(block.caption ? [block.caption] : []),
        ...satirlar.map((row) => row.filter(Boolean).join(' · ')).filter(Boolean),
      ];
    }

    /* Gömüde okunabilir tek şey başlık; kimlik metin değil. */
    if (block.type === 'embed') return [block.title];

    return [stripInline(block.text)];
  });
}

export function blocksToText(blocks: ContentBlock[]): string {
  return blocksToParagraphs(blocks).join('\n\n');
}

export function textToBlocks(value: string): ContentBlock[] {
  return paragraphsToBlocks(value.split(/\n\s*\n/));
}

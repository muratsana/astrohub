import { z } from 'zod';
import { sanitizeText } from '@/lib/sanitize';
import { stripInline } from './inline';
import { isAllowedImageHost } from './imageHosts';
import { isValidYoutubeId } from '@/features/tv/types';

const text = z.string().trim().min(1).max(20_000);

/**
 * GÖRSEL ADRESİ CSP'NİN TANIDIĞI BİR KAYNAKTAN.
 *
 * Dış adreslerde ilk iki kural `hero_slides` ile aynı (`heroSlides.ts` ·
 * `guvenliAdres`): şemasız (`//baska-site`) ve `http` adresler dışarıda.
 * Sitenin kendi teknik şemaları ise `/gorseller/` altında duruyor; bunları
 * depolamaya yüklemek yerine sürümlemek, yazıdaki şekil ile kodun birlikte
 * değişmesini sağlıyor.
 *
 * Üçüncü kuralın gerekçesi `imageHosts.ts` başında: `img-src` bir beyaz
 * liste ve dışarıdaki konak üretimde SESSİZCE yüklenmiyor. Doğrulamayı
 * kaydetme anına çekmek, o sessiz kırılmayı görünür bir hataya çeviriyor.
 */
const imageSrc = z
  .string()
  .trim()
  .refine(isAllowedImageHost, 'Görsel adresi izinli bir konaktan olmalı');

const internalHref = z
  .string()
  .trim()
  .regex(/^\/(?!\/).*/, 'Araç bağlantısı site içi bir yol olmalı')
  .max(300);

const articleScriptSrc = z
  .string()
  .trim()
  .regex(
    /^\/astrohub\/[a-z0-9-]+\.js$/,
    'Yazı betiği yalnızca /astrohub/<slug>.js olabilir'
  )
  .max(120);

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
    /*
     * MİZANPAJ — hizalama ve genişlik.
     *
     * Editörde görsel yalnızca TAM GENİŞLİK çizilebiliyordu. Uzun bir
     * rehberde her görselin sayfayı baştan sona kesmesi, metni sürekli
     * bölüyor ve okuma akışını kırıyordu; yazarların istediği şey küçük
     * bir şemayı kenara alıp metnin yanından akıtmaktı.
     *
     * DEĞERLER SAYI DEĞİL, İSİM. `width: 42` gibi serbest bir sayı,
     * her yazının farklı bir ölçüde olması ve sitenin tipografik
     * ızgarasının dağılması demekti. Üç adım, ızgarayla uyumlu.
     *
     * İKİSİ DE İSTEĞE BAĞLI: alan eklendiğinde var olan bloklar
     * geçersiz olmamalı — `parse` eski kaydı reddetseydi yayındaki her
     * yazı düzenlenemez hâle gelirdi. Verilmediğinde davranış eskisiyle
     * aynı: ortalanmış, tam genişlik.
     */
    align: z.enum(['left', 'center', 'right']).optional(),
    width: z.enum(['full', 'half', 'third']).optional(),
  }),

  /*
   * GALERİ — yan yana birden çok görsel.
   *
   * Art arda konan tek tek görsel blokları alt alta diziliyor ve üç
   * karelik bir karşılaştırma (ham · kalibre · işlenmiş) sayfayı üç
   * ekran boyu uzatıyordu. Galeri onları tek ızgaraya alıyor.
   *
   * `alt` BURADA DA ZORUNLU, tek görselde olduğu gibi ve aynı gerekçeyle.
   * Kolaylık olsun diye gevşetmek, galerinin erişilebilirliği düşürmenin
   * en kolay yolu olmasına yol açardı.
   *
   * En fazla 12: daha fazlası ızgara değil, sayfalanması gereken bir
   * albüm — ve albüm bu editörün işi değil, galerinin.
   */
  z.object({
    type: z.literal('gallery'),
    caption: z.string().trim().max(300).optional(),
    columns: z.union([z.literal(2), z.literal(3)]).optional(),
    items: z
      .array(
        z.object({
          src: imageSrc,
          alt: z.string().trim().min(1).max(300),
          caption: z.string().trim().max(200).optional(),
        })
      )
      .min(2)
      .max(12),
  }),

  /*
   * İKİ SÜTUN — yan yana iki metin bloğu.
   *
   * "Önce / sonra", "artı / eksi", "yanlış / doğru" karşılaştırmaları
   * yazarlar tablo bloğuyla kurmaya çalışıyordu ve tablo bunun için
   * yanlış araç: hücreler tek satırlık değer taşımak için dar, paragraf
   * için değil.
   *
   * DAR EKRANDA ALT ALTA düşüyor (çizim tarafında); iki sütunu telefonda
   * korumak, her sütunu okunamayacak kadar daraltmak olurdu.
   */
  z.object({
    type: z.literal('columns'),
    left: text.max(4_000),
    right: text.max(4_000),
    leftTitle: z.string().trim().max(120).optional(),
    rightTitle: z.string().trim().max(120).optional(),
  }),

  z.object({
    type: z.literal('tool'),
    title: z.string().trim().min(1).max(160),
    text: text.max(1_000),
    href: internalHref,
    action: z.string().trim().min(1).max(80).optional(),
  }),

  z.object({
    type: z.literal('html'),
    html: z.string().trim().min(1).max(250_000),
    scriptSrc: articleScriptSrc.optional(),
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
        ...satirlar
          .map((row) => row.filter(Boolean).join(' · '))
          .filter(Boolean),
      ];
    }

    /* Gömüde okunabilir tek şey başlık; kimlik metin değil. */
    if (block.type === 'embed') return [block.title];

    /* Galeride okunabilir metin alt yazılar ve `alt` metinleridir;
       `alt` de dahil çünkü arama ve özet için gerçek içerik taşıyor. */
    if (block.type === 'gallery') {
      return [
        ...(block.caption ? [block.caption] : []),
        ...block.items.flatMap((item) =>
          [item.caption, item.alt].filter((v): v is string => !!v)
        ),
      ];
    }

    if (block.type === 'columns') {
      return [
        ...(block.leftTitle ? [block.leftTitle] : []),
        stripInline(block.left),
        ...(block.rightTitle ? [block.rightTitle] : []),
        stripInline(block.right),
      ];
    }

    if (block.type === 'tool') {
      return [block.title, stripInline(block.text), block.action ?? 'Aracı aç'];
    }

    if (block.type === 'html') {
      return [
        stripInline(
          block.html
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
        ),
      ];
    }

    return [stripInline(block.text)];
  });
}

export function blocksToText(blocks: ContentBlock[]): string {
  return blocksToParagraphs(blocks).join('\n\n');
}

export function textToBlocks(value: string): ContentBlock[] {
  return paragraphsToBlocks(value.split(/\n\s*\n/));
}

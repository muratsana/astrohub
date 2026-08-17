import { z } from 'zod';

/**
 * UZUN FORM REHBER BELGESİ.
 *
 * ── NEDEN AYRI BİR MODEL ──────────────────────────────────────────────
 *
 * SNR, kutup hizalaması ve drizzle rehberleri blok tabanlı yazı modeline
 * SIĞMIYOR: üçü toplam 16 tablo, 11 infografik ve 12 canlı hesaplayıcı
 * taşıyor. `router.tsx:307-310` bunu açıkça yazıyor ve karar doğru —
 * hesaplayıcıları bloğa çevirmek mümkün değil.
 *
 * Sonuç olarak gövdeleri derleme öncesi üretilip
 * (`docs/<rehber>/standalone-kaynak.html` → `content.generated.ts`) kod olarak
 * yaşıyordu. Bunun bedeli, yayındaki bir yazım hatasını düzeltmek için
 * depoyu değiştirip yeniden dağıtmak zorunda kalmaktı.
 *
 * ── ÇÖZÜM: KOD TOHUM, VERİTABANI ÜSTÜNE YAZAR ─────────────────────────
 *
 * Depodaki `content.generated.ts` TOHUM olarak kalıyor; veritabanında
 * aynı slug'lı bir belge varsa o kazanıyor. Bu, kod tabanının haber ve
 * yazılarda zaten kullandığı desenin aynısı (`mergeWithSeed`,
 * `services/content/entries.ts:325`) — yönetici ikinci bir zihinsel model
 * taşımıyor ve veritabanı kaydı silindiğinde koddaki sürüm geri dönüyor.
 *
 * ── GÜVENLİK: BU İÇERİK `dangerouslySetInnerHTML` İLE BASILIYOR ───────
 *
 * Kritik fark: eskiden HTML depoya işlenmiş sabit bir belgeden geliyordu
 * ve üretici betiği her koşuda doğruluyordu (`snr-icerik.mjs:388`).
 * Artık veritabanından geliyor, yani YAZILABİLİR bir yüzeyden.
 *
 * O yüzden doğrulama İKİ YÖNLÜ:
 *   · YAZARKEN — panel kaydetmeden önce reddediyor.
 *   · OKURKEN  — sayfa çizmeden önce süzüyor.
 *
 * Yalnızca yazarken doğrulamak yetmezdi: kayıt panel dışından (doğrudan
 * PostgREST çağrısıyla, ya da ele geçirilmiş bir yönetici oturumuyla)
 * da değiştirilebilir. Sitenin CSP'sinde `unsafe-inline` var
 * (`vercel.json:788`, gerekçesi `scripts/csp.mjs:13-47`), dolayısıyla
 * gövdeye giren bir `<script>` gerçekten çalışırdı.
 *
 * Desenler üreticinin kullandığının AYNISI — iki yerde iki farklı kural
 * olsaydı, birinden geçen diğerinden geçmezdi.
 */

/** Üreticideki `snr-icerik.mjs:388` ile birebir aynı liste. */
const FORBIDDEN: readonly RegExp[] = [
  /<script\b/i,
  /\son\w+\s*=/i,
  /javascript:/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
];

/** İçerik güvenli mi? Değilse hangi desenin yakalandığını söyler. */
export function describeUnsafeGuideHtml(html: string): string | null {
  for (const pattern of FORBIDDEN) {
    if (pattern.test(html)) {
      return `İzin verilmeyen desen: ${pattern.source}`;
    }
  }
  return null;
}

export const GuideTocEntrySchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(120)
    /* Kimlik doğrudan `href="#id"` içine giriyor; tırnak ya da açı
       parantezi kabul edilseydi nitelik sınırından kaçılabilirdi. */
    .regex(/^[A-Za-z0-9_-]+$/, 'Bölüm kimliği yalnızca harf, rakam, tire ve alt çizgi içerebilir'),
  label: z.string().trim().min(1).max(300),
});

export const GuideSegmentSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('html'),
    html: z
      .string()
      .max(400_000)
      .refine((value) => describeUnsafeGuideHtml(value) === null, {
        message: 'Gövdede betik, olay niteliği ya da gömülü çerçeve olamaz',
      }),
  }),
  z.object({
    kind: z.literal('widget'),
    /* Hesaplayıcı kimliği; React bileşenine eşleniyor. Bilinmeyen kimlik
       çizim anında atlanıyor (bkz. `guides.ts`). */
    id: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/),
  }),
]);

export const GuideDocumentSchema = z.object({
  toc: z.array(GuideTocEntrySchema).max(200),
  segments: z.array(GuideSegmentSchema).min(1).max(1_000),
});

export type GuideTocEntry = z.infer<typeof GuideTocEntrySchema>;
export type GuideSegment = z.infer<typeof GuideSegmentSchema>;
export type GuideDocument = z.infer<typeof GuideDocumentSchema>;

/**
 * OKUMA TARAFI KAPISI.
 *
 * Veritabanından gelen belgeyi doğrular. Geçersizse `null` dönüyor ve
 * çağıran taraf TOHUMA düşüyor — bozuk ya da kurcalanmış bir kayıt
 * yüzünden sayfa boş kalmıyor, koddaki sürüm çiziliyor.
 */
export function parseGuideDocument(value: unknown): GuideDocument | null {
  const result = GuideDocumentSchema.safeParse(value);
  return result.success ? result.data : null;
}

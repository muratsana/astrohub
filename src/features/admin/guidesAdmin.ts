import {
  GuideDocumentSchema,
  describeUnsafeGuideHtml,
  type GuideDocument,
  type GuideSegment,
  type GuideTocEntry,
} from '@/domain/content/guide';
import { drizzleSegments, drizzleToc } from '@/features/knowledge/drizzle/content.generated';
import { kutupSegments, kutupToc } from '@/features/knowledge/kutup/content.generated';
import { snrSegments, snrToc } from '@/features/knowledge/snr/content.generated';
import { getSupabase } from '@/services/supabase/client';

/**
 * REHBER YÖNETİMİ — VERİ KATMANI.
 *
 * Üç uzun form rehberin gövdesi koddan (tohum) ya da veritabanından
 * geliyor; bu dosya ikisi arasındaki köprü. Panel bir rehberi ilk kez
 * kaydettiğinde tohum veritabanına iniyor ve o andan itibaren
 * düzenlenebilir oluyor. "Tohuma dön" kaydı SİLİYOR — geri alma için
 * ayrı bir sürüm tablosu tutmaya gerek yok, koddaki sürüm zaten orada.
 *
 * KAYNAK DOSYA (`docs/<rehber>/standalone-kaynak.html`) DEĞİŞMİYOR.
 * Onu düzenlemek ve üreticiyi çalıştırmak hâlâ mümkün; o yol şekilleri
 * yeniden çizmek gerektiğinde (jsdom içinde paketin kendi çizim kodu
 * koşuyor) tek seçenek. Panel yolu METİN düzenlemek için: yayındaki bir
 * yazım hatasını düzeltmek artık dağıtım gerektirmiyor.
 */

export interface GuideSeed {
  slug: string;
  title: string;
  path: string;
  toc: GuideTocEntry[];
  segments: GuideSegment[];
}

/**
 * Tohumlar. Üretilen dosyaların tipleri birbirinden bağımsız (her rehber
 * kendi `WidgetId` birleşimini tanımlıyor) ama yapıları aynı; ortak
 * `GuideSegment` tipine burada indirgeniyorlar.
 */
export const GUIDE_SEEDS: GuideSeed[] = [
  {
    slug: 'snr-rehberi',
    title: 'Sinyal–Gürültü Oranı',
    path: '/yazilar/snr-rehberi',
    toc: snrToc,
    segments: snrSegments as GuideSegment[],
  },
  {
    slug: 'kutup-hizalamasi',
    title: 'Kutup Hizalaması',
    path: '/yazilar/kutup-hizalamasi',
    toc: kutupToc,
    segments: kutupSegments as GuideSegment[],
  },
  {
    slug: 'drizzle-rehberi',
    title: 'Drizzle',
    path: '/yazilar/drizzle-rehberi',
    toc: drizzleToc,
    segments: drizzleSegments as GuideSegment[],
  },
];

export function guideSeed(slug: string): GuideSeed | undefined {
  return GUIDE_SEEDS.find((item) => item.slug === slug);
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface GuideStatus {
  slug: string;
  /** Panelde düzenlenmiş bir sürüm var mı? */
  edited: boolean;
  updatedAt: string | null;
}

export async function fetchGuideStatuses(): Promise<GuideStatus[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('guide_documents')
    .select('slug, updated_at');
  if (error) throw new Error(error.message);
  const bySlug = new Map(
    (data ?? []).map((row) => [
      String((row as Record<string, unknown>).slug),
      String((row as Record<string, unknown>).updated_at ?? ''),
    ])
  );
  return GUIDE_SEEDS.map((seed) => ({
    slug: seed.slug,
    edited: bySlug.has(seed.slug),
    updatedAt: bySlug.get(seed.slug) || null,
  }));
}

/** Düzenlenmiş sürüm varsa onu, yoksa tohumu döner. */
export async function fetchGuideForEdit(slug: string): Promise<GuideDocument> {
  const seed = guideSeed(slug);
  if (!seed) throw new Error('Bilinmeyen rehber.');

  const supabase = await client();
  const { data, error } = await supabase
    .from('guide_documents')
    .select('toc, segments')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!data) return { toc: seed.toc, segments: seed.segments };

  const parsed = GuideDocumentSchema.safeParse(data);
  if (!parsed.success) {
    /* Kayıt bozuksa yöneticiye tohumu açıyoruz ama sessiz kalmıyoruz:
       kaydetmesi kaydı düzeltir. */
    throw new Error(
      'Kayıtlı sürüm doğrulamadan geçmiyor; site şu anda koddaki sürümü çiziyor. ' +
        'Tohuma dönüp yeniden düzenleyebilirsiniz.'
    );
  }
  return parsed.data;
}

/**
 * Kaydeder.
 *
 * Şema kaydetmeden ÖNCE çalışıyor: gövde `dangerouslySetInnerHTML` ile
 * basıldığı için betik/olay niteliği taşıyan bir metnin tabloya inmesine
 * hiç izin verilmiyor. Okuma tarafında aynı kontrol tekrar var — panel
 * dışından yazılmış bir kayıt da süzülsün diye.
 */
export async function saveGuide(
  slug: string,
  doc: GuideDocument
): Promise<void> {
  if (!guideSeed(slug)) throw new Error('Bilinmeyen rehber.');
  const parsed = GuideDocumentSchema.safeParse(doc);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? 'Rehber içeriği doğrulanamadı.'
    );
  }

  const supabase = await client();
  const { data, error } = await supabase
    .from('guide_documents')
    .upsert(
      { slug, toc: parsed.data.toc, segments: parsed.data.segments },
      { onConflict: 'slug' }
    )
    .select('slug');
  if (error) throw new Error(error.message);
  if (!data?.length)
    throw new Error('Rehber kaydedilemedi: yetkiniz olmayabilir.');
}

/** Panelden düzenlenmiş sürümü siler; site koddaki tohuma döner. */
export async function resetGuideToSeed(slug: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('guide_documents')
    .delete()
    .eq('slug', slug);
  if (error) throw new Error(error.message);
}

/** Bir bölümün güvenlik sorunu — form kaydetmeden önce gösteriyor. */
export function describeSegmentProblem(segment: GuideSegment): string | null {
  if (segment.kind !== 'html') return null;
  return describeUnsafeGuideHtml(segment.html);
}

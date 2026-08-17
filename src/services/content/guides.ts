import { useQuery } from '@tanstack/react-query';
import {
  parseGuideDocument,
  type GuideDocument,
  type GuideSegment,
  type GuideTocEntry,
} from '@/domain/content/guide';
import { getSupabase } from '@/services/supabase/client';

/**
 * REHBER GÖVDESİNİN TEK OKUMA KAPISI.
 *
 * Koddaki `content.generated.ts` TOHUM; veritabanındaki kayıt üstüne
 * yazıyor. Üç durumda da tohum çiziliyor:
 *
 *   · Kayıt yok (varsayılan hâl — hiç düzenlenmemiş rehber).
 *   · Veritabanına ulaşılamıyor (prerender ve çevrimdışı dahil).
 *   · Kayıt var ama şemadan geçmiyor (bozuk ya da kurcalanmış).
 *
 * Üçüncüsü önemli: doğrulamadan geçmeyen bir kaydı çizmektense koddaki
 * sürümü çizmek, sayfayı boş bırakmaktan da güvensiz HTML basmaktan da
 * iyi. `parseGuideDocument` bu kararı veriyor.
 *
 * PRERENDER TOHUMU ÇİZİYOR. `entry-prerender.tsx` sayfa içeriği için
 * veritabanına gitmiyor (yalnızca sitemap için gidiyor), dolayısıyla
 * statik HTML koddaki sürümü taşıyor ve düzenlenmiş gövde hidrasyondan
 * sonra geliyor. Bu, haber ve yazılarda ZATEN kabul edilmiş takas;
 * rehberlere ayrı bir kural getirmiyoruz.
 */

export interface GuideContent {
  toc: GuideTocEntry[];
  segments: GuideSegment[];
  /** İçerik panelden mi geliyor? Yönetim ekranı bunu rozetle gösteriyor. */
  fromDatabase: boolean;
}

async function fetchGuideDocument(slug: string): Promise<GuideDocument | null> {
  const promise = getSupabase();
  if (!promise) return null;
  const supabase = await promise;
  const { data, error } = await supabase
    .from('guide_documents')
    .select('toc, segments')
    .eq('slug', slug)
    .maybeSingle();
  /* Okuma hatası sessizce yutulmuyor ama sayfayı da düşürmüyor: tohum
     zaten elimizde, kullanıcı içeriği görmeye devam ediyor. */
  if (error) {
    console.warn(`rehber "${slug}" okunamadı: ${error.message}`);
    return null;
  }
  return data ? parseGuideDocument(data) : null;
}

export function useGuideContent(
  slug: string,
  seedToc: GuideTocEntry[],
  seedSegments: GuideSegment[]
): GuideContent {
  const query = useQuery({
    queryKey: ['guide', slug],
    queryFn: () => fetchGuideDocument(slug),
    /* Rehber günlük değişen bir içerik değil; sık tazelemenin karşılığı
       yok. Katalog sorgularıyla aynı pencere. */
    staleTime: 5 * 60_000,
  });

  const doc = query.data;
  if (!doc) return { toc: seedToc, segments: seedSegments, fromDatabase: false };
  return { toc: doc.toc, segments: doc.segments, fromDatabase: true };
}

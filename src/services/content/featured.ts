import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';

/**
 * ÖNE ÇIKAN İÇERİK — ana sayfa şeritlerinin sırası.
 *
 * Ana sayfa haber ve yazı şeritlerinde dörder satır gösteriyor. Hangi
 * dördü sorusunun cevabı "en yenisi" idi ve bu, editoryal bir kararı
 * tarih alanına devrediyordu: iyi bir rehber bir hafta sonra düşüyor,
 * güncel ama önemsiz bir duyuru üste çıkıyordu. Artık yönetici seçiyor.
 *
 * BU KATMAN YALNIZCA SIRA TAŞIR. İçeriğin kendisi hâlâ derlenmiş veri
 * dosyalarında; buradaki kayıt bir slug'a "önce bunu göster" demekten
 * ibaret. İçerik şeması veritabanına taşındığında (E3) bu dosya olduğu
 * gibi kalır.
 *
 * VERİTABANI YOKSA ÇALIŞMAYA DEVAM EDER. Supabase yapılandırılmamışsa
 * ya da sorgu düşerse liste boş döner ve çağıran taraf kendi
 * varsayılan sırasında kalır — ana sayfa hiçbir koşulda boşalmaz.
 */

export type FeaturedKind = 'haber' | 'yazi' | 'etkinlik';

export interface FeaturedRow {
  slug: string;
  position: number;
}

export interface FeaturedState {
  /** Yöneticinin seçtiği slug'lar, sırayla. */
  slugs: string[];
  loading: boolean;
  /** Veritabanı yapılandırılmış ve sorgu başarılı mı? */
  durable: boolean;
  error: string | null;
  refresh: () => void;
}

async function fetchFeatured(kind: FeaturedKind): Promise<FeaturedRow[]> {
  const clientPromise = getSupabase();
  if (!clientPromise) throw new Error('unconfigured');
  const client = await clientPromise;
  const { data, error } = await client
    .from('featured_content')
    .select('slug, position')
    .eq('kind', kind)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FeaturedRow[];
}

export function useFeatured(kind: FeaturedKind): FeaturedState {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [durable, setDurable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    fetchFeatured(kind)
      .then((rows) => {
        if (!active) return;
        setSlugs(rows.map((r) => r.slug));
        setDurable(true);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setDurable(false);
        setError(e instanceof Error ? e.message : 'bilinmeyen hata');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [kind, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { slugs, loading, durable, error, refresh };
}

/**
 * Seçilenleri öne alır, kalanı kendi sırasında arkaya ekler.
 *
 * SAF VE TEST EDİLEBİLİR: sıralama kuralı bileşenin içinde şablon
 * arasına serpiştirilseydi, "silinmiş slug ne olur", "seçim boşsa ne
 * olur" gibi sorular ancak tarayıcıda denenerek anlaşılırdı.
 *
 * Eşleşmeyen slug sessizce atlanır: içerik silinmiş olabilir ve ana
 * sayfayı boş bir kartla cezalandırmanın anlamı yok.
 */
export function applyFeatured<T>(
  items: T[],
  featuredSlugs: string[],
  slugOf: (item: T) => string,
  limit: number
): T[] {
  if (featuredSlugs.length === 0) return items.slice(0, limit);

  const bySlug = new Map(items.map((item) => [slugOf(item), item]));
  const picked: T[] = [];
  const used = new Set<string>();

  for (const slug of featuredSlugs) {
    const item = bySlug.get(slug);
    if (!item || used.has(slug)) continue;
    picked.push(item);
    used.add(slug);
    if (picked.length === limit) return picked;
  }

  for (const item of items) {
    if (used.has(slugOf(item))) continue;
    picked.push(item);
    if (picked.length === limit) break;
  }

  return picked;
}

/* ── Yönetim yazma uçları ──────────────────────────────────────────── */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Supabase yapılandırılmamış.');
  return promise;
}

/** Seçili listeyi olduğu gibi yazar: önce siler, sonra sırayla ekler. */
export async function saveFeatured(
  kind: FeaturedKind,
  slugs: string[]
): Promise<void> {
  const supabase = await client();

  /*
   * SİL-YAZ, tek tek güncelleme değil.
   *
   * Sıra değişince neredeyse her satırın `position` alanı değişiyor;
   * bunları tek tek güncellemek hem daha çok gidiş-geliş hem de yarım
   * kalırsa tutarsız bir sıra demek. Liste dört-beş öğelik, tümünü
   * yeniden yazmak en ucuz ve en öngörülebilir yol.
   */
  const { error: delError } = await supabase
    .from('featured_content')
    .delete()
    .eq('kind', kind);
  if (delError) throw new Error(delError.message);

  if (slugs.length === 0) return;

  const { error } = await supabase.from('featured_content').insert(
    slugs.map((slug, index) => ({
      kind,
      slug,
      position: index,
      updated_at: new Date().toISOString(),
    }))
  );
  if (error) throw new Error(error.message);
}

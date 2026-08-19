import { getSupabase } from '@/services/supabase/client';

/**
 * KATALOG MÜKERRER BİRLEŞTİRME — yönetici arayüzü (F03, F04, F08).
 *
 * ══════════════════════════════════════════════════════════════════════
 * OTOMATİK BİRLEŞTİRME YOK
 *
 * Aday listesi marka+model normalize edilerek çıkarılıyor
 * (`equipment_duplicate_candidates`): noktalama, boşluk ve harf
 * büyüklüğü atılıyor, `sw-eq6r-pro` ile `sky-watcher-eq6-r-pro` aynı
 * anahtara düşüyor. Ama birleştirme kararı YÖNETİCİNİN: "150P" ile
 * "150PDS" de benzer görünür ve gerçekten farklı ürünlerdir. Makine
 * adayı buluyor, insan onaylıyor.
 *
 * Her birleştirme geri alınabilir (`unmergeModels`): kaynak satır
 * silinmiyor, tam kopyası günlüğe yazılıyor.
 */

export interface DuplicateCandidate {
  /** Normalize edilmiş marka+model anahtarı. */
  anahtar: string;
  adet: number;
  sluglar: string[];
  idler: string[];
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

/** Mükerrer aday grupları — yönetici onayı bekleyen liste (F03). */
export async function fetchDuplicateCandidates(): Promise<DuplicateCandidate[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('equipment_duplicate_candidates')
    .select('anahtar, adet, sluglar, idler')
    .order('anahtar');
  if (error) throw new Error(error.message);
  return (data ?? []) as DuplicateCandidate[];
}

/**
 * İki modeli birleştirir; birleştirme günlüğünün kimliğini döndürür.
 * Bu kimlik geri alma için saklanmalı (F08).
 */
export async function mergeModels(
  kaynakSlug: string,
  hedefSlug: string
): Promise<string> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('merge_equipment_models', {
    kaynak_slug: kaynakSlug,
    hedef_slug: hedefSlug,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Birleştirmeyi geri alır. Zaten geri alınmışsa `false`. */
export async function unmergeModels(logId: string): Promise<boolean> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('unmerge_equipment_model', {
    log_id: logId,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export interface MergeLogEntry {
  id: string;
  sourceSlug: string;
  canonicalSlug: string;
  movedRefs: Record<string, number>;
  mergedAt: string;
  undoneAt: string | null;
}

/** Birleştirme geçmişi — neyin ne zaman birleştiği ve geri alınıp alınmadığı. */
export async function fetchMergeLog(): Promise<MergeLogEntry[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('equipment_merge_log')
    .select('id, source_slug, canonical_slug, moved_refs, merged_at, undone_at')
    .order('merged_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      sourceSlug: row.source_slug as string,
      canonicalSlug: row.canonical_slug as string,
      movedRefs: (row.moved_refs ?? {}) as Record<string, number>,
      mergedAt: row.merged_at as string,
      undoneAt: (row.undone_at as string | null) ?? null,
    };
  });
}

/**
 * Taşınan toplam referans sayısı — "bu birleştirme neyi etkiledi"
 * sorusunun tek sayılık cevabı.
 */
export function totalMovedRefs(entry: MergeLogEntry): number {
  return Object.values(entry.movedRefs).reduce((a, b) => a + b, 0);
}

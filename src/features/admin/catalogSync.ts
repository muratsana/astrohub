import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/services/supabase/client';
import {
  equipment,
  equipmentCategoryLabels,
  equipmentCategoryOrder,
} from '@/features/equipment/data';
import { targets } from '@/features/targets/data';
import {
  brandRows,
  equipmentRow,
  identifierRows,
  targetRow,
} from '@/domain/catalog/rows';

/**
 * KATALOG SENKRONİZASYONU — yönetim panelinden tetiklenir.
 *
 * Ekipman ve hedef kataloğu uygulamanın içinde tohum dizi olarak geliyor
 * ve veritabanı bunun üstüne yazılıyor. Yeni bir sürüm yayına alındığında
 * veritabanındaki kataloğu güncellemek için elle SQL çalıştırmak
 * gerekiyordu; artık yönetici panelden bir düğmeye basıyor.
 *
 * ASLA SİLMEZ. Tohumda olmayan bir kayıt veritabanında duruyorsa
 * bırakılır: o kayıt kullanıcı katkısı ya da editör eklemesi olabilir ve
 * "senkronize et" düğmesinin topluluk katkısını süpürmesi kabul edilemez.
 * Senkronizasyon yalnızca ekler ve tohumdaki kayıtları günceller.
 *
 * YETKİ VERİTABANINDA. Bu modül yalnızca istek gönderir; yetkisiz bir
 * hesapta RLS her yazmayı reddeder. Paneldeki rol kontrolü kullanıcıyı
 * boşuna beklemekten kurtarmak içindir, güvenlik sınırı değil.
 *
 * PARÇALI GÖNDERİM. 130 ekipman ve 230 hedef tek istekte gönderilirse
 * gövde boyutu ve zaman aşımı sınırlarına takılıyor. Parçalara bölmek aynı
 * zamanda ilerlemeyi raporlanabilir kılıyor — kullanıcı ne kadarının
 * bittiğini görüyor.
 */

/** Tek istekte gönderilen satır sayısı. */
export const CHUNK_SIZE = 100;

export function chunk<T>(items: readonly T[], size = CHUNK_SIZE): T[][] {
  if (size <= 0) throw new Error('Parça boyutu pozitif olmalı');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface SyncStep {
  /** Kullanıcıya gösterilen ad. */
  label: string;
  /** Bu adımda yazılacak satır sayısı. */
  rows: number;
}

export interface SyncPlan {
  steps: SyncStep[];
  totalRows: number;
}

/**
 * Ne yazılacağını **önceden** söyler.
 *
 * Yönetici düğmeye basmadan önce kaç satırın etkileneceğini görmeli:
 * "senkronize et" dediğinde ne olacağını bilmeden onaylamak, geri alınamaz
 * bir işlemi karanlıkta yapmak olur.
 */
export function planSync(): SyncPlan {
  const steps: SyncStep[] = [
    { label: 'Ekipman kategorileri', rows: equipmentCategoryOrder.length },
    { label: 'Markalar', rows: brandRows(equipment).length },
    { label: 'Ekipman modelleri', rows: equipment.length },
    { label: 'Gök cisimleri', rows: targets.length },
    {
      label: 'Katalog kodları',
      rows: targets.reduce((sum, t) => sum + identifierRows(t).length, 0),
    },
  ];
  return { steps, totalRows: steps.reduce((sum, s) => sum + s.rows, 0) };
}

export interface SyncProgress {
  step: string;
  done: number;
  total: number;
}

export interface SyncResult {
  written: Record<string, number>;
  totalRows: number;
}

async function client(): Promise<SupabaseClient> {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

async function upsertAll(
  supabase: SupabaseClient,
  table: string,
  rows: readonly object[],
  onConflict: string
): Promise<number> {
  for (const part of chunk(rows)) {
    const { error } = await supabase
      .from(table)
      .upsert(part as object[], { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  return rows.length;
}

export async function syncCatalog(
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResult> {
  const supabase = await client();
  const plan = planSync();
  const written: Record<string, number> = {};
  let done = 0;

  const report = (step: string) =>
    onProgress?.({ step, done, total: plan.totalRows });

  /* ── 1. Kategoriler ── */
  report('Ekipman kategorileri');
  written['Ekipman kategorileri'] = await upsertAll(
    supabase,
    'equipment_categories',
    equipmentCategoryOrder.map((id, index) => ({
      id,
      name: equipmentCategoryLabels[id],
      position: index + 1,
    })),
    'id'
  );
  done += written['Ekipman kategorileri'];

  /*
   * ── 2. Markalar ──
   * Model satırları markaya yabancı anahtarla bağlı; marka önce yazılmalı.
   * Kullanıcı katkısıyla açılmış onaysız bir marka tohumda da varsa burada
   * onaylanmış hâle gelir — tohum listesi editöryeldir.
   */
  report('Markalar');
  written['Markalar'] = await upsertAll(
    supabase,
    'equipment_brands',
    brandRows(equipment).map((b) => ({ ...b, approved: true })),
    'id'
  );
  done += written['Markalar'];

  /* ── 3. Ekipman modelleri ── */
  report('Ekipman modelleri');
  written['Ekipman modelleri'] = await upsertAll(
    supabase,
    'equipment_models',
    equipment.map((item) => ({ ...equipmentRow(item), approved: true })),
    'slug'
  );
  done += written['Ekipman modelleri'];

  /* ── 4. Gök cisimleri ── */
  report('Gök cisimleri');
  written['Gök cisimleri'] = await upsertAll(
    supabase,
    'celestial_objects',
    targets.map(targetRow),
    'slug'
  );
  done += written['Gök cisimleri'];

  /*
   * ── 5. Katalog kodları ──
   * `catalog_identifiers` slug değil `object_id` taşıyor; kimlikleri az
   * önce yazılan satırlardan tek sorguda okuyoruz. Her kod için ayrı
   * sorgu, 400 istek demek olurdu.
   */
  report('Katalog kodları');
  const { data, error } = await supabase
    .from('celestial_objects')
    .select('id, slug');
  if (error) throw new Error(`celestial_objects: ${error.message}`);

  const idBySlug = new Map(
    (data as { id: string; slug: string }[]).map((r) => [r.slug, r.id])
  );

  const identifierPayload = targets
    .flatMap(identifierRows)
    .map((r) => ({
      object_id: idBySlug.get(r.slug),
      code: r.code,
      is_primary: r.is_primary,
    }))
    // Kimliği bulunamayan satır atlanır: yabancı anahtar hatası tüm parçayı
    // düşürür ve çalışan 399 kodu da kaybettirirdi.
    .filter((r): r is { object_id: string; code: string; is_primary: boolean } =>
      typeof r.object_id === 'string'
    );

  written['Katalog kodları'] = await upsertAll(
    supabase,
    'catalog_identifiers',
    identifierPayload,
    'object_id,code'
  );
  done += written['Katalog kodları'];

  report('Tamamlandı');
  return { written, totalRows: done };
}

/**
 * Kullanıcı katkısı bekleyen kayıtlar.
 *
 * Katkılar `approved = false` ile açılıyor ve yalnızca ekleyene görünüyor
 * (0013). Editör onaylayana kadar katalogda yoklar; bu liste onların
 * unutulmasını engelliyor.
 */
export interface PendingContribution {
  slug: string;
  model: string;
  brand: string;
  category: string;
  created_at: string;
}

export async function fetchPendingContributions(): Promise<PendingContribution[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('equipment_models')
    .select('slug, model, category_id, created_at, equipment_brands(name)')
    .eq('approved', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (
    data as unknown as {
      slug: string;
      model: string;
      category_id: string;
      created_at: string;
      equipment_brands: { name: string } | null;
    }[]
  ).map((row) => ({
    slug: row.slug,
    model: row.model,
    brand: row.equipment_brands?.name ?? '—',
    category: row.category_id,
    created_at: row.created_at,
  }));
}

/** Katkıyı kataloğa alır. Markası da onaysızsa o da onaylanır. */
export async function approveContribution(slug: string): Promise<void> {
  const supabase = await client();

  const { data, error } = await supabase
    .from('equipment_models')
    .update({ approved: true })
    .eq('slug', slug)
    .select('brand_id')
    .single();

  if (error) throw new Error(error.message);

  /*
   * Marka onayı model onayının ardından: onaylanmış bir model onaysız bir
   * markaya bağlı kalırsa katalogda markasız görünür ve listeleme
   * sorgusundan düşer.
   */
  const brandId = (data as { brand_id: string } | null)?.brand_id;
  if (!brandId) return;

  const { error: brandError } = await supabase
    .from('equipment_brands')
    .update({ approved: true })
    .eq('id', brandId);
  if (brandError) throw new Error(brandError.message);
}

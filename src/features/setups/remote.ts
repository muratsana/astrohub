import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/services/supabase/client';
import { EMPTY_SETUP, type SetupDraft, type SlotId } from '@/domain/setup/types';
import type { SavedSetup, SetupVisibility } from './store';

/**
 * SETUP'LARIN VERİTABANI TARAFI.
 *
 * Depo bugüne kadar yalnızca tarayıcıdaydı: kullanıcı telefonundan
 * kurduğu setup'ı masaüstünde bulamıyordu ve `/setup/:id` bağlantısı
 * karşı tarafta hiçbir şey açmıyordu — çünkü kayıt yalnızca kuranın
 * tarayıcısında vardı.
 *
 * YEREL DEPO KALDI, ÜSTÜNE SENKRONİZASYON GELDİ. Tamamen sunucuya
 * taşımak iki şeyi bozardı: oturum açmamış kullanıcı hiç setup
 * kuramazdı, ve her tuşta ağ beklemesi olurdu. Şimdi yerel depo anlık
 * yanıt veriyor, veritabanı kalıcılığı sağlıyor.
 *
 * ÇAKIŞMA ÇÖZÜMÜ `updatedAt`: aynı id iki yerde farklıysa yeni olan
 * kazanıyor. Alan bazlı birleştirme denemiyoruz — iki cihazda aynı
 * setup'ın farklı yuvalarını değiştiren biri zaten nadir, ve yanlış
 * birleştirilmiş bir optik zincir sessizce yanlış backfocus hesaplatır.
 */

const TABLE = 'user_setups';

interface SetupRow {
  id: string;
  name: string;
  description: string | null;
  purpose: string | null;
  visibility: string;
  is_default: boolean;
  slots: Record<string, string> | null;
  spacer_mm: number | string | null;
  extra_weight_kg: number | string | null;
  seeing_arcsec: number | string | null;
  created_at: string;
  updated_at: string;
}

const VISIBILITIES: SetupVisibility[] = ['ozel', 'profilde', 'herkese-acik'];

function num(value: number | string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapSetupRow(row: SetupRow): SavedSetup {
  const draft: SetupDraft = {
    slots: (row.slots ?? {}) as Partial<Record<SlotId, string>>,
    /* Varsayılanlar tek yerden: alan katmanındaki boş taslak. Burada
       ayrı sayılar yazsaydık, seeing varsayılanı değiştiğinde
       veritabanından gelen kayıtlar eski değerle kalırdı. */
    spacerMm: num(row.spacer_mm, EMPTY_SETUP.spacerMm),
    extraWeightKg: num(row.extra_weight_kg, EMPTY_SETUP.extraWeightKg),
    seeingArcsec: num(row.seeing_arcsec, EMPTY_SETUP.seeingArcsec),
  };

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    purpose: row.purpose ?? undefined,
    visibility: (VISIBILITIES.includes(row.visibility as SetupVisibility)
      ? row.visibility
      : 'ozel') as SetupVisibility,
    isDefault: row.is_default || undefined,
    draft,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(setup: SavedSetup, userId: string) {
  return {
    id: isUuid(setup.id) ? setup.id : undefined,
    user_id: userId,
    name: setup.name,
    description: setup.description ?? '',
    purpose: setup.purpose ?? null,
    visibility: setup.visibility,
    is_default: setup.isDefault ?? false,
    slots: setup.draft.slots,
    spacer_mm: setup.draft.spacerMm,
    extra_weight_kg: setup.draft.extraWeightKg,
    seeing_arcsec: setup.draft.seeingArcsec,
    updated_at: setup.updatedAt,
  };
}

/**
 * Yerel depo `setup-a1b2c3d4` biçiminde kimlik üretiyor; veritabanı UUID
 * bekliyor. Çevrimdışı kurulan bir setup ilk yüklemede yeni bir UUID
 * alıyor ve yerel kayıt onunla değiştiriliyor.
 */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function client(): Promise<SupabaseClient | null> {
  const promise = getSupabase();
  return promise ? promise : null;
}

/** Kullanıcının kendi setup'ları. */
export async function fetchMySetups(userId: string): Promise<SavedSetup[]> {
  const supabase = await client();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as SetupRow[]).map(mapSetupRow);
}

/**
 * Paylaşılan setup — `/setup/:id` bağlantısı için.
 *
 * RLS görünürlüğü kendisi uyguluyor: özel bir setup başkasına satır
 * döndürmüyor. Buradaki filtre onun yerine geçmiyor, isteği küçültüyor.
 */
export async function fetchSharedSetup(id: string): Promise<SavedSetup | null> {
  if (!isUuid(id)) return null;
  const supabase = await client();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapSetupRow(data as unknown as SetupRow);
}

/** Kaydı veritabanına yazar ve (yeni kimlik almış olabileceği için) döner. */
export async function pushSetup(
  setup: SavedSetup,
  userId: string
): Promise<SavedSetup> {
  const supabase = await client();
  if (!supabase) return setup;

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(toRow(setup, userId))
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapSetupRow(data as unknown as SetupRow);
}

export async function removeSetup(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const supabase = await client();
  if (!supabase) return;

  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Varsayılan bayrağı.
 *
 * Önce hepsini temizleyip sonra birini işaretliyoruz. Tek sorguda
 * yapılamaz çünkü şemada kısmi tekil indeks var
 * (`user_setups_single_default_idx`): iki satır aynı anda `true` olursa
 * yazma reddedilir.
 */
export async function pushDefault(id: string, userId: string): Promise<void> {
  const supabase = await client();
  if (!supabase || !isUuid(id)) return;

  const cleared = await supabase
    .from(TABLE)
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);
  if (cleared.error) throw new Error(cleared.error.message);

  const { error } = await supabase
    .from(TABLE)
    .update({ is_default: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Yerel ve uzak listeleri birleştirir.
 *
 * KURAL: aynı kimlik iki yerdeyse `updatedAt` yeni olan kazanır. Yalnızca
 * yerelde olan kayıtlar korunuyor — oturum açmadan setup kuran biri giriş
 * yaptığında emeğini kaybetmemeli. Yalnızca uzakta olanlar ekleniyor:
 * başka cihazda kurulmuş olabilir.
 *
 * Yerelde SİLİNMİŞ bir kaydı geri getirebilir. Bu bilinçli: silme
 * niyetini kaybetmek, veriyi kaybetmekten iyidir. Kalıcı silme uzak
 * tarafta da çalıştığı için tek gerçek risk çevrimdışı silmenin geri
 * gelmesi.
 */
export function mergeSetups(
  local: SavedSetup[],
  remote: SavedSetup[]
): SavedSetup[] {
  const byId = new Map<string, SavedSetup>();
  for (const setup of local) byId.set(setup.id, setup);

  for (const setup of remote) {
    const existing = byId.get(setup.id);
    if (!existing || setup.updatedAt >= existing.updatedAt) {
      byId.set(setup.id, setup);
    }
  }

  return [...byId.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

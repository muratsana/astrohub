import { getSupabase } from '@/services/supabase/client';
import { sanitizeText } from '@/lib/sanitize';

/**
 * FORUM KATEGORİLERİ — veri katmanı.
 *
 * `records.ts` kullanıcı/moderasyon kaydı yönetir; forum kategorisi ise
 * yapılandırmadır. Ayrı kalması admin yüzeyine gereksiz durum/sahip
 * alanları taşınmasını engeller.
 */

export interface Kategori {
  id: string;
  name: string;
  description: string | null;
  position: number;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export async function fetchCategories(): Promise<Kategori[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('forum_categories')
    .select('id, name, description, position')
    .order('position');
  if (error) throw new Error(error.message);
  return (data ?? []) as Kategori[];
}

export async function upsertCategory(input: {
  id: string;
  name: string;
  description: string;
  position: number;
}): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from('forum_categories').upsert(
    {
      id: input.id,
      name: sanitizeText(input.name, { maxLength: 80 }),
      description: sanitizeText(input.description, { maxLength: 300 }) || null,
      position: input.position,
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);
}

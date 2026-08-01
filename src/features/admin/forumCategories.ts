import { getSupabase } from '@/services/supabase/client';
import { sanitizeText } from '@/lib/sanitize';

/**
 * FORUM KATEGORİLERİ — veri katmanı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `records.ts`E EKLENMEDİ
 *
 * `records.ts` KAYIT yönetiyor: kullanıcının ürettiği, durumu olan,
 * moderasyondan geçen şeyler. Kategori bunların hiçbiri değil — o bir
 * YAPILANDIRMA. Durumu yok, sahibi yok, moderasyonu yok; tek soru
 * "hangi başlıklar var ve hangi sırada". Aynı bileşene sıkıştırmak,
 * orada anlamı olmayan bir durum sütunu ve sahip alanı taşımak demekti.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SİLME YOK
 *
 * Kategori silmek altındaki konuları sahipsiz bırakır (`category_id`
 * yabancı anahtarı). Kullanımdan kaldırmanın doğru yolu listenin sonuna
 * almak; gerçekten silinecekse önce konuların taşınması gerekir ve o iş
 * bu modülün işi değil.
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


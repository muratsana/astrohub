import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { getSupabase } from '@/services/supabase/client';
import { listOwned, replaceOwned, toggleOwned } from './inventory';

/**
 * "EKİPMANLARIM" — yerel öncelikli, veritabanı kalıcı.
 *
 * `user_equipment` tablosu **model kimliği** (uuid) tutuyor, uygulama ise
 * her yerde **slug** kullanıyor. Slug insan tarafından okunabilir ve
 * katalog dosyasında yazılı; uuid yalnızca veritabanında var.
 *
 * Çeviriyi burada yapıyoruz, tabloyu slug'a çevirmiyoruz: yabancı anahtar
 * gerçek bir kısıt ve katalogdan silinmiş bir modeli envanterde bırakmayı
 * engelliyor. Slug kolonu olsaydı envanter, artık var olmayan bir modeli
 * yıllarca taşıyabilirdi.
 *
 * Setup deposundaki desenin aynısı: yerel anlık, veritabanı arka planda.
 */

export interface InventoryStore {
  owned: string[];
  syncing: boolean;
  error: string | null;
  durable: boolean;
  toggle: (slug: string) => Promise<void>;
}

/**
 * Gömülü `equipment_models` alanından slug'ları çıkarır.
 *
 * PostgREST çoktan-bire bir ilişkiyi tekil nesne olarak döndürüyor ama
 * supabase-js'in tip çıkarımı diziye kaçabiliyor. İkisini de kabul
 * etmek, tipi zorla dönüştürmekten (`as unknown as …`) güvenli: zorlama,
 * şema değiştiğinde derleyicinin uyarmasını engellerdi.
 */
function embeddedSlugs(row: unknown): string[] {
  const value = (row as { equipment_models?: unknown })?.equipment_models;
  const items = Array.isArray(value) ? value : [value];
  return items
    .map((item) => (item as { slug?: unknown } | null)?.slug)
    .filter((slug): slug is string => typeof slug === 'string');
}

/** slug → model kimliği. Katalogda olmayan slug'lar dışarıda kalır. */
async function resolveIds(slugs: string[]): Promise<Map<string, string>> {
  const promise = getSupabase();
  if (!promise || slugs.length === 0) return new Map();
  const supabase = await promise;

  const { data, error } = await supabase
    .from('equipment_models')
    .select('id, slug')
    .in('slug', slugs);

  if (error) throw new Error(error.message);
  return new Map(
    (data as { id: string; slug: string }[]).map((r) => [r.slug, r.id])
  );
}

export function useInventory(): InventoryStore {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [owned, setOwned] = useState<string[]>(() => listOwned());
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Giriş anında birleştirme: uzak liste iniyor, yalnızca yerelde olanlar
     yukarı çıkıyor. Kesişim değil birleşim — oturum açmadan işaretlenmiş
     ekipman kaybolmamalı. */
  useEffect(() => {
    if (!userId) {
      setOwned(listOwned());
      return;
    }

    let active = true;
    setSyncing(true);

    void (async () => {
      try {
        const promise = getSupabase();
        if (!promise) return;
        const supabase = await promise;

        const { data, error: readError } = await supabase
          .from('user_equipment')
          .select('equipment_models(slug)')
          .eq('user_id', userId);
        if (readError) throw new Error(readError.message);

        const remote = (data ?? []).flatMap((r) => embeddedSlugs(r));

        const local = listOwned();
        const merged = [...new Set([...remote, ...local])];

        const missing = local.filter((s) => !remote.includes(s));
        if (missing.length > 0) {
          const ids = await resolveIds(missing);
          const rows = [...ids.values()].map((id) => ({
            user_id: userId,
            model_id: id,
          }));
          if (rows.length > 0) {
            const { error: writeError } = await supabase
              .from('user_equipment')
              .upsert(rows, { onConflict: 'user_id,model_id' });
            if (writeError) throw new Error(writeError.message);
          }
        }

        if (!active) return;
        replaceOwned(merged);
        setOwned(merged);
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Envanter eşitlenemedi');
        }
      } finally {
        if (active) setSyncing(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const toggle = useCallback(
    async (slug: string) => {
      const nowOwned = toggleOwned(slug);
      setOwned(listOwned());

      if (!userId) return;
      try {
        const promise = getSupabase();
        if (!promise) return;
        const supabase = await promise;

        const ids = await resolveIds([slug]);
        const modelId = ids.get(slug);
        /* Katalogda karşılığı yoksa yerelde kalıyor: tohum veriyle
           çalışan bir kurulumda model henüz veritabanına
           senkronlanmamış olabilir. */
        if (!modelId) return;

        const { error: writeError } = nowOwned
          ? await supabase
              .from('user_equipment')
              .upsert(
                { user_id: userId, model_id: modelId },
                { onConflict: 'user_id,model_id' }
              )
          : await supabase
              .from('user_equipment')
              .delete()
              .eq('user_id', userId)
              .eq('model_id', modelId);

        if (writeError) throw new Error(writeError.message);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Envanter kaydedilemedi');
      }
    },
    [userId]
  );

  return { owned, syncing, error, durable: userId !== null, toggle };
}

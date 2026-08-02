import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * FAVORİ HEDEFLER (§14.1).
 *
 * ══════════════════════════════════════════════════════════════════════
 * KOLEKSİYON DEĞİL — GEREKÇE `0066`DA
 *
 * Kısaca: `collections` adlandırılmış, paylaşılabilir, sıralı bir FOTO
 * seçkisi; favori hedef ise adsız düz bir küme. `collection_items`a
 * sokmak `photo_id`yi nullable yapıp bir tür sütunu eklemek demekti —
 * 0064'te gözlem günlüğü için reddettiğimiz şeklin aynısı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "GÖZLEM LİSTESİ" AYRI BİR ŞEY DEĞİL
 *
 * §14.1 ikisini ayrı sayıyor; biz gözlem listesini favorilerin BU
 * GECEYE göre süzülmüş hâli olarak yorumladık. Sıralamayı gökyüzü
 * belirliyor (yükseklik, transit), kullanıcı değil — saklanacak bir sıra
 * yok. İki ayrı liste, aynı hedefi iki kez işaretletir ve aradaki farkı
 * kimseye anlatamazdık.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İYİMSER GÜNCELLEME — AMA GERİ ALMALI
 *
 * Yıldız düğmesi ağı beklemeden doluyor: bu bir beğeni, geri alınabilir
 * ve gecikmesi hissedilirse düğme bozuk sanılır. Sunucu reddederse eski
 * hâle DÖNÜLÜYOR; iyimserliğin bedeli, hata durumunda yalan söylemek
 * olmamalı.
 */

export interface FavoritesState {
  /** Favori hedeflerin slug kümesi. Oturum yoksa boş. */
  slugs: Set<string>;
  loading: boolean;
  /** Oturum ya da veritabanı yoksa `false` — düğme hiç gösterilmiyor. */
  available: boolean;
  toggle: (slug: string) => Promise<void>;
  error: string | null;
}

const EMPTY: Set<string> = new Set();

export function useTargetFavorites(): FavoritesState {
  const { user, loading: authLoading } = useAuth();
  const [slugs, setSlugs] = useState<Set<string>>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = isSupabaseConfigured && Boolean(user);

  useEffect(() => {
    if (!available || !user) {
      setSlugs(EMPTY);
      return;
    }

    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const supabase = await getSupabase();
        if (!supabase || !active) return;
        const { data, error: qErr } = await supabase
          .from('target_favorites')
          .select('target_slug')
          .eq('user_id', user.id);
        if (!active) return;
        if (qErr) {
          setError(qErr.message);
          return;
        }
        setSlugs(
          new Set((data ?? []).map((r) => String((r as { target_slug: string }).target_slug)))
        );
        setError(null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Favoriler okunamadı');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [available, user]);

  const toggle = useCallback(
    async (slug: string) => {
      if (!available || !user) return;

      const ekliydi = slugs.has(slug);
      /* İyimser: düğme hemen değişiyor. */
      setSlugs((eski) => {
        const yeni = new Set(eski);
        if (ekliydi) yeni.delete(slug);
        else yeni.add(slug);
        return yeni;
      });
      setError(null);

      try {
        const supabase = await getSupabase();
        if (!supabase) throw new Error('Bağlantı kurulamadı');

        const { error: wErr } = ekliydi
          ? await supabase
              .from('target_favorites')
              .delete()
              .eq('user_id', user.id)
              .eq('target_slug', slug)
          : await supabase
              .from('target_favorites')
              .insert({ user_id: user.id, target_slug: slug });

        if (wErr) throw new Error(wErr.message);
      } catch (e) {
        /* GERİ AL. İyimser güncelleme başarısız olduğunda ekranda kalmak,
           kullanıcıya kaydedilmiş bir şey kaydedilmiş gibi göstermek
           olurdu — sayfayı yenileyince kaybolurdu ve sebebini anlamazdı. */
        setSlugs((eski) => {
          const yeni = new Set(eski);
          if (ekliydi) yeni.add(slug);
          else yeni.delete(slug);
          return yeni;
        });
        setError(e instanceof Error ? e.message : 'Kaydedilemedi');
      }
    },
    [available, slugs, user]
  );

  return {
    slugs,
    loading: loading || authLoading,
    available,
    toggle,
    error,
  };
}

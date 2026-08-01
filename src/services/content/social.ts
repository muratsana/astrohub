import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * TAKİP VE ENGELLEME — istemci tarafı.
 *
 * İKİSİ AYNI DOSYADA ÇÜNKÜ AYNI KARARIN İKİ YÜZÜ. Engelleme takibi
 * koparıyor (0041 tetikleyicisi), takip ise engelli birine yazılamıyor
 * (RLS `with check`). İki kancayı ayrı dosyalara koymak, bu bağı
 * göremeyen bir okuyucu için ikisini bağımsız özellikler gibi
 * gösterirdi.
 *
 * SAYAÇ SORGUYLA GELİYOR, KOLONDAN DEĞİL. `profiles` üstünde bir
 * `follower_count` yok (0041 gerekçesi): sayaç kolonu, kullanıcının kendi
 * profil satırını güncelleyebildiği bir şemada ayrıca korunması gereken
 * bir alan demekti. Takipçi sayısı yalnızca profil açılırken okunuyor ve
 * indeksli `count(*)` o iş için fazlasıyla hızlı.
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface FollowState {
  following: boolean;
  followers: number;
  followingCount: number;
  /** Oturum yok ya da kendi profilin — düğme gösterilmiyor. */
  canFollow: boolean;
  busy: boolean;
  error: string | null;
  toggle: () => Promise<void>;
}

/**
 * Takip durumu ve sayaçlar.
 *
 * İYİMSER GÜNCELLEME. Takip tek bitlik bir durum: yanlış giderse geri
 * almak bir tıklama ve arada sayı bir saniye şişik kalıyor. Yorumda
 * (bkz. `engagement.ts`) iyimserlik yapılmıyor çünkü orada kaybolan şey
 * metin; burada kaybolan şey bir bit.
 */
export function useFollow(targetUserId: string | undefined): FollowState {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFollow = Boolean(
    user && targetUserId && user.id !== targetUserId && isSupabaseConfigured
  );

  useEffect(() => {
    if (!targetUserId || !isSupabaseConfigured) {
      setFollowers(0);
      setFollowingCount(0);
      setFollowing(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .rpc('follow_counts', { target_user: targetUserId })
          .maybeSingle();
        if (!active) return;
        const row = data as { followers: number; following: number } | null;
        setFollowers(row?.followers ?? 0);
        setFollowingCount(row?.following ?? 0);
      } catch {
        /* Sayaç okunamadıysa sıfır kalıyor; düğme yine çalışıyor. */
      }
    })();

    return () => {
      active = false;
    };
  }, [targetUserId]);

  useEffect(() => {
    if (!user || !targetUserId || !isSupabaseConfigured) {
      setFollowing(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('followee_id', targetUserId)
          .maybeSingle();
        if (active) setFollowing(Boolean(data));
      } catch {
        if (active) setFollowing(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, targetUserId]);

  const toggle = useCallback(async () => {
    if (!user || !targetUserId) return;

    const next = !following;
    setFollowing(next);
    setFollowers((n) => Math.max(0, n + (next ? 1 : -1)));
    setBusy(true);
    setError(null);

    try {
      const supabase = await client();
      const { error: writeError } = next
        ? await supabase
            .from('follows')
            .upsert(
              { follower_id: user.id, followee_id: targetUserId },
              { onConflict: 'follower_id,followee_id' }
            )
        : await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('followee_id', targetUserId);

      if (writeError) throw new Error(writeError.message);
    } catch (e) {
      setFollowing(!next);
      setFollowers((n) => Math.max(0, n + (next ? -1 : 1)));
      /*
       * RLS reddi burada görünüyor: engellenmiş birini takip etmeye
       * çalışmak `with check` ihlali veriyor. Ham mesaj yerine ne
       * olduğunu söyleyen bir cümle veriliyor — ama HANGİ TARAFIN
       * engellediğini söylemiyor (0041'in gizlilik kararı).
       */
      const raw = e instanceof Error ? e.message : '';
      setError(
        /row-level security|violates row-level/i.test(raw)
          ? 'Bu kullanıcıyı takip edemezsiniz.'
          : raw || 'Takip kaydedilemedi'
      );
    } finally {
      setBusy(false);
    }
  }, [user, targetUserId, following]);

  return {
    following,
    followers,
    followingCount,
    canFollow,
    busy,
    error,
    toggle,
  };
}

export interface BlockedUser {
  id: string;
  username: string | null;
  displayName: string | null;
  createdAt: string;
}

export interface BlockListState {
  items: BlockedUser[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Engellediğim kullanıcılar.
 *
 * TEK YÖNLÜ LİSTE. "Beni kim engelledi" diye bir sorgu YOK ve olmayacak:
 * RLS yalnızca `blocker_id = auth.uid()` satırlarını veriyor. Engellenen
 * kişinin engellendiğini öğrenmesi, sessiz bir uzaklaşmayı karşılaşmaya
 * çevirirdi.
 */
export function useBlockList(): BlockListState {
  const { user } = useAuth();
  const [items, setItems] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setItems([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const supabase = await client();
        const { data, error: readError } = await supabase
          .from('user_blocks')
          .select('blocked_id, created_at')
          .order('created_at', { ascending: false });
        if (readError) throw new Error(readError.message);
        if (!active) return;

        const rows = (data as { blocked_id: string; created_at: string }[] | null) ?? [];
        if (rows.length === 0) {
          setItems([]);
          return;
        }

        /*
         * PROFİL AYRI SORGUDA — gömülü `select` ile getirilemiyor.
         * `user_blocks.blocked_id` yabancı anahtarı `auth.users`a bakıyor,
         * `public.profiles`a değil; PostgREST gömülü ilişkiyi ancak
         * doğrudan bir yabancı anahtar varsa kurabiliyor. Profil satırını
         * `profiles.id` üstünden ikinci bir sorguyla almak, engelleme
         * tablosuna sırf birleştirme uğruna ikinci bir yabancı anahtar
         * eklemekten temiz.
         */
        const { data: people } = await supabase
          .from('profiles')
          .select('id, username, display_name')
          .in('id', rows.map((row) => row.blocked_id));
        if (!active) return;

        type PersonRow = { id: string; username: string | null; display_name: string | null };
        const byId = new Map(
          ((people as PersonRow[] | null) ?? []).map((p) => [p.id, p])
        );

        setItems(
          rows.map((row) => ({
            id: row.blocked_id,
            username: byId.get(row.blocked_id)?.username ?? null,
            displayName: byId.get(row.blocked_id)?.display_name ?? null,
            createdAt: row.created_at,
          }))
        );
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Engel listesi okunamadı');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, tick]);

  return { items, loading, error, refresh };
}

/** Kullanıcıyı engeller. Sunucu tarafı takibi iki yönde de koparıyor. */
export async function blockUser(targetUserId: string): Promise<void> {
  const supabase = await client();
  const { data: session } = await supabase.auth.getUser();
  const me = session.user?.id;
  if (!me) throw new Error('Giriş yapmalısınız.');

  const { error } = await supabase
    .from('user_blocks')
    .upsert(
      { blocker_id: me, blocked_id: targetUserId },
      { onConflict: 'blocker_id,blocked_id' }
    );
  if (error) throw new Error(error.message);
}

/** Engeli kaldırır. Takip kendiliğinden geri gelmiyor — yeniden kurulmalı. */
export async function unblockUser(targetUserId: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocked_id', targetUserId);
  if (error) throw new Error(error.message);
}

/**
 * Bu kullanıcıyı engelledim mi.
 *
 * Yalnızca KENDİ engelimi soruyor. Karşı tarafın beni engelleyip
 * engellemediği okunamıyor (RLS) ve okunmamalı; o durumda arayüz
 * "mesaj gönderilemedi" cümlesini sunucudan öğreniyor.
 */
export function useIsBlocked(targetUserId: string | undefined): {
  blocked: boolean;
  loading: boolean;
  refresh: () => void;
} {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!user || !targetUserId || !isSupabaseConfigured) {
      setBlocked(false);
      return;
    }

    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('user_blocks')
          .select('blocked_id')
          .eq('blocked_id', targetUserId)
          .maybeSingle();
        if (active) setBlocked(Boolean(data));
      } catch {
        if (active) setBlocked(false);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, targetUserId, tick]);

  return { blocked, loading, refresh };
}

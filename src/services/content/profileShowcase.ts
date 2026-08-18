import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';

/**
 * PUBLIC PROFİL VİTRİNİ — kullanıcının başkalarına görünen üretimi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BU MODÜL VAR
 *
 * Profil sayfası yalnızca FOTOĞRAF gösteriyordu ve o fotoğrafları da
 * kullanıcı satırından değil, fotoğraf kataloğunu kullanıcı adına göre
 * süzerek buluyordu. Yani bir kullanıcının sitedeki üretiminin geri
 * kalanı — ekipmanı, ilanları, forum konuları, gönderdiği yazılar —
 * profilinde hiç görünmüyordu.
 *
 * Sonuç ölçülebilirdi: forumda dört konu, üç ilan ve bir kayıtlı ekipman
 * vardı; hiçbiri sahiplerinin profilinden bulunamıyordu. Profil, sitenin
 * en çok ziyaret edilen kişisel sayfası olması gerekirken bir fotoğraf
 * ızgarasıydı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SÜZME NEREDE YAPILIYOR
 *
 * HİÇBİRİNDE İSTEMCİDE DEĞİL. Dört sorgunun dördü de RLS'in görünürlük
 * kuralına güveniyor:
 *
 *   user_setups     — `profilde` ya da `herkese-acik` olanlar (0133)
 *   listings        — `app.icerik_gorunur` geçen durumlar
 *   content_entries — aynı
 *   forum_threads   — herkese açık, silinmişler sorguda eleniyor
 *
 * İstemcide süzseydik, taslak bir ilan ağdan İNMİŞ ama çizilmemiş
 * olurdu: gizlilik, çizilmemekle değil, gelmemekle sağlanır.
 */

/** Ortak sorgu kabuğu — beş kanca için tek yükleme/hata iskeleti. */
function useOwnerQuery<T>(
  userId: string | undefined,
  run: (supabase: SupabaseClient, owner: string) => Promise<T[]>
): { items: T[]; loading: boolean; error: string | null } {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      setItems([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void (async () => {
      try {
        const supabase = await getSupabase();
        if (!supabase) return;
        const rows = await run(supabase, userId);
        if (!active) return;
        setItems(rows);
        setError(null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Okunamadı');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    /* `run` bilerek bağımlılık DEĞİL: çağıranlar onu satır içi veriyor ve
       her render'da yeni bir fonksiyon oluyor — bağımlılığa koysaydık
       sorgu sonsuz döngüye girerdi. Sorguyu belirleyen tek şey `userId`. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { items, loading, error };
}

/* ── Ekipmanlar ─────────────────────────────────────────────────────── */

export interface ShowcaseSetup {
  id: string;
  name: string;
  purpose: string | null;
  description: string | null;
  /** Yuva → model slug. Katalog adları çizim tarafında çözülüyor. */
  slots: Record<string, string>;
}

export function usePublicSetups(userId: string | undefined) {
  return useOwnerQuery<ShowcaseSetup>(userId, async (supabase, owner) => {
    const { data, error } = await supabase
      .from('user_setups')
      .select('id, name, purpose, description, slots, visibility, updated_at')
      .eq('user_id', owner)
      /*
       * GÖRÜNÜRLÜK SORGUDA DA YAZILI, RLS'te DE.
       *
       * Bu bir güvenlik kontrolü değil — RLS zaten `ozel` satırı
       * göndermiyor. Ama sayfanın SAHİBİ kendi profiline baktığında RLS
       * ona kendi özel kayıtlarını da verir; süzgeç olmasaydı kendi
       * profilinde başkalarının göremediği ekipmanı görür ve "profilim
       * böyle görünüyor" diye yanlış bir izlenim edinirdi.
       */
      .in('visibility', ['profilde', 'herkese-acik'])
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ''),
      purpose: (row.purpose as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      slots: (row.slots as Record<string, string>) ?? {},
    }));
  });
}

/* ── İlanlar ────────────────────────────────────────────────────────── */

export interface ShowcaseListing {
  slug: string;
  title: string;
  price: number | null;
  currency: string | null;
  status: string;
  city: string | null;
}

export function usePublicListings(userId: string | undefined) {
  return useOwnerQuery<ShowcaseListing>(userId, async (supabase, owner) => {
    const { data, error } = await supabase
      .from('listings')
      .select('slug, title, price, currency, status, city, posted_at')
      .eq('seller_id', owner)
      .is('deleted_at', null)
      .order('posted_at', { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      slug: String(row.slug),
      title: String(row.title ?? ''),
      price: (row.price as number | null) ?? null,
      currency: (row.currency as string | null) ?? null,
      status: String(row.status ?? ''),
      city: (row.city as string | null) ?? null,
    }));
  });
}

/* ── Forum konuları ─────────────────────────────────────────────────── */

export interface ShowcaseThread {
  slug: string;
  title: string;
  replyCount: number;
  lastActivityAt: string | null;
}

export function usePublicThreads(userId: string | undefined) {
  return useOwnerQuery<ShowcaseThread>(userId, async (supabase, owner) => {
    const { data, error } = await supabase
      .from('forum_threads')
      .select('slug, title, reply_count, last_activity_at, deleted_at')
      .eq('author_id', owner)
      /* Silinmiş konu politikada elenmiyor (`forum_threads_read` herkese
         açık); süzgeç burada olmalı. */
      .is('deleted_at', null)
      .order('last_activity_at', { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      slug: String(row.slug),
      title: String(row.title ?? ''),
      replyCount: Number(row.reply_count ?? 0),
      lastActivityAt: (row.last_activity_at as string | null) ?? null,
    }));
  });
}

/* ── Yazılar ve haberler ────────────────────────────────────────────── */

export interface ShowcaseEntry {
  slug: string;
  title: string;
  kind: string;
  publishedAt: string | null;
}

export function usePublicEntries(userId: string | undefined) {
  return useOwnerQuery<ShowcaseEntry>(userId, async (supabase, owner) => {
    const { data, error } = await supabase
      .from('content_entries')
      .select('slug, title, kind, status, published_at')
      .eq('submitted_by', owner)
      /*
       * Yalnızca YAYINDA olanlar. RLS sahibine taslaklarını da veriyor
       * ve `usePublicSetups`taki gerekçe burada da geçerli: kullanıcı
       * kendi profilinde, ziyaretçinin göremediği bir taslağı görüp
       * yayında sanmamalı.
       */
      .eq('status', 'yayinda')
      .order('published_at', { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      slug: String(row.slug),
      title: String(row.title ?? ''),
      kind: String(row.kind ?? ''),
      publishedAt: (row.published_at as string | null) ?? null,
    }));
  });
}

/* ── Takipçi ve takip edilen listeleri ──────────────────────────────── */

export interface ShowcasePerson {
  userId: string;
  username: string;
  displayName: string | null;
  avatarPath: string | null;
  city: string | null;
}

export type FollowListKind = 'takipci' | 'takip';

/**
 * Takipçi ya da takip edilen listesi.
 *
 * Sayaçlar `follow_counts` RPC'siyle zaten geliyordu ama LİSTEYİ hiçbir
 * yer okumuyordu: kullanıcı "12 takipçi" görüyor, kimler olduğunu
 * öğrenemiyordu. `follows` tablosu herkese açık okunabilir, bu yüzden
 * ayrı bir RPC'ye gerek yok.
 */
export function useFollowList(
  userId: string | undefined,
  kind: FollowListKind
) {
  const [items, setItems] = useState<ShowcasePerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      setItems([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void (async () => {
      try {
        const supabase = await getSupabase();
        if (!supabase) return;

        /* Takipçi = beni takip edenler (followee_id = ben).
           Takip     = benim takip ettiklerim (follower_id = ben). */
        const kendi = kind === 'takipci' ? 'followee_id' : 'follower_id';
        const karsi = kind === 'takipci' ? 'follower_id' : 'followee_id';

        const { data, error: queryError } = await supabase
          .from('follows')
          /* Sütun listesi SABİT: değişken bir `select` dizesi
             PostgREST tip çıkarımını düşürüyor ve satırlar `unknown`
             olarak geliyor. İki sütunu da çekip aşağıda seçmek daha
             ucuz ve tipli. */
          .select('follower_id, followee_id, created_at')
          .eq(kendi, userId)
          .order('created_at', { ascending: false })
          .limit(200);
        if (queryError) throw new Error(queryError.message);

        const ids = [
          ...new Set(
            ((data ?? []) as Record<string, unknown>[])
              .map((row) => row[karsi])
              .filter((v): v is string => typeof v === 'string')
          ),
        ];
        if (ids.length === 0) {
          if (active) setItems([]);
          return;
        }

        /*
         * Profiller AYRI SORGUDA. `follows` ile `profiles` arasında
         * PostgREST'in gömme yapabileceği bir yabancı anahtar ilişkisi
         * iki yönlü olduğu için (`follower_id` ve `followee_id` ikisi de
         * `profiles`e bakıyor) gömme ifadesi belirsiz kalıyor ve hangi
         * tarafın çekileceğini seçemiyor. İki sorgu, belirsiz bir tek
         * sorgudan iyi.
         */
        const { data: people, error: peopleError } = await supabase
          .from('profiles')
          .select('id, username, display_name, display_name_visible, avatar_path, city')
          .in('id', ids);
        if (peopleError) throw new Error(peopleError.message);
        if (!active) return;

        setItems(
          ((people ?? []) as Record<string, unknown>[]).map((row) => ({
            userId: String(row.id),
            username: String(row.username ?? ''),
            /* Gerçek adı gizlemiş kullanıcının adı listede de gizli. */
            displayName:
              row.display_name_visible === false
                ? null
                : ((row.display_name as string | null) ?? null),
            avatarPath: (row.avatar_path as string | null) ?? null,
            city: (row.city as string | null) ?? null,
          }))
        );
        setError(null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Liste okunamadı');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, kind]);

  return { items, loading, error };
}

import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * TV — video arşivi, seriler ve yayın takibi (§11.1).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * KANAL BAĞLI DEĞİLKEN BOŞ DÖNÜYOR, YER TUTUCU DÖNMÜYOR
 *
 * §11.2'nin son maddesi: "kanal bağlantısı yokken sahte içerik
 * göstermeme". Bu dosya o kuralın veri tarafı — bağlantı yoksa
 * `tv_videos` boş ve boş dönüyor. Örnek video, "yakında" satırı ya da
 * yer tutucu kayıt üretilmiyor.
 *
 * Arayüz de bunu boş olarak gösteriyor ve sebebini yazıyor. Dolu
 * görünüp tıklanınca hiçbir şey olmayan bir arşiv, boş bir arşivden
 * kötüdür.
 * ═══════════════════════════════════════════════════════════════════════
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface TvVideo {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  publishedAt: string | null;
  category: string | null;
  tags: string[];
  featured: boolean;
}

/* Transkript LİSTEDE istenmiyor: bir videoda megabaytlarca metin
   olabiliyor ve arşiv sayfası onlarcasını birden indirirdi. */
const VIDEO_COLUMNS =
  'id, youtube_id, title, description, thumbnail_url, duration_sec, published_at, category, tags, featured';

function toVideo(row: Record<string, unknown>): TvVideo {
  return {
    id: row.id as string,
    youtubeId: row.youtube_id as string,
    title: row.title as string,
    description: (row.description as string) ?? '',
    thumbnailUrl: (row.thumbnail_url as string | null) ?? null,
    durationSec: (row.duration_sec as number | null) ?? null,
    publishedAt: (row.published_at as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    tags: (row.tags as string[]) ?? [],
    featured: row.featured === true,
  };
}

/** Yayımlanmış video arşivi. */
export function useTvVideos(): { videos: TvVideo[]; loading: boolean } {
  const [videos, setVideos] = useState<TvVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('tv_videos')
          .select(VIDEO_COLUMNS)
          .eq('published', true)
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(60);

        if (!active) return;
        setVideos(((data ?? []) as Record<string, unknown>[]).map(toVideo));
      } catch {
        if (active) setVideos([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { videos, loading };
}

export interface TvPlaylist {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
}

export function useTvPlaylists(): {
  playlists: TvPlaylist[];
  loading: boolean;
} {
  const [playlists, setPlaylists] = useState<TvPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('tv_playlists')
          .select('id, slug, title, description, cover_url')
          .eq('published', true)
          .order('title');

        if (!active) return;
        setPlaylists(
          ((data ?? []) as Record<string, unknown>[]).map((r) => ({
            id: r.id as string,
            slug: r.slug as string,
            title: r.title as string,
            description: (r.description as string) ?? '',
            coverUrl: (r.cover_url as string | null) ?? null,
          }))
        );
      } catch {
        if (active) setPlaylists([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { playlists, loading };
}

/**
 * Tek seri ve videoları.
 *
 * SIRA `position`DAN GELİYOR, yayın tarihinden değil. Bir seri
 * kronolojik olmayabilir — "başlangıç rehberi" serisinde ilk video en
 * eski değil, en temel olandır. Editörün koyduğu sıra korunuyor.
 */
export function useTvPlaylist(slug: string | undefined): {
  playlist: TvPlaylist | null;
  videos: TvVideo[];
  loading: boolean;
  notFound: boolean;
} {
  const [playlist, setPlaylist] = useState<TvPlaylist | null>(null);
  const [videos, setVideos] = useState<TvVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug || !isSupabaseConfigured) {
      setLoading(false);
      setNotFound(Boolean(slug));
      return;
    }

    let active = true;
    setLoading(true);
    setNotFound(false);

    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('tv_playlists')
          .select('id, slug, title, description, cover_url')
          .eq('slug', slug)
          .eq('published', true)
          .maybeSingle();

        if (!active) return;
        if (!data) {
          setNotFound(true);
          return;
        }

        const row = data as Record<string, unknown>;
        setPlaylist({
          id: row.id as string,
          slug: row.slug as string,
          title: row.title as string,
          description: (row.description as string) ?? '',
          coverUrl: (row.cover_url as string | null) ?? null,
        });

        const { data: ogeler } = await supabase
          .from('tv_playlist_items')
          .select(`position, tv_videos(${VIDEO_COLUMNS})`)
          .eq('playlist_id', row.id as string)
          .order('position');

        if (!active) return;
        setVideos(
          ((ogeler ?? []) as Record<string, unknown>[])
            .map((o) => o.tv_videos as Record<string, unknown> | null)
            .filter((v): v is Record<string, unknown> => Boolean(v))
            .map(toVideo)
        );
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  return { playlist, videos, loading, notFound };
}

export interface TvFollowState {
  following: boolean;
  notify: boolean;
  usable: boolean;
  busy: boolean;
  toggle: () => Promise<void>;
  setNotify: (value: boolean) => Promise<void>;
}

/**
 * Yayın takibi (§11.1 "yayını takip etme", "hatırlatma", "canlı yayın
 * bildirimi").
 *
 * Radyodaki `useProgramFollow` ile aynı şekil ve aynı gerekçe: üçü tek
 * satır, `notify` ayrı bayrak. "Listemde dursun ama beni uyandırma"
 * geçerli bir tercih.
 */
export function useTvFollow(broadcastId: string | undefined): TvFollowState {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [notify, setNotifyState] = useState(true);
  const [busy, setBusy] = useState(false);

  const usable = Boolean(broadcastId && user && isSupabaseConfigured);

  useEffect(() => {
    if (!usable || !broadcastId || !user) {
      setFollowing(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('tv_follows')
          .select('notify')
          .eq('broadcast_id', broadcastId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!active) return;
        setFollowing(Boolean(data));
        setNotifyState((data as { notify: boolean } | null)?.notify ?? true);
      } catch {
        if (active) setFollowing(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [usable, broadcastId, user]);

  const toggle = useCallback(async () => {
    if (!broadcastId || !user) return;
    setBusy(true);
    try {
      const supabase = await client();
      if (following) {
        await supabase
          .from('tv_follows')
          .delete()
          .eq('broadcast_id', broadcastId)
          .eq('user_id', user.id);
        setFollowing(false);
      } else {
        await supabase
          .from('tv_follows')
          .insert({ user_id: user.id, broadcast_id: broadcastId, notify: true });
        setFollowing(true);
        setNotifyState(true);
      }
    } finally {
      setBusy(false);
    }
  }, [broadcastId, user, following]);

  const setNotify = useCallback(
    async (value: boolean) => {
      if (!broadcastId || !user) return;
      setBusy(true);
      try {
        const supabase = await client();
        await supabase
          .from('tv_follows')
          .update({ notify: value })
          .eq('broadcast_id', broadcastId)
          .eq('user_id', user.id);
        setNotifyState(value);
      } finally {
        setBusy(false);
      }
    },
    [broadcastId, user]
  );

  return { following, notify, usable, busy, toggle, setNotify };
}

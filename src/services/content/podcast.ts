import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * PODCAST ARŞİVİ (§10.4).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * DİNLEME GEÇMİŞİ OKUNMUYOR ÇÜNKÜ YAZILMIYOR
 *
 * Şema (0053) kişi başına bölüm başına TEK ilerleme satırı tutuyor ve
 * üzerine yazıyor. Bu dosya da öyle davranıyor: "kaldığın yer" bir
 * imleç, bir günlük değil. "Geçen ay hangi bölümleri dinledin"
 * sorusunun cevabı hiçbir yerde yok ve olmamalı.
 *
 * Analitik tek sayaç (`count_episode_play`) ve kimin oynattığı
 * yazılmıyor — 0051'de dinleyici SAYISI tutup LİSTESİ tutmama
 * kararının aynısı.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * TRANSKRİPT LİSTEDE İSTENMİYOR
 *
 * `transcript` kolonu bir bölümde megabaytlarca metin olabiliyor.
 * Liste sorguları kolonlarını AÇIKÇA sayıyor ve transkripti dışarıda
 * bırakıyor; yalnızca bölüm detayı istiyor. `select *` yazsaydık bir
 * arşiv sayfası onlarca transkripti birden indirirdi.
 * ═══════════════════════════════════════════════════════════════════════
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface Podcast {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  coverUrl: string | null;
  category: string | null;
  tags: string[];
  author: string | null;
}

export interface EpisodeSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  season: number | null;
  episodeNo: number | null;
  durationSec: number | null;
  publishAt: string | null;
  playCount: number;
}

export interface EpisodeMarker {
  saniye: number;
  baslik: string;
}

export interface EpisodeGuest {
  id: string;
  name: string;
  role: string | null;
  url: string | null;
  hostSlug: string | null;
}

export interface EpisodeDetail extends EpisodeSummary {
  description: string;
  audioUrl: string | null;
  allowDownload: boolean;
  markers: EpisodeMarker[];
  transcript: string | null;
  podcast: { slug: string; title: string };
  guests: EpisodeGuest[];
}

const EPISODE_COLUMNS =
  'id, slug, title, summary, cover_url, season, episode_no, duration_sec, publish_at, play_count';

function toEpisodeSummary(row: Record<string, unknown>): EpisodeSummary {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    summary: (row.summary as string) ?? '',
    coverUrl: (row.cover_url as string | null) ?? null,
    season: (row.season as number | null) ?? null,
    episodeNo: (row.episode_no as number | null) ?? null,
    durationSec: (row.duration_sec as number | null) ?? null,
    publishAt: (row.publish_at as string | null) ?? null,
    playCount: (row.play_count as number) ?? 0,
  };
}

/** Yayımlanmış podcast serileri. */
export function usePodcasts(): { podcasts: Podcast[]; loading: boolean } {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
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
          .from('podcasts')
          .select(
            'id, slug, title, summary, description, cover_url, category, tags, author'
          )
          .eq('status', 'published')
          .order('title');

        if (!active) return;
        setPodcasts(
          ((data ?? []) as Record<string, unknown>[]).map((row) => ({
            id: row.id as string,
            slug: row.slug as string,
            title: row.title as string,
            summary: (row.summary as string) ?? '',
            description: (row.description as string) ?? '',
            coverUrl: (row.cover_url as string | null) ?? null,
            category: (row.category as string | null) ?? null,
            tags: (row.tags as string[]) ?? [],
            author: (row.author as string | null) ?? null,
          }))
        );
      } catch {
        if (active) setPodcasts([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { podcasts, loading };
}

/**
 * Tek seri ve bölümleri.
 *
 * ZAMANLANMIŞ BÖLÜM HİÇ GELMİYOR ve bu filtre burada YAZILI DEĞİL:
 * kural RLS'te (0053) — `publish_at <= now()` politikanın içinde.
 * İstemciye filtre yazmak, kuralı iki yere koymak ve birini
 * unutulabilir kılmak olurdu. Buradaki sıralama sadece sıralama.
 */
export function usePodcast(slug: string | undefined): {
  podcast: Podcast | null;
  episodes: EpisodeSummary[];
  loading: boolean;
  notFound: boolean;
} {
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
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
          .from('podcasts')
          .select(
            'id, slug, title, summary, description, cover_url, category, tags, author'
          )
          .eq('slug', slug)
          .eq('status', 'published')
          .maybeSingle();

        if (!active) return;
        if (!data) {
          setPodcast(null);
          setNotFound(true);
          return;
        }

        const row = data as Record<string, unknown>;
        setPodcast({
          id: row.id as string,
          slug: row.slug as string,
          title: row.title as string,
          summary: (row.summary as string) ?? '',
          description: (row.description as string) ?? '',
          coverUrl: (row.cover_url as string | null) ?? null,
          category: (row.category as string | null) ?? null,
          tags: (row.tags as string[]) ?? [],
          author: (row.author as string | null) ?? null,
        });

        const { data: bolumler } = await supabase
          .from('podcast_episodes')
          .select(EPISODE_COLUMNS)
          .eq('podcast_id', row.id as string)
          .order('publish_at', { ascending: false });

        if (!active) return;
        setEpisodes(
          ((bolumler ?? []) as Record<string, unknown>[]).map(toEpisodeSummary)
        );
      } catch {
        if (active) {
          setPodcast(null);
          setNotFound(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  return { podcast, episodes, loading, notFound };
}

/** Tek bölüm — transkript ve marker'lar dahil. */
export function useEpisode(
  podcastSlug: string | undefined,
  episodeSlug: string | undefined
): { episode: EpisodeDetail | null; loading: boolean; notFound: boolean } {
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!podcastSlug || !episodeSlug || !isSupabaseConfigured) {
      setLoading(false);
      setNotFound(Boolean(podcastSlug && episodeSlug));
      return;
    }

    let active = true;
    setLoading(true);
    setNotFound(false);

    void (async () => {
      try {
        const supabase = await client();

        const { data: seri } = await supabase
          .from('podcasts')
          .select('id, slug, title')
          .eq('slug', podcastSlug)
          .eq('status', 'published')
          .maybeSingle();

        if (!active) return;
        if (!seri) {
          setNotFound(true);
          return;
        }

        const seriRow = seri as Record<string, unknown>;
        const { data } = await supabase
          .from('podcast_episodes')
          .select(
            `${EPISODE_COLUMNS}, description, audio_url, allow_download, markers, transcript`
          )
          .eq('podcast_id', seriRow.id as string)
          .eq('slug', episodeSlug)
          .maybeSingle();

        if (!active) return;
        if (!data) {
          setNotFound(true);
          return;
        }

        const row = data as Record<string, unknown>;
        const { data: konuklar } = await supabase
          .from('episode_guests')
          .select('id, name, role, url, broadcast_hosts(slug)')
          .eq('episode_id', row.id as string)
          .order('position');

        if (!active) return;

        setEpisode({
          ...toEpisodeSummary(row),
          description: (row.description as string) ?? '',
          audioUrl: (row.audio_url as string | null) ?? null,
          allowDownload: row.allow_download === true,
          markers: Array.isArray(row.markers)
            ? (row.markers as EpisodeMarker[]).filter(
                (m) => typeof m?.saniye === 'number' && typeof m?.baslik === 'string'
              )
            : [],
          transcript: (row.transcript as string | null) ?? null,
          podcast: { slug: seriRow.slug as string, title: seriRow.title as string },
          guests: ((konuklar ?? []) as Record<string, unknown>[]).map((g) => ({
            id: g.id as string,
            name: g.name as string,
            role: (g.role as string | null) ?? null,
            url: (g.url as string | null) ?? null,
            hostSlug:
              ((g.broadcast_hosts as Record<string, unknown> | null)?.slug as
                | string
                | undefined) ?? null,
          })),
        });
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [podcastSlug, episodeSlug]);

  return { episode, loading, notFound };
}

/**
 * DİNLEME İLERLEMESİ — imleç, günlük değil.
 *
 * YAZMA KISILIYOR. `timeupdate` olayı saniyede dört kez tetikleniyor;
 * her birinde veritabanına yazmak, bir saatlik bölümde on dört bin
 * yazma demekti. On beş saniyede bir yazılıyor ve satır ÜZERİNE
 * yazılıyor — yeni satır eklenmiyor, yoksa imleç bir günlüğe dönüşürdü.
 *
 * OTURUM YOKSA HİÇ YAZILMIYOR ve bu bir eksiklik değil: kaldığı yeri
 * hatırlamak hesaba bağlı bir özellik, anonim dinleyici için yerel
 * depoya yazmak da onun cihazında bir dinleme kaydı bırakmak olurdu.
 */
export function useEpisodeProgress(episodeId: string | undefined): {
  position: number;
  save: (seconds: number, completed?: boolean) => void;
  loading: boolean;
} {
  const { user } = useAuth();
  const [position, setPosition] = useState(0);
  const [loading, setLoading] = useState(true);
  const sonYazma = useRef(0);

  const usable = Boolean(episodeId && user && isSupabaseConfigured);

  useEffect(() => {
    if (!usable || !episodeId || !user) {
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('episode_progress')
          .select('position_sec')
          .eq('episode_id', episodeId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!active) return;
        setPosition((data as { position_sec: number } | null)?.position_sec ?? 0);
      } catch {
        if (active) setPosition(0);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [usable, episodeId, user]);

  const save = useCallback(
    (seconds: number, completed = false) => {
      if (!usable || !episodeId || !user) return;

      const simdi = Date.now();
      /* Tamamlandı işareti kısıtlamayı atlıyor: o tek seferlik bir olay
         ve kaçırılırsa kullanıcı bölümü bitirdiği hâlde yarım görürdü. */
      if (!completed && simdi - sonYazma.current < 15_000) return;
      sonYazma.current = simdi;

      void (async () => {
        try {
          const supabase = await client();
          await supabase.from('episode_progress').upsert(
            {
              user_id: user.id,
              episode_id: episodeId,
              position_sec: Math.floor(seconds),
              completed_at: completed ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,episode_id' }
          );
        } catch {
          /* İlerleme kaydedilemediyse sessiz: dinleme sürüyor ve
             kullanıcıya "kaldığın yer kaydedilemedi" demek, yapabileceği
             bir şey olmayan bir uyarı olurdu. */
        }
      })();
    },
    [usable, episodeId, user]
  );

  return { position, save, loading };
}

/** Oynatma sayacı — kimin oynattığı yazılmıyor (0053). */
export async function countPlay(episodeId: string): Promise<void> {
  try {
    const supabase = await client();
    await supabase.rpc('count_episode_play', { target: episodeId });
  } catch {
    /* Sayaç artmadıysa dinleme etkilenmiyor. */
  }
}

import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import type { ProgramSlot } from '@/features/radio/schedule';

/**
 * CANLI İSTASYON, PROGRAM VE TAKİP (§10.2).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * NEDEN `radio.ts`TEN AYRI
 *
 * `radio.ts` mp3 KASASINI okuyor: siteye yüklenmiş dosyalar, sunucu
 * gerektirmeden çalıyor, bugün çalışıyor. Bu dosya CANLI YAYINI okuyor:
 * dış bir yayın sunucusuna bağlı, bugün kurulu değil (§10.1
 * IMPLEMENTED_BLOCKED_EXTERNAL).
 *
 * İkisi tek dosyada olsaydı, "radyo verisi nereden geliyor" sorusunun
 * cevabı iki farklı hikâyeyi aynı başlık altında anlatırdı — biri
 * sunucusuz çalışan, diğeri sunucu olmadan hiç çalışmayan.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * CANLILIK İKİ AYRI SORU VE İKİSİ DE SORULUYOR
 *
 *   1. Yayın ayakta mı?  → `app.station_is_live` (ÖLÇÜM, 0051)
 *   2. Takvimde ne var?  → `schedule.ts` (KURAL)
 *
 * Birincisi olmadan ikincisi yalan söyler: sunucu düşmüşken takvim yine
 * "Gece Gökyüzü" der. İkincisi olmadan birincisi eksik kalır: yayın
 * ayakta ama ne çaldığı bilinmez.
 *
 * Bu dosya ikisini AYRI alanlarda döndürüyor; birleştirmiyor. Arayüz de
 * ayrı gösteriyor — §10.2'nin sahte "canlı" yasağı ancak böyle
 * korunuyor.
 * ═══════════════════════════════════════════════════════════════════════
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface StreamVariant {
  ad: string;
  url: string;
  bitrate?: number;
}

export interface RadioStation {
  id: string;
  slug: string;
  name: string;
  description: string;
  streamUrl: string | null;
  fallbackUrl: string | null;
  streamVariants: StreamVariant[];
  offlineNote: string | null;
}

export interface StationState {
  station: RadioStation | null;
  /** ÖLÇÜLMÜŞ canlılık. Yoklama yoksa ya da bayatsa `false`. */
  live: boolean;
  loading: boolean;
}

/**
 * Varsayılan istasyon ve ölçülmüş canlılık.
 *
 * İSTASYON YOKSA HATA DEĞİL, "KAPALI". Dış yayın sunucusu henüz kurulmadı
 * ve o hâlde doğru cevap "yayın kapalı" — site radyo olmadan da
 * çalışıyor. Bunu hata olarak göstermek, kullanıcıya düzeltemeyeceği bir
 * şeyi bozukmuş gibi sunmak olurdu.
 */
export function useStation(): StationState {
  const [station, setStation] = useState<RadioStation | null>(null);
  const [live, setLive] = useState(false);
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
          .from('radio_stations')
          .select(
            'id, slug, name, description, stream_url, fallback_url, stream_variants, offline_note'
          )
          .eq('is_default', true)
          .maybeSingle();

        if (!active) return;
        if (!data) {
          setStation(null);
          return;
        }

        const row = data as Record<string, unknown>;
        setStation({
          id: row.id as string,
          slug: row.slug as string,
          name: row.name as string,
          description: (row.description as string) ?? '',
          streamUrl: (row.stream_url as string | null) ?? null,
          fallbackUrl: (row.fallback_url as string | null) ?? null,
          streamVariants: Array.isArray(row.stream_variants)
            ? (row.stream_variants as StreamVariant[])
            : [],
          offlineNote: (row.offline_note as string | null) ?? null,
        });

        /* Canlılık AYRI çağrı: istasyon satırı bir yapılandırma,
           canlılık bir ölçüm. Aynı satırdan okunsaydı yapılandırma
           önbelleğe alındığında ölçüm de bayatlardı — ve bayat bir
           "canlı" tam olarak §10.2'nin yasakladığı şey. */
        const { data: canli } = await supabase.rpc('station_is_live', {
          target: row.id as string,
        });
        if (active) setLive(canli === true);
      } catch {
        /* Okunamadıysa kapalı. "Bilmiyorum" ile "canlı" arasında
           varsayılan asla "canlı" olamaz. */
        if (active) {
          setStation(null);
          setLive(false);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { station, live, loading };
}

export interface ProgramHost {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
}

export interface RadioProgram {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  artworkUrl: string | null;
  category: string | null;
  tags: string[];
  featured: boolean;
  hosts: ProgramHost[];
}

export interface ScheduleState {
  programs: RadioProgram[];
  slots: ProgramSlot[];
  loading: boolean;
  error: string | null;
}

/**
 * Yayımlanmış programlar ve yayın saatleri.
 *
 * ÜÇ SORGU, TEK GÖMÜLÜ SORGU DEĞİL. PostgREST'in gömülü kaynak
 * sözdizimiyle (`radio_programs?select=*,program_slots(*)`) tek çağrıya
 * inebilirdi. İnmedi: gömülü kaynakta hangi tablonun politikasının
 * uygulandığı sözdiziminden okunmuyor ve bu, güvenlik kararını
 * "muhtemelen doğrudur"a bırakmak demek. Üç ayrı sorguda her tablonun
 * kendi politikası açıkça çalışıyor.
 *
 * Üçü paralel — biri diğerini beklemiyor.
 */
export function useSchedule(): ScheduleState {
  const [programs, setPrograms] = useState<RadioProgram[]>([]);
  const [slots, setSlots] = useState<ProgramSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();

        const [programRes, slotRes, hostRes] = await Promise.all([
          supabase
            .from('radio_programs')
            .select(
              'id, slug, title, summary, description, artwork_url, category, tags, featured'
            )
            .eq('published', true)
            .order('featured', { ascending: false })
            .order('title'),
          supabase
            .from('program_slots')
            .select(
              'id, program_id, weekday, local_time, airs_at, duration_min, starts_on, ends_on, is_repeat'
            ),
          supabase
            .from('program_hosts')
            .select('program_id, position, radio_hosts(id, slug, name, avatar_url)')
            .order('position'),
        ]);

        if (!active) return;

        const hostsByProgram = new Map<string, ProgramHost[]>();
        for (const row of (hostRes.data ?? []) as Record<string, unknown>[]) {
          const host = row.radio_hosts as Record<string, unknown> | null;
          if (!host) continue;
          const key = row.program_id as string;
          const list = hostsByProgram.get(key) ?? [];
          list.push({
            id: host.id as string,
            slug: host.slug as string,
            name: host.name as string,
            avatarUrl: (host.avatar_url as string | null) ?? null,
          });
          hostsByProgram.set(key, list);
        }

        setPrograms(
          ((programRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
            id: row.id as string,
            slug: row.slug as string,
            title: row.title as string,
            summary: (row.summary as string) ?? '',
            description: (row.description as string) ?? '',
            artworkUrl: (row.artwork_url as string | null) ?? null,
            category: (row.category as string | null) ?? null,
            tags: (row.tags as string[]) ?? [],
            featured: row.featured === true,
            hosts: hostsByProgram.get(row.id as string) ?? [],
          }))
        );

        setSlots(
          ((slotRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
            id: row.id as string,
            programId: row.program_id as string,
            weekday: (row.weekday as number | null) ?? null,
            localTime: (row.local_time as string | null) ?? null,
            airsAt: (row.airs_at as string | null) ?? null,
            durationMin: (row.duration_min as number) ?? 60,
            startsOn: (row.starts_on as string | null) ?? null,
            endsOn: (row.ends_on as string | null) ?? null,
            isRepeat: row.is_repeat === true,
          }))
        );
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Takvim okunamadı');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { programs, slots, loading, error };
}

export interface ProgramFollowState {
  following: boolean;
  notify: boolean;
  usable: boolean;
  busy: boolean;
  toggle: () => Promise<void>;
  setNotify: (value: boolean) => Promise<void>;
}

/**
 * Program takibi (§10.2 "programı takip etme", "favori programlar",
 * "canlı yayın hatırlatması").
 *
 * ÜÇÜ TEK SATIR. Takip eden kişi favorilemiştir ve yayın başlayınca
 * haber alır. `notify` ayrı bir bayrak çünkü "listemde dursun ama beni
 * uyandırma" geçerli bir tercih: gece yarısı yayını olan bir programı
 * takip etmek, gece yarısı bildirim istemek demek değil.
 */
export function useProgramFollow(
  programId: string | undefined
): ProgramFollowState {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [notify, setNotifyState] = useState(true);
  const [busy, setBusy] = useState(false);

  const usable = Boolean(programId && user && isSupabaseConfigured);

  useEffect(() => {
    if (!usable || !programId || !user) {
      setFollowing(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('program_follows')
          .select('notify')
          .eq('program_id', programId)
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
  }, [usable, programId, user]);

  const toggle = useCallback(async () => {
    if (!programId || !user) return;
    setBusy(true);
    try {
      const supabase = await client();
      if (following) {
        await supabase
          .from('program_follows')
          .delete()
          .eq('program_id', programId)
          .eq('user_id', user.id);
        setFollowing(false);
      } else {
        await supabase
          .from('program_follows')
          .insert({ user_id: user.id, program_id: programId, notify: true });
        setFollowing(true);
        setNotifyState(true);
      }
    } finally {
      setBusy(false);
    }
  }, [programId, user, following]);

  const setNotify = useCallback(
    async (value: boolean) => {
      if (!programId || !user) return;
      setBusy(true);
      try {
        const supabase = await client();
        await supabase
          .from('program_follows')
          .update({ notify: value })
          .eq('program_id', programId)
          .eq('user_id', user.id);
        setNotifyState(value);
      } finally {
        setBusy(false);
      }
    },
    [programId, user]
  );

  return { following, notify, usable, busy, toggle, setNotify };
}

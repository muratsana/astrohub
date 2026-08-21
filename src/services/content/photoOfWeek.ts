import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';

export type PhotoWeekStatus =
  | 'aday_toplama'
  | 'oylama'
  | 'sonuclandi'
  | 'yayinda';

export interface PhotoWeekRound {
  id: string;
  isoYear: number;
  isoWeek: number;
  status: PhotoWeekStatus;
  opensAt: string;
  closesAt: string;
  winnerPhotoId: string | null;
}

interface RoundRow {
  id: string;
  iso_year: number;
  iso_week: number;
  status: PhotoWeekStatus;
  opens_at: string;
  closes_at: string;
  winner_photo_id: string | null;
}

function mapRound(row: RoundRow): PhotoWeekRound {
  return {
    id: row.id,
    isoYear: row.iso_year,
    isoWeek: row.iso_week,
    status: row.status,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    winnerPhotoId: row.winner_photo_id,
  };
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış.');
  return promise;
}

function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (['PGRST200', 'PGRST202', 'PGRST204'].includes(error.code ?? '')) return true;
  return /sync_photo_week_rounds|settle_due_photo_week_rounds|schema cache|could not find/i.test(error.message ?? '');
}

async function syncPhotoWeekRounds(supabase: Awaited<ReturnType<typeof client>>) {
  const { error } = await supabase.rpc('sync_photo_week_rounds');
  if (!error) return;
  if (isMissingRpc(error)) {
    const fallback = await supabase.rpc('settle_due_photo_week_rounds');
    if (fallback.error && !isMissingRpc(fallback.error)) {
      console.warn('Haftanın fotoğrafı otomatik senkronizasyonu çalışmadı:', fallback.error.message);
    }
    return;
  }
  console.warn('Haftanın fotoğrafı otomatik senkronizasyonu çalışmadı:', error.message);
}

export function usePhotoWeekRounds() {
  const [rounds, setRounds] = useState<PhotoWeekRound[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    client()
      .then(async (supabase) => {
        await syncPhotoWeekRounds(supabase);
        return supabase
          .from('photo_of_week_rounds')
          .select('id, iso_year, iso_week, status, opens_at, closes_at, winner_photo_id')
          .order('iso_year', { ascending: false })
          .order('iso_week', { ascending: false })
          .limit(100);
      })
      .then(({ data, error: queryError }) => {
        if (queryError) throw new Error(queryError.message);
        if (active) setRounds(((data ?? []) as RoundRow[]).map(mapRound));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Turlar okunamadı.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [tick]);

  return {
    rounds,
    loading,
    error,
    refresh: useCallback(() => setTick((value) => value + 1), []),
  };
}

export interface PhotoWeekBallot {
  active: boolean;
  round: PhotoWeekRound | null;
  nomineeIds: string[];
  votes: Record<string, { score: number }>;
}

const EMPTY_BALLOT: PhotoWeekBallot = {
  active: false,
  round: null,
  nomineeIds: [],
  votes: {},
};

export function usePhotoWeekBallot(userId: string | undefined) {
  const [ballot, setBallot] = useState<PhotoWeekBallot>(EMPTY_BALLOT);
  const [loading, setLoading] = useState(Boolean(userId && isSupabaseConfigured));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      setBallot(EMPTY_BALLOT);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    client()
      .then(async (supabase) => {
        await syncPhotoWeekRounds(supabase);
        const { data: roundData, error: roundError } = await supabase
          .from('photo_of_week_rounds')
          .select('id, iso_year, iso_week, status, opens_at, closes_at, winner_photo_id')
          .eq('status', 'oylama')
          .order('closes_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (roundError) throw new Error(roundError.message);
        if (!roundData) return EMPTY_BALLOT;
        const round = mapRound(roundData as RoundRow);

        const [nominees, votes] = await Promise.all([
          supabase.from('photo_of_week_nominees').select('photo_id').eq('round_id', round.id),
          supabase.from('photo_of_week_votes').select('photo_id, score').eq('round_id', round.id).eq('juror_id', userId),
        ]);
        if (nominees.error) throw new Error(nominees.error.message);
        if (votes.error) throw new Error(votes.error.message);
        return {
          active: true,
          round,
          nomineeIds: (nominees.data ?? []).map((row) => row.photo_id as string),
          votes: Object.fromEntries((votes.data ?? []).map((row) => [
            row.photo_id as string,
            { score: row.score as number },
          ])),
        };
      })
      .then((value) => { if (active) { setBallot(value); setError(null); } })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Haftanın fotoğrafı oylaması okunamadı.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, tick]);

  return {
    ...ballot,
    loading,
    error,
    refresh: useCallback(() => setTick((value) => value + 1), []),
  };
}

export async function savePhotoWeekVote(input: {
  roundId: string;
  userId: string;
  photoId: string;
  score: number;
}) {
  const supabase = await client();
  const { error } = await supabase.from('photo_of_week_votes').upsert(
    {
      round_id: input.roundId,
      juror_id: input.userId,
      photo_id: input.photoId,
      score: input.score,
      comment: null,
    },
    { onConflict: 'round_id,juror_id,photo_id' }
  );
  if (error) throw new Error(error.message);
}

export interface PublicProfileBadges {
  weekWins: number;
  verifiedOrganizer: boolean;
  clubManager: boolean;
}

export function usePublicProfileBadges(userId: string | undefined) {
  const [badges, setBadges] = useState<PublicProfileBadges | null>(null);
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    let active = true;
    client()
      .then((supabase) => supabase.rpc('profile_public_badges', { target_user: userId }).single())
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        if (!active) return;
        const row = data as {
          week_wins: number;
          verified_organizer: boolean;
          club_manager: boolean;
        };
        setBadges({
          weekWins: Number(row.week_wins),
          verifiedOrganizer: row.verified_organizer,
          clubManager: row.club_manager,
        });
      })
      .catch(() => { if (active) setBadges(null); });
    return () => { active = false; };
  }, [userId]);
  return badges;
}

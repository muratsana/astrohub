import { getSupabase } from '@/services/supabase/client';

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış.');
  return promise;
}

export interface JuryMemberAdmin {
  userId: string;
  username: string;
  displayName: string | null;
  termStart: string;
  termEnd: string | null;
}

export interface PhotoWeekResult {
  photoId: string;
  totalScore: number;
  voteCount: number;
  averageScore: number;
}

export async function fetchJuryMembers(): Promise<JuryMemberAdmin[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('jury_members')
    .select('user_id, term_start, term_end, profiles!jury_members_user_id_fkey(username, display_name)')
    .order('term_start', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { username: string; display_name: string | null } | null;
    return {
      userId: row.user_id as string,
      username: profile?.username ?? 'bilinmiyor',
      displayName: profile?.display_name ?? null,
      termStart: row.term_start as string,
      termEnd: row.term_end as string | null,
    };
  });
}

export async function appointJuror(userId: string, appointedBy: string) {
  const supabase = await client();
  const { error } = await supabase.from('jury_members').insert({
    user_id: userId,
    term_start: new Date().toISOString().slice(0, 10),
    appointed_by: appointedBy,
  });
  if (error) throw new Error(error.message);
}

export async function endJuryTerm(userId: string, termStart: string) {
  const supabase = await client();
  const { error } = await supabase
    .from('jury_members')
    .update({ term_end: new Date().toISOString().slice(0, 10) })
    .eq('user_id', userId)
    .eq('term_start', termStart);
  if (error) throw new Error(error.message);
}

export async function createPhotoWeekRound(input: {
  isoYear: number;
  isoWeek: number;
  opensAt: string;
  closesAt: string;
  createdBy: string;
}) {
  const supabase = await client();
  const { error } = await supabase.from('photo_of_week_rounds').insert({
    iso_year: input.isoYear,
    iso_week: input.isoWeek,
    opens_at: input.opensAt,
    closes_at: input.closesAt,
    created_by: input.createdBy,
  });
  if (error) throw new Error(error.message);
}

export async function setPhotoWeekRoundStatus(roundId: string, status: string) {
  const supabase = await client();
  const { error } = await supabase.from('photo_of_week_rounds').update({ status }).eq('id', roundId);
  if (error) throw new Error(error.message);
}

export async function addPhotoWeekNominee(roundId: string, photoId: string, userId: string) {
  const supabase = await client();
  const { error } = await supabase.from('photo_of_week_nominees').upsert(
    { round_id: roundId, photo_id: photoId, nominated_by: userId },
    { onConflict: 'round_id,photo_id' }
  );
  if (error) throw new Error(error.message);
}

export async function closePhotoWeekRound(roundId: string) {
  const supabase = await client();
  const { error } = await supabase.rpc('close_photo_of_week', { target_round: roundId });
  if (error) throw new Error(error.message);
}

export async function fetchPhotoWeekResults(roundId: string): Promise<PhotoWeekResult[]> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('photo_of_week_results', { target_round: roundId });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { photo_id: string; total_score: number; vote_count: number }[])
    .map((row) => {
      const voteCount = Number(row.vote_count);
      const totalScore = Number(row.total_score);
      return {
        photoId: row.photo_id,
        totalScore,
        voteCount,
        averageScore: voteCount > 0 ? totalScore / voteCount : 0,
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore || b.voteCount - a.voteCount || a.photoId.localeCompare(b.photoId));
}

export async function setEditorsPick(photoId: string, value: boolean) {
  const supabase = await client();
  const { error } = await supabase.from('astro_photos').update({ editors_pick: value }).eq('id', photoId);
  if (error) throw new Error(error.message);
}

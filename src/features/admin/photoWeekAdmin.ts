import { getSupabase } from '@/services/supabase/client';

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış.');
  return promise;
}

export interface PhotoWeekResult {
  photoId: string;
  totalScore: number;
  voteCount: number;
  averageScore: number;
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
  return sortPhotoWeekResults(
    ((data ?? []) as { photo_id: string; total_score: number; vote_count: number }[])
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
  );
}

export function sortPhotoWeekResults(results: PhotoWeekResult[]): PhotoWeekResult[] {
  return [...results].sort(
    (a, b) =>
      b.averageScore - a.averageScore ||
      b.voteCount - a.voteCount ||
      a.photoId.localeCompare(b.photoId)
  );
}

export async function setEditorsPick(photoId: string, value: boolean) {
  const supabase = await client();
  const { error } = await supabase.from('astro_photos').update({ editors_pick: value }).eq('id', photoId);
  if (error) throw new Error(error.message);
}

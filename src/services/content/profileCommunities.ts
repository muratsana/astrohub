import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { sanitizeText } from '@/lib/sanitize';

export type ClubMembershipStatus = 'pending' | 'approved' | 'rejected';

export interface ClubMembership {
  clubSlug: string;
  status: ClubMembershipStatus;
}

interface MembershipRow {
  club_slug: string;
  status: ClubMembershipStatus;
}

export function useMyClubMemberships(userId: string | undefined): {
  memberships: ClubMembership[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void (async () => {
      try {
        const supabase = await getSupabase();
        if (!supabase) return;
        const { data, error: queryError } = await supabase
          .from('club_membership_requests')
          .select('club_slug, status')
          .eq('user_id', userId)
          .order('requested_at', { ascending: false });
        if (queryError) throw new Error(queryError.message);
        if (!active) return;
        setMemberships(
          ((data ?? []) as MembershipRow[]).map((row) => ({
            clubSlug: row.club_slug,
            status: row.status,
          }))
        );
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Topluluk üyelikleri okunamadı');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { memberships, loading, error, refresh };
}

export async function requestClubMembership(
  userId: string,
  clubSlug: string
): Promise<void> {
  const slug = sanitizeText(clubSlug, { maxLength: 120 });
  if (!slug) throw new Error('Topluluk seçin.');

  const supabase = await getSupabase();
  if (!supabase) throw new Error('Veritabanı bağlantısı yapılandırılmamış.');

  const { error } = await supabase.from('club_membership_requests').upsert(
    {
      user_id: userId,
      club_slug: slug,
      status: 'pending',
      requested_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,club_slug' }
  );
  if (error) throw new Error(error.message);
}

export async function leaveClubMembership(
  userId: string,
  clubSlug: string
): Promise<void> {
  const slug = sanitizeText(clubSlug, { maxLength: 120 });
  if (!slug) throw new Error('Topluluk seçin.');

  const supabase = await getSupabase();
  if (!supabase) throw new Error('Veritabanı bağlantısı yapılandırılmamış.');

  const { error } = await supabase
    .from('club_membership_requests')
    .delete()
    .eq('user_id', userId)
    .eq('club_slug', slug);
  if (error) throw new Error(error.message);
}


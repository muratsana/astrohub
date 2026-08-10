import { useCallback, useEffect, useState } from 'react';
import { totalIntegrationSeconds } from '@/domain/photography/integration';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';

interface ExposureRow {
  frames: number | null;
  exposure_seconds: number | string | null;
}

interface PhotoRow {
  id: string;
  title: string;
  slug: string;
  like_count: number | null;
  photo_exposures?: ExposureRow[] | null;
}

export interface MyProfileStats {
  photos: { id: string; title: string; slug: string }[];
  photoCount: number;
  equipmentCount: number;
  listingCount: number;
  likeCount: number;
  integrationSeconds: number;
}

const EMPTY_STATS: MyProfileStats = {
  photos: [],
  photoCount: 0,
  equipmentCount: 0,
  listingCount: 0,
  likeCount: 0,
  integrationSeconds: 0,
};

export function useMyProfileStats(userId: string | undefined): {
  stats: MyProfileStats;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [stats, setStats] = useState<MyProfileStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      setStats(EMPTY_STATS);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void (async () => {
      try {
        const supabase = await getSupabase();
        if (!supabase) return;

        const [photos, equipment, listings] = await Promise.all([
          supabase
            .from('astro_photos')
            .select('id, title, slug, like_count, photo_exposures(frames, exposure_seconds)')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(120),
          supabase
            .from('user_equipment')
            .select('model_id', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase
            .from('listings')
            .select('id', { count: 'exact', head: true })
            .eq('seller_id', userId)
            .is('deleted_at', null),
        ]);

        if (photos.error) throw new Error(photos.error.message);
        if (equipment.error) throw new Error(equipment.error.message);
        if (listings.error) throw new Error(listings.error.message);

        const photoRows = ((photos.data ?? []) as unknown as PhotoRow[]).map(
          (photo) => ({
            ...photo,
            photo_exposures: Array.isArray(photo.photo_exposures)
              ? photo.photo_exposures
              : [],
          })
        );

        if (!active) return;
        setStats({
          photos: photoRows.map((photo) => ({
            id: photo.id,
            title: photo.title,
            slug: photo.slug,
          })),
          photoCount: photoRows.length,
          equipmentCount: equipment.count ?? 0,
          listingCount: listings.count ?? 0,
          likeCount: photoRows.reduce((sum, photo) => sum + (photo.like_count ?? 0), 0),
          integrationSeconds: photoRows.reduce(
            (sum, photo) =>
              sum +
              totalIntegrationSeconds(
                (photo.photo_exposures ?? []).map((exposure) => ({
                  filter: 'L',
                  frames: exposure.frames ?? 0,
                  exposureSeconds: Number(exposure.exposure_seconds ?? 0),
                }))
              ),
            0
          ),
        });
        setError(null);
      } catch (e) {
        if (active) {
          setStats(EMPTY_STATS);
          setError(e instanceof Error ? e.message : 'Profil istatistikleri okunamadı');
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
  return { stats, loading, error, refresh };
}


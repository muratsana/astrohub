import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/features/auth/AuthContext';
import { getSupabase } from '@/services/supabase/client';
import { PUBLIC_LISTING_STATUSES } from './listings';

export type ActivityKind = 'photo' | 'listing' | 'thread';

export interface ActivityActor {
  username: string;
  displayName: string;
}

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  actor: ActivityActor;
  title: string;
  href: string;
  happenedAt: string;
}

export interface ActivityFeedState {
  items: ActivityItem[];
  followingCount: number;
  loading: boolean;
  error: string | null;
  configured: boolean;
  authenticated: boolean;
  refresh: () => void;
}

interface FollowRow {
  followee_id: string;
}

interface ProfileRow {
  username: string;
  display_name: string | null;
}

interface PhotoActivityRow {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  published_at: string | null;
  profiles: ProfileRow | ProfileRow[] | null;
}

interface ListingActivityRow {
  id: string;
  seller_id: string;
  slug: string;
  title: string;
  posted_at: string | null;
  profiles: ProfileRow | ProfileRow[] | null;
}

interface ThreadActivityRow {
  id: string;
  author_id: string;
  slug: string;
  title: string;
  created_at: string;
  profiles: ProfileRow | ProfileRow[] | null;
}

function single<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function actor(profile: ProfileRow | ProfileRow[] | null): ActivityActor {
  const row = single(profile);
  const username = row?.username ?? 'bilinmiyor';
  return {
    username,
    displayName: row?.display_name ?? username,
  };
}

function time(iso: string): number {
  const value = new Date(iso).getTime();
  return Number.isFinite(value) ? value : 0;
}

export function mergeActivityItems(
  groups: ActivityItem[][],
  limit = 40
): ActivityItem[] {
  return groups
    .flat()
    .sort((a, b) => time(b.happenedAt) - time(a.happenedAt))
    .slice(0, limit);
}

async function fetchFolloweeIds(
  client: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await client
    .from('follows')
    .select('followee_id')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return [
    ...new Set(
      ((data as FollowRow[] | null) ?? []).map((row) => row.followee_id)
    ),
  ];
}

async function fetchPhotoActivity(
  client: SupabaseClient,
  followeeIds: string[]
): Promise<ActivityItem[]> {
  const { data, error } = await client
    .from('astro_photos')
    .select(
      'id, user_id, slug, title, published_at, ' +
        'profiles!astro_photos_user_id_profiles_fkey(username, display_name)'
    )
    .in('user_id', followeeIds)
    .eq('status', 'yayinda')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(30);

  if (error) throw new Error(error.message);
  return ((data as unknown as PhotoActivityRow[] | null) ?? [])
    .filter((row) => row.published_at)
    .map((row) => ({
      id: `photo:${row.id}`,
      kind: 'photo',
      actor: actor(row.profiles),
      title: row.title,
      href: `/fotograf/${row.slug}`,
      happenedAt: row.published_at as string,
    }));
}

async function fetchListingActivity(
  client: SupabaseClient,
  followeeIds: string[]
): Promise<ActivityItem[]> {
  const { data, error } = await client
    .from('listings')
    .select(
      'id, seller_id, slug, title, posted_at, ' +
        'profiles!listings_seller_id_profiles_fkey(username, display_name)'
    )
    .in('seller_id', followeeIds)
    .in('status', PUBLIC_LISTING_STATUSES)
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(30);

  if (error) throw new Error(error.message);
  return ((data as unknown as ListingActivityRow[] | null) ?? [])
    .filter((row) => row.posted_at)
    .map((row) => ({
      id: `listing:${row.id}`,
      kind: 'listing',
      actor: actor(row.profiles),
      title: row.title,
      href: `/ilan/${row.slug}`,
      happenedAt: row.posted_at as string,
    }));
}

async function fetchThreadActivity(
  client: SupabaseClient,
  followeeIds: string[]
): Promise<ActivityItem[]> {
  const { data, error } = await client
    .from('forum_threads')
    .select(
      'id, author_id, slug, title, created_at, ' +
        'profiles!forum_threads_author_id_profiles_fkey(username, display_name)'
    )
    .in('author_id', followeeIds)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw new Error(error.message);
  return ((data as unknown as ThreadActivityRow[] | null) ?? []).map((row) => ({
    id: `thread:${row.id}`,
    kind: 'thread',
    actor: actor(row.profiles),
    title: row.title,
    href: `/forum/${row.slug}`,
    happenedAt: row.created_at,
  }));
}

async function fetchActivityFeed(
  client: SupabaseClient,
  userId: string
): Promise<{ items: ActivityItem[]; followingCount: number }> {
  const followeeIds = await fetchFolloweeIds(client, userId);
  if (followeeIds.length === 0) return { items: [], followingCount: 0 };

  const groups = await Promise.all([
    fetchPhotoActivity(client, followeeIds),
    fetchListingActivity(client, followeeIds),
    fetchThreadActivity(client, followeeIds),
  ]);

  return {
    items: mergeActivityItems(groups),
    followingCount: followeeIds.length,
  };
}

export function useActivityFeed(): ActivityFeedState {
  const { user, loading: authLoading, configured } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(authLoading);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    const clientPromise = userId ? getSupabase() : null;
    if (!userId || !clientPromise) {
      setItems([]);
      setFollowingCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    clientPromise
      .then((client) => fetchActivityFeed(client, userId))
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setFollowingCount(result.followingCount);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setItems([]);
        setFollowingCount(0);
        setError(e instanceof Error ? e.message : 'Akış okunamadı');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, userId, tick]);

  return {
    items,
    followingCount,
    loading,
    error,
    configured,
    authenticated: Boolean(userId),
    refresh: () => setTick((value) => value + 1),
  };
}

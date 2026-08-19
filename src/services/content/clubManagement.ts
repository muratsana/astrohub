import { useCallback, useEffect, useState } from 'react';
import {
  blocksToText,
  parseContentBlocks,
  type ContentBlock,
} from '@/domain/content/blocks';
import { sanitizeText } from '@/lib/sanitize';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';

export interface ManagedClub {
  slug: string;
  name: string;
  summary: string;
  bodyBlocks: ContentBlock[];
  contactEmail: string;
  website: string;
  socialUrl: string;
  whatsappUrl: string;
  telegramUrl: string;
  publicEvents: boolean;
  sharedEquipment: boolean;
  status: string;
  listed: boolean;
}

export interface ClubMemberRequest {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface ClubInvite {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: string;
}

export interface ClubPost {
  id: string;
  kind: 'duyuru' | 'haber';
  audience: 'members' | 'public';
  title: string;
  body: string;
  createdAt: string;
  publishedAt: string | null;
}

interface ManagedClubRow {
  slug: string;
  name: string;
  summary: string | null;
  body_blocks: unknown;
  contact_email: string | null;
  website: string | null;
  social_url: string | null;
  whatsapp_url: string | null;
  telegram_url: string | null;
  public_events: boolean | null;
  shared_equipment: boolean | null;
  status: string | null;
  listed: boolean | null;
}

interface RequestRow {
  id: string;
  user_id: string;
  status: ClubMemberRequest['status'];
  requested_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

interface InviteRow {
  id: string;
  email: string;
  status: ClubInvite['status'];
  created_at: string;
}

interface PostRow {
  id: string;
  kind: ClubPost['kind'];
  audience: ClubPost['audience'];
  title: string;
  body: string;
  created_at: string;
  published_at: string | null;
}

async function client() {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Veritabanı bağlantısı yapılandırılmamış.');
  return supabase;
}

function toManagedClub(row: ManagedClubRow): ManagedClub {
  const summary = row.summary?.trim() ?? '';
  return {
    slug: row.slug,
    name: row.name,
    summary,
    bodyBlocks: parseContentBlocks(row.body_blocks, summary ? [summary] : []),
    contactEmail: row.contact_email ?? '',
    website: row.website ?? '',
    socialUrl: row.social_url ?? '',
    whatsappUrl: row.whatsapp_url ?? '',
    telegramUrl: row.telegram_url ?? '',
    publicEvents: row.public_events === true,
    sharedEquipment: row.shared_equipment === true,
    status: row.status ?? 'incelemede',
    listed: row.listed === true,
  };
}

export function useManagedClubs(userId: string | undefined): {
  clubs: ManagedClub[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [clubs, setClubs] = useState<ManagedClub[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      setClubs([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const supabase = await client();
        const select =
          'slug, name, summary, body_blocks, contact_email, website, social_url, whatsapp_url, telegram_url, public_events, shared_equipment, status, listed';
        const [managed, submitted] = await Promise.all([
          supabase
            .from('clubs')
            .select(select)
            .eq('manager_user_id', userId)
            .is('deleted_at', null)
            .order('name'),
          supabase
            .from('clubs')
            .select(select)
            .eq('submitted_by', userId)
            .is('manager_user_id', null)
            .is('deleted_at', null)
            .order('name'),
        ]);
        if (managed.error) throw new Error(managed.error.message);
        if (submitted.error) throw new Error(submitted.error.message);
        if (!active) return;
        const rows = [
          ...((managed.data ?? []) as ManagedClubRow[]),
          ...((submitted.data ?? []) as ManagedClubRow[]),
        ];
        setClubs(rows.map(toManagedClub));
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Kulüpler okunamadı.');
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
  return { clubs, loading, error, refresh };
}

export function useClubPortal(clubSlug: string | undefined): {
  requests: ClubMemberRequest[];
  invites: ClubInvite[];
  posts: ClubPost[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [requests, setRequests] = useState<ClubMemberRequest[]>([]);
  const [invites, setInvites] = useState<ClubInvite[]>([]);
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!clubSlug || !isSupabaseConfigured) {
      setRequests([]);
      setInvites([]);
      setPosts([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const supabase = await client();
        const [requestResult, inviteResult, postResult] = await Promise.all([
          supabase
            .from('club_membership_requests')
            .select('id, user_id, status, requested_at, reviewed_at, review_note')
            .eq('club_slug', clubSlug)
            .order('requested_at', { ascending: false }),
          supabase
            .from('club_invites')
            .select('id, email, status, created_at')
            .eq('club_slug', clubSlug)
            .order('created_at', { ascending: false }),
          supabase
            .from('club_posts')
            .select('id, kind, audience, title, body, created_at, published_at')
            .eq('club_slug', clubSlug)
            .order('created_at', { ascending: false }),
        ]);
        if (requestResult.error) throw new Error(requestResult.error.message);
        if (inviteResult.error) throw new Error(inviteResult.error.message);
        if (postResult.error) throw new Error(postResult.error.message);
        if (!active) return;
        setRequests(
          ((requestResult.data ?? []) as RequestRow[]).map((row) => ({
            id: row.id,
            userId: row.user_id,
            status: row.status,
            requestedAt: row.requested_at,
            reviewedAt: row.reviewed_at,
            reviewNote: row.review_note,
          }))
        );
        setInvites(
          ((inviteResult.data ?? []) as InviteRow[]).map((row) => ({
            id: row.id,
            email: row.email,
            status: row.status,
            createdAt: row.created_at,
          }))
        );
        setPosts(
          ((postResult.data ?? []) as PostRow[]).map((row) => ({
            id: row.id,
            kind: row.kind,
            audience: row.audience,
            title: row.title,
            body: row.body,
            createdAt: row.created_at,
            publishedAt: row.published_at,
          }))
        );
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Kulüp yönetimi okunamadı.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [clubSlug, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { requests, invites, posts, loading, error, refresh };
}

export async function updateManagedClub(
  slug: string,
  patch: {
    bodyBlocks: ContentBlock[];
    contactEmail: string;
    website: string;
    socialUrl: string;
    whatsappUrl: string;
    telegramUrl: string;
    publicEvents: boolean;
    sharedEquipment: boolean;
  }
): Promise<void> {
  const bodyText = blocksToText(patch.bodyBlocks);
  if (sanitizeText(bodyText, { multiline: true }).length < 30) {
    throw new Error('Kulüp içeriği en az 30 karakter olmalı.');
  }
  const supabase = await client();
  const { error } = await supabase
    .from('clubs')
    .update({
      body_blocks: patch.bodyBlocks,
      summary: sanitizeText(bodyText, { multiline: true, maxLength: 4000 }),
      contact_email: sanitizeText(patch.contactEmail, { maxLength: 120 }),
      website: patch.website.trim() || null,
      social_url: patch.socialUrl.trim() || null,
      whatsapp_url: patch.whatsappUrl.trim() || null,
      telegram_url: patch.telegramUrl.trim() || null,
      public_events: patch.publicEvents,
      shared_equipment: patch.sharedEquipment,
    })
    .eq('slug', slug);
  if (error) throw new Error(error.message);
}

export async function reviewClubMembership(
  id: string,
  status: 'approved' | 'rejected',
  userId: string,
  note = ''
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('club_membership_requests')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
      review_note: sanitizeText(note, { maxLength: 300 }) || null,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function inviteClubMember(
  clubSlug: string,
  email: string
): Promise<void> {
  const address = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(address)) {
    throw new Error('Geçerli e-posta girin.');
  }
  const supabase = await client();
  const { error } = await supabase
    .from('club_invites')
    .insert({ club_slug: clubSlug, email: address });
  if (error) throw new Error(error.message);
}

export async function createClubPost(
  clubSlug: string,
  input: {
    kind: 'duyuru' | 'haber';
    audience: 'members' | 'public';
    title: string;
    body: string;
  }
): Promise<void> {
  const title = sanitizeText(input.title, { maxLength: 160 });
  const body = sanitizeText(input.body, { multiline: true, maxLength: 6000 });
  if (title.length < 4) throw new Error('Başlık en az 4 karakter olmalı.');
  if (body.length < 10) throw new Error('İçerik en az 10 karakter olmalı.');
  const supabase = await client();
  const { error } = await supabase.from('club_posts').insert({
    club_slug: clubSlug,
    kind: input.kind,
    audience: input.kind === 'duyuru' ? 'members' : input.audience,
    title,
    body,
    published_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

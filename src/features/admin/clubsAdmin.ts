import { sanitizeText } from '@/lib/sanitize';
import { getSupabase } from '@/services/supabase/client';
import {
  CLUB_PHOTO_LIMIT,
  createClubRecord,
  uploadClubPhotos,
  validateClubDraft,
  type ClubDraft,
} from '@/services/clubs/submission';
import { clubTopicLabels, type ClubTopic } from '@/features/clubs/data';

export type ClubStatus = 'pending' | 'published' | 'rejected';

export interface AdminClub {
  slug: string;
  name: string;
  kind: string;
  city: string;
  foundedOn: string | null;
  place: string | null;
  topics: ClubTopic[];
  summary: string;
  publicEvents: boolean;
  sharedEquipment: boolean;
  website: string | null;
  contactEmail: string | null;
  joinUrl: string | null;
  socialUrl: string | null;
  whatsappUrl: string | null;
  photoPaths: string[];
  sourceName: string | null;
  infoCheckedOn: string | null;
  verifiedAt: string | null;
  listed: boolean;
  status: ClubStatus;
  submittedBy: string | null;
}

export interface ClubInfoDraft extends ClubDraft {
  joinUrl: string;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

const SELECT =
  'slug, name, kind, city, founded_on, place, topics, summary, public_events, ' +
  'shared_equipment, website, contact_email, join_url, social_url, whatsapp_url, ' +
  'photo_paths, source_name, info_checked_on, verified_at, listed, status, submitted_by';

interface Row {
  slug: string;
  name: string;
  kind: string;
  city: string;
  founded_on: string | null;
  place: string | null;
  topics: string[] | null;
  summary: string;
  public_events: boolean;
  shared_equipment: boolean;
  website: string | null;
  contact_email: string | null;
  join_url: string | null;
  social_url: string | null;
  whatsapp_url: string | null;
  photo_paths: string[] | null;
  source_name: string | null;
  info_checked_on: string | null;
  verified_at: string | null;
  listed: boolean;
  status: string | null;
  submitted_by: string | null;
}

function status(raw: string | null): ClubStatus {
  return raw === 'pending' || raw === 'rejected' ? raw : 'published';
}

function topics(raw: string[] | null): ClubTopic[] {
  return (raw ?? []) as ClubTopic[];
}

function toAdminClub(r: Row): AdminClub {
  return {
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    city: r.city,
    foundedOn: r.founded_on,
    place: r.place,
    topics: topics(r.topics),
    summary: r.summary,
    publicEvents: r.public_events,
    sharedEquipment: r.shared_equipment,
    website: r.website,
    contactEmail: r.contact_email,
    joinUrl: r.join_url,
    socialUrl: r.social_url,
    whatsappUrl: r.whatsapp_url,
    photoPaths: r.photo_paths ?? [],
    sourceName: r.source_name,
    infoCheckedOn: r.info_checked_on,
    verifiedAt: r.verified_at,
    listed: r.listed,
    status: status(r.status),
    submittedBy: r.submitted_by,
  };
}

export function draftFromClub(club: AdminClub): ClubInfoDraft {
  return {
    name: club.name,
    kind: club.kind as ClubInfoDraft['kind'],
    city: club.city,
    foundedOn: club.foundedOn ?? '',
    place: club.place ?? '',
    topics: club.topics,
    summary: club.summary,
    contactEmail: club.contactEmail ?? '',
    website: club.website ?? '',
    socialUrl: club.socialUrl ?? '',
    whatsappUrl: club.whatsappUrl ?? '',
    joinUrl: club.joinUrl ?? '',
    publicEvents: club.publicEvents,
    sharedEquipment: club.sharedEquipment,
    sourceName: club.sourceName ?? '',
    infoCheckedOn: club.infoCheckedOn ?? '',
  };
}

export function emptyClubDraft(): ClubInfoDraft {
  return {
    name: '',
    kind: 'dernek',
    city: 'İstanbul',
    foundedOn: '',
    place: '',
    topics: [],
    summary: '',
    contactEmail: '',
    website: '',
    socialUrl: '',
    whatsappUrl: '',
    joinUrl: '',
    publicEvents: true,
    sharedEquipment: false,
    sourceName: '',
    infoCheckedOn: new Date().toISOString().slice(0, 10),
  };
}

export function describeClubInfoProblem(
  draft: ClubInfoDraft,
  photos: { size: number; type: string }[] = [],
  existingPhotoCount = 0
): string | null {
  const problem = validateClubDraft(draft, photos);
  if (problem) return problem;
  if (existingPhotoCount + photos.length > CLUB_PHOTO_LIMIT) {
    return `Toplulukta en fazla ${CLUB_PHOTO_LIMIT} fotoğraf olabilir.`;
  }
  if (
    draft.joinUrl &&
    !/^https:\/\/[A-Za-z0-9.-]+(\/\S*)?$/.test(draft.joinUrl)
  ) {
    return 'Katılım bağlantısı `https://` ile başlamalı.';
  }
  if (draft.infoCheckedOn && !/^\d{4}-\d{2}-\d{2}$/.test(draft.infoCheckedOn)) {
    return 'Kontrol tarihi YYYY-AA-GG biçiminde olmalı.';
  }
  if (
    draft.infoCheckedOn &&
    draft.infoCheckedOn > new Date().toISOString().slice(0, 10)
  ) {
    return 'Kontrol tarihi gelecekte olamaz.';
  }
  return null;
}

export async function fetchAdminClubs(): Promise<AdminClub[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('clubs')
    .select(SELECT)
    .order('status', { ascending: true })
    .order('name');
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map(toAdminClub);
}

export async function createAdminClub(
  draft: ClubInfoDraft,
  photos: File[]
): Promise<void> {
  const supabase = await client();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Topluluk eklemek için oturum gerekiyor.');

  await createClubRecord(
    {
      ...draft,
      userId,
      photos,
      sourceName: draft.sourceName || 'Admin girişi',
    },
    { status: 'published', listed: true }
  );
}

export async function saveClubInfo(
  slug: string,
  draft: ClubInfoDraft,
  photos: File[] = [],
  existingPhotoPaths: string[] = []
): Promise<void> {
  const sorun = describeClubInfoProblem(
    draft,
    photos,
    existingPhotoPaths.length
  );
  if (sorun) throw new Error(sorun);

  const supabase = await client();
  const uploaded =
    photos.length > 0
      ? await uploadClubPhotos(await reviewerId(), slug, photos)
      : [];
  const { error } = await supabase
    .from('clubs')
    .update({
      name: sanitizeText(draft.name, { maxLength: 120 }),
      kind: draft.kind,
      city: sanitizeText(draft.city, { maxLength: 80 }),
      founded_on: draft.foundedOn,
      founded_year: Number(draft.foundedOn.slice(0, 4)),
      place: sanitizeText(draft.place, { maxLength: 160 }),
      topics: draft.topics,
      activities: draft.topics.map((topic) => clubTopicLabels[topic]),
      summary: sanitizeText(draft.summary, {
        multiline: true,
        maxLength: 4000,
      }),
      public_events: draft.publicEvents,
      shared_equipment: draft.sharedEquipment,
      website: draft.website.trim() || null,
      contact_email: draft.contactEmail.trim() || null,
      join_url: draft.joinUrl.trim() || null,
      social_url: draft.socialUrl.trim() || null,
      whatsapp_url: draft.whatsappUrl.trim() || null,
      photo_paths:
        uploaded.length > 0
          ? [...existingPhotoPaths, ...uploaded].slice(0, CLUB_PHOTO_LIMIT)
          : existingPhotoPaths,
      source_name: sanitizeText(draft.sourceName, { maxLength: 120 }) || null,
      info_checked_on: draft.infoCheckedOn || null,
    })
    .eq('slug', slug);
  if (error) {
    if (uploaded.length > 0) {
      try {
        await supabase.storage.from('club-photos').remove(uploaded);
      } catch (cause) {
        console.error('geri alma: topluluk fotoğrafları silinemedi', cause);
      }
    }
    throw new Error(error.message);
  }
}

async function reviewerId(): Promise<string> {
  const supabase = await client();
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error('Bu işlem için oturum gerekiyor.');
  return id;
}

export async function setClubStatus(
  slug: string,
  next: ClubStatus
): Promise<void> {
  const id = await reviewerId();
  const supabase = await client();
  const { error } = await supabase
    .from('clubs')
    .update({
      status: next,
      listed: next === 'published',
      reviewed_at: new Date().toISOString(),
      reviewed_by: id,
      rejection_reason: null,
    })
    .eq('slug', slug);
  if (error) throw new Error(error.message);
}

export async function verifyClub(slug: string): Promise<void> {
  const id = await reviewerId();
  const supabase = await client();
  const { error } = await supabase
    .from('clubs')
    .update({ verified_at: new Date().toISOString(), verified_by: id })
    .eq('slug', slug);
  if (error) throw new Error(error.message);
}

export async function unverifyClub(slug: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('clubs')
    .update({ verified_at: null, verified_by: null })
    .eq('slug', slug);
  if (error) throw new Error(error.message);
}

export async function setClubListed(
  slug: string,
  listed: boolean
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('clubs')
    .update({ listed })
    .eq('slug', slug);
  if (error) throw new Error(error.message);
}

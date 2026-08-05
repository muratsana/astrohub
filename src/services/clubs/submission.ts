import { renderResized } from '@/domain/photography/resize';
import { checkImageFormat, readHead } from '@/domain/photography/fileType';
import { formatBytes } from '@/domain/membership/quota';
import { sanitizeText } from '@/lib/sanitize';
import { getSupabase } from '@/services/supabase/client';
import { threadSlug, slugSuffix } from '@/services/content/forum';
import {
  clubTopicLabels,
  clubTopicOrder,
  type ClubKind,
  type ClubTopic,
} from '@/features/clubs/data';

export const CLUB_PHOTO_LIMIT = 3;
export const CLUB_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const CLUB_PHOTO_MAX_EDGE = 1400;

const KINDS: ClubKind[] = ['dernek', 'universite', 'gozlem-grubu'];

export interface ClubDraft {
  userId?: string;
  name: string;
  kind: ClubKind;
  city: string;
  foundedOn: string;
  place: string;
  topics: ClubTopic[];
  summary: string;
  contactEmail: string;
  website: string;
  socialUrl: string;
  whatsappUrl: string;
  publicEvents: boolean;
  sharedEquipment: boolean;
  sourceName?: string;
  infoCheckedOn?: string;
}

export interface ClubSubmitInput extends ClubDraft {
  userId: string;
  photos: File[];
}

const https = (v: string) => !v || /^https:\/\/[A-Za-z0-9.-]+(\/\S*)?$/.test(v);
const email = (v: string) => /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(v);
const whatsapp = (v: string) =>
  !v || /^https:\/\/(chat\.whatsapp\.com|wa\.me)\/\S+$/.test(v);

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function uniqueTopics(topics: ClubTopic[]): ClubTopic[] {
  return [...new Set(topics)].filter((t): t is ClubTopic =>
    clubTopicOrder.includes(t)
  );
}

export function validateClubDraft(
  draft: ClubDraft,
  photos: { size: number; type: string }[] = []
): string | null {
  if (sanitizeText(draft.name).length < 2) return 'Topluluk adı gerekli.';
  if (!KINDS.includes(draft.kind)) return 'Topluluk türü geçersiz.';
  if (sanitizeText(draft.city).length < 2) return 'İl gerekli.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.foundedOn)) {
    return 'Kuruluş tarihi gerekli.';
  }
  if (draft.foundedOn > today()) return 'Kuruluş tarihi gelecekte olamaz.';
  if (uniqueTopics(draft.topics).length === 0) return 'En az bir konu seçin.';
  if (!email(draft.contactEmail.trim()))
    return 'Geçerli iletişim e-postası gerekli.';
  if (sanitizeText(draft.summary, { multiline: true }).length < 30) {
    return 'Açıklama en az 30 karakter olmalı.';
  }
  if (!https(draft.website.trim()))
    return 'Web sayfası `https://` ile başlamalı.';
  if (!https(draft.socialUrl.trim()))
    return 'Sosyal medya adresi `https://` ile başlamalı.';
  if (!whatsapp(draft.whatsappUrl.trim())) {
    return 'WhatsApp bağlantısı `https://chat.whatsapp.com/...` biçiminde olmalı.';
  }
  if (photos.length > CLUB_PHOTO_LIMIT)
    return 'En fazla 3 fotoğraf eklenebilir.';
  for (const file of photos) {
    if (file.size > CLUB_PHOTO_MAX_BYTES) {
      return `Her fotoğraf en fazla ${formatBytes(CLUB_PHOTO_MAX_BYTES)} olmalı.`;
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return 'Fotoğraflar JPEG, PNG veya WebP olmalı.';
    }
  }
  return null;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export async function uploadClubPhotos(
  userId: string,
  slug: string,
  files: File[]
): Promise<string[]> {
  if (files.length === 0) return [];
  const supabase = await client();
  const paths: string[] = [];

  for (const [index, file] of files.entries()) {
    const format = checkImageFormat(await readHead(file), file.type);
    if (format.kind === 'reject') throw new Error(format.reason);
    const resized = await renderResized(file, CLUB_PHOTO_MAX_EDGE);
    if (!resized) {
      throw new Error('Görsel işlenemedi. JPEG, PNG veya WebP deneyin.');
    }
    if (resized.blob.size > CLUB_PHOTO_MAX_BYTES) {
      throw new Error(
        `Fotoğraf optimize edilse bile ${formatBytes(CLUB_PHOTO_MAX_BYTES)} sınırını aşıyor.`
      );
    }

    const path = `${userId}/${slug}/${index}-${Math.random()
      .toString(36)
      .slice(2, 8)}.jpg`;
    const { error } = await supabase.storage
      .from('club-photos')
      .upload(path, resized.blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw new Error(error.message);
    paths.push(path);
  }

  return paths;
}

export async function createClubRecord(
  input: ClubSubmitInput,
  options: { status: 'pending' | 'published'; listed: boolean } = {
    status: 'pending',
    listed: false,
  }
): Promise<string> {
  const problem = validateClubDraft(input, input.photos);
  if (problem) throw new Error(problem);

  const name = sanitizeText(input.name, { maxLength: 120 });
  const slug = threadSlug(name, slugSuffix());
  const topics = uniqueTopics(input.topics);
  const activities = topics.map((topic) => clubTopicLabels[topic]);
  const photoPaths = await uploadClubPhotos(input.userId, slug, input.photos);
  const supabase = await client();

  const { error } = await supabase.from('clubs').insert({
    slug,
    name,
    kind: input.kind,
    city: sanitizeText(input.city, { maxLength: 80 }),
    founded_on: input.foundedOn,
    founded_year: Number(input.foundedOn.slice(0, 4)),
    place: sanitizeText(input.place || input.city, { maxLength: 160 }),
    topics,
    activities,
    summary: sanitizeText(input.summary, { multiline: true, maxLength: 4000 }),
    public_events: input.publicEvents,
    shared_equipment: input.sharedEquipment,
    website: input.website.trim() || null,
    contact_email: input.contactEmail.trim(),
    social_url: input.socialUrl.trim() || null,
    whatsapp_url: input.whatsappUrl.trim() || null,
    photo_paths: photoPaths,
    source_name:
      sanitizeText(input.sourceName, { maxLength: 120 }) ||
      'Kullanıcı gönderimi',
    info_checked_on: input.infoCheckedOn || null,
    submitted_by: input.userId,
    status: options.status,
    listed: options.listed,
  });

  if (error) {
    if (photoPaths.length > 0) {
      try {
        await supabase.storage.from('club-photos').remove(photoPaths);
      } catch (cause) {
        console.error('geri alma: topluluk fotoğrafları silinemedi', cause);
      }
    }
    throw new Error(error.message);
  }

  return slug;
}

export async function createClubSubmission(
  input: ClubSubmitInput
): Promise<string> {
  return createClubRecord(input, { status: 'pending', listed: false });
}

import { renderResized } from '@/domain/photography/resize';
import { checkImageFormat, readHead } from '@/domain/photography/fileType';
import { formatBytes } from '@/domain/membership/quota';
import {
  blocksToText,
  textToBlocks,
  type ContentBlock,
} from '@/domain/content/blocks';
import { sanitizeText } from '@/lib/sanitize';
import { getSupabase } from '@/services/supabase/client';
import { threadSlug, slugSuffix } from '@/services/content/forum';
import {
  clubTopicLabels,
  clubTopicOrder,
  type ClubKind,
  type ClubTopic,
} from '@/features/clubs/data';

export const CLUB_PHOTO_LIMIT = 20;
export const CLUB_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const CLUB_PHOTO_MAX_EDGE = 1400;

const KINDS: ClubKind[] = ['dernek', 'universite', 'gozlem-grubu', 'topluluk'];

export interface ClubDraft {
  userId?: string;
  name: string;
  kind: ClubKind;
  city: string;
  /** İlçe adı — isteğe bağlı; `DistrictSelect` kanonik yazımı veriyor. */
  district?: string;
  foundedOn: string;
  place: string;
  topics: ClubTopic[];
  summary: string;
  bodyBlocks: ContentBlock[];
  contactEmail: string;
  website: string;
  socialUrl: string;
  whatsappUrl: string;
  telegramUrl: string;
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
const telegram = (v: string) =>
  !v || /^https:\/\/(t\.me|telegram\.me)\/\S+$/.test(v);

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
  if (!telegram(draft.telegramUrl.trim())) {
    return 'Telegram bağlantısı `https://t.me/...` biçiminde olmalı.';
  }
  if (photos.length > CLUB_PHOTO_LIMIT)
    return `En fazla ${CLUB_PHOTO_LIMIT} fotoğraf eklenebilir.`;
  for (const file of photos) {
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
    const transparent = file.type === 'image/png' || file.type === 'image/webp';
    const contentType = transparent ? 'image/png' : 'image/jpeg';
    const extension = transparent ? 'png' : 'jpg';
    const resized = await renderResized(
      file,
      CLUB_PHOTO_MAX_EDGE,
      undefined,
      contentType
    );
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
      .slice(2, 8)}.${extension}`;
    const { error } = await supabase.storage
      .from('club-photos')
      .upload(path, resized.blob, { contentType, upsert: false });
    if (error) throw new Error(error.message);
    paths.push(path);
  }

  return paths;
}

export async function createClubRecord(
  input: ClubSubmitInput,
  options: { status: 'incelemede' | 'yayinda'; listed: boolean } = {
    status: 'incelemede',
    listed: false,
  }
): Promise<string> {
  const problem = validateClubDraft(input, input.photos);
  if (problem) throw new Error(problem);

  const name = sanitizeText(input.name, { maxLength: 120 });
  const slug = threadSlug(name, slugSuffix());
  const topics = uniqueTopics(input.topics);
  const activities = topics.map((topic) => clubTopicLabels[topic]);
  const bodyBlocks = input.bodyBlocks.length > 0
    ? input.bodyBlocks
    : textToBlocks(input.summary);
  const summary = blocksToText(bodyBlocks) || input.summary;
  const photoPaths = await uploadClubPhotos(input.userId, slug, input.photos);
  const supabase = await client();

  const { error } = await supabase.from('clubs').insert({
    slug,
    name,
    kind: input.kind,
    city: sanitizeText(input.city, { maxLength: 80 }),
    district: input.district
      ? sanitizeText(input.district, { maxLength: 80 })
      : null,
    founded_on: input.foundedOn,
    founded_year: Number(input.foundedOn.slice(0, 4)),
    place: sanitizeText(input.place || input.city, { maxLength: 160 }),
    topics,
    activities,
    summary: sanitizeText(summary, { multiline: true, maxLength: 4000 }),
    body_blocks: bodyBlocks,
    public_events: input.publicEvents,
    shared_equipment: input.sharedEquipment,
    website: input.website.trim() || null,
    contact_email: input.contactEmail.trim(),
    social_url: input.socialUrl.trim() || null,
    whatsapp_url: input.whatsappUrl.trim() || null,
    telegram_url: input.telegramUrl.trim() || null,
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
  return createClubRecord(input, { status: 'incelemede', listed: false });
}

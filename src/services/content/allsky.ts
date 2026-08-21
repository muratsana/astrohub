import { safeUrl } from '@/lib/url';
import { sanitizeText } from '@/lib/sanitize';
import { getSupabase } from '@/services/supabase/client';
import { allskySeed, type AllskyCamera } from '@/features/allsky/data';

interface AllskyCameraRow {
  id: string;
  slug: string;
  title: string;
  page_url: string;
  image_url: string;
  location_label: string | null;
  owner_name: string | null;
  camera_model: string | null;
  lens_label: string | null;
  refresh_seconds: number | null;
  position: number | null;
  enabled: boolean | null;
  notes: string | null;
}

export interface AllskyCameraInput {
  id?: string;
  slug: string;
  title: string;
  pageUrl: string;
  imageUrl: string;
  location: string;
  owner: string;
  camera: string;
  lens: string;
  refreshSeconds: number;
  position: number;
  enabled: boolean;
  notes: string;
}

function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export function slugifyAllsky(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function imageUrlFromAllskyPage(pageUrl: string): string | null {
  const safe = safeUrl(pageUrl);
  if (!safe) return null;
  try {
    const url = new URL(safe);
    if (url.hostname === 'ozdensobs.com') {
      url.hostname = 'www.ozdensobs.com';
    }
    if (!url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/[^/]*$/, '/image.jpg');
    } else {
      url.pathname = `${url.pathname}image.jpg`;
    }
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function mapRow(row: AllskyCameraRow): AllskyCamera {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    pageUrl: row.page_url,
    imageUrl: row.image_url,
    location: row.location_label ?? '',
    owner: row.owner_name ?? '',
    camera: row.camera_model ?? '',
    lens: row.lens_label ?? '',
    refreshSeconds: row.refresh_seconds ?? 15,
    position: row.position ?? 100,
    enabled: row.enabled ?? false,
    notes: row.notes ?? '',
  };
}

function fallback(includeDisabled: boolean): AllskyCamera[] {
  return allskySeed
    .filter((camera) => includeDisabled || camera.enabled)
    .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
}

function tableMissing(message: string): boolean {
  return (
    message.includes('allsky_cameras') ||
    message.includes('Could not find the table') ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

export async function fetchAllskyCameras({
  includeDisabled = false,
}: { includeDisabled?: boolean } = {}): Promise<AllskyCamera[]> {
  const promise = getSupabase();
  if (!promise) return fallback(includeDisabled);

  const supabase = await promise;
  let query = supabase
    .from('allsky_cameras')
    .select(
      'id, slug, title, page_url, image_url, location_label, owner_name, camera_model, lens_label, refresh_seconds, position, enabled, notes'
    )
    .order('position')
    .order('title');

  if (!includeDisabled) query = query.eq('enabled', true);

  const { data, error } = await query;
  if (error) {
    if (tableMissing(error.message)) return fallback(includeDisabled);
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapRow(row as AllskyCameraRow));
}

export function validateAllskyCamera(input: AllskyCameraInput): string | null {
  if (!sanitizeText(input.title, { maxLength: 120 }))
    return 'Başlık boş olamaz.';
  if (!slugifyAllsky(input.slug || input.title)) return 'Slug üretilemedi.';
  if (!safeUrl(input.pageUrl) || !input.pageUrl.trim().startsWith('https://'))
    return 'Sayfa adresi geçerli bir https adresi olmalı.';
  if (!safeUrl(input.imageUrl) || !input.imageUrl.trim().startsWith('https://'))
    return 'Canlı görüntü adresi geçerli bir https adresi olmalı.';
  if (!Number.isFinite(input.refreshSeconds) || input.refreshSeconds < 5)
    return 'Yenileme süresi en az 5 saniye olmalı.';
  if (!Number.isFinite(input.position) || input.position < 1)
    return 'Sıra 1 veya daha büyük olmalı.';
  return null;
}

export async function saveAllskyCamera(
  input: AllskyCameraInput
): Promise<void> {
  const problem = validateAllskyCamera(input);
  if (problem) throw new Error(problem);

  const supabase = await client();
  const row = {
    ...(input.id ? { id: input.id } : {}),
    slug: slugifyAllsky(input.slug || input.title),
    title: sanitizeText(input.title, { maxLength: 120 }),
    page_url: safeUrl(input.pageUrl),
    image_url: safeUrl(input.imageUrl),
    location_label: sanitizeText(input.location, { maxLength: 120 }),
    owner_name: sanitizeText(input.owner, { maxLength: 80 }),
    camera_model: sanitizeText(input.camera, { maxLength: 80 }),
    lens_label: sanitizeText(input.lens, { maxLength: 40 }),
    refresh_seconds: Math.round(input.refreshSeconds),
    position: Math.round(input.position),
    enabled: input.enabled,
    notes: sanitizeText(input.notes, { maxLength: 500 }),
  };

  const { data, error } = input.id
    ? await supabase
        .from('allsky_cameras')
        .update(row)
        .eq('id', input.id)
        .select('id')
    : await supabase.from('allsky_cameras').insert(row).select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error('Allsky kaydı kaydedilemedi — yetkiniz olmayabilir.');
}

export async function deleteAllskyCamera(id: string): Promise<void> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('allsky_cameras')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error('Allsky kaydı silinemedi — kayıt bulunamadı.');
}

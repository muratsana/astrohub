import { CONTENT_STATUSES, type ContentStatus } from '@/domain/content/status';
import { eventTypeLabels, type EventType } from '@/features/events/types';
import { sanitizeText } from '@/lib/sanitize';
import { slugify } from '@/lib/slug';
import { getSupabase } from '@/services/supabase/client';

/**
 * ETKİNLİK YÖNETİMİ — PANELDEN TAM DÜZENLEME.
 *
 * ── NEDEN YENİ BİR KATMAN ─────────────────────────────────────────────
 *
 * Etkinlikler panelde `RecordsControl` üzerinden görünüyordu ama orası
 * genel bir MODERASYON yüzeyi: listeler, durum değiştirir, siler. Bir
 * yöneticinin etkinliğin başlığındaki yazım hatasını düzeltmesi, saatini
 * kaydırması ya da eksik koordinatı girmesi mümkün DEĞİLDİ — etkinlik
 * tablosuna yazan tek yer kullanıcıya açık katkı formuydu
 * (`createEventContribution`) ve o form 30 kolonun 12'sine dokunuyordu.
 *
 * Haber ve yazılar `content_entries` üzerinden `ContentControl` ile tam
 * düzenlenebiliyordu; etkinlik bu yüzeyin dışında kalmıştı. Bu dosya
 * farkı kapatıyor.
 *
 * ── RLS ZATEN İZİN VERİYORDU ──────────────────────────────────────────
 *
 * `events_insert_contributor` / `events_update_contributor`
 * (`20260807240000_ortak_durum_kumesi.sql:271,282`) `app.is_admin()` ve
 * `content_editor` için koşulsuz geçit veriyor. Yani eksik olan yetki
 * değil, ARAYÜZDÜ.
 *
 * ── YAZMALAR SATIR SAYISIYLA DOĞRULANIYOR ─────────────────────────────
 *
 * PostgREST 0 satır etkilendiğinde hata döndürmez. Denetimde panelin beş
 * ayrı yerinde bu yüzden "kaydedildi" yazıp hiçbir şey yazmayan akışlar
 * bulundu. Buradaki her yazma `.select('id')` ile dönen satırı sayıyor;
 * RLS reddederse fonksiyon HATA veriyor, sessizce başarılı olmuyor.
 */

export interface EventDraft {
  id: string | null;
  slug: string;
  title: string;
  type: EventType;
  status: ContentStatus;
  city: string;
  district: string;
  venue: string;
  latitude: string;
  longitude: string;
  startsAt: string;
  endsAt: string;
  free: boolean;
  camping: boolean;
  kidsFriendly: boolean;
  astrophotoFocused: boolean;
  telescopesProvided: boolean;
  capacity: string;
  organizerName: string;
  organizerVerified: boolean;
  description: string;
  observedTargets: string[];
  rules: string[];
  sourceName: string;
  sourceLastVerifiedAt: string;
  registrationPortalEnabled: boolean;
  registrationPortalLabel: string;
  registrationPortalNote: string;
  cancelledAt: string | null;
}

export interface EventListRow {
  id: string;
  slug: string;
  title: string;
  status: ContentStatus | string;
  city: string;
  startsAt: string | null;
  cancelledAt: string | null;
  deletedAt: string | null;
}

export interface EventRegistrationRow {
  userId: string;
  username: string | null;
  displayName: string | null;
  note: string;
  createdAt: string;
}

const EVENT_TYPES = Object.keys(eventTypeLabels) as EventType[];

/** Tarayıcının `datetime-local` alanı saniye/ofset taşımaz; ISO'dan kırpılıyor. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function emptyEventDraft(): EventDraft {
  return {
    id: null,
    slug: '',
    title: '',
    type: 'gozlem-senligi',
    status: 'taslak',
    city: '',
    district: '',
    venue: '',
    latitude: '',
    longitude: '',
    startsAt: '',
    endsAt: '',
    free: true,
    camping: false,
    kidsFriendly: false,
    astrophotoFocused: false,
    telescopesProvided: false,
    capacity: '',
    organizerName: '',
    organizerVerified: false,
    description: '',
    observedTargets: [],
    rules: [],
    sourceName: '',
    sourceLastVerifiedAt: '',
    registrationPortalEnabled: false,
    registrationPortalLabel: 'Astrohub kayıt portalı',
    registrationPortalNote: '',
    cancelledAt: null,
  };
}

type Row = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

export function rowToDraft(row: Row): EventDraft {
  return {
    id: String(row.id),
    slug: str(row.slug),
    title: str(row.title),
    type: (EVENT_TYPES.includes(row.event_type as EventType)
      ? row.event_type
      : 'gozlem-senligi') as EventType,
    status: (CONTENT_STATUSES as readonly string[]).includes(str(row.status))
      ? (row.status as ContentStatus)
      : 'taslak',
    city: str(row.city),
    district: str(row.district),
    venue: str(row.venue),
    latitude: row.latitude === null || row.latitude === undefined ? '' : String(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? '' : String(row.longitude),
    startsAt: toLocalInput(str(row.starts_at)),
    endsAt: toLocalInput(str(row.ends_at)),
    free: row.free !== false,
    camping: row.camping === true,
    kidsFriendly: row.kids_friendly === true,
    astrophotoFocused: row.astrophoto_focused === true,
    telescopesProvided: row.telescopes_provided === true,
    capacity: row.capacity === null || row.capacity === undefined ? '' : String(row.capacity),
    organizerName: str(row.organizer_name),
    organizerVerified: row.organizer_verified === true,
    description: str(row.description),
    observedTargets: list(row.observed_targets),
    rules: list(row.rules),
    sourceName: str(row.source_name),
    sourceLastVerifiedAt: str(row.source_last_verified_at).slice(0, 10),
    registrationPortalEnabled: row.registration_portal_enabled === true,
    registrationPortalLabel:
      str(row.registration_portal_label) || 'Astrohub kayıt portalı',
    registrationPortalNote: str(row.registration_portal_note),
    cancelledAt: str(row.cancelled_at) || null,
  };
}

/**
 * FORM KAPISI.
 *
 * Kısıtların aynısı veritabanında da var (`0010:97-108`). Buradaki kontrol
 * ikinci bir güvenlik katmanı DEĞİL: yöneticiye PostgREST'in
 * "violates check constraint events_coords_paired" metni yerine ne
 * yapması gerektiğini söylüyor.
 */
export function describeEventProblem(draft: EventDraft): string | null {
  const title = sanitizeText(draft.title);
  if (title.length < 3) return 'Etkinlik adı en az 3 karakter olmalı.';
  if (title.length > 200) return 'Etkinlik adı en fazla 200 karakter olabilir.';
  if (sanitizeText(draft.city).length < 2) return 'İl gerekli.';
  if (sanitizeText(draft.venue).length < 3) return 'Mekan gerekli.';
  if (sanitizeText(draft.organizerName).length < 2)
    return 'Düzenleyen adı gerekli — dış kaynaklı etkinlikte de kim düzenliyorsa o yazılmalı.';
  if (!draft.startsAt) return 'Başlangıç tarihi gerekli.';

  const start = fromLocalInput(draft.startsAt);
  if (!start) return 'Başlangıç tarihi okunamadı.';
  if (draft.endsAt) {
    const end = fromLocalInput(draft.endsAt);
    if (!end) return 'Bitiş tarihi okunamadı.';
    if (new Date(end) <= new Date(start))
      return 'Bitiş tarihi başlangıçtan sonra olmalı.';
  }

  const hasLat = draft.latitude.trim() !== '';
  const hasLon = draft.longitude.trim() !== '';
  if (hasLat !== hasLon)
    return 'Koordinat için enlem ve boylam birlikte girilmeli — tek başına enlem haritada yanlış yere pin koyar.';
  if (hasLat) {
    const lat = Number(draft.latitude);
    const lon = Number(draft.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90)
      return 'Enlem -90 ile 90 arasında olmalı.';
    if (!Number.isFinite(lon) || lon < -180 || lon > 180)
      return 'Boylam -180 ile 180 arasında olmalı.';
  }

  if (draft.capacity.trim() !== '') {
    const capacity = Number(draft.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0)
      return 'Kontenjan pozitif bir tam sayı olmalı.';
  }

  if (sanitizeText(draft.description, { multiline: true }).length < 20)
    return 'Açıklama en az 20 karakter olmalı.';

  if (
    draft.registrationPortalEnabled &&
    sanitizeText(draft.registrationPortalLabel).length < 3
  )
    return 'Kayıt portalı etiketi en az 3 karakter olmalı.';

  const slug = draft.slug.trim();
  if (slug && !/^[a-z0-9-]{3,120}$/.test(slug))
    return 'Adres eki yalnızca küçük harf, rakam ve tire içerebilir (3-120 karakter).';

  return null;
}

/** Yayına alınacak etkinlikte kaynak şeffaflığı aranıyor (§8.4). */
export function describeEventPublishWarning(draft: EventDraft): string | null {
  if (draft.status !== 'yayinda') return null;
  if (!draft.sourceName.trim())
    return 'Yayındaki etkinlikte kaynak adı boş: tarih değiştiğinde okuyucu kime bakacağını bilemez.';
  if (!draft.sourceLastVerifiedAt)
    return 'Yayındaki etkinlikte son doğrulama tarihi boş.';
  return null;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

const LIST_SELECT =
  'id, slug, title, status, city, starts_at, cancelled_at, deleted_at';

const DETAIL_SELECT = `
  id, slug, title, event_type, status, city, district, venue,
  latitude, longitude, starts_at, ends_at,
  free, camping, kids_friendly, astrophoto_focused, telescopes_provided,
  capacity, organizer_name, organizer_verified, description,
  observed_targets, rules, source_name, source_last_verified_at,
  registration_portal_enabled, registration_portal_label, registration_portal_note,
  cancelled_at
`;

export async function fetchAdminEvents(
  options: { deleted?: boolean; search?: string; limit?: number } = {}
): Promise<EventListRow[]> {
  const supabase = await client();
  let query = supabase
    .from('events')
    .select(LIST_SELECT)
    .order('starts_at', { ascending: false })
    .limit(options.limit ?? 200);

  query = options.deleted
    ? query.not('deleted_at', 'is', null)
    : query.is('deleted_at', null);

  const term = options.search?.trim();
  if (term) {
    /* `%` ve `_` LIKE jokerleri; kaçırılmazsa arama kutusuna yazılan
       alt çizgi tüm tabloyu tarar. */
    const safe = term.replace(/[%_\\]/g, '\\$&').replace(/[,()]/g, ' ');
    query = query.or(`title.ilike.%${safe}%,city.ilike.%${safe}%,slug.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const r = row as Row;
    return {
      id: String(r.id),
      slug: str(r.slug),
      title: str(r.title) || '(başlıksız)',
      status: str(r.status) || '—',
      city: str(r.city),
      startsAt: str(r.starts_at) || null,
      cancelledAt: str(r.cancelled_at) || null,
      deletedAt: str(r.deleted_at) || null,
    };
  });
}

export async function fetchAdminEvent(id: string): Promise<EventDraft> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('events')
    .select(DETAIL_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Etkinlik bulunamadı.');
  return rowToDraft(data as Row);
}

/**
 * Slug ile açar. Panelde "Düzenle" bağlantısı `/admin/events?slug=…`
 * adresine gidiyor; kullanıcı listeyi tekrar taramak zorunda kalmasın.
 */
export async function fetchAdminEventBySlug(
  slug: string
): Promise<EventDraft | null> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('events')
    .select(DETAIL_SELECT)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToDraft(data as Row) : null;
}

/** Formdaki taslağı veritabanı satırına çevirir. */
export function draftToRow(draft: EventDraft): Row {
  const hasCoords = draft.latitude.trim() !== '' && draft.longitude.trim() !== '';
  return {
    slug: draft.slug.trim() || slugify(draft.title, 110),
    title: sanitizeText(draft.title, { maxLength: 200 }),
    event_type: draft.type,
    status: draft.status,
    city: sanitizeText(draft.city, { maxLength: 60 }),
    district: draft.district.trim()
      ? sanitizeText(draft.district, { maxLength: 60 })
      : null,
    venue: sanitizeText(draft.venue, { maxLength: 160 }),
    latitude: hasCoords ? Number(draft.latitude) : null,
    longitude: hasCoords ? Number(draft.longitude) : null,
    starts_at: fromLocalInput(draft.startsAt),
    ends_at: fromLocalInput(draft.endsAt),
    free: draft.free,
    camping: draft.camping,
    kids_friendly: draft.kidsFriendly,
    astrophoto_focused: draft.astrophotoFocused,
    telescopes_provided: draft.telescopesProvided,
    capacity: draft.capacity.trim() ? Number(draft.capacity) : null,
    organizer_name: sanitizeText(draft.organizerName, { maxLength: 160 }),
    organizer_verified: draft.organizerVerified,
    description: sanitizeText(draft.description, {
      multiline: true,
      maxLength: 4000,
    }),
    observed_targets: draft.observedTargets,
    rules: draft.rules,
    source_name: draft.sourceName.trim()
      ? sanitizeText(draft.sourceName, { maxLength: 160 })
      : null,
    source_last_verified_at: draft.sourceLastVerifiedAt || null,
    registration_portal_enabled: draft.registrationPortalEnabled,
    registration_portal_label: sanitizeText(
      draft.registrationPortalLabel || 'Astrohub kayıt portalı',
      { maxLength: 80 }
    ),
    registration_portal_note: draft.registrationPortalNote.trim()
      ? sanitizeText(draft.registrationPortalNote, {
          multiline: true,
          maxLength: 500,
        })
      : null,
    cancelled_at: draft.cancelledAt,
  };
}

/**
 * Kaydeder ve DÖNEN SATIRI SAYAR.
 *
 * `.select('id')` olmadan RLS reddettiğinde PostgREST hata döndürmüyor;
 * çağıran taraf "kaydedildi" sanıyor. Denetimde panelin beş ayrı yerinde
 * bu hata bulundu — burada tekrarlanmıyor.
 */
export async function saveAdminEvent(draft: EventDraft): Promise<string> {
  const problem = describeEventProblem(draft);
  if (problem) throw new Error(problem);

  const supabase = await client();
  const row = draftToRow(draft);

  if (draft.id) {
    const { data, error } = await supabase
      .from('events')
      .update(row)
      .eq('id', draft.id)
      .select('id');
    if (error) throw new Error(error.message);
    if (!data?.length)
      throw new Error(
        'Etkinlik güncellenemedi: kayıt bulunamadı ya da yetkiniz yok.'
      );
    return draft.id;
  }

  const { data, error } = await supabase
    .from('events')
    .insert(row)
    .select('id');
  if (error) throw new Error(error.message);
  const created = data?.[0] as Row | undefined;
  if (!created) throw new Error('Etkinlik oluşturulamadı.');
  return String(created.id);
}

/** İptal bayrağı: etkinlik YAYINDA kalır, takip edenler iptali görsün. */
export async function setEventCancelled(
  id: string,
  cancelled: boolean
): Promise<void> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('events')
    .update({ cancelled_at: cancelled ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Etkinlik güncellenemedi.');
}

export async function fetchAdminEventRegistrations(
  eventId: string
): Promise<EventRegistrationRow[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('event_registrations')
    .select('user_id, note, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const baseRows = (data ?? []).map((row) => {
    const r = row as Row;
    return {
      userId: str(r.user_id),
      note: str(r.note),
      createdAt: str(r.created_at),
    };
  });
  const userIds = [...new Set(baseRows.map((row) => row.userId).filter(Boolean))];
  if (!userIds.length) {
    return baseRows.map((row) => ({
      ...row,
      username: null,
      displayName: null,
    }));
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', userIds);

  if (profileError) throw new Error(profileError.message);

  const byId = new Map(
    (profiles ?? []).map((profile) => {
      const row = profile as Row;
      return [
        str(row.id),
        {
          username: str(row.username) || null,
          displayName: str(row.display_name) || null,
        },
      ];
    })
  );

  return baseRows.map((row) => ({
    ...row,
    username: byId.get(row.userId)?.username ?? null,
    displayName: byId.get(row.userId)?.displayName ?? null,
  }));
}

export { EVENT_TYPES };

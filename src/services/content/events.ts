import type { SupabaseClient } from '@supabase/supabase-js';
import { events as eventsSeed } from '@/features/events/data';
import type { AstroEvent, EventType } from '@/features/events/types';
import { gradientFromSeed } from '@/components/media/tints';
import { useCatalog } from './useCatalog';
import type { ContentSelection } from './select';

/**
 * ETKİNLİK KATALOĞU — satırdan arayüz kaydına.
 *
 * İki alan veritabanında **yok** ve olmaması bilinçli:
 *
 *   · `gradient` bir sunum tercihi. Editörün her etkinlik için CSS yazması
 *     gerekseydi katalog yönetimi tasarım işine dönerdi; slug'dan kararlı
 *     biçimde türetiliyor.
 *   · `registered` sayacı satırda var ama tetikleyicinin türettiği değer.
 *     Buradan yalnızca okunuyor, hiçbir zaman istemciden yazılmıyor.
 *
 * Koordinat çifti tek parça: şema `events_coords_paired` kısıtıyla enlem ve
 * boylamın birlikte bulunmasını zorluyor, eşleyici de öyle davranıyor —
 * yarım koordinat haritada sessizce yanlış yere pin koyar.
 */

interface EventSessionRow {
  starts_at: string;
  title: string;
  speaker: string | null;
  position: number;
}

interface EventRow {
  slug: string;
  title: string;
  event_type: string;
  city: string;
  venue: string;
  latitude: number | string | null;
  longitude: number | string | null;
  starts_at: string;
  ends_at: string | null;
  free: boolean;
  camping: boolean;
  kids_friendly: boolean;
  astrophoto_focused: boolean;
  telescopes_provided: boolean;
  capacity: number | null;
  registered_count: number;
  organizer_name: string;
  organizer_verified: boolean;
  description: string;
  observed_targets: string[] | null;
  rules: string[] | null;
  source_name: string | null;
  source_last_verified_at: string | null;
  event_sessions: EventSessionRow[] | null;
}

function num(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapEventRow(row: EventRow): AstroEvent {
  const latitude = num(row.latitude);
  const longitude = num(row.longitude);

  return {
    slug: row.slug,
    title: row.title,
    type: row.event_type as EventType,
    city: row.city,
    venue: row.venue,
    coords:
      latitude !== null && longitude !== null
        ? { latitude, longitude }
        : undefined,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    free: row.free,
    camping: row.camping,
    kidsFriendly: row.kids_friendly,
    astrophotoFocused: row.astrophoto_focused,
    telescopesProvided: row.telescopes_provided,
    capacity: row.capacity ?? undefined,
    registered: row.registered_count,
    organizer: { name: row.organizer_name, verified: row.organizer_verified },
    description: row.description,
    program: [...(row.event_sessions ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((session) => ({
        time: session.starts_at,
        title: session.title,
        ...(session.speaker ? { speaker: session.speaker } : {}),
      })),
    observedTargets: row.observed_targets ?? [],
    rules: row.rules && row.rules.length > 0 ? row.rules : undefined,
    gradient: gradientFromSeed(row.slug),
    source: {
      name: row.source_name ?? 'Astrohub kaydı',
      lastVerifiedAt: row.source_last_verified_at ?? '',
    },
  };
}

async function fetchEvents(client: SupabaseClient): Promise<AstroEvent[]> {
  const { data, error } = await client
    .from('events')
    .select(
      'slug, title, event_type, city, venue, latitude, longitude, starts_at, ' +
        'ends_at, free, camping, kids_friendly, astrophoto_focused, ' +
        'telescopes_provided, capacity, registered_count, organizer_name, ' +
        'organizer_verified, description, observed_targets, rules, ' +
        'source_name, source_last_verified_at, ' +
        'event_sessions(starts_at, title, speaker, position)'
    )
    .eq('status', 'published')
    .order('starts_at');

  if (error) throw new Error(error.message);
  return (data as unknown as EventRow[]).map(mapEventRow);
}

/** Etkinlik kataloğu: veritabanı varsa oradan, yoksa tohum diziden. */
export function useEventCatalog(): ContentSelection<AstroEvent> {
  return useCatalog('etkinlik', eventsSeed, fetchEvents);
}

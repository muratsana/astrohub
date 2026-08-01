import type { SupabaseClient } from '@supabase/supabase-js';
import { broadcasts as broadcastSeed } from '@/features/tv/data';
import {
  isValidYoutubeId,
  type Broadcast,
  type BroadcastKind,
  type YoutubeRef,
} from '@/features/tv/types';
import { useCatalog } from './useCatalog';
import type { ContentSelection } from './select';

/**
 * TV PROGRAMI — satırdan arayüz kaydına.
 *
 * Biçimi bozuk kimlik taşıyan satır **atılır**, düzeltilmeye çalışılmaz.
 * Bu alan `<iframe src>` yolunda; şüpheli bir değeri "belki çalışır"
 * diye geçirmek, oynatıcıyı bilinmeyen bir adrese açma riskini kabul
 * etmek olur. Veritabanı kısıtı zaten aynı biçimi zorluyor — buraya
 * düşen bir satır varsa o satır başka bir yoldan gelmiştir ve şüphelidir.
 */

interface BroadcastRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: BroadcastKind;
  ref_kind: YoutubeRef;
  youtube_id: string;
  starts_at: string | null;
  ends_at: string | null;
  position: number;
}

export function mapBroadcastRow(row: BroadcastRow): Broadcast | null {
  if (!isValidYoutubeId(row.ref_kind, row.youtube_id)) return null;

  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    kind: row.kind,
    refKind: row.ref_kind,
    id: row.id,
    youtubeId: row.youtube_id,
    startsAt: row.starts_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
    position: row.position,
  };
}

async function fetchBroadcasts(client: SupabaseClient): Promise<Broadcast[]> {
  const { data, error } = await client
    .from('tv_broadcasts')
    .select(
      'id, slug, title, description, kind, ref_kind, youtube_id, starts_at, ends_at, position'
    )
    .eq('published', true)
    .order('position');

  if (error) throw new Error(error.message);

  return (data as unknown as BroadcastRow[])
    .map(mapBroadcastRow)
    .filter((item): item is Broadcast => item !== null);
}

/** Astrohub.tv programı: veritabanı varsa oradan, yoksa tohum diziden. */
export function useBroadcastCatalog(): ContentSelection<Broadcast> {
  return useCatalog('tv', broadcastSeed, fetchBroadcasts);
}

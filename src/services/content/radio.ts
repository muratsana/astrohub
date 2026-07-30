import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { hasNetworkAccess } from '@/lib/runtime';
import type { RadioTrack, TrackSource } from '@/features/radio/types';

/**
 * RADYO YAYIN LİSTESİ — veritabanı katmanı (QA FUNC-04).
 *
 * BU KATMAN OLMADAN YÖNETİM PANELİ BİR HİÇE YAZIYORDU: editör
 * `radio_tracks` tablosuna parça ekliyordu ama oynatıcı uygulamanın
 * içindeki sabit (ve bilerek boş) diziyi okuyordu. Eklenen parça hiçbir
 * dinleyiciye ulaşmıyordu. Diğer kataloglarla aynı desen burada da
 * kuruldu: tablo otorite, tohum yalnızca yapılandırmasız ortamın yedeği.
 *
 * YALNIZCA YAYINDAKİLER. `published = true` filtresi taslakları dışarıda
 * tutar; RLS zaten aynı sınırı çiziyor (yalnızca yayında olanlar anon'a
 * açık), buradaki filtre onun yerine geçmiyor, niyeti okunur kılıyor.
 */

interface RadioRow {
  id: string;
  title: string;
  artist: string;
  source: TrackSource;
  /** mp3 → `radio` bucket'ındaki nesne yolu; spotify → tam parça adresi. */
  path: string;
  duration_sec: number | null;
  note: string | null;
}

/**
 * `radio` bucket'ındaki nesnenin genel adresi. Yol saklanır, URL üretilir
 * — proje/CDN adresi değişirse satırlar elden geçmez (şema kararı, 0004).
 */
export function radioPublicUrl(path: string): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}/storage/v1/object/public/radio/${path}`;
}

/** Satırları oynatıcı modeline çevirir; adresi kurulamayan satır atlanır. */
export function mapRadioRows(rows: RadioRow[]): RadioTrack[] {
  const tracks: RadioTrack[] = [];
  for (const row of rows) {
    const url = row.source === 'spotify' ? row.path : radioPublicUrl(row.path);
    if (!url) continue;
    tracks.push({
      id: row.id,
      title: row.title,
      artist: row.artist,
      source: row.source,
      url,
      durationSec: row.duration_sec ?? undefined,
      note: row.note ?? undefined,
    });
  }
  return tracks;
}

/** StrictMode çift mount'u ve rota değişimleri tek isteğe iner. */
let inflight: Promise<RadioTrack[] | null> | null = null;

/**
 * Yayındaki parçaları getirir. Yapılandırma ya da ağ yoksa `null` —
 * çağıran tohum listeyle (bilerek boş) devam eder; radyo çalışmayan bir
 * özellik değil, henüz parça eklenmemiş bir özellik olarak görünür.
 */
export function fetchRadioTracks(): Promise<RadioTrack[] | null> {
  if (!isSupabaseConfigured || !hasNetworkAccess) {
    return Promise.resolve(null);
  }

  inflight ??= (async () => {
    try {
      const clientPromise = getSupabase();
      if (!clientPromise) return null;
      const supabase = await clientPromise;
      const { data, error } = await supabase
        .from('radio_tracks')
        .select('id, title, artist, source, path, duration_sec, note')
        .eq('published', true)
        .order('position');
      if (error) return null;
      return mapRadioRows((data ?? []) as unknown as RadioRow[]);
    } catch {
      return null;
    }
  })();

  return inflight;
}

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  sites as sitesSeed,
  type ObservingSite,
} from '@/features/observing-sites/data';
import { gradientFromSeed } from '@/components/media/tints';
import { useCatalog } from './useCatalog';
import type { ContentSelection } from './select';

/**
 * GÖZLEM NOKTASI KATALOĞU.
 *
 * Koordinat kolonu adıyla `approx_` önekli geliyor ve arayüz tipi de bunu
 * "yaklaşık" olarak belgeliyor (§15.3). Eşleyici burada bir dönüşüm
 * yapmıyor — yapacak bir şey yok, çünkü tam koordinat hiç saklanmıyor.
 * Önek yalnızca okuyanın ne gördüğünü bilmesi için.
 *
 * `rating` / `reviewCount` tetikleyicinin `site_reviews` üzerinden
 * türettiği değerler; değerlendirme yoksa sıfırdır. Tohum verideki demo
 * puanlar veritabanına taşınmadı, dolayısıyla veritabanı kaynağında bir
 * nokta "0.0 / 5" görünebilir — bu doğru, olmayan değerlendirmeyi var
 * göstermekten iyidir.
 */

interface SiteRow {
  slug: string;
  name: string;
  region: string;
  approx_latitude: number | string;
  approx_longitude: number | string;
  altitude_m: number | null;
  bortle: number | null;
  sqm: number | string | null;
  road_access: string | null;
  south_horizon: string | null;
  best_months: string | null;
  has_water: boolean;
  has_toilet: boolean;
  has_electricity: boolean;
  has_cell_signal: boolean;
  has_tent_area: boolean;
  caravan_ok: boolean;
  description: string;
  warnings: string[] | null;
  rating: number | string;
  review_count: number;
}

function num(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapSiteRow(row: SiteRow): ObservingSite {
  return {
    slug: row.slug,
    name: row.name,
    region: row.region,
    coords: {
      latitude: num(row.approx_latitude) ?? 0,
      longitude: num(row.approx_longitude) ?? 0,
    },
    bortle: row.bortle ?? 0,
    sqm: num(row.sqm) ?? undefined,
    altitude: row.altitude_m ?? 0,
    roadAccess: (row.road_access ?? 'Stabilize') as ObservingSite['roadAccess'],
    facilities: {
      water: row.has_water,
      toilet: row.has_toilet,
      electricity: row.has_electricity,
      cellSignal: row.has_cell_signal,
      tentArea: row.has_tent_area,
      caravanOk: row.caravan_ok,
    },
    southHorizon: (row.south_horizon ??
      'Kısmen açık') as ObservingSite['southHorizon'],
    bestMonths: row.best_months ?? '',
    description: row.description,
    warnings:
      row.warnings && row.warnings.length > 0 ? row.warnings : undefined,
    gradient: gradientFromSeed(row.slug),
    rating: num(row.rating) ?? 0,
    reviewCount: row.review_count,
  };
}

async function fetchSites(client: SupabaseClient): Promise<ObservingSite[]> {
  const { data, error } = await client
    .from('observing_sites')
    .select(
      'slug, name, region, approx_latitude, approx_longitude, altitude_m, ' +
        'bortle, sqm, road_access, south_horizon, best_months, has_water, ' +
        'has_toilet, has_electricity, has_cell_signal, has_tent_area, ' +
        'caravan_ok, description, warnings, rating, review_count'
    )
    .eq('status', 'published')
    .order('name');

  if (error) throw new Error(error.message);
  return (data as unknown as SiteRow[]).map(mapSiteRow);
}

/** Gözlem noktaları: veritabanı varsa oradan, yoksa tohum diziden. */
export function useSiteCatalog(): ContentSelection<ObservingSite> {
  return useCatalog('gozlem-noktasi', sitesSeed, fetchSites);
}

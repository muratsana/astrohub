import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import type {
  AstroFilterSpec,
  FilterCategoryCode,
  MarketBandLabel,
  SpectralLineCode,
} from '@/domain/equipment/spectrum';
import { SPECTRAL_LINES } from '@/domain/equipment/spectrum';

/**
 * FİLTRE SPEKTRAL VERİSİ — `astro_filter_*` tablolarından.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `useCatalog` DEĞİL
 *
 * `useCatalog` her okumayı bir tohum diziyle eşleştiriyor: veritabanı
 * yoksa koddaki liste gösteriliyor. Burada tohum YOK ve olmamalı —
 * spektral veri 99 ürünlük bir tablo ve onu uygulamanın içine gömmek,
 * ilk rota paketine hiç kullanılmayan bir sözlük eklemek olurdu.
 *
 * Veri yoksa arayüz spektral bölümü HİÇ ÇİZMİYOR. Filtre kartı ve künye
 * `equipment_models` üzerinden zaten çalışıyor; spektral şerit bir ek
 * katman, olmazsa olmaz değil.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TEK SORGU, TÜM FİLTRELER
 *
 * Ürün başına ayrı sorgu atmak, katalog sayfasında 99 istek demekti.
 * Tablo küçük (99 satır + 92 bant) ve tamamı tek seferde inip beş dakika
 * önbellekte duruyor — kataloğun geri kalanıyla aynı `staleTime`.
 */

interface PassbandRow {
  bandwidth_nm: number | string | null;
  astro_spectral_lines: { code: string } | null;
}

interface ProductRow {
  slug: string;
  market_band_label: string;
  emission_line_count: number | null;
  pass_window_count: number | null;
  bandwidth_min_nm: number | string | null;
  bandwidth_max_nm: number | string | null;
  fast_optics_profile: string | null;
  is_discontinued: boolean;
  notes: string | null;
  astro_filter_categories: { code: string } | null;
  astro_filter_passbands: PassbandRow[] | null;
}

/** `numeric` kolonlar PostgREST'ten METİN gelir (bkz. `content/equipment.ts`). */
function num(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isLineCode(value: string): value is SpectralLineCode {
  return value in SPECTRAL_LINES;
}

const CATEGORY_CODES: FilterCategoryCode[] = [
  'broadband',
  'single_line_narrowband',
  'dual_band',
  'triple_band',
  'quad_band',
];

const BAND_LABELS: MarketBandLabel[] = [
  'broadband',
  'single',
  'dual',
  'triple',
  'quad',
  'unknown',
];

function toSpec(row: ProductRow): AstroFilterSpec | null {
  const categoryCode = row.astro_filter_categories?.code;
  if (!categoryCode || !CATEGORY_CODES.includes(categoryCode as FilterCategoryCode)) {
    return null;
  }
  const marketBand = BAND_LABELS.includes(row.market_band_label as MarketBandLabel)
    ? (row.market_band_label as MarketBandLabel)
    : 'unknown';

  return {
    slug: row.slug,
    categoryCode: categoryCode as FilterCategoryCode,
    marketBand,
    emissionLineCount: row.emission_line_count,
    passWindowCount: row.pass_window_count,
    bandwidthMinNm: num(row.bandwidth_min_nm),
    bandwidthMaxNm: num(row.bandwidth_max_nm),
    fastOpticsProfile: row.fast_optics_profile,
    isDiscontinued: row.is_discontinued,
    notes: row.notes,
    passbands: (row.astro_filter_passbands ?? [])
      .map((pb) => {
        const code = pb.astro_spectral_lines?.code;
        if (!code || !isLineCode(code)) return null;
        return { line: code, bandwidthNm: num(pb.bandwidth_nm) };
      })
      .filter((pb): pb is { line: SpectralLineCode; bandwidthNm: number | null } =>
        pb !== null
      ),
  };
}

async function fetchSpecs(client: SupabaseClient): Promise<AstroFilterSpec[]> {
  const { data, error } = await client
    .from('astro_filter_products')
    .select(
      'slug, market_band_label, emission_line_count, pass_window_count,' +
        ' bandwidth_min_nm, bandwidth_max_nm, fast_optics_profile,' +
        ' is_discontinued, notes,' +
        ' astro_filter_categories ( code ),' +
        ' astro_filter_passbands ( bandwidth_nm, astro_spectral_lines ( code ) )'
    )
    /* Ekipman kaydına bağlanmamış satır listelenmiyor: bağ yoksa kullanıcı
       o filtreye zaten gidemiyor ve künyesiz bir spektrum göstermek,
       tıklanamayan bir kart üretirdi. */
    .not('equipment_model_id', 'is', null);

  if (error) throw error;
  return ((data ?? []) as unknown as ProductRow[])
    .map(toSpec)
    .filter((spec): spec is AstroFilterSpec => spec !== null);
}

/** Slug → spektral künye. Veri yoksa boş `Map` döner (hata değil, yokluk). */
export function useFilterSpectra(): {
  specs: Map<string, AstroFilterSpec>;
  loading: boolean;
} {
  const query = useQuery({
    queryKey: ['katalog', 'filtre-spektrum'],
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const clientPromise = getSupabase();
      if (!clientPromise) return [] as AstroFilterSpec[];
      return fetchSpecs(await clientPromise);
    },
  });

  return {
    specs: new Map((query.data ?? []).map((spec) => [spec.slug, spec])),
    loading: isSupabaseConfigured && query.isPending,
  };
}

/** Tek bir filtrenin künyesi — detay sayfası için. */
export function useFilterSpectrum(slug: string | undefined): AstroFilterSpec | null {
  const { specs } = useFilterSpectra();
  return slug ? (specs.get(slug) ?? null) : null;
}

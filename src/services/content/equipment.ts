import type { SupabaseClient } from '@supabase/supabase-js';
import {
  equipment as equipmentSeed,
  type EquipmentCategory,
  type EquipmentModel,
} from '@/features/equipment/data';
import { mergeSpecs } from '@/domain/equipment/specs';
import { isConnectionStandard } from '@/domain/equipment/connections';
import type {
  DataConfidence,
  EquipmentOptics,
  EquipmentSource,
  ProductionStatus,
} from '@/features/equipment/data';
import { getSupabase } from '@/services/supabase/client';
import { useCatalog } from './useCatalog';
import type { ContentSelection } from './select';
import { useQuery } from '@tanstack/react-query';

/**
 * EKİPMAN KATALOĞU — veritabanı satırından arayüz modeline.
 *
 * Şema iki katmanlı (§9.2): sık filtrelenen alanlar typed kolon, gerisi
 * JSONB. Arayüz ise tek bir `specs` sözlüğü bekliyor. Birleştirme
 * `domain/equipment/specs.ts` içinde ve tersi (metin → kolon) ile aynı
 * dosyada duruyor; ikisi ayrı yerlerde yaşarsa biri değişip diğeri
 * değişmediğinde künye sessizce bozulur. Gidiş-dönüş testi bunu tohum
 * verinin tamamı üzerinde her koşuda doğruluyor.
 */

interface EquipmentRow {
  id: string;
  slug: string;
  model: string;
  category_id: string;
  summary: string | null;
  price_hint: string | null;
  focal_length_mm: number | string | null;
  aperture_mm: number | string | null;
  pixel_size_um: number | string | null;
  payload_capacity_kg: number | string | null;
  weight_kg: number | string | null;
  specs: Record<string, string> | null;
  notes: string[] | null;
  equipment_brands: { name: string } | null;

  /* ── Setup planlayıcısı alanları (0014) ── */
  connection_input: string | null;
  connection_output: string | null;
  clear_aperture_mm: number | string | null;
  image_circle_mm: number | string | null;
  optical_length_mm: number | string | null;
  required_backfocus_mm: number | string | null;
  flange_distance_mm: number | string | null;
  optic_factor: number | string | null;
  filter_thickness_mm: number | string | null;
  prism_size_mm: number | string | null;
  production_status: string | null;
  release_year: number | null;
  discontinued_year: number | null;
  sources: EquipmentSource[] | null;
  verified_at: string | null;
  data_confidence: string | null;
}

/**
 * `numeric` kolonları supabase-js'e **metin** olarak gelir.
 *
 * PostgREST, JavaScript'in çift duyarlıklı sayısında kaybolabilecek
 * değerleri korumak için numeric'i string serileştirir. Doğrudan
 * `row.focal_length_mm` kullanmak `'550'` verir ve `formatTypedSpecs`
 * içinde `'550 mm'` yerine yine `'550 mm'` üretir ama aritmetik yapan her
 * çağrı ("550" + 1 = "5501") sessizce bozulur. Sınırda bir kez çeviriyoruz.
 */
function num(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const PRODUCTION_STATUSES: ProductionStatus[] = [
  'guncel',
  'uretimi-durduruldu',
  'eski-model',
  'bilinmiyor',
];

const CONFIDENCES: DataConfidence[] = [
  'dogrulanmis',
  'tek-kaynak',
  'inceleme-gerekli',
];

/**
 * Bağlantı standardı listede yoksa **atılır**.
 *
 * Serbest metin bir bağlantı ("M48 vidalı") uyumluluk kontrolünde
 * hiçbir şeyle eşleşmez ama alan dolu göründüğü için motor "veri var"
 * sanar ve sessizce "adaptör gerekli" der. Tanımadığımız değeri hiç
 * almamak, motorun dürüstçe "veri yetersiz" demesini sağlıyor.
 */
function asConnection(value: string | null) {
  return value && isConnectionStandard(value) ? value : undefined;
}

/**
 * Optik alanları yalnızca dolu olanlarla kurar.
 *
 * `{ factor: undefined }` ile `undefined` arasındaki fark tohum veriyle
 * gidiş-dönüş testinde ortaya çıkıyor: boş bir nesne, tohumda hiç
 * olmayan bir alanı "var ama boş" hâline getiriyordu.
 */
function opticsOf(row: EquipmentRow): EquipmentOptics | undefined {
  const entries: [keyof EquipmentOptics, number | null][] = [
    ['clearApertureMm', num(row.clear_aperture_mm)],
    ['imageCircleMm', num(row.image_circle_mm)],
    ['opticalLengthMm', num(row.optical_length_mm)],
    ['requiredBackfocusMm', num(row.required_backfocus_mm)],
    ['flangeDistanceMm', num(row.flange_distance_mm)],
    ['factor', num(row.optic_factor)],
    ['filterThicknessMm', num(row.filter_thickness_mm)],
    ['prismSizeMm', num(row.prism_size_mm)],
  ];

  const optics: EquipmentOptics = {};
  let any = false;
  for (const [key, value] of entries) {
    if (value === null) continue;
    optics[key] = value;
    any = true;
  }
  return any ? optics : undefined;
}

export function mapEquipmentRow(row: EquipmentRow): EquipmentModel {
  const input = asConnection(row.connection_input);
  const output = asConnection(row.connection_output);
  const status = PRODUCTION_STATUSES.find((s) => s === row.production_status);
  const confidence = CONFIDENCES.find((c) => c === row.data_confidence);

  return {
    id: row.id,
    slug: row.slug,
    brand: row.equipment_brands?.name ?? '—',
    model: row.model,
    category: row.category_id as EquipmentCategory,
    specs: mergeSpecs(
      {
        apertureMm: num(row.aperture_mm),
        focalLengthMm: num(row.focal_length_mm),
        pixelSizeUm: num(row.pixel_size_um),
        payloadCapacityKg: num(row.payload_capacity_kg),
        weightKg: num(row.weight_kg),
      },
      row.specs
    ),
    priceHint: row.price_hint ?? undefined,
    summary: row.summary ?? undefined,
    notes: row.notes && row.notes.length > 0 ? row.notes : undefined,

    connections: input || output ? { input, output } : undefined,
    optics: opticsOf(row),
    /* 'bilinmiyor' şemanın varsayılanı; tohum veride o alan hiç yok.
       Alanı yazmak, iki kaynağı ayrıştırır ve gidiş-dönüş testini bozar. */
    productionStatus: status && status !== 'bilinmiyor' ? status : undefined,
    releaseYear: row.release_year ?? undefined,
    discontinuedYear: row.discontinued_year ?? undefined,
    sources: row.sources && row.sources.length > 0 ? row.sources : undefined,
    verifiedAt: row.verified_at ?? undefined,
    confidence,
  };
}

/**
 * Katalog sorgusunun alan listesi.
 *
 * İki yerde (tam katalog ve sayfalı sorgu) kullanılıyor; ayrı ayrı
 * yazılsaydı biri güncellenip diğeri unutulduğunda eksik alanla dönen
 * kayıtlar sessizce "veri yok" gibi görünürdü.
 */
const CATALOG_SELECT =
  'id, slug, model, category_id, summary, price_hint, focal_length_mm, ' +
  'aperture_mm, pixel_size_um, payload_capacity_kg, weight_kg, ' +
  'specs, notes, equipment_brands(name), ' +
  'connection_input, connection_output, clear_aperture_mm, ' +
  'image_circle_mm, optical_length_mm, required_backfocus_mm, ' +
  'flange_distance_mm, optic_factor, filter_thickness_mm, ' +
  'prism_size_mm, production_status, release_year, discontinued_year, ' +
  'sources, verified_at, data_confidence';

/** `canonical_model_id` henüz yok mu (şema kodun gerisinde)? */
function kanonikKolonuYok(error: { code?: string; message?: string }): boolean {
  if (['42703', 'PGRST204', 'PGRST200'].includes(error.code ?? '')) return true;
  return /canonical_model_id|schema cache|does not exist/i.test(
    error.message ?? ''
  );
}

/*
 * BİRLEŞTİRİLMİŞ MÜKERRERLER LİSTEDE GÖRÜNMEZ (F03).
 *
 * `canonical_model_id` dolu bir satır, başka bir kayda birleştirilmiş
 * mükerrerdir: referansları kanoniğe taşındı, eski slug'ı alias olarak
 * yaşıyor. Satır silinmiyor (künye ve geri alma için duruyor) ama
 * seçim listelerinde iki kez aynı ürünü göstermek, birleştirmenin
 * amacını boşa çıkarırdı.
 *
 * Kolon yoksa (şema geride) süzgeç uygulanmıyor — galeri deneyiminde
 * öğrenildiği gibi, eksik bir kolon bütün kataloğu düşürmemeli.
 */
async function fetchEquipment(client: SupabaseClient): Promise<EquipmentModel[]> {
  const { data, error } = await client
    .from('equipment_models')
    .select(CATALOG_SELECT)
    .is('canonical_model_id', null)
    .order('category_id')
    .order('model');

  if (error && kanonikKolonuYok(error)) {
    const yedek = await client
      .from('equipment_models')
      .select(CATALOG_SELECT)
      .order('category_id')
      .order('model');
    if (yedek.error) throw new Error(yedek.error.message);
    return (yedek.data as unknown as EquipmentRow[]).map(mapEquipmentRow);
  }

  if (error) throw new Error(error.message);
  return (data as unknown as EquipmentRow[]).map(mapEquipmentRow);
}

/** Ekipman kataloğu: veritabanı varsa oradan, yoksa tohum diziden. */
export function useEquipmentCatalog(): ContentSelection<EquipmentModel> {
  return useCatalog('ekipman', equipmentSeed, fetchEquipment);
}

/* ══════════════════════════════════════════════════════════════════════
   SUNUCU TARAFLI ARAMA VE SAYFALAMA (şartname G14)
   ══════════════════════════════════════════════════════════════════════ */

/**
 * NEDEN GEREKLİ: katalog bugüne kadar tümüyle tarayıcıya iniyor ve
 * filtreleme istemcide yapılıyordu. 129 modelde bu sorun çıkarmıyor —
 * ama şartnamenin açık maddesi ve sebebi ölçekte belli oluyor: katalog
 * birkaç bine çıktığında her ziyaretçi, hiç bakmayacağı yüzlerce kaydın
 * teknik künyesini indiriyor olacak.
 *
 * TOHUM DİZİ HÂLÂ YEDEK. Veritabanı yoksa aynı sorgu bellekte
 * çalıştırılıyor; site yapılandırılmamış bir ortamda da katalogla
 * çalışmaya devam ediyor. İki yolun aynı sonucu vermesi test edilebilir
 * olsun diye eleme ve sıralama saf bir fonksiyonda duruyor.
 */

export interface CatalogQuery {
  /** Serbest metin — marka ve model üzerinde aranır. */
  search?: string;
  category?: EquipmentCategory | 'hepsi';
  brand?: string;
  /** Sayfa numarası, 0 tabanlı. */
  page?: number;
  /** Sayfa başına kayıt. */
  pageSize?: number;
}

export interface CatalogPage {
  items: EquipmentModel[];
  /** Süzgeçlere uyan TOPLAM kayıt — sayfadaki değil. */
  total: number;
  page: number;
  pageSize: number;
  /** Veritabanından mı geldi, tohum diziden mi? */
  durable: boolean;
}

export const CATALOG_PAGE_SIZE = 24;

/**
 * Aynı elemeyi bellekte uygular — veritabanı yokken ve testlerde.
 *
 * Türkçe karşılaştırma `toLocaleLowerCase('tr-TR')` ile: "İ" harfi
 * JavaScript'in varsayılan küçültmesinde "i̇" (iki kod noktası) oluyor
 * ve "ilan" araması "İLAN" başlığını bulamıyor.
 */
export function filterCatalog(
  models: EquipmentModel[],
  query: CatalogQuery
): EquipmentModel[] {
  const q = (query.search ?? '').trim().toLocaleLowerCase('tr-TR');

  return models.filter((model) => {
    if (
      query.category &&
      query.category !== 'hepsi' &&
      model.category !== query.category
    ) {
      return false;
    }
    if (query.brand && model.brand !== query.brand) return false;
    if (!q) return true;
    return `${model.brand} ${model.model}`
      .toLocaleLowerCase('tr-TR')
      .includes(q);
  });
}

/** Bellekte sayfalama — veritabanı yokken aynı sözleşmeyi üretir. */
export function paginate(
  models: EquipmentModel[],
  query: CatalogQuery
): CatalogPage {
  const pageSize = query.pageSize ?? CATALOG_PAGE_SIZE;
  const page = Math.max(0, query.page ?? 0);
  const matched = filterCatalog(models, query);
  const start = page * pageSize;

  return {
    items: matched.slice(start, start + pageSize),
    total: matched.length,
    page,
    pageSize,
    durable: false,
  };
}

/**
 * Sunucuda eleyip sayfalar.
 *
 * `count: 'exact'` toplamı sunucudan alıyor: "kaç sonuç var" sorusunun
 * cevabı için tüm kayıtları indirmek, sayfalamanın varlık sebebini yok
 * ederdi. `range` PostgREST'in kapsayıcı aralığı — son indeks dahil,
 * bu yüzden `-1`.
 */
export async function fetchCatalogPage(
  query: CatalogQuery
): Promise<CatalogPage> {
  const pageSize = query.pageSize ?? CATALOG_PAGE_SIZE;
  const page = Math.max(0, query.page ?? 0);

  const clientPromise = getSupabase();
  if (!clientPromise) return paginate(equipmentSeed, query);

  const client = await clientPromise;
  let request = client
    .from('equipment_models')
    .select(CATALOG_SELECT, { count: 'exact' })
    /* Birleştirilmiş mükerrerler gözat listesinde de görünmez (F03). */
    .is('canonical_model_id', null)
    .order('category_id')
    .order('model')
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (query.category && query.category !== 'hepsi') {
    request = request.eq('category_id', query.category);
  }
  if (query.brand) {
    /* Marka ayrı tabloda; PostgREST gömülü kaynağa göre elemeyi
       `equipment_brands.name` yoluyla kabul ediyor. */
    request = request.eq('equipment_brands.name', query.brand);
  }
  if (query.search?.trim()) {
    /* `ilike` Postgres tarafında büyük/küçük harf duyarsız — Türkçe
       harfler için de veritabanının kendi harmanlaması geçerli. */
    request = request.ilike('model', `%${query.search.trim()}%`);
  }

  const { data, error, count } = await request;
  if (error) throw new Error(error.message);

  return {
    items: (data as unknown as EquipmentRow[]).map(mapEquipmentRow),
    total: count ?? 0,
    page,
    pageSize,
    durable: true,
  };
}

/** Katalog ekranının gerçek sunucu sayfası; önceki sayfayı geçişte korur. */
export function useEquipmentCatalogPage(query: CatalogQuery) {
  const result = useQuery({
    queryKey: ['ekipman-sayfa', query],
    queryFn: () => fetchCatalogPage(query),
    placeholderData: (previous) => previous ?? paginate(equipmentSeed, query),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    page: result.data ?? paginate(equipmentSeed, query),
    loading: result.isFetching,
    error: result.error instanceof Error ? result.error.message : null,
    refresh: () => void result.refetch(),
  };
}

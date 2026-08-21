import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  siteTypeLabels,
  sites as sitesSeed,
  roadAccessOptions,
  type SiteType,
  type ObservingSite,
  type RoadAccess,
} from '@/features/observing-sites/data';
import { gradientFromSeed } from '@/components/media/tints';
import { useCatalog } from './useCatalog';
import type { ContentSelection } from './select';
import { sanitizeText } from '@/lib/sanitize';
import { threadSlug, slugSuffix } from './forum';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';

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
  id?: string;
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
  image_url: string | null;
  image_credit: string | null;
  image_licence: string | null;
  source_urls: { label?: unknown; url?: unknown }[] | null;
  rating: number | string;
  review_count: number;
}

/**
 * ══════════════════════════════════════════════════════════════════════
 * LİSTE SEÇİMİ — TEK PARÇA DİZE VE DIŞA AÇIK
 *
 * Bu dize canlıda `/saha` sayfasının tamamını devre dışı bıraktı.
 * İçinde tabloda OLMAYAN dört kolon vardı (`image_url`, `image_credit`,
 * `image_licence`, `source_urls`) ve PostgREST tek bir eksik kolonda
 * sorgunun tamamını 400'e düşürüyor. Katalog katmanı hatada tohum
 * veriye çekildiği için sayfa DOLU görünüyordu — yani veritabanındaki
 * gerçek sahalar aylarca kimseye gösterilmedi ve ortada bir hata
 * mesajı da yoktu.
 *
 * İki karar buradan çıktı:
 *
 *   · Dize BİRLEŞTİRİLMİYOR. PostgREST tipleri seçimi sabit dize olarak
 *     okuyor; `'a, ' + 'b'` yazıldığında satır tipi çözülemiyor ve geri
 *     dönen kayıtlar sessizce genel bir tipe düşüyor. Tip çözülseydi bu
 *     hata derlemede yakalanırdı.
 *   · Dize DIŞA AÇIK. Böylece testi, istediği kolonların eşleyicinin
 *     bildiği alanlarla örtüştüğünü doğrulayabiliyor.
 */
export const SITE_SELECT =
  'id, slug, name, region, approx_latitude, approx_longitude, altitude_m, bortle, sqm, road_access, south_horizon, best_months, has_water, has_toilet, has_electricity, has_cell_signal, has_tent_area, caravan_ok, description, warnings, image_url, image_credit, image_licence, source_urls, rating, review_count';

function deriveSiteType(row: SiteRow): SiteType {
  const raw = (row as { site_type?: unknown }).site_type;
  if (typeof raw === 'string' && raw in siteTypeLabels) return raw as SiteType;
  if (row.has_tent_area || row.caravan_ok) return 'camping';
  return 'arazi';
}

function num(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sourceUrls(row: SiteRow): ObservingSite['sourceUrls'] {
  if (!Array.isArray(row.source_urls)) return undefined;
  const sources = row.source_urls
    .map((source) => ({
      label: typeof source.label === 'string' ? source.label : '',
      url: typeof source.url === 'string' ? source.url : '',
    }))
    .filter((source) => source.label && source.url);
  return sources.length > 0 ? sources : undefined;
}

export function mapSiteRow(row: SiteRow): ObservingSite {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    region: row.region,
    coords: {
      latitude: num(row.approx_latitude) ?? 0,
      longitude: num(row.approx_longitude) ?? 0,
    },
    siteType: deriveSiteType(row),
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
    image:
      row.image_url && row.image_credit
        ? {
            url: row.image_url,
            credit: row.image_credit,
            licence: row.image_licence ?? '',
          }
        : undefined,
    sourceUrls: sourceUrls(row),
  };
}

async function fetchSites(client: SupabaseClient): Promise<ObservingSite[]> {
  const { data, error } = await client
    .from('observing_sites')
    .select(SITE_SELECT)
    .eq('status', 'yayinda')
    /*
     * SİLİNMİŞ KAYIT PUBLIC LİSTEDE DURMAZ.
     *
     * RLS bunu tek başına halletmiyor ve bu bilinçli: okuma politikası
     * `app.icerik_gorunur(status, deleted_at)` YANINDA sahiplik ve rol
     * dallarını da taşıyor (`or seller_id = auth.uid() or app.is_admin()
     * or app.has_role('moderator')`) — sahibi kendi taslağını, yönetici
     * de her kaydı görebilsin diye. Sonuç olarak soft-delete edilmiş bir
     * kayıt, SAHİBİNE ve YÖNETİCİYE public sayfada görünmeye devam
     * ediyordu; panel ise aynı kayıt için "public'te görünmüyor" diyordu.
     *
     * Ziyaretçi için sızıntı yok (onda yalnızca `icerik_gorunur` dalı
     * çalışıyor), ama sahibi hangi ilanın canlı hangisinin silinmiş
     * olduğunu ayırt edemiyordu. Süzgeç bu yüzden sorguda.
     */
    .is('deleted_at', null)
    .order('name');

  if (error) throw new Error(error.message);
  return (data as unknown as SiteRow[]).map(mapSiteRow);
}

/** Gözlem noktaları: veritabanı varsa oradan, yoksa tohum diziden. */
export function useSiteCatalog(): ContentSelection<ObservingSite> {
  return useCatalog('gozlem-noktasi', sitesSeed, fetchSites);
}

export interface NewSiteInput {
  userId: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  bortle: number;
  sqm?: number;
  altitude?: number;
  roadAccess: RoadAccess;
  description: string;
  tentArea: boolean;
  caravanOk: boolean;
}

export function validateSiteContribution(input: NewSiteInput): string | null {
  if (sanitizeText(input.name).length < 5) return 'Saha adı gerekli.';
  if (sanitizeText(input.region).length < 2) return 'İl/konum gerekli.';
  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90
  ) {
    return 'Enlem -90 ile 90 arasında olmalı.';
  }
  if (
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    return 'Boylam -180 ile 180 arasında olmalı.';
  }
  if (!Number.isInteger(input.bortle) || input.bortle < 1 || input.bortle > 9) {
    return 'Bortle 1–9 arasında olmalı.';
  }
  if (input.sqm !== undefined && (input.sqm < 15 || input.sqm > 23)) {
    return 'SQM 15–23 arasında olmalı.';
  }
  if (sanitizeText(input.description, { multiline: true }).length < 20) {
    return 'Açıklama en az 20 karakter olmalı.';
  }
  if (!roadAccessOptions.includes(input.roadAccess)) {
    return 'Yol tipi geçersiz.';
  }
  return null;
}

/** Saha katkısı onay bekleyen kayıt olarak açılır. */
export async function createSiteContribution(
  input: NewSiteInput
): Promise<string> {
  const problem = validateSiteContribution(input);
  if (problem) throw new Error(problem);

  const name = sanitizeText(input.name, { maxLength: 160 });
  const slug = threadSlug(name, slugSuffix());
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  const supabase = await promise;

  const { error } = await supabase.from('observing_sites').insert({
    slug,
    name,
    region: sanitizeText(input.region, { maxLength: 80 }),
    status: 'incelemede',
    approx_latitude: Number(input.latitude.toFixed(4)),
    approx_longitude: Number(input.longitude.toFixed(4)),
    altitude_m: input.altitude ?? null,
    road_access: input.roadAccess,
    bortle: input.bortle,
    sqm: input.sqm ?? null,
    has_tent_area: input.tentArea,
    caravan_ok: input.caravanOk,
    description: sanitizeText(input.description, {
      multiline: true,
      maxLength: 4000,
    }),
    submitted_by: input.userId,
  });

  if (error) throw new Error(error.message);
  return slug;
}

export interface LightPollutionMeasurement {
  id: string;
  siteId?: string;
  userId?: string;
  measuredAt: string;
  latitude: number;
  longitude: number;
  sqm?: number;
  bortle?: number;
  method: string;
  equipmentType: string;
  equipmentName: string;
  skyCondition: string;
  transparency: string;
  moonPhase: string;
  moonIllumination?: number;
  note: string;
  createdAt: string;
}

interface LightPollutionMeasurementRow {
  id: string;
  site_id: string | null;
  user_id: string | null;
  measured_at: string;
  latitude: number | string;
  longitude: number | string;
  sqm: number | string | null;
  bortle: number | null;
  method: string | null;
  equipment_type: string | null;
  equipment_name: string | null;
  sky_condition: string | null;
  transparency: string | null;
  moon_phase: string | null;
  moon_illumination: number | string | null;
  note: string | null;
  created_at: string;
}

export interface NewLightPollutionMeasurementInput {
  userId: string;
  siteId?: string;
  latitude: number;
  longitude: number;
  measuredAt: Date;
  sqm?: number;
  bortle?: number;
  method: string;
  equipmentType: string;
  equipmentName: string;
  skyCondition: string;
  transparency: string;
  moonPhase: string;
  moonIllumination?: number;
  note: string;
}

const LIGHT_POLLUTION_SELECT =
  'id, site_id, user_id, measured_at, latitude, longitude, sqm, bortle, method, equipment_type, equipment_name, sky_condition, transparency, moon_phase, moon_illumination, note, created_at';

function mapLightPollutionMeasurementRow(
  row: LightPollutionMeasurementRow
): LightPollutionMeasurement {
  return {
    id: row.id,
    siteId: row.site_id ?? undefined,
    userId: row.user_id ?? undefined,
    measuredAt: row.measured_at,
    latitude: num(row.latitude) ?? 0,
    longitude: num(row.longitude) ?? 0,
    sqm: num(row.sqm) ?? undefined,
    bortle: row.bortle ?? undefined,
    method: row.method ?? '',
    equipmentType: row.equipment_type ?? '',
    equipmentName: row.equipment_name ?? '',
    skyCondition: row.sky_condition ?? '',
    transparency: row.transparency ?? '',
    moonPhase: row.moon_phase ?? '',
    moonIllumination: num(row.moon_illumination) ?? undefined,
    note: row.note ?? '',
    createdAt: row.created_at,
  };
}

export function validateLightPollutionMeasurement(
  input: NewLightPollutionMeasurementInput
): string | null {
  if (!input.userId) return 'Ölçüm eklemek için giriş yapmanız gerekir.';
  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90
  ) {
    return 'Enlem -90 ile 90 arasında olmalı.';
  }
  if (
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    return 'Boylam -180 ile 180 arasında olmalı.';
  }
  if (
    !(input.measuredAt instanceof Date) ||
    Number.isNaN(input.measuredAt.getTime())
  ) {
    return 'Ölçüm tarihi geçersiz.';
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (input.measuredAt > tomorrow) return 'Ölçüm tarihi gelecekte olamaz.';
  if (input.sqm === undefined && input.bortle === undefined) {
    return 'SQM veya Bortle değerlerinden en az biri gerekli.';
  }
  if (input.sqm !== undefined && (input.sqm < 15 || input.sqm > 23)) {
    return 'SQM 15–23 arasında olmalı.';
  }
  if (
    input.bortle !== undefined &&
    (!Number.isInteger(input.bortle) || input.bortle < 1 || input.bortle > 9)
  ) {
    return 'Bortle 1–9 arasında olmalı.';
  }
  if (
    input.moonIllumination !== undefined &&
    (input.moonIllumination < 0 || input.moonIllumination > 1)
  ) {
    return 'Ay aydınlanması 0–1 arasında olmalı.';
  }
  return null;
}

export async function createLightPollutionMeasurement(
  input: NewLightPollutionMeasurementInput
): Promise<string> {
  const problem = validateLightPollutionMeasurement(input);
  if (problem) throw new Error(problem);
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  const supabase = await promise;

  const { data, error } = await supabase
    .from('light_pollution_measurements')
    .insert({
      user_id: input.userId,
      site_id: input.siteId ?? null,
      latitude: Number(input.latitude.toFixed(6)),
      longitude: Number(input.longitude.toFixed(6)),
      measured_at: input.measuredAt.toISOString(),
      sqm: input.sqm ?? null,
      bortle: input.bortle ?? null,
      method: sanitizeText(input.method, { maxLength: 80 }),
      equipment_type: sanitizeText(input.equipmentType, { maxLength: 80 }),
      equipment_name: sanitizeText(input.equipmentName, { maxLength: 160 }),
      sky_condition: sanitizeText(input.skyCondition, { maxLength: 80 }),
      transparency: sanitizeText(input.transparency, { maxLength: 80 }),
      moon_phase: sanitizeText(input.moonPhase, { maxLength: 80 }),
      moon_illumination: input.moonIllumination ?? null,
      note: sanitizeText(input.note, { multiline: true, maxLength: 1200 }),
      status: 'yayinda',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return String(data.id);
}

export function useLightPollutionMeasurements(): {
  items: LightPollutionMeasurement[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [items, setItems] = useState<LightPollutionMeasurement[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const promise = getSupabase();
    if (!promise) {
      setItems([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    promise
      .then((supabase) =>
        supabase
          .from('light_pollution_measurements')
          .select(LIGHT_POLLUTION_SELECT)
          .is('deleted_at', null)
          .order('measured_at', { ascending: false })
          .limit(500)
      )
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) throw new Error(queryError.message);
        setItems(
          ((data ?? []) as unknown as LightPollutionMeasurementRow[]).map(
            mapLightPollutionMeasurementRow
          )
        );
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setItems([]);
        setError(e instanceof Error ? e.message : 'Ölçümler alınamadı');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tick]);

  return {
    items,
    loading,
    error,
    refresh: () => setTick((current) => current + 1),
  };
}

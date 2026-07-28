/**
 * REFERANS VERİ TOHUMLAMA — tohum dizilerinden SQL üretir.
 *
 * Şema (0008–0010) kuruldu ama tablolar boş; sayfalar hâlâ `data.ts`
 * dizilerinden okuyor. Bu modül o dizileri tek kaynak kabul edip
 * veritabanına taşınabilir SQL üretir. Elle SQL yazmak yerine üretmenin
 * sebebi basit: tohum dizisi değişince SQL'i yeniden üretmek bir komut,
 * elle yazılmış 300 satırı senkron tutmak ise sürekli bir borç.
 *
 * NE TOHUMLANIR, NE TOHUMLANMAZ
 *
 * Tohumlanan: marka, ekipman modeli, gök cismi, katalog kodu, gözlem
 * noktası, etkinlik ve etkinlik programı — hepsi **editöryel referans
 * veri**, kullanıcı üretmez.
 *
 * Tohumlanmayan: fotoğraf ve ilan. İkisi de `auth.users`'a NOT NULL
 * bağlıdır; tohumlamak için sahte hesap açmak gerekirdi. Sahte hesap
 * açmak yalnızca bir şema sorunu değil — gerçek bir veritabanında
 * kimliği olmayan içerik üretmek demek. Bu içerik türleri ilk gerçek
 * kullanıcıyla gelir.
 *
 * UYDURULMAYAN SAYILAR
 *
 * Tohum verideki `rating: 4.7`, `reviewCount: 128` ve `registered: 84`
 * gibi alanlar arayüz denemesi için yazılmış demo sayılarıdır. Bunlar
 * veritabanına **yazılmaz**: puan ortalaması `site_reviews`, kayıt sayısı
 * `event_registrations` tetikleyicilerinin türettiği değerlerdir. Demo
 * sayıyı gerçek kayda dönüştürmek, olmayan 128 değerlendirmeyi var
 * göstermek olurdu.
 */

import { equipment, equipmentCategoryLabels } from '@/features/equipment/data';
import { targets } from '@/features/targets/data';
import { sites } from '@/features/observing-sites/data';
import { events } from '@/features/events/data';
import {
  brandId,
  brandRows,
  equipmentRow,
  identifierRows,
  parseAngularPair,
  targetRow,
} from '@/domain/catalog/rows';

/* ── SQL değişmez değerleri ──────────────────────────────────────────── */

function lit(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `'${value.replace(/'/g, "''")}'`;
}

function arrayLit(values: readonly string[] | undefined): string {
  if (!values || values.length === 0) return `'{}'::text[]`;
  return `array[${values.map((v) => lit(v)).join(', ')}]::text[]`;
}

function jsonLit(value: unknown): string {
  return `${lit(JSON.stringify(value))}::jsonb`;
}

export { brandId };

/* ── Bölümler ────────────────────────────────────────────────────────── */

function categorySql(): string {
  const rows = Object.entries(equipmentCategoryLabels).map(
    ([id, name], index) => `  (${lit(id)}, ${lit(name)}, ${index + 1})`
  );
  return [
    'insert into public.equipment_categories (id, name, position) values',
    rows.join(',\n'),
    'on conflict (id) do update set name = excluded.name, position = excluded.position;',
  ].join('\n');
}

function brandSql(): string {
  const rows = brandRows(equipment).map(
    (b) => `  (${lit(b.id)}, ${lit(b.name)})`
  );
  return [
    'insert into public.equipment_brands (id, name) values',
    rows.join(',\n'),
    'on conflict (id) do update set name = excluded.name;',
  ].join('\n');
}

function equipmentSql(): string {
  /* Kolon eşlemesi alan katmanında (`domain/catalog/rows`); burada yalnızca
     SQL değişmezlerine çevriliyor. Aynı eşlemeyi yönetim panelindeki
     senkronizasyon da kullanıyor. */
  const rows = equipment.map((item) => {
    const r = equipmentRow(item);
    return [
      '  (',
      [
        lit(r.slug),
        lit(r.brand_id),
        lit(r.category_id),
        lit(r.model),
        lit(r.summary),
        lit(r.price_hint),
        lit(r.focal_length_mm),
        lit(r.aperture_mm),
        lit(r.pixel_size_um),
        lit(r.sensor_width_mm),
        lit(r.sensor_height_mm),
        lit(r.payload_capacity_kg),
        lit(r.weight_kg),
        jsonLit(r.specs),
        arrayLit(r.notes),
      ].join(', '),
      ')',
    ].join('');
  });

  return [
    'insert into public.equipment_models (',
    '  slug, brand_id, category_id, model, summary, price_hint,',
    '  focal_length_mm, aperture_mm, pixel_size_um,',
    '  sensor_width_mm, sensor_height_mm, payload_capacity_kg, weight_kg,',
    '  specs, notes',
    ') values',
    rows.join(',\n'),
    'on conflict (slug) do update set',
    '  brand_id = excluded.brand_id,',
    '  category_id = excluded.category_id,',
    '  model = excluded.model,',
    '  summary = excluded.summary,',
    '  price_hint = excluded.price_hint,',
    '  focal_length_mm = excluded.focal_length_mm,',
    '  aperture_mm = excluded.aperture_mm,',
    '  pixel_size_um = excluded.pixel_size_um,',
    '  sensor_width_mm = excluded.sensor_width_mm,',
    '  sensor_height_mm = excluded.sensor_height_mm,',
    '  payload_capacity_kg = excluded.payload_capacity_kg,',
    '  weight_kg = excluded.weight_kg,',
    '  specs = excluded.specs,',
    '  notes = excluded.notes;',
  ].join('\n');
}

function targetSql(): string {
  const rows = targets.map((target) => {
    const r = targetRow(target);
    return [
      '  (',
      [
        lit(r.slug),
        lit(r.name),
        lit(r.catalog),
        lit(r.kind),
        lit(r.constellation),
        lit(r.ra_deg),
        lit(r.dec_deg),
        lit(r.magnitude),
        lit(r.size_major_arcmin),
        lit(r.size_minor_arcmin),
        lit(r.best_months),
        lit(r.difficulty),
        lit(r.recommended_focal),
        lit(r.recommended_filters),
        lit(r.description),
      ].join(', '),
      ')',
    ].join('');
  });

  return [
    'insert into public.celestial_objects (',
    '  slug, name, catalog, kind, constellation, ra_deg, dec_deg, magnitude,',
    '  size_major_arcmin, size_minor_arcmin, best_months, difficulty,',
    '  recommended_focal, recommended_filters, description',
    ') values',
    rows.join(',\n'),
    'on conflict (slug) do update set',
    '  name = excluded.name,',
    '  catalog = excluded.catalog,',
    '  kind = excluded.kind,',
    '  constellation = excluded.constellation,',
    '  ra_deg = excluded.ra_deg,',
    '  dec_deg = excluded.dec_deg,',
    '  magnitude = excluded.magnitude,',
    '  size_major_arcmin = excluded.size_major_arcmin,',
    '  size_minor_arcmin = excluded.size_minor_arcmin,',
    '  best_months = excluded.best_months,',
    '  difficulty = excluded.difficulty,',
    '  recommended_focal = excluded.recommended_focal,',
    '  recommended_filters = excluded.recommended_filters,',
    '  description = excluded.description;',
  ].join('\n');
}

function identifierSql(): string {
  const rows = targets.flatMap((target) =>
    identifierRows(target).map(
      (r) =>
        `  ((select id from public.celestial_objects where slug = ${lit(r.slug)}), ` +
        `${lit(r.code)}, ${r.is_primary ? 'true' : 'false'})`
    )
  );

  return [
    'insert into public.catalog_identifiers (object_id, code, is_primary) values',
    rows.join(',\n'),
    'on conflict (object_id, code) do update set is_primary = excluded.is_primary;',
  ].join('\n');
}

function siteSql(): string {
  const rows = sites.map((site) =>
    [
      '  (',
      [
        lit(site.slug),
        lit(site.name),
        lit(site.region),
        `'published'::app.site_status`,
        lit(round(site.coords.latitude, 4)),
        lit(round(site.coords.longitude, 4)),
        lit(site.altitude),
        lit(site.bortle),
        lit(site.sqm ?? null),
        lit(site.roadAccess),
        lit(site.southHorizon),
        lit(site.bestMonths),
        lit(site.facilities.water),
        lit(site.facilities.toilet),
        lit(site.facilities.electricity),
        lit(site.facilities.cellSignal),
        lit(site.facilities.tentArea),
        lit(site.facilities.caravanOk),
        lit(site.description),
        arrayLit(site.warnings),
      ].join(', '),
      ')',
    ].join('')
  );

  return [
    'insert into public.observing_sites (',
    '  slug, name, region, status, approx_latitude, approx_longitude,',
    '  altitude_m, bortle, sqm, road_access, south_horizon, best_months,',
    '  has_water, has_toilet, has_electricity, has_cell_signal,',
    '  has_tent_area, caravan_ok, description, warnings',
    ') values',
    rows.join(',\n'),
    'on conflict (slug) do update set',
    '  name = excluded.name,',
    '  region = excluded.region,',
    '  approx_latitude = excluded.approx_latitude,',
    '  approx_longitude = excluded.approx_longitude,',
    '  altitude_m = excluded.altitude_m,',
    '  bortle = excluded.bortle,',
    '  sqm = excluded.sqm,',
    '  road_access = excluded.road_access,',
    '  south_horizon = excluded.south_horizon,',
    '  best_months = excluded.best_months,',
    '  has_water = excluded.has_water,',
    '  has_toilet = excluded.has_toilet,',
    '  has_electricity = excluded.has_electricity,',
    '  has_cell_signal = excluded.has_cell_signal,',
    '  has_tent_area = excluded.has_tent_area,',
    '  caravan_ok = excluded.caravan_ok,',
    '  description = excluded.description,',
    '  warnings = excluded.warnings;',
  ].join('\n');
}

function measurementSql(): string {
  // Tohum verideki SQM değeri noktanın ölçüm geçmişinin ilk kaydı olur:
  // ışık kirliliği karşılaştırması bu tablodan okuyor ve tek bir `sqm`
  // kolonu ölçümün ne zaman, hangi yöntemle alındığını taşımıyor.
  const rows = sites
    .filter((site) => site.sqm !== undefined)
    .map(
      (site) =>
        `  ((select id from public.observing_sites where slug = ${lit(site.slug)}), ` +
        `date '2026-07-01', ${lit(site.sqm ?? null)}, ${lit(site.bortle)}, ` +
        `${lit('tohum-kayit')}, ${lit('Site künyesinden aktarılan başlangıç değeri.')})`
    );

  if (rows.length === 0) return '-- ölçüm kaydı yok';

  return [
    'insert into public.site_measurements (',
    '  site_id, measured_at, sqm, bortle, method, note',
    ') values',
    rows.join(',\n'),
    'on conflict do nothing;',
  ].join('\n');
}

function eventSql(): string {
  const rows = events.map((event) =>
    [
      '  (',
      [
        lit(event.slug),
        lit(event.title),
        lit(event.type),
        `'published'::app.event_status`,
        lit(event.city),
        lit(event.venue),
        lit(event.coords ? round(event.coords.latitude, 6) : null),
        lit(event.coords ? round(event.coords.longitude, 6) : null),
        `${lit(event.startsAt)}::timestamptz`,
        event.endsAt ? `${lit(event.endsAt)}::timestamptz` : 'null',
        lit(event.free),
        lit(event.camping),
        lit(event.kidsFriendly),
        lit(event.astrophotoFocused),
        lit(event.telescopesProvided),
        lit(event.capacity ?? null),
        lit(event.organizer.name),
        lit(event.organizer.verified),
        lit(event.description),
        arrayLit(event.observedTargets),
        arrayLit(event.rules),
        lit(event.source.name),
        `${lit(event.source.lastVerifiedAt)}::date`,
      ].join(', '),
      ')',
    ].join('')
  );

  return [
    'insert into public.events (',
    '  slug, title, event_type, status, city, venue, latitude, longitude,',
    '  starts_at, ends_at, free, camping, kids_friendly, astrophoto_focused,',
    '  telescopes_provided, capacity, organizer_name, organizer_verified,',
    '  description, observed_targets, rules, source_name, source_last_verified_at',
    ') values',
    rows.join(',\n'),
    'on conflict (slug) do update set',
    '  title = excluded.title,',
    '  event_type = excluded.event_type,',
    '  city = excluded.city,',
    '  venue = excluded.venue,',
    '  latitude = excluded.latitude,',
    '  longitude = excluded.longitude,',
    '  starts_at = excluded.starts_at,',
    '  ends_at = excluded.ends_at,',
    '  free = excluded.free,',
    '  camping = excluded.camping,',
    '  kids_friendly = excluded.kids_friendly,',
    '  astrophoto_focused = excluded.astrophoto_focused,',
    '  telescopes_provided = excluded.telescopes_provided,',
    '  capacity = excluded.capacity,',
    '  organizer_name = excluded.organizer_name,',
    '  organizer_verified = excluded.organizer_verified,',
    '  description = excluded.description,',
    '  observed_targets = excluded.observed_targets,',
    '  rules = excluded.rules,',
    '  source_name = excluded.source_name,',
    '  source_last_verified_at = excluded.source_last_verified_at;',
  ].join('\n');
}

function sessionSql(): string {
  const slugs = events.map((event) => lit(event.slug)).join(', ');
  const rows: string[] = [];

  for (const event of events) {
    event.program.forEach((session, index) => {
      rows.push(
        `  ((select id from public.events where slug = ${lit(event.slug)}), ` +
          `${lit(session.time)}, ${lit(session.title)}, ` +
          `${lit(session.speaker ?? null)}, ${index})`
      );
    });
  }

  if (rows.length === 0) return '-- program kaydı yok';

  return [
    // Program satırlarının doğal anahtarı yok (aynı saatte iki oturum
    // olabilir), bu yüzden yeniden çalıştırmada önce silinip yazılır.
    // Yalnızca bu tohumun etkinlikleri temizlenir.
    `delete from public.event_sessions where event_id in (`,
    `  select id from public.events where slug in (${slugs})`,
    ');',
    '',
    'insert into public.event_sessions (event_id, starts_at, title, speaker, position) values',
    rows.join(',\n') + ';',
  ].join('\n');
}

/* ── Yardımcılar ─────────────────────────────────────────────────────── */

/** `'3.2° × 1.0°'` / `'11′ × 7′'` → arcdakika çifti. */
export { parseAngularPair };

/** Koordinat yuvarlama — `null` girdiyi de kabul eder. */
function round(value: number | null, digits: number): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/* ── Giriş noktası ───────────────────────────────────────────────────── */

export function buildSeedSql(): string {
  const header = [
    '-- OTOMATİK ÜRETİLDİ — elle düzenlemeyin.',
    '-- Kaynak: src/features/*/data.ts · Üretici: scripts/seed/reference-data.ts',
    '-- Yeniden üretmek için: node scripts/seed.mjs',
    '--',
    '-- Fotoğraf ve ilan tohumlanmaz: ikisi de auth.users\'a bağlıdır ve',
    '-- tohumlamak sahte hesap açmayı gerektirirdi.',
    '-- Puan/kayıt sayıları da yazılmaz: onlar tetikleyicilerin türettiği',
    '-- değerler, demo sayıyı gerçek kayda dönüştürmek olurdu.',
  ].join('\n');

  const sections: Array<[string, string]> = [
    ['EKİPMAN KATEGORİLERİ', categorySql()],
    ['MARKALAR', brandSql()],
    ['EKİPMAN MODELLERİ', equipmentSql()],
    ['GÖK CİSİMLERİ', targetSql()],
    ['KATALOG KODLARI', identifierSql()],
    ['GÖZLEM NOKTALARI', siteSql()],
    ['NOKTA ÖLÇÜMLERİ', measurementSql()],
    ['ETKİNLİKLER', eventSql()],
    ['ETKİNLİK PROGRAMLARI', sessionSql()],
  ];

  const body = sections
    .map(([title, sql]) =>
      [
        '-- ' + '═'.repeat(70),
        `-- ${title}`,
        '-- ' + '═'.repeat(70),
        sql,
      ].join('\n')
    )
    .join('\n\n');

  return `${header}\n\n${body}\n`;
}

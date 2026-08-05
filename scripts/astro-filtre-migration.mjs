/**
 * ASTRO FİLTRE VERİTABANI — MIGRATION ÜRETİCİSİ.
 *
 * Kaynak: `docs/astro-filtre/astro_filters_database.json` — filtre veritabanı
 * paketinin makine okunur çıktısı.
 *
 * Üretilen: `supabase/migrations/0072_astro_filtre_veritabani.sql`
 *
 * ─────────────────────────────────────────────────────────────────────
 * NEDEN ELLE YAZILMIYOR
 *
 * 99 ürün, 92 geçiş bandı, 103 kategori bağı ve 13 takma ad — bunları
 * elle SQL'e çevirmek hem hataya açık hem de paket güncellendiğinde
 * baştan yazmak demek. Paketin kendi `astro_filters_seed.sql` dosyası da
 * var ama Astrohub'ın deseniyle uyuşmuyor: şema `public.` öneki
 * kullanmıyor, RLS ve GRANT bloğu yok, ve en önemlisi **ekipman
 * kataloğuna bağ kurmuyor**.
 *
 * ─────────────────────────────────────────────────────────────────────
 * SEÇENEK C — İKİ TABLO AİLESİ, TEK KANONİK KAYIT
 *
 * Filtreler `equipment_models` içine KANONİK kayıt olarak giriyor:
 * setup oluşturucu, uyumluluk motoru, karşılaştırma ekranı ve ilan formu
 * yalnızca o tabloyu tanıyor ve ayrı bir tablo eklemek dördünü birden
 * kör bırakırdı.
 *
 * Spektral ayrıntı (hangi emisyon çizgisi, kaç nm, kaç geçiş penceresi)
 * ise `equipment_models.specs` JSONB'sine düz metin olarak sıkıştırılamaz
 * — "Hα geçiren 3nm filtreler" sorgusu o hâlde yazılamaz. Bu yüzden
 * `astro_filter_*` tabloları YAN VERİ olarak duruyor ve
 * `astro_filter_products.equipment_model_id` ile kanonik kayda bağlanıyor.
 *
 * ─────────────────────────────────────────────────────────────────────
 * TAHMİN ÜRETİLMİYOR
 *
 * Pakette 99 üründen yalnızca 31'inde bant genişliği, 49'unda emisyon
 * çizgisi sayısı var. Boş alan boş kalıyor — yaygın bir değeri varsayıp
 * doldurmak, kullanıcıya ölçülmemiş bir sayıyı ölçülmüş gibi göstermek
 * olurdu. Arayüz bu alanlarda "—" gösteriyor.
 *
 * Kullanım:  node scripts/astro-filtre-migration.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/astro-filtre/astro_filters_database.json');
const OUT = path.join(
  root,
  'supabase/migrations/0072_astro_filtre_veritabani.sql'
);

const db = JSON.parse(readFileSync(SRC, 'utf8'));

/* ── yardımcılar ─────────────────────────────────────────────────────── */

/** SQL metin literali — tek tırnak kaçışı. */
const s = (value) =>
  value === null || value === undefined ? 'null' : `'${String(value).replace(/'/g, "''")}'`;

const uuid = (value) => (value ? `${s(value)}::uuid` : 'null');
const num = (value) =>
  value === null || value === undefined || value === '' ? 'null' : Number(value);
const bool = (value) => (value ? 'true' : 'false');
const jsonb = (value) => `${s(JSON.stringify(value ?? []))}::jsonb`;

/**
 * Marka kimliği — `features/equipment/data.ts` içindeki `brandSlug` ile
 * AYNI kurallar. İkisi ayrışırsa aynı marka iki kayıt olur ve katalog
 * "ZWO" ile "zwo"yu ayrı marka sanar.
 */
function brandSlug(brand) {
  return brand
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Doğrulama durumu → Astrohub güven seviyesi.
 *
 * `file_only` (74 kayıt) `inceleme-gerekli` oluyor ve bu bilinçli: kayıt
 * yalnızca kullanıcının verdiği listeden geliyor, üretici ya da bayi
 * sayfasıyla karşılaştırılmadı. Bunu "tek-kaynak" saymak, doğrulanmamış
 * bir satırı doğrulanmış gibi göstermek olurdu.
 */
const CONFIDENCE = {
  retailer_verified: 'dogrulanmis',
  category_verified: 'tek-kaynak',
  file_only: 'inceleme-gerekli',
  needs_verification: 'inceleme-gerekli',
  conflicting: 'inceleme-gerekli',
  discontinued: 'inceleme-gerekli',
};

const BAND_LABEL = {
  broadband: 'Geniş bant',
  single: 'Tek çizgi',
  dual: 'Çift bant (dual)',
  triple: 'Üç bant (triple)',
  quad: 'Dört bant (quad)',
  unknown: null,
};

const KIND_LABEL = {
  single_filter: 'Tek filtre',
  family_or_set: 'Set / aile',
  series: 'Seri',
};

const lineByCode = new Map(db.spectral_lines.map((l) => [l.id, l]));
const categoryById = new Map(db.categories.map((c) => [c.id, c]));
const typeById = new Map(db.filter_types.map((t) => [t.id, t]));

/* Ürün → geçiş bantları. */
const passbands = new Map();
for (const pb of db.product_passbands) {
  if (!passbands.has(pb.product_id)) passbands.set(pb.product_id, []);
  passbands.get(pb.product_id).push(pb);
}

/**
 * Ekipman kataloğu `model` alanı marka adını TAŞIMAZ — kart zaten markayı
 * ayrı gösteriyor ve "Antlia · Antlia LRGB Dark" diye okunurdu.
 */
function modelName(product) {
  const brand = product.brand_name;
  const name = product.display_name || product.name;
  return name.startsWith(`${brand} `) ? name.slice(brand.length + 1) : name;
}

/** Kartta ve künyede görünen teknik özet sözlüğü. */
function specsFor(product) {
  const spec = {};
  const category = categoryById.get(product.primary_category_id);
  if (category) spec['Kategori'] = category.name_tr;

  const bandLabel = BAND_LABEL[product.market_band_label];
  if (bandLabel) spec['Pazar sınıfı'] = bandLabel;

  const kind = KIND_LABEL[product.product_kind];
  if (kind) spec['Ürün tipi'] = kind;

  /* PAZARLAMA ADI İLE FİZİKSEL GERÇEK AYRI SATIRLARDA.
     "Dual-band" her üreticide aynı şeyi anlatmıyor; paket bunu üç ayrı
     alanda tutuyor ve künye de öyle gösteriyor. */
  if (product.emission_line_count !== null)
    spec['Emisyon çizgisi'] = `${product.emission_line_count} çizgi`;
  if (product.pass_window_count !== null)
    spec['Geçiş penceresi'] = `${product.pass_window_count} pencere`;

  if (product.bandwidth_min_nm !== null && product.bandwidth_max_nm !== null) {
    spec['Bant genişliği'] =
      product.bandwidth_min_nm === product.bandwidth_max_nm
        ? `${product.bandwidth_min_nm} nm`
        : `${product.bandwidth_min_nm}–${product.bandwidth_max_nm} nm`;
  }

  if (product.fast_optics_profile)
    spec['Hızlı optik profili'] = product.fast_optics_profile;

  const bands = passbands.get(product.id) ?? [];
  const lines = bands
    .map((b) => lineByCode.get(b.spectral_line_id)?.short_name)
    .filter(Boolean);
  if (lines.length > 0) spec['Geçirdiği çizgiler'] = [...new Set(lines)].join(' · ');

  return spec;
}

/** Ürünün ne olduğunu bir cümlede anlatan özet. */
function summaryFor(product) {
  const category = categoryById.get(product.primary_category_id);
  const bands = passbands.get(product.id) ?? [];
  const lines = [
    ...new Set(
      bands.map((b) => lineByCode.get(b.spectral_line_id)?.short_name).filter(Boolean)
    ),
  ];
  const parcalar = [product.brand_name, category?.name_tr?.toLocaleLowerCase('tr')].filter(
    Boolean
  );
  let text = `${parcalar.join(' ')} filtresi`;
  if (lines.length > 0) text += ` — ${lines.join(', ')} geçiriyor`;
  if (product.bandwidth_min_nm !== null) {
    text +=
      product.bandwidth_min_nm === product.bandwidth_max_nm
        ? ` (${product.bandwidth_min_nm} nm)`
        : ` (${product.bandwidth_min_nm}–${product.bandwidth_max_nm} nm)`;
  }
  return `${text}.`;
}

/* ── slug doğrulaması ────────────────────────────────────────────────── */
const SLUG = /^[a-z0-9-]{2,80}$/;
const bozuk = db.products.filter((p) => !SLUG.test(p.slug));
if (bozuk.length > 0) {
  console.error(
    `equipment_models.slug kısıtına uymayan ${bozuk.length} kayıt:`,
    bozuk.slice(0, 5).map((p) => p.slug)
  );
  process.exit(1);
}

/* Aynı slug ekipman tohumunda zaten var mı? Çakışma sessizce üzerine
   yazmak yerine görünür olsun diye raporlanıyor. */
const seed = readFileSync(path.join(root, 'src/features/equipment/data.ts'), 'utf8');
const cakisan = db.products.filter((p) =>
  new RegExp(`slug: '${p.slug}'`).test(seed)
);

/* ── SQL üretimi ─────────────────────────────────────────────────────── */

const L = [];
const w = (line = '') => L.push(line);

w(`-- 0072_astro_filtre_veritabani.sql
--
-- ÜRETİLEN DOSYA — ELLE DÜZENLEMEYİN.
-- Üretici: scripts/astro-filtre-migration.mjs
-- Kaynak:  docs/astro-filtre/astro_filters_database.json
--
-- Astrofotoğrafi filtre veritabanı: ${db.products.length} ürün, ${db.brands.length} marka,
-- ${db.spectral_lines.length} emisyon çizgisi, ${db.filter_types.length} filtre türü.
--
-- ══════════════════════════════════════════════════════════════════════════
-- İKİ TABLO AİLESİ, TEK KANONİK KAYIT
--
-- Filtreler \`equipment_models\` içine kanonik kayıt olarak giriyor: setup
-- oluşturucu, uyumluluk motoru, karşılaştırma ve ilan formu YALNIZCA o
-- tabloyu tanıyor. Yeni bir tabloya koymak dördünü birden kör bırakırdı.
--
-- Spektral ayrıntı (hangi çizgi, kaç nm, kaç pencere) ise \`specs\` JSONB'sine
-- düz metin olarak sıkıştırılamaz — "Hα geçiren 3nm filtreler" sorgusu o
-- hâlde yazılamaz. Bu yüzden \`astro_filter_*\` tabloları yan veri olarak
-- duruyor ve \`equipment_model_id\` ile kanonik kayda bağlanıyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- PAZARLAMA ADI ≠ FİZİKSEL GERÇEK
--
-- "Dual/triple/quad" her üreticide aynı teknik anlamı taşımıyor. Bu yüzden
-- üç alan AYRI: \`market_band_label\` (kutunun üstündeki söz),
-- \`emission_line_count\` (gerçekten kaç emisyon çizgisi) ve
-- \`pass_window_count\` (fiziksel geçiş penceresi). Bilinmeyen null kalıyor;
-- yaygın bir değeri varsaymak ölçülmemiş bir sayıyı ölçülmüş göstermek olurdu.
--
-- ══════════════════════════════════════════════════════════════════════════
-- FİYAT VE STOK YOK
--
-- Paket bunları bilerek taşımıyor ve biz de eklemiyoruz: fiyat günlük
-- değişiyor ve referans katalogda eskimiş bir fiyat, hiç fiyat olmamasından
-- daha kötü.

begin;

-- ══════════════════════════════════════════════════════════════════════════
-- SPEKTRAL REFERANS TABLOLARI
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.astro_filter_categories (
  id          uuid primary key,
  code        text not null unique,
  name_tr     text not null,
  name_en     text not null,
  description_tr text,
  sort_order  integer not null default 0
);

create table if not exists public.astro_spectral_lines (
  id            uuid primary key,
  code          text not null unique,
  name          text not null,
  short_name    text not null,
  wavelength_nm numeric(8,3) not null,
  element_name  text,
  ionization_stage text,
  aliases       jsonb not null default '[]'::jsonb
);

create table if not exists public.astro_filter_types (
  id          uuid primary key,
  code        text not null unique,
  name        text not null,
  category_id uuid references public.astro_filter_categories (id) on delete set null,
  aliases     jsonb not null default '[]'::jsonb,
  notes       text
);

-- ══════════════════════════════════════════════════════════════════════════
-- ÜRÜNLER — ekipman kataloğuna bağlı yan veri
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.astro_filter_products (
  id                  uuid primary key,
  slug                text not null unique,

  /*
   * KANONİK KAYDA BAĞ. Boş bırakılabilir olması bilinçli: paket
   * güncellendiğinde henüz ekipman kataloğuna girmemiş bir ürün gelebilir
   * ve o satırı reddetmek, spektral veriyi kaybetmek olurdu. Arayüz bağı
   * olmayan kaydı listelemiyor.
   */
  equipment_model_id  uuid references public.equipment_models (id) on delete set null,

  brand_name          text not null,
  name                text not null,
  display_name        text not null,
  primary_category_id uuid not null references public.astro_filter_categories (id) on delete restrict,
  technical_class     text not null,

  /* Kutunun üstündeki söz — fiziksel gerçekle karıştırılmasın diye ayrı. */
  market_band_label   text not null
    check (market_band_label in ('broadband','single','dual','triple','quad','unknown')),
  product_kind        text not null
    check (product_kind in ('single_filter','family_or_set','series')),

  pass_window_count   smallint check (pass_window_count is null or pass_window_count between 1 and 8),
  emission_line_count smallint check (emission_line_count is null or emission_line_count between 1 and 8),
  bandwidth_min_nm    numeric(7,2),
  bandwidth_max_nm    numeric(7,2),
  fast_optics_profile text,

  source_origin       text not null
    check (source_origin in ('attached_list','web_research','manual_admin')),
  verification_status text not null
    check (verification_status in ('file_only','category_verified','retailer_verified','conflicting','needs_verification','discontinued')),
  is_discontinued     boolean not null default false,
  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint astro_filter_bandwidth_order
    check (bandwidth_min_nm is null or bandwidth_max_nm is null or bandwidth_min_nm <= bandwidth_max_nm)
);

create table if not exists public.astro_filter_passbands (
  product_id       uuid not null references public.astro_filter_products (id) on delete cascade,
  spectral_line_id uuid not null references public.astro_spectral_lines (id) on delete restrict,
  bandwidth_nm     numeric(7,2),
  primary key (product_id, spectral_line_id)
);

/*
 * İKİNCİL KATEGORİLER. Pakette yalnızca dört satır — bir ürün hem "dual
 * band" hem "geniş bant" sayılabiliyor. Birincil kategori ürün satırında
 * duruyor; burada yalnızca fazlası var.
 */
create table if not exists public.astro_filter_product_categories (
  product_id  uuid not null references public.astro_filter_products (id) on delete cascade,
  category_id uuid not null references public.astro_filter_categories (id) on delete restrict,
  is_primary  boolean not null default false,
  primary key (product_id, category_id)
);

/*
 * TAKMA ADLAR — arama için. Kullanıcı "L-QEF" yazıyor, ürünün katalogdaki
 * adı "Optolong L-Quad Enhance Filter". Bu tablo olmadan arama boş dönerdi.
 */
create table if not exists public.astro_filter_aliases (
  id         uuid primary key,
  product_id uuid not null references public.astro_filter_products (id) on delete cascade,
  alias      text not null,
  locale     text
);

-- Sorgulanan alanlar indeksli: "Hα geçiren, 3nm'den dar filtreler".
create index if not exists astro_filter_products_category_idx
  on public.astro_filter_products (primary_category_id);
create index if not exists astro_filter_products_equipment_idx
  on public.astro_filter_products (equipment_model_id);
create index if not exists astro_filter_products_band_idx
  on public.astro_filter_products (market_band_label, bandwidth_min_nm);
create index if not exists astro_filter_passbands_line_idx
  on public.astro_filter_passbands (spectral_line_id, bandwidth_nm);
create index if not exists astro_filter_aliases_search_idx
  on public.astro_filter_aliases using gin (alias gin_trgm_ops);

drop trigger if exists astro_filter_products_set_updated_at on public.astro_filter_products;
create trigger astro_filter_products_set_updated_at
  before update on public.astro_filter_products
  for each row execute function app.set_updated_at();
`);

/* ── referans veri ── */
w(`
-- ══════════════════════════════════════════════════════════════════════════
-- REFERANS VERİ
-- ══════════════════════════════════════════════════════════════════════════
`);

for (const c of db.categories) {
  w(
    `insert into public.astro_filter_categories (id, code, name_tr, name_en, description_tr, sort_order) values (${uuid(c.id)}, ${s(c.code)}, ${s(c.name_tr)}, ${s(c.name_en)}, ${s(c.description_tr)}, ${c.sort_order})\n  on conflict (id) do update set code = excluded.code, name_tr = excluded.name_tr, name_en = excluded.name_en, description_tr = excluded.description_tr, sort_order = excluded.sort_order;`
  );
}
w();

for (const l of db.spectral_lines) {
  w(
    `insert into public.astro_spectral_lines (id, code, name, short_name, wavelength_nm, element_name, ionization_stage, aliases) values (${uuid(l.id)}, ${s(l.code)}, ${s(l.name)}, ${s(l.short_name)}, ${num(l.wavelength_nm)}, ${s(l.element_name)}, ${s(l.ionization_stage)}, ${jsonb(l.aliases)})\n  on conflict (id) do update set code = excluded.code, name = excluded.name, short_name = excluded.short_name, wavelength_nm = excluded.wavelength_nm, element_name = excluded.element_name, ionization_stage = excluded.ionization_stage, aliases = excluded.aliases;`
  );
}
w();

for (const t of db.filter_types) {
  w(
    `insert into public.astro_filter_types (id, code, name, category_id, aliases, notes) values (${uuid(t.id)}, ${s(t.code)}, ${s(t.name)}, ${uuid(t.category_id)}, ${jsonb(t.aliases)}, ${s(t.notes)})\n  on conflict (id) do update set code = excluded.code, name = excluded.name, category_id = excluded.category_id, aliases = excluded.aliases, notes = excluded.notes;`
  );
}

/* ── markalar ── */
w(`
-- ══════════════════════════════════════════════════════════════════════════
-- MARKALAR — ekipman kataloğunun kendi tablosuna
--
-- Ayrı bir marka tablosu AÇILMIYOR: "ZWO" filtre üreticisi olduğu kadar
-- kamera üreticisi ve iki tabloda iki ZWO satırı, katalogda iki ayrı marka
-- demek olurdu.
-- ══════════════════════════════════════════════════════════════════════════
`);

const brands = new Map();
for (const b of db.brands) brands.set(brandSlug(b.name), b);
for (const [id, b] of brands) {
  w(
    `insert into public.equipment_brands (id, name, website) values (${s(id)}, ${s(b.name)}, ${s(b.website_url)})\n  on conflict (id) do nothing;`
  );
}

/* ── ekipman modelleri ── */
w(`
-- ══════════════════════════════════════════════════════════════════════════
-- KANONİK KAYITLAR — equipment_models
--
-- \`on conflict (slug) do update\`: paket güncellendiğinde aynı ürün yeniden
-- yazılabilsin. Üç slug tohum katalogda zaten var (astronomik-cls-ccd,
-- idas-nbz, zwo-duo-band).
--
-- ÇAKIŞMADA EDİTÖR KAZANIYOR. \`summary\`, \`production_status\` ve
-- \`data_confidence\` yalnızca BOŞSA (ya da 'bilinmiyor'sa) yazılıyor:
-- pakette 99 üründen 74'ü doğrulanmamış ve doğrulanmamış bir satırın,
-- birinin oturup girdiği bilgiyi ezmesi kabul edilemez. \`specs\` ise
-- birleştiriliyor — paketin getirdiği spektral alanlar ekleniyor, mevcut
-- anahtarlar (backfocus, filtre kalınlığı) yerinde kalıyor.
-- ══════════════════════════════════════════════════════════════════════════
`);

for (const p of db.products) {
  const conf = CONFIDENCE[p.verification_status] ?? 'inceleme-gerekli';
  const status = p.is_discontinued ? 'uretimi-durduruldu' : 'bilinmiyor';
  w(
    `insert into public.equipment_models (slug, brand_id, category_id, model, summary, specs, production_status, data_confidence) values (${s(p.slug)}, ${s(brandSlug(p.brand_name))}, 'filtre', ${s(modelName(p))}, ${s(summaryFor(p))}, ${jsonb(specsFor(p))}, ${s(status)}, ${s(conf)})\n  on conflict (slug) do update set brand_id = excluded.brand_id, category_id = excluded.category_id, model = excluded.model, summary = coalesce(public.equipment_models.summary, excluded.summary), specs = public.equipment_models.specs || excluded.specs, production_status = case when public.equipment_models.production_status = 'bilinmiyor' then excluded.production_status else public.equipment_models.production_status end, data_confidence = coalesce(public.equipment_models.data_confidence, excluded.data_confidence);`
  );
}

/* ── filtre ürünleri ── */
w(`
-- ══════════════════════════════════════════════════════════════════════════
-- SPEKTRAL YAN VERİ
-- ══════════════════════════════════════════════════════════════════════════
`);

for (const p of db.products) {
  w(
    `insert into public.astro_filter_products (id, slug, equipment_model_id, brand_name, name, display_name, primary_category_id, technical_class, market_band_label, product_kind, pass_window_count, emission_line_count, bandwidth_min_nm, bandwidth_max_nm, fast_optics_profile, source_origin, verification_status, is_discontinued, notes)\n  select ${uuid(p.id)}, ${s(p.slug)}, m.id, ${s(p.brand_name)}, ${s(p.name)}, ${s(p.display_name)}, ${uuid(p.primary_category_id)}, ${s(p.technical_class)}, ${s(p.market_band_label)}, ${s(p.product_kind)}, ${num(p.pass_window_count)}, ${num(p.emission_line_count)}, ${num(p.bandwidth_min_nm)}, ${num(p.bandwidth_max_nm)}, ${s(p.fast_optics_profile)}, ${s(p.source_origin)}, ${s(p.verification_status)}, ${bool(p.is_discontinued)}, ${s(p.notes)}\n  from public.equipment_models m where m.slug = ${s(p.slug)}\n  on conflict (id) do update set equipment_model_id = excluded.equipment_model_id, brand_name = excluded.brand_name, name = excluded.name, display_name = excluded.display_name, primary_category_id = excluded.primary_category_id, technical_class = excluded.technical_class, market_band_label = excluded.market_band_label, product_kind = excluded.product_kind, pass_window_count = excluded.pass_window_count, emission_line_count = excluded.emission_line_count, bandwidth_min_nm = excluded.bandwidth_min_nm, bandwidth_max_nm = excluded.bandwidth_max_nm, fast_optics_profile = excluded.fast_optics_profile, source_origin = excluded.source_origin, verification_status = excluded.verification_status, is_discontinued = excluded.is_discontinued, notes = excluded.notes;`
  );
}
w();

for (const pb of db.product_passbands) {
  w(
    `insert into public.astro_filter_passbands (product_id, spectral_line_id, bandwidth_nm) values (${uuid(pb.product_id)}, ${uuid(pb.spectral_line_id)}, ${num(pb.bandwidth_nm)})\n  on conflict (product_id, spectral_line_id) do update set bandwidth_nm = excluded.bandwidth_nm;`
  );
}
w();

/*
 * İKİNCİL KATEGORİLER. Birincil olan ürün satırında zaten var; buraya
 * yalnızca fazlası yazılıyor — aynı bilgiyi iki yerde tutmak, birinin
 * gün gelip diğerinden ayrılması demek.
 */
const secondary = (db.product_categories ?? []).filter((r) => !r.is_primary);
for (const link of secondary) {
  w(
    `insert into public.astro_filter_product_categories (product_id, category_id, is_primary) values (${uuid(link.product_id)}, ${uuid(link.category_id)}, false)\n  on conflict (product_id, category_id) do nothing;`
  );
}
w();

for (const a of db.product_aliases ?? []) {
  w(
    `insert into public.astro_filter_aliases (id, product_id, alias, locale) values (${uuid(a.id)}, ${uuid(a.product_id)}, ${s(a.alias)}, ${s(a.locale)})\n  on conflict (id) do update set alias = excluded.alias, locale = excluded.locale;`
  );
}

/* ── RLS ve yetkiler ── */
w(`
-- ══════════════════════════════════════════════════════════════════════════
-- RLS — referans veri deseni: herkes okur, editör yazar (bkz. 0008)
-- ══════════════════════════════════════════════════════════════════════════
do $$
declare
  t text;
begin
  foreach t in array array[
    'astro_filter_categories', 'astro_spectral_lines', 'astro_filter_types',
    'astro_filter_products', 'astro_filter_passbands',
    'astro_filter_product_categories', 'astro_filter_aliases'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format(
      'create policy %I_read on public.%I for select using (true)', t, t
    );

    execute format('drop policy if exists %I_editor_write on public.%I', t, t);
    execute format(
      'create policy %I_editor_write on public.%I for all to authenticated '
      'using (app.is_admin() or app.has_role(''content_editor'')) '
      'with check (app.is_admin() or app.has_role(''content_editor''))',
      t, t
    );

    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon', t);
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated', t
    );
  end loop;
end;
$$;

commit;`);

writeFileSync(OUT, L.join('\n') + '\n', 'utf8');

console.log(
  `Migration yazıldı · ${db.products.length} ürün · ${brands.size} marka · ` +
    `${db.product_passbands.length} geçiş bandı · ${secondary.length} ikincil kategori · ${(db.product_aliases ?? []).length} takma ad`
);
if (cakisan.length > 0) {
  console.log(
    `NOT: ${cakisan.length} slug tohum katalogda da var, göç üzerine yazacak: ` +
      cakisan.map((p) => p.slug).join(', ')
  );
}

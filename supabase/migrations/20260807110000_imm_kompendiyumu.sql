-- ═══════════════════════════════════════════════════════════════════════
-- IMM DEEP SKY COMPENDIUM — UZAKLIK, LAKAP VE SEÇKİ İŞARETİ
--
-- Katalog 16.149 kayda çıkınca yeni bir sorun doğdu: NGC/IC kayıtlarının
-- büyük çoğunluğu 15. kadir civarında, adı olmayan, kimsenin fotoğrafını
-- çekmediği galaksiler. Liste "eksiksiz" ama gezinilebilir değil —
-- kullanıcı 16.000 satır arasında nereden başlayacağını bilmiyor.
--
-- Gary Imm'in Deep Sky Compendium'u (2026, 6. sürüm) tam olarak bu
-- soruyu cevaplıyor: 3.145 nesnelik, fotoğrafı çekilmeye değer nesneler
-- seçkisi. Bu göç üç şey getiriyor:
--
--   · `distance_ly`  — kataloğumuzda hiç olmayan fiziksel veri.
--   · `imm_kompendium` — nesne seçkide mi? Gezinmenin ana filtresi.
--   · Eksik katalog üyelikleri — Herschel 400, Abell (gezegenimsi ve
--     galaksi kümeleri), Gum, Griffiths, Kohoutek, Minkowski, Green SNR
--     ve O'Meara'nın dört listesi (Hidden Treasures, Secret Deep,
--     Orphaned Beauties, Small Packages) ile Faint Giants.
--
-- ── NE ALINMADI, NEDEN ──────────────────────────────────────────────────
-- Kompendiyumun her satırında Gary Imm'in kendi GÖZLEM NOTU ve 0–5
-- arası KENDİ PUANI var. İkisi de ölçüm değil, onun değerlendirmesi —
-- eserin özü orası. Alınmadı.
--
-- Alınanlar olgu: uzaklık ve kadir SIMBAD'dan, katalog üyelikleri ilgili
-- katalogların kendisinden, lakaplar zaten yerleşik adlar. Bunlar telifle
-- korunan ifade değil, veri.
--
-- Seçkinin KENDİSİ (hangi 3.145 nesne) onun emeği ve tek başına bir
-- işaret olarak taşınıyor; kaynağı arayüzde açıkça yazıyor.
--
-- ── AD NE ZAMAN DEĞİŞİR ────────────────────────────────────────────────
-- Yalnızca mevcut ad ÜRETİLMİŞSE. "NGC 6888 Emisyon Bulutsusu" içe
-- aktarmanın ürettiği bir yer tutucu; "Ay Çekirdeği Bulutsusu" ise
-- editörün yazdığı ad. İlkini lakapla değiştirmek kazanç, ikincisini
-- değiştirmek kayıp olurdu. Ayırt etme kuralı: üretilen adlar katalog
-- koduyla BAŞLAR.
--
-- Geri alma:
--   drop function if exists public.imm_birlestir(jsonb);
--   alter table public.celestial_objects
--     drop column if exists distance_ly, drop column if exists imm_kompendium;
-- ═══════════════════════════════════════════════════════════════════════

alter table public.celestial_objects
  add column if not exists distance_ly numeric,
  add column if not exists imm_kompendium boolean not null default false;

comment on column public.celestial_objects.distance_ly is
  'Işık yılı cinsinden uzaklık. Kaynak: Imm Deep Sky Compendium (SIMBAD).';

comment on column public.celestial_objects.imm_kompendium is
  'Imm Deep Sky Compendium seçkisinde yer alıyor mu — gezinme filtresi.';

create index if not exists celestial_objects_imm
  on public.celestial_objects (imm_kompendium)
  where imm_kompendium;

/*
 * Girdi biçimi — dizi içinde dizi, alan adı yok:
 *   [eslesme, uzaklik_ly, [yeni_kodlar], lakap, ra, dec, boyut]
 *
 * Alan adlı nesne kullanmak dosyayı iki katına çıkarırdı ve bu veri
 * Edge Function paketinin içinde sıkıştırılmış olarak taşınıyor.
 * Konum alanları yalnızca eşleşecek kodu OLMAYAN satırlarda dolu
 * (Abell gezegenimsileri, Gum bulutsuları); onlar yeni kayıt olarak
 * ekleniyor.
 */
create or replace function public.imm_birlestir(kayitlar jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  guncellenen integer;
  eklenen integer;
  kod_eklenen integer;
  ad_eklenen integer;
begin
  if not app.katalog_yetkili() then
    raise exception 'Yetki yok' using errcode = 'insufficient_privilege';
  end if;

  create temp table imm_girdi on commit drop as
  select
    (k->>0) as eslesme,
    nullif(k->>1, '')::numeric as uzaklik,
    coalesce(
      (select array_agg(x) from jsonb_array_elements_text(k->2) as t(x)),
      array[]::text[]
    ) as yeni_kodlar,
    nullif(k->>3, '0') as lakap,
    nullif(k->>4, '0')::numeric as ra_deg,
    nullif(k->>5, '0')::numeric as dec_deg,
    nullif(k->>6, '0')::numeric as boyut
  from jsonb_array_elements(kayitlar) as k;

  /* Eşleştirme: önce katalog kodu, sonra birincil kod. Konumdan
     eşleştirme YOK — kod taşıyan satırlarda gereksiz, taşımayanlarda
     zaten yeni kayıt istiyoruz. */
  create temp table imm_eslesme on commit drop as
  select g.eslesme, min(ci.object_id::text)::uuid as object_id
  from pg_temp.imm_girdi g
  join public.catalog_identifiers ci on ci.code = g.eslesme
  group by g.eslesme;

  create unique index on pg_temp.imm_eslesme (eslesme);

  update public.celestial_objects co
  set
    distance_ly = coalesce(g.uzaklik, co.distance_ly),
    imm_kompendium = true,
    updated_at = now()
  from pg_temp.imm_eslesme e
  join pg_temp.imm_girdi g on g.eslesme = e.eslesme
  where co.id = e.object_id;

  get diagnostics guncellenen = row_count;

  /* Lakap yalnızca üretilmiş adların üstüne yazılıyor (başlıktaki
     gerekçe). Ayrı bir UPDATE çünkü koşulu farklı ve tek sorguda
     birleştirmek koşulu okunmaz hâle getirirdi. */
  update public.celestial_objects co
  set name = g.lakap, updated_at = now()
  from pg_temp.imm_eslesme e
  join pg_temp.imm_girdi g on g.eslesme = e.eslesme
  where co.id = e.object_id
    and g.lakap is not null
    and co.name like co.catalog || ' %';

  get diagnostics ad_eklenen = row_count;

  /* Eşleşmeyen satırlar yeni kayıt. Slug katalog kodundan üretiliyor;
     çakışırsa satır atlanıyor — kompendiyum bir satır eksik kalsın,
     var olan bir hedefin bağlantısı kırılmasın. */
  insert into public.celestial_objects
    (slug, name, catalog, kind, constellation, ra_deg, dec_deg,
     size_major_arcmin, distance_ly, imm_kompendium, description)
  select
    regexp_replace(lower(replace(g.eslesme, ' ', '')), '[^a-z0-9-]', '-', 'g'),
    coalesce(g.lakap, g.eslesme),
    g.eslesme,
    'diger',
    '—',
    g.ra_deg,
    g.dec_deg,
    nullif(g.boyut, 0),
    g.uzaklik,
    true,
    ''
  from pg_temp.imm_girdi g
  left join pg_temp.imm_eslesme e on e.eslesme = g.eslesme
  where e.eslesme is null
    and g.ra_deg is not null
    and length(regexp_replace(lower(replace(g.eslesme, ' ', '')), '[^a-z0-9-]', '-', 'g')) between 2 and 80
  on conflict (slug) do nothing;

  get diagnostics eklenen = row_count;

  /* Yeni katalog kodları: hem eşleşen hem yeni eklenen kayıtlara. */
  insert into public.catalog_identifiers (object_id, code, is_primary)
  select coalesce(e.object_id, yeni.id), kod, false
  from pg_temp.imm_girdi g
  left join pg_temp.imm_eslesme e on e.eslesme = g.eslesme
  left join public.celestial_objects yeni on yeni.catalog = g.eslesme
  cross join lateral unnest(g.yeni_kodlar) as kod
  where coalesce(e.object_id, yeni.id) is not null
  on conflict (object_id, code) do nothing;

  get diagnostics kod_eklenen = row_count;

  return jsonb_build_object(
    'girdi', (select count(*) from pg_temp.imm_girdi),
    'guncellenen', guncellenen,
    'ad_degisen', ad_eklenen,
    'eklenen', eklenen,
    'kod_eklenen', kod_eklenen,
    'secki_toplam', (select count(*) from public.celestial_objects where imm_kompendium),
    'uzaklikli', (select count(*) from public.celestial_objects where distance_ly is not null)
  );
end;
$$;

comment on function public.imm_birlestir(jsonb) is
  'Imm Deep Sky Compendium verisini katalogla birleştirir: uzaklık, '
  'lakap, eksik katalog üyelikleri ve seçki işareti.';

grant execute on function public.imm_birlestir(jsonb) to authenticated;

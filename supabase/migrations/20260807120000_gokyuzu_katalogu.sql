-- ═══════════════════════════════════════════════════════════════════════
-- GÖKYÜZÜ KATALOĞU — 16.663 nesneyi gezilebilir kılan sorgu
--
-- `hedef_ara` bir ARAMA fonksiyonu: kullanıcı ne aradığını biliyor ve
-- yazıyor. Yeni modülün sorusu farklı — "ne var?". Bu, filtreleme ve
-- sayfalama demek, ve ikisi de sunucuda olmak zorunda:
--
--   · 16.663 kaydı istemciye indirip orada filtrelemek ~9 MB.
--   · PostgREST'in satır tavanı 1.000; `.select()` ile filtrelemek
--     sessizce kesilmiş sonuç verir.
--
-- ── NEDEN TEK JSONB DÖNÜYOR ────────────────────────────────────────────
-- Sayfalanmış bir liste iki bilgi ister: SATIRLAR ve TOPLAM. İkisini iki
-- çağrıyla almak, filtre değişirken toplamın satırlardan bir adım geride
-- kalmasına yol açar — kullanıcı "247 sonuç" yazısının altında 30 farklı
-- kaydı görür. Tek çağrı, tek tutarlı an.
--
-- ── KATALOG AİLESİ FİLTRESİ ────────────────────────────────────────────
-- "Sharpless" demek `catalog_identifiers.code like 'Sh2-%'` demek.
-- Ayırıcıyı da desene dâhil etmek şart: 'M %' yazmasaydık 'Mel 22' ve
-- 'Mink 1' de Messier sayılırdı. Desen için `text_pattern_ops` indeksi
-- var — onsuz her filtre 46.051 satır tarardı.
--
-- Geri alma:
--   drop function if exists public.katalog_gozat(text,text,text,text,boolean,numeric,numeric,text,integer,integer);
--   drop function if exists public.katalog_ozet();
--   drop index if exists catalog_identifiers_code_pattern;
-- ═══════════════════════════════════════════════════════════════════════

create index if not exists catalog_identifiers_code_pattern
  on public.catalog_identifiers (code text_pattern_ops);

create index if not exists celestial_objects_kind
  on public.celestial_objects (kind);

create or replace function public.katalog_gozat(
  q text default '',
  katalog_deseni text default null,
  tur text default null,
  takimyildiz text default null,
  sadece_secki boolean default false,
  en_sonuk_kadir numeric default null,
  en_kucuk_arcmin numeric default null,
  sirala text default 'parlaklik',
  sayfa integer default 0,
  adet integer default 24
)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  /* CTE, geçici tablo DEĞİL. İlk sürüm `create temp table` kullanıyordu
     ve Postgres onu `stable` bir fonksiyonda reddediyor ("CREATE TABLE AS
     is not allowed in a non-volatile function"). Fonksiyonu `volatile`
     yapmak da çözüm olurdu ama yanlış olurdu: bu sorgu hiçbir şey
     yazmıyor ve planlayıcının bunu bilmesi işine yarıyor. */
  with sinirlar as (
    select
      lower(replace(coalesce(q, ''), ' ', '')) as sade,
      lower(trim(coalesce(q, ''))) as duz,
      least(greatest(coalesce(adet, 24), 1), 60) as sinir,
      greatest(coalesce(sayfa, 0), 0) * least(greatest(coalesce(adet, 24), 1), 60) as atla
  ),
  aday as (
    select co.id
    from public.celestial_objects co, sinirlar s
    where (
        s.duz = ''
        or co.name ilike '%' || s.duz || '%'
        or exists (
          select 1 from public.catalog_identifiers ci
          where ci.object_id = co.id
            and lower(replace(ci.code, ' ', '')) like s.sade || '%'
        )
      )
      and (
        katalog_deseni is null
        or exists (
          select 1 from public.catalog_identifiers ci
          where ci.object_id = co.id and ci.code like katalog_deseni
        )
      )
      and (tur is null or co.kind = tur)
      and (takimyildiz is null or co.constellation = takimyildiz)
      and (not sadece_secki or co.imm_kompendium)
      /* Kadir eşiği "bundan PARLAK olanlar" demek ve kadir ölçeği ters:
         küçük sayı parlak. Kadiri bilinmeyen kayıt eşiğe takılmıyor —
         "bilinmiyor" ile "sönük" aynı şey değil. */
      and (en_sonuk_kadir is null or co.magnitude is null or co.magnitude <= en_sonuk_kadir)
      and (en_kucuk_arcmin is null or coalesce(co.size_major_arcmin, 0) >= en_kucuk_arcmin)
  )
  select jsonb_build_object(
    /* Toplam AYRI sayılıyor, sayfadan türetilmiyor: son sayfanın
       ötesine gidildiğinde sayfa boş döner ama toplam yine doğru
       olmalı — aksi hâlde arayüz "0 sonuç" der ve kullanıcı filtresini
       boşuna değiştirir. */
    'toplam', (select count(*) from aday),
    'satirlar', (
      select coalesce(jsonb_agg(satir), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id', co.id,
          'slug', co.slug,
          'name', co.name,
          'catalog', co.catalog,
          'kind', co.kind,
          'constellation', co.constellation,
          'ra_deg', co.ra_deg,
          'dec_deg', co.dec_deg,
          'magnitude', co.magnitude,
          'size_major_arcmin', co.size_major_arcmin,
          'size_minor_arcmin', co.size_minor_arcmin,
          'best_months', co.best_months,
          'difficulty', co.difficulty,
          'recommended_focal', co.recommended_focal,
          'recommended_filters', co.recommended_filters,
          'description', co.description,
          'distance_ly', co.distance_ly,
          'imm', co.imm_kompendium,
          'kodlar', coalesce(
            (select array_agg(ci.code order by ci.is_primary desc, ci.code)
             from public.catalog_identifiers ci where ci.object_id = co.id),
            array[]::text[]
          )
        ) as satir
        from aday a
        join public.celestial_objects co on co.id = a.id
        cross join sinirlar s
        order by
          /* NULL'lar HER ZAMAN sonda: kadiri bilinmeyen 8.000 kayıt
             listenin başına gelirse "en parlak" sıralaması hiçbir parlak
             nesne göstermez. */
          case when sirala = 'parlaklik' then co.magnitude end asc nulls last,
          case when sirala = 'boyut' then co.size_major_arcmin end desc nulls last,
          case when sirala = 'uzaklik' then co.distance_ly end asc nulls last,
          case when sirala = 'ra' then co.ra_deg end asc nulls last,
          case when sirala = 'ad' then co.name end asc,
          co.catalog
        offset (select atla from sinirlar)
        limit (select sinir from sinirlar)
      ) t
    )
  );
$$;

comment on function public.katalog_gozat(text,text,text,text,boolean,numeric,numeric,text,integer,integer) is
  'Gökyüzü Kataloğu modülünün liste sorgusu: filtre, sıralama, sayfalama '
  've toplam sayı tek çağrıda.';

grant execute on function public.katalog_gozat(text,text,text,text,boolean,numeric,numeric,text,integer,integer)
  to anon, authenticated;

-- ── Özet: filtre seçeneklerinin GERÇEK sayıları ───────────────────────
--
-- Filtre menüsünde boş bir seçenek listelemek, tıklandığında hiçbir şey
-- göstermeyen bir menü demek. Türler ve takımyıldızlar bu yüzden sabit
-- listeden değil, tablodan geliyor; katalog aileleri de kaç nesne
-- içerdiğini söylüyor ("Sharpless · 313").

create or replace function public.katalog_ozet()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'toplam', (select count(*) from public.celestial_objects),
    'secki', (select count(*) from public.celestial_objects where imm_kompendium),
    'kod', (select count(*) from public.catalog_identifiers),
    'turler', (
      select coalesce(jsonb_agg(jsonb_build_object('tur', kind, 'adet', n)
                                order by n desc), '[]'::jsonb)
      from (select kind, count(*) as n from public.celestial_objects group by kind) t
    ),
    'takimyildizlar', (
      select coalesce(jsonb_agg(jsonb_build_object('ad', constellation, 'adet', n)
                                order by constellation), '[]'::jsonb)
      from (
        select constellation, count(*) as n
        from public.celestial_objects
        where constellation <> '—'
        group by constellation
      ) t
    )
  );
$$;

comment on function public.katalog_ozet() is
  'Gökyüzü Kataloğu filtre menüsünün gerçek sayıları.';

grant execute on function public.katalog_ozet() to anon, authenticated;

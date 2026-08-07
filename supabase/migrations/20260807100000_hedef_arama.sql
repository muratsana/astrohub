-- ═══════════════════════════════════════════════════════════════════════
-- HEDEF ARAMA — 16.149 kayıt istemciye İNMEDEN aranabilir olsun
--
-- Katalog 182 satırken `fetchTargets` tabloyu olduğu gibi çekiyor ve
-- filtreleme tarayıcıda yapılıyordu. 16.149 satırda bu iki ayrı sebeple
-- çalışmaz:
--
--   · Yük. Kayıtlar katalog kodlarıyla birlikte ~9 MB. Hedef seçmek için
--     açılan bir açılır listenin bedeli 9 MB olamaz.
--   · Sessiz kesilme. PostgREST varsayılan satır tavanı 1.000; istemci
--     hiçbir uyarı almadan kataloğun on altıda birini görür ve
--     "Sh2-101 yok" sonucuna varır.
--
-- Arama bu yüzden sunucuda. İstemci sorguyu gönderiyor, en fazla birkaç
-- düzine satır geri geliyor.
--
-- ── SIRALAMA NEDEN ELLE YAZILDI ────────────────────────────────────────
-- Tek bir benzerlik ölçütü doğru sırayı vermiyor. "m31" yazan biri M 31
-- istiyor; salt trigram benzerliği "M 310" ya da "M 31 Galaksisi" adlı
-- kayıtları da yakın bulur ve bazen öne koyar. Bu yüzden eşleşme türü
-- açık bir öncelik taşıyor:
--
--   1  kodun tamamı birebir      ("m31" → M 31)
--   2  kod bu önekle başlıyor    ("ngc70" → NGC 700, NGC 7000…)
--   3  ad bu kelimeyle başlıyor  ("kuzey" → Kuzey Amerika Bulutsusu)
--   4  ad içinde geçiyor         ("amerika" → Kuzey Amerika Bulutsusu)
--
-- Aynı öncelikte olanlar PARLAKLIĞA göre sıralanıyor: "ngc70" yazan biri
-- büyük ihtimalle NGC 7000'i arıyor, NGC 7004'ü değil. Kadiri olmayan
-- kayıtlar en sona düşüyor (nulls last).
--
-- ── KOD NORMALLEŞTİRME ─────────────────────────────────────────────────
-- Kullanıcı "NGC 7000", "ngc7000", "NGC7000" yazabilir; katalogda tek
-- biçim var. Karşılaştırma iki tarafta da boşluksuz-küçük harfe
-- indirilerek yapılıyor ve indeks TAM O İFADE üzerinde — ifade
-- indekslenmezse sorgu 44.677 satırı tarardı.
--
-- Geri alma:
--   drop function if exists public.hedef_ara(text, text, integer);
--   drop index if exists catalog_identifiers_kod_sade;
--   drop index if exists celestial_objects_ad_trgm;
-- ═══════════════════════════════════════════════════════════════════════

create index if not exists catalog_identifiers_kod_sade
  on public.catalog_identifiers (lower(replace(code, ' ', '')) text_pattern_ops);

create index if not exists celestial_objects_ad_trgm
  on public.celestial_objects using gin (name gin_trgm_ops);

create index if not exists celestial_objects_takimyildiz
  on public.celestial_objects (constellation);

create or replace function public.hedef_ara(
  q text default '',
  tur text default null,
  adet integer default 30
)
returns table (
  id uuid,
  slug text,
  name text,
  catalog text,
  kind text,
  constellation text,
  ra_deg numeric,
  dec_deg numeric,
  magnitude numeric,
  size_major_arcmin numeric,
  size_minor_arcmin numeric,
  best_months text,
  difficulty text,
  recommended_focal text,
  recommended_filters text,
  description text,
  kodlar text[]
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with sorgu as (
    select
      lower(replace(coalesce(q, ''), ' ', '')) as sade,
      lower(trim(coalesce(q, ''))) as duz
  ),
  /* Kod eşleşmeleri: nesne başına EN İYİ öncelik alınıyor. Bir nesnenin
     hem birebir hem önek eşleşen iki kodu olabilir (M 31 ve M 310 değil
     ama NGC 224 ile NGC 224A gibi); iki satır dönmemesi için min(). */
  kod_eslesme as (
    select ci.object_id, min(case
      when lower(replace(ci.code, ' ', '')) = s.sade then 1
      else 2
    end) as oncelik
    from public.catalog_identifiers ci, sorgu s
    where s.sade <> ''
      and lower(replace(ci.code, ' ', '')) like s.sade || '%'
    group by ci.object_id
  ),
  ad_eslesme as (
    select co.id as object_id, case
      when lower(co.name) like s.duz || '%' then 3
      else 4
    end as oncelik
    from public.celestial_objects co, sorgu s
    where s.duz <> '' and co.name ilike '%' || s.duz || '%'
  ),
  birlesik as (
    select object_id, min(oncelik) as oncelik
    from (
      select * from kod_eslesme
      union all
      select * from ad_eslesme
    ) t
    group by object_id
  )
  select
    co.id, co.slug, co.name, co.catalog, co.kind, co.constellation,
    co.ra_deg, co.dec_deg, co.magnitude, co.size_major_arcmin,
    co.size_minor_arcmin, co.best_months, co.difficulty,
    co.recommended_focal, co.recommended_filters, co.description,
    coalesce(
      (select array_agg(ci.code order by ci.is_primary desc, ci.code)
       from public.catalog_identifiers ci where ci.object_id = co.id),
      array[]::text[]
    ) as kodlar
  from birlesik b
  join public.celestial_objects co on co.id = b.object_id
  where tur is null or co.kind = tur
  order by b.oncelik, co.magnitude asc nulls last, co.name
  limit least(greatest(coalesce(adet, 30), 1), 100);
$$;

comment on function public.hedef_ara(text, text, integer) is
  'Katalogda hedef arar: önce katalog kodu, sonra ad. Sıralama eşleşme '
  'türüne, ardından parlaklığa göre.';

grant execute on function public.hedef_ara(text, text, integer) to anon, authenticated;

-- ── Alan içindeki cisimler (koni araması) ─────────────────────────────
--
-- Alan çözümü bir fotoğrafın merkezini ve genişliğini veriyor; "bu
-- karede ne var" sorusunu ancak katalog cevaplayabilir. AstroBin'in
-- açıklamalı görüntüsünün yaptığı iş bu.
--
-- NEDEN POSTGIS DEĞİL: tablo coğrafi sütun taşımıyor ve eklemek 16.149
-- satırı yeniden yazmak demekti. Bunun yerine önce DİK AÇIKLIK KUŞAĞI
-- ile kaba eleme yapılıyor (indeksli, aralık taraması), sonra kalan
-- birkaç yüz satırda gerçek küresel mesafe hesaplanıyor. Kuşak
-- genişliği yarıçapın kendisi, yani eleme hiçbir doğru sonucu atmıyor.
--
-- Sağ açıklık kuşakla elenmiyor: 0°/360° sarması orada özel durum
-- üretir ve kazanç dik açıklık elemesinin yanında küçük.

create index if not exists celestial_objects_dec
  on public.celestial_objects (dec_deg)
  where dec_deg is not null;

create or replace function public.alandaki_cisimler(
  merkez_ra numeric,
  merkez_dec numeric,
  yaricap_derece numeric,
  adet integer default 40
)
returns table (
  id uuid,
  slug text,
  name text,
  catalog text,
  kind text,
  ra_deg numeric,
  dec_deg numeric,
  magnitude numeric,
  size_major_arcmin numeric,
  uzaklik_derece double precision
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    co.id, co.slug, co.name, co.catalog, co.kind,
    co.ra_deg, co.dec_deg, co.magnitude, co.size_major_arcmin,
    d.uzaklik
  from public.celestial_objects co
  cross join lateral (
    select degrees(2 * asin(least(1, sqrt(
      sin(radians((co.dec_deg - merkez_dec) / 2)) ^ 2
      + cos(radians(merkez_dec)) * cos(radians(co.dec_deg))
        * sin(radians((co.ra_deg - merkez_ra) / 2)) ^ 2
    )))) as uzaklik
  ) d
  where co.ra_deg is not null
    and co.dec_deg is not null
    and co.dec_deg between merkez_dec - yaricap_derece
                       and merkez_dec + yaricap_derece
    and d.uzaklik <= yaricap_derece
    /* Yıldızlar ve sınıflandırılamayan kayıtlar dışarıda: bir kareye
       200 etiket basmak, etiketlerin hepsini okunmaz yapar. Etiket
       değeri olan şey katalog nesnesi — NGC numarası almış tek bir
       yıldız değil. */
    and co.kind not in ('yildiz', 'diger')
  order by
    /* Büyük ve parlak olan önce: kadraja adını veren cisim listenin
       başında olmalı, kenardaki 15. kadir galaksi değil. */
    co.magnitude asc nulls last,
    co.size_major_arcmin desc nulls last
  limit least(greatest(coalesce(adet, 40), 1), 200);
$$;

comment on function public.alandaki_cisimler(numeric, numeric, numeric, integer) is
  'Verilen gökyüzü konumunun çevresindeki katalog cisimleri — alan '
  'çözümü sonucunu etiketlemek için.';

grant execute on function public.alandaki_cisimler(numeric, numeric, numeric, integer)
  to anon, authenticated;

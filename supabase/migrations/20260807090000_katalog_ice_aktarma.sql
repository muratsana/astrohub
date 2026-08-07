-- ═══════════════════════════════════════════════════════════════════════
-- KATALOG İÇE AKTARMA ALTYAPISI
--
-- Ölçülen durum: `celestial_objects` 182 satır, `catalog_identifiers` 321
-- satır taşıyordu. NGC tek başına 7.840, IC 5.386, Sharpless 313 kayıt.
-- Yani katalog "eksik" değil, neredeyse boştu: kullanıcı Sh2-101 diye
-- arattığında sonuç alamıyor ve hedefini serbest metin olarak yazmak
-- zorunda kalıyordu — o da fotoğrafın hiçbir hedefe BAĞLANMAMASI demek.
--
-- ── NEDEN HAZIRLIK TABLOSU ─────────────────────────────────────────────
-- İçe aktarma 19.000 satır getiriyor ve her satırın mevcut kayıtlarla
-- eşleştirilmesi gerekiyor. Bunu satır satır yapmak 19.000 ayrı sorgu
-- demekti (Edge Function'ın süresi buna yetmez). Satırlar önce hazırlık
-- tablosuna toplu yazılıyor, eşleştirme sonra TEK küme sorgusuyla
-- yapılıyor.
--
-- Tablo `app` şemasında ve PostgREST'e açık değil; içeriği yalnızca
-- buradaki iki fonksiyon üzerinden yazılıp okunuyor.
--
-- ── NEDEN "YALNIZCA BOŞ ALANI DOLDUR" ──────────────────────────────────
-- Mevcut 182 kaydın Türkçe adları, açıklamaları ve editör notları elle
-- yazıldı. İçe aktarma onları kaynaktaki İngilizce adla ezseydi, bir
-- içe aktarma tüm editöryel emeği silerdi. Bu yüzden eşleşen kayıtlarda
-- yalnızca BOŞ olan ölçüm alanları dolduruluyor; ad, açıklama, slug ve
-- editör alanları olduğu gibi kalıyor.
--
-- Geri alma:
--   drop function if exists public.katalog_birlestir();
--   drop function if exists public.katalog_hazirligi_yaz(jsonb);
--   drop function if exists public.katalog_hazirligi_bosalt();
--   drop function if exists public.katalog_yetkisi();
--   drop table if exists app.katalog_hazirlik;
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists app.katalog_hazirlik (
  id bigserial primary key,
  slug text not null,
  ad text not null,
  katalog text not null,
  tur text not null,
  takimyildiz text not null,
  ra_deg numeric,
  dec_deg numeric,
  kadir numeric,
  buyuk_eksen numeric,
  kucuk_eksen numeric,
  kodlar text[] not null
);

comment on table app.katalog_hazirlik is
  'İçe aktarma ara tablosu. Kalıcı veri değil; her içe aktarmada '
  'boşaltılıp yeniden doldurulur.';

create index if not exists katalog_hazirlik_kodlar
  on app.katalog_hazirlik using gin (kodlar);

-- ── Yetki kontrolü ────────────────────────────────────────────────────
--
-- İKİ ÇAĞIRAN VAR ve ikisi de geçmeli:
--
--   · Edge Function'ı tetikleyen YÖNETİCİ — kendi JWT'siyle
--     `katalog_yetkisi()` çağırıyor, `app.is_admin()` cevap veriyor.
--   · Edge Function'ın KENDİSİ — yazma işlemlerini servis anahtarıyla
--     yapıyor. Servis anahtarında `auth.uid()` NULL'dır, yani
--     `app.is_admin()` false döner. Sadece ona baksaydık fonksiyon
--     kendi kendini reddederdi.
--
-- Servis anahtarı kontrolü JWT'nin `role` iddiasından okunuyor; o iddia
-- anahtarın kendisiyle imzalı ve istemci tarafından uydurulamaz.

create or replace function app.katalog_yetkili()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    app.is_admin()
    or coalesce(
         nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
         ''
       ) = 'service_role';
$$;

comment on function app.katalog_yetkili() is
  'Katalog içe aktarma yetkisi: yönetici JWT''si ya da servis anahtarı.';

-- `app.is_admin()` PostgREST'e açık şemada değil. Fonksiyonu oraya
-- taşımak yerine ince bir kapı açıyoruz: bu sarmalayıcı yalnızca
-- "evet/hayır" döndürüyor ve başka hiçbir şey yapmıyor.

create or replace function public.katalog_yetkisi()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select app.is_admin();
$$;

comment on function public.katalog_yetkisi() is
  'Katalog içe aktarma yetkisi var mı — Edge Function için.';

grant execute on function public.katalog_yetkisi() to authenticated;

-- ── Paylaşılan sır doğrulaması ────────────────────────────────────────
--
-- Bakım çağrısı veritabanından (`pg_net`) geliyor ve taşıyabileceği bir
-- kullanıcı oturumu yok. Sır Vault'ta duruyor; bu fonksiyon onu
-- OKUTMUYOR, yalnızca "sunulan değer doğru mu" sorusuna evet/hayır
-- veriyor. Sırrı döndüren bir fonksiyon, sızdığında sırrı da sızdırırdı.
--
-- Yetki: hiçbir role verilmiyor. `service_role` yetki kontrolünü
-- atlayarak çağırabiliyor ve fonksiyonu yalnızca Edge Function
-- kullanıyor.

create or replace function public.katalog_sirri_dogru_mu(sunulan text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'katalog_sirri'
      and decrypted_secret = sunulan
      and length(coalesce(sunulan, '')) >= 32
  );
$$;

revoke execute on function public.katalog_sirri_dogru_mu(text) from public;

-- ── Hazırlık tablosunu boşalt ─────────────────────────────────────────

create or replace function public.katalog_hazirligi_bosalt()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not app.katalog_yetkili() then
    raise exception 'Yetki yok' using errcode = 'insufficient_privilege';
  end if;
  truncate app.katalog_hazirlik restart identity;
end;
$$;

-- ── Hazırlık tablosuna toplu yazma ────────────────────────────────────
--
-- Girdi jsonb dizisi: Edge Function 2.000'lik parçalar hâlinde
-- gönderiyor. `jsonb_to_recordset` satırları tek INSERT'te açıyor —
-- 2.000 ayrı INSERT yerine bir tane.

create or replace function public.katalog_hazirligi_yaz(kayitlar jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  eklenen integer;
begin
  if not app.katalog_yetkili() then
    raise exception 'Yetki yok' using errcode = 'insufficient_privilege';
  end if;

  insert into app.katalog_hazirlik
    (slug, ad, katalog, tur, takimyildiz, ra_deg, dec_deg, kadir,
     buyuk_eksen, kucuk_eksen, kodlar)
  select
    k.slug, k.ad, k.katalog, k.tur, k.takimyildiz, k.ra_deg, k.dec_deg,
    k.kadir, k.buyuk_eksen, k.kucuk_eksen, k.kodlar
  from jsonb_to_recordset(kayitlar) as k(
    slug text, ad text, katalog text, tur text, takimyildiz text,
    ra_deg numeric, dec_deg numeric, kadir numeric,
    buyuk_eksen numeric, kucuk_eksen numeric, kodlar text[]
  );

  get diagnostics eklenen = row_count;
  return eklenen;
end;
$$;

grant execute on function public.katalog_hazirligi_bosalt() to authenticated;
grant execute on function public.katalog_hazirligi_yaz(jsonb) to authenticated;

-- ── Birleştirme ───────────────────────────────────────────────────────
--
-- Üç adım: eşleştir → mevcutları tamamla → yenileri ekle → kodları yaz.
--
-- EŞLEŞTİRME PUANI: bir hazırlık satırı birden çok mevcut kayda
-- değebilir (M 31 satırı hem "M 31" hem "NGC 224" koduna sahip ve bunlar
-- ayrı kayıtlarda olabilir). En çok kod paylaşan kayıt kazanıyor;
-- eşitlikte en eski kayıt (kimliği fotoğraflara bağlı olma ihtimali en
-- yüksek olan) tutuluyor.

create or replace function public.katalog_birlestir()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  guncellenen integer;
  eklenen integer;
  kod_eklenen integer;
begin
  if not app.katalog_yetkili() then
    raise exception 'Yetki yok' using errcode = 'insufficient_privilege';
  end if;

  create temp table hazirlik_eslesme on commit drop as
  with adaylar as (
    select h.id as hid, ci.object_id, 2 as puan
    from app.katalog_hazirlik h
    join public.catalog_identifiers ci on ci.code = any (h.kodlar)
    union all
    select h.id, co.id, 2
    from app.katalog_hazirlik h
    join public.celestial_objects co on co.catalog = any (h.kodlar)
    union all
    /* Slug eşleşmesi en zayıf kanıt: elle girilmiş slug'lar
       ("ic434-at-basi") kaynaktakiyle aynı olmayabilir, ama aynı
       olduğunda da tesadüf değildir. */
    select h.id, co.id, 1
    from app.katalog_hazirlik h
    join public.celestial_objects co on co.slug = h.slug
  ),
  puanli as (
    select hid, object_id, sum(puan) as toplam
    from adaylar group by hid, object_id
  )
  select distinct on (hid) hid, object_id
  from puanli
  order by hid, toplam desc, object_id;

  create unique index on pg_temp.hazirlik_eslesme (hid);

  /* ── Mevcut kayıtlar: yalnızca BOŞ ölçüm alanları doldurulur ──
     `coalesce(mevcut, yeni)` sırası bilinçli — soldaki kazanıyor, yani
     veritabanındaki değer korunuyor. */
  update public.celestial_objects co
  set
    ra_deg = coalesce(co.ra_deg, h.ra_deg),
    dec_deg = coalesce(co.dec_deg, h.dec_deg),
    magnitude = coalesce(co.magnitude, h.kadir),
    size_major_arcmin = coalesce(co.size_major_arcmin, h.buyuk_eksen),
    size_minor_arcmin = coalesce(co.size_minor_arcmin, h.kucuk_eksen),
    constellation = case
      when co.constellation in ('', '—') then h.takimyildiz
      else co.constellation
    end,
    updated_at = now()
  from pg_temp.hazirlik_eslesme e
  join app.katalog_hazirlik h on h.id = e.hid
  where co.id = e.object_id;

  get diagnostics guncellenen = row_count;

  /* ── Yeni kayıtlar ──
     Slug çakışması olamaz: içe aktarma tarafı kendi içinde tekilledi,
     mevcut slug'lar ise eşleştirme adımında yakalandı. Yine de
     `on conflict do nothing` var — bir çakışma içe aktarmanın tamamını
     düşürmemeli. */
  insert into public.celestial_objects
    (slug, name, catalog, kind, constellation, ra_deg, dec_deg,
     magnitude, size_major_arcmin, size_minor_arcmin, description)
  select
    h.slug, h.ad, h.katalog, h.tur, h.takimyildiz, h.ra_deg, h.dec_deg,
    h.kadir, h.buyuk_eksen, h.kucuk_eksen, ''
  from app.katalog_hazirlik h
  left join pg_temp.hazirlik_eslesme e on e.hid = h.id
  where e.hid is null
  on conflict (slug) do nothing;

  get diagnostics eklenen = row_count;

  /* ── Katalog kodları ──
     Hedef nesne: eşleşen kayıt varsa o, yoksa yeni eklenen (slug'dan
     bulunuyor).

     `is_primary` YALNIZCA yeni kayıtlarda işaretleniyor. Mevcut bir
     kaydın birincil kodu zaten var ve o karar editöre ait: "Barnard 33"
     diye kaydedilmiş bir hedefe kaynaktan gelen "B 33" kodunu ikinci
     birincil yapmak, arayüzde iki birincil kod ve takma ad listesinde
     boşluk demekti. */
  insert into public.catalog_identifiers (object_id, code, is_primary)
  select
    coalesce(e.object_id, yeni.id),
    kod,
    kod = h.katalog and e.object_id is null
  from app.katalog_hazirlik h
  left join pg_temp.hazirlik_eslesme e on e.hid = h.id
  left join public.celestial_objects yeni on yeni.slug = h.slug
  cross join lateral unnest(h.kodlar) as kod
  where coalesce(e.object_id, yeni.id) is not null
  on conflict (object_id, code) do nothing;

  get diagnostics kod_eklenen = row_count;

  return jsonb_build_object(
    'hazirlik', (select count(*) from app.katalog_hazirlik),
    'guncellenen', guncellenen,
    'eklenen', eklenen,
    'kod_eklenen', kod_eklenen,
    'nesne_toplam', (select count(*) from public.celestial_objects),
    'kod_toplam', (select count(*) from public.catalog_identifiers)
  );
end;
$$;

comment on function public.katalog_birlestir() is
  'Hazırlık tablosunu katalogla birleştirir: mevcut kayıtların boş '
  'alanlarını doldurur, yeni kayıtları ekler, katalog kodlarını yazar.';

grant execute on function public.katalog_birlestir() to authenticated;

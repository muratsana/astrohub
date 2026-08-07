-- ═══════════════════════════════════════════════════════════════════════
-- ÖLÇÜLEN VERİTABANI BORÇLARI — Supabase danışmanının işaret ettikleri
--
-- Üç ayrı sorun, üçü de ölçüldü ve üçü de küçük. Bir arada duruyorlar
-- çünkü hiçbiri tek başına bir göç dosyasını hak etmiyor ve üçü de aynı
-- kaynaktan çıktı.
--
-- ═══════════════════════════════════════════════════════════════════════
-- 1. DEĞİŞTİRİLEBİLİR search_path — GÜVENLİK
--
-- `set search_path` taşımayan bir SECURITY DEFINER ya da tetikleyici
-- fonksiyonu, çağıranın `search_path`iyle çalışır. Saldırgan kendi
-- şemasını öne alıp fonksiyonun çağırdığı bir adı (örneğin `now()` ya da
-- bir tablo adını) kendi nesnesiyle gölgeleyebilir ve fonksiyonun
-- yetkisiyle çalıştırabilir.
--
-- Üç fonksiyon bu korumadan yoksundu. Üçü de basit ama ikisi TETİKLEYİCİ
-- ve tetikleyiciler tabloya yazan herkesin bağlamında çalışıyor — yani
-- saldırı yüzeyi tam olarak orada.
--
-- ═══════════════════════════════════════════════════════════════════════
-- 2. SATIR BAŞINA auth.uid() — PERFORMANS
--
-- `auth.uid() = user_id` yazan bir RLS politikası, fonksiyonu TARANAN HER
-- SATIR için yeniden çağırıyor. `(select auth.uid())` ise Postgres'in
-- InitPlan'ına giriyor ve sorgu başına BİR KEZ hesaplanıyor.
--
-- Dört politika bu hâldeydi. Bugün tablolar küçük olduğu için fark
-- ölçülmüyor; jüri oylaması büyüdüğünde tam tarama başına binlerce
-- gereksiz fonksiyon çağrısı olur. Davranış birebir aynı kalıyor —
-- değişen tek şey ne zaman hesaplandığı.
--
-- ═══════════════════════════════════════════════════════════════════════
-- 3. ÇİFT İNDEKS — DİSK VE YAZMA MALİYETİ
--
-- `celestial_objects_ad_trgm` ile `celestial_objects_name_trgm_idx`
-- birebir aynı: ikisi de `name` üzerinde GIN trigram. İlki katalog
-- aramasında (`20260807100000`) eklendi, ikincisi zaten vardı — yani
-- yeni indeks gereksizdi ve `if not exists` bunu yakalayamadı çünkü ad
-- farklıydı.
--
-- Aynı indeksi iki kez tutmak diskte iki kat yer ve HER YAZMADA iki kat
-- bakım demek. Sonradan eklenen düşüyor; eski ad kalıyor çünkü ona
-- referans veren daha eski göçler var.
--
-- ═══════════════════════════════════════════════════════════════════════
-- NE YAPILMADI VE NEDEN
--
-- · `spatial_ref_sys` üzerindeki RLS hatası (ERROR): tablo PostGIS'in
--   kendi tablosu ve sahibi uzantı. Üzerinde RLS açmak elimizde değil.
--   Koruma zaten var — `app.reject_spatial_ref_sys_write` tetikleyicisi
--   yazmayı reddediyor ve bu göç onu da sertleştiriyor.
--
-- · `public` şemasındaki uzantılar (citext, pg_trgm, postgis): taşımak
--   onlara referans veren her indeksi, kolonu ve fonksiyonu yeniden
--   yazmayı gerektiriyor. Kazanç isim alanı temizliği, bedel geniş bir
--   kırılma yüzeyi. Bilinçli olarak bırakıldı.
--
-- · 208 "çoklu izin veren politika" uyarısı: `X_admin_all` + `X_own`
--   deseninden geliyor ve birleştirmek yetki modelini yeniden yazmak
--   demek. Yönetim paneli ayrı bir turda ele alınıyor; o tur bu
--   politikaların çoğuna dokunacak. Şimdi birleştirmek iki kez iş olurdu.
--
-- Geri alma: her ifade `create or replace` / `drop index`; eski hâller
-- ilgili özgün göçlerde duruyor.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. search_path sabitlemesi ────────────────────────────────────────

create or replace function app.block_reference_delete()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
begin
  raise exception 'Referans veri silinemez (%). Kullanımdan kaldırmak için is_active = false yapın.',
    tg_table_name using errcode = 'restrict_violation';
end $$;

create or replace function app.notification_category_of(kind app.notification_kind)
returns app.notification_category
language sql
immutable
set search_path to 'pg_catalog', 'app'
as $$
  select case kind
    when 'follow'          then 'sosyal'
    when 'comment'         then 'sosyal'
    when 'comment_reply'   then 'sosyal'
    when 'like'            then 'sosyal'
    when 'rating'          then 'sosyal'
    when 'message'         then 'sosyal'
    when 'photo_featured'  then 'icerik'
    when 'moderation'      then 'icerik'
    when 'listing'         then 'icerik'
    when 'event_new'       then 'etkinlik'
    when 'event_changed'   then 'etkinlik'
    when 'event_cancelled' then 'etkinlik'
    when 'event_reminder'  then 'etkinlik'
    when 'broadcast_live'  then 'yayin'
    when 'podcast_episode' then 'yayin'
    else 'sistem'
  end::app.notification_category;
$$;

create or replace function app.reject_spatial_ref_sys_write()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $$
begin
  /* Bakım yolu: yalnızca veritabanı yöneticisi yazabilir. `session_user`
     ve `current_user` birlikte kontrol ediliyor çünkü SECURITY DEFINER
     bir çağrı zincirinde ikisi ayrışabiliyor. */
  if session_user in ('supabase_admin', 'postgres')
     or current_user in ('supabase_admin', 'postgres') then
    return null;
  end if;

  raise exception
    'spatial_ref_sys salt okunurdur: % islemi reddedildi', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

-- ── 2. RLS politikalarında InitPlan ───────────────────────────────────

drop policy if exists jury_members_own_read on public.jury_members;
create policy jury_members_own_read on public.jury_members
  for select using (user_id = (select auth.uid()));

drop policy if exists photo_of_week_votes_own_read on public.photo_of_week_votes;
create policy photo_of_week_votes_own_read on public.photo_of_week_votes
  for select using (juror_id = (select auth.uid()));

drop policy if exists photo_of_week_votes_own_insert on public.photo_of_week_votes;
create policy photo_of_week_votes_own_insert on public.photo_of_week_votes
  for insert with check (juror_id = (select auth.uid()));

drop policy if exists photo_of_week_votes_own_update on public.photo_of_week_votes;
create policy photo_of_week_votes_own_update on public.photo_of_week_votes
  for update
  using (juror_id = (select auth.uid()))
  with check (juror_id = (select auth.uid()));

-- ── 3. Çift indeks ────────────────────────────────────────────────────

drop index if exists public.celestial_objects_ad_trgm;

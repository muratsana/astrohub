-- 0057_uyelik_kota_ve_odeme_siniri.sql
--
-- FAZ 9 — Standart/Premium üyelik altyapısı (§12).
--
-- ══════════════════════════════════════════════════════════════════════════
-- ÖDEME SAĞLAYICISI BU MIGRATION'DA YOK — VE OLMAYACAK
--
-- §12.2: "ödeme sağlayıcısı bu fazda bağlanmayacaktır". Kullanıcı da
-- aynı sınırı koydu: "ben kur diyene kadar kurma".
--
-- Sınır bilinçli bir yerde duruyor: ödeme, üyeliğin SEBEBİ değil
-- TETİKLEYİCİSİ. `memberships` tablosu kademeyi tutuyor ve onu
-- değiştiren şey bugün yönetici, yarın bir ödeme webhook'u olacak.
-- Sağlayıcı seçilince yazılacak tek şey o webhook; kademe, kota ve
-- yetki mantığı yerinde duruyor ve değişmiyor.
--
-- `provider`, `provider_customer_id`, `provider_subscription_id`
-- kolonları `0021`den beri var ve boş duruyor — adaptörün bağlanacağı
-- yer orası.
--
-- ══════════════════════════════════════════════════════════════════════════
-- YARIŞ DURUMU: SAY-SONRA-KARŞILAŞTIR YETMİYOR
--
-- Mevcut `app.enforce_photo_quota` şunu yapıyordu: fotoğraf sayısını
-- oku, limitle karşılaştır, geçir. İki eşzamanlı yayımlama isteği
-- ikisi de "4 var, limit 5" görüp ikisi de geçebiliyordu — sonuç 6
-- fotoğraf.
--
-- §12.3 bunu adıyla anıyor ("eşzamanlı yüklemelerde race condition
-- önleme"). Çözüm kullanıcı başına danışma kilidi: aynı kullanıcının
-- kota kontrolleri sıraya giriyor, farklı kullanıcılar birbirini
-- beklemiyor. `xact` sürümü işlem bitince kendiliğinden bırakılıyor —
-- elle bırakmayı unutmak diye bir risk yok.
-- ══════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- ÖDEME ANAHTARI — KAPALI
-- ══════════════════════════════════════════════════════════════════════════

insert into public.app_settings (key, value)
values (
  'billing',
  jsonb_build_object(
    /* §12.2 "feature flag ile ödeme sistemi kapalı olmalıdır". */
    'odeme_acik', false,
    'saglayici', null,
    /* Premium sayfasında gösterilecek durum. Arayüz bunu okuyor ve
       "satın al" düğmesi YERİNE gösteriyor — çalışmayan bir düğme
       bırakmak §12.2'nin son maddesine aykırı. */
    'durum_notu', 'Geliştirme aşamasında'
  )
)
on conflict (key) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- KOTA AYARLARI — YÖNETİCİDEN DEĞİŞTİRİLEBİLİR (§12.1, §12.3)
-- ══════════════════════════════════════════════════════════════════════════

insert into public.app_settings (key, value)
values (
  'quotas',
  jsonb_build_object(
    'standart_foto', 5,
    'premium_foto', 30,
    /* §12.1: premium fotoğraf başına en fazla 5 revizyon. Standart
       yayımdan sonra revizyon yükleyemiyor — 0 bunu ifade ediyor. */
    'standart_revizyon', 0,
    'premium_revizyon', 5,
    /* Bayt cinsinden depolama. Türetilmiş küçük resimler fotoğraf
       ADEDİNE girmiyor ama DEPOLAMAYA giriyor (§12.1). */
    'standart_depolama_mb', 250,
    'premium_depolama_mb', 2000
  )
)
on conflict (key) do nothing;

/** Ayar okuma — eksikse belgedeki varsayılan. */
create or replace function app.quota_setting(alan text, varsayilan integer)
returns integer
language sql
stable
security definer
set search_path = public, app, pg_temp
as $$
  select coalesce(
    (select (value ->> alan)::integer from public.app_settings where key = 'quotas'),
    varsayilan
  );
$$;

/** Kademeye göre fotoğraf limiti. */
create or replace function app.photo_limit(target_user uuid)
returns integer
language sql
stable
security definer
set search_path = public, app, pg_temp
as $$
  select case app.membership_tier(target_user)
    when 'premium' then app.quota_setting('premium_foto', 30)
    else app.quota_setting('standart_foto', 5)
  end;
$$;

/** Kademeye göre revizyon limiti (fotoğraf başına). */
create or replace function app.revision_limit(target_user uuid)
returns integer
language sql
stable
security definer
set search_path = public, app, pg_temp
as $$
  select case app.membership_tier(target_user)
    when 'premium' then app.quota_setting('premium_revizyon', 5)
    else app.quota_setting('standart_revizyon', 0)
  end;
$$;

/** Kademeye göre depolama limiti (bayt). */
create or replace function app.storage_limit(target_user uuid)
returns bigint
language sql
stable
security definer
set search_path = public, app, pg_temp
as $$
  select (case app.membership_tier(target_user)
    when 'premium' then app.quota_setting('premium_depolama_mb', 2000)
    else app.quota_setting('standart_depolama_mb', 250)
  end)::bigint * 1024 * 1024;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- FOTOĞRAF KOTASI — YARIŞ DURUMUNA KAPALI
-- ══════════════════════════════════════════════════════════════════════════

create or replace function app.enforce_photo_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  limit_count   integer;
  current_count integer;
  tier          text;
begin
  if new.status <> 'published' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;

  /* KULLANICI BAŞINA DANIŞMA KİLİDİ. Aynı kullanıcının eşzamanlı
     yayımlama istekleri sıraya giriyor; farklı kullanıcılar birbirini
     beklemiyor. `xact` sürümü işlem bitince kendiliğinden bırakılıyor.

     Bu satır olmadan iki eşzamanlı istek ikisi de "4 var, limit 5"
     görüp geçebiliyordu ve sonuç 6 fotoğraf oluyordu (§12.3). */
  perform pg_advisory_xact_lock(hashtext('foto_kota:' || new.user_id::text));

  select app.photo_limit(new.user_id) into limit_count;
  select app.membership_tier(new.user_id) into tier;
  select app.active_photo_count(new.user_id) into current_count;

  if current_count >= limit_count then
    raise exception
      'Aktif fotoğraf kotası dolu (% / %, % üyelik). Yeni fotoğraf yayımlamak için mevcut bir kaydı arşivleyin.',
      current_count, limit_count, tier
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- SÜRÜM BOYUTU — türetilmiş dosyalar depolamaya giriyor (§12.1)
--
-- "Türetilmiş thumbnail ve optimize edilmiş varyantlar fotoğraf ADEDİ
-- kotasına dahil edilmemeli; STORAGE kotasına dahil edilmelidir."
--
-- `photo_versions`ta boyut kolonu yoktu, yani sürümlerin yeri hiç
-- sayılmıyordu. Kolon ekleniyor.
--
-- MEVCUT SATIRLAR BOŞ KALIYOR ve bu dürüst bir eksik: geriye dönük
-- doldurmak her dosyayı storage'dan okumayı gerektirir ve bu
-- migration'ın işi değil. Boş satırlar `coalesce(…, 0)` ile sıfır
-- sayılıyor — yani bugün depolama kullanımı OLDUĞUNDAN AZ görünüyor,
-- fazla değil. Yeni yüklemeler doğru sayılıyor.
-- ══════════════════════════════════════════════════════════════════════════

alter table public.photo_versions
  add column if not exists bytes bigint
  constraint photo_versions_bytes_nonneg check (bytes is null or bytes >= 0);

comment on column public.photo_versions.bytes is
  'Sürüm dosyasının boyutu. Eski satırlarda boş — geriye dönük ölçüm yapılmadı.';

-- ══════════════════════════════════════════════════════════════════════════
-- KULLANIM ÖZETİ — kullanıcıya kalan kota (§12.3)
--
-- TEK ÇAĞRIDA HEPSİ. Arayüzün üç ayrı sorgu atması, üçünün arasında
-- kotanın değişebilmesi demekti; kullanıcı "4/5" görürken beşinciyi
-- yükleyip reddedilebilirdi.
-- ══════════════════════════════════════════════════════════════════════════

create or replace function public.my_quota()
returns table (
  tier            text,
  photos_used     integer,
  photos_limit    integer,
  revisions_limit integer,
  storage_used    bigint,
  storage_limit   bigint,
  /* Premium bitmiş ama fotoğraflar limitin üstünde mi. §12.3:
     "premium süresi biterse mevcut fotoğrafları silmeme" — silinmiyor,
     yalnızca YENİ yükleme durduruluyor ve kullanıcı bunu görüyor. */
  over_limit      boolean
)
language sql
stable
security definer
set search_path = public, app, pg_temp
as $$
  select
    app.membership_tier(auth.uid()),
    app.active_photo_count(auth.uid()),
    app.photo_limit(auth.uid()),
    app.revision_limit(auth.uid()),
    /* Fotoğrafın kendisi + türetilmiş sürümleri. İkincisi §12.1'in
       şartı: adet kotasına girmiyor, depolamaya giriyor. */
    coalesce((
      select sum(coalesce(p.bytes, 0))::bigint
        from public.astro_photos p
       where p.user_id = auth.uid()
    ), 0) + coalesce((
      select sum(coalesce(v.bytes, 0))::bigint
        from public.photo_versions v
        join public.astro_photos p on p.id = v.photo_id
       where p.user_id = auth.uid()
    ), 0),
    app.storage_limit(auth.uid()),
    app.active_photo_count(auth.uid()) > app.photo_limit(auth.uid())
  where auth.uid() is not null;
$$;

revoke all on function public.my_quota() from public, anon;
grant execute on function public.my_quota() to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- YÖNETİCİ TEST ENTITLEMENT'I (§12.2)
--
-- "Admin test kullanıcılarına kontrollü Premium entitlement
-- verebilmelidir" + "test entitlement işlemleri audit log'a
-- yazılmalıdır".
--
-- SÜRE ZORUNLU. Süresiz bir test premium'u, unutulduğunda ücretsiz
-- kalıcı premium olur. En fazla 90 gün; uzatmak yeni bir çağrı ve yeni
-- bir denetim kaydı demek.
-- ══════════════════════════════════════════════════════════════════════════

create or replace function public.grant_test_premium(
  target_user uuid,
  gun integer default 30
)
returns timestamptz
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  bitis timestamptz;
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  if gun is null or gun < 1 or gun > 90 then
    raise exception 'Test premium süresi 1–90 gün arasında olmalı'
      using errcode = '22023';
  end if;

  bitis := now() + (gun || ' days')::interval;

  /* `interval` ve `status` ENUM: değerler `billing_interval`
     (monthly/yearly) ve `membership_status` (active/grace/expired/
     canceled/none). İlk yazımda 'month' ve 'cancelled' yazmıştım;
     ikisi de tabloda yok ve veritabanı reddetti. Enum değerleri
     tahmin edilmez, okunur. */

  insert into public.memberships (user_id, status, interval, current_period_end, provider)
  values (target_user, 'active', 'monthly', bitis, 'test')
  on conflict (user_id) do update
    set status = 'active',
        current_period_end = excluded.current_period_end,
        /* `provider = 'test'` kalıcı bir işaret: bu üyelik ödemeyle
           gelmedi. Sağlayıcı bağlandığında gerçek abonelikleri
           bunlardan ayırmak gerekecek. */
        provider = 'test',
        updated_at = now();

  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (
    auth.uid(), 'membership.test_premium', 'user', target_user::text,
    jsonb_build_object('gun', gun, 'bitis', bitis)
  );

  return bitis;
end;
$$;

create or replace function public.revoke_test_premium(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  /* YALNIZCA TEST ÜYELİĞİ GERİ ALINIYOR. Gerçek bir aboneliği bu
     fonksiyonla iptal etmek, ödeme sağlayıcısındaki kaydı olduğu gibi
     bırakıp sitede kapatmak olurdu — kullanıcı parasını ödemeye devam
     ederken erişimini kaybederdi. */
  update public.memberships
     set status = 'canceled', updated_at = now()
   where user_id = target_user and provider = 'test';

  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (auth.uid(), 'membership.test_premium_revoke', 'user', target_user::text, '{}'::jsonb);
end;
$$;

revoke all on function public.grant_test_premium(uuid, integer) from public, anon;
revoke all on function public.revoke_test_premium(uuid) from public, anon;
grant execute on function public.grant_test_premium(uuid, integer) to authenticated;
grant execute on function public.revoke_test_premium(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- YETKİ MİMARİSİ: ROL · STATÜ · İZİN · KOTA   (Yenileme planı FAZ 1)
--
-- Plan §3 üç kavramı ayırıyor ve Astrohub ikisini zaten doğru kurmuş:
--
--   Rol    → `user_roles` + `app.app_role`        (yetki)
--   Statü  → `memberships`                        (üyelik seviyesi)
--   İzin   → BU GÖÇTE                             (tek tek özellikler)
--
-- Dördüncü bir kavram plan §3.2'nin uyarısıyla geliyor: **kota**.
-- "Premium 5 yerine 30 fotoğraf ekleyebilir" bir evet/hayır izni değil,
-- bir SAYI. Boolean izin modeli bunu ifade edemez ve sonradan eklemek,
-- izin çağıran her yeri yeniden yazmak demek olurdu.
--
-- ══════════════════════════════════════════════════════════════════════
-- İKİNCİ KAYNAK KURULMUYOR — ÖNCE ÖLÇÜLDÜ (§6.8)
-- ══════════════════════════════════════════════════════════════════════
--
-- Plan `tier_limits(tier, key, value)` diye yeni bir tablo istiyor. Ama
-- bu işi bugün `app_settings` içindeki `quotas` jsonb anahtarı yapıyor
-- (`0057_uyelik_kota_ve_odeme_siniri.sql`): standart_foto 5,
-- premium_foto 30, revizyon ve depolama sınırları orada.
--
-- Tabloyu kurup jsonb'yi bırakmak, aynı sayının iki kaynağı demekti —
-- planın §6.8'de yasakladığı şeyin ta kendisi. Bu yüzden:
--
--   1. `tier_limits` tablosu kuruluyor (plan §3.2'nin istediği biçim),
--   2. `app_settings.quotas` değerleri OKUNUP tabloya taşınıyor —
--      yöneticinin elle değiştirmiş olabileceği değerler korunuyor,
--   3. `app.quota_setting()` ve `app_settings.quotas` KALDIRILIYOR,
--   4. `app.photo_limit` / `revision_limit` / `storage_limit` gövdeleri
--      tabloyu okuyacak şekilde yeniden yazılıyor — imzaları değişmiyor,
--      yani onları çağıran tetikleyiciler ve `my_quota()` dokunulmadan
--      çalışmaya devam ediyor.
--
-- Sonuç: sınır sayılarının TEK bir yeri var ve orası bir tablo satırı.
--
-- ══════════════════════════════════════════════════════════════════════
-- `app.etkin_statu` VE `app.membership_tier` — İKİ AD, TEK KURAL
-- ══════════════════════════════════════════════════════════════════════
--
-- `app.membership_tier(uuid)` 0013'ten beri var ve on kadar yerden
-- çağrılıyor. Plan aynı soruyu `app.etkin_statu(uid)` adıyla soruyor ve
-- iki şey EKLİYOR: admin/moderatör her zaman premium sayılır, ve süresi
-- geçmiş bir üyelik premium sayılmaz.
--
-- İki ayrı fonksiyon yazmak, aynı sorunun iki cevabı olması demekti.
-- Bunun yerine kural `app.etkin_statu` içinde TEK yerde duruyor ve
-- `app.membership_tier` ona bir satırlık sarmalayıcıya dönüşüyor. Eski
-- çağıranlar kırılmıyor, yeni kural hepsine birden uygulanıyor.
--
-- BİR SAPMA, BİLEREK: plan yalnızca `status = 'active'` diyor; buradaki
-- gövde `grace` durumunu da premium sayıyor. `grace`, ödemesi yenilenmeyi
-- bekleyen aboneliktir — 0013'ten beri premium sayılıyor. Plana harfiyen
-- uymak, ödemesi tekrar denenen gerçek kullanıcıları bir gecede standarda
-- düşürmek olurdu. Süre kontrolü ikisine de uygulanıyor.
--
-- Geri alma: bu dosyadaki tablolar düşürülür ve 0057'deki fonksiyon
-- gövdeleri yeniden çalıştırılır.
-- ═══════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.venue_events') is not null
     or to_regclass('public.studio_profiles') is not null then
    raise exception
      'YANLIŞ PROJE: venue_events/studio_profiles görüldü — burası StageHub. Göç durduruldu.';
  end if;
end
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · ÖZELLİK KATALOĞU
--
-- İzinler serbest metin olsaydı bir yerde `ilan_yayinla`, başka yerde
-- `ilanYayinla` yazılır ve ikisi sessizce farklı izinler olurdu. Katalog
-- tablosu bunu yabancı anahtarla kapatıyor: tanımsız bir özellik adına
-- izin veremezsiniz.
-- ══════════════════════════════════════════════════════════════════════

create table if not exists public.features (
  key         text primary key,
  label       text not null,
  description text not null default ''
);

comment on table public.features is
  'İzinlenebilir özelliklerin kataloğu. role_permissions ve tier_permissions buraya bağlı.';

insert into public.features (key, label, description) values
  ('icerik_olustur',           'İçerik oluştur',            'Haber, yazı ve rehber gönderimi'),
  ('galeriye_foto_ekle',       'Galeriye fotoğraf ekle',    'Astrofotoğraf yayımlama'),
  ('ilan_yayinla',             'İlan yayınla',              'İkinci el ekipman ilanı'),
  ('canli_sohbete_katil',      'Canlı sohbete katıl',       'Radyo/TV yayını sohbeti'),
  ('premium_icerik_goruntule', 'Premium içerik görüntüle',  'Premium işaretli içerik'),
  ('katalog_ogesi_oner',       'Katalog öğesi öner',        'Gök cismi ve ekipman önerisi'),
  ('saha_girdisi_ekle',        'Saha girdisi ekle',         'Gözlem noktası ekleme'),
  ('forum_konu_ac',            'Forum konusu aç',           'Yeni forum başlığı'),
  ('mesaj_gonder',             'Mesaj gönder',              'Kullanıcılar arası özel mesaj'),
  ('gokyuzu_arsivi',           'Gökyüzü Arşivim',           'Çekim projesi planlama modülü (FAZ 13)')
on conflict (key) do nothing;

-- ══════════════════════════════════════════════════════════════════════
-- 2 · ROLE VE STATÜYE BAĞLI İZİNLER
-- ══════════════════════════════════════════════════════════════════════

create table if not exists public.role_permissions (
  role    app.app_role not null,
  feature text not null references public.features (key) on delete cascade,
  primary key (role, feature)
);

create table if not exists public.tier_permissions (
  /* Kademe enum değil metin: `app.etkin_statu` metin döndürüyor ve
     kademe sayısı ikiyi geçmeyecek. Kısıt değerleri kilitliyor. */
  tier    text not null check (tier in ('standart', 'premium')),
  feature text not null references public.features (key) on delete cascade,
  primary key (tier, feature)
);

comment on table public.role_permissions is
  'Role bağlı özellik izinleri. Okuma app.izin_var() üzerinden.';
comment on table public.tier_permissions is
  'Üyelik statüsüne bağlı özellik izinleri. Okuma app.izin_var() üzerinden.';

/*
 * BAŞLANGIÇ DAĞITIMI — plan §3.3.
 *
 * "Premium neyi açıyor" tablosu yalnızca ÜÇ satır: galeri kotası,
 * Gökyüzü Arşivim ve setup sayısı. Geri kalan her özellik ikisine de
 * açık. Ödeme sistemi geldiğinde premium'a taşınmak istenen özellik
 * YALNIZCA bu tablodan bir satır silinerek kapatılır — kod değişmez.
 * Mimarinin amacı buydu.
 */
insert into public.tier_permissions (tier, feature)
select t.tier, f.key
  from (values ('standart'), ('premium')) as t(tier)
 cross join public.features f
 where f.key <> 'gokyuzu_arsivi'
on conflict do nothing;

/* Gökyüzü Arşivim yalnızca premium (plan §3.3, FAZ 13). */
insert into public.tier_permissions (tier, feature)
values ('premium', 'gokyuzu_arsivi')
on conflict do nothing;

/*
 * ROL İZİNLERİ. `admin` bilerek YOK: `app.izin_var()` admin'e her zaman
 * true dönüyor ve satır eklemek onu ikinci bir kaynağa çevirirdi —
 * biri güncellenip diğeri unutulduğunda hangisinin geçerli olduğu
 * belirsizleşirdi (§6.8).
 *
 * `jury` de yok ve bu kasıtlı: jüri yetkisi tek bir işten ibaret (oy
 * vermek) ve o iş photo_of_week_votes politikalarında zorlanıyor,
 * özellik izniyle değil.
 */
insert into public.role_permissions (role, feature) values
  ('moderator',      'premium_icerik_goruntule'),
  ('moderator',      'gokyuzu_arsivi'),
  ('content_editor', 'icerik_olustur'),
  ('content_editor', 'premium_icerik_goruntule'),
  ('club_manager',   'icerik_olustur'),
  ('verified_organizer', 'icerik_olustur')
on conflict do nothing;

-- ══════════════════════════════════════════════════════════════════════
-- 3 · KOTALAR — sayı gerektiren sınırlar
--
-- `value is null` = SINIRSIZ. Sıfır ile karıştırılmamalı: sıfır "hiç
-- yapamaz" demek (standart kullanıcının revizyon hakkı gibi), null
-- "sınır yok" demek.
-- ══════════════════════════════════════════════════════════════════════

create table if not exists public.tier_limits (
  tier  text not null check (tier in ('standart', 'premium')),
  key   text not null,
  value integer check (value is null or value >= 0),
  label text not null default '',
  primary key (tier, key)
);

comment on table public.tier_limits is
  'Statüye bağlı sayısal sınırlar. value null = sınırsız. Okuma app.kota() üzerinden.';
comment on column public.tier_limits.value is
  'Sınır değeri. NULL sınırsız demektir; 0 "hiç yapamaz" demektir — ikisi farklı.';

/*
 * MEVCUT DEĞERLER TAŞINIYOR, YENİDEN YAZILMIYOR.
 *
 * `app_settings.quotas` yöneticiden değiştirilebilir bir jsonb'ydi. Orada
 * bir değer değiştirilmişse plandaki varsayılan onu ezerdi ve değişiklik
 * sessizce kaybolurdu. `coalesce` sırası bunu engelliyor: önce tablodaki
 * gerçek değer, yoksa plandaki varsayılan.
 */
insert into public.tier_limits (tier, key, value, label)
select v.tier, v.key, v.value, v.label
  from (
    select 'standart' as tier, 'galeri_foto' as key,
           coalesce((select (value ->> 'standart_foto')::integer
                       from public.app_settings where key = 'quotas'), 5) as value,
           'Galeride yayımlanabilen fotoğraf' as label
    union all select 'premium', 'galeri_foto',
           coalesce((select (value ->> 'premium_foto')::integer
                       from public.app_settings where key = 'quotas'), 30),
           'Galeride yayımlanabilen fotoğraf'
    union all select 'standart', 'revizyon',
           coalesce((select (value ->> 'standart_revizyon')::integer
                       from public.app_settings where key = 'quotas'), 0),
           'Fotoğraf başına revizyon'
    union all select 'premium', 'revizyon',
           coalesce((select (value ->> 'premium_revizyon')::integer
                       from public.app_settings where key = 'quotas'), 5),
           'Fotoğraf başına revizyon'
    union all select 'standart', 'depolama_mb',
           coalesce((select (value ->> 'standart_depolama_mb')::integer
                       from public.app_settings where key = 'quotas'), 250),
           'Toplam depolama (MB)'
    union all select 'premium', 'depolama_mb',
           coalesce((select (value ->> 'premium_depolama_mb')::integer
                       from public.app_settings where key = 'quotas'), 2000),
           'Toplam depolama (MB)'
    /* Plan §3.3: standart 1 setup, premium sınırsız. Ürün kararı olarak
       henüz kesinleşmedi — tablodan değiştirilebilir. */
    union all select 'standart', 'setup_sayisi', 1, 'Ekipman kurulumu (setup)'
    union all select 'premium',  'setup_sayisi', null, 'Ekipman kurulumu (setup)'
    /* İlan fotoğrafı: plan FAZ 16.4 üçe indiriyor. Bugünkü tetikleyici
       sabit 8 yazıyordu; sayı buraya taşındı ve FAZ 16 formu buradan
       okuyacak. Tetikleyicinin kendisi FAZ 16'nın işi. */
    union all select 'standart', 'ilan_foto', 3, 'İlan başına fotoğraf'
    union all select 'premium',  'ilan_foto', 3, 'İlan başına fotoğraf'
  ) v
on conflict (tier, key) do nothing;

/*
 * Taşındı — ikinci kaynak kalmıyor (§6.8).
 *
 * GEREKÇE ZORUNLU. `record_setting_change()` tetikleyicisi (0059)
 * `quotas` anahtarını `maintenance` ve `billing` ile birlikte riskli
 * sayıyor: gerekçesiz değişiklik `22023` ile reddediliyor. Bu silme de
 * bir kota değişikliği ve aynı kuraldan muaf değil — kaydın
 * `setting_history`'de gerekçesiyle durması, sayının neden oradan
 * kaybolduğunu sonradan bakan birine anlatan tek şey.
 *
 * `set local` yerine `set_config(..., false)`: göç dosyası bir işlem
 * bloğu içinde çalıştığını varsayamaz (psql ile tek tek çalıştırılırsa
 * `set local` sessizce etkisiz kalır ve silme yine düşerdi). Oturum
 * düzeyinde yazılıp hemen ardından temizleniyor.
 */
select set_config(
  'astrohub.reason',
  'FAZ 1 yetki mimarisi: kota değerleri app_settings.quotas jsonb''sinden '
  || 'tier_limits tablosuna taşındı. Tek doğruluk kaynağı artık o tablo.',
  false
);

delete from public.app_settings where key = 'quotas';

select set_config('astrohub.reason', '', false);

drop function if exists app.quota_setting(text, integer);

-- ══════════════════════════════════════════════════════════════════════
-- 4 · SATIR GÜVENLİĞİ
--
-- Üç tablo da HERKESE OKUNUR: "premium ne açıyor" sorusunun cevabı bir
-- fiyatlandırma sayfasında zaten yazacak; gizlemek bir şey korumuyor,
-- yalnızca arayüzün sınırı gösterememesine yol açıyor.
--
-- YAZMA YALNIZCA ADMIN. Moderatör dahil kimse izin dağıtımını
-- değiştiremez — yetki mimarisinin kendisi bir yetki sınırıdır.
-- ══════════════════════════════════════════════════════════════════════

alter table public.features         enable row level security;
alter table public.role_permissions enable row level security;
alter table public.tier_permissions enable row level security;
alter table public.tier_limits      enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['features', 'role_permissions', 'tier_permissions', 'tier_limits']
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format(
      'create policy %I_read on public.%I for select using (true)', t, t);

    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format(
      'create policy %I_write on public.%I for all to authenticated '
      || 'using (app.is_admin()) with check (app.is_admin())', t, t);
  end loop;
end
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 5 · ETKİN STATÜ — tek kural, tek yer
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.etkin_statu(target_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    /* Plan §3.2: yönetim rolleri her zaman premium. Aksi halde admin,
       premium'a kapalı bir ekranı test edemezdi. */
    when target_user is not null and (
      exists (select 1 from public.user_roles r
               where r.user_id = target_user and r.role = 'admin')
      or exists (select 1 from public.user_roles r
                  where r.user_id = target_user and r.role = 'moderator')
    ) then 'premium'

    when exists (
      select 1 from public.memberships m
       where m.user_id = target_user
         and m.status in ('active', 'grace')
         /* Süresiz üyelik: current_period_end null. Plan §3.2 bunu
            açıkça premium sayıyor. */
         and (m.current_period_end is null or m.current_period_end > now())
    ) then 'premium'

    else 'standart'
  end;
$$;

comment on function app.etkin_statu(uuid) is
  'Kullanıcının etkin üyelik statüsü (standart/premium). Admin ve moderatör her zaman premium; süresi geçmiş üyelik standart. Tek doğruluk kaynağı.';

/*
 * ESKİ AD, YENİ KURAL. On kadar çağıran var (`photo_limit`,
 * `enforce_photo_quota`, `my_quota`, ilan politikaları…); imza aynı
 * kaldığı için hiçbiri değişmiyor ama hepsi artık doğru kuralı görüyor.
 */
create or replace function app.membership_tier(target_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select app.etkin_statu(target_user);
$$;

comment on function app.membership_tier(uuid) is
  'app.etkin_statu() için geriye dönük ad. Kural orada; burada tekrarlanmıyor.';

-- ══════════════════════════════════════════════════════════════════════
-- 6 · İZİN VE KOTA — tek giriş noktası
-- ══════════════════════════════════════════════════════════════════════

/*
 * İKİ İMZA, VARSAYILAN PARAMETRE DEĞİL — bilerek.
 *
 * `izin_var(text, uuid default null)` tek bir fonksiyon olarak yazılsaydı
 * `app.izin_var('ilan_yayinla')` çağrısı, bir gün tek argümanlı bir sürüm
 * eklendiğinde "function is not unique" ile düşerdi. Daha önemlisi yetki
 * ayrımı: 0030'un koyduğu kural, BAŞKASININ uuid'sini alan `security
 * definer` fonksiyonların istemciye kapalı olması. Varsayılan parametreli
 * tek imzada o ayrım yapılamıyor — ya ikisi de açık ya ikisi de kapalı.
 *
 * Bu yüzden iki ayrı imza:
 *   izin_var(text)        → yalnızca çağıranın kendisi, RLS'e açık
 *   izin_var(text, uuid)  → başkası hakkında, istemciye KAPALI
 */
create or replace function app.izin_var(feature text, target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target_user is null then false
    /* Admin her zaman true — plan §3.2. Tabloya satır eklemek yerine
       buraya yazılıyor ki izin dağıtımının ikinci bir kaynağı olmasın. */
    when exists (
      select 1 from public.user_roles r
       where r.user_id = target_user and r.role = 'admin'
    ) then true
    else exists (
      select 1
        from public.role_permissions rp
        join public.user_roles ur on ur.role = rp.role
       where ur.user_id = target_user
         and rp.feature = izin_var.feature
    ) or exists (
      select 1 from public.tier_permissions tp
       where tp.tier = app.etkin_statu(target_user)
         and tp.feature = izin_var.feature
    )
  end;
$$;

create or replace function app.izin_var(feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.izin_var(izin_var.feature, auth.uid());
$$;

comment on function app.izin_var(text) is
  'Çağıranın özellik izni: admin her zaman true, diğerleri rol ∪ statü birleşimi. RLS politikalarının çağıracağı imza budur.';
comment on function app.izin_var(text, uuid) is
  'Belirtilen kullanıcının özellik izni. İstemciye kapalı (0030 kuralı): başkasının uuid''sini alıyor.';

create or replace function app.kota(anahtar text, target_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select l.value
    from public.tier_limits l
   where l.key = kota.anahtar
     and l.tier = app.etkin_statu(target_user);
$$;

create or replace function app.kota(anahtar text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select app.kota(kota.anahtar, auth.uid());
$$;

comment on function app.kota(text) is
  'Çağıranın statüsüne bağlı sayısal sınır. NULL sınırsız demek; satır yoksa da NULL döner — ikisi de "engelleme yok" anlamına geliyor.';
comment on function app.kota(text, uuid) is
  'Belirtilen kullanıcının sınırı. İstemciye kapalı (0030 kuralı).';

-- ══════════════════════════════════════════════════════════════════════
-- 7 · MEVCUT KOTA FONKSİYONLARI TABLOYA BAĞLANIYOR
--
-- İmzalar değişmiyor: `enforce_photo_quota` tetikleyicisi, `my_quota()`
-- ve depolama kontrolleri dokunulmadan çalışmaya devam ediyor. Değişen
-- tek şey sayının NEREDEN geldiği.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.photo_limit(target_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app.kota('galeri_foto', target_user), 2147483647);
$$;

create or replace function app.revision_limit(target_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app.kota('revizyon', target_user), 2147483647);
$$;

create or replace function app.storage_limit(target_user uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app.kota('depolama_mb', target_user), 2147483647)::bigint
         * 1024 * 1024;
$$;

/*
 * SINIRSIZ NASIL İFADE EDİLİYOR. `app.kota` null dönerse sınır yok
 * demek, ama çağıranlar (tetikleyiciler, `my_quota`) integer bekliyor ve
 * null ile karşılaştırma her zaman NULL — yani `current >= limit`
 * kontrolü sessizce false olurdu ve kota HİÇ uygulanmazdı. Bu ölümcül
 * bir sessiz hata olurdu, o yüzden burada int4'ün üst sınırına
 * çevriliyor: kontrol çalışıyor ve pratikte hiç dolmuyor.
 */

-- ══════════════════════════════════════════════════════════════════════
-- 8 · SETUP KOTASI — sınır formda değil, veritabanında (§3.2)
--
-- Plan §3.2: "Kota kontrolü RLS/trigger'da olmalı, formda değil: sınır
-- yalnızca arayüzde kontrol edilirse API üzerinden aşılabilir."
--
-- Fotoğraf kotasındaki danışma kilidi deseni aynen izleniyor: iki
-- eşzamanlı istek "1 var, limit 1" görüp ikisi de geçebilirdi.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.enforce_setup_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sinir  integer;
  mevcut integer;
begin
  select app.kota('setup_sayisi', new.user_id) into sinir;
  if sinir is null then
    return new;                      -- sınırsız
  end if;

  perform pg_advisory_xact_lock(hashtext('setup_kota:' || new.user_id::text));

  select count(*) into mevcut
    from public.user_setups s
   where s.user_id = new.user_id;

  if mevcut >= sinir then
    raise exception
      'Kurulum kotası dolu (% / %). Premium üyelikte sınır yoktur.', mevcut, sinir
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists user_setups_quota on public.user_setups;
create trigger user_setups_quota
  before insert on public.user_setups
  for each row execute function app.enforce_setup_quota();

-- ══════════════════════════════════════════════════════════════════════
-- 9 · SÜRESİ DOLAN PREMIUM — pg_cron
--
-- `app.etkin_statu` süreyi zaten kontrol ediyor, yani süresi geçmiş bir
-- üyelik BUGÜN de premium sayılmıyor. Bu iş onun yerine geçmiyor,
-- KAYDI düzeltiyor: `status` hâlâ 'active' yazıyorsa yönetim ekranı,
-- denetim kaydı ve ileride ödeme sağlayıcısı yanlış durumu okur.
--
-- Desen 0034 ve 0049'dan: aynı adlı iş varsa önce sökülüyor, çünkü
-- `cron.schedule` aynı adı ikinci kez eklemez ve göç sessizce etkisiz
-- kalırdı.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.uyelik_suresi_dolanlari_dusur()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  sayi integer;
begin
  with dusenler as (
    update public.memberships m
       set status = 'expired', updated_at = now()
     where m.status in ('active', 'grace')
       and m.current_period_end is not null
       and m.current_period_end <= now()
    returning m.user_id
  )
  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  select null, 'membership.expired', 'user', d.user_id::text,
         jsonb_build_object('kaynak', 'pg_cron')
    from dusenler d;

  get diagnostics sayi = row_count;
  return sayi;
end;
$$;

comment on function app.uyelik_suresi_dolanlari_dusur() is
  'Süresi geçmiş üyelikleri expired yapar ve denetim kaydına yazar. pg_cron çağırır.';

/* İstemciye kapalı: tarama cron'un işi (0049 ile aynı gerekçe). */
revoke all on function app.uyelik_suresi_dolanlari_dusur()
  from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'uyelik-suresi-dusur') then
      perform cron.unschedule('uyelik-suresi-dusur');
    end if;

    /*
     * GÜNDE BİR, GECE. Üyelik süresi saat hassasiyetinde bir şey değil;
     * daha sık taramak boş sorguları çoğaltmaktan başka iş yapmaz.
     * Statünün kendisi zaten `app.etkin_statu` ile anlık doğru.
     */
    perform cron.schedule(
      'uyelik-suresi-dusur',
      '17 3 * * *',
      $job$ select app.uyelik_suresi_dolanlari_dusur(); $job$
    );
  end if;
end
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 10 · FRONTEND'İN TEK KAPISI
--
-- Plan FAZ 1 görev 5: "Bileşenler rolü doğrudan okumamalı; hepsi tek
-- kancadan geçmeli." Kancanın tek sorgusu bu.
--
-- Roller, statü, izinler ve kotalar TEK çağrıda: ayrı ayrı sorulsaydı
-- arayüz kısa bir süre "rolü var ama izni yok" gibi tutarsız bir ara
-- durum gösterirdi.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.izinlerim()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'roller', coalesce((
      select jsonb_agg(r.role order by r.role)
        from public.user_roles r where r.user_id = auth.uid()
    ), '[]'::jsonb),
    'statu', app.etkin_statu(auth.uid()),
    'izinler', coalesce((
      select jsonb_agg(f.key order by f.key)
        from public.features f
       where app.izin_var(f.key)
    ), '[]'::jsonb),
    'kotalar', coalesce((
      select jsonb_object_agg(l.key, l.value)
        from public.tier_limits l
       where l.tier = app.etkin_statu(auth.uid())
    ), '{}'::jsonb),
    'uyelik_bitis', (
      select m.current_period_end from public.memberships m
       where m.user_id = auth.uid()
    )
  )
  where auth.uid() is not null;
$$;

comment on function public.izinlerim() is
  'Oturumdaki kullanıcının rolleri, statüsü, izinleri ve kotaları — tek çağrıda. usePermissions() bunu okur.';

revoke all on function public.izinlerim() from public, anon;
grant execute on function public.izinlerim() to authenticated;

/*
 * ŞEMA AÇIK, FONKSİYONLAR AYRI AYRI KARARA BAĞLI — 0030'un kuralı.
 *
 * Sorulacak soru şu: fonksiyon BAŞKASI hakkında mı cevap veriyor?
 * Veriyorsa `security definer` olduğu için RLS'i aşar ve elindeki bir
 * uuid'yle herhangi biri başkasının üyelik statüsünü sorgulayabilirdi.
 *
 * Tek argümanlı sürümler yalnızca ÇAĞIRANIN kendisi hakkında cevap
 * veriyor — `app.is_admin()` ile aynı sınıf — ve RLS politikalarının
 * çağırabilmesi için açık kalıyor.
 */
revoke all on function app.etkin_statu(uuid)       from public, anon, authenticated;
revoke all on function app.izin_var(text, uuid)    from public, anon, authenticated;
revoke all on function app.kota(text, uuid)        from public, anon, authenticated;
revoke all on function app.enforce_setup_quota()   from public, anon, authenticated;

grant execute on function app.izin_var(text) to anon, authenticated;
grant execute on function app.kota(text)     to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 10 — ADMIN PANELİNDEN KODSUZ SİTE YÖNETİMİ (UYGULAMA BELGESİ §13)
--
-- ATIFLAR HANGİ BELGEYE: aşağıdaki bütün "§13.x" atıfları UYGULAMA
-- BELGESİNE (master implementation prompt, "13. Faz 10") aittir.
-- `docs/ASTROHUB_PRODUCT_UI_TECHNICAL_SPEC.md`in de bir §13'ü var ama o
-- başka bir şey (Admin paneli menü listesi, §13.2'si "Ekipman yönetimi").
-- İkisi karıştırılırsa her atıf yanlış yere gider; bu satır o yüzden var.
--
-- §13'ün ilk cümlesi: "Admin paneli sitenin işletim sistemi olmalıdır."
-- İkinci cümlesi bunun sınırını çiziyor: "admin paneline keyfî SQL,
-- JavaScript, CSS veya güvenlik politikası çalıştırma alanı ekleme.
-- Yönetim kontrollü, şemalı, doğrulamalı ve geri alınabilir olmalıdır."
--
-- Bu göç ikinci cümleyi ciddiye alıyor. Yönetilebilir olan her şey bir
-- SÜTUN; serbest metin kutusu değil. Modül anahtarı bir listeden geliyor,
-- düzen iki değerden birini alıyor, bağlantı adresi bir CHECK'ten geçiyor.
-- Panelden site bozulabilir ama site GÜVENLİĞİ bozulamaz.
--
-- ══════════════════════════════════════════════════════════════════════════
-- ÜRÜN KARARI: SİTEDE TEK ADMİN VAR (§13.4'TEN BİLİNÇLİ SAPMA)
--
-- Belgenin §13.4'ü en az on iki admin rolü istiyor: Süper Admin, Teknik
-- Admin, İçerik Editörü, Fotoğraf Moderatörü, Etkinlik Moderatörü,
-- Lokasyon Moderatörü, Radyo Yöneticisi, Radyo Yayıncısı/DJ, TV
-- Yöneticisi, Kullanıcı ve Destek Yöneticisi, Analitik Görüntüleyici,
-- Hukuk/KVKK Görüntüleyici — ve her modül için ayrı gör/oluştur/düzenle/
-- sil/onayla/yayınla/geri al/dışa aktar yetkileri.
--
-- KULLANICI KARARI: "sitede tek admin olacak, birden fazla admin rolü
-- hazırlama." Bu göç o karara uyuyor ve YENİ ROL AÇMIYOR.
--
-- Gerekçe kayda değer: on iki rol, on iki rolü taşıyan on iki kişi
-- olduğunda anlamlıdır. Tek kişilik bir ekipte her rol aynı hesapta
-- toplanır ve geriye yalnızca maliyeti kalır — on iki yetki matrisi, on
-- iki RLS dalı, on iki test ekseni ve hiçbirini ayırt etmeyen tek bir
-- kullanıcı. Yetki ayrımı ekip büyüdüğünde eklenir; bugün eklenirse
-- yalnızca bakım borcu olur.
--
-- KORUNAN AYRIM: `moderator` rolü duruyor. O bir admin kademesi değil,
-- ayrı bir iş — kuyruk inceleyen ama site ayarına dokunamayan kişi.
-- Aşağıdaki tabloların hepsinde yazma yetkisi `app.is_admin()`, okuma
-- yetkisi herkeste; moderatör site düzenini değiştiremiyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- §13.3 "İKİ AŞAMALI ONAY" — TEK ADMİNLE MÜMKÜN DEĞİL, YERİNE NE VAR
--
-- §13.3 yüksek riskli işlemlerde iki aşamalı onay istiyor. İki aşamalı
-- onayın anlamı İKİ KİŞİ'dir; aynı kişiye iki kez sormak onay değil,
-- gecikmedir. Tek adminli bir sitede bu madde karşılanamaz ve
-- karşılanmış gibi yapmak daha kötüdür.
--
-- Yerine konan şey, tek kişinin kendini koruyabileceği tek mekanizma:
-- YÜKSEK RİSKLİ DEĞİŞİKLİKTE GEREKÇE ZORUNLU (aşağıdaki tetikleyici) ve
-- HER DEĞİŞİKLİK GERİ ALINABİLİR (`setting_history` + `rollback_setting`).
-- Gerekçe alanı boş bırakılamaz; bakım moduna almak, sebebini yazmayı
-- gerektirir. Yanlış basılan düğme geri alınır, sessizce kaybolmaz.
-- ══════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- 1) ANA SAYFA MODÜLLERİ (§13.2)
--
-- ANAHTAR LİSTEDEN GELİYOR, PANELDEN YAZILMIYOR. Modül anahtarı bir React
-- bileşenine karşılık gelir; panelden `yeni_modul` diye bir satır
-- eklenebilseydi ana sayfada karşılığı olmayan bir boşluk oluşurdu.
-- Yönetici sıralar, adlandırır, açar, kapatır, zamanlar — ama var olmayan
-- bir modülü var edemez. INSERT yetkisi bu yüzden verilmiyor.
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.home_modules (
  key            text primary key,
  title          text,
  subtitle       text,
  enabled        boolean not null default true,
  position       integer not null,
  item_limit     integer not null default 6,
  layout         text    not null default 'grid',
  /* Boşken gizle: içeriği olmayan bir modül başlığıyla birlikte
     kaybolur. Varsayılan AÇIK — boş bir "Son ilanlar" başlığı, sitenin
     ölü olduğunu söyler. */
  hide_when_empty boolean not null default true,
  publish_from   timestamptz,
  publish_to     timestamptz,
  show_mobile    boolean not null default true,
  show_desktop   boolean not null default true,
  /* Yayımlanmamış değişiklikler. NULL ise taslak yok (§13.3 draft). */
  draft          jsonb,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users(id) on delete set null,

  constraint home_modules_layout_check check (layout in ('grid', 'list')),
  constraint home_modules_limit_check  check (item_limit between 1 and 24),
  /* Bitiş başlangıçtan önce olamaz — panelde ters girilen tarih,
     modülü sessizce hiç göstermemek demekti. */
  constraint home_modules_window_check check (
    publish_from is null or publish_to is null or publish_to > publish_from
  )
);

comment on table public.home_modules is
  'Ana sayfa modül düzeni (§13.2). Anahtarlar kodda karşılığı olan modüllerdir; panelden yeni anahtar eklenemez.';

create unique index if not exists home_modules_position_uniq
  on public.home_modules (position);

alter table public.home_modules enable row level security;

drop policy if exists home_modules_read on public.home_modules;
create policy home_modules_read on public.home_modules for select using (true);

/* YAZMA VAR, EKLEME/SİLME YOK. `for update` bilinçli: yönetici satırı
   düzenler, listeyi değiştiremez. */
drop policy if exists home_modules_write on public.home_modules;
create policy home_modules_write on public.home_modules
  for update to authenticated
  using (app.is_admin()) with check (app.is_admin());

grant select on public.home_modules to anon, authenticated;
grant update on public.home_modules to authenticated;

insert into public.home_modules (key, title, subtitle, position, item_limit, layout)
values
  ('hero',      'Hero',                  null,                                   1, 1,  'grid'),
  ('tonight',   'Bu Gece',               'Gökyüzü koşulları ve efemeris',        2, 1,  'grid'),
  ('records',   'Galeriden son yüklenenler', null,                               3, 6,  'grid'),
  ('news',      'Haberler ve yazılar',   null,                                   4, 4,  'grid'),
  ('events',    'Yaklaşan etkinlikler',  null,                                   5, 5,  'list'),
  ('listings',  'Son ilanlar',           null,                                   6, 4,  'grid')
on conflict (key) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- 2) NAVİGASYON VE FOOTER (§13.2)
--
-- ADRES DOĞRULANIYOR. Bir yönetim paneli üzerinden `javascript:` şemalı
-- bağlantı yazılabilseydi, panel yetkisi site geneline XSS'e dönüşürdü —
-- "keyfî JavaScript çalıştırma alanı ekleme" maddesinin tam olarak
-- yasakladığı şey. CHECK yalnızca site içi yolu (`/...`) veya `https://`
-- adresini kabul ediyor. Doğrulama arayüzde DEĞİL burada: arayüz
-- atlanabilir, kısıt atlanamaz.
--
-- İKİNCİ KARAKTER `/` OLAMAZ ve bu kuralın en pahalı yarısı. Desenin ilk
-- hâli (`^/[A-Za-z0-9/...]*$`) `//kotu.example/giris` adresini KABUL
-- ediyordu: tek eğik çizgiyle başlıyor, kalan her karakter listede.
-- Tarayıcı bunu site içi yol değil PROTOKOL-GÖRECELİ ADRES sayar ve
-- `https://kotu.example/giris`e gider. Yani `javascript:`i eleyen kısıt,
-- ziyaretçiyi başka bir siteye taşıyan bağlantıyı geçiriyordu — kapatmak
-- için var olduğu kapıyı açık bırakarak. Ölçümle bulundu, okumayla değil.
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.nav_links (
  id          uuid primary key default gen_random_uuid(),
  menu        text not null,
  group_label text,
  label       text not null,
  path        text not null,
  position    integer not null,
  enabled     boolean not null default true,
  new_tab     boolean not null default false,
  /* Yalnızca giriş yapmışa göster (örn. "Panelim"). */
  auth_only   boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null,

  constraint nav_links_menu_check  check (menu in ('header', 'footer')),
  constraint nav_links_label_len   check (char_length(label) between 1 and 40),
  constraint nav_links_path_check  check (
    path ~ '^/([A-Za-z0-9_.~%?=&#-][A-Za-z0-9/_.~%?=&#-]*)?$'
    or path ~ '^https://[A-Za-z0-9.-]+(/[^\s]*)?$'
  )
);

comment on table public.nav_links is
  'Menü ve footer bağlantıları (§13.2). Adres kısıtı javascript:/data: şemalarını veritabanı düzeyinde reddeder.';

create index if not exists nav_links_menu_idx on public.nav_links (menu, position);

alter table public.nav_links enable row level security;

drop policy if exists nav_links_read on public.nav_links;
create policy nav_links_read on public.nav_links for select using (true);

drop policy if exists nav_links_write on public.nav_links;
create policy nav_links_write on public.nav_links
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

grant select on public.nav_links to anon, authenticated;
grant insert, update, delete on public.nav_links to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- 3) FEATURE FLAG'LER (§13.2)
--
-- BURADA DA ANAHTAR LİSTEDEN GELİYOR. Bir bayrağın kodda karşılığı yoksa
-- açmak da kapatmak da hiçbir şey yapmaz; panelde duran ve hiçbir şey
-- yapmayan anahtar, panelin tamamına olan güveni bozar.
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.feature_flags (
  key         text primary key,
  label       text not null,
  description text,
  enabled     boolean not null default false,
  /* Yüksek riskli bayrak: kapatıldığında/açıldığında gerekçe zorunlu. */
  high_risk   boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null,

  constraint feature_flags_key_format check (key ~ '^[a-z0-9_]{3,60}$')
);

comment on table public.feature_flags is
  'Kod içindeki isteğe bağlı yüzeylerin anahtarları (§13.2). Panelden yeni anahtar eklenemez — karşılığı olmayan bayrak yanıltır.';

alter table public.feature_flags enable row level security;

drop policy if exists feature_flags_read on public.feature_flags;
create policy feature_flags_read on public.feature_flags for select using (true);

drop policy if exists feature_flags_write on public.feature_flags;
create policy feature_flags_write on public.feature_flags
  for update to authenticated
  using (app.is_admin()) with check (app.is_admin());

grant select on public.feature_flags to anon, authenticated;
grant update on public.feature_flags to authenticated;

insert into public.feature_flags (key, label, description, enabled, high_risk)
values
  ('bakim_modu',       'Bakım modu',            'Site ziyaretçilere kapalı; yalnızca yönetici girebilir.', false, true),
  ('kayit_acik',       'Yeni kayıt açık',       'Kapatılırsa yeni hesap oluşturulamaz.',                    true,  true),
  ('yorumlar_acik',    'Yorumlar açık',         'Kapatılırsa yeni yorum yazılamaz; mevcutlar durur.',       true,  false),
  ('ilanlar_acik',     'İlanlar açık',          'Kapatılırsa yeni ilan yayımlanamaz.',                      true,  false),
  ('radyo_acik',       'Radyo açık',            'Kapatılırsa oynatıcı ve radyo sayfaları gizlenir.',        true,  false),
  ('tv_acik',          'TV açık',               'Kapatılırsa TV sayfaları gizlenir.',                       true,  false),
  ('duyuru_acik',      'Site duyurusu',         'Üst şeritteki duyuru bandını gösterir.',                   false, false)
on conflict (key) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- 4) SİTE DUYURUSU VE BAKIM MODU (§13.2)
--
-- `app_settings` içinde duruyorlar; ikisi de tek satırlık ayar ve kendi
-- tablolarını hak etmiyor. Bakım modunun ANAHTARI feature_flags'te,
-- METNİ burada: bayrak açık/kapalı bir karar, metin ise içerik.
-- ══════════════════════════════════════════════════════════════════════════
insert into public.app_settings (key, value)
values (
  'announcement',
  '{"metin": "", "ton": "info", "baslangic": null, "bitis": null, "kapatilabilir": true}'::jsonb
)
on conflict (key) do nothing;

insert into public.app_settings (key, value)
values (
  'maintenance',
  '{"baslik": "Bakım çalışması", "metin": "Kısa bir bakım yapıyoruz, birazdan buradayız.", "beklenen_bitis": null}'::jsonb
)
on conflict (key) do nothing;

insert into public.app_settings (key, value)
values (
  'seo_defaults',
  '{"baslik_soneki": " — AstroHub", "aciklama": "Türkiye''nin astronomi platformu.", "og_gorsel": null, "twitter_hesabi": null}'::jsonb
)
on conflict (key) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- 5) DEĞİŞİKLİK GEÇMİŞİ VE GERİ ALMA (§13.3)
--
-- §13.3'ün istediği on üç maddeden yedisi tek tabloyla karşılanıyor:
-- değişiklik özeti, kim değiştirdi, önceki değer, yeni değer, gerekçe,
-- rollback ve audit log. Kalan altısı başka yerde: draft/preview/publish
-- ve zamanlanmış yayın aşağıdaki `home_modules` akışında, yetki kontrolü
-- RLS'te, iki aşamalı onay ise başlıkta yazdığı gibi kurulmadı.
--
-- GEÇMİŞ TETİKLEYİCİYLE YAZILIYOR, UYGULAMADAN DEĞİL. Uygulama katmanına
-- bırakılsaydı, geçmişi atlamanın yolu tek bir UPDATE olurdu — ve denetim
-- kaydının atlanabilir olanı, denetim kaydı değildir.
--
-- GEREKÇE OTURUM DEĞİŞKENİNDEN GELİYOR. Tetikleyicinin gerekçeyi
-- okuyabilmesi için `set local astrohub.reason = '...'` kullanılıyor;
-- tabloya "reason" sütunu eklemek, her tabloya aynı sütunu eklemek ve
-- her yazmada onu doldurmayı hatırlamak demekti.
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.setting_history (
  id          bigserial primary key,
  scope       text not null,
  record_key  text not null,
  old_value   jsonb,
  new_value   jsonb,
  reason      text,
  /* Bu satır bir geri almanın sonucu mu? Geri alma da bir değişikliktir
     ve geçmişten SİLİNMEZ — üstüne yazılır. */
  rolled_back_from bigint references public.setting_history(id) on delete set null,
  actor_id    uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),

  constraint setting_history_scope_check check (
    scope in ('app_settings', 'home_modules', 'nav_links', 'feature_flags')
  )
);

comment on table public.setting_history is
  'Site ayarı değişiklik geçmişi (§13.3). Tetikleyiciyle yazılır; uygulamadan atlanamaz.';

create index if not exists setting_history_scope_idx
  on public.setting_history (scope, record_key, created_at desc);
create index if not exists setting_history_created_idx
  on public.setting_history (created_at desc);

alter table public.setting_history enable row level security;

/* OKUMA YÖNETİCİYE. Ayar değerleri sır değil ama GEREKÇE metni serbest
   metindir ve yönetici notu içerir ("X kullanıcısının şikâyeti üzerine").
   Herkese açmak, iç yazışmayı yayımlamaktı. */
drop policy if exists setting_history_read on public.setting_history;
create policy setting_history_read on public.setting_history
  for select to authenticated using (app.is_admin());

/* YAZMA POLİTİKASI YOK. Tetikleyici `security definer` çalışıyor;
   tabloya doğrudan INSERT eden bir yol bırakılmıyor. */
grant select on public.setting_history to authenticated;

create or replace function app.record_setting_change()
returns trigger
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  kapsam  text := tg_table_name;
  anahtar text;
  eski    jsonb;
  yeni    jsonb;
  gerekce text;
  riskli  boolean := false;
begin
  gerekce := nullif(current_setting('astrohub.reason', true), '');

  if tg_op = 'DELETE' then
    eski := to_jsonb(old);
    yeni := null;
  elsif tg_op = 'INSERT' then
    eski := null;
    yeni := to_jsonb(new);
  else
    eski := to_jsonb(old);
    yeni := to_jsonb(new);
    /* Değişmeyen UPDATE geçmişe düşmüyor: `updated_at` dokunuşuyla
       oluşan yüzlerce boş satır, geçmişi okunmaz yapardı. */
    if eski - 'updated_at' - 'updated_by' = yeni - 'updated_at' - 'updated_by' then
      return coalesce(new, old);
    end if;
  end if;

  anahtar := coalesce(
    yeni ->> 'key', eski ->> 'key',
    yeni ->> 'id',  eski ->> 'id'
  );

  /* YÜKSEK RİSKLİ DEĞİŞİKLİKTE GEREKÇE ZORUNLU — §13.3'ün "iki aşamalı
     onay" maddesinin tek adminle karşılanabilen hâli. Gerekçe yazmak,
     düğmeye basmadan önce bir saniye düşünmeyi zorunlu kılar. */
  if kapsam = 'feature_flags' then
    riskli := coalesce((yeni ->> 'high_risk')::boolean, (eski ->> 'high_risk')::boolean, false)
              and (eski ->> 'enabled') is distinct from (yeni ->> 'enabled');
  elsif kapsam = 'app_settings' then
    riskli := anahtar in ('maintenance', 'billing', 'quotas');
  end if;

  if riskli and gerekce is null then
    raise exception 'Bu değişiklik gerekçe gerektiriyor (%).', anahtar
      using errcode = '22023',
            hint = 'İstemci `set local astrohub.reason` ile gerekçe göndermeli.';
  end if;

  insert into public.setting_history (scope, record_key, old_value, new_value, reason, actor_id)
  values (kapsam, coalesce(anahtar, '?'), eski, yeni, gerekce, auth.uid());

  return coalesce(new, old);
end;
$$;

drop trigger if exists home_modules_history on public.home_modules;
create trigger home_modules_history
  after insert or update or delete on public.home_modules
  for each row execute function app.record_setting_change();

drop trigger if exists nav_links_history on public.nav_links;
create trigger nav_links_history
  after insert or update or delete on public.nav_links
  for each row execute function app.record_setting_change();

drop trigger if exists feature_flags_history on public.feature_flags;
create trigger feature_flags_history
  after insert or update or delete on public.feature_flags
  for each row execute function app.record_setting_change();

drop trigger if exists app_settings_history on public.app_settings;
create trigger app_settings_history
  after insert or update or delete on public.app_settings
  for each row execute function app.record_setting_change();

-- ══════════════════════════════════════════════════════════════════════════
-- GEREKÇELİ YAZMA — istemcinin gerekçeyi tetikleyiciye ulaştırma yolu
--
-- PostgREST tek çağrıda `set local` çalıştıramıyor; bu yüzden gerekçe
-- gerektiren yazmalar bu fonksiyondan geçiyor. Fonksiyon `set local`
-- yapıyor, sonra asıl güncellemeyi uyguluyor — ikisi aynı işlemde,
-- yani tetikleyici gerekçeyi görüyor.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.set_app_setting(
  ayar_key text,
  ayar_value jsonb,
  gerekce text default null
)
returns void
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  perform set_config('astrohub.reason', coalesce(gerekce, ''), true);

  insert into public.app_settings (key, value, updated_at, updated_by)
  values (ayar_key, ayar_value, now(), auth.uid())
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), updated_by = auth.uid();
end;
$$;

create or replace function public.set_feature_flag(
  bayrak text,
  acik boolean,
  gerekce text default null
)
returns void
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  bulundu boolean;
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  perform set_config('astrohub.reason', coalesce(gerekce, ''), true);

  update public.feature_flags
     set enabled = acik, updated_at = now(), updated_by = auth.uid()
   where key = bayrak
  returning true into bulundu;

  /* Bilinmeyen anahtar SESSİZCE BAŞARILI OLMUYOR. Panelde "kaydedildi"
     yazıp hiçbir şey değiştirmemek, en zor fark edilen hata türüdür. */
  if not coalesce(bulundu, false) then
    raise exception 'Bilinmeyen bayrak: %', bayrak using errcode = '22023';
  end if;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- GERİ ALMA (§13.3 "rollback")
--
-- Geçmişteki bir satırın ÖNCEKİ değerini geri yazıyor. Geçmiş satırını
-- silmiyor; geri alma yeni bir geçmiş satırı üretiyor ve `rolled_back_from`
-- ile hangisinden geldiğini söylüyor. Tarihi silerek düzeltmek, tarihi
-- düzeltmek değildir.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.rollback_setting(
  gecmis_id bigint,
  gerekce text default null
)
returns void
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  kayit public.setting_history%rowtype;
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  select * into kayit from public.setting_history where id = gecmis_id;
  if not found then
    raise exception 'Geçmiş kaydı bulunamadı: %', gecmis_id using errcode = '22023';
  end if;

  if kayit.old_value is null then
    raise exception 'Bu kayıt bir oluşturma; geri alınacak önceki değer yok.'
      using errcode = '22023',
            hint = 'Oluşturulan kaydı geri almak için silmek gerekir.';
  end if;

  perform set_config(
    'astrohub.reason',
    coalesce(gerekce, 'Geri alma: #' || gecmis_id),
    true
  );

  if kayit.scope = 'app_settings' then
    update public.app_settings
       set value = kayit.old_value -> 'value', updated_at = now(), updated_by = auth.uid()
     where key = kayit.record_key;

  elsif kayit.scope = 'feature_flags' then
    update public.feature_flags
       set enabled = (kayit.old_value ->> 'enabled')::boolean,
           updated_at = now(), updated_by = auth.uid()
     where key = kayit.record_key;

  elsif kayit.scope = 'home_modules' then
    update public.home_modules
       set title           = kayit.old_value ->> 'title',
           subtitle        = kayit.old_value ->> 'subtitle',
           enabled         = (kayit.old_value ->> 'enabled')::boolean,
           position        = (kayit.old_value ->> 'position')::integer,
           item_limit      = (kayit.old_value ->> 'item_limit')::integer,
           layout          = kayit.old_value ->> 'layout',
           hide_when_empty = (kayit.old_value ->> 'hide_when_empty')::boolean,
           publish_from    = (kayit.old_value ->> 'publish_from')::timestamptz,
           publish_to      = (kayit.old_value ->> 'publish_to')::timestamptz,
           show_mobile     = (kayit.old_value ->> 'show_mobile')::boolean,
           show_desktop    = (kayit.old_value ->> 'show_desktop')::boolean,
           updated_at = now(), updated_by = auth.uid()
     where key = kayit.record_key;

  elsif kayit.scope = 'nav_links' then
    update public.nav_links
       set menu        = kayit.old_value ->> 'menu',
           group_label = kayit.old_value ->> 'group_label',
           label       = kayit.old_value ->> 'label',
           path        = kayit.old_value ->> 'path',
           position    = (kayit.old_value ->> 'position')::integer,
           enabled     = (kayit.old_value ->> 'enabled')::boolean,
           new_tab     = (kayit.old_value ->> 'new_tab')::boolean,
           auth_only   = (kayit.old_value ->> 'auth_only')::boolean,
           updated_at = now(), updated_by = auth.uid()
     where id = kayit.record_key::uuid;
  end if;

  update public.setting_history
     set rolled_back_from = gecmis_id
   where id = (select max(id) from public.setting_history);

  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (
    auth.uid(), 'settings.rollback', kayit.scope, kayit.record_key,
    jsonb_build_object('gecmis_id', gecmis_id, 'gerekce', gerekce)
  );
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- TASLAK → ÖNİZLEME → YAYIN (§13.3)
--
-- Ana sayfa düzeni herkesin gördüğü yüzey; yanlış bir sıralama anında
-- yayında oluyor. `draft` sütunu bunu ayırıyor: yönetici taslağa yazıyor,
-- `home_layout(true)` ile önizliyor, sonra yayımlıyor ya da atıyor.
--
-- ÖNİZLEME YALNIZCA YÖNETİCİYE. `home_layout(true)` yönetici değilse
-- taslağı yok sayıp canlı düzeni döndürüyor — hata vermiyor, çünkü bu
-- fonksiyon her ziyaretçinin çağırdığı fonksiyon ve "yetkisiz" hatası
-- ana sayfayı boş bırakırdı.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.home_layout(onizleme boolean default false)
returns table (
  key text,
  title text,
  subtitle text,
  enabled boolean,
  /* TIRNAK ZORUNLU: `position` PostgreSQL'de fonksiyon adı anahtar
     kelimesi (`position(x in y)`). Tırnaksız yazıldığında `returns
     table` listesinde sözdizimi hatası veriyor — sütun adı olarak
     kullanmak serbest, ama alıntılanması gerekiyor. */
  "position" integer,
  item_limit integer,
  layout text,
  hide_when_empty boolean,
  show_mobile boolean,
  show_desktop boolean,
  has_draft boolean
)
language sql
stable
security definer
set search_path = public, app, pg_temp
as $$
  with taslak as (
    select onizleme and app.is_admin() as uygula
  )
  select
    m.key,
    case when t.uygula and m.draft ? 'title'    then m.draft ->> 'title'    else m.title end,
    case when t.uygula and m.draft ? 'subtitle' then m.draft ->> 'subtitle' else m.subtitle end,
    case when t.uygula and m.draft ? 'enabled'  then (m.draft ->> 'enabled')::boolean else m.enabled end,
    case when t.uygula and m.draft ? 'position' then (m.draft ->> 'position')::integer else m.position end,
    case when t.uygula and m.draft ? 'item_limit' then (m.draft ->> 'item_limit')::integer else m.item_limit end,
    case when t.uygula and m.draft ? 'layout'   then m.draft ->> 'layout'   else m.layout end,
    case when t.uygula and m.draft ? 'hide_when_empty' then (m.draft ->> 'hide_when_empty')::boolean else m.hide_when_empty end,
    case when t.uygula and m.draft ? 'show_mobile'  then (m.draft ->> 'show_mobile')::boolean  else m.show_mobile end,
    case when t.uygula and m.draft ? 'show_desktop' then (m.draft ->> 'show_desktop')::boolean else m.show_desktop end,
    m.draft is not null
  from public.home_modules m cross join taslak t
  /* ZAMANLANMIŞ YAYIN BURADA UYGULANIYOR (§13.3). İstemciye bırakılsaydı
     her istemcinin saatine güvenmek gerekirdi; sunucu saati tek. */
  where (m.publish_from is null or m.publish_from <= now())
    and (m.publish_to   is null or m.publish_to   >  now())
  order by 5;
$$;

create or replace function public.save_home_draft(
  modul text,
  degisiklik jsonb
)
returns void
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  update public.home_modules
     set draft = coalesce(draft, '{}'::jsonb) || degisiklik,
         updated_at = now(), updated_by = auth.uid()
   where key = modul;

  if not found then
    raise exception 'Bilinmeyen modül: %', modul using errcode = '22023';
  end if;
end;
$$;

create or replace function public.publish_home_draft(gerekce text default null)
returns integer
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  sayi integer;
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  perform set_config('astrohub.reason', coalesce(gerekce, 'Ana sayfa taslağı yayımlandı'), true);

  /* SIRA ÇAKIŞMASI: `position` benzersiz. Taslakta iki modül aynı sırayı
     alırsa yayımlama kısıt hatasıyla düşer ve HİÇBİRİ uygulanmaz —
     işlem atomik. Yarısı uygulanmış bir düzen, kırık bir ana sayfadır.
     Kısıtı işlem sonuna erteliyoruz ki sıralar takas edilebilsin. */
  set constraints all deferred;

  update public.home_modules m
     set title           = coalesce(m.draft ->> 'title', m.title),
         subtitle        = case when m.draft ? 'subtitle' then m.draft ->> 'subtitle' else m.subtitle end,
         enabled         = coalesce((m.draft ->> 'enabled')::boolean, m.enabled),
         position        = coalesce((m.draft ->> 'position')::integer, m.position),
         item_limit      = coalesce((m.draft ->> 'item_limit')::integer, m.item_limit),
         layout          = coalesce(m.draft ->> 'layout', m.layout),
         hide_when_empty = coalesce((m.draft ->> 'hide_when_empty')::boolean, m.hide_when_empty),
         show_mobile     = coalesce((m.draft ->> 'show_mobile')::boolean, m.show_mobile),
         show_desktop    = coalesce((m.draft ->> 'show_desktop')::boolean, m.show_desktop),
         draft = null,
         updated_at = now(), updated_by = auth.uid()
   where m.draft is not null;

  get diagnostics sayi = row_count;
  return sayi;
end;
$$;

create or replace function public.discard_home_draft()
returns integer
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  sayi integer;
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  update public.home_modules set draft = null where draft is not null;
  get diagnostics sayi = row_count;
  return sayi;
end;
$$;

/* Sıra takası için kısıtın ertelenebilir olması gerekiyor. */
alter table public.home_modules
  drop constraint if exists home_modules_position_uniq;
drop index if exists public.home_modules_position_uniq;
alter table public.home_modules
  add constraint home_modules_position_uniq unique (position) deferrable initially immediate;

revoke all on function public.set_app_setting(text, jsonb, text) from public, anon;
revoke all on function public.set_feature_flag(text, boolean, text) from public, anon;
revoke all on function public.rollback_setting(bigint, text) from public, anon;
revoke all on function public.save_home_draft(text, jsonb) from public, anon;
revoke all on function public.publish_home_draft(text) from public, anon;
revoke all on function public.discard_home_draft() from public, anon;

grant execute on function public.set_app_setting(text, jsonb, text)   to authenticated;
grant execute on function public.set_feature_flag(text, boolean, text) to authenticated;
grant execute on function public.rollback_setting(bigint, text)        to authenticated;
grant execute on function public.save_home_draft(text, jsonb)          to authenticated;
grant execute on function public.publish_home_draft(text)              to authenticated;
grant execute on function public.discard_home_draft()                  to authenticated;
grant execute on function public.home_layout(boolean)                  to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 11 — KULÜP DİZİNİ VE YÖNETİCİ DOĞRULAMASI (§14.7)
--
-- ══════════════════════════════════════════════════════════════════════════
-- DİZİN VARDI, TABLOSU YOKTU
--
-- `/topluluklar` çalışıyordu ama tamamen `features/clubs/data.ts` içindeki
-- sabit listeden besleniyordu: altı kulüp, kodda. §14.7'nin istediği
-- "kulüp yöneticisi doğrulama", "güncellik doğrulaması" ve "moderasyon"
-- maddelerinin hiçbiri mümkün değildi — bir kulübün bilgisini
-- güncellemek dağıtım almak demekti.
--
-- Tohum KODDAN TÜRETİLDİ (`data.ts` okunarak). 0058'in `home_modules`
-- tohumu elle yazıldığı için koddan ayrışmıştı ve 0061 onu düzeltmek
-- zorunda kaldı; `clubs.test.ts` bu dosyayı okuyup `data.ts` ile
-- karşılaştırıyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- İKİ AYRI "DOĞRULAMA" VAR VE KARIŞTIRILMAMALI
--
--   `verified_at`     → KULÜBÜN KENDİSİ doğrulandı: yönetici site
--                       ekibiyle iletişime geçti, kulübün gerçek ve
--                       aktif olduğu teyit edildi. Rozet bunu gösterir.
--   `info_checked_on` → BİLGİNİN güncelliği: adres, etkinlik sıklığı,
--                       iletişim hâlâ doğru mu? Kod tarafındaki
--                       `source.lastVerifiedAt` alanının karşılığı.
--
-- Birincisi bir GÜVEN ifadesi, ikincisi bir TAZELİK ölçüsü. Tek alanda
-- toplasaydık "doğrulanmış ama bilgisi iki yıl eski" kulüp ile "bilgisi
-- taze ama kim olduğu teyit edilmemiş" kulüp aynı görünürdü.
--
-- ══════════════════════════════════════════════════════════════════════════
-- YÖNETİCİ BAĞI VAR, "SAHİPLİK" YOK
--
-- `manager_user_id` kulübü yöneten kullanıcıyı işaret ediyor ama ona
-- YAZMA HAKKI VERMİYOR (aşağıdaki politikaya bakınız). Sebep: dizin
-- editoryal bir kaynak. Yönetici kendi kulübünün kaydını serbestçe
-- düzenleyebilseydi, dizin bir tanıtım panosuna dönerdi ve "doğrulanmış"
-- rozeti anlamını yitirirdi.
--
-- Bağın işi başka: kulübün kime ait olduğunu kaydetmek, iletişim
-- kurabilmek ve ileride etkinlik yayımlama yetkisini buna bağlamak.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.clubs (
  slug        text primary key,
  name        text not null,
  /* Kod tarafındaki `ClubKind` ile aynı üç değer. */
  kind        text not null,
  city        text not null,

  founded_year  smallint,
  member_count  integer,
  summary       text not null default '',
  /* Kulübün düzenli işleri. `text[]` — `content_entries.body` ile aynı
     desen; ayrı bir satır tablosu bu kadar küçük bir liste için
     gereksiz join demekti. */
  activities    text[] not null default '{}',

  public_events    boolean not null default false,
  shared_equipment boolean not null default false,
  website          text,
  /* §14.7 "iletişim bilgileri" ve "üyelik/katılım bağlantısı".
     İkisi de TOHUMDA BOŞ: bu kayıtlar gerçek kurumlara ait ve olmayan
     bir e-posta uydurmak, ziyaretçiyi var olmayan bir adrese yazmaya
     yollamak demekti. Alanlar panelden doldurulur; boşken profilde
     iletişim bölümü hiç çizilmiyor. */
  contact_email    text,
  join_url         text,
  /* Etkinlik verisindeki organizatör adı — kayıtlar bununla eşleşiyor. */
  organizer_name   text,

  /* Bilginin nereden geldiği ve NE ZAMAN tazelendiği (§14.7
     "güncellik doğrulaması"). */
  source_name      text,
  info_checked_on  date,

  /* Kulübün kendisi doğrulandı mı (§14.7 "kulüp yöneticisi doğrulama").
     `null` = doğrulanmamış; rozet yok. */
  verified_at      timestamptz,
  verified_by      uuid references auth.users(id) on delete set null,
  /* Kulübü yöneten kullanıcı — yazma hakkı VERMİYOR (başlığa bakınız). */
  manager_user_id  uuid references auth.users(id) on delete set null,

  /* Dizinden çıkarmak için: satırı silmek yerine kapatmak, aynı kulüp
     tekrar eklendiğinde geçmişi korur. */
  listed      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint clubs_slug_format check (slug ~ '^[a-z0-9-]{3,120}$'),
  constraint clubs_kind_check check (kind in ('dernek', 'universite', 'gozlem-grubu')),
  constraint clubs_name_len check (char_length(name) between 2 and 120),
  /* Adres yalnızca https — `nav_links` ve `hero_slides` ile aynı kural;
     dizin dışarı bağlantı veriyor ve `javascript:` bir dizinde
     tıklanabilir olmamalı. */
  constraint clubs_website_check check (
    website is null or website ~ '^https://[A-Za-z0-9.-]+(/[^\s]*)?$'
  ),
  constraint clubs_join_url_check check (
    join_url is null or join_url ~ '^https://[A-Za-z0-9.-]+(/[^\s]*)?$'
  ),
  /* E-postada ŞEKİL denetimi var, "geçerlilik" iddiası yok: RFC 5322'yi
     düzenli ifadeyle kovalamak bu tabloda karşılığı olmayan bir iş.
     Aranan tek şey, `mailto:` bağlantısının çalışabilecek olması. */
  constraint clubs_contact_email_check check (
    contact_email is null or contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[A-Za-z]{2,}$'
  ),
  /* Kuruluş yılı gelecekte olamaz; üye sayısı negatif olamaz. */
  constraint clubs_founded_check check (
    founded_year is null
    or founded_year between 1800 and extract(year from now())::int
  ),
  constraint clubs_member_check check (member_count is null or member_count >= 0),
  /* DOĞRULAYAN OLMADAN DOĞRULAMA OLMAZ: `verified_at` doluysa kimin
     doğruladığı da yazılı olmalı. Aksi hâlde rozet "birileri bir ara
     onayladı" demek olurdu ve geri izlenemezdi. */
  constraint clubs_verified_pair check (
    (verified_at is null and verified_by is null)
    or (verified_at is not null and verified_by is not null)
  )
);

comment on table public.clubs is
  'Kulüp ve topluluk dizini (§14.7). `verified_at` kulübün kendisini, `info_checked_on` bilginin tazeliğini gösterir — ikisi ayrı.';

create index if not exists clubs_city_idx on public.clubs (city, name);
create index if not exists clubs_listed_idx on public.clubs (kind, city) where listed;

alter table public.clubs enable row level security;

/* Dizin herkese açık — listeden çıkarılanlar hariç. Yönetici hepsini
   görüyor ki geri açabilsin (0059'un tuzağı). */
drop policy if exists clubs_read on public.clubs;
create policy clubs_read on public.clubs
  for select using (listed or app.is_admin());

/*
 * YAZMA YALNIZCA YÖNETİCİDE — kulüp yöneticisinde DEĞİL.
 *
 * `manager_user_id` bir bağ, bir yetki değil (başlıktaki gerekçe). Dizin
 * editoryal bir kaynak; kulüpler kendi kayıtlarını serbestçe
 * düzenleyebilseydi "doğrulanmış" rozeti anlamını yitirirdi.
 */
drop policy if exists clubs_write on public.clubs;
create policy clubs_write on public.clubs
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

grant select on public.clubs to anon, authenticated;
grant insert, update, delete on public.clubs to authenticated;

drop trigger if exists clubs_set_updated_at on public.clubs;
create trigger clubs_set_updated_at
  before update on public.clubs
  for each row execute function app.set_updated_at();

-- ── Tohum ────────────────────────────────────────────────────────────────
-- `features/clubs/data.ts` OKUNARAK üretildi. Doğrulama alanları BOŞ
-- geliyor: hiçbiri henüz doğrulanmadı ve tohumla "doğrulanmış" demek,
-- rozeti daha ilk günde yalan hâline getirirdi.
insert into public.clubs (
  slug, name, kind, city, founded_year, member_count, summary, activities,
  public_events, shared_equipment, website, organizer_name,
  source_name, info_checked_on
)
values
  ('antalya-astronomi-dernegi', 'Antalya Astronomi Derneği', 'dernek', 'Antalya',
   2009, 180,
   'Saklıkent ve Bakırlıtepe çevresinde düzenli gözlem etkinlikleri yapan, halka açık gözlem geceleriyle bilinen dernek. Meteor yağmuru kampları yıllık takvimin sabiti.',
   array['Aylık halka açık gözlem gecesi', 'Meteor yağmuru kampları', 'Okul ziyaretleri ve teleskop tanıtımı'],
   true, true, null, 'Antalya Astronomi Derneği',
   'Dernek duyuruları', '2026-07-10'::date),
  ('ege-universitesi-astronomi-kulubu', 'Ege Üniversitesi Astronomi Kulübü', 'universite', 'İzmir',
   1998, null,
   'Kampüs içinde güneş gözlemleri ve dönem boyunca süren temel astronomi seminerleri düzenler. H-alfa güneş teleskobu kulüp envanterindedir.',
   array['H-alfa güneş gözlemi', 'Dönemlik astronomi semineri', 'Gözlem gezileri'],
   true, true, null, 'Ege Üniversitesi Astronomi Kulübü',
   'Kulüp duyurusu', '2026-07-01'::date),
  ('ankara-astrofotograf-grubu', 'Ankara Astrofotoğraf Grubu', 'gozlem-grubu', 'Ankara',
   null, null,
   'Görüntü işleme atölyeleri ve Çamlıdere çevresinde ortak çekim geceleri düzenleyen, astrofotoğrafa odaklı topluluk.',
   array['Görüntü işleme atölyesi', 'Ortak çekim geceleri', 'Ekipman ödünç havuzu'],
   true, false, null, 'Ankara Astrofotoğraf Grubu',
   'Topluluk paylaşımı', '2026-07-15'::date),
  ('bursa-astronomi-dernegi', 'Bursa Astronomi Derneği', 'dernek', 'Bursa',
   2013, 95,
   'Uludağ Sarıalan mevkiinde büyük katılımlı gözlem şenlikleri düzenler; ekipmanı olmayan katılımcılar için teleskop istasyonları kurar.',
   array['Gözlem şenliği', 'Teleskop istasyonu', 'Çocuk atölyeleri'],
   true, true, null, 'Bursa Astronomi Derneği',
   'Dernek duyurusu', '2026-07-19'::date),
  ('erciyes-astronomi-kulubu', 'Erciyes Astronomi Kulübü', 'universite', 'Kayseri',
   2011, null,
   'Erciyes yaylasındaki yüksek rakım ve kuru kış havasını kullanan kış gözlem kamplarıyla tanınır.',
   array['Kış gözlem kampı', 'Meteor sayımı', 'Gökyüzü tanıtım geceleri'],
   true, false, null, 'Erciyes Astronomi Kulübü',
   'Kulüp duyurusu', '2026-07-18'::date),
  ('kapadokya-gokbilim-toplulugu', 'Kapadokya Gökbilim Topluluğu', 'gozlem-grubu', 'Nevşehir',
   null, null,
   'Peribacaları çevresindeki düşük ışık kirliliğini turizmle birleştiren gözlem geceleri ve astrofoto atölyeleri düzenler.',
   array['Gözlem gecesi', 'Astrofoto atölyesi', 'Rehberli gökyüzü turu'],
   true, true, null, 'Kapadokya Gökbilim Topluluğu',
   'Organizatör bildirimi', '2026-07-20'::date)
on conflict (slug) do nothing;

-- ── Ölçüm ────────────────────────────────────────────────────────────────
do $$
declare
  sayi     integer;
  dogrulu  integer;
begin
  select count(*) into sayi from public.clubs;
  if sayi < 6 then
    raise exception '0067 ölçümü: altı kulüp bekleniyordu, % var.', sayi;
  end if;

  /* Tohum HİÇBİRİNİ doğrulanmış işaretlememeli — rozet ilk günde yalan
     olmamalı.
     `updated_at = created_at` süzgeci ŞART: bu dosya yeniden çalıştığında
     yöneticinin sonradan doğruladığı kulüpler ölçümü düşürmemeli. Aksi
     hâlde 0061'in düzeltmek zorunda kaldığı hatanın aynısı olurdu —
     ölçüm, yönetici düzenlemesini hata sanardı. Tohum satırlarında iki
     damga aynı `now()` çağrısından gelir; güncelleme tetikleyicisi
     `updated_at`i ileri alır. */
  select count(*) into dogrulu
    from public.clubs
   where verified_at is not null and updated_at = created_at;
  if dogrulu > 0 then
    raise exception '0067 ölçümü: tohum % kulübü doğrulanmış işaretlemiş.', dogrulu;
  end if;

  /* Doğrulayan olmadan doğrulama kabul edilmemeli. */
  begin
    update public.clubs set verified_at = now() where slug = 'antalya-astronomi-dernegi';
    raise exception '0067 ölçümü: `verified_by` olmadan doğrulama kabul edildi.';
  exception when check_violation then
    null; -- beklenen
  end;

  /* `javascript:` adresi reddedilmeli. */
  begin
    update public.clubs set website = 'javascript:alert(1)'
     where slug = 'antalya-astronomi-dernegi';
    raise exception '0067 ölçümü: güvensiz adres kabul edildi.';
  exception when check_violation then
    null; -- beklenen
  end;

  /* Katılım bağlantısı da yalnızca https. */
  begin
    update public.clubs set join_url = 'http://forms.example/katil'
     where slug = 'antalya-astronomi-dernegi';
    raise exception '0067 ölçümü: https olmayan katılım bağlantısı kabul edildi.';
  exception when check_violation then
    null; -- beklenen
  end;

  /* E-posta şekli tutmalı, geçerli olan kabul edilmeli. */
  begin
    update public.clubs set contact_email = 'bilgi(at)example.org'
     where slug = 'antalya-astronomi-dernegi';
    raise exception '0067 ölçümü: biçimsiz e-posta kabul edildi.';
  exception when check_violation then
    null; -- beklenen
  end;

  raise notice '0067 ölçümü geçti: % kulüp, hiçbiri doğrulanmamış, kısıtlar bağlıyor.', sayi;
end $$;

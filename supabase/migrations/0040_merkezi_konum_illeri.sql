-- ══════════════════════════════════════════════════════════════════════════
-- MERKEZÎ KONUM MODELİ — Türkiye idari birimleri (Faz 1.1)
-- ══════════════════════════════════════════════════════════════════════════
--
-- SORUN: şehir listesi kodda sabitti (`features/location/cities.ts`) ve
-- yalnızca 15 il içeriyordu. Aynı anda pazaryeri, forum, kulüpler, gözlem
-- noktaları ve fotoğraf modülleri kendi şehir metinlerini taşıyordu —
-- yani "Ankara" altı ayrı yerde, altı ayrı yazımla bulunabiliyordu.
-- Bir kullanıcı "Muğla" yazıp diğeri "Mugla" yazınca ikisi farklı şehir
-- oluyordu ve filtre ikisini birden bulamıyordu.
--
-- ══════════════════════════════════════════════════════════════════════════
-- NORMALİZE AD AYRI KOLON, İFADE İNDEKSİ DEĞİL
--
-- `search_name` Türkçe harfleri ASCII'ye indirgenmiş hâli. Kolon olarak
-- tutuluyor çünkü aramada iki yön de gerekiyor: kullanıcı "cankiri"
-- yazınca "Çankırı"yı bulmalı, "Çankırı" yazınca da. İfade indeksi
-- yalnızca birinci yönü çözerdi.
--
-- TÜRKÇE I/İ TUZAĞI: `lower('I')` PostgreSQL'de 'i' verir ama Türkçede
-- 'ı' olmalı. Bu yüzden normalizasyon `lower()`a bırakılmıyor, harf
-- eşlemesi açıkça yazılıyor (aşağıdaki `app.tr_normalize`).
--
-- ══════════════════════════════════════════════════════════════════════════
-- SIRALAMA: `sort_order` KOLONU, ad üzerinden ORDER BY DEĞİL
--
-- Postgres'in `tr_TR` collation'ı her kurulumda mevcut değil; olmadığında
-- "Çanakkale" "Zonguldak"tan sonra gelir. Sıra veritabanında bir kez
-- hesaplanıp kolona yazılıyor — böylece collation'dan bağımsız.
--
-- ══════════════════════════════════════════════════════════════════════════
-- SİLİNEMEZ, YALNIZCA PASİFLEŞTİRİLEBİLİR
--
-- İl listesi referans veridir; bir yönetici yanlışlıkla silerse ona bağlı
-- bütün profil/etkinlik/ilan kayıtları sahipsiz kalır. `DELETE` tetikleyici
-- ile engelleniyor; kullanımdan kaldırma `is_active = false` ile yapılır.
-- ══════════════════════════════════════════════════════════════════════════

-- Türkçe metni ASCII arama biçimine indirger.
create or replace function app.tr_normalize(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(
    translate(input,
      'ıİşŞğĞüÜöÖçÇâÂîÎûÛ',
      'iisSgGuUoOcCaAiIuU')
  )
$$;

create table if not exists public.provinces (
  /** Plaka kodu — Türkiye'de kanonik ve değişmez il kimliği. */
  code        smallint primary key,
  name        text not null unique,
  /** ASCII'ye indirgenmiş arama adı; `app.tr_normalize` ile üretilir. */
  search_name text not null,
  slug        text not null unique,
  latitude    numeric(9,6) not null,
  longitude   numeric(9,6) not null,
  is_active   boolean not null default true,
  sort_order  smallint not null,
  created_at  timestamptz not null default now(),
  constraint provinces_code_range check (code between 1 and 81),
  constraint provinces_lat_range  check (latitude between 35 and 43),
  constraint provinces_lon_range  check (longitude between 25 and 45)
);

create index if not exists provinces_search_idx on public.provinces (search_name);
create index if not exists provinces_sort_idx   on public.provinces (sort_order);
create index if not exists provinces_active_idx on public.provinces (is_active) where is_active;

insert into public.provinces (code, name, search_name, slug, latitude, longitude, sort_order)
values
  (1,'Adana','adana','adana',37.0,35.3213),
  (2,'Adıyaman','adiyaman','adiyaman',37.7648,38.2786),
  (3,'Afyonkarahisar','afyonkarahisar','afyonkarahisar',38.7507,30.5567),
  (4,'Ağrı','agri','agri',39.7191,43.0503),
  (5,'Amasya','amasya','amasya',40.6499,35.8353),
  (6,'Ankara','ankara','ankara',39.9334,32.8597),
  (7,'Antalya','antalya','antalya',36.8969,30.7133),
  (8,'Artvin','artvin','artvin',41.1828,41.8183),
  (9,'Aydın','aydin','aydin',37.856,27.8416),
  (10,'Balıkesir','balikesir','balikesir',39.6484,27.8826),
  (11,'Bilecik','bilecik','bilecik',40.1451,29.9799),
  (12,'Bingöl','bingol','bingol',38.8854,40.4966),
  (13,'Bitlis','bitlis','bitlis',38.4006,42.1095),
  (14,'Bolu','bolu','bolu',40.7392,31.6089),
  (15,'Burdur','burdur','burdur',37.7203,30.2908),
  (16,'Bursa','bursa','bursa',40.1885,29.061),
  (17,'Çanakkale','canakkale','canakkale',40.1553,26.4142),
  (18,'Çankırı','cankiri','cankiri',40.6013,33.6134),
  (19,'Çorum','corum','corum',40.5506,34.9556),
  (20,'Denizli','denizli','denizli',37.7765,29.0864),
  (21,'Diyarbakır','diyarbakir','diyarbakir',37.9144,40.2306),
  (22,'Edirne','edirne','edirne',41.6818,26.5623),
  (23,'Elazığ','elazig','elazig',38.681,39.2264),
  (24,'Erzincan','erzincan','erzincan',39.75,39.5),
  (25,'Erzurum','erzurum','erzurum',39.9043,41.2679),
  (26,'Eskişehir','eskisehir','eskisehir',39.7767,30.5206),
  (27,'Gaziantep','gaziantep','gaziantep',37.0662,37.3833),
  (28,'Giresun','giresun','giresun',40.9128,38.3895),
  (29,'Gümüşhane','gumushane','gumushane',40.4386,39.5086),
  (30,'Hakkâri','hakkari','hakkari',37.5744,43.7408),
  (31,'Hatay','hatay','hatay',36.2025,36.1606),
  (32,'Isparta','isparta','isparta',37.7648,30.5566),
  (33,'Mersin','mersin','mersin',36.8,34.6333),
  (34,'İstanbul','istanbul','istanbul',41.0082,28.9784),
  (35,'İzmir','izmir','izmir',38.4237,27.1428),
  (36,'Kars','kars','kars',40.6013,43.0975),
  (37,'Kastamonu','kastamonu','kastamonu',41.3887,33.7827),
  (38,'Kayseri','kayseri','kayseri',38.7312,35.4787),
  (39,'Kırklareli','kirklareli','kirklareli',41.7333,27.2167),
  (40,'Kırşehir','kirsehir','kirsehir',39.1425,34.1709),
  (41,'Kocaeli','kocaeli','kocaeli',40.8533,29.8815),
  (42,'Konya','konya','konya',37.8746,32.4932),
  (43,'Kütahya','kutahya','kutahya',39.4167,29.9833),
  (44,'Malatya','malatya','malatya',38.3552,38.3095),
  (45,'Manisa','manisa','manisa',38.6191,27.4289),
  (46,'Kahramanmaraş','kahramanmaras','kahramanmaras',37.5858,36.9371),
  (47,'Mardin','mardin','mardin',37.3212,40.7245),
  (48,'Muğla','mugla','mugla',37.2153,28.3636),
  (49,'Muş','mus','mus',38.9462,41.7539),
  (50,'Nevşehir','nevsehir','nevsehir',38.6939,34.6857),
  (51,'Niğde','nigde','nigde',37.9667,34.6833),
  (52,'Ordu','ordu','ordu',40.9839,37.8764),
  (53,'Rize','rize','rize',41.0201,40.5234),
  (54,'Sakarya','sakarya','sakarya',40.7569,30.3783),
  (55,'Samsun','samsun','samsun',41.2867,36.33),
  (56,'Siirt','siirt','siirt',37.9333,41.95),
  (57,'Sinop','sinop','sinop',42.0231,35.1531),
  (58,'Sivas','sivas','sivas',39.7477,37.0179),
  (59,'Tekirdağ','tekirdag','tekirdag',40.9833,27.5167),
  (60,'Tokat','tokat','tokat',40.3167,36.55),
  (61,'Trabzon','trabzon','trabzon',41.0027,39.7168),
  (62,'Tunceli','tunceli','tunceli',39.1079,39.5401),
  (63,'Şanlıurfa','sanliurfa','sanliurfa',37.1591,38.7969),
  (64,'Uşak','usak','usak',38.6823,29.4082),
  (65,'Van','van','van',38.4891,43.4089),
  (66,'Yozgat','yozgat','yozgat',39.8181,34.8147),
  (67,'Zonguldak','zonguldak','zonguldak',41.4564,31.7987),
  (68,'Aksaray','aksaray','aksaray',38.3687,34.037),
  (69,'Bayburt','bayburt','bayburt',40.2552,40.2249),
  (70,'Karaman','karaman','karaman',37.1811,33.215),
  (71,'Kırıkkale','kirikkale','kirikkale',39.8468,33.5153),
  (72,'Batman','batman','batman',37.8812,41.1351),
  (73,'Şırnak','sirnak','sirnak',37.4187,42.4918),
  (74,'Bartın','bartin','bartin',41.6344,32.3375),
  (75,'Ardahan','ardahan','ardahan',41.1105,42.7022),
  (76,'Iğdır','igdir','igdir',39.888,44.0048),
  (77,'Yalova','yalova','yalova',40.65,29.2667),
  (78,'Karabük','karabuk','karabuk',41.2061,32.6204),
  (79,'Kilis','kilis','kilis',36.7184,37.1212),
  (80,'Osmaniye','osmaniye','osmaniye',37.0742,36.2464),
  (81,'Düzce','duzce','duzce',40.8438,31.1565)
on conflict (code) do update
  set name        = excluded.name,
      search_name = excluded.search_name,
      slug        = excluded.slug,
      latitude    = excluded.latitude,
      longitude   = excluded.longitude;

-- Sıra alfabetik ama Türkçe alfabesine göre; normalize ad üzerinden
-- hesaplanıyor ki collation kurulu olmasa da aynı sonucu versin.
with sirali as (
  select code, row_number() over (order by search_name) as sira
    from public.provinces
)
update public.provinces p set sort_order = s.sira
  from sirali s where s.code = p.code;

-- ── İlçeler ───────────────────────────────────────────────────────────────
-- Tablo ve yabancı anahtar KURULDU; tohum verisi bu turda YAZILMADI.
-- Sebep dürüstlük: 973 ilçenin adını çevrimdışı üretmek uydurma riski
-- taşıyor ve yanlış bir ilçe adı, ona bağlanan her kaydı bozar. Resmî
-- kaynak (TÜİK/NVİ) erişimi olduğunda tek `insert` ile doldurulur.
-- Arayüzde ilçe seçimi YOK; bu tablo boşken hiçbir akış kırılmıyor.
create table if not exists public.districts (
  id            uuid primary key default gen_random_uuid(),
  province_code smallint not null references public.provinces (code) on delete restrict,
  name          text not null,
  search_name   text not null,
  slug          text not null,
  is_active     boolean not null default true,
  sort_order    smallint not null default 0,
  constraint districts_unique_in_province unique (province_code, slug)
);

create index if not exists districts_province_idx on public.districts (province_code, sort_order);

-- ── Silme koruması ────────────────────────────────────────────────────────
create or replace function app.block_reference_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Referans veri silinemez (%). Kullanımdan kaldırmak için is_active = false yapın.',
    tg_table_name
    using errcode = 'restrict_violation';
end $$;

drop trigger if exists provinces_no_delete on public.provinces;
create trigger provinces_no_delete
  before delete on public.provinces
  for each row execute function app.block_reference_delete();

-- ── RLS ───────────────────────────────────────────────────────────────────
-- Referans veri: herkes okur, yalnızca yönetici yazar. Aktiflik bayrağı
-- okumayı sınırlamıyor — pasif bir il, ona bağlı eski kayıtlarda hâlâ
-- gösterilebilmeli.
alter table public.provinces enable row level security;
alter table public.districts enable row level security;

drop policy if exists provinces_read on public.provinces;
create policy provinces_read on public.provinces for select using (true);

drop policy if exists provinces_admin_write on public.provinces;
create policy provinces_admin_write on public.provinces
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists districts_read on public.districts;
create policy districts_read on public.districts for select using (true);

drop policy if exists districts_admin_write on public.districts;
create policy districts_admin_write on public.districts
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

grant select on public.provinces, public.districts to anon;
grant select, insert, update, delete on public.provinces, public.districts to authenticated;

-- ── Doğrulama: 81 il yoksa migration DÜŞER ────────────────────────────────
-- Sessizce eksik yüklenen bir referans tablosu, aylar sonra "neden bazı
-- iller seçilemiyor" olarak ortaya çıkardı.
do $$
declare n integer; tekrar integer;
begin
  select count(*) into n from public.provinces;
  if n <> 81 then
    raise exception 'İl sayısı 81 olmalı, % bulundu', n;
  end if;

  select count(*) into tekrar from (
    select slug from public.provinces group by slug having count(*) > 1) x;
  if tekrar > 0 then
    raise exception '% tekrar eden slug var', tekrar;
  end if;
end $$;

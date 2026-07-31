-- 0036_fotograf_puanlama.sql
-- Fotoğraflara 10 üzerinden puan (§7.2) — yarışma altyapısının temeli.
--
-- ══════════════════════════════════════════════════════════════════════
-- BEĞENİ VARKEN NEDEN PUAN
--
-- Beğeni tek bitlik: "beğendim". Bir yarışmada işe yaramıyor çünkü
-- sıralama tamamen KAÇ KİŞİNİN gördüğüne bağlı kalıyor — erken
-- paylaşılan kare, daha iyi olan geç kareyi kalabalıkla yener.
--
-- Puan ortalaması bunu kırıyor: yirmi kişinin 9.2'si, iki yüz kişinin
-- 6.4'ünden yüksek. Sıralama görünürlüğü değil, değerlendirmeyi ölçüyor.
--
-- İkisi birlikte duruyor ve bu bilinçli: beğeni BEDAVA bir jest (tek
-- tıklama, anlık), puan ise bir HÜKÜM. İkisini birleştirmek, "hoşuma
-- gitti" diyen ile "teknik olarak 7/10" diyeni aynı kefeye koyardı.
--
-- ══════════════════════════════════════════════════════════════════════
-- TAM SAYI 1–10, ONDALIK YOK
--
-- Ölçek kullanıcıya sorulan soru; 7.4 ile 7.6 arasında ayrım yapabilen
-- bir insan yok. Ondalık serbest bırakılsaydı arayüzün sürgüsü de
-- ondalık olurdu ve iki kişi aynı kareyi "aynı" bulduğunda farklı sayı
-- yazardı. ORTALAMA ondalık — o hesaplanmış bir değer, girilen değil.
--
-- ══════════════════════════════════════════════════════════════════════
-- KENDİ FOTOĞRAFINA PUAN VERİLEMEZ
--
-- Yarışma altyapısı olacağı için bu bir kural, bir nezaket değil. Kısıt
-- veritabanında: istemcide gizlenen bir düğme, doğrudan API'ye giden
-- birini durdurmaz.
--
-- Beğenide böyle bir kısıt YOK ve olmamalı — kendi karesini beğenmek
-- sıralamayı bozmuyor, tek bir sayı ekliyor. Puan ortalamayı taşıyor:
-- tek bir 10, yirmi oylu bir ortalamayı 0.15 kaydırır.

create table if not exists public.photo_ratings (
  photo_id   uuid not null references public.astro_photos(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  score      smallint not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

comment on table public.photo_ratings is
  'Fotoğraf puanları, 10 üzerinden tam sayı. Kullanıcı başına tek satır; fikir değiştirmek satırı günceller, yeni satır açmaz (0036).';

-- Bir kullanıcının verdiği puanları görmek (profil sayfası) ve bir
-- fotoğrafın oylarını saymak farklı yönlerde tarama; birincil anahtar
-- yalnızca ilkini karşılıyor.
create index if not exists photo_ratings_user_idx
  on public.photo_ratings (user_id, created_at desc);

drop trigger if exists photo_ratings_touch on public.photo_ratings;
create trigger photo_ratings_touch
  before update on public.photo_ratings
  for each row execute function app.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- TOPLAM VE SAYI SAKLANIYOR, ORTALAMA DEĞİL
--
-- `rating_avg` kolonu tutulsaydı her oyda yeniden hesaplanması ve
-- yuvarlanması gerekirdi; yuvarlanmış bir ortalamaya yeni oy eklemek
-- hatayı biriktirir. Toplam ve sayı tam sayı aritmetiği — ortalama
-- okunduğu anda bölünüyor.
-- ══════════════════════════════════════════════════════════════════════
alter table public.astro_photos
  add column if not exists rating_sum   integer not null default 0,
  add column if not exists rating_count integer not null default 0;

comment on column public.astro_photos.rating_sum is
  'Verilen puanların toplamı. Ortalama okurken bölünüyor — yuvarlanmış ortalama saklamak hatayı biriktirirdi (0036).';

-- ══════════════════════════════════════════════════════════════════════
-- SAYAÇ TETİKLEYİCİDE
--
-- İstemci `rating_sum`'ı kendisi güncelleyemiyor (aşağıdaki koruma).
-- Beğenideki kararın aynısı: iki kaynak olsaydı ayrışırlar ve
-- hangisinin doğru olduğu belli olmazdı.
--
-- UPDATE dalı şart: kullanıcı fikrini değiştirdiğinde satır güncelleniyor,
-- silinip yeniden açılmıyor. Yalnızca INSERT/DELETE dinleseydik, 3'ü 9
-- yapan bir oy toplamı hiç değiştirmezdi.
--
-- ══════════════════════════════════════════════════════════════════════
-- İKİ TETİKLEYİCİ BİRBİRİNİ YİYORDU — BAYRAK BUNU ÇÖZÜYOR
--
-- `astro_photos` üzerinde BEFORE UPDATE olarak duran koruma tetikleyicisi
-- (`app.guard_solve_fields`) servis rolü dışındaki her güncellemede
-- korunan kolonları eski değerine döndürüyor. Sayaç tetikleyicisi
-- SECURITY DEFINER ama bu YETMİYOR: `security definer` fonksiyonun İÇİNDE
-- yetkiyi değiştirir, `auth.role()` ise hâlâ JWT'den 'authenticated'
-- okur. Yani sayacın yazdığı değer, bir sonraki satırda koruma tarafından
-- geri alınırdı ve puanlar sessizce hiç işlenmezdi.
--
-- İşlem-yerel bir ayar bayrağı iki tetikleyiciyi ayırıyor. `set_config`
-- üçüncü argümanı `true`: bayrak yalnızca bu işlemde geçerli, başka bir
-- oturuma ya da işleme sızmıyor. Bayrağı yalnızca bu iki sayaç fonksiyonu
-- kuruyor; dışarıdan gelen bir güncelleme onu kuramaz çünkü bayrağı
-- kurmak için önce bu fonksiyonların çağrılması gerekiyor.
-- ══════════════════════════════════════════════════════════════════════
create or replace function app.photo_rating_counters()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  sonuc record;
begin
  perform set_config('app.sayac_yazimi', 'acik', true);

  if tg_op = 'INSERT' then
    update public.astro_photos
       set rating_sum   = rating_sum + new.score,
           rating_count = rating_count + 1
     where id = new.photo_id;
    sonuc := new;
  elsif tg_op = 'UPDATE' then
    update public.astro_photos
       set rating_sum = greatest(0, rating_sum - old.score + new.score)
     where id = new.photo_id;
    sonuc := new;
  else
    update public.astro_photos
       set rating_sum   = greatest(0, rating_sum - old.score),
           rating_count = greatest(0, rating_count - 1)
     where id = old.photo_id;
    sonuc := old;
  end if;

  perform set_config('app.sayac_yazimi', 'kapali', true);
  return sonuc;
end;
$$;

comment on function app.photo_rating_counters is
  'photo_ratings değiştikçe astro_photos.rating_sum/rating_count günceller. UPDATE dalı şart: fikir değiştirme satırı günceller (0036).';

/*
 * BEĞENİ/YORUM SAYACI DA AYNI BAYRAĞI KURUYOR.
 *
 * Koruma artık `like_count` ve `comment_count`u da geri alıyor; bu
 * fonksiyon bayrağı kurmasaydı beğeni sayısı bir daha hiç artmazdı.
 * Gövde 0009'daki ile aynı, yalnızca bayrak eklendi.
 */
create or replace function app.photo_touch_counters()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  target uuid;
  delta  integer;
begin
  if tg_op = 'INSERT' then
    target := new.photo_id;
    delta := 1;
  else
    target := old.photo_id;
    delta := -1;
  end if;

  perform set_config('app.sayac_yazimi', 'acik', true);

  if tg_table_name = 'photo_likes' then
    update public.astro_photos
       set like_count = greatest(0, like_count + delta)
     where id = target;
  else
    update public.astro_photos
       set comment_count = greatest(0, comment_count + delta)
     where id = target;
  end if;

  perform set_config('app.sayac_yazimi', 'kapali', true);
  return coalesce(new, old);
end;
$$;

drop trigger if exists photo_ratings_counter on public.photo_ratings;
create trigger photo_ratings_counter
  after insert or update or delete on public.photo_ratings
  for each row execute function app.photo_rating_counters();

-- ══════════════════════════════════════════════════════════════════════
-- SATIR GÜVENLİĞİ
-- ══════════════════════════════════════════════════════════════════════
alter table public.photo_ratings enable row level security;

revoke all on public.photo_ratings from anon, authenticated;
grant select on public.photo_ratings to anon, authenticated;
grant insert, update, delete on public.photo_ratings to authenticated;

/*
 * OKUMA HERKESE AÇIK — ama kimin kaça oy verdiği de görünüyor.
 *
 * Gizli oylama düşünüldü ve REDDEDİLDİ: gizli oy, oy satırlarının
 * yalnızca sahibine görünmesi demek ve o durumda ortalamayı kimse
 * doğrulayamaz. Şeffaflık ilkesi (§3.3) burada da geçerli — bir yarışma
 * sonucu, sayılabilir olmadan güvenilmez.
 */
drop policy if exists photo_ratings_read on public.photo_ratings;
create policy photo_ratings_read on public.photo_ratings
  for select to anon, authenticated
  using (true);

/*
 * YAZMA: yalnızca kendi adına ve yalnızca BAŞKASININ yayımlanmış
 * fotoğrafına.
 *
 * `status = 'published'` şartı taslak ve moderasyondaki kayıtları
 * dışarıda tutuyor; yayımlanmamış bir kareye oy vermek, henüz var
 * olmayan bir şeyi puanlamak olurdu.
 */
drop policy if exists photo_ratings_insert_own on public.photo_ratings;
create policy photo_ratings_insert_own on public.photo_ratings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.astro_photos p
       where p.id = photo_id
         and p.status = 'published'
         and p.user_id <> (select auth.uid())
    )
  );

drop policy if exists photo_ratings_update_own on public.photo_ratings;
create policy photo_ratings_update_own on public.photo_ratings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists photo_ratings_delete_own on public.photo_ratings;
create policy photo_ratings_delete_own on public.photo_ratings
  for delete to authenticated
  using (user_id = (select auth.uid()) or app.is_admin());

-- ══════════════════════════════════════════════════════════════════════
-- SAYAÇ KOLONLARI KULLANICIDAN KORUNUYOR
--
-- `astro_photos_update_own` sahibin kendi satırını güncellemesine izin
-- veriyor — yani sahibi `rating_sum`'ı elle 10000 yapabilirdi. 0032'de
-- plate solve alanları için kurulan koruma buraya da genişletiliyor.
--
-- Ayrı bir tetikleyici değil, aynısının içine ekleniyor: iki BEFORE
-- UPDATE tetikleyicisinin çalışma sırası ada göre belirlenir ve o sıraya
-- bel bağlamak, ileride birinin adını değiştirdiğinde sessizce kırılır.
-- ══════════════════════════════════════════════════════════════════════
create or replace function app.guard_solve_fields()
returns trigger
language plpgsql
security definer set search_path = ''
as $fn$
begin
  if current_setting('role', true) = 'service_role'
     or auth.role() = 'service_role' then
    return new;
  end if;

  new.solve_status           := old.solve_status;
  new.solve_ra_deg           := old.solve_ra_deg;
  new.solve_dec_deg          := old.solve_dec_deg;
  new.solve_rotation_deg     := old.solve_rotation_deg;
  new.solve_scale_arcsec_px  := old.solve_scale_arcsec_px;
  new.solve_field_width_deg  := old.solve_field_width_deg;
  new.solve_field_height_deg := old.solve_field_height_deg;
  new.solved_at              := old.solved_at;
  new.solve_error            := old.solve_error;

  /*
   * SAYAÇLAR — yalnızca sayaç tetikleyicilerinden yazılabilir.
   *
   * Bayrak kurulu değilse güncelleme kullanıcıdan geliyor demektir ve
   * eski değerler korunuyor. Bayrağı yalnızca `app.photo_rating_counters`
   * ve `app.photo_touch_counters` kuruyor; ikisi de işlem-yerel
   * (`set_config(..., true)`) olduğu için bayrak bir isteğin ötesine
   * geçmiyor.
   *
   * Bu koruma olmadan fotoğrafın SAHİBİ kendi satırını güncelleyebildiği
   * için (`astro_photos_update_own`) `rating_sum`'ı elle yazabilirdi —
   * yarışma sıralamasını tek bir PATCH isteğiyle bozmak demek.
   */
  if current_setting('app.sayac_yazimi', true) is distinct from 'acik' then
    new.rating_sum    := old.rating_sum;
    new.rating_count  := old.rating_count;
    new.like_count    := old.like_count;
    new.comment_count := old.comment_count;
  end if;

  return new;
end;
$fn$;

comment on function app.guard_solve_fields is
  'Ölçüm ve sayaç kolonlarını kullanıcı güncellemelerinden korur: plate solve sonucu ve puan/beğeni sayaçları yalnızca sunucudan yazılır (0032, 0036).';

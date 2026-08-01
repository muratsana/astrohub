-- ══════════════════════════════════════════════════════════════════════════
-- İLAN FOTOĞRAFLARI
-- ══════════════════════════════════════════════════════════════════════════
--
-- İkinci el ekipman ilanında fotoğraf SÜS DEĞİL, İLANIN KENDİSİ. Alıcı
-- teleskobun tüpündeki çiziği, odaklayıcının boşluğunu, kutunun içindeki
-- eksik parçayı fotoğraftan görüyor. Fotoğrafsız ilan, "iyi durumda"
-- yazan bir metinden ibaret kalıyor ve o cümleyi doğrulamanın yolu yok.
--
-- `listings` tablosunda bugüne kadar fotoğraf için TEK BİR KOLON YOKTU.
-- Arayüz yer tutucu bir yıldız alanı çizip "medya pipeline'ı
-- bağlandığında açılacak" diyordu; pipeline 0012'de bağlandı ve fotoğraf
-- akışı arkasından gelmedi.
--
-- ══════════════════════════════════════════════════════════════════════════
-- NEDEN AYRI TABLO, `listings`TE BİR DİZİ KOLONU DEĞİL
--
-- Bir ilanda birden çok fotoğraf var ve sıraları anlamlı (ilki kapak).
-- `text[]` kolonu bunu taşırdı ama üç şeyi kaybederdik: satır bazlı RLS,
-- tek fotoğrafı silerken diziyi yeniden yazmama, ve gelecekte fotoğraf
-- başına alan eklenebilmesi (açıklama, moderasyon durumu).
--
-- ══════════════════════════════════════════════════════════════════════════
-- YOL SAKLANIYOR, TAM ADRES DEĞİL
--
-- Fotoğraf ve radyo tarafındaki kararın aynısı (0004, 0009): proje ya da
-- CDN adresi değişirse satırlar elden geçmesin.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.listing_photos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  /** `listings` bucket'ındaki nesne yolu — genel URL değil. */
  storage_path text not null,
  /** Sıra; 0 kapak fotoğrafı. */
  position     integer not null default 0,
  width        integer,
  height       integer,
  created_at   timestamptz not null default now(),
  constraint listing_photos_path_length check (char_length(storage_path) between 1 and 400)
);

create index if not exists listing_photos_listing_idx
  on public.listing_photos (listing_id, position);

/*
 * İLAN BAŞINA ÜST SINIR — TETİKLEYİCİYLE, ARAYÜZLE DEĞİL.
 *
 * Arayüzde sayılan bir sınır, API'ye doğrudan giden biri için yok
 * demektir; sekiz fotoğraflık sınırı olmayan bir ilan, depolamayı tek
 * başına doldurabilir. Sekiz sayısı ekipman ilanı için fazlasıyla
 * yeterli: genel görünüm, iki yan, odaklayıcı, ayna/mercek, aksesuar,
 * kutu ve fatura.
 */
create or replace function app.listing_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mevcut integer;
begin
  select count(*) into mevcut
    from public.listing_photos
   where listing_id = new.listing_id;

  if mevcut >= 8 then
    raise exception 'Bir ilana en fazla 8 fotoğraf eklenebilir.'
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists listing_photos_limit on public.listing_photos;
create trigger listing_photos_limit
  before insert on public.listing_photos
  for each row execute function app.listing_photo_limit();

-- ══════════════════════════════════════════════════════════════════════════
-- SATIR GÜVENLİĞİ
--
-- Fotoğrafın görünürlüğü İLANIN görünürlüğünü izliyor. Ayrı bir kural
-- yazmak, iki kuralın zamanla ayrışması demekti: ilan taslağa alındığında
-- fotoğrafları görünür kalırdı.
-- ══════════════════════════════════════════════════════════════════════════
alter table public.listing_photos enable row level security;

drop policy if exists listing_photos_read on public.listing_photos;
create policy listing_photos_read on public.listing_photos
  for select using (
    exists (
      select 1 from public.listings l
       where l.id = listing_photos.listing_id
         and (
           l.status in ('active', 'reserved', 'sold')
           or (select auth.uid()) = l.seller_id
           or app.is_admin()
           or app.has_role('moderator')
         )
    )
  );

drop policy if exists listing_photos_write_own on public.listing_photos;
create policy listing_photos_write_own on public.listing_photos
  for all to authenticated
  using (
    exists (
      select 1 from public.listings l
       where l.id = listing_photos.listing_id
         and l.seller_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.listings l
       where l.id = listing_photos.listing_id
         and l.seller_id = (select auth.uid())
    )
  );

drop policy if exists listing_photos_moderate on public.listing_photos;
create policy listing_photos_moderate on public.listing_photos
  for all to authenticated
  using (app.is_admin() or app.has_role('moderator'))
  with check (app.is_admin() or app.has_role('moderator'));

grant select on public.listing_photos to anon;
grant select, insert, update, delete on public.listing_photos to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- DEPOLAMA KOVASI
--
-- Fotoğraf kovasından AYRI: farklı boyut sınırı (ilan fotoğrafı bir
-- astrofotoğraf değil, 5 MB fazlasıyla yeter) ve farklı yaşam döngüsü
-- (ilan silinince fotoğrafları da gider).
--
-- ARŞİV KOPYASI YOK. Astrofotoğrafta ham dosya saklanıyor çünkü eser o;
-- ilan fotoğrafı bir kanıt belgesi ve gösterim kopyası bu iş için yeterli.
-- ══════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listings',
  'listings',
  true,
  5242880,                                   -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/*
 * Yolun ilk dilimi kullanıcı kimliği (`<user>/<listing>/<n>.jpg`), tıpkı
 * 0012'deki gibi: `storage.foldername(name)[1]` o dilimi veriyor ve
 * kullanıcı başkasının klasörüne yazamıyor.
 */
drop policy if exists listing_objects_read on storage.objects;
create policy listing_objects_read on storage.objects
  for select using (bucket_id = 'listings');

drop policy if exists listing_objects_insert on storage.objects;
create policy listing_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists listing_objects_update on storage.objects;
create policy listing_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listings'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or app.is_admin())
  );

drop policy if exists listing_objects_delete on storage.objects;
create policy listing_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listings'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
         or app.is_admin() or app.has_role('moderator'))
  );

-- 0015 — Yazar bağlantıları: kullanıcı üreten tablolardan profiles'a.
--
-- SORUN
-- Kullanıcı üreten her tablonun sahip kolonu `auth.users`a bakıyordu.
-- Doğru bir kısıt ama PostgREST'te bir sonucu var: `auth` şeması API'ye
-- açık değil, dolayısıyla
--
--     select=*,profiles(username, display_name)
--
-- gömülü sorgusu çözülemiyor. Fotoğrafı çeken kişinin adını göstermek
-- için ayrı bir sorgu atıp istemcide birleştirmek gerekiyordu: yirmi
-- fotoğraf için yirmi bir istek ve iki kaynağın ayrışma riski.
--
-- ÇÖZÜM
-- Aynı kolona ikinci bir yabancı anahtar: `profiles(id)`. `profiles.id`
-- zaten `auth.users(id)`ye 1:1 bağlı ve her kayıt `handle_new_user`
-- tetikleyicisiyle otomatik oluşuyor, yani yeni kısıt hiçbir eklemeyi
-- reddetmez. PostgREST artık ilişkiyi görüyor ve gömme tek istekte
-- çözülüyor.
--
-- Mevcut `auth.users` kısıtları KALDIRILMIYOR: kimlik doğrulama tarafının
-- bütünlüğünü onlar koruyor. İkisi aynı kolonda birlikte yaşıyor; ikisi
-- de CASCADE olduğu için kullanıcı silindiğinde sonuç aynı.
--
-- Kısıt adları açık: PostgREST iki yabancı anahtar arasında seçim
-- yaparken ipucu olarak kısıt adını kullanıyor
-- (`profiles!astro_photos_user_id_profiles_fkey(...)`).

begin;

alter table public.astro_photos
  add constraint astro_photos_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.photo_comments
  add constraint photo_comments_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.forum_threads
  add constraint forum_threads_author_id_profiles_fkey
  foreign key (author_id) references public.profiles (id) on delete cascade;

alter table public.forum_posts
  add constraint forum_posts_author_id_profiles_fkey
  foreign key (author_id) references public.profiles (id) on delete cascade;

alter table public.listings
  add constraint listings_seller_id_profiles_fkey
  foreign key (seller_id) references public.profiles (id) on delete cascade;

alter table public.site_reviews
  add constraint site_reviews_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

commit;

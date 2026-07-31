-- 0027_kota_5_30_ve_10mb.sql
-- Kota yeniden tanımı: standart 5 / premium 30 fotoğraf, foto başına 10 MB.
--
-- NEDEN DEĞİŞTİ
--
-- Eski kota (standart 3, premium 50) yalnızca SAYIYI sınırlıyordu; boyut
-- serbestti ve `photo-originals` bucket'ı dosya başına 100 MB kabul
-- ediyordu. Asıl maliyet oradaydı: tek bir premium kullanıcı 50 × 100 MB
-- = 5 GB yer tutabilirdi, yani Supabase Pro'nun 100 GB'ının yirmide biri.
-- Ölçülen gerçek şu: bir astro fotoğrafın gösterim kopyaları ~1.5 MB,
-- orijinali ise 30–100 MB — depolamanın %96'sı orijinallerde.
--
-- Yeni kural boyutu da bağlıyor ve bütçe hesaplanabilir hâle geliyor:
--
--   standart  5 × ~11.6 MB ≈  58 MB
--   premium  30 × ~11.6 MB ≈ 350 MB
--
-- 100 GB'lık Pro depolaması bu tavanlarla ~290 dolu premium üye ya da
-- ~1.700 dolu standart üye taşıyor; eski kuralda bu sayı 20 idi.
--
-- 10 MB BİR RET EŞİĞİ DEĞİL, HEDEF. İstemci daha büyük bir dosyayı
-- reddetmiyor, yükleme sırasında bu bütçeye indiriyor (çözünürlüğü
-- koruyarak, önce sıkıştırmayı artırarak). Bucket sınırı ise gerçek
-- tavan: tarayıcıyı atlayıp doğrudan depolama API'sine giden bir istek
-- ancak burada durur.
--
-- MEVCUT KAYITLARA DOKUNULMUYOR. Bu proje henüz sıfır fotoğraf taşıyor
-- (üretimde ölçüldü), ama kural olarak da doğrusu bu: kotayı daraltmak
-- kimsenin yayımlanmış fotoğrafını geriye dönük düşürmemeli. Tetikleyici
-- yalnızca YENİ yayına geçişte çalışıyor; sınırın üstünde kalan bir
-- kullanıcı yeni fotoğraf yayımlayamaz ama mevcutları yerinde kalır.

-- ══════════════════════════════════════════════════════════════════════════
-- FOTOĞRAF SAYISI
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.photo_limit(target_user uuid)
returns integer
language sql
stable
security definer set search_path = ''
as $fn$
  select case app.membership_tier(target_user)
    when 'premium' then 30
    else 5
  end;
$fn$;

comment on function app.photo_limit is
  'Kademeye göre aktif yayımlanmış fotoğraf sınırı: standart 5, premium 30 (§4.2).';

-- ══════════════════════════════════════════════════════════════════════════
-- DOSYA BOYUTU — ASIL TAVAN
--
-- `photo-originals` 100 MB'dan 10 MB'a iniyor. `photos` (genel kopyalar)
-- zaten 10 MB'dı ve değişmiyor; gösterim kopyası pratikte 2 MB'ı geçmiyor,
-- oradaki sınır bir güvenlik payı.
--
-- `on conflict` ile yazılıyor çünkü bucket 0012'de oluşturuldu ve bu dosya
-- yalnızca sınırı güncelliyor — bucket'ı yeniden yaratmaya kalkmak, içindeki
-- nesnelerle birlikte var olan bir kaydı çakıştırırdı.
-- ══════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photo-originals',
  'photo-originals',
  false,
  10485760,                                  -- 10 MB (§4.2)
  array['image/jpeg', 'image/png', 'image/tiff', 'image/webp']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

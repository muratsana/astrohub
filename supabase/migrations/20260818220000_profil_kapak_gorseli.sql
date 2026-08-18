-- ═══════════════════════════════════════════════════════════════════════
-- PROFİL KAPAK GÖRSELİ (E10)
--
-- Public profil sayfasının kimlik alanı yalnızca metindi: ad, kullanıcı
-- adı, birkaç sayı. Astrofotoğrafçının kendi karesini kimliğinin arkasına
-- koyabilmesi, bu sitede süs değil — profilin ne yaptığını bir bakışta
-- söyleyen tek şey.
--
-- ══════════════════════════════════════════════════════════════════════
-- NEDEN AYNI KOVA (`avatars`)
--
-- Kapak için ikinci bir kova açmak, ikinci bir politika seti, ikinci bir
-- boyut sınırı ve ikinci bir MIME listesi demekti — üçü de avatarınkiyle
-- birebir aynı olacaktı. `avatars` kovasının politikası zaten yolun ilk
-- klasörünü kullanıcı kimliğine bağlıyor
-- (`(storage.foldername(name))[1] = auth.uid()::text`), yani
-- `<uid>/banner-<zaman>.jpg` hiçbir ek kural olmadan doğru sahibe kilitli.
--
-- Dosya adı öneki ikisini ayırıyor; testi bu ayrımın kaybolmadığını
-- doğruluyor.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists banner_path text;

comment on column public.profiles.banner_path is
  'Public profil kapak görseli — `avatars` kovasında <uid>/banner-<zaman>.jpg. Avatar ile aynı kovada; ayrımı dosya adı öneki yapıyor.';

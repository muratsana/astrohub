-- ═══════════════════════════════════════════════════════════════════════
-- PROFİLE İLÇE ALANI
--
-- `profiles.city` var, `district` yoktu. Profil formu bu yüzden tek
-- kademeli kalmıştı: ilan, etkinlik, kulüp ve fotoğraf formları tek
-- arama kutusuna geçerken burası 81 illik bir açılır liste olarak kaldı.
--
-- ── NEDEN İSTEĞE BAĞLI KALIYOR ────────────────────────────────────────
-- Profil şehri bir "memleket" alanı, bir konum girişi değil. Kullanıcı
-- hiç doldurmayabilir ve alan zaten "Belirtilmedi" diye açılıyor.
-- Zorunlu yapmak, profilinin başka bir alanını düzenlemek isteyen
-- herkesten ilgisiz bir bilgi istemek olurdu.
--
-- İlçe de aynı sebeple isteğe bağlı — üstelik bir kademe daha isteğe
-- bağlı: ili yazan herkes ilçesini yazmak zorunda değil. Arama kutusu
-- "il geneli" seçeneğiyle bunu karşılıyor.
--
-- ── GİZLİLİK ──────────────────────────────────────────────────────────
-- Bu alan PROFİLDE HERKESE AÇIK. İlçe, ilden bir kademe daha ince ve
-- kullanıcı bunu bilerek seçiyor: alan boş bırakılabiliyor ve
-- bırakıldığında profilde hiçbir şey yazmıyor. Fotoğraf konumundan
-- farkı da bu — orada ilçe zorunlu çünkü çekim yerini tarif ediyor,
-- burada kullanıcının kendisini tarif ediyor.
--
-- Geri alma:
--   alter table public.profiles drop column if exists district;
-- ═══════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists district text;

comment on column public.profiles.district is
  'İlçe adı — `districts` kanonik yazımı. İsteğe bağlı; profilde '
  'herkese açık.';

-- 0033_astrometry_plate_solve.sql
-- Plate solve sağlayıcısı: astrometry.net (nova). Kendi sunucumuz yok.
--
-- ══════════════════════════════════════════════════════════════════════
-- NEDEN ASTAP DEĞİL
--
-- ASTAP'ın kendisi ve yıldız veritabanları ücretsiz ama YEREL BİR
-- İKİLİ: çalışması için işlemci ve birkaç GB disk taşıyan bir makine
-- gerekiyor. Vercel fonksiyonları yerel ikili çalıştırmıyor, Supabase
-- Edge Deno üzerinde koşuyor, bulut depolama (Drive vb.) alan verir
-- işlemci vermez.
--
-- Çözüm ANINDA olmak zorunda olmadığı için (fotoğraf yüklendikten bir
-- süre sonra çözülmesi yeterli) astrometry.net'in kuyruklu API'si tam
-- oturuyor: iş gönderiliyor, sonuç birkaç dakika içinde alınıyor. Ek
-- sunucu, aylık ücret ve bakım yok.
--
-- BEDELİ ŞU VE KULLANIM KOŞULLARINDA YAZIYOR: fotoğrafın orijinali
-- çözülmek üzere astrometry.net'e gidiyor. Kullanıcıya söylenmeden
-- yapılacak bir şey değil.

alter table public.astro_photos
  -- Hangi servis çözdü. Bugün tek değer var ama sağlayıcı değişirse
  -- eski kayıtların hangi ölçümle geldiği bilinmeli.
  add column if not exists solve_provider       text,
  -- astrometry.net iki kimlik veriyor: gönderim (subid) ve iş (jobid).
  -- Gönderim kuyruğa girer, iş ondan doğar; yoklama ikisini de izliyor.
  add column if not exists solve_submission_id  text,
  add column if not exists solve_job_id         text,
  add column if not exists solve_submitted_at   timestamptz;

comment on column public.astro_photos.solve_provider is
  'Çözümü yapan servis (bugün: astrometry.net). Sağlayıcı değişirse eski ölçümlerin kaynağı bilinmeli.';
comment on column public.astro_photos.solve_submission_id is
  'astrometry.net gönderim kimliği (subid). İş kimliği bundan doğuyor; yoklama ikisini de izliyor.';

/*
 * KUYRUKTAKİ İŞLER İÇİN İNDEKS.
 *
 * Yoklama beş dakikada bir "hangi kayıtlar bekliyor" diye soruyor.
 * Kısmi indeks bilinçli: tablo büyüdükçe çözülmüş kayıtlar indekste
 * yer kaplamasın — soru her zaman yalnızca bekleyenlerle ilgili.
 */
create index if not exists astro_photos_solve_pending_idx
  on public.astro_photos (solve_submitted_at)
  where solve_status = 'kuyrukta';

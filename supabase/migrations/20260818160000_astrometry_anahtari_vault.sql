-- ══════════════════════════════════════════════════════════════════════
-- ASTROMETRY ANAHTARI İÇİN VAULT KAPISI
--
-- `plate-solve` anahtarı `Deno.env.get('ASTROMETRY_API_KEY')` ile
-- okuyor ve bu STANDART yol olmaya devam ediyor. Ancak kenar fonksiyonu
-- sırrı yalnızca Dashboard'dan ya da `supabase secrets set` ile
-- yazılabiliyor; ikisi de tarayıcı oturumu istiyor.
--
-- Proje zaten aynı özelliğin iki sırrını Vault'ta tutuyor
-- (`plate_solve_poll_url`, `plate_solve_poll_secret`) ve pg_cron onları
-- oradan okuyor. Bu fonksiyon aynı deseni üçüncü sır için açıyor.
--
-- ── SIRA ÖNEMLİ: ENV ÖNCE ───────────────────────────────────────────
--
-- Fonksiyon önce ortam değişkenine bakıyor, yoksa buraya düşüyor.
-- Tersi olsaydı Dashboard'dan girilen anahtar sessizce yok sayılır ve
-- "anahtarı değiştirdim ama eskisi kullanılıyor" gibi bulunması zor bir
-- durum çıkardı.
--
-- ── NEDEN SIKI YETKİ ────────────────────────────────────────────────
--
-- `vault.decrypted_secrets` PostgREST'e açık değil ve açılmamalı. Bu
-- `security definer` fonksiyon tek bir sırrı okuyor ve YALNIZCA
-- `service_role` çağırabiliyor: `authenticated` role verilseydi, oturum
-- açan herkes anahtarı okuyabilirdi.
--
-- Fonksiyon adı sırrı da söylemiyor; hangi sırrı okuduğu gövdede sabit,
-- yani parametreyle başka bir sır çekilemiyor.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.astrometry_anahtari()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.decrypted_secret
    from vault.decrypted_secrets s
   where s.name = 'astrometry_api_key'
   limit 1;
$$;

comment on function public.astrometry_anahtari() is
  'astrometry.net API anahtarı — yalnızca service_role okuyabilir. Env değişkeni tanımlıysa kenar fonksiyonu onu tercih eder.';

revoke all on function public.astrometry_anahtari() from public, anon, authenticated;
grant execute on function public.astrometry_anahtari() to service_role;

-- ── SIRRIN KENDİSİ BU DOSYADA YOK ───────────────────────────────────
--
-- Migration yalnızca OKUMA KAPISINI açıyor. Anahtarın değeri sürüm
-- kontrolüne girmemeli; taze bir ortamda şu satırla yazılır:
--
--   select vault.create_secret('<anahtar>', 'astrometry_api_key',
--                              'astrometry.net API anahtarı');
--
-- Tercih edilen yol hâlâ kenar fonksiyonu sırrı:
--   supabase secrets set ASTROMETRY_API_KEY=<anahtar>

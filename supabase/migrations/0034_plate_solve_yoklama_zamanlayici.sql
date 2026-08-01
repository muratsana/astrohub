-- ════════════════════════════════════════════════════════════════════════════
-- 0034 — PLATE SOLVE YOKLAMA ZAMANLAYICISI
--
-- ══════════════════════════════════════════════════════════════════════════
-- BU DOSYA SONRADAN YENİDEN YAZILDI (2026-08-01)
--
-- Göç uzak veritabanının geçmişinde vardı (`20260731140452`) ama DOSYASI
-- DEPODA YOKTU: `0033`ten `0035`e atlıyordu ve silindiğine dair bir commit
-- de yoktu — hiç işlenmemiş.
--
-- Sonucu sessiz ama ağır: sıfırdan kurulan bir projede (`db push`) cron
-- işi HİÇ OLUŞMAZDI. Plate solve kuyruğu dolar, `kuyrukta` durumundaki
-- fotoğraflar sonsuza dek orada kalırdı — hata vermeden, çünkü kimse
-- yoklamıyor. Üretimde çalıştığı için de fark edilmezdi.
--
-- İçerik canlı veritabanından okunarak yeniden kuruldu: `cron.job`
-- tablosundaki komut, `vault.secrets`teki iki gizli anahtar adı ve
-- eklentilerin gerçek şemaları (`pg_net` → `extensions`).
--
-- T-201 "migration hizalaması" turu dosya SAYISINI karşılaştırmıştı;
-- karşılaştırılması gereken şey uzak GEÇMİŞ ile dosya listesiydi.
-- ══════════════════════════════════════════════════════════════════════════
--
-- NEDEN CRON, NEDEN WEBHOOK DEĞİL
--
-- astrometry.net işi kuyruğa alıp saniyeler ya da dakikalar sonra
-- bitiriyor ve geri arama (webhook) sunmuyor. Tek yol yoklamak. Beş
-- dakika, kullanıcının "çözülüyor" rozetine bakarken sabrını taşırmayan
-- ama sağlayıcıyı da dövmeyen aralık.
--
-- GİZLİ ANAHTARLAR VAULT'TA, GÖÇTE DEĞİL. Edge Function adresi ve paylaşılan
-- sır `vault.secrets` içinde duruyor; buraya yazılsalardı depo geçmişine
-- düşerlerdi. Bu yüzden bu göç sırları OLUŞTURMUYOR — yalnızca okuyor.
-- Kurulum adımı `docs/YAYIN.md`de.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

/*
 * Aynı adlı iş varsa önce sökülüyor: `cron.schedule` aynı adı ikinci kez
 * kabul ediyor ve iki kopya iki kez yoklama demek olurdu.
 */
do $$
begin
  if exists (select 1 from cron.job where jobname = 'plate-solve-yoklama') then
    perform cron.unschedule('plate-solve-yoklama');
  end if;
end $$;

/*
 * SIRLAR YOKKEN İŞ KURULMUYOR. `net.http_post` boş adrese çağrı yapıp her
 * beş dakikada bir hata kaydı üretirdi; kurulumu yarım bırakan bir geliştirici
 * için bu, sebebi belirsiz bir gürültü olurdu.
 */
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'plate_solve_poll_url') then
    raise notice 'plate_solve_poll_url gizli anahtarı yok — cron işi kurulmadı (bkz. docs/YAYIN.md).';
    return;
  end if;

  perform cron.schedule(
    'plate-solve-yoklama',
    '*/5 * * * *',
    $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
             where name = 'plate_solve_poll_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-poll-secret', (select decrypted_secret from vault.decrypted_secrets
                         where name = 'plate_solve_poll_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $job$
  );
end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 3 KALANI — HAVA SERVİSİ SEÇİMİ YÖNETİLEBİLİR OLSUN (§3.4)
--
-- §3.4'ün sağlayıcı tablosunda tek bir `NOT_STARTED` satır kalmıştı:
-- "sağlayıcı seçiminin admin ayarından değişmesi". Gerekçe de yazılıydı —
-- `site_settings` tablosu yoktu. Tablo Faz 10'da (`0058`) geldi; bu göç o
-- satırı kapatıyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- YENİ TABLO YOK, YENİ SÜTUN YOK
--
-- `app_settings` zaten anahtar/değer taşıyor ve `set_app_setting` RPC'si
-- değişiklik geçmişini (§13.3) kendiliğinden yazıyor. Bu ayar için ayrı
-- bir sütun ya da tablo açmak, aynı işi ikinci bir mekanizmayla yapmak
-- olurdu. Anahtar biçim kısıtı (`^[a-z0-9_]{3,60}$`) `weather_provider`ı
-- zaten kabul ediyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- İKİ SEÇENEK VAR, ÜÇ DEĞİL
--
--   `auto`       → meteoblue yapılandırılmışsa bulut ve yer koşulları
--                  ondan; düşerse Open-Meteo. Bugünkü davranış.
--   `open-meteo` → meteoblue HİÇ ÇAĞRILMIYOR. Hem maliyet kararı
--                  (anahtar kredili) hem arıza kaçış yolu.
--
-- "Yalnızca meteoblue" seçeneği BİLEREK YOK. Open-Meteo her koşulda
-- çağrılıyor (seeing hesabı üst atmosfer rüzgârını yalnızca ondan
-- alabiliyor), yani `open-meteo` seçmek paneli boş bırakmıyor. Tersi
-- tehlikeliydi: vekil düşerse ayar yüzünden hiçbir ziyaretçi hava verisi
-- göremez ve düzeltmenin tek yolu panele girmek olurdu.
--
-- TOHUM YALNIZCA SATIR YOKSA yazılıyor: yönetici tercihini değiştirdikten
-- sonra göç yeniden çalışırsa (yeni ortam, restore) kararı geri almamalı.
-- ══════════════════════════════════════════════════════════════════════════

insert into public.app_settings (key, value)
select 'weather_provider', '{"saglayici": "auto"}'::jsonb
 where not exists (
   select 1 from public.app_settings where key = 'weather_provider'
 );

-- ── Ölçüm ────────────────────────────────────────────────────────────────
do $$
declare
  deger text;
begin
  select value ->> 'saglayici' into deger
    from public.app_settings where key = 'weather_provider';

  if deger is null then
    raise exception '0068 ölçümü: `weather_provider` satırı yazılmadı.';
  end if;

  /* Kodda karşılığı olmayan bir değer, istemcide sessizce varsayılana
     düşer — ama tabloda durması yönetici için kafa karıştırıcı olurdu. */
  if deger not in ('auto', 'open-meteo') then
    raise exception '0068 ölçümü: tanımsız sağlayıcı değeri %.', deger;
  end if;

  raise notice '0068 ölçümü geçti: hava sağlayıcısı ayarı "%".', deger;
end $$;

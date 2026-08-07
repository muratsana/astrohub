-- ═══════════════════════════════════════════════════════════════════════
-- KATALOG YETKİSİ: DOĞRUDAN VERİTABANI BAĞLANTISI
--
-- Bu göç canlıya `20260807055619` olarak UYGULANMIŞTI ama depoda dosyası
-- yoktu. Yani `supabase/migrations` klasöründen sıfırdan kurulan bir
-- ortam, canlıdan farklı davranırdı: bakım işleri (katalog içe aktarma,
-- kompendiyum birleştirme) doğrudan bağlantıdan çalışmazdı. Kayıt
-- buraya, gerekçesiyle birlikte alınıyor.
--
-- ── SORUN ─────────────────────────────────────────────────────────────
--
-- `app.katalog_yetkili()` iki dal tanıyordu: yönetici JWT'si ya da
-- servis anahtarı. İkisi de PostgREST üzerinden gelen istekler.
--
-- Katalog içe aktarma ise bir BAKIM İŞİ ve doğrudan veritabanı
-- bağlantısından çalıştırılıyor (SQL konsolu, göç aracı, bakım
-- betiği). O bağlantıda `request.jwt.claims` HİÇ AYARLANMIYOR — bir
-- HTTP isteği yok ki iddia olsun. Fonksiyon bu yüzden bakımın kendisini
-- reddediyordu: `imm_birlestir` çağrısı "Yetki yok" ile düşüyordu.
--
-- ── NEDEN GÜVENLİK AÇMIYOR ────────────────────────────────────────────
--
-- Eklenen dal "iddia HİÇ YOKSA" diyor, "iddia boşsa" değil. Aradaki
-- fark belirleyici:
--
--   · PostgREST HER istekte iddiayı ayarlıyor — oturumsuz bir ziyaretçide
--     bile `role: "anon"` yazıyor. Yani istemciden gelen hiçbir istek bu
--     dala giremiyor.
--   · İddianın hiç olmaması yalnızca doğrudan bağlantıda mümkün. O
--     bağlantı zaten tablolara doğrudan yazabiliyor; fonksiyondan
--     reddetmek bir yetki eklemiyor, yalnızca bakımı imkânsız kılıyor.
--
-- Geri alma: `20260807090000_katalog_ice_aktarma.sql` içindeki iki dallı
-- sürümü yeniden çalıştırmak yeterli.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function app.katalog_yetkili()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    app.is_admin()
    or coalesce(
         nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
         ''
       ) = 'service_role'
    /* JWT iddiası HİÇ YOKSA istek PostgREST'ten gelmiyor demektir:
       doğrudan veritabanı bağlantısı (bakım betiği, SQL konsolu, göç
       aracı). Başlıktaki gerekçe. */
    or current_setting('request.jwt.claims', true) is null
    or current_setting('request.jwt.claims', true) = '';
$$;

comment on function app.katalog_yetkili() is
  'Katalog içe aktarma yetkisi: yönetici JWT''si, servis anahtarı ya da '
  'doğrudan veritabanı bağlantısı (bakım).';

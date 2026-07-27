-- 0003_grant_hardening.sql
-- Tablo yetkilerinin sıkılaştırılması — RLS'in altını dolduran katman.
--
-- NEDEN GEREKLİ
-- Supabase varsayılan olarak `public` şemasındaki her tabloya `anon` ve
-- `authenticated` rolleri için TÜM yetkileri verir. RLS satır düzeyinde kapıyı
-- tutar, ama iki boşluk açık kalır:
--
--   1. TRUNCATE, RLS'e TABİ DEĞİLDİR. PostgreSQL satır politikalarını yalnızca
--      SELECT / INSERT / UPDATE / DELETE için uygular. TRUNCATE'te tek kontrol
--      tablo yetkisidir — yetki duruyorsa RLS açıkken bile tablo boşaltılabilir.
--   2. `anon` rolünün hiçbir tabloda yazma ihtiyacı yok. Yetkiyi hiç vermemek,
--      "politika nasılsa engeller" varsayımından güvenlidir.
--
-- Bu yüzden istemci rollerinden önce her şey alınır, sonra yalnızca gerçekten
-- gereken yetkiler geri verilir. Satır düzeyi kararı yine RLS'e aittir.

revoke all on public.profiles                  from anon, authenticated;
revoke all on public.user_roles                from anon, authenticated;
revoke all on public.memberships               from anon, authenticated;
revoke all on public.billing_transactions      from anon, authenticated;
revoke all on public.notification_preferences  from anon, authenticated;
revoke all on public.push_subscriptions        from anon, authenticated;
revoke all on public.account_deletion_requests from anon, authenticated;
revoke all on public.account_export_logs       from anon, authenticated;

-- anon: yalnızca herkese açık profilleri okur (profiles_select_all).
grant select on public.profiles to anon;

-- authenticated: DML yetkisi açık, satır kapısı RLS'te.
grant select, insert, update, delete on public.profiles                  to authenticated;
grant select, insert, update, delete on public.user_roles                to authenticated;
grant select, insert, update, delete on public.memberships               to authenticated;
grant select, insert, update, delete on public.billing_transactions      to authenticated;
grant select, insert, update, delete on public.notification_preferences  to authenticated;
grant select, insert, update, delete on public.push_subscriptions        to authenticated;
grant select, insert, update, delete on public.account_deletion_requests to authenticated;
grant select, insert, update, delete on public.account_export_logs       to authenticated;

-- Bundan sonra açılacak tablolar da TRUNCATE/REFERENCES/TRIGGER yetkisiyle
-- doğmasın; her migration'da tek tek geri almak zorunda kalınmasın.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;

-- ── PostGIS referans tablosu (kapatılamayan boşluk) ───────────────────────
-- public.spatial_ref_sys `supabase_admin` rolüne aittir. Bu yüzden:
--   · RLS açılamaz (tablo sahibi değiliz),
--   · yetkiler geri alınamaz — REVOKE yalnızca kendi verdiğin izinleri
--     kaldırır, buradaki izinleri `supabase_admin` vermiştir. `postgres`
--     rolüyle çalışan bir REVOKE hata vermeden HİÇBİR ŞEY yapmaz.
--
-- Sonuç: `anon` rolü bu tabloya hâlâ yazabilir. Kapsam koordinat sistemi
-- tanımlarıdır (EPSG kataloğu) — kişisel veri yoktur; kötüye kullanım en
-- fazla ST_Transform sonuçlarını bozar ve tablo PostGIS'ten yeniden
-- doldurulabilir. Supabase üzerindeki her PostGIS projesi bu durumdadır.
--
-- Yapılabilecek tek gerçek çözüm, tabloyu PostgREST'in açtığı şemadan
-- çıkarmaktır; bu da eklentiyi `public` dışına taşımayı gerektirir ve
-- `profiles.username citext` gibi mevcut tip referanslarını kırar.
--
-- Bilinçli olarak kabul edilmiştir. Aşağıdaki satır etkisizdir, bu yüzden
-- yazılmamıştır:
--   revoke all on public.spatial_ref_sys from anon;   -- ← sessizce no-op

-- ── Tetikleyici fonksiyonunun search_path'i ───────────────────────────────
-- Değiştirilebilir search_path ile, fonksiyonu tetikleyen rolün yoluna sahte
-- bir şema koyup içerideki çağrıları gölgelemek mümkündür. Boş search_path
-- bunu kapatır; fonksiyon yalnızca şema-nitelikli adları görür.
create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

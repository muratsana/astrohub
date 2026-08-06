-- ═══════════════════════════════════════════════════════════════════════
-- POSTGIS KATALOĞU YAZMAYA KAPATILIYOR
--
-- BULGU (docs/DISCOVERY_REPORT.md §3.3 — ölçüldü, varsayım değil):
-- `public.spatial_ref_sys` üzerinde RLS kapalı VE `anon` rolüne
-- INSERT/UPDATE/DELETE/TRUNCATE verilmiş. Sitenin anon anahtarıyla
-- PostgREST'e atılan istekler kabul ediliyordu:
--
--   PATCH  /rest/v1/spatial_ref_sys?srid=eq.-1   → HTTP 204
--   DELETE /rest/v1/spatial_ref_sys?srid=eq.-1   → HTTP 204
--
-- Filtresiz bir DELETE 8.500 satırlık koordinat referans kataloğunu
-- boşaltırdı. Uygulama bunun üzerine hata vermez — mesafe ve konum
-- sorguları YANLIŞ SONUÇ verir, ki bu daha kötüdür.
--
-- ── NEDEN `REVOKE` DEĞİL ───────────────────────────────────────────────
-- Denendi ve İŞE YARAMADI. Yetkileri veren rol `supabase_admin`; bizim
-- bağlantımız `postgres` ve `postgres` bu rolün üyesi değil
-- (`pg_has_role('postgres','supabase_admin','MEMBER') = false`).
-- PostgreSQL'de bir yetkiyi yalnızca onu veren rol geri alabilir, o
-- yüzden `revoke ... from anon` sessizce hiçbir şey yapmıyor: komut
-- başarıyla döner, `information_schema.role_table_grants` aynı kalır.
--
-- Aynı sebeple `alter table ... enable row level security` de olmuyor:
-- tablo `postgis` eklentisine ait ve sahibi `supabase_admin`.
--
-- ── ELİMİZDEKİ YOL: İFADE DÜZEYİNDE TETİKLEYİCİ ────────────────────────
-- Tetikleyici oluşturmak için tablo sahipliği değil, tablo üzerinde
-- TRIGGER yetkisi yeterli — `postgres`ta o yetki var. Tetikleyici yazma
-- girişimini veritabanında, PostgREST'ten önce reddediyor.
--
-- AYRICALIKLI ROLLER MUAF. `supabase_admin` ve `postgres` yazabilmeye
-- devam ediyor; muafiyet olmasaydı PostGIS eklenti güncellemeleri
-- (`ALTER EXTENSION postgis UPDATE`) bu tetikleyiciye takılırdı — sistem
-- tablosuna kural koyarken asıl risk budur.
--
-- `service_role` MUAF DEĞİL: sunucu tarafı işlerimizin hiçbiri bu
-- kataloğa yazmıyor ve yazmamalı. Muaf tutmak, sızan bir servis
-- anahtarının bu kapıyı da açması demekti.
--
-- TRUNCATE de kapsanıyor: satır tetikleyicileri TRUNCATE'i görmez, o
-- yüzden tetikleyici İFADE düzeyinde (`FOR EACH STATEMENT`) ve TRUNCATE
-- olayı ayrıca listeleniyor.
--
-- ── DOĞRULAMA (uygulama sonrası, anon anahtarla) ───────────────────────
--   SELECT → 200 · INSERT/UPDATE/DELETE → 401 (42501)
--   PostGIS çalışıyor: Ankara–İstanbul 339.9 km, katalog 8.500 satır
--
-- ── KALICI ÇÖZÜM (Murat'ın yapması gereken) ────────────────────────────
-- Bu tetikleyici doğru ama ideal değil; ideali yetkiyi hiç vermemek.
-- Supabase destek talebiyle ya da `postgres` rolüne `supabase_admin`
-- üyeliği verilerek şu çalıştırılmalı:
--
--   revoke insert, update, delete, truncate
--     on public.spatial_ref_sys from anon, authenticated;
--
-- O yapıldığında bu tetikleyici gereksizleşir ve düşürülebilir.
--
-- Geri alma:
--   drop trigger if exists spatial_ref_sys_readonly on public.spatial_ref_sys;
--   drop function if exists app.reject_spatial_ref_sys_write();
-- ═══════════════════════════════════════════════════════════════════════

create or replace function app.reject_spatial_ref_sys_write()
returns trigger
language plpgsql
as $$
begin
  /* Eklenti bakımını yapan roller geçer; PostgREST'in anon/authenticated
     rolleri geçmez. `session_user` ve `current_user` birlikte kontrol
     ediliyor çünkü PostgREST istek başına `set local role` yapıyor —
     ikisine birden bakmak rol değişimiyle atlamayı imkânsız kılıyor. */
  if session_user in ('supabase_admin', 'postgres')
     or current_user in ('supabase_admin', 'postgres') then
    return null;
  end if;

  raise exception
    'spatial_ref_sys salt okunurdur: % islemi reddedildi', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

comment on function app.reject_spatial_ref_sys_write() is
  'PostGIS koordinat katalogua anon/authenticated yazmasini engeller. '
  'Yetki REVOKE edilemiyor (tablo sahibi supabase_admin); ayrinti '
  'migration 20260806160000 basliginda.';

drop trigger if exists spatial_ref_sys_readonly on public.spatial_ref_sys;

create trigger spatial_ref_sys_readonly
  before insert or update or delete or truncate
  on public.spatial_ref_sys
  for each statement
  execute function app.reject_spatial_ref_sys_write();

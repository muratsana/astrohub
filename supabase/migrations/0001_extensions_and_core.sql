-- 0001_extensions_and_core.sql
-- Astrohub — uzantılar ve çekirdek yardımcılar (plan §12.4).
-- Temiz başlangıç şeması; StageHub migration mirası taşınmaz.

-- ── Uzantılar ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";     -- gen_random_uuid()
create extension if not exists "citext";        -- büyük/küçük harf duyarsız metin
create extension if not exists "pg_trgm";       -- fuzzy arama (§11.4)
create extension if not exists "postgis";       -- coğrafi veri (§9.3)

-- ── Ortak şema ───────────────────────────────────────────────────────────
-- Uygulama yardımcıları için ayrı şema; public'i sade tutar.
create schema if not exists app;

-- ── updated_at otomatik güncelleme tetikleyicisi ─────────────────────────
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function app.set_updated_at() is
  'updated_at kolonunu satır güncellemesinde now() yapar. BEFORE UPDATE tetikleyicilerinde kullanılır.';

-- ── Rol yardımcıları (RLS için) ──────────────────────────────────────────
-- Uygulama rolleri. Üyelik planından AYRIDIR (§4.4): rol bir yetkidir.
create type app.app_role as enum (
  'member',            -- tek ücretli üyelik sahibi
  'verified_organizer',-- etkinlik yayımlama yetkisi
  'club_manager',      -- kurumsal profil yönetimi
  'content_editor',    -- makale/hedef/etkinlik düzenleme
  'moderator',         -- yorum/fotoğraf/ilan/rapor inceleme
  'admin'              -- sistem ve yetki yönetimi
);

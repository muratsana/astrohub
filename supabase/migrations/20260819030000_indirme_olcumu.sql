-- ═══════════════════════════════════════════════════════════════════════
-- İNDİRME / EXPORT KULLANIM ÖLÇÜMÜ (X06)
--
-- Hangi çıktının ne sıklıkla indirildiği (fotoğraf, alan çözümlü, paylaşım
-- görseli, künye, orijinal) üründe hiçbir yerde ölçülmüyordu. Bu tablo
-- her indirme/export'u bir satır olarak topluyor; yorum değil sayı.
--
-- ══════════════════════════════════════════════════════════════════════
-- GİZLİLİK
--
-- Kullanıcı kimliği YAZILMIYOR — ölçülen şey "ne indirildi", "kim indirdi"
-- değil. Oturum açmış kullanıcı için bile yalnızca fotoğraf ve tür
-- kaydediliyor; bu bir kullanım sayacı, bir izleme değil.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.download_events (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid references public.astro_photos (id) on delete set null,
  -- 'foto' | 'annotated' | 'original' | 'caption' | 'feed' | 'story' | 'zip'
  kind       text not null,
  created_at timestamptz not null default now(),
  constraint download_events_kind_ok check (char_length(kind) between 1 and 32)
);

create index if not exists download_events_photo_idx
  on public.download_events (photo_id, created_at);
create index if not exists download_events_kind_idx
  on public.download_events (kind, created_at);

alter table public.download_events enable row level security;

-- Herkes (anon dahil) sayaç EKLEYEBİLİR: indirme herkese açık bir eylem.
-- Kimlik yazılmadığından bu bir sızıntı değil, yalnızca bir artış.
drop policy if exists download_events_insert on public.download_events;
create policy download_events_insert on public.download_events
  for insert to anon, authenticated
  with check (kind is not null);

-- Okumak yalnızca yöneticiye: ham sayaç ürün ekibinin, ziyaretçinin değil.
drop policy if exists download_events_read on public.download_events;
create policy download_events_read on public.download_events
  for select using (app.is_admin());

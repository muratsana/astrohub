-- ═══════════════════════════════════════════════════════════════════════
-- ASSET TÜREV REGISTRY (X01) VE TÜREV TTL (X05)
--
-- ══════════════════════════════════════════════════════════════════════
-- NEDEN BİR KAYIT DEFTERİ
--
-- Türevler (display, thumb, feed, story) depoya yazılıyor ama hangisinin
-- hangi girdiden üretildiği hiçbir yerde yazmıyordu. Bir türevin güncel
-- olup olmadığı dosya adına bakılarak tahmin ediliyor, temizlik ise
-- yalnızca "referans var mı" sorusuna indirgeniyordu.
--
-- Registry üç soruyu cevaplıyor:
--   · Bu fotoğrafın hangi türevleri var, nerede?
--   · Hangi girdiden üretildi (`content_key`) — yeniden üretmeye gerek
--     var mı? (Kart kadrajında bu, kadraj damgası.)
--   · Ne zamana kadar durmalı (`expires_at`)? Yeniden üretilebilen bir
--     türev sonsuza kadar yer kaplamamalı (X05).
--
-- ══════════════════════════════════════════════════════════════════════
-- TTL SİLME EMRİ DEĞİL, İZİN
--
-- Süresi dolmuş bir türev hâlâ REFERANSLIYSA silinmiyor: satır güncel
-- `thumb_path`e işaret ediyorsa o dosya canlıdır. Süre "artık
-- gerekmiyor" değil "yeniden üretilebilir" demek. `expires_at` null olan
-- türev kalıcıdır — display ve thumb böyle.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.asset_derivatives (
  id          uuid primary key default gen_random_uuid(),
  photo_id    uuid not null references public.astro_photos (id) on delete cascade,
  -- 'display' | 'thumb' | 'feed' | 'story' | 'annotated'
  kind        text not null,
  bucket      text not null default 'photos',
  storage_path text not null,
  -- Üretimi belirleyen girdi (kadraj damgası, içerik sürümü).
  content_key text,
  bytes       bigint,
  width       integer,
  height      integer,
  created_at  timestamptz not null default now(),
  -- Dolduğunda GC silebilir (X05). null = kalıcı.
  expires_at  timestamptz,
  constraint asset_derivatives_kind_ok check (char_length(kind) between 1 and 32),
  constraint asset_derivatives_path_ok check (char_length(storage_path) between 1 and 400)
);

-- Aynı yol iki kez kaydedilmesin: üretim idempotent, kayıt da öyle.
create unique index if not exists asset_derivatives_path_uk
  on public.asset_derivatives (bucket, storage_path);
create index if not exists asset_derivatives_photo_idx
  on public.asset_derivatives (photo_id, kind);
create index if not exists asset_derivatives_expiry_idx
  on public.asset_derivatives (expires_at)
  where expires_at is not null;

alter table public.asset_derivatives enable row level security;

/* Görünürlük fotoğrafı izliyor — `photo_exposures` ile aynı kural. */
drop policy if exists asset_derivatives_read on public.asset_derivatives;
create policy asset_derivatives_read on public.asset_derivatives
  for select using (
    exists (
      select 1 from public.astro_photos p
      where p.id = asset_derivatives.photo_id
        and (
          app.icerik_gorunur(p.status::text, p.deleted_at)
          or p.user_id = (select auth.uid())
          or app.is_admin()
          or app.has_role('moderator')
        )
    )
  );

drop policy if exists asset_derivatives_write_own on public.asset_derivatives;
create policy asset_derivatives_write_own on public.asset_derivatives
  for all to authenticated
  using (
    exists (
      select 1 from public.astro_photos p
      where p.id = asset_derivatives.photo_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.astro_photos p
      where p.id = asset_derivatives.photo_id and p.user_id = (select auth.uid())
    )
  );

grant select on public.asset_derivatives to anon, authenticated;
grant insert, update, delete on public.asset_derivatives to authenticated;

comment on table public.asset_derivatives is
  'Fotoğraf türevlerinin kaydı (X01): hangi türev nerede, hangi girdiden '
  'üretildi, ne zaman süresi doluyor. Süresi dolan ve artık referanslı '
  'olmayan türevleri yaşam döngüsü temizliği topluyor (X05).';

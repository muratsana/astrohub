-- ═══════════════════════════════════════════════════════════════════════
-- ÇEKİM OTURUMLARI (SEZONLAR)
--
-- Astrofotoğraf çoğu zaman tek gecede bitmiyor: aynı hedef haftalar,
-- bazen aylar boyunca farklı gecelerde toplanıp tek karede birleşiyor.
-- `astro_photos.captured_at` tek bir gün tutuyordu; kullanıcı "14 gece
-- topladım" ya da "12–18 Ocak arası" diyemiyordu (C02–C04).
--
-- Bu migration her fotoğrafa birden çok OTURUM ekliyor. Her oturum bir
-- başlangıç günü, isteğe bağlı bir bitiş günü taşır: bitiş yoksa tek
-- gece, varsa aralık. Pozlama satırları bir oturuma bağlanabiliyor (C05).
--
-- ══════════════════════════════════════════════════════════════════════
-- GERİYE DÖNÜK UYUM
--
-- `captured_at` KALIYOR. Galeri yılı, sıralama ve sezon bilmeyen okuma
-- yolları o alanı okuyor; uygulama yeni kayıtta onu en erken oturum
-- gününe eşitliyor. Eski kayıtlar tek bir örtük oturum gibi okunuyor —
-- yani bu tablo boşsa fotoğraf yine tek `captured_at` tarihiyle çalışır.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.photo_capture_sessions (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid not null references public.astro_photos (id) on delete cascade,
  -- Saatsiz gün: gece boyu poz için saat anlamsız, zaman-dilimi karmaşası
  -- getirirdi.
  starts_on  date not null,
  -- Bitiş yoksa oturum tek gece; doluysa aralık (uçlar dahil).
  ends_on    date,
  position   integer not null default 0,
  constraint photo_capture_sessions_range_ok
    check (ends_on is null or ends_on >= starts_on)
);

create index if not exists photo_capture_sessions_photo_idx
  on public.photo_capture_sessions (photo_id, position);

-- Pozlama satırı bir oturuma bağlanabilir (C05). Oturum silinirse bağ
-- kopar ama pozlama kaydı durur (set null) — "hangi geceden" bilgisi
-- kaybolur ama toplam entegrasyon korunur.
alter table public.photo_exposures
  add column if not exists session_id uuid
    references public.photo_capture_sessions (id) on delete set null;

create index if not exists photo_exposures_session_idx
  on public.photo_exposures (session_id);

-- ══════════════════════════════════════════════════════════════════════
-- RLS — oturum, fotoğrafın görünürlüğünü izler (photo_exposures ile aynı)
-- ══════════════════════════════════════════════════════════════════════
alter table public.photo_capture_sessions enable row level security;

/*
 * GÖRÜNÜRLÜK `app.icerik_gorunur` İLE — ham enum karşılaştırmasıyla değil.
 *
 * `astro_photos.status` artık `app.content_status` (Türkçe değerler:
 * taslak/yayinda/arsivlendi…). Politikayı `p.status = 'published'` diye
 * yazmak canlıda "invalid input value for enum" ile düşüyordu. Ortak
 * yardımcı hem doğru değerleri hem soft-delete'i (deleted_at) biliyor;
 * `photo_exposures` politikaları da bunu kullanıyor — aynı kaydın iki
 * alt tablosu farklı görünürlük kuralı taşımamalı.
 */
drop policy if exists photo_capture_sessions_read on public.photo_capture_sessions;
create policy photo_capture_sessions_read on public.photo_capture_sessions
  for select using (
    exists (
      select 1 from public.astro_photos p
      where p.id = photo_capture_sessions.photo_id
        and (
          app.icerik_gorunur(p.status::text, p.deleted_at)
          or p.user_id = (select auth.uid())
          or app.is_admin()
          or app.has_role('moderator')
        )
    )
  );

drop policy if exists photo_capture_sessions_write_own on public.photo_capture_sessions;
create policy photo_capture_sessions_write_own on public.photo_capture_sessions
  for all to authenticated
  using (
    exists (
      select 1 from public.astro_photos p
      where p.id = photo_capture_sessions.photo_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.astro_photos p
      where p.id = photo_capture_sessions.photo_id
        and p.user_id = (select auth.uid())
    )
  );

/* PostgREST bu tabloyu okuyabilsin; RLS zaten satır düzeyini kısıtlıyor. */
grant select on public.photo_capture_sessions to anon, authenticated;
grant insert, update, delete on public.photo_capture_sessions to authenticated;

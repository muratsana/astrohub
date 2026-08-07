-- ═══════════════════════════════════════════════════════════════════════
-- SOFT DELETE TEMELİ   (Yenileme planı FAZ 3, görev 2-3-4)
--
-- FAZ 3 iki ayrı iş içeriyor ve bu göç YALNIZCA BİRİNCİSİNİ yapıyor:
--
--   A. Soft delete: silme kolonları, merkezî görünürlük filtresi,
--      kalıcı silmenin admine kilitlenmesi.          ← BU GÖÇ
--   B. Ortak durum kümesi: beş ayrı enum'un tek sekiz değerli kümeye
--      dönüştürülmesi.                                ← SONRAKİ GÖÇ
--
-- Ayrılmalarının sebebi risk: (A) hiçbir mevcut değere dokunmuyor ve tek
-- başına doğrulanabiliyor. (B) yirmi dört politika, yirmi bir fonksiyon
-- ve otuz beş arayüz dosyasını ilgilendiriyor. İkisini tek göçe koymak,
-- bir şey ters gittiğinde hangisinin sorumlu olduğunu belirsizleştirirdi.
--
-- ── ORTAK KÜMEDE BİR SORUN VAR, ÇÖZÜMÜ (B)'YE HAZIRLANIYOR ────────────
--
-- Plan şu sekiz değeri istiyor: taslak, incelemede, onaylandi, yayinda,
-- reddedildi, arsivlendi, yayindan_kaldirildi, silindi. Hepsi YAYIN
-- ekseninde. Ama bugünkü kolonlarda yayın durumu olmayan üç değer var:
--
--   events.cancelled     — iptal edilmiş etkinlik yayından KALKMAZ;
--                          kullanıcının iptali görmesi gerekir.
--   listings.reserved    — rezerve ilan görünür kalır.
--   listings.sold        — satılmış ilan da görünür kalır; pazaryeri
--                          mantığı bu.
--
-- Üçünü de `arsivlendi`ye eşlemek bu içerikleri public'ten düşürürdü —
-- yani veri kaybı değil, DAVRANIŞ kaybı. (B) göçünde bu değerler ayrı
-- birer alan kolonuna taşınacak ve yayın kolonu yalnızca yayın eksenini
-- yönetecek.
--
-- Bu göç o karara hazırlık yapıyor: `app.icerik_gorunur()` bugünkü
-- "public görünür" kümesini TEK BİR YERE topluyor. (B) geldiğinde
-- değişecek tek şey bu fonksiyonun gövdesi — politikalar değil.
--
-- Geri alma: eklenen kolonlar düşürülür, politikalar bu dosyanın
-- başındaki hâllerine döndürülür (git geçmişinde duruyor).
-- ═══════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.venue_events') is not null
     or to_regclass('public.studio_profiles') is not null then
    raise exception
      'YANLIŞ PROJE: venue_events/studio_profiles görüldü — burası StageHub. Göç durduruldu.';
  end if;
end
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · SİLME VE ARŞİV KOLONLARI
--
-- Altı içerik tablosu. `moderation_queue` bilerek YOK: onun `status`
-- kolonu bambaşka bir eksen (inceleme iş akışı) ve bir kuyruk kaydı
-- "yayında" olmaz. `memberships`, `billing_transactions`,
-- `account_deletion_requests` de aynı sebeple dışarıda.
--
-- `deleted_by` var ama `archived_by` YOK: arşivleme geri alınabilir ve
-- rutin bir işlem; silme öyle değil, kimin sildiği sorulacak bir soru.
-- İhtiyaç doğarsa eklenir — şimdiden eklemek, doldurulmayan bir kolon
-- demekti.
-- ══════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  foreach t in array array[
    'astro_photos', 'events', 'listings',
    'observing_sites', 'clubs', 'content_entries'
  ]
  loop
    execute format(
      'alter table public.%I
         add column if not exists deleted_at  timestamptz,
         add column if not exists deleted_by  uuid references auth.users (id) on delete set null,
         add column if not exists archived_at timestamptz', t);

    execute format(
      'comment on column public.%I.deleted_at is
         ''Soft delete. Dolu ise kayıt public sorgularda görünmez ama veritabanında durur.''', t);

    /* Kısmi indeks: public sorguların tamamı `deleted_at is null`
       koşuluyla geliyor ve bu indeks yalnızca yaşayan satırları
       taşıyor — silinmiş kayıtlar indeksi şişirmiyor. */
    execute format(
      'create index if not exists %I on public.%I (deleted_at) where deleted_at is null',
      t || '_yasayanlar_idx', t);
  end loop;
end
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 2 · MERKEZÎ GÖRÜNÜRLÜK FİLTRESİ (plan görev 3)
--
-- Plan: "Bunu her sorguya elle yazmak yerine view ya da RLS ile
-- merkezileştirin — elle yazılan filtre er geç unutulur."
--
-- View DEĞİL, fonksiyon + RLS seçildi. Gerekçe: view kurmak her tablo
-- için ikinci bir okuma yüzeyi demekti ve istemcinin hangisini
-- çağıracağı bir konvansiyona kalırdı — unutulan filtre sorunu, bu kez
-- "yanlış view" biçiminde geri gelirdi. RLS'te ise kaçış yok: politika
-- tabloya bağlı, istemci ne sorarsa sorsun aynı filtreden geçiyor.
--
-- ── ALLOWLIST, DENYLIST DEĞİL ─────────────────────────────────────────
--
-- Görünür değerler tek tek sayılıyor. Denylist (gizli olanları say)
-- daha kısa olurdu ama yeni bir durum değeri eklendiğinde varsayılan
-- GÖRÜNÜR olurdu — taslak bir içeriğin kazara public'e çıkması, bir
-- yayının kazara gizlenmesinden çok daha pahalı bir hata.
--
-- ── GEÇİCİ ÜYELER ─────────────────────────────────────────────────────
--
-- `cancelled`, `reserved`, `sold` bu listede çünkü BUGÜN public'te
-- görünüyorlar ve görünmeye devam etmeleri gerekiyor. (B) göçünde
-- yayın kolonundan çıkıp kendi alan kolonlarına taşınacaklar; o zaman
-- bu liste tek bir değere iner: 'yayinda'.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.icerik_gorunur(durum text, silinme timestamptz)
returns boolean
language sql
immutable
as $$
  select silinme is null and durum in (
    /* yayın ekseni — (B) göçünden sonra geriye yalnızca 'yayinda' kalacak */
    'published',   -- astro_photos, events, observing_sites, clubs, podcasts
    'active',      -- listings
    'yayinda',     -- content_entries (zaten Türkçe)
    /* alan ekseni — (B) göçünde kendi kolonlarına taşınacaklar */
    'cancelled',   -- iptal edilmiş etkinlik görünür kalmalı
    'reserved',    -- rezerve ilan görünür kalmalı
    'sold'         -- satılmış ilan görünür kalmalı
  );
$$;

comment on function app.icerik_gorunur(text, timestamptz) is
  'İçerik public''te görünür mü: silinmemiş VE yayın durumunda. Tek doğruluk kaynağı — public SELECT politikalarının hepsi bunu çağırır.';

grant execute on function app.icerik_gorunur(text, timestamptz) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 3 · OKUMA POLİTİKALARI FİLTREYE BAĞLANIYOR
--
-- Her politikanın sahip/yönetim kaçışları AYNEN korunuyor; değişen tek
-- şey "public görünür" kısmının artık tek bir fonksiyondan gelmesi.
-- Böylece silinmiş içerik altı tabloda birden, tek satır değiştirilerek
-- gizlendi.
-- ══════════════════════════════════════════════════════════════════════

drop policy if exists astro_photos_read on public.astro_photos;
create policy astro_photos_read on public.astro_photos
  for select using (
    app.icerik_gorunur(status::text, deleted_at)
    or (select auth.uid()) = user_id
    or app.is_admin()
    or app.has_role('moderator')
  );

/* Etkinlikte eski koşul `status <> 'draft'` idi — yani taslak DIŞINDAKİ
   her şey görünürdü. Allowlist'e geçmek burada davranışı daraltıyor ve
   bu kasıtlı: ileride eklenecek bir durum değeri sessizce public'e
   çıkmasın. Bugün görünen iki değer (published, cancelled) listede. */
drop policy if exists events_read on public.events;
create policy events_read on public.events
  for select using (
    app.icerik_gorunur(status::text, deleted_at)
    or (select auth.uid()) = organizer_id
    or app.is_admin()
    or app.has_role('content_editor')
    or app.has_role('moderator')
  );

drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings
  for select using (
    app.icerik_gorunur(status::text, deleted_at)
    or (select auth.uid()) = seller_id
    or app.is_admin()
    or app.has_role('moderator')
  );

drop policy if exists observing_sites_read on public.observing_sites;
create policy observing_sites_read on public.observing_sites
  for select using (
    app.icerik_gorunur(status::text, deleted_at)
    or (select auth.uid()) = submitted_by
    or app.is_admin()
    or app.has_role('moderator')
    or app.has_role('content_editor')
  );

/* `listed` korunuyor: topluluk dizininde görünme, yayın durumundan ayrı
   bir yönetim kararı (0067). İkisi birlikte aranıyor. */
drop policy if exists clubs_read on public.clubs;
create policy clubs_read on public.clubs
  for select using (
    (listed and app.icerik_gorunur(status, deleted_at))
    or app.is_admin()
    or submitted_by = (select auth.uid())
  );

drop policy if exists content_entries_read on public.content_entries;
create policy content_entries_read on public.content_entries
  for select using (
    app.icerik_gorunur(status, deleted_at)
    or app.is_admin()
  );

-- ══════════════════════════════════════════════════════════════════════
-- 4 · KALICI SİLME YALNIZCA ADMİN (plan görev 4)
--
-- Kabul kriteri: "Moderatör kalıcı silme çağrısını RLS ile reddediyor."
--
-- ── NEDEN RESTRICTIVE POLİTİKA ────────────────────────────────────────
--
-- PostgreSQL'de permissive politikalar OR'lanıyor. Bugün DELETE'e izin
-- veren dört ayrı yol var: `astro_photos_moderate` (admin VEYA
-- moderatör), `listings_moderate`, `listings_write_own` (sahibi),
-- `observing_sites_editor` (editör dahil), `clubs_write`,
-- `content_entries_write`. Bunların her birini tek tek daraltmak altı
-- ayrı politikayı yeniden yazmak ve birini atlamak demekti.
--
-- RESTRICTIVE politika ise permissive'lerle AND'leniyor: ne kadar yol
-- olursa olsun hepsi bu kapıdan geçmek zorunda. Tek kural, altı tablo.
--
-- ── SAHİBİN SİLMESİ NE OLDU ───────────────────────────────────────────
--
-- Artık soft delete. Kullanıcı kendi içeriğini `deleted_at` yazarak
-- kaldırıyor (UPDATE politikaları buna zaten izin veriyor); satır
-- veritabanında duruyor ve admin geri alabiliyor. Planın istediği de bu:
-- "Silinen içerik public'te görünmüyor ama veritabanında duruyor."
--
-- `astro_photos_delete_own` bu yüzden düşürülüyor: restrictive kapı
-- yüzünden hiçbir zaman etki edemeyecek bir politikayı bırakmak,
-- okuyana "sahibi silebiliyor" yalanını söylerdi.
-- ══════════════════════════════════════════════════════════════════════

drop policy if exists astro_photos_delete_own on public.astro_photos;

do $$
declare
  t text;
begin
  foreach t in array array[
    'astro_photos', 'events', 'listings',
    'observing_sites', 'clubs', 'content_entries'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_hard_delete_admin', t);
    execute format(
      'create policy %I on public.%I as restrictive for delete using (app.is_admin())',
      t || '_hard_delete_admin', t);
  end loop;
end
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 5 · SİLEN KİM — İSTEMCİYE SORULMUYOR
--
-- `deleted_by`yi istemcinin yazmasına bırakmak, onu istemcinin
-- DOLDURDUĞU bir alan yapardı: yanlış kimlik yazan bir istek denetim
-- kaydını doğrudan zehirlerdi. Tetikleyici `auth.uid()` ile kendisi
-- yazıyor.
--
-- Aynı tetikleyici denetim kaydını da düşürüyor: soft delete bir silme
-- işlemi ve §0.6 "istisnasız" diyor. Geri alma da kayda geçiyor —
-- silinmiş bir içeriğin geri gelmesi de sorulabilecek bir soru.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.icerik_silme_izi()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  /* Silindi */
  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_by := auth.uid();

    insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'content.soft_delete', tg_table_name, new.id::text,
            jsonb_build_object('durum', new.status::text));

  /* Geri alındı */
  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;

    insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'content.restore', tg_table_name, new.id::text,
            jsonb_build_object('durum', new.status::text));
  end if;

  return new;
end;
$$;

comment on function app.icerik_silme_izi() is
  'Soft delete ve geri alma işlemlerinde deleted_by''yi auth.uid() ile yazar ve audit_logs''a kayıt düşer.';

do $$
declare
  t text;
begin
  foreach t in array array[
    'astro_photos', 'events', 'listings',
    'observing_sites', 'clubs', 'content_entries'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_silme_izi', t);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function app.icerik_silme_izi()',
      t || '_silme_izi', t);
  end loop;
end
$$;

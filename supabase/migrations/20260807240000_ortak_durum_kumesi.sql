-- ═══════════════════════════════════════════════════════════════════════
-- ORTAK DURUM KÜMESİ   (Yenileme planı FAZ 3, görev 1 ve 6)
--
-- Beş ayrı enum ve iki serbest metin kolonu tek bir kümeye iniyor:
--
--   app.photo_status    (draft, published, archived)
--   app.event_status    (draft, published, cancelled)
--   app.listing_status  (draft, active, reserved, sold, archived)
--   app.site_status     (pending, published, rejected)
--   clubs.status        (text: pending, published, rejected)
--   content_entries     (text: taslak, yayinda)
--                                        ↓
--   app.content_status  (taslak, incelemede, onaylandi, yayinda,
--                        reddedildi, arsivlendi, yayindan_kaldirildi,
--                        silindi)
--
-- Plan §FAZ 3 dikkat notu: "eşleme tablosu yazın ve tek seferlik
-- dönüştürün; iki kümeyi bir arada yaşatmayın." Eşleme her tablonun
-- kendi bölümünde, `using` ifadesinin içinde açıkça yazılı.
--
-- ══════════════════════════════════════════════════════════════════════
-- ÜÇ DEĞER BU KÜMEYE GİRMİYOR — YAYIN DURUMU DEĞİLLER
-- ══════════════════════════════════════════════════════════════════════
--
-- `cancelled`, `reserved` ve `sold` yayın yaşam döngüsünün parçası değil.
-- Üçü de public'te GÖRÜNMEYE DEVAM ETMESİ gereken içerikler:
--
--   • İptal edilmiş etkinlik yayından kalkmaz — kullanıcının iptali
--     görmesi gerekir. `event_change_fanout` zaten iptal bildirimi
--     gönderiyor; bildirimi alıp sayfayı bulamamak anlamsız olurdu.
--   • Rezerve ve satılmış ilan pazaryerinde durur. Satılan ilanı
--     gizlemek, fiyat geçmişini ve satıcının sicilini yok etmek demek.
--
-- Üçünü de `arsivlendi`ye eşlemek veri kaybı değil DAVRANIŞ kaybı
-- olurdu: kayıt yerinde durur, kullanıcı bir daha göremezdi.
--
-- Bu yüzden ayrı birer ALAN kolonuna taşınıyorlar:
--   events.cancelled_at   timestamptz  (null = iptal edilmemiş)
--   listings.sale_state   text         (satilik | rezerve | satildi)
--
-- Sonuç: `status` yalnızca "bu kayıt yayında mı" sorusunu cevaplıyor,
-- `cancelled_at` ve `sale_state` ise "durumu ne" sorusunu. İki soru,
-- iki kolon.
--
-- ══════════════════════════════════════════════════════════════════════
-- KAPSAM DIŞI: app.publish_status (podcasts, podcast_episodes)
-- ══════════════════════════════════════════════════════════════════════
--
-- Podcast tabloları bu göçe alınmadı ve bu kasıtlı: FAZ 3/A'da soft
-- delete kolonları da onlara eklenmemişti. Radyo/TV modülünün kendi fazı
-- var (FAZ 10) ve o modül henüz canlı değil (iki tablo da boş). Bugün
-- dönüştürmek, dört fonksiyonluk ek yüzeyi hiçbir kullanıcıya fayda
-- sağlamadan riske atmak olurdu. FAZ 10'da aynı desenle dönüşecek.
--
-- ══════════════════════════════════════════════════════════════════════
-- ESKİ ENUM TİPLERİ DÜŞÜRÜLMÜYOR
-- ══════════════════════════════════════════════════════════════════════
--
-- `photo_status`, `event_status`, `listing_status`, `site_status` bu
-- göçten sonra hiçbir kolonda kullanılmıyor ama tipler duruyor. Sebep:
-- düşürmek geri alınamaz ve bir yerde kaldıklarını göç yazarken
-- göremediğim bir bağımlılık ortaya çıkarsa geri dönüş yolu kalmıyor.
-- Kullanılmadıkları doğrulandıktan sonra ayrı ve küçük bir göçle
-- düşürülebilirler.
--
-- Geri alma: bu dosya geri alınamaz sayılmalı. `alter type` ile yapılan
-- dönüşüm veriyi yerinde değiştiriyor; geri dönüş eski enum'ları ve ters
-- eşlemeyi uygulayan yeni bir göç yazmayı gerektirir.
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
-- 1 · ORTAK KÜME
-- ══════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'app' and t.typname = 'content_status') then
    create type app.content_status as enum (
      'taslak',              -- yazılıyor, sahibinden başkası görmüyor
      'incelemede',          -- gönderildi, moderasyon bekliyor
      'onaylandi',           -- onaylandı ama henüz yayımlanmadı
      'yayinda',             -- PUBLIC'TE GÖRÜNEN TEK DEĞER
      'reddedildi',          -- moderasyon reddetti, gerekçe sahibinde
      'arsivlendi',          -- süresi doldu ya da sahibi kaldırdı
      'yayindan_kaldirildi', -- yönetim kaldırdı (arşivden farkı: karar)
      'silindi'              -- durum olarak silme; deleted_at ile birlikte
    );
  end if;
end
$$;

comment on type app.content_status is
  'Bütün içerik tablolarının ortak yayın durumu kümesi. Public''te yalnızca ''yayinda'' görünür (app.icerik_gorunur).';

-- ══════════════════════════════════════════════════════════════════════
-- 2 · ALAN KOLONLARI — yayın ekseninden ayrılanlar
-- ══════════════════════════════════════════════════════════════════════

alter table public.events
  add column if not exists cancelled_at timestamptz;

comment on column public.events.cancelled_at is
  'İptal anı. NULL = iptal edilmemiş. Yayın durumundan AYRI: iptal edilmiş etkinlik yayında kalır ki kullanıcı iptali görebilsin.';

alter table public.listings
  add column if not exists sale_state text not null default 'satilik';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_sale_state_check') then
    alter table public.listings
      add constraint listings_sale_state_check
      check (sale_state in ('satilik', 'rezerve', 'satildi'));
  end if;
end
$$;

comment on column public.listings.sale_state is
  'Satış durumu. Yayın durumundan AYRI: satılmış ilan da yayında kalır — fiyat geçmişi ve satıcı sicili orada.';

-- ══════════════════════════════════════════════════════════════════════
-- 3 · TABLO TABLO DÖNÜŞÜM
--
-- Her bölüm kendi içinde tam: bağımlı politika ve kısıtlar düşürülüyor,
-- kolon dönüştürülüyor, sonra hepsi yeni değerlerle geri kuruluyor.
-- Bölümlerin ayrı olması, bir şey ters gittiğinde hangi tablonun
-- sorumlu olduğunu belirsiz bırakmıyor.
-- ══════════════════════════════════════════════════════════════════════

-- ── 3.-1 KISMİ İNDEKS YÜKLEMLERİ ──────────────────────────────────────
--
-- Dört kısmi indeksin `where` yüklemi eski enum tipini TİPİYLE BİRLİKTE
-- taşıyor (`status = 'published'::app.photo_status`). Kolon tipi
-- değişince yüklem `app.content_status = app.photo_status` karşılaştırması
-- hâline geliyor ve böyle bir operatör yok:
--
--   ERROR 42883: operator does not exist:
--                app.content_status = app.photo_status
--
-- Bu göç ilk denemede tam olarak burada düştü. Yüklemler ifadenin içine
-- gömüldüğü için `alter type` onları kendiliğinden çeviremiyor; düşürüp
-- yeni değerle geri kurmak gerekiyor.
--
-- `listings_active_idx` yeniden kurulurken KAPSAMI GENİŞLİYOR: eskiden
-- yalnızca `active` satırları taşıyordu, şimdi rezerve ve satılmış
-- ilanlar da `yayinda` olduğu için onlar da indekste. Doğrusu bu — ilan
-- listesi üçünü birden gösteriyor.
-- ══════════════════════════════════════════════════════════════════════

drop index if exists public.astro_photos_published_idx;
drop index if exists public.events_starts_idx;
drop index if exists public.listings_active_idx;
drop index if exists public.observing_sites_bortle_idx;

-- ── 3.0 UYDU TABLOLARIN POLİTİKALARI ──────────────────────────────────
--
-- Yorum, poz, puan, sürüm, oturum, ilan fotoğrafı, saha ölçümü ve
-- değerlendirmesi — hepsi "ebeveyni görünüyor mu" sorusunu kendi
-- politikalarında SORUYOR ve o soru ebeveynin `status` kolonuna
-- dayanıyor. PostgreSQL bu bağımlılığı takip ettiği için kolon tipini
-- değiştirmeden önce düşürülmeleri gerekiyor.
--
-- ── DÜŞÜP AYNEN GERİ GELMİYORLAR: BİR AÇIK KAPANIYOR ──────────────────
--
-- Bu politikaların hiçbiri ebeveynin `deleted_at` alanına BAKMIYOR.
-- FAZ 3/A soft delete'i kurdu ama yalnızca ana tabloların kendi okuma
-- politikalarına bağladı; uydu tablolar dışarıda kalmıştı. Sonuç:
-- silinmiş bir fotoğrafın yorumları, pozları ve sürümleri hâlâ
-- okunabiliyordu — fotoğraf gitmiş, altındaki tartışma duruyordu.
--
-- Geri kurulurken hepsi `app.icerik_gorunur()` çağırıyor; o fonksiyon
-- zaten iki koşulu birlikte soruyor.
-- ══════════════════════════════════════════════════════════════════════

drop policy if exists event_changes_read      on public.event_changes;
drop policy if exists event_sessions_read     on public.event_sessions;
drop policy if exists listing_photos_read     on public.listing_photos;
drop policy if exists photo_comments_read     on public.photo_comments;
drop policy if exists photo_comments_insert_own on public.photo_comments;
drop policy if exists photo_exposures_read    on public.photo_exposures;
drop policy if exists photo_ratings_insert_own on public.photo_ratings;
drop policy if exists photo_versions_read     on public.photo_versions;
drop policy if exists site_measurements_read  on public.site_measurements;
drop policy if exists site_reviews_read       on public.site_reviews;

-- ── 3.1 astro_photos ──────────────────────────────────────────────────
drop policy if exists astro_photos_read on public.astro_photos;

alter table public.astro_photos
  drop constraint if exists astro_photos_publish_needs_image,
  drop constraint if exists astro_photos_publish_requires_copyright,
  drop constraint if exists astro_photos_publish_requires_date;

alter table public.astro_photos alter column status drop default;
alter table public.astro_photos
  alter column status type app.content_status
  using (case status::text
           when 'draft'     then 'taslak'
           when 'published' then 'yayinda'
           when 'archived'  then 'arsivlendi'
         end)::app.content_status;
alter table public.astro_photos alter column status set default 'taslak';

alter table public.astro_photos
  add constraint astro_photos_publish_needs_image
    check (status <> 'yayinda' or display_path is not null),
  add constraint astro_photos_publish_requires_copyright
    check (status <> 'yayinda' or copyright_confirmed),
  add constraint astro_photos_publish_requires_date
    check (status <> 'yayinda' or published_at is not null);

create policy astro_photos_read on public.astro_photos
  for select using (
    app.icerik_gorunur(status::text, deleted_at)
    or (select auth.uid()) = user_id
    or app.is_admin()
    or app.has_role('moderator')
  );

-- ── 3.2 events ────────────────────────────────────────────────────────
drop policy if exists events_read on public.events;
drop policy if exists events_delete_contributor on public.events;
drop policy if exists events_insert_contributor on public.events;
drop policy if exists events_update_contributor on public.events;

/* İptal önce alan kolonuna taşınıyor — kolon tipi değişmeden ÖNCE,
   çünkü dönüşümden sonra 'cancelled' değeri artık okunamaz. */
update public.events
   set cancelled_at = coalesce(cancelled_at, now())
 where status::text = 'cancelled';

alter table public.events alter column status drop default;
alter table public.events
  alter column status type app.content_status
  using (case status::text
           when 'draft'     then 'taslak'
           when 'published' then 'yayinda'
           /* İptal artık cancelled_at'te; etkinliğin kendisi YAYINDA
              kalıyor ki takip edenler iptali görebilsin. */
           when 'cancelled' then 'yayinda'
         end)::app.content_status;
alter table public.events alter column status set default 'taslak';

create policy events_read on public.events
  for select using (
    app.icerik_gorunur(status::text, deleted_at)
    or (select auth.uid()) = organizer_id
    or app.is_admin()
    or app.has_role('content_editor')
    or app.has_role('moderator')
  );

create policy events_delete_contributor on public.events
  for delete using (
    app.is_admin()
    or app.has_role('content_editor')
    or (organizer_id = (select auth.uid()) and status = 'taslak')
  );

create policy events_insert_contributor on public.events
  for insert with check (
    app.is_admin()
    or app.has_role('content_editor')
    or (
      organizer_id = (select auth.uid())
      and (app.has_role('verified_organizer') or status = 'taslak')
      and app.is_account_active()
    )
  );

create policy events_update_contributor on public.events
  for update
  using (
    app.is_admin()
    or app.has_role('content_editor')
    or (
      organizer_id = (select auth.uid())
      and (app.has_role('verified_organizer') or status = 'taslak')
    )
  )
  with check (
    app.is_admin()
    or app.has_role('content_editor')
    or (
      organizer_id = (select auth.uid())
      and (app.has_role('verified_organizer') or status = 'taslak')
    )
  );

-- ── 3.3 listings ──────────────────────────────────────────────────────
drop policy if exists listings_read on public.listings;

alter table public.listings
  drop constraint if exists listings_active_needs_date;

/* Satış durumu önce alan kolonuna taşınıyor. */
update public.listings
   set sale_state = case status::text
                      when 'reserved' then 'rezerve'
                      when 'sold'     then 'satildi'
                      else 'satilik'
                    end;

alter table public.listings alter column status drop default;
alter table public.listings
  alter column status type app.content_status
  using (case status::text
           when 'draft'    then 'taslak'
           when 'active'   then 'yayinda'
           /* Rezerve ve satılmış ilan YAYINDA kalıyor; satış durumu
              artık sale_state kolonunda. */
           when 'reserved' then 'yayinda'
           when 'sold'     then 'yayinda'
           when 'archived' then 'arsivlendi'
         end)::app.content_status;
alter table public.listings alter column status set default 'taslak';

alter table public.listings
  add constraint listings_active_needs_date
    check (status <> 'yayinda' or posted_at is not null);

create policy listings_read on public.listings
  for select using (
    app.icerik_gorunur(status::text, deleted_at)
    or (select auth.uid()) = seller_id
    or app.is_admin()
    or app.has_role('moderator')
  );

-- ── 3.4 observing_sites ───────────────────────────────────────────────
drop policy if exists observing_sites_read on public.observing_sites;
drop policy if exists observing_sites_submit on public.observing_sites;
drop policy if exists observing_sites_update_own on public.observing_sites;

alter table public.observing_sites alter column status drop default;
alter table public.observing_sites
  alter column status type app.content_status
  using (case status::text
           when 'pending'   then 'incelemede'
           when 'published' then 'yayinda'
           when 'rejected'  then 'reddedildi'
         end)::app.content_status;
alter table public.observing_sites alter column status set default 'incelemede';

create policy observing_sites_read on public.observing_sites
  for select using (
    app.icerik_gorunur(status::text, deleted_at)
    or (select auth.uid()) = submitted_by
    or app.is_admin()
    or app.has_role('moderator')
    or app.has_role('content_editor')
  );

create policy observing_sites_submit on public.observing_sites
  for insert with check (
    (select auth.uid()) = submitted_by and status = 'incelemede'
  );

create policy observing_sites_update_own on public.observing_sites
  for update
  using ((select auth.uid()) = submitted_by and status = 'incelemede')
  with check ((select auth.uid()) = submitted_by and status = 'incelemede');

-- ── 3.5 clubs ─────────────────────────────────────────────────────────
drop policy if exists clubs_read on public.clubs;
drop policy if exists clubs_submit_pending on public.clubs;

alter table public.clubs drop constraint if exists clubs_status_check;

alter table public.clubs alter column status drop default;
alter table public.clubs
  alter column status type app.content_status
  using (case status
           when 'pending'   then 'incelemede'
           when 'published' then 'yayinda'
           when 'rejected'  then 'reddedildi'
         end)::app.content_status;
alter table public.clubs alter column status set default 'incelemede';

create policy clubs_read on public.clubs
  for select using (
    (listed and app.icerik_gorunur(status::text, deleted_at))
    or app.is_admin()
    or submitted_by = (select auth.uid())
  );

create policy clubs_submit_pending on public.clubs
  for insert with check (
    submitted_by = (select auth.uid())
    and status = 'incelemede'
    and listed = false
    and verified_at is null
    and verified_by is null
    and reviewed_at is null
    and reviewed_by is null
    and not exists (
      select 1 from unnest(clubs.photo_paths) p(path)
       where split_part(p.path, '/', 1) <> ((select auth.uid()))::text
    )
    and app.is_account_active()
  );

-- ── 3.6 content_entries ───────────────────────────────────────────────
drop policy if exists content_entries_read on public.content_entries;

alter table public.content_entries drop constraint if exists content_entries_status_check;

alter table public.content_entries alter column status drop default;
alter table public.content_entries
  alter column status type app.content_status
  using (case status
           when 'taslak'  then 'taslak'
           when 'yayinda' then 'yayinda'
         end)::app.content_status;
alter table public.content_entries alter column status set default 'taslak';

create policy content_entries_read on public.content_entries
  for select using (
    app.icerik_gorunur(status::text, deleted_at)
    or app.is_admin()
  );

-- ── 3.7 UYDU POLİTİKALARI GERİ KURULUYOR ──────────────────────────────
--
-- Hepsi `app.icerik_gorunur()` üzerinden soruyor: ebeveyn hem yayında
-- hem silinmemiş olmalı. Sahip ve yönetim kaçışları aynen korundu.
-- ══════════════════════════════════════════════════════════════════════

create policy event_changes_read on public.event_changes
  for select using (
    exists (
      select 1 from public.events e
       where e.id = event_changes.event_id
         and (app.icerik_gorunur(e.status::text, e.deleted_at)
              or e.organizer_id = (select auth.uid())
              or app.is_admin())
    )
  );

create policy event_sessions_read on public.event_sessions
  for select using (
    exists (
      select 1 from public.events e
       where e.id = event_sessions.event_id
         and (app.icerik_gorunur(e.status::text, e.deleted_at)
              or e.organizer_id = (select auth.uid())
              or app.is_admin()
              or app.has_role('content_editor'))
    )
  );

create policy listing_photos_read on public.listing_photos
  for select using (
    exists (
      select 1 from public.listings l
       where l.id = listing_photos.listing_id
         and (app.icerik_gorunur(l.status::text, l.deleted_at)
              or (select auth.uid()) = l.seller_id
              or app.is_admin()
              or app.has_role('moderator'))
    )
  );

create policy photo_comments_read on public.photo_comments
  for select using (
    exists (
      select 1 from public.astro_photos p
       where p.id = photo_comments.photo_id
         and (app.icerik_gorunur(p.status::text, p.deleted_at)
              or p.user_id = (select auth.uid())
              or app.is_admin()
              or app.has_role('moderator'))
    )
  );

create policy photo_comments_insert_own on public.photo_comments
  for insert with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.astro_photos p
       where p.id = photo_comments.photo_id
         and app.icerik_gorunur(p.status::text, p.deleted_at)
    )
    and app.is_account_active()
  );

create policy photo_exposures_read on public.photo_exposures
  for select using (
    exists (
      select 1 from public.astro_photos p
       where p.id = photo_exposures.photo_id
         and (app.icerik_gorunur(p.status::text, p.deleted_at)
              or p.user_id = (select auth.uid())
              or app.is_admin()
              or app.has_role('moderator'))
    )
  );

create policy photo_ratings_insert_own on public.photo_ratings
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.astro_photos p
       where p.id = photo_ratings.photo_id
         and app.icerik_gorunur(p.status::text, p.deleted_at)
         and p.user_id <> (select auth.uid())
    )
    and app.is_account_active()
  );

create policy photo_versions_read on public.photo_versions
  for select using (
    exists (
      select 1 from public.astro_photos p
       where p.id = photo_versions.photo_id
         and (app.icerik_gorunur(p.status::text, p.deleted_at)
              or p.user_id = (select auth.uid())
              or app.is_admin()
              or app.has_role('moderator'))
    )
  );

create policy site_measurements_read on public.site_measurements
  for select using (
    exists (
      select 1 from public.observing_sites s
       where s.id = site_measurements.site_id
         and app.icerik_gorunur(s.status::text, s.deleted_at)
    )
    or app.is_admin()
    or app.has_role('content_editor')
  );

create policy site_reviews_read on public.site_reviews
  for select using (
    exists (
      select 1 from public.observing_sites s
       where s.id = site_reviews.site_id
         and app.icerik_gorunur(s.status::text, s.deleted_at)
    )
    or (select auth.uid()) = user_id
    or app.is_admin()
    or app.has_role('moderator')
  );

-- ── 3.8 KISMİ İNDEKSLER YENİ DEĞERLERLE GERİ KURULUYOR ────────────────

create index if not exists astro_photos_published_idx
  on public.astro_photos (status, published_at desc)
  where status = 'yayinda';

create index if not exists events_starts_idx
  on public.events (starts_at)
  where status = 'yayinda';

create index if not exists listings_active_idx
  on public.listings (status, posted_at desc)
  where status = 'yayinda';

create index if not exists observing_sites_bortle_idx
  on public.observing_sites (bortle)
  where status = 'yayinda';

-- ══════════════════════════════════════════════════════════════════════
-- 4 · GÖRÜNÜRLÜK FİLTRESİ TEK DEĞERE İNİYOR
--
-- FAZ 3/A'da bu liste altı değer taşıyordu ve yorumunda "(B) göçünden
-- sonra geriye yalnızca 'yayinda' kalacak" yazıyordu. O an geldi.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.icerik_gorunur(durum text, silinme timestamptz)
returns boolean
language sql
immutable
as $$
  select silinme is null and durum = 'yayinda';
$$;

comment on function app.icerik_gorunur(text, timestamptz) is
  'İçerik public''te görünür mü: silinmemiş VE yayında. Tek doğruluk kaynağı — public SELECT politikalarının hepsi bunu çağırır.';

-- ══════════════════════════════════════════════════════════════════════
-- 5 · ESKİ DEĞERLERİ OKUYAN FONKSİYONLAR
--
-- Bunlar `alter type` tarafından yakalanmıyor: plpgsql gövdeleri çalışma
-- anında çözülüyor, yani göç sessizce geçer ve hata ilk çağrıda çıkardı.
-- Tek tek elden geçirildi.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.active_photo_count(target_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from public.astro_photos
   where user_id = target_user
     and status = 'yayinda'
     and deleted_at is null;
$$;

create or replace function app.enforce_photo_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  limit_count   integer;
  current_count integer;
  tier          text;
begin
  if new.status <> 'yayinda' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'yayinda' then return new; end if;

  perform pg_advisory_xact_lock(hashtext('foto_kota:' || new.user_id::text));

  select app.photo_limit(new.user_id) into limit_count;
  select app.membership_tier(new.user_id) into tier;
  select app.active_photo_count(new.user_id) into current_count;

  if current_count >= limit_count then
    raise exception
      'Aktif fotoğraf kotası dolu (% / %, % üyelik). Yeni fotoğraf yayımlamak için mevcut bir kaydı arşivleyin.',
      current_count, limit_count, tier
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create or replace function app.queue_event_contribution()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  queue_id uuid;
begin
  if new.status <> 'taslak'
     or new.organizer_id is null
     or app.is_admin()
     or app.has_role('content_editor')
     or app.has_role('verified_organizer') then
    return new;
  end if;

  select id into queue_id
    from public.moderation_queue
   where target_type = 'event'
     and target_id = new.id::text
     and status in ('pending', 'in_review', 'escalated')
   limit 1;

  if queue_id is null then
    insert into public.moderation_queue (
      target_type, target_id, target_path, reason, reported_by, note
    )
    values (
      'event', new.id::text, '/etkinlik/' || new.slug, 'diger', new.organizer_id,
      'Kullanıcı etkinlik taslağı açtı; yayına alınmadan önce admin onayı gerekir.'
    )
    returning id into queue_id;
  end if;

  perform app.notify_admins(
    'Yeni etkinlik onay bekliyor', new.title, '/admin/moderation', 'moderation', queue_id
  );

  return new;
end $$;

create or replace function app.queue_site_contribution()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  queue_id uuid;
begin
  if new.status <> 'incelemede'
     or new.submitted_by is null
     or app.is_admin()
     or app.has_role('moderator')
     or app.has_role('content_editor') then
    return new;
  end if;

  select id into queue_id
    from public.moderation_queue
   where target_type = 'site'
     and target_id = new.id::text
     and status in ('pending', 'in_review', 'escalated')
   limit 1;

  if queue_id is null then
    insert into public.moderation_queue (
      target_type, target_id, target_path, reason, reported_by, note
    )
    values (
      'site', new.id::text, '/saha/' || new.slug, 'yanlis-konum', new.submitted_by,
      'Kullanıcı gözlem noktası ekledi; yayımlanmadan önce konum ve Bortle bilgisi onaylanmalı.'
    )
    returning id into queue_id;
  end if;

  perform app.notify_admins(
    'Yeni saha noktası onay bekliyor', new.name, '/admin/moderation', 'moderation', queue_id
  );

  return new;
end $$;

/*
 * İPTAL ARTIK DURUM DEĞİL, TARİH.
 *
 * Fonksiyonun mantığı aynı; yalnızca "iptal edildi mi" sorusunun sorulduğu
 * yer değişti: `status = 'cancelled'` yerine `cancelled_at is not null`.
 * İptalin geri alınması da aynı şekilde tarihin silinmesi oldu.
 */
create or replace function app.event_change_fanout()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  takipci record;
  tur     app.notification_kind;
  baslik  text;
  govde   text;
begin
  if new.starts_at is distinct from old.starts_at then
    update public.reminders r
       set due_at = app.reminder_due_at(new.starts_at, r.offset_kind, r.custom_at)
     where r.event_id = new.id and r.sent_at is null;

    delete from public.reminders
     where event_id = new.id and sent_at is null
       and (due_at <= now() or due_at >= new.starts_at);
  end if;

  if new.cancelled_at is not null and old.cancelled_at is null then
    tur := 'event_cancelled';
    baslik := new.title || ' iptal edildi';
    govde := 'Takip ettiğin etkinlik iptal edildi.';
    delete from public.reminders where event_id = new.id and sent_at is null;
  elsif old.cancelled_at is not null and new.cancelled_at is null then
    tur := 'event_changed';
    baslik := new.title || ' yeniden planlandı';
    govde := 'İptal edilen etkinlik yeniden takvimde: ' ||
             to_char(new.starts_at at time zone 'Europe/Istanbul',
                     'DD.MM.YYYY HH24:MI');
  elsif new.starts_at is distinct from old.starts_at
     or new.venue is distinct from old.venue
     or new.city is distinct from old.city then
    tur := 'event_changed';
    baslik := new.title || ' güncellendi';
    govde := case
      when new.starts_at is distinct from old.starts_at
        then 'Tarih değişti: ' ||
             to_char(new.starts_at at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI')
      else 'Konum değişti: ' || coalesce(new.venue, new.city, '—')
    end;
  else
    return new;
  end if;

  for takipci in
    select f.user_id from public.event_follows f where f.event_id = new.id
  loop
    perform app.notify(
      takipci.user_id, null, tur, baslik, govde,
      '/etkinlik/' || new.slug, 'event', new.id
    );
  end loop;

  return new;
end $$;

create or replace function public.set_event_interest(target_event uuid, level text)
returns text
language plpgsql
set search_path = 'public', 'pg_temp'
as $$
declare
  me      uuid := auth.uid();
  bulundu boolean;
  iptal   timestamptz;
begin
  if me is null then
    raise exception 'Bunun için giriş yapmalısınız.'
      using errcode = 'insufficient_privilege';
  end if;

  if level not in ('yok', 'ilgileniyorum', 'katilacagim') then
    raise exception 'Geçersiz ilgi düzeyi.' using errcode = 'check_violation';
  end if;

  if level = 'yok' then
    delete from public.event_registrations
     where event_id = target_event and user_id = me;
    delete from public.event_follows
     where event_id = target_event and user_id = me;
    return 'yok';
  end if;

  /* Görünürlük kontrolü BURADA, yabancı anahtarda değil: RLS'in gizlediği
     bir etkinliğe satır eklemeye çalışmak FK hatası verirdi ve o hata
     "böyle bir etkinlik var ama göremiyorsun" demekti. */
  select true, e.cancelled_at into bulundu, iptal
    from public.events e where e.id = target_event;

  if bulundu is null then
    raise exception 'Etkinlik bulunamadı.' using errcode = 'no_data_found';
  end if;
  if iptal is not null then
    raise exception 'İptal edilmiş etkinlik.' using errcode = 'check_violation';
  end if;

  insert into public.event_follows (event_id, user_id)
  values (target_event, me)
  on conflict do nothing;

  if level = 'katilacagim' then
    insert into public.event_registrations (event_id, user_id)
    values (target_event, me)
    on conflict do nothing;
  else
    delete from public.event_registrations
     where event_id = target_event and user_id = me;
  end if;

  return level;
end $$;

/* Panel sayaçları: fotoğrafın "bekleyen"i artık taslak yerine ortak
   kümedeki taslak; içerik sayacı zaten Türkçe değerleri okuyordu. */
create or replace function app.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  sonuc jsonb;
begin
  if not (app.is_admin() or app.has_role('moderator') or app.has_role('content_editor')) then
    raise exception 'Yetki yok' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'kullanici_toplam', (select count(*) from public.profiles),
    'kullanici_yeni_7g', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'kullanici_askida', (select count(*) from public.profiles where account_status in ('suspended','banned')),
    'moderasyon_bekleyen', (select count(*) from public.moderation_queue where status in ('pending','in_review','escalated')),
    'icerik_taslak', (select count(*) from public.content_entries where status <> 'yayinda' and deleted_at is null),
    'icerik_yayinda', (select count(*) from public.content_entries where status = 'yayinda' and deleted_at is null),
    'fotograf_bekleyen', (select count(*) from public.astro_photos where status = 'taslak' and deleted_at is null),
    'silme_talebi', (select count(*) from public.account_deletion_requests where status = 'pending'),
    'audit_bugun', (select count(*) from public.audit_logs where created_at >= date_trunc('day', now())),
    'son_hareketler', (
      select coalesce(jsonb_agg(satir order by satir->>'zaman' desc), '[]'::jsonb)
      from (
        select jsonb_build_object('zaman', a.created_at, 'eylem', a.action, 'hedef', a.target_type, 'kim', p.username) as satir
        from public.audit_logs a
        left join public.profiles p on p.id = a.actor_id
        order by a.created_at desc
        limit 20
      ) t
    )
  ) into sonuc;

  return sonuc;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- ASKI/YASAK YAPTIRIMI — YAZMA POLİTİKALARINA BAĞLANIYOR  (Görev 1.1)
--
-- Bir önceki migration alanları ve `app.is_account_active()` fonksiyonunu
-- kurdu. Bu dosya onu ASIL YERE koyuyor: yazma politikalarının içine.
-- Belge §8: "askı/yasak yaptırımının arayüzde değil veritabanında olduğu
-- kanıtlanır (doğrudan REST çağrısı ile deneme)".
--
-- ── HANGİ POLİTİKALAR ──────────────────────────────────────────────────
-- Kullanıcının ürettiği içeriğin tamamı. `pg_policies` üzerinden okunan
-- mevcut ifadeleriyle birlikte yeniden yazılıyorlar; tek fark sona eklenen
-- `and app.is_account_active()`.
--
--   astro_photos · photo_comments · photo_ratings · listings ·
--   forum_threads · forum_posts · messages · observation_logs ·
--   site_reviews · clubs (başvuru) · events (katkı)
--
-- ── NEDEN YALNIZCA `WITH CHECK` ────────────────────────────────────────
-- `ALL` kipindeki politikalarda kontrolü `USING` tarafına da koymak,
-- askıdaki kullanıcının KENDİ içeriğini SİLMESİNİ de engellerdi. Askı bir
-- ceza, esaret değil: kişi kendi ilanını kaldırabilmeli, yenisini
-- açamamalı. `USING` silme/güncellemenin hangi satırları göreceğini,
-- `WITH CHECK` yazılan yeni hâli denetler — doğru yer ikincisi.
--
-- ── UPDATE POLİTİKALARINA DOKUNULMADI ──────────────────────────────────
-- Bilinçli. Askıdaki kullanıcının mevcut fotoğrafının başlığını
-- düzeltmesi yeni içerik üretmek değil.
--
-- ── MODERASYON POLİTİKALARI MUAF ───────────────────────────────────────
-- `*_moderate` politikaları admin/moderator içindir; bir yöneticiyi
-- durdurmanın yolu askı değil, rolü kaldırmaktır.
--
-- Geri alma: politikalar `and app.is_account_active()` kısmı çıkarılarak
-- yeniden yaratılır (kaynak ifadeler aşağıda).
-- ═══════════════════════════════════════════════════════════════════════

-- ── astro_photos ───────────────────────────────────────────────────────
drop policy if exists astro_photos_insert_own on public.astro_photos;
create policy astro_photos_insert_own on public.astro_photos
  for insert to authenticated
  with check ((select auth.uid()) = user_id and app.is_account_active());

-- ── photo_comments ─────────────────────────────────────────────────────
drop policy if exists photo_comments_insert_own on public.photo_comments;
create policy photo_comments_insert_own on public.photo_comments
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.astro_photos p
      where p.id = photo_comments.photo_id and p.status = 'published'
    )
    and app.is_account_active()
  );

-- ── photo_ratings ──────────────────────────────────────────────────────
drop policy if exists photo_ratings_insert_own on public.photo_ratings;
create policy photo_ratings_insert_own on public.photo_ratings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.astro_photos p
      where p.id = photo_ratings.photo_id
        and p.status = 'published'
        and p.user_id <> (select auth.uid())
    )
    and app.is_account_active()
  );

-- ── listings ───────────────────────────────────────────────────────────
drop policy if exists listings_write_own on public.listings;
create policy listings_write_own on public.listings
  for all to authenticated
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id and app.is_account_active());

-- ── forum_threads ──────────────────────────────────────────────────────
drop policy if exists forum_threads_insert_own on public.forum_threads;
create policy forum_threads_insert_own on public.forum_threads
  for insert to authenticated
  with check ((select auth.uid()) = author_id and app.is_account_active());

-- ── forum_posts ────────────────────────────────────────────────────────
drop policy if exists forum_posts_insert_own on public.forum_posts;
create policy forum_posts_insert_own on public.forum_posts
  for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1 from public.forum_threads t
      where t.id = forum_posts.thread_id and not t.locked
    )
    and app.is_account_active()
  );

-- ── messages ───────────────────────────────────────────────────────────
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and app.in_conversation(conversation_id)
    and app.is_account_active()
  );

-- ── observation_logs ───────────────────────────────────────────────────
drop policy if exists observation_logs_write_own on public.observation_logs;
create policy observation_logs_write_own on public.observation_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and app.is_account_active());

-- ── site_reviews ───────────────────────────────────────────────────────
drop policy if exists site_reviews_own on public.site_reviews;
create policy site_reviews_own on public.site_reviews
  for all to authenticated
  using (
    (select auth.uid()) = user_id
    or app.is_admin()
    or app.has_role('moderator')
  )
  with check ((select auth.uid()) = user_id and app.is_account_active());

-- ── clubs (başvuru) ────────────────────────────────────────────────────
drop policy if exists clubs_submit_pending on public.clubs;
create policy clubs_submit_pending on public.clubs
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
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

-- ── events (katkı) ─────────────────────────────────────────────────────
drop policy if exists events_insert_contributor on public.events;
create policy events_insert_contributor on public.events
  for insert to authenticated
  with check (
    app.is_admin()
    or app.has_role('content_editor')
    or (
      organizer_id = (select auth.uid())
      and (app.has_role('verified_organizer') or status = 'draft')
      and app.is_account_active()
    )
  );


-- ── KULLANICI KENDİ CEZASINI KALDIRAMAZ ────────────────────────────────
--
-- BU OLMADAN YUKARIDAKİ HER ŞEY BOŞTU. `profiles_update_own` politikası
-- kullanıcıya kendi satırını güncelleme hakkı veriyor ve `account_status`
-- da o satırda: askıya alınan kullanıcı tek bir PATCH isteğiyle kendini
-- `active` yapabilirdi.
--
-- RLS bunu tek başına çözemez: `WITH CHECK` yalnızca satırın YENİ hâlini
-- görür, "bu kolon değişti mi" sorusunu soramaz. Depoda bunun için zaten
-- bir desen var (`app.forum_guard_moderation_fields`, `app.guard_solve_fields`)
-- ve aynısını kullanıyorum.
--
-- Kullanıcıya AÇIK KALAN iki alan:
--   `last_seen_at`            — istemci kendi kalp atışını yazıyor
--   `username_customized_at`  — hoş geldin akışını kullanıcı tamamlıyor;
--                               ama NULL'a geri çekemiyor (akıştan kaçış
--                               yolu olurdu)
create or replace function app.profiles_guard_admin_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  /* JWT YOKSA GEÇ. Bu tetikleyici KULLANICI isteklerini denetliyor;
     migration, `service_role` ile çalışan sunucu işi ve SQL konsolu
     `auth.uid()` NULL ile gelir. İlk sürümde bu koşul yoktu ve
     yaptırımı doğrulamak için yazdığım test bloğu kendi kuralına
     takıldı — platform kendi kendini kilitlemişti. */
  if auth.uid() is null
     or app.is_admin()
     or app.has_role('moderator') then
    return new;
  end if;

  if new.account_status is distinct from old.account_status
     or new.suspended_until is distinct from old.suspended_until
     or new.status_reason is distinct from old.status_reason
     or new.status_changed_by is distinct from old.status_changed_by
     or new.status_changed_at is distinct from old.status_changed_at
     or new.admin_note is distinct from old.admin_note then
    raise exception 'Hesap durumu alanları yalnızca yönetim tarafından değiştirilebilir'
      using errcode = 'insufficient_privilege';
  end if;

  if old.username_customized_at is not null
     and new.username_customized_at is null then
    raise exception 'username_customized_at geri alınamaz'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_admin_fields on public.profiles;
create trigger profiles_guard_admin_fields
  before update on public.profiles
  for each row
  execute function app.profiles_guard_admin_fields();


-- ── YASAKLI HESAP PUBLIC YÜZEYDEN DÜŞER ────────────────────────────────
--
-- Belge Görev 1.4: "yasaklanan kullanıcının public profili 404 döner".
-- Bunu arayüzde yapmak yetmez — profil verisi PostgREST'ten okunabildiği
-- sürece 404 bir görüntüden ibarettir.
--
-- Mevcut politika `profiles_select_all` idi ve koşulu düpedüz `true`.
-- Yerine yasaklıyı gizleyen sürüm geliyor; yasaklı satırı yalnızca
-- kendisi (oturumu varsa) ve yönetim görüyor.
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select
  using (
    account_status <> 'banned'
    or id = (select auth.uid())
    or app.is_admin()
    or app.has_role('moderator')
  );

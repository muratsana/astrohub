-- ══════════════════════════════════════════════════════════════════════
-- HESAP KAPILARI: E-POSTA DOĞRULAMA, KULLANICI ADI KİLİDİ, VERİ DIŞA AKTARMA
--
-- Kullanıcı akışı baştan sona gezildiğinde üç boşluk çıktı ve üçü de
-- kaydın hemen ertesinde, kullanıcı daha hiçbir şey yapmadan başlıyor.
--
-- ── 1. E-POSTA DOĞRULANMADAN YAZILABİLİYORDU ────────────────────────
--
-- `auth.users.email_confirmed_at` doluyor, arayüz durumu hesap
-- sayfasında GÖSTERİYOR ("Doğrulanmadı") ama hiçbir yaptırımı yoktu:
-- doğrulanmamış bir hesap fotoğraf yükleyebiliyor, ilan verebiliyor,
-- forum konusu açabiliyor, mesaj atabiliyordu. Doğrulama, kullanıcıya
-- gösterilen bir rozetti; kapı değildi.
--
-- Kapı `app.yazabilir()` ile açılıyor ve yaptırım RLS'te — arayüzde
-- düğme gizlemek değil. `is_account_active()` ile AYRI tutuldu çünkü
-- iki ayrı soru: biri "hesabın askıda mı", öteki "adresin senin mi".
-- Tek fonksiyona sıkıştırsaydık askıdaki kullanıcıya "e-postanı
-- doğrula" diyen bir arayüz çıkardı.
--
-- ── 2. KULLANICI ADI SINIRSIZ DEĞİŞTİRİLEBİLİYORDU ──────────────────
--
-- `username_customized_at` kolonu 0031'den beri duruyor, `app
-- .profiles_guard_admin_fields` onun GERİ ALINMASINI engelliyor — ama
-- damgayı BASAN hiçbir şey yoktu: canlıdaki sekiz hesabın sekizinde de
-- null. Yani kolon vardı, kural yoktu.
--
-- Kural: üretilmiş `user_xxxx` adından gerçek ada geçiş bir kez
-- serbest, damga o anda basılıyor, sonraki değişiklik reddediliyor.
-- Adresi paylaşılan bir profilin adını istediği zaman değiştirebilmek,
-- her paylaşılmış bağlantıyı kırma hakkı demekti.
--
-- Halihazırda gerçek ad taşıyan hesaplar damgalanıyor: seçimlerini
-- zaten yapmışlar. Damgalamasaydık aynı kural altında kimi kullanıcı
-- bir, kimi iki ad hakkı taşırdı.
--
-- Yönetim muaf: ad çakışması ve kötüye kullanım düzeltmesi için birinin
-- elinde kalması gerek.
--
-- ── 3. KVKK'DA TAŞINABİLİRLİK EKSİKTİ ───────────────────────────────
--
-- `account_export_logs` tablosu 0022'den beri boş duruyor ve tek satır
-- kod ona dokunmuyordu. Hesap SİLME vardı (`deleteOwnAccount`), veri
-- ALMA yoktu — KVKK m.11 ikisini birlikte istiyor.
--
-- `hesap_verilerim()` kullanıcının KENDİ verisini tek JSON'da veriyor.
-- Parametre almıyor: kimin verisi olduğu `auth.uid()` ile sunucuda
-- belirleniyor. Parametre olsaydı herkes herkesin dosyasını indirirdi.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. E-POSTA DOĞRULAMA ────────────────────────────────────────────

/*
 * `auth.users` istemciye kapalı; okumak için SECURITY DEFINER şart.
 *
 * Oturumsuz çağrıda `true`: `is_account_active()` ile aynı sözleşme.
 * Ziyaretçinin doğrulanmış e-postası olmaz ve olmasına da gerek yok —
 * onu zaten politikanın `auth.uid() = user_id` kısmı durduruyor. Burada
 * `false` dönmek, kapıyı iki kez kilitleyip hata mesajını yanlış
 * sebebe bağlamak olurdu.
 */
create or replace function app.eposta_dogrulandi(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when uid is null then true
    else coalesce(
      (select u.email_confirmed_at is not null
         from auth.users u
        where u.id = uid),
      false
    )
  end;
$$;

comment on function app.eposta_dogrulandi(uuid) is
  'E-posta adresi doğrulanmış mı. Oturumsuz çağrıda true (bkz. is_account_active).';

/*
 * İÇERİK YAZMA KAPISI.
 *
 * Bundan sonra "yazabilir mi" sorusunun tek sorulduğu yer. Politikalar
 * iki fonksiyonu ayrı ayrı çağırsaydı, üçüncü bir koşul eklendiğinde
 * on iki politikanın on birine eklenir, birinde unutulurdu.
 */
create or replace function app.yazabilir(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_account_active(uid) and app.eposta_dogrulandi(uid);
$$;

comment on function app.yazabilir(uuid) is
  'İçerik yazma kapısı: hesap aktif VE e-posta doğrulanmış.';

-- ── Politikalar: is_account_active() → yazabilir() ──────────────────
--
-- On iki politika, tek tek. `alter policy` gövdeyi kısmen değiştiremiyor;
-- her biri kendi tanımıyla yeniden kuruluyor.

drop policy if exists astro_photos_insert_own on public.astro_photos;
create policy astro_photos_insert_own on public.astro_photos
  for insert to authenticated
  with check ((select auth.uid()) = user_id and app.yazabilir());

drop policy if exists clubs_submit_pending on public.clubs;
create policy clubs_submit_pending on public.clubs
  for insert
  with check (
    submitted_by = (select auth.uid())
    and status = 'incelemede'::app.content_status
    and listed = false
    and verified_at is null
    and verified_by is null
    and reviewed_at is null
    and reviewed_by is null
    and not exists (
      select 1 from unnest(clubs.photo_paths) p(path)
       where split_part(p.path, '/', 1) <> ((select auth.uid()))::text
    )
    and app.yazabilir()
  );

drop policy if exists content_entries_submit on public.content_entries;
create policy content_entries_submit on public.content_entries
  for insert to authenticated
  with check (
    app.is_admin()
    or app.has_role('content_editor'::app.app_role)
    or (
      submitted_by = (select auth.uid())
      and status = any (array['taslak'::app.content_status, 'incelemede'::app.content_status])
      and app.izin_var('icerik_olustur')
      and app.yazabilir()
    )
  );

drop policy if exists events_insert_contributor on public.events;
create policy events_insert_contributor on public.events
  for insert
  with check (
    app.is_admin()
    or app.has_role('content_editor'::app.app_role)
    or (
      organizer_id = (select auth.uid())
      and (
        app.has_role('verified_organizer'::app.app_role)
        or status = 'taslak'::app.content_status
      )
      and app.yazabilir()
    )
  );

drop policy if exists forum_posts_insert_own on public.forum_posts;
create policy forum_posts_insert_own on public.forum_posts
  for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1 from public.forum_threads t
       where t.id = forum_posts.thread_id and not t.locked
    )
    and app.yazabilir()
  );

drop policy if exists forum_threads_insert_own on public.forum_threads;
create policy forum_threads_insert_own on public.forum_threads
  for insert to authenticated
  with check ((select auth.uid()) = author_id and app.yazabilir());

drop policy if exists listings_write_own on public.listings;
create policy listings_write_own on public.listings
  for all to authenticated
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id and app.yazabilir());

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and app.in_conversation(conversation_id)
    and app.yazabilir()
  );

drop policy if exists observation_logs_write_own on public.observation_logs;
create policy observation_logs_write_own on public.observation_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and app.yazabilir());

drop policy if exists photo_comments_insert_own on public.photo_comments;
create policy photo_comments_insert_own on public.photo_comments
  for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.astro_photos p
       where p.id = photo_comments.photo_id
         and app.icerik_gorunur(p.status::text, p.deleted_at)
    )
    and app.yazabilir()
  );

drop policy if exists photo_ratings_insert_own on public.photo_ratings;
create policy photo_ratings_insert_own on public.photo_ratings
  for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.astro_photos p
       where p.id = photo_ratings.photo_id
         and app.icerik_gorunur(p.status::text, p.deleted_at)
         and p.user_id <> (select auth.uid())
    )
    and app.yazabilir()
  );

drop policy if exists site_reviews_own on public.site_reviews;
create policy site_reviews_own on public.site_reviews
  for all to authenticated
  using (
    (select auth.uid()) = user_id
    or app.is_admin()
    or app.has_role('moderator'::app.app_role)
  )
  with check ((select auth.uid()) = user_id and app.yazabilir());

-- ── 2. KULLANICI ADI KİLİDİ ─────────────────────────────────────────

/*
 * Üretilmiş ad deseni: `handle_new_user()` ile AYNI biçim.
 *
 * Desen iki yerde yazılıysa biri değiştiğinde öteki sessizce yanlış
 * cevap verir — burada yanlış cevap "adını hiç seçmemiş kullanıcıya
 * hakkını harcatmak" demek. Bu yüzden tek fonksiyon.
 */
create or replace function app.uretilmis_kullanici_adi(ad text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select ad ~ '^user_[0-9a-f]{12}$';
$$;

comment on function app.uretilmis_kullanici_adi(text) is
  'Kayıtta otomatik üretilen user_xxxx adı mı (handle_new_user ile aynı desen).';

create or replace function app.profiles_username_kilidi()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if new.username is not distinct from old.username then
    return new;
  end if;

  /* Yönetim muaf: çakışan ya da kötüye kullanılan bir adı düzeltmek
     birinin elinde kalmalı. */
  if app.is_admin() or app.has_role('moderator') then
    return new;
  end if;

  if old.username_customized_at is not null then
    raise exception 'Kullanici adi yalnizca bir kez secilebilir'
      using errcode = 'check_violation';
  end if;

  /* İlk seçim. Damga SUNUCUDA basılıyor: istemciden gelseydi kullanıcı
     null göndererek hakkını tazeleyebilirdi. */
  new.username_customized_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_username_kilidi on public.profiles;
create trigger profiles_username_kilidi
  before update on public.profiles
  for each row execute function app.profiles_username_kilidi();

/*
 * Geriye dönük damga: gerçek ad taşıyan hesaplar seçimlerini yapmış
 * sayılıyor. Damgayı `updated_at`'e değil `created_at`'e bağlıyoruz —
 * adın ne zaman seçildiğini bilmiyoruz, uydurmak yerine hesabın
 * açılışını yazıyoruz ve bu, damganın anlamını ("seçim yapılmış")
 * bozmuyor.
 *
 * Tetikleyici bu update'i de görecek ama `username` değişmediği için
 * ilk satırda çıkıyor.
 */
update public.profiles
   set username_customized_at = created_at
 where username_customized_at is null
   and not app.uretilmis_kullanici_adi(username::text);

-- ── 3. VERİ DIŞA AKTARMA (KVKK m.11) ────────────────────────────────

/*
 * Kullanıcının kendi verisi, tek JSON.
 *
 * KAPSAM KARARI: yalnızca kullanıcının ÜRETTİĞİ veri var. Başkasının
 * fotoğrafına yazdığı yorum var (kendi cümlesi), ama o fotoğrafın
 * kendisi yok. Mesajlarda yalnızca GÖNDERDİKLERİ var: bir konuşmanın
 * tamamını vermek, karşı tarafın verisini de kullanıcıya teslim etmek
 * olurdu ve o kişi buna rıza vermedi.
 *
 * `security definer` ama parametresiz: veri sahibi her zaman
 * `auth.uid()`. Oturumsuz çağrı boş dönmüyor, hata veriyor — sessizce
 * boş JSON döndürmek "verin yok" demek olurdu.
 */
create or replace function public.hesap_verilerim()
returns jsonb
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  uid uuid := auth.uid();
  sonuc jsonb;
begin
  if uid is null then
    raise exception 'Oturum bulunamadi' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'olusturuldu', now(),
    'hesap', (
      select to_jsonb(x) from (
        select u.email, u.created_at, u.last_sign_in_at,
               u.email_confirmed_at is not null as eposta_dogrulandi
          from auth.users u where u.id = uid
      ) x
    ),
    'profil', (
      select to_jsonb(x) from (
        select p.username, p.display_name, p.display_name_visible, p.bio,
               p.city, p.district, p.website_url, p.avatar_path,
               p.account_status, p.created_at, p.updated_at,
               p.terms_accepted_at, p.privacy_accepted_at, p.consent_version,
               p.username_customized_at
          from public.profiles p where p.id = uid
      ) x
    ),
    'fotograflar', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select f.title, f.slug, f.description, f.status, f.created_at,
               f.captured_at, f.original_path, f.display_path
          from public.astro_photos f
         where f.user_id = uid and f.deleted_at is null
      ) x
    ), '[]'::jsonb),
    'ilanlar', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select l.title, l.slug, l.description, l.price, l.currency,
               l.status, l.created_at
          from public.listings l where l.seller_id = uid
      ) x
    ), '[]'::jsonb),
    'forum_konulari', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select t.title, t.slug, t.body, t.created_at
          from public.forum_threads t where t.author_id = uid
      ) x
    ), '[]'::jsonb),
    'forum_cevaplari', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select o.body, o.created_at, o.thread_id
          from public.forum_posts o where o.author_id = uid
      ) x
    ), '[]'::jsonb),
    'fotograf_yorumlarim', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select y.body, y.created_at, y.photo_id
          from public.photo_comments y where y.user_id = uid
      ) x
    ), '[]'::jsonb),
    'gozlem_gunlugum', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select g.* from public.observation_logs g where g.user_id = uid
      ) x
    ), '[]'::jsonb),
    'ekipmanlarim', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select e.* from public.user_equipment e where e.user_id = uid
      ) x
    ), '[]'::jsonb),
    'setuplarim', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select s.* from public.user_setups s where s.user_id = uid
      ) x
    ), '[]'::jsonb),
    'gonderdigim_mesajlar', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select m.body, m.created_at, m.conversation_id
          from public.messages m where m.sender_id = uid
      ) x
    ), '[]'::jsonb),
    'takip_ettiklerim', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select p.username, t.created_at
          from public.follows t
          join public.profiles p on p.id = t.followee_id
         where t.follower_id = uid
      ) x
    ), '[]'::jsonb)
  ) into sonuc;

  /* İstek kaydı KVKK'nın kendi gereği: talebin ne zaman karşılandığı
     kayıtlı olmalı. Dosya sunucuda tutulmadığı için `export_path` boş —
     çıktı doğrudan kullanıcının tarayıcısına iniyor. */
  insert into public.account_export_logs (user_id, requested_at, completed_at)
  values (uid, now(), now());

  return sonuc;
end;
$$;

comment on function public.hesap_verilerim() is
  'KVKK m.11: oturum sahibinin kendi verisini tek JSON olarak döndürür.';

revoke all on function public.hesap_verilerim() from public, anon;
grant execute on function public.hesap_verilerim() to authenticated;

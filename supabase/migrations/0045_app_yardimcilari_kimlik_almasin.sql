-- ════════════════════════════════════════════════════════════════════════════
-- 0045 — `app` YARDIMCILARI BAŞKASININ KİMLİĞİNİ PARAMETRE ALMASIN
--
-- 0030 bir ilke koymuştu: `app` şemasındaki bir fonksiyon BAŞKASININ
-- kimliğini parametre olarak alıyorsa istemciye kapalı olmalı. O gün üç
-- fonksiyon kapatıldı (`membership_tier`, `photo_limit`,
-- `active_photo_count`); eline bir uuid geçen kullanıcı başkasının üyelik
-- kademesini sorgulayabiliyordu.
--
-- 0041–0043 aynı sınıftan BEŞ fonksiyon daha açtı ve hiçbirinin yetkisi
-- daraltılmadı:
--
--   app.is_blocked(a, b)            → "şu iki yabancı birbirini engellemiş mi"
--   app.in_conversation(conv, who)  → "şu kullanıcı şu sohbette mi"
--   app.conversation_blocked(c, w)  → aynı bilginin sohbet üstünden hâli
--   app.notification_allowed(u, k)  → "şu kullanıcı bu bildirimi alır mı"
--   app.notify(alıcı, …)            → **doğrudan bildirim üretimi**
--
-- SONUNCUSU EN AĞIRI. `notifications` tablosunda `insert` yetkisini
-- bilerek hiç vermemiştik; ama `app.notify` çağrılabilir kaldığı sürece
-- o karar bir kapıyı kilitleyip yanındaki pencereyi açık bırakmaktı.
--
-- PostgREST bugün yalnızca `public` şemasını açıyor, yani bu fonksiyonlar
-- REST üstünden ERİŞİLEBİLİR DEĞİL. Ama tek savunma katmanı bir
-- yapılandırma ayarı olmamalı: `db-schemas` listesine bir gün `app`
-- eklenirse, o değişikliği yapan kişinin bu göçü hatırlaması gerekmesin.
--
-- ══════════════════════════════════════════════════════════════════════════
-- POLİTİKALARIN İHTİYACI OLAN ŞEY DEĞİŞİYOR
--
-- Politika ifadeleri ÇAĞIRAN ROLÜN yetkisiyle değerlendiriliyor; yani
-- `follows` ve `messages` politikalarının çağırdığı yardımcılar açık
-- kalmak zorunda. Çözüm yetkiyi açık bırakmak değil, FONKSİYONU
-- DEĞİŞTİRMEK: kimliği parametre almayan, `auth.uid()`den okuyan
-- sürümler. Bunlar sızdırabilecekleri tek şeyi çağıranın zaten
-- bilebileceği şeye indiriyor — "ben bu kişiyle yazışabiliyor muyum".
-- ════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- KİMLİĞİ İÇERİDEN OKUYAN SÜRÜMLER
-- ══════════════════════════════════════════════════════════════════════════

/**
 * "Ben bu kullanıcıyla engelli miyim." Yönü söylemiyor — 0041'in gizlilik
 * kararı korunuyor.
 */
create or replace function app.blocked_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app.is_blocked(auth.uid(), other_user);
$$;

comment on function app.blocked_with(uuid) is
  'Çağıran ile verilen kullanıcı arasında engel var mı. Yönü açığa çıkarmaz.';

/** "Bu sohbetin katılımcısı mıyım." */
create or replace function app.in_conversation(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app.in_conversation(conv, auth.uid());
$$;

comment on function app.in_conversation(uuid) is
  'Çağıran bu sohbetin ayrılmamış katılımcısı mı.';

-- ══════════════════════════════════════════════════════════════════════════
-- POLİTİKALAR YENİ SÜRÜMLERE GEÇİYOR
--
-- `(select auth.uid())` sarmalaması korunuyor: 0037'nin InitPlan
-- optimizasyonu, `auth.uid()`in satır başına değil sorgu başına bir kez
-- değerlendirilmesini sağlıyor.
-- ══════════════════════════════════════════════════════════════════════════
drop policy if exists follows_write_own on public.follows;
create policy follows_write_own on public.follows
  for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and not app.blocked_with(followee_id)
  );

drop policy if exists conversations_read on public.conversations;
create policy conversations_read on public.conversations
  for select to authenticated
  using (app.in_conversation(id));

drop policy if exists conversation_participants_read on public.conversation_participants;
create policy conversation_participants_read on public.conversation_participants
  for select to authenticated
  using (app.in_conversation(conversation_id));

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages
  for select to authenticated
  using (app.in_conversation(conversation_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and app.in_conversation(conversation_id)
  );

-- ══════════════════════════════════════════════════════════════════════════
-- YETKİ DARALTMA
--
-- `revoke … from public` şart: `grant … to authenticated` yazmak
-- PostgreSQL'in varsayılan olarak `PUBLIC`e verdiği yetkiyi KALDIRMIYOR
-- (0044'ün konusu). Fonksiyonlar `security definer` olduğu için birbirini
-- çağırmaya devam ediyor: sahibi `postgres` ve o yetkisini kaybetmiyor.
-- Tetikleyiciler de etkilenmiyor — PostgreSQL tetikleme anında EXECUTE
-- yetkisi aramıyor.
-- ══════════════════════════════════════════════════════════════════════════
revoke execute on function app.is_blocked(uuid, uuid)          from public, anon, authenticated;
revoke execute on function app.in_conversation(uuid, uuid)     from public, anon, authenticated;
revoke execute on function app.conversation_blocked(uuid, uuid) from public, anon, authenticated;
revoke execute on function app.notification_allowed(uuid, app.notification_kind)
  from public, anon, authenticated;
revoke execute on function app.notify(
  uuid, uuid, app.notification_kind, text, text, text, text, uuid
) from public, anon, authenticated;

/* Politikaların çağırdığı iki yardımcı açık kalıyor — kimliği içeriden
   okudukları için sızdıracak bir şeyleri yok. */
revoke execute on function app.blocked_with(uuid)    from public;
revoke execute on function app.in_conversation(uuid) from public;
grant  execute on function app.blocked_with(uuid)    to authenticated;
grant  execute on function app.in_conversation(uuid) to authenticated;

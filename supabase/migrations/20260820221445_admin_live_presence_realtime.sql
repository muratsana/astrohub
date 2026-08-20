-- Admin canlı kullanıcı paneli: Supabase Realtime Presence yetkileri.
--
-- Dikkat: Supabase 2026-07 itibarıyla `realtime` şemasında tablo/fonksiyon
-- değişikliğini engelliyor; izin verilen yüzey `realtime.messages` RLS
-- politikaları. Bu göç yalnızca policy ekler.
--
-- Kanal: private `admin:live-presence`
-- - Her oturumlu kullanıcı kendi presence payload'ını publish edebilir.
-- - Presence listesini yalnızca admin okuyabilir.
--
-- Geri alma:
-- drop policy if exists astrohub_live_presence_track on realtime.messages;
-- drop policy if exists astrohub_live_presence_admin_read on realtime.messages;

drop policy if exists astrohub_live_presence_track on realtime.messages;
create policy astrohub_live_presence_track
on realtime.messages
for insert
to authenticated
with check (
  (select realtime.topic()) = 'admin:live-presence'
  and realtime.messages.extension = 'presence'
  and (select auth.uid()) is not null
);

drop policy if exists astrohub_live_presence_admin_read on realtime.messages;
create policy astrohub_live_presence_admin_read
on realtime.messages
for select
to authenticated
using (
  (select realtime.topic()) = 'admin:live-presence'
  and realtime.messages.extension = 'presence'
  and app.is_admin()
);

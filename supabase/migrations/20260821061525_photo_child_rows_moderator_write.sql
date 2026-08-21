-- Fotoğraf düzenleme ekranı `astro_photos` satırını admin/moderatör olarak
-- güncelleyebiliyor; aynı kaydın çekim oturumu ve pozlama alt satırları da
-- aynı yetki yüzeyini izlemeli. Aksi halde metadata update geçip
-- `photo_capture_sessions` insert'i RLS'te düşüyor.

drop policy if exists photo_capture_sessions_write_own
  on public.photo_capture_sessions;

create policy photo_capture_sessions_write_own
  on public.photo_capture_sessions
  for all
  to authenticated
  using (
    exists (
      select 1
        from public.astro_photos p
       where p.id = photo_capture_sessions.photo_id
         and (
           p.user_id = (select auth.uid())
           or app.is_admin()
           or app.has_role('moderator')
         )
    )
  )
  with check (
    exists (
      select 1
        from public.astro_photos p
       where p.id = photo_capture_sessions.photo_id
         and (
           p.user_id = (select auth.uid())
           or app.is_admin()
           or app.has_role('moderator')
         )
    )
  );

drop policy if exists photo_exposures_write_own
  on public.photo_exposures;

create policy photo_exposures_write_own
  on public.photo_exposures
  for all
  to authenticated
  using (
    exists (
      select 1
        from public.astro_photos p
       where p.id = photo_exposures.photo_id
         and (
           p.user_id = (select auth.uid())
           or app.is_admin()
           or app.has_role('moderator')
         )
    )
  )
  with check (
    exists (
      select 1
        from public.astro_photos p
       where p.id = photo_exposures.photo_id
         and (
           p.user_id = (select auth.uid())
           or app.is_admin()
           or app.has_role('moderator')
         )
    )
  );

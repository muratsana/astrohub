-- Parça sırası tek RPC isteğinde ve tek transaction içinde yazılır.
create or replace function public.reorder_radio_tracks(track_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (app.is_admin() or app.has_role('content_editor')) then
    raise exception 'İçerik editörü yetkisi gerekli.';
  end if;

  if cardinality(track_ids) <> (
    select count(distinct item) from unnest(track_ids) item
  ) then
    raise exception 'Parça sırası yinelenen kimlik içeremez.';
  end if;

  update public.radio_tracks t
     set position = array_position(track_ids, t.id) - 1
   where t.id = any(track_ids);
end;
$$;

revoke all on function public.reorder_radio_tracks(uuid[]) from public, anon;
grant execute on function public.reorder_radio_tracks(uuid[]) to authenticated;

-- Koleksiyon yönetimi: fotoğraf aynı kullanıcıda yalnızca tek koleksiyonda durur.

create or replace function app.collection_items_one_photo_per_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_id uuid;
begin
  select c.user_id into owner_id
    from public.collections c
   where c.id = new.collection_id;

  delete from public.collection_items ci
   using public.collections c
   where ci.collection_id = c.id
     and c.user_id = owner_id
     and ci.photo_id = new.photo_id
     and ci.collection_id <> new.collection_id;

  return new;
end $$;

revoke execute on function app.collection_items_one_photo_per_user() from public;

drop trigger if exists collection_items_one_photo_per_user on public.collection_items;
create trigger collection_items_one_photo_per_user
  before insert or update of collection_id, photo_id on public.collection_items
  for each row execute function app.collection_items_one_photo_per_user();

with ranked as (
  select
    ci.collection_id,
    ci.photo_id,
    row_number() over (
      partition by c.user_id, ci.photo_id
      order by ci.added_at desc, ci.collection_id
    ) as rn
  from public.collection_items ci
  join public.collections c on c.id = ci.collection_id
)
delete from public.collection_items ci
using ranked r
where ci.collection_id = r.collection_id
  and ci.photo_id = r.photo_id
  and r.rn > 1;

create or replace function public.move_photo_to_collection(
  target_photo uuid,
  target_collection uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  owned_collection uuid;
begin
  if me is null then
    raise exception 'Koleksiyon için giriş yapmalısınız.'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.astro_photos p where p.id = target_photo) then
    raise exception 'Fotoğraf bulunamadı.' using errcode = 'no_data_found';
  end if;

  if target_collection is not null then
    select c.id into owned_collection
      from public.collections c
     where c.id = target_collection
       and c.user_id = me;

    if owned_collection is null then
      raise exception 'Koleksiyon bulunamadı.' using errcode = 'no_data_found';
    end if;
  end if;

  delete from public.collection_items ci
   using public.collections c
   where ci.collection_id = c.id
     and c.user_id = me
     and ci.photo_id = target_photo;

  if target_collection is null then
    return null;
  end if;

  insert into public.collection_items (collection_id, photo_id)
  values (target_collection, target_photo)
  on conflict do nothing;

  return target_collection;
end $$;

revoke execute on function public.move_photo_to_collection(uuid, uuid) from public, anon;
grant execute on function public.move_photo_to_collection(uuid, uuid) to authenticated;

create or replace function public.toggle_saved_photo(target_photo uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  koleksiyon uuid;
  vardi boolean;
begin
  if me is null then
    raise exception 'Kaydetmek için giriş yapmalısınız.'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.astro_photos p where p.id = target_photo) then
    raise exception 'Fotoğraf bulunamadı.' using errcode = 'no_data_found';
  end if;

  select id into koleksiyon
    from public.collections
   where user_id = me and slug = 'kaydedilenler';

  if koleksiyon is null then
    insert into public.collections (user_id, name, slug)
    values (me, 'Kaydedilenler', 'kaydedilenler')
    returning id into koleksiyon;
  end if;

  select exists (
    select 1 from public.collection_items
     where collection_id = koleksiyon and photo_id = target_photo
  ) into vardi;

  if vardi then
    perform public.move_photo_to_collection(target_photo, null);
    return false;
  end if;

  perform public.move_photo_to_collection(target_photo, koleksiyon);
  return true;
end $$;

revoke execute on function public.toggle_saved_photo(uuid) from public, anon;
grant execute on function public.toggle_saved_photo(uuid) to authenticated;

-- Haftanın Fotoğrafı kazananı toplam puana göre değil, 10 üzerinden
-- ortalamaya göre seçilir. Admin "Sonuçlandır" dediğinde tur
-- `sonuclandi` durumuna düşer; ayrı "Yayımla" adımı admin onayıdır.

create or replace function public.close_photo_of_week(target_round uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  winner uuid;
  winner_owner uuid;
  winner_slug text;
  winner_title text;
begin
  if not app.is_admin() then raise exception 'Yönetici yetkisi gerekli.'; end if;

  select v.photo_id into winner
    from public.photo_of_week_votes v
    join public.astro_photos p on p.id = v.photo_id
   where v.round_id = target_round
   group by v.photo_id, p.published_at
   order by avg(v.score) desc, count(*) desc, p.published_at asc nulls last, v.photo_id
   limit 1;

  if winner is null then raise exception 'Sonuçlandırmak için en az bir oy gerekli.'; end if;

  update public.photo_of_week_rounds
     set winner_photo_id = winner, status = 'sonuclandi', closed_at = now()
   where id = target_round and status = 'oylama';
  if not found then raise exception 'Tur oylama durumunda değil.'; end if;

  select user_id, slug, title into winner_owner, winner_slug, winner_title
    from public.astro_photos where id = winner;
  perform app.notify(
    winner_owner, null, 'photo_featured', 'Fotoğrafın Haftanın Fotoğrafı seçildi',
    winner_title, '/fotograf/' || winner_slug, 'photo', winner
  );
  return winner;
end;
$$;

revoke all on function public.close_photo_of_week(uuid) from public, anon;
grant execute on function public.close_photo_of_week(uuid) to authenticated;

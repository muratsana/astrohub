-- İlan fotoğrafı ürün sınırı: kullanıcı ilan verirken en fazla 5 fotoğraf
-- seçebiliyor; veritabanı tetikleyicisi de aynı sınırı zorlamalı.
create or replace function app.listing_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mevcut integer;
begin
  select count(*) into mevcut
    from public.listing_photos
   where listing_id = new.listing_id;

  if mevcut >= 5 then
    raise exception 'Bir ilana en fazla 5 fotoğraf eklenebilir.'
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

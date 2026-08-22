-- Admin topluluk ekranında eski seed/mock kayıtlar varsayılan listede
-- görünmesin. Gerçek kullanıcı kayıtlarına dokunmamak için yalnız bilinen
-- demo slug'ları hedeflenir; kayıtlar sert silinmez, arşive alınır.

update public.clubs
set
  listed = false,
  deleted_at = coalesce(deleted_at, now())
where slug in (
  'antalya-astronomi-dernegi',
  'ege-universitesi-astronomi-kulubu',
  'ankara-astrofotograf-grubu',
  'bursa-astronomi-dernegi',
  'erciyes-astronomi-kulubu',
  'kapadokya-gokbilim-toplulugu'
);

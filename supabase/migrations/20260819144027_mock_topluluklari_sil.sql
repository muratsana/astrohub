-- Mock topluluk seed'lerini public dizinden kaldır.
--
-- Bu kayıtlar 0067'de demo/fallback dizinden veritabanına taşınmıştı.
-- Kullanıcı üretimi topluluk akışına dokunmuyoruz; yalnız bilinen seed
-- slug'larını soft-delete ediyoruz ki admin geçmişi gerekirse görebilsin.

update public.clubs
set
  listed = false,
  deleted_at = coalesce(deleted_at, now())
where
  slug in (
    'antalya-astronomi-dernegi',
    'ege-universitesi-astronomi-kulubu',
    'ankara-astrofotograf-grubu',
    'bursa-astronomi-dernegi',
    'erciyes-astronomi-kulubu',
    'kapadokya-gokbilim-toplulugu'
  );

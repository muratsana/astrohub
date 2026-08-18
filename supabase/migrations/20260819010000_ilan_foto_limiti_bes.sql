-- ═══════════════════════════════════════════════════════════════════════
-- İLAN FOTOĞRAF LİMİTİ: 8 → 5 (A07)
--
-- Ürün kararı ilan başına en fazla 5 fotoğraf. 0038'deki tetikleyici 8'e
-- ayarlıydı; istemci sabiti (LISTING_PHOTO_LIMIT) da 5'e indirildi. İkisi
-- aynı olmak zorunda: arayüz 5'te durup tetikleyici 8'e izin verseydi kural
-- gevşek, tersi olsaydı arayüz izin verip yazma reddedilir ve kullanıcı
-- sebebini anlamazdı.
--
-- Yalnızca fonksiyon gövdesi değişiyor; tetikleyici bağlaması 0038'den
-- duruyor. Mevcut 5'ten fazla fotoğrafı olan ilanlar (varsa) dokunulmadan
-- kalıyor — bu kural yalnızca YENİ eklemeyi sınırlıyor, geçmişi budamıyor.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function app.listing_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = public
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
end;
$$;

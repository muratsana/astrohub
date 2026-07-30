-- 0028_fotograf_yolu_sahiplik.sql
-- Fotoğraf satırının işaret ettiği depolama yolları sahibine ait olmalı.
--
-- AÇIK NE İDİ
--
-- `astro_photos.display_path`, `thumb_path` ve `original_path` serbest
-- metin kolonlarıydı. RLS bir kullanıcının BAŞKASININ KLASÖRÜNE YAZMASINI
-- engelliyordu (0012, `storage.foldername(name)[1] = auth.uid()`), ama
-- kimse kendi satırında başkasının yolunu GÖSTERMESİNİ engellemiyordu.
--
-- `photos` bucket'ı herkese açık okunur — galeri kartlarının imzasız
-- adresle gelmesi için (0012). Yani bir kullanıcı:
--
--   1. Beğendiği bir fotoğrafın genel adresini kopyalar,
--   2. Kendi adına bir `astro_photos` satırı açar,
--   3. `display_path`/`thumb_path` alanına o yolu yazar,
--   4. Yayımlar.
--
-- Sonuç: başkasının emeği, kendi profilinde, kendi imzasıyla. Hiçbir
-- dosya kopyalanmadığı için depolama tarafında iz de bırakmıyor. Tek
-- gereken bir POST isteği; arayüzü kullanmaya bile gerek yok.
--
-- ÇÖZÜM YOL BİÇİMİNİ ZORLAMAK
--
-- `storagePath()` yolları `<user_id>/<photo_id>/<variant>` biçiminde
-- üretiyor. Tetikleyici bu sözleşmeyi veritabanı tarafında da geçerli
-- kılıyor: her yol satırın KENDİ sahibinin ve KENDİ kimliğinin klasörüne
-- düşmek zorunda.
--
-- Yalnızca `user_id` önekini denetlemek yetmezdi: kullanıcı o zaman kendi
-- başka bir fotoğrafının yolunu gösterebilirdi. Zararsız görünüyor ama
-- kotayı bozar — tek bir dosya iki kayıt olarak sayılır — ve fotoğrafı
-- silen bir işlem diğerinin görselini de götürür.
--
-- KONTROL TETİKLEYİCİDE, `CHECK` KISITINDA DEĞİL. `check` ifadesi satırın
-- kendi kolonlarını kullanabilir ve `user_id`/`id` ikisi de satırda —
-- teknik olarak mümkündü. Ama `check` mevcut satırlara da uygulanır ve
-- tablo bugün boş olsa da ileride veri taşınırsa migration'ı düşürürdü;
-- tetikleyici yalnızca YENİ yazımları denetliyor.

create or replace function app.enforce_photo_paths()
returns trigger
language plpgsql
security definer set search_path = ''
as $fn$
declare
  expected text := new.user_id::text || '/' || new.id::text || '/';
begin
  if new.display_path is not null and left(new.display_path, length(expected)) <> expected then
    raise exception 'display_path bu fotoğrafa ait değil (% ile başlamalı)', expected
      using errcode = 'check_violation';
  end if;

  if new.thumb_path is not null and left(new.thumb_path, length(expected)) <> expected then
    raise exception 'thumb_path bu fotoğrafa ait değil (% ile başlamalı)', expected
      using errcode = 'check_violation';
  end if;

  if new.original_path is not null and left(new.original_path, length(expected)) <> expected then
    raise exception 'original_path bu fotoğrafa ait değil (% ile başlamalı)', expected
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

comment on function app.enforce_photo_paths is
  'Depolama yolları satırın kendi <user_id>/<id>/ klasörüne düşmek zorunda (§10.6).';

drop trigger if exists astro_photos_paths_owned on public.astro_photos;
create trigger astro_photos_paths_owned
  before insert or update of display_path, thumb_path, original_path
  on public.astro_photos
  for each row execute function app.enforce_photo_paths();

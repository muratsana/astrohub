-- ═══════════════════════════════════════════════════════════════════════
-- KOTA SİLİNENLERİ SAYMASIN   (FAZ 3, soft delete'in ölçülen yan etkisi)
--
-- Bir önceki göç (`20260807230000`) soft delete'i kurdu. Kurar kurmaz
-- ölçtüğümde şu çıktı: `app.active_photo_count()` yalnızca
-- `status = 'published'` sayıyor ve `deleted_at`e hiç bakmıyor.
--
-- Sonuç, kullanıcının göreceği hâliyle: fotoğrafını siliyor, galeriden
-- kayboluyor, ama yerine yenisini yükleyemiyor — "Aktif fotoğraf kotası
-- dolu (5 / 5)" diyor. Silinen bir şeyin yer kaplamaya devam etmesi.
--
-- Bu, soft delete'e geçmenin doğrudan sonucu: eskiden silme satırı
-- gerçekten kaldırıyordu ve sayım kendiliğinden düşüyordu. Artık satır
-- duruyor, dolayısıyla sayımın kimi sayacağını AÇIKÇA söylemek gerekiyor.
--
-- İmza değişmiyor: `enforce_photo_quota` tetikleyicisi ve `my_quota()`
-- dokunulmadan çalışmaya devam ediyor.
--
-- Geri alma: `deleted_at is null` koşulu gövdeden çıkarılır.
-- ═══════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.venue_events') is not null
     or to_regclass('public.studio_profiles') is not null then
    raise exception
      'YANLIŞ PROJE: venue_events/studio_profiles görüldü — burası StageHub. Göç durduruldu.';
  end if;
end
$$;

create or replace function app.active_photo_count(target_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from public.astro_photos
   where user_id = target_user
     and status = 'published'
     /* Soft delete edilen fotoğraf kotadan düşer: galeride görünmüyorsa
        yer de kaplamamalı. Satır veritabanında duruyor ve admin geri
        alabiliyor — geri alındığında kotaya yeniden dahil oluyor ve kota
        doluysa tetikleyici o anda itiraz ediyor. */
     and deleted_at is null;
$$;

comment on function app.active_photo_count(uuid) is
  'Kullanıcının kotaya sayılan fotoğraf adedi: yayında VE silinmemiş.';

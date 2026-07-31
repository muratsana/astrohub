-- 0032_plate_solve_alanlari.sql
-- ASTAP ile çözülen alan bilgisi (plate solve) fotoğraf kaydına yazılıyor.
--
-- ══════════════════════════════════════════════════════════════════════
-- NE İŞE YARIYOR
--
-- Plate solve, bir astrofotoğrafın gökyüzünde TAM OLARAK nereye baktığını
-- yıldız desenlerinden bulur: alanın merkezi (RA/Dec), dönüklüğü, ölçeği
-- ve kapladığı alan. Kullanıcının künyeye yazdığı hedef adı bir İDDİA;
-- çözüm ise ÖLÇÜM.
--
-- Bunun pratik karşılığı: künyede "M 31" yazan ama aslında M 33'e bakan
-- bir fotoğraf ayırt edilebilir; aynı alanı çeken farklı kullanıcılar
-- eşleştirilebilir; kadraj gerçek derece cinsinden gösterilebilir.
--
-- ══════════════════════════════════════════════════════════════════════
-- DURUM ALANI NEDEN GEREKLİ
--
-- Çözüm ASENKRON: fotoğraf yüklendiğinde başlıyor ama saniyeler sürüyor
-- ve dış bir servise gidiyor. Yalnızca sonuç kolonlarını tutsaydık,
-- "henüz çözülmedi" ile "çözülemedi" ayırt edilemezdi — ikisi de boş
-- kolon olurdu. Arayüzde bunlar farklı iki cümle: biri beklemeyi,
-- diğeri başarısızlığı anlatıyor.
--
-- `yok` varsayılan: çözücü yapılandırılmamışsa (ortam değişkeni boşsa)
-- hiçbir şey kuyruğa girmiyor ve kayıtlar bu durumda kalıyor. Uygulama
-- çözücü olmadan da eksiksiz çalışıyor.
--
-- ══════════════════════════════════════════════════════════════════════
-- DEĞERLER ÖLÇÜ BİRİMLERİYLE ADLANDIRILDI
--
-- `solve_ra_deg` ve `solve_dec_deg` DERECE cinsinden — saat/dakika
-- değil. Katalogda RA saat olarak tutuluyor (`celestial_objects.ra`) ve
-- iki farklı birimi aynı adla taşımak, bir gün birini diğerinin yerine
-- koymakla biter. Birim adın içinde duruyor.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plate_solve_status') then
    create type app.plate_solve_status as enum (
      'yok',        -- çözüm istenmedi ya da çözücü yapılandırılmamış
      'kuyrukta',   -- iş gönderildi, sonuç bekleniyor
      'cozuldu',
      'basarisiz'
    );
  end if;
end $$;

alter table public.astro_photos
  add column if not exists solve_status app.plate_solve_status not null default 'yok',
  add column if not exists solve_ra_deg           double precision,
  add column if not exists solve_dec_deg          double precision,
  -- Alanın kuzeye göre dönüklüğü (position angle).
  add column if not exists solve_rotation_deg     double precision,
  -- Piksel başına yay saniyesi — kadraj ve örnekleme hesapları için.
  add column if not exists solve_scale_arcsec_px  double precision,
  add column if not exists solve_field_width_deg  double precision,
  add column if not exists solve_field_height_deg double precision,
  add column if not exists solved_at              timestamptz,
  -- Başarısızlığın SEBEBİ. "Çözülemedi" demek kullanıcıya bir şey
  -- söylemiyor; "yeterli yıldız bulunamadı" ne yapacağını söylüyor.
  add column if not exists solve_error            text;

comment on column public.astro_photos.solve_status is
  'Plate solve durumu. `yok` = istenmedi/çözücü kapalı, `kuyrukta` = sonuç bekleniyor. Boş sonuç kolonlarıyla ayırt edilemeyeceği için ayrı tutuluyor (0032).';
comment on column public.astro_photos.solve_ra_deg is
  'Çözülen alan merkezinin sağ açıklığı, DERECE. Katalog RA''yı saat olarak tutuyor; birim adın içinde.';
comment on column public.astro_photos.solve_scale_arcsec_px is
  'Piksel başına yay saniyesi — ölçülen değer, künyedeki hesaplanan değerden bağımsız.';

-- ══════════════════════════════════════════════════════════════════════
-- SONUCU YALNIZCA SUNUCU YAZABİLİR
--
-- Çözüm bir ÖLÇÜM ve değerini oradan alıyor. Kullanıcı kendi satırını
-- güncelleyebiliyor (`astro_photos_update_own`), yani bu kolonlara da
-- yazabilirdi — ve "fotoğrafım tam M 31'e bakıyor" diye elle bir değer
-- girebilirdi. O anda çözüm bir ölçüm olmaktan çıkıp ikinci bir iddiaya
-- dönüşürdü.
--
-- Tetikleyici, kullanıcı rolünden gelen değişiklikleri geri alıyor:
-- servis rolü (çözücünün kullandığı anahtar) serbest, `authenticated`
-- eski değerlerle devam ediyor. Hata fırlatmıyor çünkü kullanıcı
-- başlığını değiştirirken bu kolonlara dokunduğunun farkında bile
-- değil; işlemi düşürmek yerine sessizce korumak doğru davranış.
-- ══════════════════════════════════════════════════════════════════════
create or replace function app.guard_solve_fields()
returns trigger
language plpgsql
security definer set search_path = ''
as $fn$
begin
  if current_setting('role', true) = 'service_role'
     or auth.role() = 'service_role' then
    return new;
  end if;

  new.solve_status           := old.solve_status;
  new.solve_ra_deg           := old.solve_ra_deg;
  new.solve_dec_deg          := old.solve_dec_deg;
  new.solve_rotation_deg     := old.solve_rotation_deg;
  new.solve_scale_arcsec_px  := old.solve_scale_arcsec_px;
  new.solve_field_width_deg  := old.solve_field_width_deg;
  new.solve_field_height_deg := old.solve_field_height_deg;
  new.solved_at              := old.solved_at;
  new.solve_error            := old.solve_error;
  return new;
end;
$fn$;

comment on function app.guard_solve_fields is
  'Plate solve sonucunu kullanıcı güncellemelerinden korur: ölçüm yalnızca servis rolünden yazılır (0032).';

drop trigger if exists astro_photos_guard_solve on public.astro_photos;
create trigger astro_photos_guard_solve
  before update on public.astro_photos
  for each row execute function app.guard_solve_fields();

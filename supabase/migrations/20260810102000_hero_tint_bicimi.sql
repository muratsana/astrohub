-- ═══════════════════════════════════════════════════════════════════════
-- SAHNE RENGİ BİÇİMİ
--
-- `tint` bugüne kadar yalnızca göçle yazılıyordu; panele renk seçici
-- eklenince kullanıcı girdisi oldu. Biçimi bozuk bir değer SESSİZ:
-- `effectiveTint` onu koddaki varsayılana düşürüyor, yani yönetici
-- seçtiğinden başka bir renk yayımladığını fark etmezdi. Sahne kümesi
-- kısıtıyla (`hero_slides_scene_check`) birebir aynı gerekçe.
--
-- BOŞ DİZE GEÇERLİ KALIYOR ve kısıtın parçası: 20260810101500 boş dizeyi
-- "değer verilmedi, koddaki varsayılana düş" anlamında varsayılan yaptı.
-- Kısıt onu dışlasaydı yeni slayt eklemek düşerdi.
--
-- Bileşen aralığı (0–255) BURADA DEĞİL: `^\d{1,3}$` üç basamağa kadar her
-- sayıyı geçirir, "300,0,0" kısıttan geçer. Regex'e aralık yazmak okunmaz
-- bir desen üretirdi; taşan bileşen canvas tarafında zaten kırpılıyor ve
-- panel renk seçicisi 0–255 dışına çıkamıyor. Kısıtın işi biçimi tutmak.
--
-- Geri alma: kısıt düşürülür; veri değişmiyor.
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

alter table public.hero_slides
  drop constraint if exists hero_slides_tint_check;

alter table public.hero_slides
  add constraint hero_slides_tint_check
  check (tint = '' or tint ~ '^\d{1,3},\d{1,3},\d{1,3}$');

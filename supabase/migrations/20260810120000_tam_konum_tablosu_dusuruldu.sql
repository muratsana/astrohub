-- ═══════════════════════════════════════════════════════════════════════
-- `photo_exact_locations` DÜŞÜRÜLÜYOR   (Yenileme planı FAZ 17 · madde 11)
--
-- ── PLAN "KARAR" DİYORDU, KARAR BU ────────────────────────────────────
--
-- Plan §17'nin son maddesi: "collections ve photo_exact_locations
-- tablolarını karara bağla". İkisi ölçüldü ve iki farklı cevap çıktı:
--
--   `collections`            → KALIYOR. Üç ekranda kullanımda
--                              (PanelPage, PhotoDetailPage, GalleryPage)
--                              ve "kaydedilenler" koleksiyonu çalışıyor.
--   `photo_exact_locations`  → DÜŞÜYOR. Aşağıdaki gerekçe.
--
-- ── NEDEN DÜŞÜYOR ─────────────────────────────────────────────────────
--
-- Tablo, fotoğrafın tam enlem-boylamını saklamak için açılmıştı ve
-- yükleme sihirbazındaki "konum görünürlüğü" seçeneğine bağlıydı.
-- O seçenek FAZ 17'de bilerek kaldırıldı: "tam koordinat" bir gizlilik
-- DENETİMİ gibi duruyordu ama gerçekte yaptığı şey, EXIF'ten okunan ham
-- koordinatın etikete yazılabilmesiydi — yani bir denetim değil, bir
-- sızıntı kapısıydı. Konum artık il/ilçe düzeyinde tutuluyor ve bu düzey
-- kullanıcının gözlem yerini açığa çıkarmıyor.
--
-- Tablo o karardan sonra ARDINDA KİMSE KALMADAN durdu:
--
--   · 0 satır (canlıdan okundu),
--   · istemci kodunda 0 referans,
--   · onu okuyan 0 fonksiyon, 0 view,
--   · ona bakan 0 dış anahtar.
--
-- ── NEDEN "DURSUN, BELKİ LAZIM OLUR" DEMİYORUZ ────────────────────────
--
-- Planın FAZ 18 başlığı tam olarak bu cümlenin sonucunu anlatıyor: on
-- sekiz parça arka uçta var, ön uçta yok. Boş bırakılan bu tablonun
-- tehlikesi yer kaplaması değil — DAVETİYE olması. Şeması hazır duran
-- bir "tam koordinat" tablosu, ileride birinin onu yeniden bağlaması ve
-- bilerek kapattığımız sızıntı kapısını geri açması demek. Kararı
-- yazıya dökmenin yolu tabloyu kaldırmak.
--
-- Geri alma: tablo yeniden oluşturulur (veri yok, kayıp yok) — ama önce
-- yukarıdaki gizlilik gerekçesi tekrar tartışılmalı.
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

-- Boş olduğunu göç ANINDA da doğruluyoruz: ölçüm ile uygulama arasında
-- biri satır yazmışsa düşürmek veri kaybı olurdu.
do $$
declare
  n bigint;
begin
  if to_regclass('public.photo_exact_locations') is null then
    raise notice 'photo_exact_locations zaten yok — atlanıyor.';
    return;
  end if;

  execute 'select count(*) from public.photo_exact_locations' into n;
  if n > 0 then
    raise exception
      'photo_exact_locations boş değil (% satır) — düşürme durduruldu, önce veriye karar verin.', n;
  end if;

  drop table public.photo_exact_locations;
end
$$;

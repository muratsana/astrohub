-- OPTİK ODAK/AÇIKLIK VE MONTÜR KAPASİTESİ — 0022'nin kalan boşlukları.
--
-- 0022 katalogun büyük kısmını künyeledi ama 116 optik tüpte odak/açıklık,
-- 83 montürde yük kapasitesi boş kaldı. Bu kayıtlar araç listelerine
-- girmiyor: odak uzaklığı olmayan bir tüple piksel ölçeği, kapasitesi
-- bilinmeyen bir montürle yük analizi hesaplanamaz.
--
-- BURAYA YALNIZCA ÜRETİCİ KÜNYESİNDEN DOĞRULANMIŞ DEĞER GİRİLİR.
-- Kalan kayıtlar bilerek boş bırakıldı; gerekçe dosyanın sonunda.
--
-- specs birleştirme yönü 0023 ile aynı: (yeni || mevcut), mevcut kazanır.

-- ── Newton astrograflar, f/4 (4) ──
update public.equipment_models m
set focal_length_mm = v.fl, aperture_mm = v.ap
from (values
('altair-astro-6-newtonian-astrograph',600,150),
('altair-astro-8-newtonian-astrograph',800,200),
('altair-astro-10-newtonian-astrograph',1000,250),
('altair-astro-12-newtonian-astrograph',1200,300)
) as v(slug,fl,ap)
where m.slug = v.slug;

-- ── Ritchey-Chrétien, GSO üretimi (7) ──
-- Altair ve StellaMira aynı GSO tüpünü kendi markasıyla satıyor; künye
-- ortak, bu yüzden iki marka aynı değerleri alıyor.
update public.equipment_models m
set focal_length_mm = v.fl, aperture_mm = v.ap
from (values
('altair-astro-6-rc',1370,154),
('altair-astro-8-rc',1624,203),
('altair-astro-10-rc',2000,254),
('altair-astro-12-rc',2432,304),
('stellamira-6-rc',1370,154),
('stellamira-8-rc',1624,203),
('stellamira-10-rc',2000,254)
) as v(slug,fl,ap)
where m.slug = v.slug;

-- ── Klasik Cassegrain, GSO f/12 (3) ──
update public.equipment_models m
set focal_length_mm = v.fl, aperture_mm = v.ap
from (values
('stellamira-8-classical-cassegrain',2436,203),
('stellamira-10-classical-cassegrain',3048,254),
('stellamira-12-classical-cassegrain',3648,304)
) as v(slug,fl,ap)
where m.slug = v.slug;

-- ── Bresser Messier: ölçü model adında kodlu (5) ──
-- AR-127L/1200 = 127 mm açıklık, 1200 mm odak. Künye adın kendisinde,
-- türetme değil okuma.
update public.equipment_models m
set focal_length_mm = v.fl, aperture_mm = v.ap
from (values
('bresser-messier-ar-127l-1200',1200,127),
('bresser-messier-ar-152l-1200',1200,152),
('bresser-messier-ar-152s-760',760,152),
('bresser-messier-nt-150s-750-hexafoc',750,150),
('bresser-messier-nt-203s-800-hexafoc',800,203)
) as v(slug,fl,ap)
where m.slug = v.slug;

-- ── GSO Dobson (5) ──
update public.equipment_models m
set focal_length_mm = v.fl, aperture_mm = v.ap
from (values
('gso-dobsonian-6-deluxe',1200,152),
('gso-dobsonian-8-deluxe',1200,203),
('gso-dobsonian-10-deluxe',1250,254),
('gso-dobsonian-12-deluxe',1500,305),
('gso-dobsonian-16-truss',1829,406)
) as v(slug,fl,ap)
where m.slug = v.slug;

-- ── Officina Stellare RC, f/8 (5) ──
update public.equipment_models m
set focal_length_mm = v.fl, aperture_mm = v.ap
from (values
('officina-stellare-rc-400',3200,400),
('officina-stellare-rc-500',4000,500),
('officina-stellare-rc-600',4800,600),
('officina-stellare-rc-800',6400,800),
('officina-stellare-rc-1000',8000,1000)
) as v(slug,fl,ap)
where m.slug = v.slug;

-- ── Officina Stellare RH Veloce, f/3 (4) ──
update public.equipment_models m
set focal_length_mm = v.fl, aperture_mm = v.ap
from (values
('officina-stellare-rh200-veloce',600,200),
('officina-stellare-rh250-veloce',750,250),
('officina-stellare-rh300-veloce',900,300),
('officina-stellare-rh350-veloce',1050,350)
) as v(slug,fl,ap)
where m.slug = v.slug;

-- ── Rehber kameralar: sensör künyesi (4) ──
-- Bu dördü 'guide' kategorisinde ama kamera; odak/açıklık değil sensör
-- ölçüsü eksikti. Rehber kamera seçicisi bunlara bakıyor.
update public.equipment_models m set
  pixel_size_um = coalesce(v.px, m.pixel_size_um),
  sensor_width_mm = coalesce(v.sw, m.sensor_width_mm),
  sensor_height_mm = coalesce(v.sh, m.sensor_height_mm),
  specs = jsonb_build_object('Çözünürlük', v.rx || '×' || v.ry, 'Sensör', v.sensor)
    || coalesce(m.specs, '{}'::jsonb)
from (values
('zwo-asi120mm-mini',3.75,4.8,3.6,1280,960,'AR0130CS'),
('zwo-asi174mini',5.86,11.34,7.13,1936,1216,'IMX174'),
('zwo-asi220mm-mini',2.9,5.57,3.13,1920,1080,'IMX462'),
('qhy5iii-462c',2.9,5.57,3.13,1920,1080,'IMX462')
) as v(slug,px,sw,sh,rx,ry,sensor)
where m.slug = v.slug;

-- ── Montür yük kapasitesi (23) ──
-- Losmandy künyeyi libre yayınlıyor; kilograma çevrildi (30 lb = 13,6 kg).
-- Kapasite uyumluluk aracında güvenlik eşiği olarak kullanılıyor: bir
-- montüre taşıyabileceğinden fazlasını yükleyip yükleyemeyeceğini bu sayı
-- söylüyor. Bu yüzden buraya tahmin girilmez — yanlış yüksek bir değer,
-- kullanıcıya taşımayacağı bir kurulumu "uygun" diye gösterir.
update public.equipment_models m
set payload_capacity_kg = v.cap
from (values
('losmandy-gm8g',13.6),
('losmandy-gm8g-lt',13.6),
('losmandy-gm811g',22.7),
('losmandy-gm811g-lt',22.7),
('losmandy-g11g',27.2),
('losmandy-g11t-titan',45.4),
('losmandy-g11t-titan-gemini-2',45.4),
('vixen-sx2wl',12),
('vixen-sxd2',15),
('vixen-sxp2',17),
('vixen-axj',22),
('vixen-axd2',30),
('vixen-ap-advanced-polaris',6.5),
('vixen-porta-ii',6),
('rowan-astronomy-az75',15),
('rowan-astronomy-az100',25),
('bresser-exos-2-eq5',13),
('bresser-exos-2-goto',13),
('bresser-exos-2-pmc-eight',13),
('explore-scientific-exos-2-pmc-eight',13),
('bresser-iexos-100-pmc-eight',7),
('explore-scientific-iexos-100-pmc-eight',7),
('sky-watcher-az5',5)
) as v(slug,cap)
where m.slug = v.slug;

-- ── BİLEREK BOŞ BIRAKILANLAR ──
--
-- Kalan 83 optik ve 60 montür künyesiz kalıyor. Üç ayrı gerekçe var:
--
-- 1. Kapasite kavramı ürüne uymuyor. Berlebach Castor/Spica/Wega ve
--    Tele-Vue Tele-Pod birer tripod, montür değil; taşıma sınırları
--    montür yük kapasitesiyle aynı şey değil ve uyumluluk aracının
--    formülüne girmemeli.
--
-- 2. Künye ürüne göre değişiyor. Hubble Optics UL16-UL32 ve Taurus
--    T300-T700 sipariş üzerine farklı odak oranlarıyla üretiliyor;
--    açıklık model adında kodlu ama odak uzaklığı tek bir sayı değil.
--    Açıklığı tek başına yazmak, aracın hesaba dahil ettiği ama piksel
--    ölçeğini yanlış hesapladığı bir kayıt üretirdi.
--
-- 3. Doğrulanmış kaynak bulunamadı. 10Micron AZ serisi, iOptron HAZ
--    serisi, UMi, Warpastron, Omegon ve Acuter montürleri ile TS-Optics
--    Photoline/CF-APO/ONTC/UNC/Hypergraph ve Altair Starwave/Wave
--    serileri bu grupta.
--
-- Boş bırakmak bu kayıtları araç listelerinden çıkarıyor, katalogdan
-- değil: Ekipman modülünde görünmeye ve karşılaştırılmaya devam
-- ediyorlar. Alternatif — makul görünen bir sayı yazmak — sessizce
-- yanlış piksel ölçeği ve yanlış yük analizi üretirdi; eksik veri
-- görünür, uydurma veri görünmez.

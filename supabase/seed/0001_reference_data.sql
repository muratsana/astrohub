-- OTOMATİK ÜRETİLDİ — elle düzenlemeyin.
-- Kaynak: src/features/*/data.ts · Üretici: scripts/seed/reference-data.ts
-- Yeniden üretmek için: node scripts/seed.mjs
--
-- Fotoğraf ve ilan tohumlanmaz: ikisi de auth.users'a bağlıdır ve
-- tohumlamak sahte hesap açmayı gerektirirdi.
-- Puan/kayıt sayıları da yazılmaz: onlar tetikleyicilerin türettiği
-- değerler, demo sayıyı gerçek kayda dönüştürmek olurdu.

-- ══════════════════════════════════════════════════════════════════════
-- EKİPMAN KATEGORİLERİ
-- ══════════════════════════════════════════════════════════════════════
insert into public.equipment_categories (id, name, position) values
  ('optik-tup', 'Optik Tüp', 1),
  ('montur', 'Montür', 2),
  ('astro-kamera', 'Astro Kamera', 3),
  ('filtre', 'Filtre', 4),
  ('guide', 'Guide Sistemi', 5),
  ('aksesuar', 'Aksesuar', 6)
on conflict (id) do update set name = excluded.name, position = excluded.position;

-- ══════════════════════════════════════════════════════════════════════
-- MARKALAR
-- ══════════════════════════════════════════════════════════════════════
insert into public.equipment_brands (id, name) values
  ('sky-watcher', 'Sky-Watcher'),
  ('william-optics', 'William Optics'),
  ('ioptron', 'iOptron'),
  ('zwo', 'ZWO'),
  ('antlia', 'Antlia'),
  ('optolong', 'Optolong'),
  ('pegasus-astro', 'Pegasus Astro')
on conflict (id) do update set name = excluded.name;

-- ══════════════════════════════════════════════════════════════════════
-- EKİPMAN MODELLERİ
-- ══════════════════════════════════════════════════════════════════════
insert into public.equipment_models (
  slug, brand_id, category_id, model, summary, price_hint,
  focal_length_mm, aperture_mm, pixel_size_um,
  sensor_width_mm, sensor_height_mm, payload_capacity_kg, weight_kg,
  specs, notes
) values
  ('sw-esprit-100', 'sky-watcher', 'optik-tup', 'Esprit 100ED', 'Üçlü apokromatik cam, tam kare sensörü dolduran düz alan ve 550 mm odak: kısa odak geniş alanla uzun odak detayı arasında en dengeli aralık.', 'Üst segment', 550, 100, null, null, null, null, null, '{"f/":"5.5","Tip":"Üçlü APO"}'::jsonb, array['Standart backfocus 55 mm — flattener ile birlikte satılır.', '6.4 kg tüp ağırlığı, görüntüleme için en az 13 kg sınıfı montür ister.']::text[]),
  ('wo-redcat-51', 'william-optics', 'optik-tup', 'RedCat 51', 'Petzval tasarımı sayesinde düzeltici gerektirmeyen, 250 mm odakta çok geniş alan veren taşınabilir bir astrograf. İlk ciddi astrofoto optiği olarak sık önerilir.', 'Orta segment', 250, 51, null, null, null, null, null, '{"f/":"4.9","Tip":"Petzval APO"}'::jsonb, array['Sabit odak kilidi vardır; sıcaklık değişiminde odak kayması düşüktür.', 'Hafifliği taşınabilir montürlerle uyumlu kılar.']::text[]),
  ('sw-200p-f4', 'sky-watcher', 'optik-tup', '200P f/4 Newton', 'f/4 hızıyla kısa pozlarda derin sinyal toplayan 8 inç Newton. Aynı açıklıkta en ekonomik çözüm, karşılığında koma düzeltici ve kolimasyon disiplini ister.', 'Orta segment', 800, 203, null, null, null, null, null, '{"f/":"4","Tip":"Newton"}'::jsonb, array['Koma düzeltici zorunludur; düzelticisiz köşe yıldızları kanat açar.', 'Her kurulumda kolimasyon kontrolü gerekir.', 'Tüp uzunluğu rüzgâra açık alanlarda guiding''i zorlar.']::text[]),
  ('sw-eq6r-pro', 'sky-watcher', 'montur', 'EQ6-R Pro', '20 kg nominal kapasiteli belt-drive ekvatoryal montür. Orta sınıf astrofotoğrafın omurgası; 8–10 kg''lık kurulumları rahat taşır.', 'Üst segment', null, null, null, null, null, 20, 17.7, '{"Tip":"Ekvatoryal (GoTo)"}'::jsonb, array['Görüntüleme için gerçekçi yük sınırı ~12 kg (nominal kapasitenin %60''ı).', '17.7 kg gövde ağırlığı sahaya taşımayı tek başına zorlaştırır.']::text[]),
  ('ioptron-gem28', 'ioptron', 'montur', 'GEM28', '12.7 kg kapasiteye karşılık 4.5 kg gövde: taşınabilirlik/kapasite oranı yüksek seyahat montürü.', 'Orta segment', null, null, null, null, null, 12.7, 4.5, '{"Tip":"Ekvatoryal (GoTo)"}'::jsonb, array['Kısa ve orta odaklı APO''larla iyi eşleşir.', 'Uzun Newton''larda rüzgâr etkisi belirginleşir.']::text[]),
  ('sw-star-adventurer-gti', 'sky-watcher', 'montur', 'Star Adventurer GTi', 'Sırt çantasına giren GoTo takip montürü. Kamera + kısa odak lens ya da hafif bir astrograf için tasarlandı.', 'Giriş segment', null, null, null, null, null, 5, 2.6, '{"Tip":"Taşınabilir GoTo"}'::jsonb, array['5 kg nominal kapasite; görüntülemede 2.5–3 kg''ı geçmemek gerekir.', 'Geniş alan ve Samanyolu çekimleri için yeterli.']::text[]),
  ('zwo-asi2600mm', 'zwo', 'astro-kamera', 'ASI2600MM Pro', 'APS-C mono sensör, 3.76 µm piksel ve düşük okuma gürültüsü. Dar bant SHO çalışmalarının referans kamerası.', 'Üst segment', null, null, 3.76, 23.49, 15.7, null, null, '{"Sensör":"APS-C mono","Çözünürlük":"6248×4176","Soğutma":"-35°C"}'::jsonb, array['Mono sensör filtre tekerleği ve filtre seti gerektirir — bütçe hesabı kamera ile bitmez.', 'Backfocus 17.5 mm; ara halka hesabına bunu dâhil edin.']::text[]),
  ('zwo-asi533mc', 'zwo', 'astro-kamera', 'ASI533MC Pro', 'Kare 1 inç renkli sensör; tek pozda renk verdiği için tek gecelik çekimlerde verimli. Kare kadraj, kompozisyonu döndürme derdinden kurtarır.', 'Orta segment', null, null, 3.76, 11.31, 11.31, null, null, '{"Sensör":"1\" renkli","Çözünürlük":"3008×3008","Soğutma":"-35°C"}'::jsonb, array['Amp glow göstermez, kalibrasyon basittir.', 'Küçük sensör kısa odakta dar alan demektir; mozaik ihtiyacı doğabilir.']::text[]),
  ('antlia-3nm-sho', 'antlia', 'filtre', '3nm SHO Seti (36mm)', '3 nm bant genişliği ay ışığını ve şehir parazitini büyük ölçüde keser. Bortle 6+ gökyüzünde dar bant çekimi mümkün kılar.', 'Üst segment', null, null, null, null, null, null, null, '{"Bant genişliği":"3 nm","Boyut":"36 mm","Set":"Ha / OIII / SII"}'::jsonb, array['Dar bant, f/4 ve altı hızlı optiklerde bant kayması yaşayabilir.', '36 mm boyut, APS-C sensörde vinyetlemesiz kapsama sağlar.']::text[]),
  ('optolong-lextreme', 'optolong', 'filtre', 'L-eXtreme', 'Ha ve OIII bantlarını tek filtrede birleştirir; renkli kameralarla tek gecede iki kanal toplamayı sağlar.', 'Orta segment', null, null, null, null, null, null, null, '{"Bant genişliği":"7 nm dual","Boyut":"2\"","Set":"Ha + OIII"}'::jsonb, array['Renkli (OSC) kameralar için tasarlandı; mono kamerada tekil filtreler daha verimli.', '7 nm bant, ay ışığında 3 nm kadar agresif değildir.']::text[]),
  ('zwo-asi174mini', 'zwo', 'guide', 'ASI174MM Mini', '5.86 µm piksel ve büyük sensör alanı, OAG''de yıldız bulmayı kolaylaştırır — dar prizma alanında en kritik özellik.', 'Orta segment', null, null, 5.86, null, null, null, null, '{"Sensör":"1/1.2\" mono","Kullanım":"OAG guide"}'::jsonb, array['OAG kullanımı için tasarlanmıştır; ayrı guide teleskopunda da çalışır.', 'Büyük piksel, uzun odakta guide ölçeğini kabalaştırır.']::text[]),
  ('zwo-oag-l', 'zwo', 'guide', 'OAG-L', 'Off-axis guider: guide kamerayı ana optiğin ışık yolundan besler, diferansiyel esnemeyi ortadan kaldırır.', 'Orta segment', null, null, null, null, null, null, null, '{"Tip":"Off-axis guider","Prizma":"12×12 mm","Backfocus":"16.5 mm"}'::jsonb, array['16.5 mm backfocus tüketir — ara halka hesabını buna göre yapın.', 'Uzun odakta ayrı guide teleskopuna göre belirgin üstündür.']::text[]),
  ('pegasus-pocket-powerbox', 'pegasus-astro', 'aksesuar', 'Pocket Powerbox Advance', 'Sahada kablo karmaşasını tek kutuya indirir: dört 12V çıkış, iki ısıtıcı bandı kanalı ve USB üzerinden kontrol.', 'Orta segment', null, null, null, null, null, null, null, '{"Çıkış":"4× 12V + 2× dew","Kontrol":"USB","Sensör":"Sıcaklık/nem"}'::jsonb, array['Çiy noktası sensörü ısıtıcıyı otomatik yönetir.', 'Tek kablo ile montüre güç ve veri taşımayı mümkün kılar.']::text[])
on conflict (slug) do update set
  brand_id = excluded.brand_id,
  category_id = excluded.category_id,
  model = excluded.model,
  summary = excluded.summary,
  price_hint = excluded.price_hint,
  focal_length_mm = excluded.focal_length_mm,
  aperture_mm = excluded.aperture_mm,
  pixel_size_um = excluded.pixel_size_um,
  sensor_width_mm = excluded.sensor_width_mm,
  sensor_height_mm = excluded.sensor_height_mm,
  payload_capacity_kg = excluded.payload_capacity_kg,
  weight_kg = excluded.weight_kg,
  specs = excluded.specs,
  notes = excluded.notes;

-- ══════════════════════════════════════════════════════════════════════
-- GÖK CİSİMLERİ
-- ══════════════════════════════════════════════════════════════════════
insert into public.celestial_objects (
  slug, name, catalog, kind, constellation, ra_deg, dec_deg, magnitude,
  size_major_arcmin, size_minor_arcmin, best_months, difficulty,
  recommended_focal, recommended_filters, description
) values
  ('m31-andromeda', 'Andromeda Galaksisi', 'M 31', 'galaksi', 'Andromeda', 10.68333, 41.26667, 3.4, 178, 63, 'Eylül – Aralık', 'Kolay', '135–600 mm', 'UV/IR-cut (geniş bant)', 'Samanyolu''na en yakın büyük galaksi; çıplak gözle görülebilen en uzak gökcisimlerinden. Geniş açısal boyutu nedeniyle kısa odaklarla bile etkileyici sonuç verir.'),
  ('ic434-at-basi', 'At Başı Bulutsusu', 'IC 434', 'karanlik-bulutsu', 'Orion', 85.24583, -2.45, null, 8, 6, 'Kasım – Şubat', 'Orta', '600–1200 mm', 'Ha (dar bant)', 'Parlak IC 434 emisyon perdesinin önündeki ikonik karanlık bulutsu. Ha filtresiyle kontrast belirgin şekilde artar.'),
  ('ngc7000-kuzey-amerika', 'Kuzey Amerika Bulutsusu', 'NGC 7000', 'emisyon-bulutsusu', 'Kuğu', 314.82083, 44.51667, 4, 120, 100, 'Haziran – Ekim', 'Kolay', '135–400 mm', 'Ha/OIII dual-band veya SHO', 'Kuğu takımyıldızındaki dev emisyon bölgesi; şehir içinden bile dual-band filtreyle çalışılabilir. Geniş alan setup''larının klasiği.'),
  ('ngc2237-rozet', 'Rozet Bulutsusu', 'NGC 2237', 'emisyon-bulutsusu', 'Tek Boynuz', 98.4375, 4.98333, 9, 80, 60, 'Aralık – Mart', 'Orta', '400–800 mm', 'SHO (dar bant)', 'Merkezinde NGC 2244 açık kümesini barındıran halka biçimli emisyon bulutsusu; SHO paletinin en sevilen hedeflerinden.'),
  ('m42-orion', 'Orion Bulutsusu', 'M 42', 'emisyon-bulutsusu', 'Orion', 83.82083, -5.38333, 4, 85, 60, 'Kasım – Şubat', 'Kolay', '400–1000 mm', 'UV/IR-cut; çekirdek için kısa pozlar (HDR)', 'Gökyüzünün en parlak bulutsusu ve çoğu astrofotoğrafçının ilk deep-sky hedefi. Parlak çekirdeği için HDR tekniği önerilir.'),
  ('m13-herkul', 'Herkül Küresel Kümesi', 'M 13', 'kuresel-kume', 'Herkül', 250.42083, 36.45, 5.8, 20, 20, 'Nisan – Ağustos', 'Kolay', '800–2000 mm', 'UV/IR-cut', 'Kuzey yarımkürenin en görkemli küresel kümesi; yüz binlerce yıldızı çözümlemek için orta-uzun odak ister.'),
  ('ngc6302-kelebek', 'Kelebek Bulutsusu', 'NGC 6302', 'gezegenimsi-bulutsu', 'Akrep', 258.43333, -37.1, 7.1, 3, 3, 'Haziran – Ağustos', 'Zor', '1200+ mm', 'Ha/OIII', 'Türkiye''den güney ufkuna yakın, alçak yükseklikte kalan zorlu bir gezegenimsi bulutsu; kısa gözlem penceresi ve iyi güney ufku gerektirir.'),
  ('ic1396-fil-hortumu', 'Fil Hortumu Bulutsusu', 'IC 1396', 'emisyon-bulutsusu', 'Kral', 324.775, 57.5, null, 170, 140, 'Temmuz – Kasım', 'Orta', '200–600 mm', 'SHO (dar bant)', 'Kral takımyıldızındaki dev emisyon kompleksi; içindeki "fil hortumu" globülü uzun odaklarda ayrı bir hedef olarak çalışılır.')
on conflict (slug) do update set
  name = excluded.name,
  catalog = excluded.catalog,
  kind = excluded.kind,
  constellation = excluded.constellation,
  ra_deg = excluded.ra_deg,
  dec_deg = excluded.dec_deg,
  magnitude = excluded.magnitude,
  size_major_arcmin = excluded.size_major_arcmin,
  size_minor_arcmin = excluded.size_minor_arcmin,
  best_months = excluded.best_months,
  difficulty = excluded.difficulty,
  recommended_focal = excluded.recommended_focal,
  recommended_filters = excluded.recommended_filters,
  description = excluded.description;

-- ══════════════════════════════════════════════════════════════════════
-- KATALOG KODLARI
-- ══════════════════════════════════════════════════════════════════════
insert into public.catalog_identifiers (object_id, code, is_primary) values
  ((select id from public.celestial_objects where slug = 'm31-andromeda'), 'M 31', true),
  ((select id from public.celestial_objects where slug = 'm31-andromeda'), 'NGC 224', false),
  ((select id from public.celestial_objects where slug = 'ic434-at-basi'), 'IC 434', true),
  ((select id from public.celestial_objects where slug = 'ic434-at-basi'), 'Barnard 33', false),
  ((select id from public.celestial_objects where slug = 'ngc7000-kuzey-amerika'), 'NGC 7000', true),
  ((select id from public.celestial_objects where slug = 'ngc7000-kuzey-amerika'), 'Caldwell 20', false),
  ((select id from public.celestial_objects where slug = 'ngc2237-rozet'), 'NGC 2237', true),
  ((select id from public.celestial_objects where slug = 'ngc2237-rozet'), 'Caldwell 49', false),
  ((select id from public.celestial_objects where slug = 'm42-orion'), 'M 42', true),
  ((select id from public.celestial_objects where slug = 'm42-orion'), 'NGC 1976', false),
  ((select id from public.celestial_objects where slug = 'm13-herkul'), 'M 13', true),
  ((select id from public.celestial_objects where slug = 'm13-herkul'), 'NGC 6205', false),
  ((select id from public.celestial_objects where slug = 'ngc6302-kelebek'), 'NGC 6302', true),
  ((select id from public.celestial_objects where slug = 'ngc6302-kelebek'), 'Caldwell 69', false),
  ((select id from public.celestial_objects where slug = 'ic1396-fil-hortumu'), 'IC 1396', true)
on conflict (object_id, code) do update set is_primary = excluded.is_primary;

-- ══════════════════════════════════════════════════════════════════════
-- GÖZLEM NOKTALARI
-- ══════════════════════════════════════════════════════════════════════
insert into public.observing_sites (
  slug, name, region, status, approx_latitude, approx_longitude,
  altitude_m, bortle, sqm, road_access, south_horizon, best_months,
  has_water, has_toilet, has_electricity, has_cell_signal,
  has_tent_area, caravan_ok, description, warnings
) values
  ('saklikent-antalya', 'Saklıkent Gözlem Alanı', 'Antalya', 'published'::app.site_status, 36.8247, 30.3353, 1850, 3, 21.6, 'Asfalt', 'Açık', 'Mayıs – Ekim', true, true, true, true, true, true, 'TÜBİTAK Ulusal Gözlemevi yakınındaki plato; asfalt erişim ve tesis olanaklarıyla Türkiye''nin en erişilebilir karanlık gökyüzü noktalarından. Yaz gecelerinde bile serin olur.', array['Yaz hafta sonları kalabalık olabilir; erken yer tutun.']::text[]),
  ('palandoken-yaylasi', 'Palandöken Yaylası', 'Erzurum', 'published'::app.site_status, 39.8508, 41.2417, 2400, 2, 21.9, 'Stabilize', 'Açık', 'Haziran – Eylül', false, false, false, true, true, false, 'Doğu Anadolu''nun en karanlık gökyüzülerinden; SQM 21.9 ölçümleriyle narrowband gerektirmeyen doğal kontrast. Tesis yok — tam donanımlı gelin.', array['Gece sıcaklığı yazın bile 5°C altına düşebilir.', 'Son 3 km stabilize yol; yağışta zorlaşır.']::text[]),
  ('camlidere-ankara', 'Çamlıdere Gözlem Noktası', 'Ankara', 'published'::app.site_status, 40.4886, 32.4728, 1250, 4, 21.2, 'Asfalt', 'Kısmen açık', 'Nisan – Kasım', true, false, false, true, true, true, 'Ankara''ya 1 saat mesafede hafta sonu kaçamağı; başkentin ışık kubbesi kuzey ufkunu etkiler ama güney hedefleri için yeterli karanlık sunar.', '{}'::text[]),
  ('goreme-nevsehir', 'Göreme Kırsalı', 'Nevşehir', 'published'::app.site_status, 38.6431, 34.8289, 1100, 3, 21.4, 'Stabilize', 'Açık', 'Nisan – Ekim', false, false, false, true, true, true, 'Peribacaları silüetiyle gece manzarası fotoğrafçılığının Türkiye''deki başkenti. Turistik bölgeden 10-15 dk uzaklaşınca Bortle 3 gökyüzü.', array['Balon uçuş sabahları erken saatte araç trafiği başlar.']::text[])
on conflict (slug) do update set
  name = excluded.name,
  region = excluded.region,
  approx_latitude = excluded.approx_latitude,
  approx_longitude = excluded.approx_longitude,
  altitude_m = excluded.altitude_m,
  bortle = excluded.bortle,
  sqm = excluded.sqm,
  road_access = excluded.road_access,
  south_horizon = excluded.south_horizon,
  best_months = excluded.best_months,
  has_water = excluded.has_water,
  has_toilet = excluded.has_toilet,
  has_electricity = excluded.has_electricity,
  has_cell_signal = excluded.has_cell_signal,
  has_tent_area = excluded.has_tent_area,
  caravan_ok = excluded.caravan_ok,
  description = excluded.description,
  warnings = excluded.warnings;

-- ══════════════════════════════════════════════════════════════════════
-- NOKTA ÖLÇÜMLERİ
-- ══════════════════════════════════════════════════════════════════════
insert into public.site_measurements (
  site_id, measured_at, sqm, bortle, method, note
) values
  ((select id from public.observing_sites where slug = 'saklikent-antalya'), date '2026-07-01', 21.6, 3, 'tohum-kayit', 'Site künyesinden aktarılan başlangıç değeri.'),
  ((select id from public.observing_sites where slug = 'palandoken-yaylasi'), date '2026-07-01', 21.9, 2, 'tohum-kayit', 'Site künyesinden aktarılan başlangıç değeri.'),
  ((select id from public.observing_sites where slug = 'camlidere-ankara'), date '2026-07-01', 21.2, 4, 'tohum-kayit', 'Site künyesinden aktarılan başlangıç değeri.'),
  ((select id from public.observing_sites where slug = 'goreme-nevsehir'), date '2026-07-01', 21.4, 3, 'tohum-kayit', 'Site künyesinden aktarılan başlangıç değeri.')
on conflict do nothing;

-- ══════════════════════════════════════════════════════════════════════
-- ETKİNLİKLER
-- ══════════════════════════════════════════════════════════════════════
insert into public.events (
  slug, title, event_type, status, city, venue, latitude, longitude,
  starts_at, ends_at, free, camping, kids_friendly, astrophoto_focused,
  telescopes_provided, capacity, organizer_name, organizer_verified,
  description, observed_targets, rules, source_name, source_last_verified_at
) values
  ('perseid-2026', 'Perseid Meteor Yağmuru Gözlem Kampı', 'meteor-yagmuru', 'published'::app.event_status, 'Antalya', 'Saklıkent Gözlem Alanı', 36.7817, 30.3494, '2026-08-12T18:00:00+03:00'::timestamptz, '2026-08-13T06:00:00+03:00'::timestamptz, false, true, true, true, true, 120, 'Antalya Astronomi Derneği', true, 'Yılın en zengin meteor yağmurunu Bortle 3 gökyüzü altında izliyoruz. Zirve gecesi saatte 100+ meteor bekleniyor; çadır alanı, teleskop istasyonları ve astrofoto köşesi hazır olacak.', array['Perseid meteorları', 'Satürn', 'Jüpiter', 'Samanyolu']::text[], array['Beyaz ışık kullanımı 21:00 sonrası yasaktır; kırmızı fener getirin.', 'Çadır alanı araçlara kapalıdır, otopark 200 m mesafededir.']::text[], 'Organizatör bildirimi', '2026-07-10'::date),
  ('karanlik-gokyuzu', 'Karanlık Gökyüzü Astrofotoğraf Atölyesi', 'astrofoto-kampi', 'published'::app.event_status, 'Erzurum', 'Palandöken Yaylası', 39.8508, 41.2417, '2026-08-20T16:00:00+03:00'::timestamptz, '2026-08-22T10:00:00+03:00'::timestamptz, false, true, false, true, false, 30, 'DeepSky Türkiye', true, 'İki gecelik uygulamalı atölye: kurulum, polar alignment, guiding, SHO veri toplama ve sabah oturumlarında işleme. Kendi ekipmanınızla katılım esastır; SQM 21.9 gökyüzü.', array['NGC 7000', 'IC 1396', 'Sadr bölgesi']::text[], '{}'::text[], 'Organizatör bildirimi', '2026-07-08'::date),
  ('halk-gozlemi', 'Halka Açık Teleskop Gözlemi', 'halk-gozlemi', 'published'::app.event_status, 'İstanbul', 'Maltepe Sahil Parkı', 41.0082, 28.9784, '2026-08-28T20:00:00+03:00'::timestamptz, null, true, false, true, false, true, null, 'İstanbul Gökyüzü Gönüllüleri', false, 'Şehir merkezinde herkese açık gözlem akşamı. 6 teleskopla Ay kraterleri, Satürn halkaları ve çift yıldızlar. Kayıt gerekmez, çocuklar için kısa anlatım köşesi bulunur.', array['Ay', 'Satürn', 'Jüpiter', 'Albireo']::text[], '{}'::text[], 'Kullanıcı önerisi + editör onayı', '2026-07-12'::date),
  ('gunes-gozlemi-izmir', 'H-alfa ile Güneş Gözlemi', 'gunes-gozlemi', 'published'::app.event_status, 'İzmir', 'Kültürpark', 38.4237, 27.1428, '2026-09-06T11:00:00+03:00'::timestamptz, null, true, false, true, false, true, null, 'Ege Üniversitesi Astronomi Kulübü', true, 'Özel H-alfa teleskoplarıyla güneş lekeleri ve protuberansları güvenle gözlemliyoruz. Güneşe asla çıplak gözle veya filtresiz teleskopla bakılmaz; tüm ekipman kulüp tarafından sağlanır.', array['Güneş lekeleri', 'Protuberanslar']::text[], '{}'::text[], 'Kulüp duyurusu', '2026-07-01'::date),
  ('astronomi-101-webinar', 'Astronomiye Giriş: Ekipman Seçimi Webinarı', 'webinar', 'published'::app.event_status, 'Online', 'Canlı yayın', null, null, '2026-07-30T21:00:00+03:00'::timestamptz, null, true, false, false, true, false, null, 'Astrohub Eğitim', true, 'İlk teleskop ve ilk astrofoto setup''ı seçerken en sık yapılan hatalar; bütçe senaryolarıyla montür-öncelikli yaklaşım.', '{}'::text[], '{}'::text[], 'Organizatör bildirimi', '2026-07-14'::date),
  ('orionid-kapadokya', 'Orionid Meteor Gecesi — Kapadokya', 'meteor-yagmuru', 'published'::app.event_status, 'Nevşehir', 'Uçhisar Gözlem Terası', 38.6304, 34.8056, '2026-10-21T20:00:00+03:00'::timestamptz, '2026-10-22T05:00:00+03:00'::timestamptz, false, true, true, true, true, 80, 'Kapadokya Gökbilim Topluluğu', true, 'Halley kuyruklu yıldızının artıklarından doğan Orionidler, peribacalarının üzerinde. Zirve gecesi saatte 20–25 meteor bekleniyor; ay bu yıl zirveyi bozmuyor.', array['Orionid meteorları', 'Orion Bulutsusu', 'Jüpiter']::text[], array['Beyaz ışık yasak; kırmızı fener zorunlu.', 'Alan rüzgârlıdır, kışlık giyinin.']::text[], 'Organizatör bildirimi', '2026-07-20'::date),
  ('geminid-2026-erciyes', 'Geminid Meteor Yağmuru Kampı', 'meteor-yagmuru', 'published'::app.event_status, 'Kayseri', 'Erciyes Yaylası', 38.5333, 35.45, '2026-12-13T18:00:00+03:00'::timestamptz, '2026-12-14T06:00:00+03:00'::timestamptz, false, true, false, true, false, 60, 'Erciyes Astronomi Kulübü', true, 'Yılın en yoğun meteor yağmuru, 2000 m rakımda ve kuru kış havasında. Geminidler yavaş ve parlak; geniş açı çekim için en verimli gece.', array['Geminid meteorları', 'Orion', 'Kış Üçgeni']::text[], array['Gece −15°C görülebilir; kışlık uyku tulumu zorunlu.']::text[], 'Organizatör bildirimi', '2026-07-18'::date),
  ('tubitak-ulusal-gozlemevi-ziyaret', 'TUG Ulusal Gözlemevi Halka Açık Ziyaret Günü', 'halk-gozlemi', 'published'::app.event_status, 'Antalya', 'Bakırlıtepe — TÜBİTAK Ulusal Gözlemevi', 36.8247, 30.3353, '2026-09-19T14:00:00+03:00'::timestamptz, '2026-09-19T23:00:00+03:00'::timestamptz, true, false, true, false, true, 120, 'Ulusal Gözlemevi Tanıtım Ekibi', true, 'Türkiye''nin en büyük optik teleskoplarının bulunduğu 2500 m rakımlı tepede rehberli tur ve akşam gözlemi. Kontenjan sınırlıdır, kayıt zorunludur.', array['Satürn', 'M 13', 'M 57', 'Ay']::text[], array['Yola özel araçla çıkış izne tabidir; ring servisi kullanılır.']::text[], 'Kurum duyurusu', '2026-07-22'::date),
  ('ankara-astrofoto-atolyesi', 'Görüntü İşleme Atölyesi: Kalibrasyon ve Yığınlama', 'atolye', 'published'::app.event_status, 'Ankara', 'ODTÜ Kültür ve Kongre Merkezi', 39.8917, 32.7833, '2026-09-05T10:00:00+03:00'::timestamptz, '2026-09-05T17:00:00+03:00'::timestamptz, false, false, false, true, false, 40, 'Ankara Astrofotoğraf Grubu', true, 'Dark, flat ve bias''ın ne işe yaradığını gerçek veriyle adım adım işliyoruz. Katılımcılar kendi ham kayıtlarını getirebilir; Siril ve PixInsight akışları paralel gösterilir.', '{}'::text[], array['Dizüstü bilgisayar getirmek gerekir.']::text[], 'Organizatör bildirimi', '2026-07-15'::date),
  ('bursa-uludag-gozlem-senligi', 'Uludağ Gözlem Şenliği', 'gozlem-senligi', 'published'::app.event_status, 'Bursa', 'Uludağ Sarıalan Mevkii', 40.0994, 29.1608, '2026-08-29T17:00:00+03:00'::timestamptz, '2026-08-30T07:00:00+03:00'::timestamptz, true, true, true, false, true, 200, 'Bursa Astronomi Derneği', true, 'Marmara''nın en erişilebilir karanlık noktasında toplu gözlem. Yirmiye yakın teleskop kurulur; ekipmanı olmayanlar sıraya girerek gözlem yapabilir.', array['Satürn', 'M 31', 'M 13', 'Albireo']::text[], array['Araç farları alan içinde kapalı; park girişte.']::text[], 'Dernek duyurusu', '2026-07-19'::date),
  ('van-karanlik-gokyuzu-kampi', 'Van Gölü Karanlık Gökyüzü Kampı', 'astrofoto-kampi', 'published'::app.event_status, 'Van', 'Gevaş Sahil Kamp Alanı', 38.2947, 43.1053, '2026-10-09T16:00:00+03:00'::timestamptz, '2026-10-11T10:00:00+03:00'::timestamptz, false, true, false, true, false, 35, 'Doğu Anadolu Gökyüzü İnisiyatifi', false, 'Bortle 2–3 gökyüzü altında iki gecelik çekim kampı. Göl yüzeyi ufku açtığı için düşük deklinasyonlu hedefler bu sahada erişilebilir.', array['Samanyolu merkezi', 'NGC 7000', 'M 33']::text[], array['Jeneratör yasak; taşınabilir güç istasyonu kullanın.']::text[], 'Organizatör bildirimi', '2026-07-21'::date),
  ('izmir-cocuk-gokyuzu-atolyesi', 'Çocuklar İçin Gökyüzü Atölyesi', 'cocuk-aile', 'published'::app.event_status, 'İzmir', 'İzmir Bilim Merkezi', 38.4622, 27.2167, '2026-08-08T13:00:00+03:00'::timestamptz, '2026-08-08T16:00:00+03:00'::timestamptz, true, false, true, false, true, 50, 'İzmir Bilim Merkezi', true, '7–12 yaş grubuna yönelik atölye: takımyıldız kartı yapımı, ay yüzeyi maketi ve güvenli güneş gözlemi. Veli katılımı serbesttir.', array['Güneş']::text[], '{}'::text[], 'Kurum duyurusu', '2026-07-12'::date),
  ('trabzon-planetaryum-gecesi', 'Planetaryum Gecesi: Kış Gökyüzü', 'planetaryum', 'published'::app.event_status, 'Trabzon', 'Trabzon Bilim Merkezi Planetaryumu', 41.0027, 39.7168, '2026-11-14T19:00:00+03:00'::timestamptz, '2026-11-14T21:30:00+03:00'::timestamptz, false, false, true, false, false, 90, 'Trabzon Bilim Merkezi', true, 'Kubbe altında kış gökyüzü turu ve ardından hava açıksa terasta teleskop gözlemi. Karadeniz''de kapalı hava riski yüksek olduğu için program kubbe odaklı kurgulandı.', array['Orion Bulutsusu', 'Pleiades']::text[], '{}'::text[], 'Kurum duyurusu', '2026-07-16'::date),
  ('konya-mera-gozlem-gecesi', 'Karapınar Mera Gözlem Gecesi', 'gozlem-senligi', 'published'::app.event_status, 'Konya', 'Karapınar Meke Çevresi', 37.6833, 33.55, '2026-09-12T19:00:00+03:00'::timestamptz, '2026-09-13T04:00:00+03:00'::timestamptz, true, true, true, true, true, null, 'Konya Gökyüzü Gözlemcileri', false, 'İç Anadolu''nun düz ufku ve kuru havası, geniş alan çekimleri için avantaj. Ay yeni ay evresinde; Samanyolu merkezi gece başında hâlâ yüksekte.', array['Samanyolu', 'M 8', 'M 20', 'Satürn']::text[], array['Alan mera vasfındadır; çöp bırakılmaz, ateş yakılmaz.']::text[], 'Topluluk paylaşımı', '2026-07-11'::date),
  ('canakkale-tutulma-gozlemi', 'Parçalı Güneş Tutulması Gözlemi', 'gunes-gozlemi', 'published'::app.event_status, 'Çanakkale', 'Kilitbahir Sahil Parkı', 40.1442, 26.3789, '2026-08-12T11:00:00+03:00'::timestamptz, '2026-08-12T15:00:00+03:00'::timestamptz, true, false, true, true, true, null, 'Çanakkale Astronomi Topluluğu', true, '12 Ağustos 2026 güneş tutulması Türkiye''den parçalı izlenecek. Güvenli gözlem gözlükleri ve filtreli teleskoplar alanda dağıtılır.', array['Güneş']::text[], array['Filtresiz teleskop/dürbün kesinlikle kullanılmaz.', 'Gözlük olmadan güneşe bakılmaz — kalıcı görme kaybı riski vardır.']::text[], 'Topluluk duyurusu', '2026-07-23'::date)
on conflict (slug) do update set
  title = excluded.title,
  event_type = excluded.event_type,
  city = excluded.city,
  venue = excluded.venue,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  free = excluded.free,
  camping = excluded.camping,
  kids_friendly = excluded.kids_friendly,
  astrophoto_focused = excluded.astrophoto_focused,
  telescopes_provided = excluded.telescopes_provided,
  capacity = excluded.capacity,
  organizer_name = excluded.organizer_name,
  organizer_verified = excluded.organizer_verified,
  description = excluded.description,
  observed_targets = excluded.observed_targets,
  rules = excluded.rules,
  source_name = excluded.source_name,
  source_last_verified_at = excluded.source_last_verified_at;

-- ══════════════════════════════════════════════════════════════════════
-- ETKİNLİK PROGRAMLARI
-- ══════════════════════════════════════════════════════════════════════
delete from public.event_sessions where event_id in (
  select id from public.events where slug in ('perseid-2026', 'karanlik-gokyuzu', 'halk-gozlemi', 'gunes-gozlemi-izmir', 'astronomi-101-webinar', 'orionid-kapadokya', 'geminid-2026-erciyes', 'tubitak-ulusal-gozlemevi-ziyaret', 'ankara-astrofoto-atolyesi', 'bursa-uludag-gozlem-senligi', 'van-karanlik-gokyuzu-kampi', 'izmir-cocuk-gokyuzu-atolyesi', 'trabzon-planetaryum-gecesi', 'konya-mera-gozlem-gecesi', 'canakkale-tutulma-gozlemi')
);

insert into public.event_sessions (event_id, starts_at, title, speaker, position) values
  ((select id from public.events where slug = 'perseid-2026'), '18:00', 'Kamp kurulumu ve karşılama', null, 0),
  ((select id from public.events where slug = 'perseid-2026'), '20:30', 'Perseidler nereden gelir?', 'Dr. A. Kaya', 1),
  ((select id from public.events where slug = 'perseid-2026'), '22:00', 'Çıplak gözle gözlem ve sayım pratiği', null, 2),
  ((select id from public.events where slug = 'perseid-2026'), '00:30', 'Teleskoplarla gezegen turu (Satürn, Jüpiter)', null, 3),
  ((select id from public.events where slug = 'perseid-2026'), '04:30', 'Zirve saati toplu gözlem', null, 4),
  ((select id from public.events where slug = 'karanlik-gokyuzu'), '1. Gün 16:00', 'Kurulum ve backfocus kontrolü', null, 0),
  ((select id from public.events where slug = 'karanlik-gokyuzu'), '1. Gün 21:00', 'Gece çekimi: Ha hedefleri', null, 1),
  ((select id from public.events where slug = 'karanlik-gokyuzu'), '2. Gün 10:00', 'WBPP ile kalibrasyon', 'D. Arslan', 2),
  ((select id from public.events where slug = 'karanlik-gokyuzu'), '2. Gün 21:00', 'Gece çekimi: OIII/SII', null, 3),
  ((select id from public.events where slug = 'halk-gozlemi'), '20:00', 'Kurulum ve Ay gözlemi', null, 0),
  ((select id from public.events where slug = 'halk-gozlemi'), '21:30', 'Satürn ve Jüpiter', null, 1),
  ((select id from public.events where slug = 'halk-gozlemi'), '22:30', 'Çift yıldızlar ve kapanış', null, 2),
  ((select id from public.events where slug = 'gunes-gozlemi-izmir'), '11:00', 'Güneş güvenliği anlatımı', null, 0),
  ((select id from public.events where slug = 'gunes-gozlemi-izmir'), '11:30', 'H-alfa ve beyaz ışık gözlemi', null, 1),
  ((select id from public.events where slug = 'astronomi-101-webinar'), '21:00', 'Sunum + soru/cevap', 'C. Demir', 0),
  ((select id from public.events where slug = 'orionid-kapadokya'), '20:00', 'Karşılama ve alan kurulumu', null, 0),
  ((select id from public.events where slug = 'orionid-kapadokya'), '21:30', 'Meteor yağmuru nasıl sayılır?', 'E. Yıldırım', 1),
  ((select id from public.events where slug = 'orionid-kapadokya'), '23:00', 'Geniş açı astrofoto istasyonu', null, 2),
  ((select id from public.events where slug = 'orionid-kapadokya'), '02:00', 'Zirve gözlemi', null, 3),
  ((select id from public.events where slug = 'geminid-2026-erciyes'), '18:00', 'Kamp kurulumu, sıcak içecek', null, 0),
  ((select id from public.events where slug = 'geminid-2026-erciyes'), '20:00', 'Kışın astrofotoğraf: pil, çiy, odak kayması', null, 1),
  ((select id from public.events where slug = 'geminid-2026-erciyes'), '22:00', 'Gözlem ve sayım', null, 2),
  ((select id from public.events where slug = 'tubitak-ulusal-gozlemevi-ziyaret'), '14:00', 'Kubbe turu ve teleskop tanıtımı', null, 0),
  ((select id from public.events where slug = 'tubitak-ulusal-gozlemevi-ziyaret'), '17:30', 'Gün batımı ve güneş gözlemi', null, 1),
  ((select id from public.events where slug = 'tubitak-ulusal-gozlemevi-ziyaret'), '20:00', 'Gece gözlemi: Satürn, M13, M57', null, 2),
  ((select id from public.events where slug = 'ankara-astrofoto-atolyesi'), '10:00', 'Kalibrasyon kareleri: neden ve nasıl', null, 0),
  ((select id from public.events where slug = 'ankara-astrofoto-atolyesi'), '13:00', 'Yığınlama ve hizalama', null, 1),
  ((select id from public.events where slug = 'ankara-astrofoto-atolyesi'), '15:00', 'Streç, gürültü, renk kalibrasyonu', null, 2),
  ((select id from public.events where slug = 'bursa-uludag-gozlem-senligi'), '17:00', 'Alan açılışı', null, 0),
  ((select id from public.events where slug = 'bursa-uludag-gozlem-senligi'), '19:30', 'Gökyüzü turu (lazer işaretli)', null, 1),
  ((select id from public.events where slug = 'bursa-uludag-gozlem-senligi'), '21:00', 'Teleskop istasyonları', null, 2),
  ((select id from public.events where slug = 'van-karanlik-gokyuzu-kampi'), '16:00', 'Kamp kurulumu ve kutupsal hizalama', null, 0),
  ((select id from public.events where slug = 'van-karanlik-gokyuzu-kampi'), '21:00', 'Hedef seçimi ve kadraj planlama', null, 1),
  ((select id from public.events where slug = 'van-karanlik-gokyuzu-kampi'), '01:00', 'Gece yarısı hedef değişimi', null, 2),
  ((select id from public.events where slug = 'izmir-cocuk-gokyuzu-atolyesi'), '13:00', 'Takımyıldız kartı atölyesi', null, 0),
  ((select id from public.events where slug = 'izmir-cocuk-gokyuzu-atolyesi'), '14:30', 'Güvenli güneş gözlemi', null, 1),
  ((select id from public.events where slug = 'trabzon-planetaryum-gecesi'), '19:00', 'Kubbe gösterimi: Kış Üçgeni', null, 0),
  ((select id from public.events where slug = 'trabzon-planetaryum-gecesi'), '20:30', 'Teras gözlemi (hava uygunsa)', null, 1),
  ((select id from public.events where slug = 'konya-mera-gozlem-gecesi'), '19:00', 'Alan buluşması', null, 0),
  ((select id from public.events where slug = 'konya-mera-gozlem-gecesi'), '21:00', 'Samanyolu geniş açı çekim istasyonu', null, 1),
  ((select id from public.events where slug = 'canakkale-tutulma-gozlemi'), '11:00', 'Güvenlik anlatımı ve gözlük dağıtımı', null, 0),
  ((select id from public.events where slug = 'canakkale-tutulma-gozlemi'), '12:30', 'Tutulma gözlemi ve projeksiyon', null, 1);

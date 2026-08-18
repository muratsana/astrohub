-- ═══════════════════════════════════════════════════════════════════════
-- GÖZLEM NOKTALARI — TOHUM DİZİSİNDEN VERİTABANINA
--
-- `/saha` sayfası aylardır tohum diziyi gösteriyordu, veritabanını değil.
-- Sebebi A12'de bulundu: liste sorgusu tabloda olmayan dört kolon
-- istiyor ve PostgREST 400 dönüyordu; katalog katmanı hataya düşünce
-- tohuma geri çekiliyor ve sayfa DOLU görünüyordu. Yani kimse bir şey
-- fark etmedi.
--
-- Kolonlar 20260818210000 ile eklendi ve sorgu düzeldi. Ama düzelmesiyle
-- birlikte yeni bir sorun doğdu: tabloda yalnızca DÖRT saha vardı, tohum
-- dizide on beş. Sorguyu düzeltmek, sayfayı on beş sahadan dörde
-- düşürecekti.
--
-- `selectContent` kuralı açık ve doğru: sorgu başarılıysa veritabanı
-- OTORİTEDİR, tohum yalnızca ilk boyama içindir. O hâlde yapılacak şey
-- tohuma geri dönmek değil, veritabanını gerçekten doldurmak.
--
-- ══════════════════════════════════════════════════════════════════════
-- PUANLAR TAŞINMIYOR
--
-- Tohum dizideki `rating` ve `reviewCount` demo değerler. `site_reviews`
-- tetikleyicisi bu iki kolonu kendisi türetiyor; elle yazılan bir puan,
-- olmayan değerlendirmeyi var göstermek olurdu. Sıfır doğru cevaptır.
--
-- `warnings` NOT NULL: uyarısı olmayan sahada boş dizi yazılıyor.
-- `null` denendi ve kısıt reddetti — kolonun sözleşmesi "uyarı listesi
-- yok" değil, "uyarı listesi boş".
--
-- ON CONFLICT: dosya yeniden çalıştırılabilir. Var olan dört kaydın
-- kullanıcı tarafından düzenlenmiş olabileceği alanlar da dâhil hepsi
-- tohumdaki hâline çekilir — bu bilinçli, çünkü bunlar editör içeriği.
-- ═══════════════════════════════════════════════════════════════════════

insert into public.observing_sites (
  slug, name, region, status,
  approx_latitude, approx_longitude, altitude_m, bortle, sqm,
  road_access, south_horizon, best_months,
  has_water, has_toilet, has_electricity, has_cell_signal,
  has_tent_area, caravan_ok,
  description, warnings,
  image_url, image_credit, image_licence, source_urls
) values
  ('saklikent-antalya', 'Saklıkent Gözlem Alanı', 'Antalya', 'yayinda'::app.content_status, 36.8247, 30.3353, 1850, 3, 21.6, 'Kısmen asfalt', 'Açık', 'Mayıs – Ekim', true, true, true, true, true, true, 'TÜBİTAK Ulusal Gözlemevi yakınındaki plato; asfalt erişim ve tesis olanaklarıyla Türkiye''nin en erişilebilir karanlık gökyüzü noktalarından. Yaz gecelerinde bile serin olur.', array['Yaz hafta sonları kalabalık olabilir; erken yer tutun.']::text[], 'https://commons.wikimedia.org/wiki/Special:FilePath/TUG%20full%20site.jpg?width=1200', 'Wikimedia Commons — Azizkayihan', 'CC BY-SA 4.0', '[{"label": "TÜBİTAK Ulusal Gözlemevi / Bakırlıtepe görsel kaydı", "url": "https://commons.wikimedia.org/wiki/File:TUG_full_site.jpg"}, {"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=36.8247&lon=30.3353"}]'::jsonb),
  ('palandoken-yaylasi', 'Palandöken Yaylası', 'Erzurum', 'yayinda'::app.content_status, 39.8508, 41.2417, 2400, 2, 21.9, 'Stabilize', 'Açık', 'Haziran – Eylül', false, false, false, true, true, false, 'Doğu Anadolu''nun en karanlık gökyüzülerinden; SQM 21.9 ölçümleriyle narrowband gerektirmeyen doğal kontrast. Tesis yok — tam donanımlı gelin.', array['Gece sıcaklığı yazın bile 5°C altına düşebilir.', 'Son 3 km stabilize yol; yağışta zorlaşır.']::text[], null, null, null, '[{"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=39.8508&lon=41.2417"}]'::jsonb),
  ('camlidere-ankara', 'Çamlıdere Gözlem Noktası', 'Ankara', 'yayinda'::app.content_status, 40.4886, 32.4728, 1250, 4, 21.2, 'Asfalt', 'Kısmen açık', 'Nisan – Kasım', true, false, false, true, true, true, 'Ankara''ya 1 saat mesafede hafta sonu kaçamağı; başkentin ışık kubbesi kuzey ufkunu etkiler ama güney hedefleri için yeterli karanlık sunar.', '{}'::text[], null, null, null, '[{"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=40.4886&lon=32.4728"}]'::jsonb),
  ('goreme-nevsehir', 'Göreme Kırsalı', 'Nevşehir', 'yayinda'::app.content_status, 38.6431, 34.8289, 1100, 3, 21.4, 'Stabilize', 'Açık', 'Nisan – Ekim', false, false, false, true, true, true, 'Peribacaları silüetiyle gece manzarası fotoğrafçılığının Türkiye''deki başkenti. Turistik bölgeden 10-15 dk uzaklaşınca Bortle 3 gökyüzü.', array['Balon uçuş sabahları erken saatte araç trafiği başlar.']::text[], 'https://commons.wikimedia.org/wiki/Special:FilePath/Night%20in%20goreme%2003.jpg?width=1200', 'Wikimedia Commons — Ramazancirakoglu', 'CC BY-SA 4.0', '[{"label": "Göreme gece görseli ve EXIF kaydı", "url": "https://commons.wikimedia.org/wiki/File:Night_in_goreme_03.jpg"}, {"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=38.6431&lon=34.8289"}]'::jsonb),
  ('uludag-sarialan-bursa', 'Uludağ Sarıalan', 'Bursa', 'yayinda'::app.content_status, 40.1048, 29.1433, 1620, 4, 21.05, 'Asfalt', 'Kısmen açık', 'Mayıs – Ekim', true, true, false, true, true, true, 'Bursa''ya yakın, erişimi kolay ve kamp altyapısı olan yüksek orman kuşağı. Kuzeybatıdaki şehir ışığı belirgin; gökyüzü kalitesi için açık ve kuru geceleri seçin.', array['Milli park kuralları ve kamp alanı yoğunluğu önceden kontrol edilmeli.']::text[], 'https://commons.wikimedia.org/wiki/Special:FilePath/Uluda%C4%9F%20Sar%C4%B1alan%20view.jpg?width=1200', 'Wikimedia Commons — Uludağ Sarıalan', 'CC BY-SA', '[{"label": "Uludağ Milli Parkı / Sarıalan medya kaydı", "url": "https://commons.wikimedia.org/wiki/Category:Uluda%C4%9F_National_Park"}, {"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=40.1048&lon=29.1433"}]'::jsonb),
  ('topuklu-yaylasi-denizli', 'Topuklu Yaylası', 'Denizli', 'yayinda'::app.content_status, 37.1992, 28.8486, 1700, 2, 21.82, 'Stabilize', 'Açık', 'Haziran – Eylül', true, true, false, true, true, false, 'Beyağaç çevresindeki yüksek yayla hattı; Ege iç kesimlerinde şehir ışığından kaçmak için güçlü bir seçenek. Saha kurulumu için rüzgâr ve nem tahminini kontrol edin.', array['Son bölüm stabilize olabilir; yağış sonrası zemin değişir.']::text[], null, null, null, '[{"label": "DarkSky International Türkiye karanlık gökyüzü parkı haberi", "url": "https://darksky.org/news/turkiyes-first-international-dark-sky-park-is-certified/"}, {"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=37.1992&lon=28.8486"}]'::jsonb),
  ('meke-golu-konya', 'Meke Gölü Kırsalı', 'Konya', 'yayinda'::app.content_status, 37.6861, 33.6403, 981, 3, 21.45, 'Kısmen asfalt', 'Açık', 'Nisan – Ekim', false, false, false, true, true, true, 'Karapınar''ın düz ufuklu volkanik platosu; geniş güney ufku ve düşük yerleşim yoğunluğu nedeniyle meteor yağmuru ve geniş açı çekimler için uygun.', array['Koruma statüsü ve yerel erişim kısıtları kontrol edilmeli.']::text[], 'https://commons.wikimedia.org/wiki/Special:FilePath/Meke%20Lake.jpg?width=1200', 'Wikimedia Commons — .ilay.bulut', 'CC BY-SA 4.0', '[{"label": "Meke Gölü koordinat/rakım ve görsel kaydı", "url": "https://commons.wikimedia.org/wiki/File:Meke_Lake.jpg"}, {"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=37.6861&lon=33.6403"}]'::jsonb),
  ('tuz-golu-sereflikochisar', 'Tuz Gölü Doğu Kıyısı', 'Ankara', 'yayinda'::app.content_status, 38.9306, 33.4375, 905, 3, 21.35, 'Kısmen asfalt', 'Açık', 'Mayıs – Ekim', false, false, false, true, true, true, 'Düz ufuk isteyen panorama, meteor ve ay tutulması çekimleri için güçlü bir İç Anadolu alternatifi. Yazın sıcaklık farkı ve toz riski hesaba katılmalı.', array['Göl kıyısında zemin yumuşak olabilir; araçla rastgele giriş yapmayın.']::text[], null, null, null, '[{"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=38.9306&lon=33.4375"}]'::jsonb),
  ('salda-golu-burdur', 'Salda Gölü Çevresi', 'Burdur', 'yayinda'::app.content_status, 37.5342, 29.6459, 1193, 3, 21.38, 'Asfalt', 'Açık', 'Mayıs – Ekim', true, true, false, true, true, true, 'Göl çevresi gece manzarası ve geniş açı Samanyolu çekimleri için uygun; koruma alanı kuralları nedeniyle yalnız izinli alanlarda kurulum yapılmalı.', array['Kıyı koruma kurallarına uyun; hassas alanlara tripod/araç sokmayın.']::text[], 'https://commons.wikimedia.org/wiki/Special:FilePath/Lake%20Salda.jpg?width=1200', 'Wikimedia Commons — Huanforu', 'CC BY-SA 4.0', '[{"label": "Salda Gölü koordinat/rakım ve görsel kaydı", "url": "https://commons.wikimedia.org/wiki/File:Lake_Salda.jpg"}, {"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=37.5342&lon=29.6459"}]'::jsonb),
  ('davraz-isparta', 'Davraz Dağı Yayla Hattı', 'Isparta', 'yayinda'::app.content_status, 37.7545, 30.7269, 1650, 3, 21.42, 'Asfalt', 'Kısmen açık', 'Haziran – Eylül', false, false, false, true, true, true, 'Isparta şehir ışığından uzaklaşmak isteyenler için yüksek rakımlı ve erişimi makul bir seçenek. Kış aylarında yol ve buzlanma riski yüksektir.', array['Kayak sezonunda araç trafiği ve tesis ışıkları artar.']::text[], 'https://commons.wikimedia.org/wiki/Special:FilePath/Davraz%202024.jpg?width=1200', 'Wikimedia Commons — Mount Davraz', 'CC BY-SA', '[{"label": "Davraz Dağı koordinat/rakım medya kaydı", "url": "https://commons.wikimedia.org/wiki/Category:Mount_Davraz"}, {"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=37.7545&lon=30.7269"}]'::jsonb),
  ('nemrut-krater-bitlis', 'Nemrut Krater Gölü', 'Bitlis', 'yayinda'::app.content_status, 38.6396, 42.2481, 2250, 2, 21.78, 'Stabilize', 'Açık', 'Haziran – Eylül', false, false, false, true, true, false, 'Doğu Anadolu''da çok karanlık gökyüzü ve yüksek rakım sunan krater çevresi. Hava hızlı değişir; yalnız gidilmemeli ve yerel yol durumu teyit edilmeli.', array['Soğuk, rüzgâr ve vahşi yaşam riski için hazırlıklı olun.']::text[], 'https://commons.wikimedia.org/wiki/Special:FilePath/Nemrut%20Lake.jpg?width=1200', 'Wikimedia Commons — Fatih YILMAZ', 'CC BY-SA', '[{"label": "Nemrut Krater Gölü koordinat/görsel kaydı", "url": "https://commons.wikimedia.org/wiki/File:Nemrut_Lake.jpg"}, {"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=38.6396&lon=42.2481"}]'::jsonb),
  ('demirkazik-aladaglar', 'Aladağlar Demirkazık', 'Niğde', 'yayinda'::app.content_status, 37.8389, 35.1481, 1600, 2, 21.86, 'Kısmen asfalt', 'Açık', 'Haziran – Eylül', false, false, false, true, true, false, 'Aladağlar''ın kuru ve yüksek plato havası dar bant dışı derin uzay çekimleri için güçlü kontrast verir. Dağ koşulları nedeniyle hava ve rüzgâr kritik.', array['Gece sıcaklığı hızlı düşer; dağ güvenliği ekipmanı alın.']::text[], null, null, null, '[{"label": "Demirkazık koordinat/rakım kaydı", "url": "https://mapcarta.com/12980044"}, {"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=37.8389&lon=35.1481"}]'::jsonb),
  ('karagol-sahara-artvin', 'Karagöl Sahara Kırsalı', 'Artvin', 'yayinda'::app.content_status, 41.3137, 42.4728, 1550, 3, 21.55, 'Stabilize', 'Kısmen açık', 'Temmuz – Eylül', true, true, false, false, true, false, 'Karadeniz''de ışık kirliliği düşük, fakat bulut/nem riski yüksek bir saha. Şeffaflık tahmini iyi olduğunda geniş açı ve manzara astrofotoğrafı için değerli.', array['Nem, sis ve kapalı hava sık görülür; tahminleri yakından izleyin.']::text[], null, null, null, '[{"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=41.3137&lon=42.4728"}]'::jsonb),
  ('kazdaglari-sarikiz', 'Kazdağları Sarıkız Hattı', 'Balıkesir', 'yayinda'::app.content_status, 39.7103, 26.8392, 1450, 4, 21.08, 'Stabilize', 'Kısmen açık', 'Haziran – Eylül', false, false, false, true, true, false, 'Kuzey Ege''de şehirlerden uzaklaşmak için pratik bir yüksek rota. Nem ve orman yangını riskleri nedeniyle izin, yol ve hava durumu kontrolü şart.', array['Milli park/orman erişim kuralları dönemsel değişebilir.']::text[], null, null, null, '[{"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=39.7103&lon=26.8392"}]'::jsonb),
  ('karadag-karaman', 'Karadağ Volkanik Platosu', 'Karaman', 'yayinda'::app.content_status, 37.3837, 33.1542, 1650, 3, 21.58, 'Stabilize', 'Açık', 'Nisan – Ekim', false, false, false, true, true, false, 'Karaman-Konya hattında geniş ufuklu, kuru ve düşük yerleşimli plato. Özellikle güney gökyüzü ve uzun odak derin uzay çekimleri için dengeli bir seçenek.', array['Arazi yolları gece yön bulmayı zorlaştırabilir; gündüz keşif yapın.']::text[], null, null, null, '[{"label": "LightPollutionMap koordinat kontrolü", "url": "https://lightpollutionmap.app/#zoom=8&lat=37.3837&lon=33.1542"}]'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  region = excluded.region,
  status = excluded.status,
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
  warnings = excluded.warnings,
  image_url = excluded.image_url,
  image_credit = excluded.image_credit,
  image_licence = excluded.image_licence,
  source_urls = excluded.source_urls;

-- 02_ornek-icerik.sql — EDİTÖRYEL İÇERİK ANLIK GÖRÜNTÜSÜ. Üretilmiş dosya.
--
-- Yeniden üretmek için:  npm run katalog:disa-aktar
--
-- ══════════════════════════════════════════════════════════════════════════
-- KATALOGDAN NEDEN AYRI
--
-- `01_katalog.sql` fizik: bir teleskopun odak uzaklığı ya da M31'in
-- sağaçıklığı ortama göre değişmez. Buradaki veri ise EDİTÖRYEL —
-- etkinlikler, oturumlar, gözlem noktaları ve ölçümleri. Site sahibi
-- bunları panelden girer, tarihleri geçer, yenileri eklenir.
--
-- İkisini aynı dosyaya koymak, depoyu her etkinlik eklendiğinde bayatlayan
-- bir kopya taşımaya zorlardı — ve o kopya bir gün üretimin üstüne yazılıp
-- gerçek içeriği geri alırdı. Ayrı dosya bu riski bir tercihe çeviriyor:
-- staging ve yerel geliştirmede yükle, üretimde YÜKLEME.
--
-- `npm run db:seed` bu dosyayı ATLAR; yüklemek için açıkça
-- `npm run db:seed -- --ornek-icerik` demek gerekir.
-- ══════════════════════════════════════════════════════════════════════════

begin;

-- ── Etkinlikler ──

insert into public.events (id, slug, title, event_type, status, city, venue, latitude, longitude, starts_at, ends_at, free, camping, kids_friendly, astrophoto_focused, telescopes_provided, capacity, registered_count, organizer_id, organizer_name, organizer_verified, description, observed_targets, rules, source_name, source_last_verified_at) values
  ('b9a1c3d3-2fd1-4dfe-82a8-95a82473d838', 'ankara-astrofoto-atolyesi', 'Görüntü İşleme Atölyesi: Kalibrasyon ve Yığınlama', 'atolye', 'published', 'Ankara', 'ODTÜ Kültür ve Kongre Merkezi', '39.891700', '32.783300', '2026-09-05 07:00:00+00', '2026-09-05 14:00:00+00', 'false', 'false', 'false', 'true', 'false', '40', '0', NULL, 'Ankara Astrofotoğraf Grubu', 'true', 'Dark, flat ve bias''ın ne işe yaradığını gerçek veriyle adım adım işliyoruz. Katılımcılar kendi ham kayıtlarını getirebilir; Siril ve PixInsight akışları paralel gösterilir.', '{}', '{"Dizüstü bilgisayar getirmek gerekir."}', 'Organizatör bildirimi', '2026-07-15'),
  ('bf1b496b-9deb-49d7-bd82-fea65e9c5c3a', 'astronomi-101-webinar', 'Astronomiye Giriş: Ekipman Seçimi Webinarı', 'webinar', 'published', 'Online', 'Canlı yayın', NULL, NULL, '2026-07-30 18:00:00+00', NULL, 'true', 'false', 'false', 'true', 'false', NULL, '0', NULL, 'Astrohub Eğitim', 'true', 'İlk teleskop ve ilk astrofoto setup''ı seçerken en sık yapılan hatalar; bütçe senaryolarıyla montür-öncelikli yaklaşım.', '{}', '{}', 'Organizatör bildirimi', '2026-07-14'),
  ('7222999d-60ee-45f8-820e-9229e4fd621f', 'bursa-uludag-gozlem-senligi', 'Uludağ Gözlem Şenliği', 'gozlem-senligi', 'published', 'Bursa', 'Uludağ Sarıalan Mevkii', '40.099400', '29.160800', '2026-08-29 14:00:00+00', '2026-08-30 04:00:00+00', 'true', 'true', 'true', 'false', 'true', '200', '0', NULL, 'Bursa Astronomi Derneği', 'true', 'Marmara''nın en erişilebilir karanlık noktasında toplu gözlem. Yirmiye yakın teleskop kurulur; ekipmanı olmayanlar sıraya girerek gözlem yapabilir.', '{Satürn,"M 31","M 13",Albireo}', '{"Araç farları alan içinde kapalı; park girişte."}', 'Dernek duyurusu', '2026-07-19'),
  ('b7d44a95-5dc6-45f7-9549-5ab0bd49bbd9', 'canakkale-tutulma-gozlemi', 'Parçalı Güneş Tutulması Gözlemi', 'gunes-gozlemi', 'published', 'Çanakkale', 'Kilitbahir Sahil Parkı', '40.144200', '26.378900', '2026-08-12 08:00:00+00', '2026-08-12 12:00:00+00', 'true', 'false', 'true', 'true', 'true', NULL, '0', NULL, 'Çanakkale Astronomi Topluluğu', 'true', '12 Ağustos 2026 güneş tutulması Türkiye''den parçalı izlenecek. Güvenli gözlem gözlükleri ve filtreli teleskoplar alanda dağıtılır.', '{Güneş}', '{"Filtresiz teleskop/dürbün kesinlikle kullanılmaz.","Gözlük olmadan güneşe bakılmaz — kalıcı görme kaybı riski vardır."}', 'Topluluk duyurusu', '2026-07-23'),
  ('40999918-53c6-4656-816e-29758060dc6c', 'geminid-2026-erciyes', 'Geminid Meteor Yağmuru Kampı', 'meteor-yagmuru', 'published', 'Kayseri', 'Erciyes Yaylası', '38.533300', '35.450000', '2026-12-13 15:00:00+00', '2026-12-14 03:00:00+00', 'false', 'true', 'false', 'true', 'false', '60', '0', NULL, 'Erciyes Astronomi Kulübü', 'true', 'Yılın en yoğun meteor yağmuru, 2000 m rakımda ve kuru kış havasında. Geminidler yavaş ve parlak; geniş açı çekim için en verimli gece.', '{"Geminid meteorları",Orion,"Kış Üçgeni"}', '{"Gece −15°C görülebilir; kışlık uyku tulumu zorunlu."}', 'Organizatör bildirimi', '2026-07-18'),
  ('89b7aa46-724e-48c9-a9ae-0d16fd81fd3b', 'gunes-gozlemi-izmir', 'H-alfa ile Güneş Gözlemi', 'gunes-gozlemi', 'published', 'İzmir', 'Kültürpark', '38.423700', '27.142800', '2026-09-06 08:00:00+00', NULL, 'true', 'false', 'true', 'false', 'true', NULL, '0', NULL, 'Ege Üniversitesi Astronomi Kulübü', 'true', 'Özel H-alfa teleskoplarıyla güneş lekeleri ve protuberansları güvenle gözlemliyoruz. Güneşe asla çıplak gözle veya filtresiz teleskopla bakılmaz; tüm ekipman kulüp tarafından sağlanır.', '{"Güneş lekeleri",Protuberanslar}', '{}', 'Kulüp duyurusu', '2026-07-01'),
  ('ca53c7e2-15a4-4da2-becc-19df4afbb1db', 'halk-gozlemi', 'Halka Açık Teleskop Gözlemi', 'halk-gozlemi', 'published', 'İstanbul', 'Maltepe Sahil Parkı', '40.923900', '29.131500', '2026-08-28 17:00:00+00', NULL, 'true', 'false', 'true', 'false', 'true', NULL, '0', NULL, 'İstanbul Gökyüzü Gönüllüleri', 'false', 'Şehir merkezinde herkese açık gözlem akşamı. 6 teleskopla Ay kraterleri, Satürn halkaları ve çift yıldızlar. Kayıt gerekmez, çocuklar için kısa anlatım köşesi bulunur.', '{Ay,Satürn,Jüpiter,Albireo}', '{}', 'Kullanıcı önerisi + editör onayı', '2026-07-12'),
  ('8b16dc49-c3f4-4d81-89ed-2b138f116596', 'izmir-cocuk-gokyuzu-atolyesi', 'Çocuklar İçin Gökyüzü Atölyesi', 'cocuk-aile', 'published', 'İzmir', 'İzmir Bilim Merkezi', '38.462200', '27.216700', '2026-08-08 10:00:00+00', '2026-08-08 13:00:00+00', 'true', 'false', 'true', 'false', 'true', '50', '0', NULL, 'İzmir Bilim Merkezi', 'true', '7–12 yaş grubuna yönelik atölye: takımyıldız kartı yapımı, ay yüzeyi maketi ve güvenli güneş gözlemi. Veli katılımı serbesttir.', '{Güneş}', '{}', 'Kurum duyurusu', '2026-07-12'),
  ('8964aef0-e959-472b-9472-8c45e5f1a4bc', 'karanlik-gokyuzu', 'Karanlık Gökyüzü Astrofotoğraf Atölyesi', 'astrofoto-kampi', 'published', 'Erzurum', 'Palandöken Yaylası', '39.850800', '41.241700', '2026-08-20 13:00:00+00', '2026-08-22 07:00:00+00', 'false', 'true', 'false', 'true', 'false', '30', '0', NULL, 'DeepSky Türkiye', 'true', 'İki gecelik uygulamalı atölye: kurulum, polar alignment, guiding, SHO veri toplama ve sabah oturumlarında işleme. Kendi ekipmanınızla katılım esastır; SQM 21.9 gökyüzü.', '{"NGC 7000","IC 1396","Sadr bölgesi"}', '{}', 'Organizatör bildirimi', '2026-07-08'),
  ('bd2a3b40-e60c-4d53-a0c8-49147ad6e967', 'konya-mera-gozlem-gecesi', 'Karapınar Mera Gözlem Gecesi', 'gozlem-senligi', 'published', 'Konya', 'Karapınar Meke Çevresi', '37.683300', '33.550000', '2026-09-12 16:00:00+00', '2026-09-13 01:00:00+00', 'true', 'true', 'true', 'true', 'true', NULL, '0', NULL, 'Konya Gökyüzü Gözlemcileri', 'false', 'İç Anadolu''nun düz ufku ve kuru havası, geniş alan çekimleri için avantaj. Ay yeni ay evresinde; Samanyolu merkezi gece başında hâlâ yüksekte.', '{Samanyolu,"M 8","M 20",Satürn}', '{"Alan mera vasfındadır; çöp bırakılmaz, ateş yakılmaz."}', 'Topluluk paylaşımı', '2026-07-11'),
  ('e3cd0050-7d5d-4d80-9d1e-ab38e65976f2', 'orionid-kapadokya', 'Orionid Meteor Gecesi — Kapadokya', 'meteor-yagmuru', 'published', 'Nevşehir', 'Uçhisar Gözlem Terası', '38.630400', '34.805600', '2026-10-21 17:00:00+00', '2026-10-22 02:00:00+00', 'false', 'true', 'true', 'true', 'true', '80', '0', NULL, 'Kapadokya Gökbilim Topluluğu', 'true', 'Halley kuyruklu yıldızının artıklarından doğan Orionidler, peribacalarının üzerinde. Zirve gecesi saatte 20–25 meteor bekleniyor; ay bu yıl zirveyi bozmuyor.', '{"Orionid meteorları","Orion Bulutsusu",Jüpiter}', '{"Beyaz ışık yasak; kırmızı fener zorunlu.","Alan rüzgârlıdır, kışlık giyinin."}', 'Organizatör bildirimi', '2026-07-20'),
  ('b9f3ca5d-96f5-4769-95f6-423fa6e3bbdd', 'perseid-2026', 'Perseid Meteor Yağmuru Gözlem Kampı', 'meteor-yagmuru', 'published', 'Antalya', 'Saklıkent Gözlem Alanı', '36.781700', '30.349400', '2026-08-12 15:00:00+00', '2026-08-13 03:00:00+00', 'false', 'true', 'true', 'true', 'true', '120', '0', NULL, 'Antalya Astronomi Derneği', 'true', 'Yılın en zengin meteor yağmurunu Bortle 3 gökyüzü altında izliyoruz. Zirve gecesi saatte 100+ meteor bekleniyor; çadır alanı, teleskop istasyonları ve astrofoto köşesi hazır olacak.', '{"Perseid meteorları",Satürn,Jüpiter,Samanyolu}', '{"Beyaz ışık kullanımı 21:00 sonrası yasaktır; kırmızı fener getirin.","Çadır alanı araçlara kapalıdır, otopark 200 m mesafededir."}', 'Organizatör bildirimi', '2026-07-10'),
  ('21f171e0-31aa-42a6-b920-d7b51a03cac4', 'trabzon-planetaryum-gecesi', 'Planetaryum Gecesi: Kış Gökyüzü', 'planetaryum', 'published', 'Trabzon', 'Trabzon Bilim Merkezi Planetaryumu', '41.002700', '39.716800', '2026-11-14 16:00:00+00', '2026-11-14 18:30:00+00', 'false', 'false', 'true', 'false', 'false', '90', '0', NULL, 'Trabzon Bilim Merkezi', 'true', 'Kubbe altında kış gökyüzü turu ve ardından hava açıksa terasta teleskop gözlemi. Karadeniz''de kapalı hava riski yüksek olduğu için program kubbe odaklı kurgulandı.', '{"Orion Bulutsusu",Pleiades}', '{}', 'Kurum duyurusu', '2026-07-16'),
  ('c4b61dae-5d6b-4bb4-b901-1d39ef879d0a', 'tubitak-ulusal-gozlemevi-ziyaret', 'TUG Ulusal Gözlemevi Halka Açık Ziyaret Günü', 'halk-gozlemi', 'published', 'Antalya', 'Bakırlıtepe — TÜBİTAK Ulusal Gözlemevi', '36.824700', '30.335300', '2026-09-19 11:00:00+00', '2026-09-19 20:00:00+00', 'true', 'false', 'true', 'false', 'true', '120', '0', NULL, 'Ulusal Gözlemevi Tanıtım Ekibi', 'true', 'Türkiye''nin en büyük optik teleskoplarının bulunduğu 2500 m rakımlı tepede rehberli tur ve akşam gözlemi. Kontenjan sınırlıdır, kayıt zorunludur.', '{Satürn,"M 13","M 57",Ay}', '{"Yola özel araçla çıkış izne tabidir; ring servisi kullanılır."}', 'Kurum duyurusu', '2026-07-22'),
  ('ae910f58-5656-4627-9bd6-3c03c8af7fdf', 'van-karanlik-gokyuzu-kampi', 'Van Gölü Karanlık Gökyüzü Kampı', 'astrofoto-kampi', 'published', 'Van', 'Gevaş Sahil Kamp Alanı', '38.294700', '43.105300', '2026-10-09 13:00:00+00', '2026-10-11 07:00:00+00', 'false', 'true', 'false', 'true', 'false', '35', '0', NULL, 'Doğu Anadolu Gökyüzü İnisiyatifi', 'false', 'Bortle 2–3 gökyüzü altında iki gecelik çekim kampı. Göl yüzeyi ufku açtığı için düşük deklinasyonlu hedefler bu sahada erişilebilir.', '{"Samanyolu merkezi","NGC 7000","M 33"}', '{"Jeneratör yasak; taşınabilir güç istasyonu kullanın."}', 'Organizatör bildirimi', '2026-07-21')
on conflict (id) do update set
      slug = excluded.slug,
      title = excluded.title,
      event_type = excluded.event_type,
      status = excluded.status,
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
      registered_count = excluded.registered_count,
      organizer_id = excluded.organizer_id,
      organizer_name = excluded.organizer_name,
      organizer_verified = excluded.organizer_verified,
      description = excluded.description,
      observed_targets = excluded.observed_targets,
      rules = excluded.rules,
      source_name = excluded.source_name,
      source_last_verified_at = excluded.source_last_verified_at;

-- ── Etkinlik oturumları ──

insert into public.event_sessions (id, event_id, starts_at, title, speaker, position) values
  ('18f2ecc9-168b-4418-b415-e19ab9ffbadc', '21f171e0-31aa-42a6-b920-d7b51a03cac4', '19:00', 'Kubbe gösterimi: Kış Üçgeni', NULL, '0'),
  ('fafbaeab-8faf-4d3c-8f03-800916762047', '21f171e0-31aa-42a6-b920-d7b51a03cac4', '20:30', 'Teras gözlemi (hava uygunsa)', NULL, '1'),
  ('60f67968-2287-44e7-833a-0f9d73da7469', '40999918-53c6-4656-816e-29758060dc6c', '18:00', 'Kamp kurulumu, sıcak içecek', NULL, '0'),
  ('9990d305-4516-4f1e-9e65-c9d73018b1ca', '40999918-53c6-4656-816e-29758060dc6c', '20:00', 'Kışın astrofotoğraf: pil, çiy, odak kayması', NULL, '1'),
  ('35f8d244-2460-4f8c-9c00-ff78b8b211b6', '40999918-53c6-4656-816e-29758060dc6c', '22:00', 'Gözlem ve sayım', NULL, '2'),
  ('876cd4ea-0c22-4301-9eb2-e806a288cad1', '7222999d-60ee-45f8-820e-9229e4fd621f', '17:00', 'Alan açılışı', NULL, '0'),
  ('2b5580a3-9518-492c-b277-a61859770290', '7222999d-60ee-45f8-820e-9229e4fd621f', '19:30', 'Gökyüzü turu (lazer işaretli)', NULL, '1'),
  ('2229d7f9-ba95-45d9-8f42-e01ae1a42182', '7222999d-60ee-45f8-820e-9229e4fd621f', '21:00', 'Teleskop istasyonları', NULL, '2'),
  ('58c43ec5-e34b-4504-82cd-30407bd3a28c', '8964aef0-e959-472b-9472-8c45e5f1a4bc', '1. Gün 16:00', 'Kurulum ve backfocus kontrolü', NULL, '0'),
  ('40e79955-5063-4243-94a1-441b8a829e02', '8964aef0-e959-472b-9472-8c45e5f1a4bc', '1. Gün 21:00', 'Gece çekimi: Ha hedefleri', NULL, '1'),
  ('64650615-a264-46f5-907b-b399ee268708', '8964aef0-e959-472b-9472-8c45e5f1a4bc', '2. Gün 10:00', 'WBPP ile kalibrasyon', 'D. Arslan', '2'),
  ('fea5c9cd-2610-4398-a178-0b11e87f0d2e', '8964aef0-e959-472b-9472-8c45e5f1a4bc', '2. Gün 21:00', 'Gece çekimi: OIII/SII', NULL, '3'),
  ('8af26d48-5062-488d-8090-51e11d665c94', '89b7aa46-724e-48c9-a9ae-0d16fd81fd3b', '11:00', 'Güneş güvenliği anlatımı', NULL, '0'),
  ('e2de7032-01c2-46d9-8c96-5aa38dfb496e', '89b7aa46-724e-48c9-a9ae-0d16fd81fd3b', '11:30', 'H-alfa ve beyaz ışık gözlemi', NULL, '1'),
  ('5172552e-30fa-4700-980f-bdf183baead4', '8b16dc49-c3f4-4d81-89ed-2b138f116596', '13:00', 'Takımyıldız kartı atölyesi', NULL, '0'),
  ('80a4e71f-abd4-495a-bf2b-f2ceb8ffd0ce', '8b16dc49-c3f4-4d81-89ed-2b138f116596', '14:30', 'Güvenli güneş gözlemi', NULL, '1'),
  ('bf57aba3-a208-4284-8c23-81601abfb8e4', 'ae910f58-5656-4627-9bd6-3c03c8af7fdf', '01:00', 'Gece yarısı hedef değişimi', NULL, '2'),
  ('e460f90c-219a-4bf4-b732-53615230e78b', 'ae910f58-5656-4627-9bd6-3c03c8af7fdf', '16:00', 'Kamp kurulumu ve kutupsal hizalama', NULL, '0'),
  ('a08bd869-b197-462b-af94-43ac8e060c0d', 'ae910f58-5656-4627-9bd6-3c03c8af7fdf', '21:00', 'Hedef seçimi ve kadraj planlama', NULL, '1'),
  ('6120332a-e168-4a8e-ba86-cf9a98e6528d', 'b7d44a95-5dc6-45f7-9549-5ab0bd49bbd9', '11:00', 'Güvenlik anlatımı ve gözlük dağıtımı', NULL, '0'),
  ('3f376fa9-4ad8-43de-893c-c37296d25a86', 'b7d44a95-5dc6-45f7-9549-5ab0bd49bbd9', '12:30', 'Tutulma gözlemi ve projeksiyon', NULL, '1'),
  ('97db78f4-bd27-4cb0-85ea-f47159ae3dc3', 'b9a1c3d3-2fd1-4dfe-82a8-95a82473d838', '10:00', 'Kalibrasyon kareleri: neden ve nasıl', NULL, '0'),
  ('28771825-22b1-4f50-ad46-8a7028f5699a', 'b9a1c3d3-2fd1-4dfe-82a8-95a82473d838', '13:00', 'Yığınlama ve hizalama', NULL, '1'),
  ('e0594d9a-b962-4f31-bee0-341abd14dd99', 'b9a1c3d3-2fd1-4dfe-82a8-95a82473d838', '15:00', 'Streç, gürültü, renk kalibrasyonu', NULL, '2'),
  ('8af633ae-2241-45f2-b30a-55192ab97690', 'b9f3ca5d-96f5-4769-95f6-423fa6e3bbdd', '00:30', 'Teleskoplarla gezegen turu (Satürn, Jüpiter)', NULL, '3'),
  ('40cd0d61-cfd3-4611-934c-2eac21c1cee2', 'b9f3ca5d-96f5-4769-95f6-423fa6e3bbdd', '04:30', 'Zirve saati toplu gözlem', NULL, '4'),
  ('3119573d-9565-4b1e-b66a-e0405aea6426', 'b9f3ca5d-96f5-4769-95f6-423fa6e3bbdd', '18:00', 'Kamp kurulumu ve karşılama', NULL, '0'),
  ('62c92f3c-6724-4623-8db8-708c6e3c8c4a', 'b9f3ca5d-96f5-4769-95f6-423fa6e3bbdd', '20:30', 'Perseidler nereden gelir?', 'Dr. A. Kaya', '1'),
  ('b60265d9-101a-4de0-b9a3-367a2d062e24', 'b9f3ca5d-96f5-4769-95f6-423fa6e3bbdd', '22:00', 'Çıplak gözle gözlem ve sayım pratiği', NULL, '2'),
  ('65f995f1-7a80-4d69-bb34-4d7f8c514ab3', 'bd2a3b40-e60c-4d53-a0c8-49147ad6e967', '19:00', 'Alan buluşması', NULL, '0'),
  ('264bcde0-e158-4323-8da7-2c1374def034', 'bd2a3b40-e60c-4d53-a0c8-49147ad6e967', '21:00', 'Samanyolu geniş açı çekim istasyonu', NULL, '1'),
  ('c12b862e-ae1c-474a-b533-c587246d7a10', 'bf1b496b-9deb-49d7-bd82-fea65e9c5c3a', '21:00', 'Sunum + soru/cevap', 'C. Demir', '0'),
  ('8b88d8f3-2258-4e37-845d-cbcf2c799fd6', 'c4b61dae-5d6b-4bb4-b901-1d39ef879d0a', '14:00', 'Kubbe turu ve teleskop tanıtımı', NULL, '0'),
  ('defca61f-5e00-414c-a191-51879f0756b0', 'c4b61dae-5d6b-4bb4-b901-1d39ef879d0a', '17:30', 'Gün batımı ve güneş gözlemi', NULL, '1'),
  ('081b7b64-19b3-4749-a572-3c457795889b', 'c4b61dae-5d6b-4bb4-b901-1d39ef879d0a', '20:00', 'Gece gözlemi: Satürn, M13, M57', NULL, '2'),
  ('c8c63c0b-d15d-40cf-b2a3-5c6140003708', 'ca53c7e2-15a4-4da2-becc-19df4afbb1db', '20:00', 'Kurulum ve Ay gözlemi', NULL, '0'),
  ('e59c593d-cde3-4eed-9e8e-e370533faee0', 'ca53c7e2-15a4-4da2-becc-19df4afbb1db', '21:30', 'Satürn ve Jüpiter', NULL, '1'),
  ('53ee3596-b734-4972-9121-acf54cfb6b5c', 'ca53c7e2-15a4-4da2-becc-19df4afbb1db', '22:30', 'Çift yıldızlar ve kapanış', NULL, '2'),
  ('dada4317-ad5e-4b90-8ea8-6ce0cb861b03', 'e3cd0050-7d5d-4d80-9d1e-ab38e65976f2', '02:00', 'Zirve gözlemi', NULL, '3'),
  ('c6650fbe-4cd0-4093-946c-af77ac24b79f', 'e3cd0050-7d5d-4d80-9d1e-ab38e65976f2', '20:00', 'Karşılama ve alan kurulumu', NULL, '0'),
  ('f6f7162a-e565-4133-8a0d-f4ee8d3e2623', 'e3cd0050-7d5d-4d80-9d1e-ab38e65976f2', '21:30', 'Meteor yağmuru nasıl sayılır?', 'E. Yıldırım', '1'),
  ('9a086e2e-85f2-4ad9-a270-a73fb827f337', 'e3cd0050-7d5d-4d80-9d1e-ab38e65976f2', '23:00', 'Geniş açı astrofoto istasyonu', NULL, '2')
on conflict (id) do update set
      event_id = excluded.event_id,
      starts_at = excluded.starts_at,
      title = excluded.title,
      speaker = excluded.speaker,
      position = excluded.position;

-- ── Gözlem noktaları ──

insert into public.observing_sites (id, slug, name, region, status, approx_latitude, approx_longitude, altitude_m, bortle, sqm, road_access, south_horizon, best_months, has_water, has_toilet, has_electricity, has_cell_signal, has_tent_area, caravan_ok, description, warnings, submitted_by, rating, review_count) values
  ('7b180b36-a986-48fe-b94e-949212f33531', 'camlidere-ankara', 'Çamlıdere Gözlem Noktası', 'Ankara', 'published', '40.4886', '32.4728', '1250', '4', '21.20', 'Asfalt', 'Kısmen açık', 'Nisan – Kasım', 'true', 'false', 'false', 'true', 'true', 'true', 'Ankara''ya 1 saat mesafede hafta sonu kaçamağı; başkentin ışık kubbesi kuzey ufkunu etkiler ama güney hedefleri için yeterli karanlık sunar.', '{}', NULL, '0.00', '0'),
  ('8382b9a4-d559-402c-95df-e8263324c346', 'goreme-nevsehir', 'Göreme Kırsalı', 'Nevşehir', 'published', '38.6431', '34.8289', '1100', '3', '21.40', 'Stabilize', 'Açık', 'Nisan – Ekim', 'false', 'false', 'false', 'true', 'true', 'true', 'Peribacaları silüetiyle gece manzarası fotoğrafçılığının Türkiye''deki başkenti. Turistik bölgeden 10-15 dk uzaklaşınca Bortle 3 gökyüzü.', '{"Balon uçuş sabahları erken saatte araç trafiği başlar."}', NULL, '0.00', '0'),
  ('ebd723e6-fcb9-4b22-8481-de9fa20403d9', 'palandoken-yaylasi', 'Palandöken Yaylası', 'Erzurum', 'published', '39.8508', '41.2417', '2400', '2', '21.90', 'Stabilize', 'Açık', 'Haziran – Eylül', 'false', 'false', 'false', 'true', 'true', 'false', 'Doğu Anadolu''nun en karanlık gökyüzülerinden; SQM 21.9 ölçümleriyle narrowband gerektirmeyen doğal kontrast. Tesis yok — tam donanımlı gelin.', '{"Gece sıcaklığı yazın bile 5°C altına düşebilir.","Son 3 km stabilize yol; yağışta zorlaşır."}', NULL, '0.00', '0'),
  ('773385e0-7b50-4345-baa6-cbf42db34d2e', 'saklikent-antalya', 'Saklıkent Gözlem Alanı', 'Antalya', 'published', '36.8247', '30.3353', '1850', '3', '21.60', 'Asfalt', 'Açık', 'Mayıs – Ekim', 'true', 'true', 'true', 'true', 'true', 'true', 'TÜBİTAK Ulusal Gözlemevi yakınındaki plato; asfalt erişim ve tesis olanaklarıyla Türkiye''nin en erişilebilir karanlık gökyüzü noktalarından. Yaz gecelerinde bile serin olur.', '{"Yaz hafta sonları kalabalık olabilir; erken yer tutun."}', NULL, '0.00', '0')
on conflict (id) do update set
      slug = excluded.slug,
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
      submitted_by = excluded.submitted_by,
      rating = excluded.rating,
      review_count = excluded.review_count;

-- ── Nokta ölçümleri ──

insert into public.site_measurements (id, site_id, user_id, measured_at, sqm, bortle, method, note) values
  ('90e42ffc-79cf-4f82-8f37-5ac35888c7e1', '773385e0-7b50-4345-baa6-cbf42db34d2e', NULL, '2026-07-01', '21.60', '3', 'tohum-kayit', 'Site künyesinden aktarılan başlangıç değeri.'),
  ('65ded882-d487-489f-a372-1895b94540c0', '7b180b36-a986-48fe-b94e-949212f33531', NULL, '2026-07-01', '21.20', '4', 'tohum-kayit', 'Site künyesinden aktarılan başlangıç değeri.'),
  ('93f3ec1e-4f56-4f45-bba8-f0c0bc1a059a', '8382b9a4-d559-402c-95df-e8263324c346', NULL, '2026-07-01', '21.40', '3', 'tohum-kayit', 'Site künyesinden aktarılan başlangıç değeri.'),
  ('8ae50632-2b73-44d8-8ecb-355d8794edf4', 'ebd723e6-fcb9-4b22-8481-de9fa20403d9', NULL, '2026-07-01', '21.90', '2', 'tohum-kayit', 'Site künyesinden aktarılan başlangıç değeri.')
on conflict (id) do update set
      site_id = excluded.site_id,
      user_id = excluded.user_id,
      measured_at = excluded.measured_at,
      sqm = excluded.sqm,
      bortle = excluded.bortle,
      method = excluded.method,
      note = excluded.note;

commit;

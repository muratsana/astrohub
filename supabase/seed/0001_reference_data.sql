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
  ('lens', 'Fotoğraf Lensi', 2),
  ('montur', 'Montür', 3),
  ('astro-kamera', 'Astro Kamera', 4),
  ('filtre', 'Filtre', 5),
  ('guide', 'Guide Sistemi', 6),
  ('aksesuar', 'Aksesuar', 7)
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
  ('pegasus-astro', 'Pegasus Astro'),
  ('askar', 'Askar'),
  ('celestron', 'Celestron'),
  ('ts-optics', 'TS Optics'),
  ('samyang', 'Samyang'),
  ('sigma', 'Sigma'),
  ('canon', 'Canon'),
  ('nikon', 'Nikon'),
  ('qhyccd', 'QHYCCD'),
  ('player-one', 'Player One'),
  ('idas', 'IDAS'),
  ('baader', 'Baader'),
  ('chroma', 'Chroma'),
  ('svbony', 'SVBONY'),
  ('losmandy', 'Losmandy')
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
  ('pegasus-pocket-powerbox', 'pegasus-astro', 'aksesuar', 'Pocket Powerbox Advance', 'Sahada kablo karmaşasını tek kutuya indirir: dört 12V çıkış, iki ısıtıcı bandı kanalı ve USB üzerinden kontrol.', 'Orta segment', null, null, null, null, null, null, null, '{"Çıkış":"4× 12V + 2× dew","Kontrol":"USB","Sensör":"Sıcaklık/nem"}'::jsonb, array['Çiy noktası sensörü ısıtıcıyı otomatik yönetir.', 'Tek kablo ile montüre güç ve veri taşımayı mümkün kılar.']::text[]),
  ('sw-evostar-72ed', 'sky-watcher', 'optik-tup', 'Evostar 72ED', 'İlk astrograf olarak en sık önerilen ikili ED refraktör. 420 mm odak geniş alan verir, 2 kg ağırlık taşınabilir montürlerle çalışır.', 'Giriş segment', 420, 72, null, null, null, null, null, '{"f/":"5.8","Tip":"İkili ED"}'::jsonb, array['Düz alan için ayrı flattener gerekir; düzelticisiz köşelerde bozulma belirgindir.', 'İkili cam, üçlü APO kadar renk düzeltmesi vermez — parlak yıldızlarda hafif mor hâle görülebilir.']::text[]),
  ('sw-esprit-120', 'sky-watcher', 'optik-tup', 'Esprit 120ED', '840 mm odakta üçlü apokromat: galaksi ve gezegenimsi bulutsu gibi küçük hedeflerde ölçek verirken tam kare sensörü düz alanla doldurur.', 'Üst segment', 840, 120, null, null, null, null, null, '{"f/":"7","Tip":"Üçlü APO"}'::jsonb, array['Yaklaşık 9 kg tüp ağırlığı, görüntüleme için 20 kg sınıfı montür ister.', 'Uzun odak, guiding hassasiyetini doğrudan artırır — OAG önerilir.']::text[]),
  ('wo-gt71', 'william-optics', 'optik-tup', 'GT71', 'FPL-53 camlı ikili apokromat; 420 mm odakla geniş alan bulutsularında dengeli bir başlangıç optiği.', 'Orta segment', 420, 71, null, null, null, null, null, '{"f/":"5.9","Tip":"İkili FPL-53"}'::jsonb, array['Flat6AII düzelticiyle f/4.9 indirgeme mümkün.']::text[]),
  ('askar-fra400', 'askar', 'optik-tup', 'FRA400', 'Beş elemanlı Petzval tasarımı: düzeltici gerektirmez, tam kare kapsama alanı sunar. 0.7× reducer ile 280 mm f/3.9 çalışabilir.', 'Orta segment', 400, 72, null, null, null, null, null, '{"f/":"5.6","Tip":"Petzval quintuplet"}'::jsonb, array['Düzeltici gerekmemesi backfocus hesabını basitleştirir.', 'Reducer takıldığında kapsama alanı APS-C ile sınırlanır.']::text[]),
  ('sw-quattro-150p', 'sky-watcher', 'optik-tup', 'Quattro 150P', 'f/4 hızında 6 inç Newton. Aynı açıklıkta apokromat fiyatının çok altında; karşılığında kolimasyon ve koma düzeltici disiplini ister.', 'Orta segment', 600, 150, null, null, null, null, null, '{"f/":"4","Tip":"Newton"}'::jsonb, array['Aplanatik koma düzeltici zorunludur.', 'Açık tüp, çiylenme ve toz açısından refraktörden hassastır.']::text[]),
  ('celestron-edgehd-8', 'celestron', 'optik-tup', 'EdgeHD 8"', '2032 mm odakta düz alanlı SCT. Gezegen, gezegenimsi bulutsu ve küçük galaksilerde ölçek verir; 0.7× reducer ile 1422 mm f/7 çalışır.', 'Üst segment', 2032, 203, null, null, null, null, null, '{"f/":"10","Tip":"Schmidt-Cassegrain"}'::jsonb, array['Uzun odak, guiding hatasını büyütür — OAG neredeyse zorunlu.', 'Kapalı tüp termal dengeye geç gelir; çekimden en az 45 dk önce dışarı çıkarın.']::text[]),
  ('ts-optics-photoline-130', 'ts-optics', 'optik-tup', 'PhotoLine 130 f/7', '130 mm açıklıkla ışık toplama ve 910 mm odakla ölçeği birleştiren üçlü apokromat; reducer ile f/5.6 çalışabilir.', 'Üst segment', 910, 130, null, null, null, null, null, '{"f/":"7","Tip":"Üçlü APO"}'::jsonb, array['10 kg üzeri tüp ağırlığı, 25 kg sınıfı montür ister.']::text[]),
  ('samyang-135mm-f2', 'samyang', 'lens', '135mm f/2 ED UMC', 'Geniş alan astrofotoğrafının referans lensi. f/2 hızı ve keskin köşeleriyle Ha bölgelerini kısa pozlarda çıkarır; takip montürüyle bile derin sonuç verir.', 'Orta segment', 135, null, null, null, null, null, null, '{"f/":"2.0","Bağlantı":"Çoklu","Tip":"Manuel odak"}'::jsonb, array['f/2.8’e kısmak köşe yıldızlarını belirgin düzeltir.', 'Manuel odak; canlı görüntüde parlak bir yıldızla odaklanmak gerekir.']::text[]),
  ('sigma-art-14mm-f18', 'sigma', 'lens', 'Art 14mm f/1.8 DG HSM', 'Samanyolu manzara çekimlerinin en hızlı ultra geniş seçeneklerinden. 14 mm’de f/1.8, tek karede yeryüzü ve gökyüzünü birlikte tutar.', 'Üst segment', 14, null, null, null, null, null, null, '{"f/":"1.8","Bağlantı":"Çoklu","Tip":"Ultra geniş"}'::jsonb, array['Ön eleman kabarık; standart vidalı filtre takılamaz.', '1.1 kg ağırlık, hafif takip montürlerinde denge sorunu yaratır.']::text[]),
  ('canon-rf-50mm-f18', 'canon', 'lens', 'RF 50mm f/1.8 STM', 'Ucuz ve hafif standart lens; f/2.8–f/4 aralığına kısıldığında geniş alan takım yıldız çekimleri için yeterli keskinlik verir.', 'Giriş segment', 50, null, null, null, null, null, null, '{"f/":"1.8","Bağlantı":"Canon RF","Tip":"Standart"}'::jsonb, array['Tam açıkta köşelerde koma belirgindir; kısmak gerekir.']::text[]),
  ('nikon-z-20mm-f18', 'nikon', 'lens', 'NIKKOR Z 20mm f/1.8 S', 'Köşe performansı yüksek geniş açı; 20 mm odak, Samanyolu yayını manzarayla birlikte çerçeveler ve 77 mm vidalı filtre kabul eder.', 'Üst segment', 20, null, null, null, null, null, null, '{"f/":"1.8","Bağlantı":"Nikon Z","Tip":"Geniş açı"}'::jsonb, array['Vidalı filtre kabul etmesi, ışık kirliliği filtresi kullanımını mümkün kılar.']::text[]),
  ('sw-heq5-pro', 'sky-watcher', 'montur', 'HEQ5 Pro', 'Astrofotoğrafa giriş montürünün klasiği. 11 kg nominal kapasiteyle 5–6 kg’lık görüntüleme kurulumlarını taşır ve tek kişi sahaya götürebilir.', 'Orta segment', null, null, null, null, null, 11, 9.7, '{"Tip":"Ekvatoryal (GoTo)"}'::jsonb, array['Görüntülemede gerçekçi sınır ~6.5 kg (nominalin %60’ı).', 'Belt-drive dönüşümü periyodik hatayı belirgin düşürür.']::text[]),
  ('zwo-am5', 'zwo', 'montur', 'AM5 Harmonik', 'Harmonik dişli montür: 5.5 kg gövdeyle karşı ağırlıksız 13 kg taşır. Taşınabilirlik/kapasite oranında sınıfının en yükseklerinden.', 'Üst segment', null, null, null, null, null, 20, 5.5, '{"Tip":"Harmonik dişli (GoTo)"}'::jsonb, array['Harmonik dişlide periyodik hata yüksek frekanslıdır; guiding neredeyse zorunlu.', 'Karşı ağırlıksız kullanım rüzgârda denge marjını daraltır.']::text[]),
  ('ioptron-cem70', 'ioptron', 'montur', 'CEM70', 'Merkez dengeli tasarım yükü tek noktada toplar; 31.7 kg kapasiteyle uzun odaklı SCT ve büyük refraktörleri taşır.', 'Üst segment', null, null, null, null, null, 31.7, 15.4, '{"Tip":"Merkez dengeli ekvatoryal"}'::jsonb, array['Yerleşik kutup arama kamerası seçeneği kurulum süresini kısaltır.']::text[]),
  ('sw-eq8-r-pro', 'sky-watcher', 'montur', 'EQ8-R Pro', 'Sabit gözlemevi sınıfı montür. 50 kg kapasite, uzun odaklı büyük açıklıkları taşır; taşınabilirlik hedeflenmemiştir.', 'Profesyonel', null, null, null, null, null, 50, 25.5, '{"Tip":"Ekvatoryal (GoTo)"}'::jsonb, array['25.5 kg gövde tek kişiyle taşınmaz; sabit kurulum içindir.']::text[]),
  ('zwo-asi2600mc', 'zwo', 'astro-kamera', 'ASI2600MC Pro', 'ASI2600MM’in renkli kardeşi. Filtre tekerleği gerektirmediği için toplam maliyeti düşük; tek gecede renkli sonuç verir.', 'Üst segment', null, null, 3.76, 23.49, 15.7, null, null, '{"Sensör":"APS-C renkli","Çözünürlük":"6248×4176","Soğutma":"-35°C"}'::jsonb, array['Dar bant için dual-band filtre gerekir; SHO paleti mono kadar esnek değildir.', 'Backfocus 17.5 mm.']::text[]),
  ('zwo-asi294mc', 'zwo', 'astro-kamera', 'ASI294MC Pro', '4.63 µm büyük piksel, kısa odaklı optiklerde iyi örnekleme verir ve düşük ışıkta duyarlılığı yüksektir.', 'Orta segment', null, null, 4.63, 19.19, 13.07, null, null, '{"Sensör":"4/3\" renkli","Çözünürlük":"4144×2822","Soğutma":"-35°C"}'::jsonb, array['Bin1 modunda amp glow görülebilir; dark kalibrasyonu önemlidir.']::text[]),
  ('qhy-268m', 'qhyccd', 'astro-kamera', 'QHY268M', 'IMX571 tabanlı mono kamera; ASI2600MM ile aynı sensörü farklı gövde ve okuma modlarıyla kullanır.', 'Üst segment', null, null, 3.76, 23.61, 15.83, null, null, '{"Sensör":"APS-C mono","Çözünürlük":"6280×4210","Soğutma":"-35°C"}'::jsonb, array['Mod seçimi (Photographic / High Gain) gürültü karakterini değiştirir.']::text[]),
  ('player-one-poseidon-c', 'player-one', 'astro-kamera', 'Poseidon-C Pro', 'IMX571 renkli sensörü daha uygun fiyatla sunan alternatif gövde; DPS teknolojisiyle amp glow bastırılıyor.', 'Orta segment', null, null, 3.76, 23.49, 15.7, null, null, '{"Sensör":"APS-C renkli","Çözünürlük":"6248×4176","Soğutma":"-35°C"}'::jsonb, array['Backfocus 17.5 mm — ZWO muadilleriyle aynı ara halka hesabı geçerli.']::text[]),
  ('zwo-asi678mc', 'zwo', 'astro-kamera', 'ASI678MC', '2 µm piksel ve yüksek kare hızı: gezegen görüntülemede "lucky imaging" için tasarlandı. Soğutmasız, video akışı odaklı.', 'Giriş segment', null, null, 2, 7.68, 4.32, null, null, '{"Sensör":"1/1.8\" renkli","Çözünürlük":"3840×2160","Kullanım":"Gezegen / video"}'::jsonb, array['Derin uzayda küçük sensör dar alan verir; gezegen ve Ay için tercih edilir.', 'Yüksek kare hızı USB 3.0 ve hızlı disk ister.']::text[]),
  ('optolong-lpro', 'optolong', 'filtre', 'L-Pro', 'Geniş bant ışık kirliliği filtresi: sodyum ve cıva hatlarını bastırır, yıldız renklerini büyük ölçüde korur. Galaksi ve küme çekimlerinde dar banda alternatiftir.', 'Orta segment', null, null, null, null, null, null, null, '{"Tip":"Geniş bant","Boyut":"2\"","Kullanım":"Işık kirliliği"}'::jsonb, array['Dar bant kadar agresif değildir; Bortle 7+ altında kazancı sınırlıdır.']::text[]),
  ('idas-nbz', 'idas', 'filtre', 'NBZ (Ha+OIII)', 'Renkli kameralar için dual-band filtre. 12 nm bant, hızlı optiklerde (f/2–f/4) bant kaymasına dar bantlardan daha dayanıklı.', 'Üst segment', null, null, null, null, null, null, null, '{"Bant genişliği":"12 nm dual","Boyut":"2\"","Set":"Ha + OIII"}'::jsonb, array['Hızlı optiklerde 3 nm filtrelere göre belirgin avantajı vardır.']::text[]),
  ('baader-uv-ir-cut', 'baader', 'filtre', 'UV/IR-Cut', 'Morötesi ve kızılötesini keserek apokromatik olmayan optiklerde odak kaymasını ve hâleyi engeller. Renkli kameralarda temel filtre.', 'Giriş segment', null, null, null, null, null, null, null, '{"Tip":"Geniş bant","Boyut":"2\"","Kullanım":"Luminans / OSC"}'::jsonb, array['Işık kirliliği bastırmaz; yalnızca bant sınırlar.']::text[]),
  ('chroma-3nm-ha', 'chroma', 'filtre', '3nm Ha', 'Referans sınıfı dar bant filtre. Yansıma hâlesi bastırma performansıyla parlak yıldızların yanındaki hedeflerde tercih edilir.', 'Profesyonel', null, null, null, null, null, null, null, '{"Bant genişliği":"3 nm","Boyut":"36 mm","Set":"Tekil Ha"}'::jsonb, array['Fiyatı yüksek; kazancı özellikle parlak yıldız içeren alanlarda görülür.']::text[]),
  ('baader-solar-continuum', 'baader', 'filtre', 'Solar Continuum', '540 nm çevresinde dar bant: beyaz ışık güneş gözleminde granülasyon ve leke detayını belirgin artırır.', 'Orta segment', null, null, null, null, null, null, null, '{"Bant genişliği":"10 nm","Boyut":"2\"","Kullanım":"Güneş (beyaz ışık)"}'::jsonb, array['TEK BAŞINA KULLANILMAZ — mutlaka objektif önü güneş filtresiyle birlikte.', 'Filtresiz güneş gözlemi kalıcı görme kaybına yol açar.']::text[]),
  ('zwo-asi120mm-mini', 'zwo', 'guide', 'ASI120MM Mini', 'En yaygın guide kamerası. Küçük sensörü ayrı guide teleskopuyla iyi çalışır; OAG’de yıldız bulmak zorlaşabilir.', 'Giriş segment', null, null, 3.75, null, null, null, null, '{"Sensör":"1/3\" mono","Kullanım":"Guide"}'::jsonb, array['OAG kullanacaksanız daha büyük sensörlü bir kamera tercih edin.']::text[]),
  ('sv-bony-sv106-guidescope', 'svbony', 'guide', 'SV106 50mm Guide Scope', 'Hafif 50 mm guide teleskopu. Kısa ve orta odaklı ana optiklerde yeterli; uzun odakta diferansiyel esneme sorun çıkarır.', 'Giriş segment', 190, 50, null, null, null, null, null, '{"Tip":"Guide teleskopu"}'::jsonb, array['1000 mm üzeri ana odakta OAG’ye geçmek gerekir.']::text[]),
  ('zwo-eaf', 'zwo', 'aksesuar', 'EAF Elektronik Odaklayıcı', 'Sıcaklık değiştikçe odak kayar; elektronik odaklayıcı gece boyunca otomatik yeniden odaklama yapar ve odak için tüpe dokunmayı ortadan kaldırır.', 'Orta segment', null, null, null, null, null, null, null, '{"Tip":"Elektronik odak","Kontrol":"USB","Kullanım":"Otomatik odak"}'::jsonb, array['Otomatik odak rutini, uzun gecelerde kaybedilen kare sayısını belirgin düşürür.']::text[]),
  ('zwo-efw-7x36', 'zwo', 'aksesuar', 'EFW 7×36mm', 'Mono kamerayla SHO + LRGB çalışmak için yedi yuvalı motorlu filtre tekerleği. Filtre değişimini gece boyunca otomatikleştirir.', 'Orta segment', null, null, null, null, null, null, null, '{"Tip":"Filtre tekerleği","Yuva":"7 × 36 mm","Kontrol":"USB"}'::jsonb, array['20 mm backfocus tüketir; ara halka hesabına dâhil edin.']::text[]),
  ('pegasus-falcon-rotator', 'pegasus-astro', 'aksesuar', 'Falcon Rotator', 'Kamerayı optiğe göre döndürerek kadraj açısını yazılımdan ayarlar. Mozaik ve panel hizalamada elle döndürmenin getirdiği hatayı ortadan kaldırır.', 'Üst segment', null, null, null, null, null, null, null, '{"Tip":"Alan döndürücü","Kontrol":"USB","Kullanım":"Kadraj açısı"}'::jsonb, array['Backfocus tüketir; kurulum planına dâhil edilmeli.']::text[]),
  ('losmandy-dovetail', 'losmandy', 'aksesuar', 'D Serisi Kırlangıç Kuyruğu', 'Geniş (75 mm) bağlantı rayı: ağır tüplerde Vixen tipi dar raya göre belirgin daha rijit bağlantı verir ve esnemeyi azaltır.', 'Orta segment', null, null, null, null, null, null, null, '{"Tip":"Bağlantı rayı","Genişlik":"75 mm","Kullanım":"Tüp bağlantısı"}'::jsonb, array['Montürün Losmandy uyumlu satıcı çenesi olmalı.']::text[])
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
  ('olimpos-gokyuzu-bilim-festivali-2026', '10. Olimpos Gökyüzü ve Bilim Festivali', 'gozlem-senligi', 'published'::app.event_status, 'Antalya', 'Olimpos, Kumluca', 36.3956, 30.4736, '2026-08-09T08:00:00+03:00'::timestamptz, '2026-08-12T11:00:00+03:00'::timestamptz, false, true, true, true, true, null, 'Kozmik Anafor', true, 'Türkiye''nin en köklü ve geniş katılımlı sivil gökyüzü etkinliği onuncu kez düzenleniyor. Gece profesyonel teleskoplarla gezegen, galaksi ve bulutsu gözlemi; gündüz sunumlar, söyleşiler ve atölyeler. Katılımcılar çadır alanında ya da kamp alanındaki klimalı bungalovlarda konaklıyor.', array['Satürn', 'Samanyolu merkezi', 'M 13', 'M 57']::text[], array['Çadır alanında tuvalet ve duş mevcut; çadırınızı kendiniz getiriyorsunuz.', 'Bungalov konaklaması ayrı kontenjana tabidir.']::text[], 'Olimpos Gökyüzü ve Bilim Festivali', '2026-07-28'::date),
  ('ethem-hoca-gokyuzu-gozlem-senligi-2026', 'Ethem Hoca ile Gökyüzü Gözlem Şenliği', 'gozlem-senligi', 'published'::app.event_status, 'Denizli', 'Topuklu Yaylası, Beyağaç (1.700 m)', 37.2494, 28.8956, '2026-08-11T16:00:00+03:00'::timestamptz, '2026-08-15T12:00:00+03:00'::timestamptz, true, true, true, true, true, null, 'Denizli Büyükşehir Belediyesi & Beyağaç Belediyesi', true, 'Beyağaç''taki 1.700 metre rakımlı Topuklu Yaylası, ışık kirliliğinden Türkiye''nin en uzak noktalarından biri olarak biliniyor; SQM ölçümleri bölgenin gökyüzü kalitesini doğruluyor. Geçen yıl yaklaşık 5.000 katılımcı ve 50 profesyonel/amatör astronom şenliğe katıldı.', array['Perseid meteorları', 'Samanyolu', 'Satürn']::text[], array['Yayla 1.700 metrede; ağustosta bile gece sıcaklığı belirgin düşer.', 'Beyaz ışık karanlık adaptasyonunu bozar — kırmızı fener getirin.']::text[], 'Denizli Kent Haber', '2026-07-28'::date),
  ('keltepe-gozlem-senligi-2026', 'Keltepe Gözlem Şenliği ve Uzay Girişimciliği Festivali', 'gozlem-senligi', 'published'::app.event_status, 'Karabük', 'Keltepe, Karabük', 41.0736, 32.5411, '2026-08-14T14:00:00+03:00'::timestamptz, '2026-08-16T12:00:00+03:00'::timestamptz, true, true, true, true, true, null, 'Karabük Belediyesi & Astronomy Network', true, 'Karabük Belediyesi, Karabük Gençlik ve Spor İl Müdürlüğü ile Astronomy Network organizasyon ekibinin iş birliğinde düzenleniyor. Gündüz bilim insanı sunumları, girişimcilik panelleri, astrofotoğrafçılık eğitimleri ve çocuk atölyeleri; geceleri teleskopla gözlem ve Perseid meteor yağmuru. Katılım ücretsiz, kontenjan sınırlı ve online kayıt zorunlu.', array['Perseid meteorları', 'Satürn', 'Samanyolu']::text[], array['Kontenjan sınırlı; alana giriş için online kayıt formu zorunludur.', 'Güncel duyurular @keltepegozlemsenligi hesaplarından yayımlanıyor.']::text[], 'Karabük Derin Haber', '2026-07-28'::date),
  ('uludag-astrofest-2026', 'Uludağ AstroFest — Gökyüzü Gözlem Festivali', 'gozlem-senligi', 'published'::app.event_status, 'Bursa', 'Uludağ, Osmangazi', 40.0994, 29.1608, '2026-08-20T16:00:00+03:00'::timestamptz, '2026-08-22T12:00:00+03:00'::timestamptz, false, true, true, true, true, null, 'Uludağ AstroFest', true, 'Uludağ üzerinde üç gün süren gözlem festivali: astronomi sunumları, teleskopla gökyüzü gözlemi, atölyeler, doğa yürüyüşleri ve bilim gösterileri. Marmara''nın en erişilebilir yüksek rakımlı gözlem noktalarından birinde düzenleniyor.', array['Satürn', 'M 31', 'M 13', 'Albireo']::text[], array['Araç farları alan içinde kapalı tutulur.']::text[], 'Uludağ AstroFest', '2026-07-28'::date),
  ('ulusal-gokyuzu-gozlem-senligi-2026', 'TÜBİTAK Ulusal Gökyüzü Gözlem Şenliği', 'gozlem-senligi', 'published'::app.event_status, 'Erzurum', 'Palandöken / Konaklı Kayak Merkezi', 39.8508, 41.2417, '2026-08-27T14:00:00+03:00'::timestamptz, '2026-08-30T12:00:00+03:00'::timestamptz, true, false, true, true, true, null, 'TÜBİTAK Ulusal Gözlemevi', true, 'Türkiye''nin en köklü kamu astronomi etkinliği. Yıllarca Antalya Bakırlıtepe ile özdeşleşen şenlik, 2026''da Erzurum Palandöken/Konaklı''da planlanıyor. Palandöken''in rakımı ve kuru havası gözlem açısından avantajlı; ağustos sonunda gece sıcaklıkları düşük olabiliyor.', array['Satürn', 'M 13', 'M 31', 'Samanyolu']::text[], array['Tarihler tahminidir; kesin program TÜBİTAK resmî kanallarından açıklanır.', 'Başvurular genelde etkinlikten 1–2 ay önce açılır.']::text[], 'TÜBİTAK Ulusal Gözlemevi', '2026-07-28'::date),
  ('zerzevan-gokyuzu-gozlem-2026', 'Zerzevan Kalesi Gökyüzü Gözlem Etkinliği ve Bilim Şenliği', 'halk-gozlemi', 'published'::app.event_status, 'Diyarbakır', 'Zerzevan Kalesi, Çınar', 37.6008, 40.3667, '2026-06-27T15:00:00+03:00'::timestamptz, '2026-06-27T23:00:00+03:00'::timestamptz, true, false, true, false, true, null, 'Diyarbakır Valiliği', true, 'Roma dönemi garnizon yerleşimi ve yeraltındaki Mithras Tapınağı ile bilinen Zerzevan Kalesi''nde düzenlenen gündüz bilim şenliği ve akşam teleskop gözlemi. Güneydoğu''nun kuru havası ve düşük ışık kirliliği bölgeyi gözlem için avantajlı kılıyor.', array['Ay', 'Satürn', 'Jüpiter']::text[], '{}'::text[], 'Gazete Detay', '2026-07-28'::date)
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
  select id from public.events where slug in ('olimpos-gokyuzu-bilim-festivali-2026', 'ethem-hoca-gokyuzu-gozlem-senligi-2026', 'keltepe-gozlem-senligi-2026', 'uludag-astrofest-2026', 'ulusal-gokyuzu-gozlem-senligi-2026', 'zerzevan-gokyuzu-gozlem-2026')
);

insert into public.event_sessions (event_id, starts_at, title, speaker, position) values
  ((select id from public.events where slug = 'olimpos-gokyuzu-bilim-festivali-2026'), '1. Gün 08:00', 'Alan açılışı ve yerleşim', null, 0),
  ((select id from public.events where slug = 'olimpos-gokyuzu-bilim-festivali-2026'), 'Akşam', 'Yıldız ve gezegen tanıtımı, teleskop gözlemi', null, 1),
  ((select id from public.events where slug = 'olimpos-gokyuzu-bilim-festivali-2026'), 'Gündüz', 'Astrofotoğrafçılık atölyesi', null, 2),
  ((select id from public.events where slug = 'olimpos-gokyuzu-bilim-festivali-2026'), 'Gündüz', 'Teleskop yapımı ve kostüm roket atölyeleri', null, 3),
  ((select id from public.events where slug = 'olimpos-gokyuzu-bilim-festivali-2026'), 'Gündüz', 'Bilim insanı sunumları ve söyleşiler', null, 4),
  ((select id from public.events where slug = 'ethem-hoca-gokyuzu-gozlem-senligi-2026'), 'Gündüz', 'Astronomi dersleri ve bilim etkinlikleri', null, 0),
  ((select id from public.events where slug = 'ethem-hoca-gokyuzu-gozlem-senligi-2026'), 'Akşam', 'Teleskoplarla gökyüzü gözlemi', null, 1),
  ((select id from public.events where slug = 'ethem-hoca-gokyuzu-gozlem-senligi-2026'), '12–13 Ağustos gecesi', 'Perseid meteor yağmuru zirvesi', null, 2),
  ((select id from public.events where slug = 'keltepe-gozlem-senligi-2026'), 'Gündüz', 'Bilim insanı sunumları', null, 0),
  ((select id from public.events where slug = 'keltepe-gozlem-senligi-2026'), 'Gündüz', 'Uzay girişimciliği panelleri', null, 1),
  ((select id from public.events where slug = 'keltepe-gozlem-senligi-2026'), 'Gündüz', 'Astrofotoğrafçılık eğitimi', null, 2),
  ((select id from public.events where slug = 'keltepe-gozlem-senligi-2026'), 'Gündüz', 'Çocuk atölyeleri', null, 3),
  ((select id from public.events where slug = 'keltepe-gozlem-senligi-2026'), 'Gece', 'Teleskopla gözlem ve Perseid izleme', null, 4),
  ((select id from public.events where slug = 'uludag-astrofest-2026'), '1. Gün', 'Alan kurulumu ve karşılama', null, 0),
  ((select id from public.events where slug = 'uludag-astrofest-2026'), 'Akşam', 'Gökyüzü turu ve teleskop istasyonları', null, 1),
  ((select id from public.events where slug = 'uludag-astrofest-2026'), 'Gündüz', 'Atölyeler ve doğa yürüyüşü', null, 2),
  ((select id from public.events where slug = 'ulusal-gokyuzu-gozlem-senligi-2026'), 'Gündüz', 'Sunumlar ve atölyeler', null, 0),
  ((select id from public.events where slug = 'ulusal-gokyuzu-gozlem-senligi-2026'), 'Akşam', 'Teleskopla gözlem oturumları', null, 1),
  ((select id from public.events where slug = 'zerzevan-gokyuzu-gozlem-2026'), '15:00', 'Bilim şenliği ve atölyeler', null, 0),
  ((select id from public.events where slug = 'zerzevan-gokyuzu-gozlem-2026'), '21:00', 'Teleskopla gökyüzü gözlemi', null, 1);

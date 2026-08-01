-- 0052_podcast_bildirim_turu.sql
--
-- Yalnızca bir enum değeri. Kendi migration'ında olmasının sebebi
-- teknik: `app.notification_category_of` `language sql` ve SQL gövdeleri
-- OLUŞTURULURKEN doğrulanıyor. Yeni enum değerini ekleyip aynı işlem
-- içinde o gövdede kullanmak "invalid input value for enum" veriyor —
-- değer henüz commit edilmemiş oluyor.
--
-- Podcast bölümü `yayin` kategorisine düşüyor (radyo/TV yayını ile aynı
-- yer): kullanıcı "yayın bildirimleri" tercihini kapattığında canlı
-- yayın da yeni bölüm de susuyor. İkisini ayrı kategorilere koymak,
-- kullanıcıya aynı sorunun iki kez sorulması olurdu.

alter type app.notification_kind add value if not exists 'podcast_episode';

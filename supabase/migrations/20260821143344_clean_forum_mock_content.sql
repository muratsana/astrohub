-- Remove local mock forum content from production data without touching real users.
-- Posts are removed by the existing forum_posts -> forum_threads cascade.
delete from public.forum_threads
where (slug, title) in (
  ('forum-kurallari-ve-baslarken', 'Forum kuralları ve başlarken okunacaklar'),
  ('ilk-teleskop-130-mm-mi-8-inc-dobson-mi', 'İlk teleskop: 130 mm newton mu, 8 inç dobson mu?'),
  ('sho-paletinde-yesil-tasmasi', 'SHO paletinde yeşil taşması nasıl kontrol edilir?'),
  ('phd2-guide-hatasi-dogu-batida-farkli', 'PHD2 guide hatası doğuda ve batıda farklı çıkıyor'),
  ('kizilcahamam-agustos-gozlem-bulusmasi', 'Kızılcahamam’da ağustos gözlem buluşması — yol ve konaklama'),
  ('asi533-mi-imx571-mi-kucuk-sensor-tartismasi', 'ASI533 mü IMX571 mi? Küçük sensör gerçekten dezavantaj mı?'),
  ('temmuz-gozlem-raporu-uludag', 'Gözlem raporu: Uludağ, 21 Temmuz — SQM 21.4')
);

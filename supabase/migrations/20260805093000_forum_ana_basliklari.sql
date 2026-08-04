-- Forum ana başlıkları.
--
-- Eski kategori seti ekipmanı fazla parçalıyor, "başlangıç" ve "gözlem
-- raporu" gibi ana başlık olmayan sepetler üretiyordu. Forum artık sekiz
-- editoryal ana başlıkla çalışır; eski topic'ler en yakın yeni başlığa
-- taşınır.

insert into public.forum_categories (id, name, description, position) values
  ('ekipmanlar', 'Ekipmanlar', 'Teleskop, montür, kamera, filtre ve aksesuarlar', 10),
  ('yazilimlar', 'Yazılımlar', 'NINA, PHD2, PixInsight, Siril, ASCOM/INDI', 20),
  ('goruntu-isleme', 'Görüntü İşleme', 'Yığınlama, kalibrasyon, streç, gürültü', 30),
  ('etkinlikler', 'Etkinlikler', 'Buluşmalar, gözlem geceleri, atölyeler ve duyurular', 40),
  ('topluluklar', 'Topluluklar', 'Kulüpler, dernekler, forum kuralları ve ortak duyurular', 50),
  ('bilimsel-calismalar', 'Bilimsel Çalışmalar', 'Gözlem raporları, ölçümler ve araştırma notları', 60),
  ('radyo-astronomi', 'Radyo Astronomi', 'Radyo gözlemleri, antenler, meteor scatter ve veri toplama', 70),
  ('astro-kampcilik', 'Astro Kampçılık', 'Karanlık gökyüzü noktaları, kamp, yol ve lojistik', 80)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  position = excluded.position;

update public.forum_threads
   set category_id = 'topluluklar'
 where slug = 'forum-kurallari-ve-baslarken';

update public.forum_threads
   set category_id = case
     when category_id in (
       'ekipman',
       'baslangic',
       'optik-tupler',
       'monturler',
       'filtreler',
       'kameralar',
       'diger-ekipmanlar'
     ) then 'ekipmanlar'
     when category_id = 'yazilim' then 'yazilimlar'
     when category_id = 'isleme' then 'goruntu-isleme'
     when category_id = 'gozlem-raporlari' then 'bilimsel-calismalar'
     when category_id = 'saha-ve-seyahat' then 'astro-kampcilik'
     else category_id
   end
 where category_id in (
   'ekipman',
   'baslangic',
   'optik-tupler',
   'monturler',
   'filtreler',
   'kameralar',
   'diger-ekipmanlar',
   'yazilim',
   'isleme',
   'gozlem-raporlari',
   'saha-ve-seyahat'
 );

delete from public.forum_categories
 where id in (
   'ekipman',
   'baslangic',
   'optik-tupler',
   'monturler',
   'filtreler',
   'kameralar',
   'diger-ekipmanlar',
   'yazilim',
   'isleme',
   'gozlem-raporlari',
   'saha-ve-seyahat'
 );

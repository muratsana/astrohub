-- FORUM KONU GRUPLARI VE ROZETLER.
--
-- İki ayrı eksen tanımlanıyor:
--   KATEGORİ  konunun neyle ilgili olduğu (montür, filtre, yazılım)
--   ROZET     konunun ne tür bir gönderi olduğu (soru, rehber, inceleme)
--
-- Bunlar tek listede toplanamaz. Toplandığında kullanıcı "Montür" ile
-- "Soru" arasında seçim yapmak zorunda kalıyor, oysa konu ikisi birden.
--
-- ÖNCEKİ DURUM: 'ekipman' tek bir kategoriydi ve forumun en kalabalık
-- yeriydi; içinde montür, kamera, filtre ve optik ayrımı yoktu. Rozet
-- yerine `tags text[]` serbest metin taşıyordu — üç ay içinde 'phd2',
-- 'PHD2' ve 'phd 2' olarak üçe bölünen türden bir alan.

-- ── Kategoriler ──
-- Sıra `position` ile taşınıyor; arayüz de aynı sırayı kullanıyor.
insert into public.forum_categories (id, name, description, position) values
  ('baslangic','Başlangıç','İlk teleskop, ilk kayıt, temel sorular',10),
  ('optik-tupler','Optik Tüpler','Refraktör, newton, SCT, RC; odaklayıcı ve kolimasyon',20),
  ('monturler','Montürler','Ekvatoryal ve alt-azimut montürler, guiding, kutup ayarı',30),
  ('filtreler','Filtreler','Dar bant, geniş bant, ışık kirliliği ve güneş filtreleri',40),
  ('kameralar','Kameralar','CMOS ve CCD kameralar, DSLR, sensör ve soğutma',50),
  ('diger-ekipmanlar','Diğer Ekipmanlar','Oküler, düzleştirici, odaklayıcı, güç ve kablo düzeni',60),
  ('isleme','Görüntü İşleme','Yığınlama, kalibrasyon, streç, gürültü',70),
  ('yazilim','Yazılımlar','NINA, PHD2, PixInsight, Siril, ASCOM/INDI',80),
  ('astro-kampcilik','Astro Kampçılık','Karanlık gökyüzü noktaları, kamp, yol ve lojistik',90),
  ('etkinlikler','Etkinlikler','Buluşmalar, gözlem geceleri, atölyeler ve duyurular',100),
  ('gozlem-raporlari','Gözlem Raporları','Gece notları, seeing koşulları, gözlem günlükleri',110)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  position = excluded.position;

-- ── Mevcut konuların taşınması ──
--
-- 'ekipman' dörde bölündü ama hangi konunun hangi gruba gideceğini
-- veritabanı bilemez. Başlıktan çıkarım yapmak yerine hepsi
-- 'diger-ekipmanlar'a taşınıyor: yanlış grupta duran bir konu görünür
-- ve moderatör düzeltir; başlık eşleştirmesiyle sessizce yanlış gruba
-- serpiştirilen konular fark edilmez.
--
-- 'saha-ve-seyahat' ise doğrudan 'astro-kampcilik' karşılığına gidiyor;
-- ikisi aynı konuyu adlandırıyor, bölünme yok.
update public.forum_threads
   set category_id = 'diger-ekipmanlar'
 where category_id = 'ekipman';

update public.forum_threads
   set category_id = 'astro-kampcilik'
 where category_id = 'saha-ve-seyahat';

-- Artık kimse bağlı değil; FK zaten engelleyecekti ama açıkça siliyoruz
-- ki kategori listesi ekranda ölü bir satır göstermesin.
delete from public.forum_categories where id in ('ekipman','saha-ve-seyahat');

-- ── Rozetler ──
--
-- Ayrı bir tablo yerine kolon üzerinde CHECK: rozet seti kodda da sabit
-- (features/forum/types.ts) ve iki yerde ayrı ayrı yaşayan bir liste
-- kaçınılmaz olarak ayrışıyor. Tek satırlık bir kısıt, arayüzdeki sabit
-- listeyle aynı hizada tutulması kolay olan şey.
--
-- Sınır 3: her konuya altı rozetin de takılabildiği bir yerde rozet
-- hiçbir şey ayırt etmez.
alter table public.forum_threads
  add column if not exists labels text[] not null default '{}';

comment on column public.forum_threads.labels is
  'Sabit setten seçilen konu rozetleri. Kategori "neyle ilgili", rozet "ne tür" sorusunu yanıtlar.';

alter table public.forum_threads
  drop constraint if exists forum_threads_labels_known;
alter table public.forum_threads
  add constraint forum_threads_labels_known check (
    labels <@ array[
      'soru','sorun-giderme','rehber','inceleme','tavsiye','duyuru'
    ]::text[]
    -- Boş dizide `array_length` NULL döner, 0 değil; `coalesce` olmadan
    -- kısıt NULL'a düşer ve CHECK NULL'ı geçerli sayar. Sınır o zaman
    -- yalnızca dolu dizilerde işler ki bu da sessiz bir boşluk olurdu.
    and coalesce(array_length(labels, 1), 0) <= 3
  );

-- Rozete göre filtreleme liste sorgusunun parçası; dizi üyeliği için GIN.
create index if not exists forum_threads_labels_idx
  on public.forum_threads using gin (labels);

-- ── Eski serbest metin etiketler ──
--
-- `tags` kolonu DÜŞÜRÜLMÜYOR. İçindeki veri ('sho', 'uludağ', 'phd2')
-- rozetlerin karşılamadığı bir şey taşıyor — konunun neyle ilgili
-- olduğuna dair serbest ipuçları. Kolonu şimdi silmek, ileride arama
-- için değerlendirilebilecek veriyi geri dönüşsüz atmak olurdu.
-- Arayüz artık okumuyor; kolon veri olarak duruyor.
comment on column public.forum_threads.tags is
  'ESKİ: rozet öncesi serbest metin etiketler. Arayüz okumuyor; veri arşiv amaçlı duruyor.';

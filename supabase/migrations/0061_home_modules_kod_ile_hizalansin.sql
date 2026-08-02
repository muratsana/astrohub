-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 10 — TOHUM SAYILARI CANLIDAKİ KODLA HİZALANSIN
--
-- BULUNUŞU: ana sayfa `home_layout`a bağlanırken tohum değerleri ile
-- bölüm bileşenlerindeki sabitler karşılaştırıldı ve iki modülde
-- tutmadıkları görüldü:
--
--     modül       0058 tohumu     canlıdaki kod
--     records          6          10  (`KAC_KART`, RecentRecords.tsx)
--     listings         4           5  (`slice(0, 5)`, RecentListings.tsx)
--
-- `news` (4 = `ROWS`) ve `events` (5) zaten tutuyordu.
--
-- SEBEP: 0058 tabloyu kurarken sayıları makul tahminlerle doldurdu;
-- o sırada tabloyu okuyan kimse olmadığı için fark görünmüyordu.
-- Tohum, kodun ne çizdiğine bakılarak değil, sıfırdan yazılmıştı.
--
-- NEDEN ÖNEMLİ: yapılandırma katmanı bağlandığı anda veritabanı ana
-- sayfanın doğrusu hâline geliyor. Tohum olduğu gibi bırakılsaydı
-- bağlama commit'i, kimsenin istemediği bir ürün değişikliği yapardı:
-- galeriden son yüklenenler 10 karttan 6'ya, son ilanlar 5'ten 4'e
-- düşerdi. Üstelik bu, düzen kodunda bir hata gibi görünürdü — oysa
-- kod doğru davranıyor olurdu.
--
-- KURAL: bir yapılandırma katmanı devreye girdiği gün DAVRANIŞI
-- KORUMALIDIR. Ne değişeceğine yönetici panelden karar verir; devreye
-- girme anı o kararın yerine geçmemeli.
--
-- Hizalanan taraf TOHUM, kod değil: canlıda ne olduğunun doğrusu
-- çalışan koddur. `src/features/home/homeLayout.ts` içindeki
-- `DEFAULT_HOME_LAYOUT` da aynı sayıları taşıyor — ağ yedeğinin
-- veritabanıyla aynı sayfayı çizmesi için.
-- ══════════════════════════════════════════════════════════════════════════

-- Koşuldaki `item_limit = <tohum>` bilinçli: bu göç 0058'in TAHMİNİNİ
-- düzeltiyor, yöneticinin KARARINI değil. Sayıyı panelden değiştirmiş
-- biri varsa satır olduğu gibi kalıyor.
update public.home_modules set item_limit = 10
 where key = 'records'  and item_limit = 6;
update public.home_modules set item_limit = 5
 where key = 'listings' and item_limit = 4;

-- ══════════════════════════════════════════════════════════════════════════
-- AYNI TUZAK BAŞLIKLARDA DA VARDI
--
-- Tohum her modüle bir `title` yazmıştı ve üçü ekrandaki başlıkla
-- tutmuyordu — büyük/küçük harfe kadar:
--
--     modül       0058 tohumu                    canlıdaki kod
--     records     'Galeriden son yüklenenler'    'Galeriden Son Yüklenenler'
--     events      'Yaklaşan etkinlikler'         'Yaklaşan Etkinlikler'
--     listings    'Son ilanlar'                  'Son İlanlar'
--
-- Ana sayfa `title`ı okumaya başladığı an bu üç başlık, kimse
-- istemediği hâlde küçük harfe düşerdi. Sayılardaki hatayla aynı hata;
-- yalnızca daha sessiz olanı.
--
-- ÇÖZÜM STRING KOPYALAMAK DEĞİL, NULL. Sütun zaten `null` kabul ediyor
-- ve panel bunu böyle anlatıyor: başlık kutusunun yer tutucusu
-- "Varsayılan başlık", alanı boşaltmak `sanitizeText(...) || null` ile
-- `null` yazıyor. Yani sözleşme hazırdı — `null` = "geçersiz kılma yok,
-- sayfanın kendi başlığı geçerli".
--
-- Tohuma canlı metni kopyalasaydık aynı cümle iki yerde yaşardı ve
-- kodda başlık değiştiren biri, veritabanının sessizce eskisini
-- dayattığını fark etmezdi. `null` ile kod tek kaynak kalıyor; yönetici
-- panelden yazana kadar geçersiz kılma YOK.
--
-- `hero` ve `tonight` de temizleniyor: başlıkları hiçbir yerde
-- çizilmiyor, tohumdaki değerler yalnızca sütunun anlamını bulandırıyor.
-- Panelde modülün okunabilir adını `moduleLabels` veriyor, `title`
-- değil — ikisi 0058'den beri bilerek ayrı.
--
-- `subtitle` bilerek ELLENMEDİ: ana sayfa onu hiç okumuyor (gerekçe
-- `HomePage.tsx` başlığında). Okunmayan bir alanı şimdi temizlemek,
-- bağlanmadığı hâlde bağlanmış gibi görünmesine yol açardı.
-- ══════════════════════════════════════════════════════════════════════════

-- YALNIZCA 0058'İN YAZDIĞINI GERİ ALIYOR. Eşleşme anahtar+metin üzerinden:
-- yönetici bu arada bir başlık yazdıysa metin tutmaz ve satıra
-- dokunulmaz. "`title` doluysa temizle" deseydik bu göç, yöneticinin
-- bilerek girdiği başlığı sessizce silerdi — düzeltmeye çalıştığı hatanın
-- daha pahalı bir kopyası.
update public.home_modules set title = null
 where (key, title) in (
   ('hero',     'Hero'),
   ('tonight',  'Bu Gece'),
   ('records',  'Galeriden son yüklenenler'),
   ('news',     'Haberler ve yazılar'),
   ('events',   'Yaklaşan etkinlikler'),
   ('listings', 'Son ilanlar')
 );

-- ── Ölçüm ────────────────────────────────────────────────────────────────
-- Ziyaretçi yolunun (`home_layout`) döndürdüğü değerler, koddaki
-- sabitlerle birebir aynı olmalı. Tabloyu değil FONKSİYONU ölçüyoruz:
-- ana sayfanın gerçekten okuduğu yol o.
--
-- YÖNETİCİNİN DÜZENLEDİĞİ SATIR ÖLÇÜLMEZ. Yukarıdaki güncellemeler insan
-- eli değmiş satırlara dokunmuyor; ölçüm onları yine de kodla eşit
-- görmeye çalışsaydı, göç tam da doğru davrandığı için patlardı.
-- Ayıraç `updated_by`: tohum `insert`i doldurmuyor, her yönetici yazması
-- (`set_*`, `publish_home_draft`) dolduruyor. Aynı koşul yayın penceresi
-- kurulmuş satırları da kapsıyor — pencere de ancak panelden verilir ve
-- ileri tarihli bir modül `home_layout`tan hiç dönmez.
do $$
declare
  beklenen jsonb := '{"hero":1,"tonight":1,"records":10,"news":4,"events":5,"listings":5}'::jsonb;
  anahtar  text;
  olculen  integer;
  basligi  text;
  atlanan  integer := 0;
begin
  for anahtar in select jsonb_object_keys(beklenen) loop
    if exists (
      select 1 from public.home_modules
       where key = anahtar and updated_by is not null
    ) then
      atlanan := atlanan + 1;
      continue;
    end if;

    select item_limit, title into olculen, basligi
      from home_layout(false) where key = anahtar;

    if olculen is null then
      raise exception '0061 ölçümü: `%` modülü ziyaretçi düzeninde yok.', anahtar;
    end if;

    if olculen <> (beklenen ->> anahtar)::integer then
      raise exception '0061 ölçümü: `%` için % bekleniyordu, % ölçüldü.',
        anahtar, beklenen ->> anahtar, olculen;
    end if;

    -- Boş başlık = "geçersiz kılma yok, sayfanın kendi başlığı".
    if basligi is not null then
      raise exception
        '0061 ölçümü: `%` başlığı temizlenmemiş (%). Tohum başlığı ekrandakini bastırırdı.',
        anahtar, basligi;
    end if;
  end loop;

  raise notice
    '0061 ölçümü geçti: dokunulmamış modüllerin sayı ve başlıkları kodla aynı (% modül yönetici düzenlemesi olduğu için atlandı).',
    atlanan;
end $$;

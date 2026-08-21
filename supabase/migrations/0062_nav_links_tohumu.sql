-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 10 — `nav_links` TOHUMU: MENÜ KODLA AYNI BAŞLASIN
--
-- 0058 `nav_links` tablosunu kurdu, RLS'ini yazdı, adres CHECK'ini
-- ekledi — ve TOHUM KOYMADI. `admin/siteSettings.ts` okuma/yazma
-- fonksiyonlarını da yazdı ama onları çağıran bir panel yüzeyi yoktu.
-- Sonuç: boş bir tablo, çağrılmayan bir veri katmanı, okunmayan bir
-- yapılandırma. Borunun üç ucu da açıktı.
--
-- Bu göç tohumu koyuyor; okuma katmanı `src/features/site/navLinks.ts`,
-- panel yüzeyi `SiteControl`ün "Menü ve footer" bölümü.
--
-- ══════════════════════════════════════════════════════════════════════════
-- TOHUM KODDAN TÜRETİLDİ, ELLE YAZILMADI
--
-- 0058'in `home_modules` tohumu makul tahminlerle doldurulmuştu ve iki
-- sayı ile üç başlık canlıdaki koddan farklı çıktı (bkz. 0061). Aynı
-- hatayı tekrarlamamak için bu tohum `src/app/navigation.ts` okunarak
-- üretildi: `primaryNav` → header, `legalNav` → footer.
--
-- Hizanın KORUNDUĞU da ölçülüyor: `navLinks.test.ts` bu dosyayı okuyup
-- satırları `navigation.ts` ile karşılaştırıyor. Menüyü kodda
-- değiştiren biri tohumu güncellemeyi unutursa test düşüyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- `siteMap` BİLEREK TOHUMLANMADI
--
-- Sitede üç bağlantı listesi var; ikisi menü, biri değil:
--
--   `primaryNav` → üst menü + footer modül satırı  → tohumlanıyor
--   `legalNav`   → footer kurumsal satırı          → tohumlanıyor
--   `siteMap`    → tam modül haritası (58 bağlantı) → KODDA KALIYOR
--
-- `siteMap` bir menü değil, sitenin ERİŞİLEBİLİRLİK GARANTİSİ:
-- `navigation.ts` "üst menüde görünmeyen her sayfa burada görünür
-- olmalıdır — aksi hâlde erişilemez hâle gelir" diyor. Panelden
-- düzenlenebilir olsaydı yönetici bir sayfaya giden TEK yolu
-- silebilirdi ve bunu fark etmesi imkânsıza yakın olurdu: rota çalışır,
-- sayfa durur, yalnızca kimse bulamaz.
-- ══════════════════════════════════════════════════════════════════════════

-- ── Üst menü ─────────────────────────────────────────────────────────────
-- KOŞUL "menüde hiç satır yoksa": bu göç bir BAŞLANGIÇ durumu kuruyor,
-- bir hizalama yapmıyor. Yönetici menüyü kurduktan sonra göç yeniden
-- çalışırsa (yeni ortam, `db reset` sonrası restore) satırları ikinci kez
-- eklememeli. Satır bazlı `on conflict` kullanamıyoruz: birincil anahtar
-- rastgele bir uuid, doğal anahtar yok.
insert into public.nav_links (menu, label, path, position)
select v.menu, v.label, v.path, v.position
  from (values
    ('header', 'Galeri',      '/galeri',      1),
    ('header', 'Etkinlikler', '/etkinlikler', 2),
    ('header', 'Topluluklar', '/topluluklar', 3),
    ('header', 'Haberler',    '/haberler',    4),
    ('header', 'Yazılar',     '/yazilar',     5),
    ('header', 'İlanlar',     '/ilanlar',     6),
    ('header', 'Araçlar',     '/araclar',     7),
    ('header', 'Forum',       '/forum',       8),
    ('header', 'Saha',        '/saha',        9),
    ('header', 'Allsky',      '/allsky',      10)
  ) as v(menu, label, path, position)
 where not exists (
   select 1 from public.nav_links where menu = 'header'
 );

-- ── Footer kurumsal satırı ───────────────────────────────────────────────
-- Ayrı koşul: iki menü birbirinden bağımsız. Yönetici üst menüyü kurup
-- footer'a hiç dokunmadıysa footer yine tohumlanabilmeli.
insert into public.nav_links (menu, label, path, position)
select v.menu, v.label, v.path, v.position
  from (values
    ('footer', 'Hakkında',            '/hakkinda',            1),
    ('footer', 'Terimler Sözlüğü',    '/sozluk',              2),
    ('footer', 'Sık Sorulan Sorular', '/sss',                 3),
    ('footer', 'KVKK',                '/kvkk',                4),
    ('footer', 'Kullanım Koşulları',  '/kullanim-kosullari',  5)
  ) as v(menu, label, path, position)
 where not exists (
   select 1 from public.nav_links where menu = 'footer'
 );

-- ── Ölçüm ────────────────────────────────────────────────────────────────
-- Tohumun ziyaretçiye ne göstereceğini ölçüyoruz: sıraya göre dizilmiş
-- adresler, koddaki listelerin aynısı olmalı.
--
-- YÖNETİCİ MENÜYÜ DEĞİŞTİRDİYSE ÖLÇÜLMÜYOR. Yukarıdaki `where not
-- exists` zaten dokunmadı; ölçüm yine de kodla eşitlik arasaydı göç, tam
-- da doğru davrandığı için patlardı. Ayıraç `updated_by`: tohum `insert`i
-- doldurmuyor, her panel yazması dolduruyor.
do $$
declare
  beklenen_header text[] := array[
    '/galeri','/etkinlikler','/topluluklar','/haberler','/yazilar','/ilanlar',
    '/araclar','/forum','/saha','/allsky'
  ];
  beklenen_footer text[] := array['/hakkinda','/sozluk','/sss','/kvkk','/kullanim-kosullari'];
  olculen text[];
  dokunulmus integer;
begin
  select count(*) into dokunulmus
    from public.nav_links where updated_by is not null;

  if dokunulmus > 0 then
    raise notice
      '0062 ölçümü atlandı: % satırda yönetici düzenlemesi var.', dokunulmus;
    return;
  end if;

  select array_agg(path order by position) into olculen
    from public.nav_links where menu = 'header' and enabled;
  if olculen is distinct from beklenen_header then
    raise exception '0062 ölçümü: üst menü % bekleniyordu, % ölçüldü.',
      beklenen_header, olculen;
  end if;

  select array_agg(path order by position) into olculen
    from public.nav_links where menu = 'footer' and enabled;
  if olculen is distinct from beklenen_footer then
    raise exception '0062 ölçümü: footer % bekleniyordu, % ölçüldü.',
      beklenen_footer, olculen;
  end if;

  raise notice '0062 ölçümü geçti: 10 üst menü + 5 footer bağlantısı kodla aynı.';
end $$;

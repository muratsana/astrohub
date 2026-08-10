-- ═══════════════════════════════════════════════════════════════════════
-- YENİ SLAYT İÇİN VARSAYILANLAR
--
-- ── NEDEN ─────────────────────────────────────────────────────────────
--
-- `badge`, `subtitle`, `cta_label` ve `tint` `not null` ama VARSAYILANSIZ:
-- tabloya yalnızca göçle satır yazıldığı sürece bu görünmezdi, çünkü her
-- göç dördünü de elle veriyordu. 20260810100000 ekleme yolunu açınca
-- dördü birden zorunlu alan hâline geldi ve panelden gelen bir INSERT
-- `null value in column "badge"` ile düşerdi.
--
-- ── NEDEN BOŞ DİZE, NEDEN GERÇEK DEĞER DEĞİL ──────────────────────────
--
-- Dördünün de boşu ÇİZİM TARAFINDA zaten anlamlı ve `heroSlides.ts`
-- içindeki `normalize` bunu bugün de yapıyor:
--
--   badge      boşsa → `DEFAULT_HERO_SLIDES` içindeki aynı anahtarın rozeti
--   cta_label  boşsa → "Aç"
--   tint       biçimsizse → koddaki varsayılan renk
--   subtitle   boş zaten geçerli — alt metni olmayan slayt olağan
--
-- `tint` için varsayılana gerçek rengi ('150,185,235') yazmadık: o renk
-- kodda duruyor ve iki yere kopyalanınca biri değişip diğeri kalır.
-- Boş dize "değer verilmedi, koddaki varsayılana düş" demenin bu şemadaki
-- yolu — sütun `not null` olduğu için `null` diyemiyoruz.
--
-- Geri alma: dört `drop default`; veri değişmiyor.
-- ═══════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.venue_events') is not null
     or to_regclass('public.studio_profiles') is not null then
    raise exception
      'YANLIŞ PROJE: venue_events/studio_profiles görüldü — burası StageHub. Göç durduruldu.';
  end if;
end
$$;

alter table public.hero_slides alter column badge     set default '';
alter table public.hero_slides alter column subtitle  set default '';
alter table public.hero_slides alter column cta_label set default '';
alter table public.hero_slides alter column tint      set default '';

-- `position` BİLEREK VARSAYILANSIZ KALIYOR: varsayılan 0 her yeni slaydı
-- listenin başına, yani anasayfanın ilk ekranına koyardı. Sıradaki yeri
-- listeyi zaten okumuş olan panel hesaplıyor.

comment on column public.hero_slides.tint is
  'Rozet/vurgu rengi "R,G,B". Boş dize = koddaki varsayılan renge düş '
  '(normalize biçimsiz değeri zaten eliyor).';

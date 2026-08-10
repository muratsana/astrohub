-- ═══════════════════════════════════════════════════════════════════════
-- HERO SLAYDI EKLEME VE SİLME   (Yenileme planı FAZ 7 · görev 1)
--
-- ── ÖNCE ÖLÇÜLDÜ ──────────────────────────────────────────────────────
--
-- Plan hero için beş eylem istiyor: ekle, sil, düzenle, sırala, görsel
-- değiştir. Panelde üçü vardı. Eksik ikisinin sebebi arayüz değil ŞEMAYDI:
-- `hero_slides` üzerindeki tek yazma politikası `hero_slides_write`
-- ve komutu UPDATE (`polcmd = 'w'`). INSERT ve DELETE için politika hiç
-- yok, RLS açık olduğu için ikisi de sessizce sıfır satır etkiliyordu.
-- Panele düğme eklemek tek başına işe yaramazdı; düğme basılır, hiçbir
-- şey olmaz, hata da görünmezdi.
--
-- ── EKLENEN İKİ POLİTİKA ADMIN'E BAĞLI ────────────────────────────────
--
-- Mevcut UPDATE politikasıyla aynı sınır: `app.is_admin()`. Hero anasayfanın
-- ilk ekranı; moderatöre açmak, içerik moderasyonu yetkisini site kimliğini
-- değiştirme yetkisine genişletmek olurdu.
--
-- ── ÜÇ KISIT: SESSİZ BOZULMAYI YAZMA ANINA TAŞIMAK ────────────────────
--
-- Bugün `key` ve `scene` için hiçbir kısıt yok, çünkü ikisi de yalnızca
-- göçle yazılıyordu. Satır ekleme açılınca ikisi de kullanıcı girdisi
-- hâline geliyor ve ikisinin de bozuğu SESSİZ:
--
--   · Bilinmeyen `scene` değeri `heroSlides.ts` içinde varsayılana
--     düşürülüyor — yani yönetici "ridge" yerine "rdge" yazsa hata
--     almaz, yalnızca istemediği bir arka planı yayımlar.
--   · Boş ya da tuhaf bir `key` çizimde eleniyor (`normalize` null
--     dönüyor); satır tabloda durur, anasayfada görünmez.
--
-- Kısıtlar bu iki sessizliği yazma anındaki gürültülü bir hataya
-- çeviriyor. `scene` listesi kodla (`HeroBackdrop` · `HeroScene`) birebir
-- aynı; ikisinin birlikte değişmesi gerekiyor ve kısıt, unutulan tarafı
-- yayına çıkmadan yakalıyor.
--
-- ── `position` VARSAYILANI YOK, BİLEREK ───────────────────────────────
--
-- Yeni slaydın sıradaki yeri "sonuncu"dur ve bunu bilen taraf listeyi
-- zaten okumuş olan panel. Varsayılan 0 verseydik, eklenen her slayt
-- listenin BAŞINA düşerdi — anasayfanın ilk ekranı, yöneticinin
-- istemediği bir slaytla açılırdı.
--
-- Geri alma: iki politika ve üç kısıt düşürülür; veri değişmiyor.
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

-- ── 1 · EKLEME VE SİLME ───────────────────────────────────────────────

drop policy if exists hero_slides_insert on public.hero_slides;
create policy hero_slides_insert on public.hero_slides
  for insert to authenticated
  with check (app.is_admin());

drop policy if exists hero_slides_delete on public.hero_slides;
create policy hero_slides_delete on public.hero_slides
  for delete to authenticated
  using (app.is_admin());

-- ── 2 · ANAHTAR BİÇİMİ ────────────────────────────────────────────────
--
-- Küçük harf, rakam ve tire; 2–40 karakter. Mevcut beş satır
-- (galeri, etkinlikler, saha, araclar, yazilar) uyuyor — kısıt geçmişe
-- dönük bir şey kırmıyor, ölçüldü.
--
-- Anahtar `DEFAULT_HERO_SLIDES` içindeki kimliklerle eşleşerek varsayılan
-- rozet ve sahneyi devralıyor; okunabilir kalması bu yüzden işlevsel.

alter table public.hero_slides
  drop constraint if exists hero_slides_key_check;

alter table public.hero_slides
  add constraint hero_slides_key_check
  check (key ~ '^[a-z0-9][a-z0-9-]{1,39}$');

-- ── 3 · SAHNE KÜMESİ ──────────────────────────────────────────────────
--
-- Kodda karşılığı olan beş sahne (`HeroBackdrop` · `HeroScene`). Listede
-- olmayan bir değer bugün sessizce varsayılana düşüyordu.

alter table public.hero_slides
  drop constraint if exists hero_slides_scene_check;

alter table public.hero_slides
  add constraint hero_slides_scene_check
  check (scene in ('nebula', 'gathering', 'ridge', 'instrument', 'chart'));

-- ── 4 · BAŞLIK BOŞ OLAMAZ ─────────────────────────────────────────────
--
-- `title` zaten `not null` ama boş dize geçiyordu. Başlıksız slayt
-- `normalize` tarafından eleniyor: tabloda duran, anasayfada olmayan bir
-- kayıt. Yeni satır ekleme açılınca bu en olası ilk hata — kaydedilir,
-- görünmez, sebebi anlaşılmaz.

alter table public.hero_slides
  drop constraint if exists hero_slides_title_check;

alter table public.hero_slides
  add constraint hero_slides_title_check
  check (btrim(title) <> '');

comment on policy hero_slides_insert on public.hero_slides is
  'Yeni hero slaydını yalnızca admin ekler; sıradaki konumu panel hesaplar.';
comment on policy hero_slides_delete on public.hero_slides is
  'Slaydı yalnızca admin siler. Son satır silinirse anasayfa koddaki '
  'varsayılan slaytlara döner (toHeroSlides); hiçbir slayt göstermemek '
  'için silmek değil `enabled=false` kullanılır.';

-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 10 — HERO SLAYT YÖNETİMİ (§13.2 "Hero banner yönetimi", §6.3)
--
-- §6.3'ün son maddelerinden biri şunu istiyor: "Admin tarafından yayın
-- tarihleri, sıralama, görsel odak noktası, metin hizası ve CTA
-- yönetimi." Hero'nun geri kalanı (klavye, `prefers-reduced-motion`,
-- hover/focus duraklaması, swipe, güvenli metin alanı) Faz 3'te
-- yazılmıştı; yönetilebilirlik tek eksik maddeydi.
--
-- Slaytlar bugüne kadar `src/features/home/hero/slides.ts` içinde sabit
-- duruyordu. Yayın tarihi vermek, sırayı değiştirmek ya da bir CTA'yı
-- düzeltmek için kod değiştirip dağıtım almak gerekiyordu — §13'ün ilk
-- cümlesi ("normal operasyon için kaynak kod değişikliği gerekmemelidir")
-- tam olarak bunu yasaklıyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- YAYIN PENCERESİ RLS'İN İÇİNDE — RPC'DE DEĞİL
--
-- `home_modules`ta pencere `home_layout()` fonksiyonunda uygulanıyor,
-- çünkü orada zaten taslak birleştirme için bir RPC vardı. Hero'da taslak
-- akışı YOK, dolayısıyla RPC'nin tek işi pencereyi uygulamak olurdu.
-- Bunun yerine pencere doğrudan SELECT politikasına yazıldı: kural
-- veritabanının kendisinde, atlanabilecek bir katman yok. İstemci
-- unutsa, yeni bir sorgu yazılsa, biri tabloyu PostgREST'ten doğrudan
-- çekse bile ileri tarihli slayt DÖNMÜYOR.
--
-- 0059'UN TUZAĞI BURADA DA VAR ve aynı yerde çözüldü: yönetici kendi
-- kurduğu zamanlamayı geri alabilmek için ileri tarihli slaytı GÖRMEK
-- zorunda. Politikadaki `or app.is_admin()` bunu sağlıyor — panel ayrı
-- bir okuma yoluna ihtiyaç duymuyor.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.hero_slides (
  /* Anahtar koddaki slayt kimliği (`galeri`, `saha`…). uuid değil: tohum
     kodla eşleşmeli ve iki tarafı karşılaştırabilmeliyiz. */
  key            text primary key,
  badge          text not null,
  title          text not null,
  subtitle       text not null,
  cta_label      text not null,
  cta_to         text not null,
  /* Çizilen yedek sahne ve rengi — fotoğraf yüklenemezse görünen şey. */
  scene          text not null,
  tint           text not null,
  image_url      text,
  image_credit   text,
  image_licence  text,

  /* GÖRSEL ODAK NOKTASI (§6.3). Yüzde: 50/50 merkez. Geniş bir hero'da
     görselin ilgi çekici kısmı çoğu zaman merkezde değil; kırpma bunu
     kesip atıyordu ve düzeltmenin tek yolu başka bir görsel seçmekti. */
  focal_x        smallint not null default 50,
  focal_y        smallint not null default 50,

  /* METİN HİZASI (§6.3). Bugünkü tasarım sola hizalı; ortalanmış bir
     slayt bazı görsellerde daha iyi duruyor. */
  text_align     text not null default 'left',

  position       integer not null,
  enabled        boolean not null default true,
  publish_from   timestamptz,
  publish_to     timestamptz,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users(id) on delete set null,

  constraint hero_slides_align_check check (text_align in ('left', 'center')),
  constraint hero_slides_focal_check check (
    focal_x between 0 and 100 and focal_y between 0 and 100
  ),
  /* `nav_links` ile aynı adres kuralı: `javascript:`/`data:` reddedilir. */
  constraint hero_slides_cta_check check (
    cta_to ~ '^/([A-Za-z0-9_.~%?=&#-][A-Za-z0-9/_.~%?=&#-]*)?$'
    or cta_to ~ '^https://[A-Za-z0-9.-]+(/[^\s]*)?$'
  ),
  /* Görsel adresi yalnızca https — hero her sayfada ilk boyanan şey ve
     karışık içerik (mixed content) uyarısı orada görünürdü. */
  constraint hero_slides_image_check check (
    image_url is null or image_url ~ '^https://'
  ),
  /* KREDİ ZORUNLU: görsel varsa kaynağı ve lisansı da olmalı. CC BY'nin
     şartı bu; `slides.ts` bunu yorumda söylüyordu ama hiçbir şey
     zorlamıyordu. Panelden görsel ekleyip krediyi boş bırakmak, lisans
     ihlalini tek tıkla mümkün kılardı. */
  constraint hero_slides_credit_check check (
    image_url is null
    or (coalesce(image_credit, '') <> '' and coalesce(image_licence, '') <> '')
  ),
  constraint hero_slides_window_check check (
    publish_from is null or publish_to is null or publish_to > publish_from
  )
);

comment on table public.hero_slides is
  'Ana sayfa hero slaytları (§13.2, §6.3). Yayın penceresi SELECT politikasında uygulanır; yönetici pencereyi aşar.';

/* SIRA BENZERSİZ DEĞİL — `nav_links` ile aynı karar, aynı sebep.
 *
 * `home_modules`ta sıra benzersiz ve kısıt `deferrable`; orada işe
 * yarıyor çünkü panel sıra takasını TASLAĞA yazıyor ve yayımlama tek
 * atomik `update`. Hero'da taslak akışı yok: takas iki ayrı PostgREST
 * çağrısı, yani iki ayrı transaction. Benzersizlik `initially immediate`
 * olsaydı BİRİNCİ çağrı reddedilirdi (hedef sıra hâlâ dolu);
 * `initially deferred` de kurtarmazdı, çünkü erteleme yalnızca aynı
 * transaction içinde anlamlı.
 *
 * Bedeli: iki slayt aynı sırayı paylaşabilir. Bu görünürde bir
 * karışıklık, veri kaybı değil — ikinci yazma düşerse yönetici sırayı
 * tekrar değiştirip düzeltir. Benzersizliği zorlamak için bir RPC yazmak
 * mümkündü ama yalnızca sıralama düzeni uğruna yeni bir yüzey açardı.
 *
 * (İlk yazımda `create unique index ... deferrable` denendi; `deferrable`
 * kısıtlara ait, indekslere değil — PostgreSQL sözdizimi hatası verdi.) */
create index if not exists hero_slides_position_idx
  on public.hero_slides (position);

alter table public.hero_slides enable row level security;

-- ── Okuma: pencere burada uygulanıyor ────────────────────────────────────
drop policy if exists hero_slides_read on public.hero_slides;
create policy hero_slides_read on public.hero_slides for select
  using (
    (
      (publish_from is null or publish_from <= now())
      and (publish_to is null or publish_to > now())
    )
    /* Yönetici pencereyi aşar — yoksa ileri tarihli slaytı düzenlemek
       için önce yayına girmesini beklemek gerekirdi (0059'un tuzağı). */
    or app.is_admin()
  );

-- YAZMA VAR, EKLEME/SİLME YOK — `home_modules` ile aynı gerekçe: slayt
-- anahtarlarının kodda karşılığı var (`scene` bir bileşen adı). Panelden
-- yeni anahtar eklenirse çizilecek sahnesi olmaz.
drop policy if exists hero_slides_write on public.hero_slides;
create policy hero_slides_write on public.hero_slides
  for update to authenticated
  using (app.is_admin()) with check (app.is_admin());

grant select on public.hero_slides to anon, authenticated;
grant update on public.hero_slides to authenticated;

-- ── Tohum ────────────────────────────────────────────────────────────────
-- KODDAN TÜRETİLDİ (`src/features/home/hero/slides.ts`), elle yazılmadı.
-- 0058'in `home_modules` tohumu elle doldurulduğu için koddan ayrışmıştı
-- ve 0061 onu düzeltmek zorunda kaldı. `heroSlides.test.ts` bu dosyayı
-- okuyup satırları `defaultHeroSlides` ile karşılaştırıyor: slaytı kodda
-- değiştirip tohumu unutan biri testte yakalanıyor.
insert into public.hero_slides (
  key, badge, title, subtitle, cta_label, cta_to, scene, tint,
  image_url, image_credit, image_licence, position
)
values
  ('galeri', 'Galeri', 'Her karenin bir künyesi var',
   'Astrofotoğrafını hedefi, optiği, filtresi ve gökyüzü koşullarıyla birlikte arşivle.',
   'Galeriye bak', '/galeri', 'nebula', '232,120,96',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Pillars%20of%20creation%202014%20HST%20WFC3-UVIS%20full-res.jpg?width=1800',
   'NASA, ESA, Hubble — Yaratılış Sütunları', 'Kamu malı', 1),
  ('etkinlikler', 'Etkinlikler', 'Yaklaşan gözlem etkinlikleri',
   'Şehrindeki gözlem şenliklerini ve kampları kaçırma.',
   'Etkinliklere bak', '/etkinlikler', 'gathering', '150,185,235',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Two%20telescopes%20observing%20the%20night%20sky%20at%20the%20Paranal%20Observatory.jpg?width=1800',
   'ESO — Paranal Gözlemevi', 'CC BY 4.0', 2),
  ('saha', 'Saha', 'Karanlık gökyüzünü bul',
   'Bortle sınıfı, SQM ölçümü ve kamp olanaklarıyla değerlendirilmiş gözlem alanları.',
   'Sahayı aç', '/saha', 'ridge', '132,190,220',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Milky%20Way%20over%20the%20VLT%20(dsc4081-cc).jpg?width=1800',
   'ESO — VLT üzerinde Samanyolu', 'CC BY 4.0', 3),
  ('araclar', 'Araçlar', 'Geceni önceden planla',
   'FOV ve pixel scale hesapla, ay fazını ve astronomik karanlığı gör.',
   'Araçları aç', '/araclar', 'instrument', '232,157,46',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Laser%20Towards%20Milky%20Ways%20Centre.jpg?width=1800',
   'ESO — Samanyolu merkezine lazer', 'CC BY 4.0', 4),
  ('yazilar', 'Yazılar & Haberler', 'Gökyüzü gündemi ve rehberler',
   'Kalibrasyondan narrowband işlemeye rehberler, güncel astronomi haberleri.',
   'Yazıları oku', '/yazilar', 'chart', '178,150,235',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Orion%20Nebula%20-%20Hubble%202006%20mosaic.jpg?width=1800',
   'NASA, ESA, M. Robberto (STScI/ESA)', 'Kamu malı', 5)
on conflict (key) do nothing;

-- ── Değişiklik geçmişi ───────────────────────────────────────────────────
-- §13.3 hero'yu da kapsıyor: kim değiştirdi, önceki değer, yeni değer.
-- Tetikleyici `setting_history`ye yazıyor — 0058'in kurduğu mekanizmanın
-- aynısı, yeni bir kapsam adıyla.
alter table public.setting_history drop constraint if exists setting_history_scope_check;
alter table public.setting_history add constraint setting_history_scope_check
  check (scope in ('app_settings', 'home_modules', 'nav_links', 'feature_flags', 'hero_slides'));

drop trigger if exists hero_slides_history on public.hero_slides;
create trigger hero_slides_history
  after insert or update or delete on public.hero_slides
  for each row execute function app.record_setting_change();

-- ── Ölçüm ────────────────────────────────────────────────────────────────
do $$
declare
  beklenen text[] := array['galeri','etkinlikler','saha','araclar','yazilar'];
  olculen  text[];
  eksik    integer;
begin
  select array_agg(key order by position) into olculen from public.hero_slides;
  if olculen is distinct from beklenen then
    raise exception '0063 ölçümü: slayt sırası % bekleniyordu, % ölçüldü.',
      beklenen, olculen;
  end if;

  /* Kredi kısıtı gerçekten bağlayıcı mı? Tohumun hepsinde görsel var,
     dolayısıyla hepsinde kredi ve lisans dolu olmalı. */
  select count(*) into eksik from public.hero_slides
   where image_url is not null
     and (coalesce(image_credit,'') = '' or coalesce(image_licence,'') = '');
  if eksik > 0 then
    raise exception '0063 ölçümü: % slaytta görsel var ama kredi/lisans yok.', eksik;
  end if;

  raise notice '0063 ölçümü geçti: beş slayt sırasıyla yerinde, kredileri dolu.';
end $$;

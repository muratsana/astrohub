-- ═══════════════════════════════════════════════════════════════════════
-- POZLAMA KÜNYESİ: KALİBRASYON KARELERİ VE VİDEO  (FAZ 17 · madde 3, 4)
--
-- ── BULUNTU: MİLİSANİYE POZ KAYDEDİLEMİYOR ────────────────────────────
--
-- `exposure_seconds` numeric(8,2) idi; yani en küçük kaydedilebilir poz
-- 0,01 saniye. Gezegen çekimi tam olarak bu aralıkta çalışıyor: Jüpiter
-- için 5 ms, Ay için 2 ms olağan değerler.
--
-- Sonuç iki türlü bozuktu ve ikisi de kullanıcının yüzüne başka bir şey
-- söylüyordu:
--   · 5 ms (0.005) girildiğinde SESSİZCE 0,01'e yuvarlanıyordu — künyede
--     iki katı bir poz süresi yazıyor, kimse fark etmiyor.
--   · 4 ms (0.004) girildiğinde 0,00'a yuvarlanıp
--     `photo_exposures_seconds_positive` kısıtına takılıyordu; kullanıcı
--     "pozitif olmalı" hatası alıyordu, oysa girdiği değer pozitifti.
--
-- Ölçek 4 haneye çıkıyor: 0,1 ms çözünürlük, gezegen çekiminin
-- ihtiyacının çok altında. Genişletme; hiçbir mevcut değer değişmiyor.
--
-- ── KALİBRASYON KARELERİ (madde 3) ────────────────────────────────────
--
-- `frame_type` eklendi: light / dark / flat / bias / darkflat. Varsayılan
-- `light` — bugüne kadarki her satır ışık karesiydi ve öyle kalıyor.
--
-- FİLTRE ARTIK ZORUNLU DEĞİL, AMA HERKES İÇİN DE SERBEST DEĞİL. Dark ve
-- bias kareleri filtreden bağımsız çekilir (kapak kapalı); onlara filtre
-- yazdırmak, olmayan bir bilgiyi uydurmaktır. Flat ise filtre BAŞINA
-- çekilir — filtresiz bir flat kaydı hangi kanala ait olduğunu
-- söyleyemez. Kısıt bu ayrımı tutuyor:
--
--     light, flat      → filtre zorunlu
--     dark, bias, darkflat → filtre boş olmalı
--
-- ── VİDEO (madde 4) ───────────────────────────────────────────────────
--
-- Gezegen çekiminde kayıt bir video; künyede iki ayrı süre var ve ikisi
-- karıştırılmamalı: VİDEONUN toplam süresi (90 sn) ve KARE BAŞINA poz
-- (5 ms). `video_seconds` dolu olduğunda satır bir video kaydı demek;
-- `frames` o videodan yığınlanan kare sayısı, `exposure_seconds` da tek
-- karenin pozu.
--
-- Video yalnızca ışık karesinde anlamlı: kalibrasyon karesi video olarak
-- çekilmiyor.
--
-- Geri alma: iki kolon ve üç kısıt düşürülür, ölçek 2'ye indirilir
-- (indirmek VERİ KAYBEDER — milisaniyelik pozlar yuvarlanır).
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

-- ── 1 · MİLİSANİYE ÇÖZÜNÜRLÜĞÜ ────────────────────────────────────────

alter table public.photo_exposures
  alter column exposure_seconds type numeric(10, 4);

-- ── 2 · KARE TÜRÜ ─────────────────────────────────────────────────────

alter table public.photo_exposures
  add column if not exists frame_type text not null default 'light';

alter table public.photo_exposures
  drop constraint if exists photo_exposures_frame_type_check;

alter table public.photo_exposures
  add constraint photo_exposures_frame_type_check
  check (frame_type in ('light', 'dark', 'flat', 'bias', 'darkflat'));

-- ── 3 · FİLTRE KURALI ─────────────────────────────────────────────────

alter table public.photo_exposures
  alter column filter drop not null;

alter table public.photo_exposures
  drop constraint if exists photo_exposures_filter_rule;

alter table public.photo_exposures
  add constraint photo_exposures_filter_rule
  check (
    case
      when frame_type in ('light', 'flat') then btrim(coalesce(filter, '')) <> ''
      else filter is null
    end
  );

-- ── 4 · VİDEO SÜRESİ ──────────────────────────────────────────────────

alter table public.photo_exposures
  add column if not exists video_seconds numeric(10, 2);

alter table public.photo_exposures
  drop constraint if exists photo_exposures_video_check;

alter table public.photo_exposures
  add constraint photo_exposures_video_check
  check (
    video_seconds is null
    or (video_seconds > 0 and frame_type = 'light')
  );

comment on column public.photo_exposures.frame_type is
  'light | dark | flat | bias | darkflat. Filtre yalnızca light ve flat için zorunlu: dark/bias kapak kapalı çekilir.';
comment on column public.photo_exposures.video_seconds is
  'Gezegen videosunun toplam süresi (sn). Dolu ise satır video kaydıdır; exposure_seconds KARE BAŞINA pozdur.';
comment on column public.photo_exposures.exposure_seconds is
  'Kare başına poz (sn), 0,1 ms çözünürlük. numeric(8,2) iken 5 ms sessizce 0,01e yuvarlanıyordu.';

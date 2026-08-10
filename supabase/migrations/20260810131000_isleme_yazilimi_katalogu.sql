-- ═══════════════════════════════════════════════════════════════════════
-- İŞLEME YAZILIMI: ÇOKLU SEÇİM VE KATALOG   (FAZ 17 · madde 5)
--
-- ── ÖNCEKİ HÂLİ: TEK SERBEST METİN ────────────────────────────────────
--
-- `astro_photos.processing_software` tek bir metin kutusuydu. İki şeyi
-- birden kaybediyordu:
--
--   · GERÇEK İŞ AKIŞI TEK YAZILIM DEĞİL. Tipik bir derin uzay karesi
--     DeepSkyStacker (yığınlama) + PixInsight (işleme) + Photoshop
--     (son rötuş) zincirinden geçiyor. Tek kutuya üçü birden yazılınca
--     "DSS, PI, PS" gibi ayrıştırılamaz bir dize oluşuyordu.
--   · SÜZGEÇ KURULAMIYORDU. "PixInsight ile işlenmiş kareler" sorusu
--     serbest metinde cevaplanamaz: "PixInsight", "Pixinsight", "PI",
--     "pixinsight 1.8" hepsi ayrı değer.
--
-- ── ÇÖZÜM: KATALOG + BAĞ TABLOSU ──────────────────────────────────────
--
-- `processing_software` kataloğu (ad + slug + tür) ve fotoğrafla
-- çok-çok bağı. `text[]` kolonu yerine bağ tablosu seçildi çünkü:
--   · katalog dışı bir değer yazılamıyor (yabancı anahtar tutuyor),
--   · yazılım adı değişirse tek satır güncelleniyor,
--   · "hangi yazılım kaç fotoğrafta" sorgusu indeksten geçiyor.
--
-- TÜR AYRIMI VAR (yigmalama/isleme/rotus/yakalama) çünkü arayüz sırayı
-- buna göre kuruyor: kullanıcı önce neyle yığdığını, sonra neyle
-- işlediğini seçiyor. Tek düz liste, otuz seçenekte kullanılamaz olurdu.
--
-- ── ESKİ KOLON ŞİMDİLİK KALIYOR ───────────────────────────────────────
--
-- `astro_photos.processing_software` düşürülmüyor: içinde veri var ve
-- serbest metni kataloğa eşlemek insan kararı gerektiriyor ("PS" hangi
-- Photoshop?). Kolon, taşıma tamamlanana kadar okunmaya devam edecek —
-- boş bir kolonu bırakmakla dolu bir kolonu bırakmak farklı şeyler.
--
-- Geri alma: iki tablo düşürülür; `astro_photos` dokunulmadığı için
-- mevcut künyeler etkilenmez.
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

create table if not exists public.processing_software (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  /* yigmalama = stacking, isleme = processing, rotus = retouch,
     yakalama = capture (N.I.N.A. gibi; künyede işleme sayılmıyor ama
     kullanıcılar yazıyor ve ayırt edebilmek gerekiyor). */
  kind       text not null default 'isleme',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  constraint processing_software_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  constraint processing_software_name_check check (btrim(name) <> ''),
  constraint processing_software_kind_check
    check (kind in ('yigmalama', 'isleme', 'rotus', 'yakalama'))
);

create table if not exists public.photo_processing_software (
  photo_id    uuid not null references public.astro_photos (id) on delete cascade,
  software_id uuid not null references public.processing_software (id) on delete restrict,
  position    integer not null default 0,
  primary key (photo_id, software_id)
);

create index if not exists photo_processing_software_photo_idx
  on public.photo_processing_software (photo_id, position);

-- ── RLS ───────────────────────────────────────────────────────────────
--
-- Katalog HERKESE AÇIK okunur: künyede yazılım adı görünüyor ve giriş
-- yapmamış ziyaretçi de fotoğrafın künyesini okuyor. Yazma yalnızca
-- adminde — katalog listesi bir sözlük, kullanıcı girdisi değil.

alter table public.processing_software enable row level security;
alter table public.photo_processing_software enable row level security;

drop policy if exists processing_software_read on public.processing_software;
create policy processing_software_read on public.processing_software
  for select to anon, authenticated using (true);

drop policy if exists processing_software_write on public.processing_software;
create policy processing_software_write on public.processing_software
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

/*
 * BAĞ SATIRI FOTOĞRAFIN SAHİBİNE AİT.
 *
 * Okuma fotoğrafın görünürlüğünü izliyor: silinmiş ya da taslak bir
 * fotoğrafın yazılım künyesi de görünmemeli. `app.icerik_gorunur()`
 * FAZ 3'te tam bu iş için yazıldı — kuralı burada tekrar yazmak, iki
 * mantığın zamanla ayrışması demekti.
 */
drop policy if exists photo_processing_software_read on public.photo_processing_software;
create policy photo_processing_software_read on public.photo_processing_software
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.astro_photos p
       where p.id = photo_id and p.deleted_at is null
    )
  );

drop policy if exists photo_processing_software_write on public.photo_processing_software;
create policy photo_processing_software_write on public.photo_processing_software
  for all to authenticated
  using (
    exists (
      select 1 from public.astro_photos p
       where p.id = photo_id and (p.user_id = auth.uid() or app.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.astro_photos p
       where p.id = photo_id and (p.user_id = auth.uid() or app.is_admin())
    )
  );

-- ── TOHUM ─────────────────────────────────────────────────────────────
--
-- Türkiye'deki astrofotoğrafçıların fiilen kullandığı zincir. Liste
-- kapalı değil (admin ekleyebilir) ama boş başlamak, ilk kullanıcıyı
-- katalog kuruyormuş gibi hissettirirdi.

insert into public.processing_software (slug, name, kind, sort_order) values
  ('deepskystacker',      'DeepSkyStacker',        'yigmalama', 10),
  ('siril',               'Siril',                 'yigmalama', 20),
  ('astro-pixel-processor','Astro Pixel Processor','yigmalama', 30),
  ('autostakkert',        'AutoStakkert!',         'yigmalama', 40),
  ('registax',            'RegiStax',              'yigmalama', 50),
  ('sequator',            'Sequator',              'yigmalama', 60),
  ('pixinsight',          'PixInsight',            'isleme',    10),
  ('startools',           'StarTools',             'isleme',    20),
  ('graxpert',            'GraXpert',              'isleme',    30),
  ('astrosurface',        'AstroSurface',          'isleme',    40),
  ('photoshop',           'Adobe Photoshop',       'rotus',     10),
  ('lightroom',           'Adobe Lightroom',       'rotus',     20),
  ('gimp',                'GIMP',                  'rotus',     30),
  ('affinity-photo',      'Affinity Photo',        'rotus',     40),
  ('nina',                'N.I.N.A.',              'yakalama',  10),
  ('sharpcap',            'SharpCap',              'yakalama',  20),
  ('firecapture',         'FireCapture',           'yakalama',  30),
  ('asistudio',           'ASIStudio',             'yakalama',  40)
on conflict (slug) do nothing;

comment on table public.processing_software is
  'İşleme/yığınlama yazılımı sözlüğü. Serbest metin kolonu ayrıştırılamaz bir dize üretiyordu; süzgeç kurulamıyordu.';

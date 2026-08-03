alter table public.astro_photos
  add column if not exists allow_download boolean not null default false,
  add column if not exists watermark_required boolean not null default true;

comment on column public.astro_photos.allow_download is
  'Sahibinin herkese açık gösterim kopyası için indirme izni. Orijinal dosya private bucketta kalır.';

comment on column public.astro_photos.watermark_required is
  'Sahibinin yeniden kullanımda kaynak/filigran tercihinin görünür kaydı. Piksel filigranı üretmez.';

-- ═══════════════════════════════════════════════════════════════════════
-- THUMBNAIL (KART) KADRAJI
--
-- Kart ve ana sayfa fotoğrafı KARE gösteriliyor (ratio="square"); geniş
-- ya da dikey bir astrofotoğraf otomatik kırpıldığında ilginç kısım
-- kadraj dışına düşebiliyordu. Kullanıcı artık karede hangi kare bölgenin
-- görüneceğini seçiyor (C07); seçim normalize bir kadraj olarak saklanıyor
-- (C10): {zoom, panX, panY} — ölçekten bağımsız, JSONB.
--
-- Kolon isteğe bağlı: kadrajı olmayan kayıt eski otomatik-sığdır davranışına
-- düşüyor. Yani bu tablo/kolon boşken de galeri çalışmaya devam ediyor.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.astro_photos
  add column if not exists thumb_crop jsonb;

-- Yalnızca beklenen üç anahtarlı bir nesne kabul edilsin; başka biçim
-- okuma tarafını şaşırtır. Null serbest (kadraj yok = otomatik sığdır).
alter table public.astro_photos
  drop constraint if exists astro_photos_thumb_crop_ok;
alter table public.astro_photos
  add constraint astro_photos_thumb_crop_ok check (
    thumb_crop is null
    or (
      jsonb_typeof(thumb_crop) = 'object'
      and thumb_crop ? 'zoom'
      and thumb_crop ? 'panX'
      and thumb_crop ? 'panY'
      and jsonb_typeof(thumb_crop -> 'zoom') = 'number'
      and jsonb_typeof(thumb_crop -> 'panX') = 'number'
      and jsonb_typeof(thumb_crop -> 'panY') = 'number'
    )
  );

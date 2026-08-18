-- ═══════════════════════════════════════════════════════════════════════
-- PARLAK YILDIZ KATALOĞU — ALAN ÇÖZÜMÜ KATMANINDA YILDIZ YOKTU
--
-- Çözülmüş bir fotoğrafta "Alan çözümü" katmanı açıldığında bulutsular,
-- galaksiler ve kümeler etiketleniyor ama YILDIZ hiç görünmüyordu. İki
-- ayrı sebebi vardı:
--
--   1. `alandaki_cisimler` koni araması `kind not in ('yildiz','diger')`
--      diyerek yıldızları açıkça eliyordu.
--   2. Elemeyi kaldırmak da bir şey değiştirmezdi: `celestial_objects`
--      içindeki 485 "yildiz" satırı KONUMSAL bir yıldız kataloğu değil,
--      tek tek eklenmiş dikkat çekici nesneler. Çözülmüş altı
--      fotoğrafın kadrajında bu satırlardan HİÇBİRİ yok — ölçüldü.
--
-- Yani yıldız etiketleyebilmek için gerçek bir yıldız kataloğu gerekiyor.
--
-- `alandaki_cisimler` İÇİNDEKİ ELEME KALDIRILMADI ve bu bilinçli: yıldız
-- etiketleri artık bu tablodan geliyor. Eleme kaldırılsaydı Albireo gibi
-- iki katalogda birden bulunan yıldızlar kadrajda ÇİFT etiketlenirdi.
--
-- ══════════════════════════════════════════════════════════════════════
-- NEDEN AYRI TABLO
--
-- `celestial_objects` gökyüzü kataloğu SAYFASINI besliyor: gezilen,
-- filtrelenen, her satırı kendi sayfası olan 16.663 nesne. Oraya yüz bin
-- adsız yıldız eklemek o sayfayı kullanılamaz hâle getirirdi — liste
-- artık "gezilecek hedefler" değil, bir yıldız dökümü olurdu.
--
-- Bu tablonun tek işi açıklama katmanı: slug yok, sayfa yok, gezinti yok.
--
-- ══════════════════════════════════════════════════════════════════════
-- VERİ KAYNAĞI VE NEDEN BU
--
-- Hipparcos (ESA 1997), CDS/VizieR üzerinden. Projede zaten DSS2/CDS
-- kullanılıyor (`TARAMA_ATFI`) ve kaynak kamuya açık — paylaş-benzer
-- (share-alike) yükümlülüğü taşıyan derlemelere göre tercih edilir.
-- Özel adlar IAU-CSN'den (IAU Yıldız Adları Kataloğu), Bayer/Flamsteed
-- imleri Yale Bright Star Catalogue'dan geliyor.
--
-- KADİR SINIRI 10,5. Yoğunluk ~2,7 yıldız/derece². Geniş kadrajda (2-5
-- derece²) on-yirmi etiket çıkıyor; dar kadrajda (0,2 derece²) çoğu
-- zaman sıfır ya da bir. Bu bir eksiklik değil, gökyüzünün kendisi: o
-- büyüklükte bir alanda ADI OLAN yıldız çoğu zaman yoktur. Daha derine
-- inmek (Tycho-2, 2,5 milyon satır) etiketleri "TYC 2679-1234-1" gibi
-- hiçbir şey anlatmayan dizelere çevirirdi.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.bright_stars (
  /* HIP birincil anahtar: katalog kimliği zaten benzersiz ve kalıcı;
     ayrıca bir uuid üretmek, yeniden içe aktarmada eşleştirmeyi
     zorlaştırmaktan başka bir şey yapmazdı. */
  hip integer primary key,
  hd integer,
  /** IAU'nun onayladığı özel ad (Sadr, Albireo…) — varsa. */
  proper_name text,
  /** Bayer/Flamsteed imi, Türkçe gösterime hazır: "γ Cyg", "33 Psc". */
  designation text,
  ra_deg double precision not null,
  dec_deg double precision not null,
  magnitude real,
  spectral_type text,
  updated_at timestamptz not null default now()
);

comment on table public.bright_stars is
  'Alan çözümü katmanında yıldız etiketlemek için Hipparcos tabanlı konum kataloğu (kadir <= 10,5). Gezinti için değil; gökyüzü kataloğu sayfası celestial_objects tablosunu okur.';

alter table public.bright_stars enable row level security;

/* Okuma herkese açık: etiketler oturumsuz ziyaretçiye de görünüyor.
   Yazma yalnızca yönetim — içe aktarma servis rolüyle çalıştığı için
   RLS'i zaten atlıyor, bu politika elle düzeltme içindir. */
drop policy if exists bright_stars_read on public.bright_stars;
create policy bright_stars_read on public.bright_stars
  for select using (true);

drop policy if exists bright_stars_editor_write on public.bright_stars;
create policy bright_stars_editor_write on public.bright_stars
  for all to authenticated
  using (app.is_admin() or app.has_role('content_editor'::app.app_role))
  with check (app.is_admin() or app.has_role('content_editor'::app.app_role));

/* Koni araması önce bir DEKLİNASYON BANDI ile daraltılıyor (haversine
   indekslenemez), sonra gerçek açısal uzaklık hesaplanıyor. Bant
   olmadan her sorgu 112 bin satırı tarardı. */
create index if not exists bright_stars_dec_idx
  on public.bright_stars (dec_deg);
create index if not exists bright_stars_mag_idx
  on public.bright_stars (magnitude);

/**
 * KADRAJDAKİ YILDIZLAR.
 *
 * `alandaki_cisimler` ile aynı haversine ve aynı bant daraltması;
 * ayrı fonksiyon çünkü dönen sütunlar bambaşka (slug/tür yok, HIP/HD
 * ve tayf türü var) ve tek bir birleşik sonuç, çağıranı her satırda
 * "bu yıldız mı nesne mi" diye ayıklamaya zorlardı.
 *
 * SIRALAMA PARLAKLIĞA GÖRE: etiket sayısı sınırlı ve bir kadrajda
 * gösterilecek ilk yıldız en parlak olanıdır.
 */
create or replace function public.alandaki_yildizlar(
  merkez_ra numeric,
  merkez_dec numeric,
  yaricap_derece numeric,
  adet integer default 24
)
returns table(
  hip integer,
  hd integer,
  proper_name text,
  designation text,
  ra_deg double precision,
  dec_deg double precision,
  magnitude real,
  uzaklik_derece double precision
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    s.hip, s.hd, s.proper_name, s.designation,
    s.ra_deg, s.dec_deg, s.magnitude, d.uzaklik
  from public.bright_stars s
  cross join lateral (
    select degrees(2 * asin(least(1, sqrt(
      sin(radians((s.dec_deg - merkez_dec) / 2)) ^ 2
      + cos(radians(merkez_dec)) * cos(radians(s.dec_deg))
        * sin(radians((s.ra_deg - merkez_ra) / 2)) ^ 2
    )))) as uzaklik
  ) d
  where s.dec_deg between merkez_dec - yaricap_derece
                      and merkez_dec + yaricap_derece
    and d.uzaklik <= yaricap_derece
  order by s.magnitude asc nulls last
  limit least(greatest(coalesce(adet, 24), 1), 200);
$$;

revoke all on function public.alandaki_yildizlar(numeric, numeric, numeric, integer) from public;
grant execute on function public.alandaki_yildizlar(numeric, numeric, numeric, integer)
  to anon, authenticated, service_role;

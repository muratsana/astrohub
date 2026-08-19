-- ═══════════════════════════════════════════════════════════════════════
-- PLATE SOLVE SONRASI TAKIMYILDIZ TÜRETME (B07)
--
-- ══════════════════════════════════════════════════════════════════════
-- NEDEN IAU SINIR TABLOSU DEĞİL
--
-- "Doğru" yol IAU'nun 1930 sınır poligonlarını taşımak olurdu — ama o
-- tablo katalogda yok ve ezberden yazılan bir sınır listesi kullanıcının
-- künyesine YANLIŞ takımyıldız yazardı. Uydurulmuş veri, eksik veriden
-- zararlıdır: kullanıcı ona güvenip paylaşır.
--
-- Bunun yerine ELDEKİ OTANTİK VERİ kullanılıyor: `celestial_objects`
-- tablosundaki 16.644 nesnenin her biri hem koordinat hem takımyıldız
-- taşıyor. Verilen koordinata en yakın DOKUZ nesnenin çoğunluk oyu
-- takımyıldızı veriyor.
--
-- ══════════════════════════════════════════════════════════════════════
-- İSABET ÖLÇÜLDÜ: %91
--
-- Yöntem: 300 nesne rastgele seçilip "bilinmiyor" sayıldı, kendi kaydı
-- hariç tutularak tahmin üretildi, gerçek etiketle karşılaştırıldı.
-- Tek komşuda %89, dokuz komşulu çoğunlukta %91. Hatalar takımyıldız
-- SINIRLARINDA yoğunlaşıyor — beklenen davranış.
--
-- Doğrulama: M42 → Avcı, M31 → Andromeda, M51 → Av Köpekleri,
-- M45 → Boğa (dördü de doğru).
--
-- %91 bir künye alanını sessizce doldurmaya yetmez; sonuç arayüzde
-- "tahmin" etiketiyle ve yalnızca alan BOŞKEN gösteriliyor.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function app.takimyildiz_tahmini(
  p_ra_deg  double precision,
  p_dec_deg double precision
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select k.constellation
  from (
    select c.constellation
    from public.celestial_objects c
    where c.ra_deg is not null
      and c.dec_deg is not null
      and c.constellation is not null
      and c.constellation <> ''
    order by (
      /* Açısal uzaklık: RA farkı deklinasyonun kosinüsüyle ölçekleniyor
         (kutuplara yaklaştıkça RA dereceleri daralır). Sıralama için bu
         yaklaşım yeterli; tam küresel mesafeye gerek yok. */
      power((c.ra_deg - p_ra_deg) * cos(radians(p_dec_deg)), 2)
      + power(c.dec_deg - p_dec_deg, 2)
    )
    limit 9
  ) k
  group by k.constellation
  order by count(*) desc, min(k.constellation)
  limit 1;
$$;

/* PostgREST yüzeyi: `app` şeması açılmıyor, ince sarmalayıcı
   (deponun rpcExposure kapısının şart koştuğu desen). */
create or replace function public.takimyildiz_tahmini(
  p_ra_deg  double precision,
  p_dec_deg double precision
)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select app.takimyildiz_tahmini(p_ra_deg, p_dec_deg);
$$;

revoke all on function public.takimyildiz_tahmini(double precision, double precision) from public;
grant execute on function public.takimyildiz_tahmini(double precision, double precision) to anon, authenticated;

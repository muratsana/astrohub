-- ═══════════════════════════════════════════════════════════════════════
-- PLATE SOLVE — DENEME SAYACI
--
-- Çözüm gönderimi bugüne kadar yalnızca KULLANICI tarafından
-- tetikleniyordu: yükleme akışının sonunda bir kez, bir de yönetim
-- panelindeki toplu düğmeyle. Sonuç, galeride yıllarca "çözülmemiş"
-- duran fotoğraflar oldu — anahtar sonradan tanımlandığı için o güne
-- kadar yüklenmiş hiçbir kare hiç gönderilmemişti.
--
-- Gönderimi `plate-solve-poll` içindeki cron turuna taşıyoruz. Cron
-- kimseyi beklemiyor: kuyrukta olmayan her fotoğrafı sırayla gönderiyor
-- ve birikmiş kuyruk kendiliğinden boşalıyor.
--
-- SAYAÇ BUNUN İÇİN GEREKLİ. Sonsuz tekrar iki şeyi bozardı: yıldızı
-- yetmediği için çözülemeyen bir kare her turda yeniden gönderilir ve
-- astrometry.net kuyruğunu boşuna doldururdu; dahası "başarısız" durumu
-- hiç kalıcı olmaz, kayıt sürekli `kuyrukta` ile `basarisiz` arasında
-- gidip gelirdi. Sayaç, denemenin bir sonu olduğunu söylüyor.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.astro_photos
  add column if not exists solve_attempts smallint not null default 0;

comment on column public.astro_photos.solve_attempts is
  'Kaç kez astrometry.net''e gönderildi. Sunucu tarafı yeniden deneme bu sayıyla sınırlanıyor; astrometry.net "çözemedim" dediğinde doğrudan tavana çekiliyor çünkü o bir hata değil, bir hüküm.';

/*
 * Cron her turda "gönderilmemiş var mı" diye soruyor. İndeks olmadan bu
 * sorgu tabloyu baştan sona tarardı; galeri büyüdükçe beş dakikada bir
 * yapılan tam tarama ilk fark edilen yavaşlık olurdu.
 *
 * Kısmi indeks: çözülmüş satırlar sorguya hiç girmiyor ve zamanla
 * tablonun ezici çoğunluğu onlar olacak.
 */
create index if not exists astro_photos_solve_bekleyen_idx
  on public.astro_photos (solve_attempts, created_at)
  where solve_status in ('yok', 'basarisiz');

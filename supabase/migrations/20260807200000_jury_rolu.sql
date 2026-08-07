-- ═══════════════════════════════════════════════════════════════════════
-- app.app_role ENUM'UNA `jury` DEĞERİ  (Yenileme planı FAZ 1, görev 1)
--
-- ── NEDEN TEK BAŞINA BİR GÖÇ DOSYASI ──────────────────────────────────
--
-- PostgreSQL 12'den beri `alter type … add value` bir işlem bloğunun
-- içinde çalışabiliyor, ama eklenen değer AYNI işlemde KULLANILAMIYOR.
-- Yani `role_permissions` tablosuna `('jury', …)` satırını buraya
-- yazsaydık göç şu hatayla düşerdi:
--
--     unsafe use of new value "jury" of enum type app_role
--
-- Supabase her göç dosyasını kendi işleminde çalıştırıyor; enum
-- değişikliğini ayırmak, bir sonraki dosyanın değeri kullanabilmesini
-- garanti eden şey tam olarak bu.
--
-- ── JÜRİ NE YAPAR, NE YAPMAZ ──────────────────────────────────────────
--
-- Plan §3.2: jüri yetkisi TEK bir işten ibaret — haftanın fotoğrafı
-- adaylarına oy vermek. Başka hiçbir yönetim yetkisi taşımaz ve
-- kullanıcının üyelik statüsünü DEĞİŞTİRMEZ: bir jüri üyesi standart da
-- olabilir premium de.
--
-- Oy verme yetkisi zaten veritabanında zorlanıyor: `app.is_active_juror`
-- ve `app.guard_photo_of_week_vote` (bkz. jury_members,
-- photo_of_week_votes politikaları). Bu göç yetkiyi DEĞİŞTİRMİYOR;
-- rolün rol tablosunda da adlandırılabilmesini sağlıyor — böylece
-- FAZ 2'deki "rol ver/al" ekranı jüriyi diğerleriyle aynı yerden
-- yönetebiliyor.
--
-- Geri alma: enum değeri düşürülemez (PostgreSQL desteklemiyor). Geri
-- almak gerekirse tipin yeniden yaratılması ve tüm bağımlı kolonların
-- dönüştürülmesi gerekir — bu yüzden değer eklemek tek yönlü bir karar.
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

alter type app.app_role add value if not exists 'jury';

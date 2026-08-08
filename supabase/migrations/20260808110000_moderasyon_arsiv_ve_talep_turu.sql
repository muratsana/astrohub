-- ═══════════════════════════════════════════════════════════════════════
-- MODERASYON: ARŞİV DURUMU VE TOPLULUK SİLME TALEBİ TÜRÜ
--                                      (Yenileme planı FAZ 5, görev 2 ve 5)
--
-- Bu göç YALNIZCA iki enum değeri ekliyor. Kullanımı bir sonraki göçte
-- (`topluluk_silme_onayi`) çünkü PostgreSQL yeni enum değerini EKLENDİĞİ
-- işlemin içinde kullandırmıyor: aynı dosyada hem `add value` hem de o
-- değeri okuyan bir politika/kısıt yazarsak göç 55P04 ile düşer.
--
-- ── `archived` NEDEN GEREKLİ ──────────────────────────────────────────
--
-- Kuyruk bugün üç sonuç tanıyor: `approved` ("içerik kalsın"),
-- `rejected` ("içerik kalksın") ve `escalated` ("yönetime ilet"). Planın
-- istediği beş eylemden biri olan ARŞİVLE hiçbirine denk düşmüyor:
-- yinelenen rapor, konusu kalmamış şikâyet ya da yanlışlıkla açılmış
-- kayıt için moderatörün içerik hakkında bir hüküm vermesi gerekmiyor.
-- Bugün bu kayıtlar zorunlu olarak `approved` işaretleniyor ve denetim
-- kaydında "içerik incelendi, haklı bulunmadı" gibi görünüyorlar —
-- oysa içerik hiç incelenmedi. Ayrı bir değer, kararla kapanışı ayırıyor.
--
-- ── `club_deletion` NEDEN AYRI BİR HEDEF TÜRÜ ─────────────────────────
--
-- Plan §FAZ 5.5: topluluk sahibi silme TALEBİ açar, admin karara bağlar.
-- Talep de bir moderasyon kaydı — ayrı bir tablo açmak aynı işin ikinci
-- kaynağını üretirdi (§6.8). Ama şikâyetten iki yönüyle ayrılıyor:
--   · gerekçe zorunlu (şikâyette not isteğe bağlı),
--   · yalnızca ADMİN görür; moderatöre listelenmez.
-- İkisi de bir sonraki göçte kısıt ve politika olarak yazılıyor.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Parmak izi kontrolü: doğru projede miyiz ───────────────────────────
do $$
begin
  if to_regclass('public.venue_events') is not null
     or to_regclass('public.studio_profiles') is not null then
    raise exception
      'YANLIŞ PROJE: venue_events/studio_profiles görüldü — burası StageHub. Göç durduruldu.';
  end if;
end
$$;

alter type app.moderation_status add value if not exists 'archived';
alter type app.moderation_target add value if not exists 'club_deletion';

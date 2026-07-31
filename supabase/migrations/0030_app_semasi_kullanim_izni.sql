-- 0030_app_semasi_kullanim_izni.sql
-- `app` şeması istemci rollerine açılıyor — RLS politikaları onsuz çalışmıyor.
--
-- ══════════════════════════════════════════════════════════════════════
-- BELİRTİ
--
-- Fotoğraf yükleme sihirbazının son adımı ("Yayımla") şu hatayla düşüyordu:
--
--     permission denied for schema app
--
-- Üretimde ölçüldü: `authenticated` rolüyle `select app.is_admin()` →
-- `42501: permission denied for schema app`. `anon` da aynı durumda.
--
-- ══════════════════════════════════════════════════════════════════════
-- SEBEP
--
-- Şema 0001'de `create schema if not exists app` ile açıldı ama HİÇBİR
-- ROLE `usage` verilmedi. PostgreSQL'de bir şemaya `usage` yoksa,
-- içindeki hiçbir nesneye ADIYLA erişilemez — fonksiyon `security
-- definer` olsa bile. `security definer` gövdenin İÇİNDEKİ yetkiyi
-- değiştirir; fonksiyonu ÇAĞIRABİLMEK ayrı bir izindir.
--
-- Politika ifadeleri çağıran rolün yetkileriyle değerlendirilir. Depoda
-- 70'e yakın politika `app.is_admin()` ya da `app.has_role(...)`
-- çağırıyor; hepsi bu boşluğun üstünde duruyordu.
--
-- ══════════════════════════════════════════════════════════════════════
-- NEDEN BUGÜNE KADAR GÖRÜNMEDİ
--
-- Kısa devre. Sık kullanılan yollarda `app.*` çağrısı bir OR zincirinin
-- SAĞ tarafında duruyor ve sol taraf çoğu satırda zaten doğru:
--
--     equipment_models_read:  approved OR … OR app.is_admin()
--     content_entries_read:   status = 'yayinda' OR app.is_admin()
--
-- Katalogdaki her model `approved`, her içerik `yayinda` → sağ taraf hiç
-- değerlendirilmiyor, hata hiç çıkmıyor. `astro_photos` tablosu ise
-- boştu; okuma sırasında değerlendirilecek satır yoktu.
--
-- Kırılma noktası INSERT oldu. `astro_photos` üzerinde iki permissive
-- politika var ve WITH CHECK ifadeleri OR'lanıyor:
--
--     astro_photos_insert_own : auth.uid() = user_id
--     astro_photos_moderate   : app.is_admin() OR app.has_role('moderator')
--
-- OR'un hangi tarafının önce değerlendirileceği garanti değil; planlayıcı
-- `app.is_admin()` tarafına girdiği anda istek 42501 ile düşüyor. Yani
-- bu, "ilk fotoğraf yüklendiğinde ortaya çıkacak" bir hataydı ve tam
-- olarak öyle oldu.
--
-- ══════════════════════════════════════════════════════════════════════
-- KAPSAM: `anon` DA GEREKİYOR
--
-- Yalnız `authenticated` yetmez. `astro_photos_read` politikası `public`
-- rolüne tanımlı ve şöyle:
--
--     status = 'published' OR auth.uid() = user_id OR app.is_admin() OR …
--
-- Yayımlanmamış tek bir satır olduğu anda giriş yapmamış ziyaretçi için
-- de sağ tarafa geçiliyor. Galeri o an herkes için kırılırdı.

grant usage on schema app to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- ŞEMA AÇILDI DİYE HER FONKSİYON AÇILMIYOR
--
-- PostgreSQL yeni fonksiyonlara varsayılan olarak PUBLIC execute verir.
-- Şemaya `usage` verilmesi, bugüne kadar erişilemeyen 15 fonksiyonun
-- tamamını çağrılabilir hâle getiriyor. Çoğu zararsız:
--
--   • `returns trigger` olanlar doğrudan çağrılamaz — PostgreSQL
--     "trigger functions can only be called as triggers" diyor.
--   • `app.is_admin()` ve `app.has_role(...)` ÇAĞIRANIN kendi yetkisini
--     döndürüyor; başkası hakkında bilgi vermiyor. Politikaların
--     ihtiyacı olan ikisi de bunlar.
--
-- Üçü ise BAŞKASININ kimliğini parametre alıyor ve `security definer`
-- olduğu için RLS'i aşarak cevaplıyor. Şema açıldığında herhangi bir
-- kullanıcı, elindeki bir uuid ile başka birinin üyelik kademesini ve
-- fotoğraf sayısını sorgulayabilirdi. Bugün bu bir açık değil (şema
-- kapalıydı), yarın olurdu — kapıyı açarken bunları kapatıyoruz.
--
-- Tetikleyicilerin bunları çağırması etkilenmiyor: `enforce_photo_quota`
-- da `security definer` ve gövdesi sahibin yetkisiyle çalışıyor.
-- ══════════════════════════════════════════════════════════════════════
revoke all on function app.membership_tier(uuid)     from public, anon, authenticated;
revoke all on function app.photo_limit(uuid)         from public, anon, authenticated;
revoke all on function app.active_photo_count(uuid)  from public, anon, authenticated;

-- Politikaların gerçekten çağırdığı iki fonksiyon — açıkça veriliyor.
-- PUBLIC zaten taşıyor; açık yazılması, ileride PUBLIC'ten alınırsa
-- politikaların sessizce kırılmaması için.
grant execute on function app.is_admin()                  to anon, authenticated;
grant execute on function app.has_role(app.app_role)      to anon, authenticated;

comment on schema app is
  'Uygulama yardımcıları. RLS politikaları buradaki fonksiyonları ÇAĞIRAN ROLÜN yetkisiyle değerlendirir; bu yüzden anon ve authenticated için usage şart (0030). Şemaya yeni bir fonksiyon eklerken sorulacak soru: politikalar mı çağırıyor (execute gerekir), yoksa yalnızca tetikleyici mi (gerekmez)?';

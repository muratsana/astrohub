-- ════════════════════════════════════════════════════════════════════════════
-- 0044 — YENİ RPC'LERİN YÜZEYİNİ DARALT
--
-- 0042 ve 0043 üç fonksiyon açtı ve her birine `grant execute … to
-- authenticated` yazdı. Denetçi hepsini işaretledi: `anon` de çağırabiliyor.
--
-- SEBEP GRANT'IN EKSİKLİĞİ DEĞİL, POSTGRESQL'İN VARSAYILANI.
-- Yeni bir fonksiyon doğduğu anda `EXECUTE` yetkisi `PUBLIC` sözde-rolüne
-- verilmiş oluyor; `anon` de `authenticated` de o rolün içinde. Yani
-- "yalnızca oturum açmışlara ver" diye yazılan satır hiçbir şeyi
-- KAPATMIYOR, zaten açık olanın üstüne bir kez daha açıyor. Kapatmanın tek
-- yolu önce `PUBLIC`ten geri almak.
--
-- ÜÇÜ DE ZATEN KENDİ İÇİNDE KORUNUYORDU — `notify_user` yönetici arıyor,
-- `start_direct_conversation` oturum arıyor, `my_conversations`
-- `auth.uid()` boşken boş küme dönüyor. Yani bu bir açık kapatma değil,
-- İKİNCİ KAPIYI DA KİLİTLEME: iç kontrolü bir gün değiştiren kişi, dış
-- kapının da kapalı olduğunu varsayabilmeli.
--
-- Not: `public.follow_counts` (0041) listede yok çünkü `security invoker` —
-- çağıranın yetkisiyle çalışıyor ve takip sayısı zaten herkese açık.
-- ════════════════════════════════════════════════════════════════════════════

revoke execute on function public.notify_user(uuid, text, text, text) from public;
revoke execute on function public.start_direct_conversation(uuid)     from public;
revoke execute on function public.my_conversations()                  from public;

grant execute on function public.notify_user(uuid, text, text, text) to authenticated;
grant execute on function public.start_direct_conversation(uuid)     to authenticated;
grant execute on function public.my_conversations()                  to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- SABİT ARAMA YOLU
--
-- `app.notification_category_of` tablo okumuyor, yalnızca bir `case`
-- ifadesi — ama arama yolu açık kalan her fonksiyon aynı sınıfa giriyor:
-- çağıranın `search_path`ı fonksiyonun içinde geçerli oluyor. Burada
-- sömürülecek bir ad çözümlemesi yok; yine de istisna bırakmak, denetçi
-- çıktısında sürekli bir uyarı ve "bu neden muaftı" sorusu demekti.
--
-- `alter` kullanılıyor, `create or replace` değil: fonksiyon
-- `notifications.category` üretilmiş kolonunun bağımlılığı ve gövdesini
-- değiştirmek o kolonu yeniden hesaplamayı gerektirirdi.
-- ══════════════════════════════════════════════════════════════════════════
alter function app.notification_category_of(app.notification_kind)
  set search_path = pg_catalog, public;

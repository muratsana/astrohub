-- ════════════════════════════════════════════════════════════════════════════
-- 0046 — 0044 EKSİK KALMIŞTI: `anon` YETKİSİ AÇIK GRANT'TAN GELİYOR
--
-- 0044, üç yeni RPC'nin yetkisini `PUBLIC`ten geri aldı ve teşhisi şuydu:
-- "PostgreSQL yeni fonksiyona doğar doğmaz `PUBLIC`e EXECUTE veriyor".
-- Bu DOĞRU ama EKSİK. Ölçüm göçten sonra yapıldı ve denetçi hâlâ aynı üç
-- fonksiyonu işaretliyordu; `pg_proc.proacl`e bakınca sebep göründü:
--
--   {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,
--    service_role=X/postgres}
--
-- `PUBLIC` girdisi (`=X/postgres`) gerçekten gitmişti. Ama `anon` AYRICA
-- ve AÇIKÇA yetkiliydi — çünkü Supabase kurulumu `public` şeması için
-- varsayılan ayrıcalık tanımlıyor:
--
--   alter default privileges in schema public
--     grant execute on functions to anon, authenticated, service_role;
--
-- Yani `public` şemasında doğan her fonksiyon üç role birden açık doğuyor.
-- `PUBLIC`ten revoke etmek bu üç açık grant'a dokunmuyor.
--
-- DERS: bir yetkiyi kapattığını İDDİA etmek yetmiyor, `proacl`i okumak
-- gerekiyor. 0006 aynı hatayı `spatial_ref_sys` için yapmıştı ve
-- DATABASE_AND_RLS bunu "yanlıştı ve düzeltildi" diye kaydediyor; aynı
-- tuzağa 38 göç sonra tekrar düşüldü.
--
-- GERÇEK BİR AÇIK MI? Hayır — üçü de kendi içinde korunuyor:
-- `notify_user` yönetici arıyor, `start_direct_conversation` oturum
-- arıyor, `my_conversations` `auth.uid()` boşken boş küme dönüyor.
-- Ama "yetki verilmedi" ile "verildi, fonksiyon kendini savunuyor"
-- arasındaki fark, bir gün o iç kontrolü değiştiren kişi için hayati.
--
-- `service_role` DOKUNULMUYOR: RLS'i zaten atlayan sunucu tarafı rolü ve
-- Edge Function'ların bu RPC'leri çağırması meşru.
-- ════════════════════════════════════════════════════════════════════════════

revoke execute on function public.notify_user(uuid, text, text, text) from anon;
revoke execute on function public.start_direct_conversation(uuid)     from anon;
revoke execute on function public.my_conversations()                  from anon;

/*
 * `public.follow_counts` LİSTEDE YOK ve bu bilinçli: `security invoker`,
 * yani çağıranın yetkisiyle çalışıyor ve döndürdüğü şey (takipçi sayısı)
 * zaten herkese açık — `follows` tablosunun okuma politikası `true`.
 * Ziyaretçinin bir profilde takipçi sayısını görebilmesi için gerekli.
 */

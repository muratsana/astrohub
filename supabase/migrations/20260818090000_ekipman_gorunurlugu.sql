-- ══════════════════════════════════════════════════════════════════════
-- "PROFİLİMDE GÖRÜNSÜN" SEÇENEĞİ TUTMUYORDU
--
-- `user_setups` üç görünürlük değeri taşıyor ve arayüz üçünü de
-- sunuyor: `ozel`, `profilde`, `herkese-acik`. Okuma politikası ise
-- yalnızca ikisini tanıyordu:
--
--     user_id = auth.uid() OR visibility = 'herkese-acik'
--
-- Yani "Profilimde görünsün" diyen kullanıcının ekipmanını profiline
-- gelen HİÇ KİMSE göremiyordu. Seçenek arayüzde vardı, karşılığı yoktu:
-- kullanıcı bir şey açtığını sanıyor, kapalı kalıyordu.
--
-- Sessiz kalmasının sebebi, o güne kadar hiç kimsenin bu seçeneği
-- seçmemiş olması — canlıda tek bir kayıtlı ekipman vardı ve o da
-- varsayılan `ozel` idi. Ekipman modülü hesaba taşınıp varsayılan
-- "profilde" yapılınca bu, yeni kaydedilen HER ekipmanın durumu hâline
-- geliyor.
--
-- ── İKİ DEĞER NEDEN AYRI KALIYOR ────────────────────────────────────
--
-- İkisi de "başkası okuyabilir" demek; fark KEŞFEDİLEBİLİRLİKTE:
--
--   profilde     — sahibinin profil sayfasında görünür. Oraya gitmek
--                  için kullanıcıyı zaten biliyor olmak gerekir.
--   herkese-acik — ek olarak dizinlerde, aramada ve ekipman
--                  eşleşmelerinde listelenebilir.
--
-- Bu ayrım RLS'in değil, sorgunun işi: politika okumaya izin veriyor,
-- hangi listeye gireceğine çağıran karar veriyor. Tersini yapıp
-- "profilde" olanı RLS'te kapatmak, profil sayfasının kendi verisini
-- okuyamaması demekti — bugünkü durum tam olarak buydu.
--
-- ENVANTER (`user_equipment`) AÇILMIYOR. O tablo kullanıcının sahip
-- olduğu tüm parçaları tutuyor ve hiçbir görünürlük alanı yok; sahibine
-- özel kalıyor. Profilde gösterilecek olan, kullanıcının GÖRÜNÜR
-- işaretlediği ekipmanların parçaları — o da `user_setups` üzerinden
-- geliyor.
-- ══════════════════════════════════════════════════════════════════════

drop policy if exists user_setups_read on public.user_setups;
create policy user_setups_read on public.user_setups
  for select
  using (
    user_id = (select auth.uid())
    or visibility in ('profilde', 'herkese-acik')
  );

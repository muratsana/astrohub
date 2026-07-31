-- ══════════════════════════════════════════════════════════════════════════
-- HESAP SİLMEYİ HIZLANDIRAN İNDEKSLER
-- ══════════════════════════════════════════════════════════════════════════
--
-- Üç tablo `auth.users`a `on delete set null` ile bağlı:
--   equipment_brands.submitted_by
--   equipment_models.submitted_by
--   observing_sites.submitted_by
--
-- İndeksi olmayan bir yabancı anahtarda, EBEVEYN satır silindiğinde
-- Postgres çocuk tabloyu SIRALI TARAMAYLA geziyor. Yani bir kullanıcı
-- hesabını sildiğinde bu üç tablo baştan sona okunuyor.
--
-- NEDEN ÖNEMLİ: bu, KVKK'daki silme hakkının (§15.1) uygulandığı yol.
-- Katalog büyüdükçe tek bir hesap silme işlemi giderek yavaşlıyor ve
-- yavaşlayan bir silme, zaman aşımına düşen bir silme demek — yani
-- kullanıcının yasal talebi teknik bir sebeple karşılanamaz hale gelir.
--
-- Denetçi bunu `unindexed_foreign_keys` olarak INFO seviyesinde
-- işaretliyordu. Otuz bir uyarının otuzu HENÜZ BOŞ tablolarda ve onlara
-- indeks eklemek bugün yalnızca yazma maliyeti getirirdi; burada
-- eklenenler satırı olan ve kullanıcıya bağlı olan üçü.
--
-- `if not exists`: migration yeniden çalıştırılabilir kalıyor.
-- ══════════════════════════════════════════════════════════════════════════

create index if not exists equipment_brands_submitted_by_idx
  on public.equipment_brands (submitted_by);

create index if not exists equipment_models_submitted_by_idx
  on public.equipment_models (submitted_by);

create index if not exists observing_sites_submitted_by_idx
  on public.observing_sites (submitted_by);

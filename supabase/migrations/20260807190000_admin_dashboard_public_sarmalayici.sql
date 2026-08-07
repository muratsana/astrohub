-- ═══════════════════════════════════════════════════════════════════════
-- GÖSTERGE PANELİ HİÇ VERİ ÇEKMİYOR — H1  (Yenileme planı FAZ 0, görev 1)
--
-- ── ÖLÇÜLEN DURUM ─────────────────────────────────────────────────────
--
-- `20260806200000_admin_dashboard_rpc.sql` fonksiyonu `app` şemasında
-- tanımlıyor:  `create or replace function app.admin_dashboard()`.
--
-- Frontend ise `src/features/admin/records.ts:411` içinde
-- `supabase.rpc('admin_dashboard')` çağırıyor. PostgREST yalnızca
-- yayımlanan şemalardaki nesneleri görür; `supabase/config.toml`:
--
--     schemas = ["public", "graphql_public"]
--
-- `app` listede yok. Yani çağrı PGRST202 ("function not found") ile
-- düşüyor, `fetchDashboard` hata fırlatıyor ve "Genel Bakış" ekranındaki
-- dokuz kartın hepsi "—" kalıyor.
--
-- ── NEDEN `app` ŞEMASI YAYIMLANMIYOR ──────────────────────────────────
--
-- Çözüm "config.toml'a app ekle" DEĞİL. O şemada bugün 60'tan fazla
-- yardımcı fonksiyon var: `app.is_admin`, `app.has_role`,
-- `app.notify_admins`, `app.consume_rate_limit`, tetikleyici gövdeleri…
-- Şemayı yayımlamak hepsini tek seferde dış dünyaya açar ve her biri
-- ayrı ayrı gözden geçirilmesi gereken bir yüzey hâline gelir. Bir
-- fonksiyonu görünür kılmak için altmışını açmak, kazancın çok üstünde
-- bir bedel.
--
-- Bunun yerine `public` şemasına İNCE bir sarmalayıcı konuyor: tek işi
-- `app` sürümünü çağırmak. Dışa açılan yüzey tam olarak bir fonksiyon.
--
-- ── YETKİ NEREDE ──────────────────────────────────────────────────────
--
-- Sarmalayıcı `security invoker` (varsayılan): kendi başına hiçbir şey
-- açmıyor, çağıranın yetkisiyle çalışıyor. Rol kontrolü asıl yerinde
-- kalıyor — `app.admin_dashboard()` ilk satırında admin / moderatör /
-- içerik editörü kontrolü yapıyor ve geçmeyeni `insufficient_privilege`
-- ile reddediyor.
--
-- Yani burada İKİNCİ bir yetki kontrolü yazılmıyor (§6.8 — tek doğruluk
-- kaynağı). İki kontrol olsaydı biri güncellenip diğeri unutulduğunda
-- hangisinin geçerli olduğu belirsizleşirdi.
--
-- Geri alma: drop function if exists public.admin_dashboard();
-- ═══════════════════════════════════════════════════════════════════════

-- ── Parmak izi kontrolü: doğru projede miyiz ───────────────────────────
-- Aynı Supabase hesabında StageHub projesi de var. Yanlış projeye göç
-- uygulamak sessizce yanlış şemaya yazmak demek; bu blok onu durduruyor.
do $$
begin
  if to_regclass('public.venue_events') is not null
     or to_regclass('public.studio_profiles') is not null then
    raise exception
      'YANLIŞ PROJE: venue_events/studio_profiles görüldü — burası StageHub. Göç durduruldu.';
  end if;
end
$$;

create or replace function public.admin_dashboard()
returns jsonb
language sql
stable
as $$
  select app.admin_dashboard();
$$;

comment on function public.admin_dashboard() is
  'app.admin_dashboard() için PostgREST sarmalayıcısı. Yetki kontrolü sarmalanan fonksiyonun içinde; burada tekrarlanmaz.';

revoke all on function public.admin_dashboard() from public;
grant execute on function public.admin_dashboard() to authenticated;

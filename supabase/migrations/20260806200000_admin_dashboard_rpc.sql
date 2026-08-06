-- ═══════════════════════════════════════════════════════════════════════
-- YÖNETİM GÖSTERGE PANELİ — TEK ÇAĞRI  (Görev 1.2)
--
-- Belge §1.2: "Sayılar tek RPC/görünüm ile çekilir, N ayrı sorgu ile
-- değil."
--
-- Ölçülen durum: gösterge paneli yalnızca moderasyon kuyruğunun durum
-- sayımlarını gösteriyordu ve o sayımlar da kuyruğun İLK 100 kaydından
-- istemcide hesaplanıyordu. Yani 100'den fazla kayıt olduğunda panel
-- yanlış sayı gösterirdi — ve yanlış olduğunu söyleyen bir şey yoktu.
--
-- ── NEDEN RPC, NEDEN ALTI AYRI SORGU DEĞİL ─────────────────────────────
-- Altı sayı altı istek demek: her biri ayrı ağ gidiş-dönüşü, ayrı hata
-- yolu ve ekranda altı ayrı "—". Tek fonksiyon tek yanıt döndürüyor ve
-- ya hepsi geliyor ya hiçbiri — panelin yarısı dolu yarısı boş kalmıyor.
--
-- ── SECURITY DEFINER + AÇIK ROL KONTROLÜ ───────────────────────────────
-- Fonksiyon RLS'i atlıyor (tanımlayanın yetkisiyle çalışıyor), bu yüzden
-- rol kontrolü fonksiyonun İÇİNDE ve ilk satırda. Kontrol olmadan her
-- oturumlu kullanıcı toplam üye sayısını ve bekleyen moderasyon adedini
-- okuyabilirdi.
--
-- İçerik editörü de çağırabiliyor: taslak içerik sayısı onun işi. Sayılar
-- toplam; kimlik bilgisi taşımıyorlar.
--
-- Geri alma: drop function if exists app.admin_dashboard();
-- ═══════════════════════════════════════════════════════════════════════

create or replace function app.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  sonuc jsonb;
begin
  if not (
    app.is_admin()
    or app.has_role('moderator')
    or app.has_role('content_editor')
  ) then
    raise exception 'Yetki yok' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'kullanici_toplam', (select count(*) from public.profiles),
    'kullanici_yeni_7g', (
      select count(*) from public.profiles
      where created_at >= now() - interval '7 days'
    ),
    'kullanici_askida', (
      select count(*) from public.profiles
      where account_status in ('suspended', 'banned')
    ),
    'moderasyon_bekleyen', (
      select count(*) from public.moderation_queue
      where status in ('pending', 'in_review', 'escalated')
    ),
    'icerik_taslak', (
      select count(*) from public.content_entries where status <> 'yayinda'
    ),
    'icerik_yayinda', (
      select count(*) from public.content_entries where status = 'yayinda'
    ),
    'fotograf_bekleyen', (
      select count(*) from public.astro_photos where status = 'draft'
    ),
    'silme_talebi', (
      select count(*) from public.account_deletion_requests
      where status = 'pending'
    ),
    'audit_bugun', (
      select count(*) from public.audit_logs
      where created_at >= date_trunc('day', now())
    ),
    /* Son hareketler panelin ikinci yarısı: sayılar "ne kadar", bu liste
       "ne oldu" sorusunu cevaplıyor. Yirmi kayıt, belgedeki sayı. */
    'son_hareketler', (
      select coalesce(jsonb_agg(satir order by satir->>'zaman' desc), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'zaman', a.created_at,
          'eylem', a.action,
          'hedef', a.target_type,
          'kim', p.username
        ) as satir
        from public.audit_logs a
        left join public.profiles p on p.id = a.actor_id
        order by a.created_at desc
        limit 20
      ) t
    )
  ) into sonuc;

  return sonuc;
end;
$$;

comment on function app.admin_dashboard() is
  'Yönetim panelinin özet sayıları ve son 20 denetim kaydı — tek çağrıda.';

grant execute on function app.admin_dashboard() to authenticated;

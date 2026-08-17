-- ══════════════════════════════════════════════════════════════════════
-- DENETİM KAYDI YAZMA KAPISI
--
-- `0007_moderation_and_audit.sql:167-175` audit_logs için yazma
-- politikasını BİLEREK açmadı ve gerekçesi doğru: "istemci yazabiliyorsa
-- kendi izini uydurabilir". Kayıtların SECURITY DEFINER fonksiyonlardan
-- atılacağı orada yazılı.
--
-- Ancak o fonksiyon hiç yazılmadı. Panel bu arada üç yerde doğrudan
-- `supabase.from('audit_logs').insert(...)` çağırıyordu:
--
--   users.ts:682  users.export                 (KVKK: toplu veri dışa aktarımı)
--   users.ts:924  user.anonymize
--   users.ts:963  user.deletion_request_cancel
--
-- Üçü de kalıcı olarak 42501 ile düşüyordu ve dönüş değeri hiç
-- okunmadığı için hata tamamen yutuluyordu. Yani KVKK kapsamındaki üç
-- işlem denetim izi bırakmıyordu ve kimse fark etmiyordu. Üstelik panel
-- ekranı "Tabloda yalnızca ekleme politikası var" yazarak yöneticiye
-- olmayan bir garanti veriyordu.
--
-- Bu fonksiyon 0007'nin tarif ettiği kapıyı açıyor.
--
-- ── AKTÖR İSTEMCİDEN ALINMIYOR ──────────────────────────────────────
--
-- `actor_id` parametre DEĞİL: `auth.uid()` ile sunucuda belirleniyor.
-- Parametre olsaydı bir yönetici başkasının kimliğiyle iz bırakabilirdi
-- ve günlüğün tek değeri olan "kim yaptı" sorusu cevapsız kalırdı.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.denetim_yaz(
  p_action      text,
  p_target_type text,
  p_target_id   uuid    default null,
  p_detail      jsonb   default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_id    uuid;
begin
  if v_actor is null then
    raise exception 'Denetim kaydı için oturum gerekiyor.'
      using errcode = '28000';
  end if;

  /* Yalnızca yönetim rolleri iz bırakabilir. Sıradan kullanıcının
     eylemleri tetikleyicilerle kaydediliyor; buraya erişimi olsaydı
     günlüğü gürültüyle doldurabilirdi. */
  if not (app.is_admin() or app.has_role('moderator') or app.has_role('content_editor')) then
    raise exception 'Denetim kaydı için yetki yok.'
      using errcode = '42501';
  end if;

  if coalesce(trim(p_action), '') = '' then
    raise exception 'Denetim kaydında eylem adı zorunlu.';
  end if;

  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (v_actor, trim(p_action), nullif(trim(p_target_type), ''), p_target_id, coalesce(p_detail, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.denetim_yaz(text, text, uuid, jsonb) is
  'Panelden denetim kaydı açar. Aktör istemciden değil auth.uid() ile alınır; yalnızca yönetim rolleri çağırabilir.';

revoke all on function public.denetim_yaz(text, text, uuid, jsonb) from public, anon;
grant execute on function public.denetim_yaz(text, text, uuid, jsonb) to authenticated;

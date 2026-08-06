-- ═══════════════════════════════════════════════════════════════════════
-- MODERASYON KARARLARI DENETİM KAYDINA DÜŞÜYOR  (Görev 1.5 / §0.6)
--
-- Belge §0.6: "Admin panelden yapılan her yazma işlemi `audit_logs`
-- tablosuna kayıt düşürür. İstisna yoktur."
--
-- Keşifte ölçülen durum: `audit_logs`a yazan yalnızca iki dosya vardı
-- (`records.ts`, `reminderAdmin.ts`) ve tabloda tek kayıt duruyordu.
-- Moderasyon kararları — bir fotoğrafın kaldırılması, bir şikâyetin
-- reddi — hiçbir yere yazılmıyordu. Yani "bu içeriği kim kaldırdı"
-- sorusunun cevabı yoktu.
--
-- ── NEDEN TETİKLEYİCİ, NEDEN İSTEMCİ DEĞİL ─────────────────────────────
-- Denetim yazımını `resolveItem()` içine koymak, panelden GEÇMEYEN her
-- değişikliğin kaçması demekti: SQL konsolu, başka bir istemci, ileride
-- yazılacak bir Edge Function. Tetikleyici veritabanında duruyor ve
-- yazma nereden gelirse gelsin çalışıyor.
--
-- Aynı gerekçe `profiles_audit_status` ve `user_roles_audit` için de
-- geçerliydi (migration 20260806161000).
--
-- ── YALNIZCA DURUM DEĞİŞİKLİĞİ ─────────────────────────────────────────
-- `assigned_to` değişiklikleri (üzerine alma) kayda düşmüyor: kuyrukta
-- bir kaydı üstlenmek bir karar değil, bir niyet beyanı. Kararın kendisi
-- `approved`/`rejected`/`escalated` geçişleri ve onlar yazılıyor.
--
-- Geri alma:
--   drop trigger if exists moderation_audit on public.moderation_queue;
--   drop function if exists app.audit_moderation();
-- ═══════════════════════════════════════════════════════════════════════

create or replace function app.audit_moderation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
    values (
      auth.uid(),
      'moderation.' || new.status,
      /* Hedef, kuyruk kaydının kendisi DEĞİL, şikâyet edilen içerik:
         "bu fotoğrafa ne oldu" diye bakan biri kuyruk kimliğini değil
         içeriğin kimliğini biliyor. */
      new.target_type::text,
      new.target_id::text,
      jsonb_build_object(
        'kuyruk_id', new.id,
        'onceki', old.status,
        'sonraki', new.status,
        'sebep', new.reason,
        'karar_notu', new.resolution_note
      )
    );
  end if;
  return new;
end;
$$;

comment on function app.audit_moderation() is
  'Moderasyon durum değişikliklerini audit_logs''a yazar. Panelden '
  'geçmeyen değişiklikler de kaçmasın diye tetikleyicide.';

drop trigger if exists moderation_audit on public.moderation_queue;

create trigger moderation_audit
  after update on public.moderation_queue
  for each row
  execute function app.audit_moderation();

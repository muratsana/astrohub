-- ═══════════════════════════════════════════════════════════════════
-- ÇÖZÜM ALANLARI KORUMASI EKSİK KALMIŞTI
--
-- `app.guard_solve_fields` ölçüm alanlarını (ra, dec, ölçek, durum…)
-- servis rolü dışındaki her güncellemede eski değerine geri çeviriyor:
-- alan çözümü bir ÖLÇÜM ve fotoğrafın sahibi onu elle yazamamalı.
--
-- Ama listede gönderim kimliği, iş kimliği, gönderim zamanı, sağlayıcı
-- ve parite yoktu — üstelik şimdi bir de `solve_attempts` eklendi.
-- Açık kaldıkları sürece sahibi `solve_attempts`i tavana çekip
-- fotoğrafını sunucu kuyruğundan çıkarabilir ya da `solve_submission_id`
-- alanına başka bir gönderimin numarasını yazabilirdi. İkincisi tek
-- başına bir şey yapmaz (yoklama yalnızca `kuyrukta` satırlara bakıyor
-- ve o durumu yazmak zaten korumalı) ama aynı ailenin yarısını korumak,
-- bir sonraki değişiklikte hangi yarıda olduğumuzu hatırlamayı
-- gerektirir.
--
-- Aile artık bütün: çözüme dair her kolon aynı kapıdan geçiyor.
-- ═══════════════════════════════════════════════════════════════════

create or replace function app.guard_solve_fields()
returns trigger
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
begin
  if current_setting('role', true) = 'service_role'
     or auth.role() = 'service_role' then
    return new;
  end if;

  new.solve_status           := old.solve_status;
  new.solve_ra_deg           := old.solve_ra_deg;
  new.solve_dec_deg          := old.solve_dec_deg;
  new.solve_rotation_deg     := old.solve_rotation_deg;
  new.solve_scale_arcsec_px  := old.solve_scale_arcsec_px;
  new.solve_field_width_deg  := old.solve_field_width_deg;
  new.solve_field_height_deg := old.solve_field_height_deg;
  new.solved_at              := old.solved_at;
  new.solve_error            := old.solve_error;
  new.solve_provider         := old.solve_provider;
  new.solve_parity           := old.solve_parity;
  new.solve_submission_id    := old.solve_submission_id;
  new.solve_job_id           := old.solve_job_id;
  new.solve_submitted_at     := old.solve_submitted_at;
  new.solve_attempts         := old.solve_attempts;

  if current_setting('app.sayac_yazimi', true) is distinct from 'acik' then
    new.rating_sum    := old.rating_sum;
    new.rating_count  := old.rating_count;
    new.like_count    := old.like_count;
    new.comment_count := old.comment_count;
  end if;

  return new;
end;
$$;

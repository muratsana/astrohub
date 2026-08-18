-- ══════════════════════════════════════════════════════════════════════
-- `denetim_yaz` HİÇBİR ZAMAN ÇALIŞMADI
--
-- 20260815120000 bu fonksiyonu, panelin doğrudan `audit_logs`a yazmaya
-- çalışıp 42501 ile düşmesini kapatmak için ekledi. Ama fonksiyonun
-- kendisi de düşüyordu — bu kez daha sessiz bir şekilde:
--
--     declare v_id uuid;
--     ...
--     returning id into v_id;
--
-- `audit_logs.id` UUID DEĞİL, `bigint` (`nextval` ile). Dolayısıyla her
-- çağrı şu hatayla bitiyordu:
--
--     invalid input syntax for type uuid: "68"
--
-- Sayı her denemede bir artıyor: satır aslında EKLENİYOR, sonra dönüş
-- ataması patlıyor ve işlem geri alınıyor. Yani fonksiyon hem yazmıyor
-- hem de sequence'i tüketiyordu.
--
-- Kapsamı: `users.ts` içindeki üç KVKK çağrısı (user.export,
-- user.anonymize, user.deletion_request_cancel). Üçü de dönüş değerini
-- okumadığı için hata yutuluyordu — yani 20260815120000'in düzeltmek
-- için yazıldığı sorun, düzeltilmiş görünürken aynen duruyordu.
-- Tablodaki 10 satırın hepsi tetikleyicilerden geliyor
-- (`audit_profile_status`, içerik silme izi), fonksiyondan değil.
--
-- ── İKİNCİ UYUMSUZLUK ───────────────────────────────────────────────
--
-- `audit_logs.target_id` de `text`, parametre ise `uuid`. Ekleme
-- sırasında açık dönüşüm yazılmamıştı. Şimdi `::text` ile açık.
--
-- Parametre `uuid` KALIYOR: çağıranların hepsi uuid taşıyor ve tipi
-- gevşetmek, yanlışlıkla slug gönderen bir çağrının sessizce kabul
-- edilmesi demek olurdu.
--
-- ── DÖNÜŞ TİPİ DEĞİŞTİĞİ İÇİN ÖNCE DROP ─────────────────────────────
--
-- `create or replace` dönüş tipini değiştiremiyor. İmza aynı kaldığı
-- için çağıran taraf etkilenmiyor.
-- ══════════════════════════════════════════════════════════════════════

drop function if exists public.denetim_yaz(text, text, uuid, jsonb);

create function public.denetim_yaz(
  p_action      text,
  p_target_type text,
  p_target_id   uuid    default null,
  p_detail      jsonb   default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_id    bigint;
begin
  if v_actor is null then
    raise exception 'Denetim kaydı için oturum gerekiyor.'
      using errcode = '28000';
  end if;

  if not (app.is_admin() or app.has_role('moderator') or app.has_role('content_editor')) then
    raise exception 'Denetim kaydı için yetki yok.'
      using errcode = '42501';
  end if;

  if coalesce(trim(p_action), '') = '' then
    raise exception 'Denetim kaydında eylem adı zorunlu.';
  end if;

  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (
    v_actor,
    trim(p_action),
    nullif(trim(p_target_type), ''),
    p_target_id::text,
    coalesce(p_detail, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.denetim_yaz(text, text, uuid, jsonb) is
  'Denetim kaydı yazar. Aktör auth.uid() ile sunucuda belirlenir.';

revoke all on function public.denetim_yaz(text, text, uuid, jsonb) from public, anon;
grant execute on function public.denetim_yaz(text, text, uuid, jsonb) to authenticated;

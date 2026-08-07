-- ═══════════════════════════════════════════════════════════════════════
-- SON ADMİN KORUMASI · MODERATÖR SİSTEM MESAJI   (FAZ 2, kullanıcı kararı)
--
-- İki madde, ikisi de 7 Ağustos gözden geçirmesinde karara bağlandı.
--
-- ── ROL VERMEDE ONAY EKRANI YOK ───────────────────────────────────────
--
-- Karar: "rol vermeyi sadece admin yapacak, onaya gerek yok — admin
-- yapar, admin kaldırır." Bu göç bu yüzden rol tarafında YENİ BİR KURAL
-- KURMUYOR. `user_roles_admin_write` politikası zaten yalnızca
-- `app.is_admin()` geçiriyor; moderatör bir rolü ne verebiliyor ne
-- alabiliyor ve plan §FAZ 2'nin istediği de buydu. Ölçüldü, yerinde,
-- dokunulmadı.
-- ═══════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.venue_events') is not null
     or to_regclass('public.studio_profiles') is not null then
    raise exception
      'YANLIŞ PROJE: venue_events/studio_profiles görüldü — burası StageHub. Göç durduruldu.';
  end if;
end
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · SON ADMİN ROLÜ ALINAMAZ — KURAL VERİTABANINA TAŞINIYOR
--
-- ── NEDEN TAŞINIYOR ───────────────────────────────────────────────────
--
-- Kural bugüne kadar `users.ts` içindeki `revokeRole()` fonksiyonundaydı
-- ve o dosya bunu kendi yorumunda zaten kabul ediyordu: "yanlış tarafta
-- duran bir kural olduğunu biliyorum". Yanlış taraf, çünkü panel
-- `user_roles`a yazan tek yol DEĞİL — doğrudan bir REST çağrısı
-- (`DELETE /rest/v1/user_roles?role=eq.admin`) `user_roles_admin_write`
-- politikasından geçer, istemcideki sayımı hiç görmez ve son admin
-- satırını siler. Sonuç: paneli kimse açamaz ve geri dönüş yolu yalnızca
-- SQL konsoludur.
--
-- Yaptırımın arayüzde değil veritabanında olması gerektiği zaten planın
-- kuralı (§3.2 kota için, §8 askı/yasak için aynısını söylüyor). Bu
-- satır o kuralın rol tarafındaki karşılığı.
--
-- ── SAYIM NEDEN DOĞRU ─────────────────────────────────────────────────
--
-- `security definer` ve fonksiyon sahibi tabloyu da sahiplendiği için
-- sayım RLS'ten etkilenmiyor: `user_roles_select_own` normalde bir
-- kullanıcıya yalnızca kendi satırlarını gösterir ve tetikleyici o
-- görüşle sayarsa "bir tane kaldı" sanıp her silmeyi engellerdi.
--
-- ── KENDİ ROLÜNÜ DEVRETME HÂLÂ MÜMKÜN ─────────────────────────────────
--
-- Engellenen tek şey SONUNCUYU almak. İki admin varken biri kendi
-- rolünü bırakabiliyor; devretme senaryosu (önce yeni admin'e ver,
-- sonra kendinden al) çalışmaya devam ediyor.
--
-- ── HESAP SİLİNMESİ DE ENGELLENİYOR, BİLEREK ──────────────────────────
--
-- `user_roles.user_id` → `auth.users` üzerinde `on delete cascade`.
-- Son admin'in hesabı silinirse cascade bu tetikleyiciye çarpıyor ve
-- silme düşüyor. Kafa karıştırıcı bir hata mesajı gibi görünebilir ama
-- alternatifi, hesabın sessizce silinip platformun yöneticisiz
-- kalmasıydı. Mesaj ne yapılması gerektiğini söylüyor.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  kalan integer;
begin
  /* Yalnızca admin satırı kaybı denetleniyor. Diğer roller serbest. */
  if old.role <> 'admin' then
    return old;
  end if;

  /* UPDATE ile rol değiştiriliyorsa ve yine admin kalıyorsa kayıp yok. */
  if tg_op = 'UPDATE' and new.role = 'admin' then
    return new;
  end if;

  select count(*) into kalan from public.user_roles where role = 'admin';

  if kalan <= 1 then
    raise exception
      'Son yönetici rolü alınamaz — paneli kimse açamaz hale gelirdi.'
      using errcode = 'insufficient_privilege',
            hint = 'Önce başka bir kullanıcıya admin rolü verin, sonra bu rolü alın.';
  end if;

  return coalesce(new, old);
end;
$$;

comment on function app.guard_last_admin() is
  'Son admin rolünün silinmesini/değiştirilmesini reddeder. Kural istemcide değil burada: doğrudan REST çağrısı da bu tetikleyiciye çarpar.';

drop trigger if exists user_roles_last_admin on public.user_roles;
create trigger user_roles_last_admin
  before delete or update on public.user_roles
  for each row execute function app.guard_last_admin();

-- ══════════════════════════════════════════════════════════════════════
-- 2 · SİSTEM MESAJINI MODERATÖR DE GÖNDEREBİLİR
--
-- Karar: "aç". Gerekçe moderasyon işinin doğasında: bir içeriği
-- kaldıran ya da bir kullanıcıyı askıya alan moderatör, nedenini
-- anlatabilmeli. Mesaj gönderememek, moderasyonu sessiz bir cezaya
-- çeviriyordu.
--
-- YETKİ SINIRI DEĞİŞMİYOR, YALNIZCA GENİŞLİYOR: bu fonksiyon bildirim
-- yazmaktan başka bir şey yapmıyor. Moderatör hâlâ rol veremiyor
-- (`user_roles_admin_write`), izin dağıtımını değiştiremiyor
-- (`role_permissions` yazması admin'e kapalı) ve üyelik tanımlayamıyor
-- (`memberships_admin_write`).
--
-- Denetim kaydı `actor_id` ile kimin gönderdiğini zaten yazıyor; yetki
-- genişlemesinin izlenebilir olması bu satır sayesinde.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.notify_user(
  recipient uuid,
  title text,
  body text default null,
  url text default null
)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  bildirim uuid;
begin
  if not (app.is_admin() or app.has_role('moderator')) then
    raise exception 'Yalnızca yönetici ve moderatörler sistem mesajı gönderebilir.'
      using errcode = 'insufficient_privilege';
  end if;

  bildirim := app.notify(recipient, null, 'admin_direct', title, body, url, null, null);

  /* Gövde kayda YAZILMIYOR, uzunluğu yazılıyor: mesaj metni kişisel veri
     olabilir ve denetim kaydı yöneticilerin okuduğu bir yüzey. */
  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (auth.uid(), 'user.system_message', 'user', recipient::text,
          jsonb_build_object(
            'baslik', title,
            'govde_uzunlugu', coalesce(length(body), 0),
            'bildirim_id', bildirim));

  return bildirim;
end;
$$;

comment on function public.notify_user(uuid, text, text, text) is
  'Yönetici veya moderatörden kullanıcıya doğrudan sistem mesajı (admin_direct). Gönderim audit_logs''a düşer; mesaj gövdesi kayda yazılmaz, uzunluğu yazılır.';

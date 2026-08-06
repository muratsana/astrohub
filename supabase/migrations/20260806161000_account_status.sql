-- ═══════════════════════════════════════════════════════════════════════
-- HESAP DURUMU VE YÖNETİM ALANLARI  (Görev 1.1)
--
-- Bulgu T3 doğrulandı: `profiles` tablosunda hesap durumu diye bir şey
-- yoktu. Yöneticinin bir kullanıcıyı susturmak için elindeki tek yol
-- hesabı tamamen silmekti — yani "üç gün ara ver" ile "hesabını yok et"
-- arasında hiçbir basamak yoktu.
--
-- ── YAPTIRIM ARAYÜZDE DEĞİL, POLİTİKADA ────────────────────────────────
-- Askı bir arayüz durumu olarak kurulsaydı (düğmeyi gizle, formu kapat)
-- hiçbir şey ifade etmezdi: askıdaki kullanıcı anon anahtarla doğrudan
-- PostgREST'e yazabilirdi. Bu yüzden `app.is_account_active()` bir sonraki
-- migration'da yazma politikalarının içine giriyor; buradaki alanlar
-- yalnızca o fonksiyonun okuduğu veri.
--
-- ── SÜRELİ ASKI ZAMANI POLİTİKADA ÇÖZÜLÜYOR ────────────────────────────
-- `suspended_until` geçince hesabın kendiliğinden açılması için bir cron
-- işi YOK ve olmamalı: durum satırda `suspended` kalır, fonksiyon
-- karşılaştırmayı okuma anında yapar. Cron'lu kurgu, işin çalışmadığı
-- her dakikada kullanıcıyı haksız yere kilitli tutardı.
--
-- ── `username_customized_at` NEDEN BURADA ──────────────────────────────
-- Faz 3'ün (zorunlu kullanıcı adı seçimi) anahtarı. `app.handle_new_user`
-- kullanıcı adını `user_<12 hex>` diye üretiyor; bu alan NULL olduğu
-- sürece kullanıcı adı hâlâ o otomatik değer demektir.
--
-- GERİYE DÖNÜK KARAR: mevcut altı kullanıcının hepsinde NULL bırakılıyor.
-- Alternatifi "yalnızca `user_%` desenlilere NULL" idi; onu seçmedim,
-- çünkü kendi adını zaten seçmiş biri hoş geldin ekranında adını
-- onaylayıp geçer (tek ekran), ama desen eşleşmesine güvenip birini
-- atlarsak o kullanıcı ömür boyu `user_ab12cd34ef56` olarak kalır.
-- Yanlış tarafta hata yapmak ucuz olan yönü seçtim.
--
-- Geri alma: alter table public.profiles drop column ... (sekiz kolon),
--            drop type app.account_status;
-- ═══════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'app' and t.typname = 'account_status'
  ) then
    create type app.account_status as enum (
      'active',       -- normal
      'suspended',    -- süreli/süresiz askı; okur, yazamaz
      'banned',       -- kalıcı; public profili görünmez
      'deactivated'   -- kullanıcının kendi isteğiyle dondurduğu hesap
    );
  end if;
end $$;

alter table public.profiles
  add column if not exists account_status app.account_status not null default 'active',
  add column if not exists suspended_until timestamptz,
  add column if not exists status_reason text,
  add column if not exists status_changed_by uuid references auth.users(id) on delete set null,
  add column if not exists status_changed_at timestamptz,
  /* Yalnızca panelde görünen dahili not. Kullanıcıya GÖSTERİLMEZ —
     `status_reason` gösterilen gerekçe, bu ikisi ayrı alan olmalı. */
  add column if not exists admin_note text,
  add column if not exists username_customized_at timestamptz,
  /* Kullanıcı listesinde "son görülme" sütunu için. Yazma sıklığı
     istemcide saatte bire indiriliyor; her istekte yazmak altı
     kullanıcıda sorun değil ama on binde tabloyu şişirir. */
  add column if not exists last_seen_at timestamptz;

comment on column public.profiles.account_status is
  'Hesabın yazma yetkisi. Yaptırım app.is_account_active() üzerinden RLS''te.';
comment on column public.profiles.suspended_until is
  'Süreli askının bitişi. NULL + suspended = süresiz askı.';
comment on column public.profiles.status_reason is
  'Kullanıcıya GÖSTERİLEN gerekçe.';
comment on column public.profiles.admin_note is
  'Yalnızca panelde görünen dahili not. Kullanıcıya gösterilmez.';
comment on column public.profiles.username_customized_at is
  'NULL ise kullanıcı adı hâlâ app.handle_new_user() tarafından üretilmiş.';

/* Kullanıcı listesi duruma göre süzülüyor, son görülmeye göre sıralanıyor.
   Durum indeksi kısmi: satırların neredeyse tamamı `active` olacak ve
   onları indekslemek yalnızca yazma maliyeti demek. */
create index if not exists profiles_account_status_idx
  on public.profiles (account_status)
  where account_status <> 'active';
create index if not exists profiles_last_seen_idx
  on public.profiles (last_seen_at desc nulls last);


-- ── MERKEZİ KONTROL ────────────────────────────────────────────────────
--
-- Tek fonksiyon, tek yerde. Politikaların içine `account_status = 'active'
-- and (suspended_until is null or ...)` diye elle yazmak, bir gün bir
-- tablonun bu koşulun eski hâlini taşıması demekti.
--
-- STABLE: aynı ifade içinde tekrar tekrar çağrılsa da bir kez çalışır.
-- SECURITY DEFINER: `profiles` üzerindeki SELECT politikası ne olursa
-- olsun kontrol çalışmalı.
create or replace function app.is_account_active(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    /* Oturumsuz istek: bu fonksiyon "yazabilir mi" sorusunu cevaplıyor
       ve oturumsuzun zaten yazma politikası yok. `true` dönmek, mevcut
       anon politikalarını değiştirmemek demek. */
    when uid is null then true
    else coalesce(
      (
        select p.account_status = 'active'
            or (
              p.account_status = 'suspended'
              and p.suspended_until is not null
              and p.suspended_until <= now()
            )
        from public.profiles p
        where p.id = uid
      ),
      /* Profili olmayan kullanıcı: tetikleyici her auth.users satırı için
         profil açıyor, yani bu durum normalde imkânsız. Olursa yazmaya
         izin vermiyoruz — bilinmeyen durumda kapalı taraf güvenli taraf. */
      false
    )
  end;
$$;

comment on function app.is_account_active(uuid) is
  'Hesap yazma yetkisine sahip mi. Süresi dolmuş askı aktif sayılır.';

grant execute on function app.is_account_active(uuid) to authenticated, anon;


-- ── DURUM DEĞİŞİKLİĞİ DENETİM KAYDINA DÜŞER ────────────────────────────
--
-- Belge §0.6: "panelden yapılan her yazma işlemi audit_logs'a düşer".
-- Bunu çağrı yerlerine dağıtmak yerine tetikleyiciye koyuyorum: panel
-- dışından (SQL konsolu, başka bir istemci) yapılan değişiklik de kaçamaz.
-- Keşifte ölçülen durum buydu — `audit_logs`'a yazan yalnızca iki dosya
-- vardı ve tabloda tek kayıt duruyordu.
create or replace function app.audit_profile_status()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.account_status is distinct from old.account_status
     or new.suspended_until is distinct from old.suspended_until then
    insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
    values (
      auth.uid(),
      'user.status_change',
      'profile',
      new.id::text,
      jsonb_build_object(
        'onceki', old.account_status,
        'sonraki', new.account_status,
        'aski_bitisi', new.suspended_until,
        'gerekce', new.status_reason
      )
    );
  end if;

  if new.username is distinct from old.username then
    insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
    values (
      auth.uid(),
      'user.username_change',
      'profile',
      new.id::text,
      jsonb_build_object('onceki', old.username, 'sonraki', new.username)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_audit_status on public.profiles;
create trigger profiles_audit_status
  after update on public.profiles
  for each row
  execute function app.audit_profile_status();


-- Rol atama/alma da denetime düşsün: keşifte bunun da kaydı tutulmuyordu.
create or replace function app.audit_role_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (
    auth.uid(),
    case tg_op when 'INSERT' then 'user.role_grant' else 'user.role_revoke' end,
    'user_role',
    coalesce(new.user_id, old.user_id)::text,
    jsonb_build_object('rol', coalesce(new.role, old.role))
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists user_roles_audit on public.user_roles;
create trigger user_roles_audit
  after insert or delete on public.user_roles
  for each row
  execute function app.audit_role_change();

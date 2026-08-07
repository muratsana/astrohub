-- ═══════════════════════════════════════════════════════════════════════
-- ÜYELİK DENETİMİ VE SÜRE KORUMASI   (Yenileme planı FAZ 2, görev 3 ve 6)
--
-- ── ÖNCE ÖLÇÜLDÜ, SONRA YAZILDI (§6.8) ────────────────────────────────
--
-- FAZ 2 altı madde istiyor. Üçü bu depoda ZATEN kurulu ve yeniden
-- yazılmadı:
--
--   • Kullanıcı listesi (arama, süzme, sunucu taraflı sayfalama) —
--     `fetchUsers()` + `UserControl` sayfalama çubuğu.
--   • Hesap durumu yönetimi — `setAccountStatus()` +
--     `app.is_account_active()` ve ona bağlı on bir RLS politikası.
--   • Kullanıcıya doğrudan sistem mesajı — `public.notify_user()`
--     (kind = 'admin_direct'). Arka uçta hazır, yalnızca arayüze
--     bağlanmamış.
--
-- Denetim kaydı da kısmen kuruluydu: `user_roles_audit` rol
-- değişikliğini, `profiles_audit_status` hesap durumunu yazıyor.
--
-- GERÇEK BOŞLUK İKİ TANE ve bu göç ikisini kapatıyor:
--
--   1. `memberships` üzerinde denetim tetikleyicisi YOKTU. Yani bir
--      yönetici birine premium verdiğinde ya da aldığında hiçbir yere
--      kayıt düşmüyordu. Rol vermenin kaydı var, premium vermenin yok —
--      ikisi de aynı sınıf yetki işlemi.
--
--   2. Süresi GEÇMİŞ bir tarihle premium tanımlanabiliyordu. `active` +
--      `current_period_end` dünde bir üyelik, `app.etkin_statu`
--      tarafından anında standart sayılır: yönetici premium verdiğini
--      sanır, kullanıcı hiçbir şey görmez ve ikisi de nedenini bilmez.
--      Sessiz başarısızlık; kabul etmek yerine reddediliyor.
--
-- ── SÜRESİZ ÜYELİK ELDEN ÇIKMIYOR ─────────────────────────────────────
--
-- Plan "süresiz veya tarihe kadar" diyor. Süresiz = `current_period_end`
-- NULL ve `app.etkin_statu` bunu 0013'ten beri premium sayıyor. Koruma
-- yalnızca GEÇMİŞ bir tarihi reddediyor; NULL'a dokunmuyor.
--
-- Geri alma: iki tetikleyici ve iki fonksiyon düşürülür, `notify_user`
-- gövdesi 0044'teki hâline döndürülür.
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
-- 1 · ÜYELİK DEĞİŞİKLİĞİ DENETİME YAZILIYOR
--
-- Desen `app.audit_role_change`'den birebir alındı: aynı sınıf işlem
-- aynı biçimde kayda geçsin, denetim görüntüleyicisi iki farklı şekil
-- ayrıştırmak zorunda kalmasın.
--
-- `actor_id` = auth.uid(). pg_cron'un düşürdüğü üyeliklerde bu NULL
-- kalıyor ve doğrusu bu: o değişikliği bir insan yapmadı. Cron'un FAZ
-- 1'de kendi yazdığı ayrı kayıt bu göçün 2b bölümünde kaldırılıyor —
-- aynı olay iki satır olmasın.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.audit_membership_change()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  eski_statu text := (case when tg_op = 'INSERT' then null else old.status::text end);
  yeni_statu text := (case when tg_op = 'DELETE' then null else new.status::text end);
begin
  /*
   * DEĞİŞMEYEN GÜNCELLEME KAYDA GEÇMİYOR. `set_updated_at` her yazmada
   * çalışıyor; süre ve statü aynıysa bu bir yönetim işlemi değil ve
   * denetim kaydını dolduran gürültüden ibaret olurdu.
   */
  if tg_op = 'UPDATE'
     and old.status is not distinct from new.status
     and old.current_period_end is not distinct from new.current_period_end then
    return new;
  end if;

  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (
    auth.uid(),
    case tg_op
      when 'INSERT' then 'membership.grant'
      when 'DELETE' then 'membership.revoke'
      else 'membership.change'
    end,
    'user',
    coalesce(new.user_id, old.user_id)::text,
    jsonb_strip_nulls(jsonb_build_object(
      'eski_statu', eski_statu,
      'yeni_statu', yeni_statu,
      'eski_bitis', (case when tg_op = 'INSERT' then null else old.current_period_end end),
      'yeni_bitis', (case when tg_op = 'DELETE' then null else new.current_period_end end),
      /* Süresiz üyelik ayrıca işaretleniyor: NULL bir bitiş tarihi ile
         "alan hiç yazılmadı" denetim kaydında birbirine benziyor. */
      'suresiz', (case when tg_op <> 'DELETE' and new.current_period_end is null
                       then true else null end)
    ))
  );

  return coalesce(new, old);
end;
$$;

comment on function app.audit_membership_change() is
  'Üyelik verme/alma/değiştirme işlemlerini audit_logs''a yazar. Rol değişikliğiyle aynı desen.';

drop trigger if exists memberships_audit on public.memberships;
create trigger memberships_audit
  after insert or update or delete on public.memberships
  for each row execute function app.audit_membership_change();

-- ══════════════════════════════════════════════════════════════════════
-- 2 · GEÇMİŞ TARİHLİ PREMIUM REDDEDİLİYOR
--
-- Kontrol `check` kısıtı DEĞİL, tetikleyici: `now()` sabit olmayan bir
-- ifade ve kısıt içinde kullanılamıyor. Ayrıca kısıt her satır
-- güncellemesinde yeniden değerlendirilirdi — dün verilmiş, bugün süresi
-- dolmuş meşru bir kaydı güncellemek imkânsız hale gelirdi.
--
-- Bu yüzden kontrol yalnızca DEĞİŞEN süreye uygulanıyor: cron'un
-- `expired` yapması ya da eski bir kaydın başka bir alanına dokunulması
-- engellenmiyor.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.guard_membership_period()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if new.status not in ('active', 'grace') then
    return new;                                  -- süre yalnızca premiumda anlamlı
  end if;

  if new.current_period_end is null then
    return new;                                  -- süresiz — plan §3.2 premium sayıyor
  end if;

  /* Yalnızca YENİ yazılan bir süre denetleniyor. Var olan kaydın süresi
     zaten geçmişse ve bu yazmada değişmiyorsa itiraz edilmiyor. */
  if tg_op = 'UPDATE'
     and old.current_period_end is not distinct from new.current_period_end then
    return new;
  end if;

  if new.current_period_end <= now() then
    raise exception
      'Üyelik bitişi geçmiş bir tarih olamaz (% ≤ %). Süresiz üyelik için tarihi boş bırakın.',
      new.current_period_end, now()
      using errcode = 'check_violation',
            hint = 'Premium hemen sona ereceği için kullanıcı hiçbir değişiklik görmezdi.';
  end if;

  return new;
end;
$$;

comment on function app.guard_membership_period() is
  'Geçmiş tarihli premium tanımlamayı reddeder. NULL bitiş (süresiz) serbest.';

drop trigger if exists memberships_period_guard on public.memberships;
create trigger memberships_period_guard
  before insert or update on public.memberships
  for each row execute function app.guard_membership_period();

-- ══════════════════════════════════════════════════════════════════════
-- 2b · CRON'UN KENDİ DENETİM KAYDI KALDIRILIYOR — İKİ SATIR OLMASIN
--
-- FAZ 1'de `app.uyelik_suresi_dolanlari_dusur()` süresi dolan üyelikleri
-- `expired` yaparken denetime kendisi yazıyordu. O zaman doğruydu:
-- `memberships` üzerinde tetikleyici yoktu ve yazmasa hiç kayıt
-- kalmayacaktı.
--
-- Artık tetikleyici var ve aynı güncellemeyi zaten yazıyor. İkisini bir
-- arada bırakmak, her gece her süresi dolan üyelik için denetim
-- kaydında İKİ satır demekti — biri 'membership.expired', biri
-- 'membership.change'. Aynı olayın iki kaydı, §6.8'in yasakladığı ikinci
-- kaynağın denetim kaydındaki hâli.
--
-- Kalan tek kayıt tetikleyicininki ve `actor_id` NULL: bu değişikliği
-- bir insan yapmadı. Fonksiyonun döndürdüğü sayı değişmiyor.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.uyelik_suresi_dolanlari_dusur()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  sayi integer;
begin
  update public.memberships m
     set status = 'expired', updated_at = now()
   where m.status in ('active', 'grace')
     and m.current_period_end is not null
     and m.current_period_end <= now();

  get diagnostics sayi = row_count;
  return sayi;                    -- denetim kaydını memberships_audit yazıyor
end;
$$;

comment on function app.uyelik_suresi_dolanlari_dusur() is
  'Süresi geçmiş üyelikleri expired yapar. Denetim kaydını memberships_audit tetikleyicisi yazar (actor_id null = cron). pg_cron çağırır.';

revoke all on function app.uyelik_suresi_dolanlari_dusur()
  from public, anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 3 · SİSTEM MESAJI DA DENETİME DÜŞÜYOR
--
-- `notify_user` 0044'ten beri var ve işini yapıyor; yeniden yazılmıyor.
-- Eksik olan tek şey kaydı: plan FAZ 2 görev 6 "tüm işlemler
-- audit_logs'a" diyor ve bir yöneticinin kullanıcıya mesaj göndermesi
-- bunlardan biri. Bildirimin kendisi kullanıcı tarafından silinebiliyor
-- (`notifications_delete_own`), yani mesajın gönderildiğinin tek kalıcı
-- kanıtı denetim kaydı.
--
-- Gövde denetime YAZILMIYOR, uzunluğu yazılıyor: mesaj metni kişisel
-- veri olabilir ve denetim kaydı yöneticilerin okuduğu bir yüzey.
-- Gönderildiği, kime ve ne zaman gönderildiği sorulara cevap veriyor.
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
  if not app.is_admin() then
    raise exception 'Yalnızca yöneticiler bildirim gönderebilir.'
      using errcode = 'insufficient_privilege';
  end if;

  bildirim := app.notify(recipient, null, 'admin_direct', title, body, url, null, null);

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
  'Yöneticiden kullanıcıya doğrudan sistem mesajı (admin_direct). Gönderim audit_logs''a düşer; mesaj gövdesi kayda yazılmaz, uzunluğu yazılır.';

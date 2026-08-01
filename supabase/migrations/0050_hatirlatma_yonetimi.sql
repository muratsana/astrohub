-- ════════════════════════════════════════════════════════════════════════════
-- 0050 — HATIRLATMA YÖNETİMİ VE ETKİNLİK DEĞİŞİKLİK GEÇMİŞİ (Faz 6, yönetici)
--
-- §9'un yönetici listesi altı şey istiyor: teslim istatistikleri, hatalı
-- işler, yeniden deneme, global varsayılanlar, zorunlu duyuru ve etkinlik
-- değişiklik geçmişi. Bu göç altısının da veri tarafını kuruyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- DEĞİŞİKLİK GEÇMİŞİ AYRI TABLO, `audit_logs` DEĞİL
--
-- `audit_logs` (0007) yönetici EYLEMLERİNİ tutuyor: kim hangi yetkiyle ne
-- yaptı. Etkinlik değişikliği farklı bir soru soruyor — "bu etkinliğin
-- tarihi kaç kez kaydı, ne zaman, neyden neye" — ve cevabı etkinliğin
-- kendi sayfasında, katılımcıya da gösterilebilir olmalı. İkisini aynı
-- tabloya doldurmak, katılımcıya gösterilecek bir kaydı yönetici denetim
-- kaydının içine gömmek olurdu.
--
-- SATIR KULLANICI TARAFINDAN YAZILAMAZ: yalnızca tetikleyici yazıyor,
-- kimseye `insert` yetkisi verilmiyor. Geçmişin değiştirilebildiği yerde
-- geçmiş yoktur.
--
-- ══════════════════════════════════════════════════════════════════════════
-- "KULLANICI TERCİHLERİNİ HUKUKA AYKIRI BİÇİMDE AŞMAMA" (§9)
--
-- Zorunlu duyuru `announcement` türünde üretiliyor, o da `sistem`
-- kategorisinde. `sistem` kategorisi kapatılamaz (0042) ama bunun sebebi
-- "yönetici istediğini gönderebilsin" değil: hesabı, üyeliği, güvenliği
-- ilgilendiren bilgiler kapatılamaz olmalı. PAZARLAMA BU KAPIDAN GEÇEMEZ —
-- `notification_preferences.marketing_opt_in` ayrı bir alan ve duyuru
-- fonksiyonu ona bakmıyor, çünkü bu fonksiyonla pazarlama gönderilmiyor.
-- Kural kodda değil kullanımda: fonksiyonun açıklaması sınırı yazıyor,
-- denetim kaydı da her duyuruyu kimin gönderdiğini tutuyor.
-- ════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- ETKİNLİK DEĞİŞİKLİK GEÇMİŞİ
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.event_changes (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  /* Kim değiştirdi. Dış kaynaktan toplu güncellemede boş kalabilir. */
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  /* {"starts_at": {"eski": "...", "yeni": "..."}, ...} — alan adı ve iki
     değer. Metin olarak saklanıyor: kolonların tipleri farklı ve geçmiş
     kaydının işi hesaplamak değil göstermek. */
  changes    jsonb not null,

  constraint event_changes_not_empty check (changes <> '{}'::jsonb)
);

comment on table public.event_changes is
  'Etkinlik değişiklik geçmişi (§9). Yalnızca tetikleyici yazar.';

create index if not exists event_changes_event_idx
  on public.event_changes (event_id, changed_at desc);

/*
 * İZLENEN ALANLAR SINIRLI. Her kolonu kaydetmek `registered_count`
 * güncellemeleriyle tabloyu doldururdu — kayıt sayacı her katılımcıda
 * değişiyor ve bu bir "etkinlik değişikliği" değil.
 */
create or replace function app.record_event_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  degisiklik jsonb := '{}'::jsonb;
begin
  if new.starts_at is distinct from old.starts_at then
    degisiklik := degisiklik || jsonb_build_object('starts_at',
      jsonb_build_object('eski', old.starts_at::text, 'yeni', new.starts_at::text));
  end if;
  if new.ends_at is distinct from old.ends_at then
    degisiklik := degisiklik || jsonb_build_object('ends_at',
      jsonb_build_object('eski', old.ends_at::text, 'yeni', new.ends_at::text));
  end if;
  if new.status is distinct from old.status then
    degisiklik := degisiklik || jsonb_build_object('status',
      jsonb_build_object('eski', old.status::text, 'yeni', new.status::text));
  end if;
  if new.venue is distinct from old.venue then
    degisiklik := degisiklik || jsonb_build_object('venue',
      jsonb_build_object('eski', old.venue, 'yeni', new.venue));
  end if;
  if new.city is distinct from old.city then
    degisiklik := degisiklik || jsonb_build_object('city',
      jsonb_build_object('eski', old.city, 'yeni', new.city));
  end if;
  if new.title is distinct from old.title then
    degisiklik := degisiklik || jsonb_build_object('title',
      jsonb_build_object('eski', old.title, 'yeni', new.title));
  end if;
  if new.capacity is distinct from old.capacity then
    degisiklik := degisiklik || jsonb_build_object('capacity',
      jsonb_build_object('eski', old.capacity::text, 'yeni', new.capacity::text));
  end if;

  if degisiklik = '{}'::jsonb then
    return new;
  end if;

  insert into public.event_changes (event_id, changed_by, changes)
  values (new.id, auth.uid(), degisiklik);

  return new;
end $$;

drop trigger if exists events_record_change on public.events;
create trigger events_record_change
  after update on public.events
  for each row execute function app.record_event_change();

alter table public.event_changes enable row level security;

/*
 * GEÇMİŞ KATILIMCIYA DA AÇIK. "Tarih iki kez değişti" bilgisi, etkinliğe
 * güvenip yol planı yapan kişinin bilmesi gereken bir şey; yalnızca
 * yöneticiye göstermek, şeffaflığı yönetim aracına indirgemek olurdu.
 * Taslak etkinliğin geçmişi görünmüyor — etkinliğin kendisi görünmüyor.
 */
drop policy if exists event_changes_read on public.event_changes;
create policy event_changes_read on public.event_changes
  for select using (
    exists (
      select 1 from public.events e
       where e.id = event_changes.event_id
         and (e.status <> 'draft'
              or e.organizer_id = (select auth.uid())
              or app.is_admin())
    )
  );

grant select on public.event_changes to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- GLOBAL VARSAYILANLAR
--
-- Küçük bir anahtar/değer tablosu. Ayrı bir `reminder_settings` tablosu
-- açmak, bir sonraki global ayarda ikincisini açtırırdı; tek satırlık bir
-- tablo (`site_config` deseni) ise her yeni ayarda göç istiyordu.
--
-- OKUMA HERKESE AÇIK, YAZMA YÖNETİCİYE. Değerler ayar, sır değil —
-- arayüzün varsayılan hatırlatma seçeneğini bilmesi gerekiyor.
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,

  constraint app_settings_key_format check (key ~ '^[a-z0-9_]{3,60}$')
);

comment on table public.app_settings is
  'Yönetici tarafından ayarlanan global varsayılanlar. Bugünkü tek anahtar: reminder_defaults.';

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select using (true);

drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

grant select on public.app_settings to anon, authenticated;
grant insert, update, delete on public.app_settings to authenticated;

/*
 * VARSAYILAN "1 gün önce" ÖNERİLİYOR, KURULMUYOR. Takip eden herkese
 * kendiliğinden hatırlatma açmak, kimsenin istemediği bildirimi varsayılan
 * yapardı; arayüz bu değeri yalnızca ÖN SEÇİLİ gösteriyor.
 */
insert into public.app_settings (key, value)
values ('reminder_defaults', '{"onerilen": "gun", "acik_secenekler": ["hafta","gun","etkinlik_gunu","ozel"]}'::jsonb)
on conflict (key) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- TESLİM İSTATİSTİKLERİ
--
-- Sayılar SQL'de toplanıyor, arayüzde değil: yönetici panelinin bütün
-- hatırlatma satırlarını indirip sayması, tablo büyüdükçe çalışmayan bir
-- ekran demekti.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.reminder_delivery_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  sonuc jsonb;
begin
  if not app.is_admin() then
    raise exception 'Yalnızca yöneticiler görebilir.'
      using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'bekleyen',      count(*) filter (where sent_at is null and last_error is null),
    'vakti_gelen',   count(*) filter (where sent_at is null and due_at <= now()),
    'hatali',        count(*) filter (where sent_at is null and last_error is not null),
    'gonderilen',    count(*) filter (where sent_at is not null),
    'gonderilen_24s',count(*) filter (where sent_at > now() - interval '24 hours'),
    'toplam',        count(*)
  ) into sonuc
  from public.reminders;

  return sonuc;
end $$;

revoke execute on function public.reminder_delivery_stats() from public, anon;
grant  execute on function public.reminder_delivery_stats() to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- HATALI İŞLER
--
-- `security definer`, çünkü hatalı satır BAŞKA kullanıcılara ait ve
-- `reminders` politikası "yalnızca kendi satırın" diyor. Yöneticiye ayrı
-- bir RLS politikası açmak, hatırlatma tablosunu yönetici için tümüyle
-- okunur yapardı; burada dönen alanlar sınırlı ve amaç belli.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.failed_reminders(page_size integer default 50)
returns table (
  id          uuid,
  event_title text,
  event_slug  text,
  due_at      timestamptz,
  attempts    integer,
  last_error  text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not app.is_admin() then
    raise exception 'Yalnızca yöneticiler görebilir.'
      using errcode = 'insufficient_privilege';
  end if;

  return query
    select r.id, e.title, e.slug, r.due_at, r.attempts, r.last_error
      from public.reminders r
      join public.events e on e.id = r.event_id
     where r.sent_at is null and r.last_error is not null
     order by r.due_at
     limit least(greatest(page_size, 1), 200);
end $$;

revoke execute on function public.failed_reminders(integer) from public, anon;
grant  execute on function public.failed_reminders(integer) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- YENİDEN DENEME
--
-- Gövde `app.deliver_reminder` (0049) — cron'un çağırdığı fonksiyonun
-- ta kendisi. Yöneticiye ikinci bir gönderim yolu yazsaydık, biri
-- düzeltilip diğeri unutulurdu.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.retry_reminder(target uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  sonuc boolean;
begin
  if not app.is_admin() then
    raise exception 'Yalnızca yöneticiler yeniden deneyebilir.'
      using errcode = 'insufficient_privilege';
  end if;

  sonuc := app.deliver_reminder(target);

  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (auth.uid(), 'reminder_retry', 'reminders', target::text,
          jsonb_build_object('basarili', sonuc));

  return sonuc;
end $$;

revoke execute on function public.retry_reminder(uuid) from public, anon;
grant  execute on function public.retry_reminder(uuid) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- ZORUNLU DUYURU
--
-- Herkese giden tek bildirim. `app.notify` kullanıcı başına çağrılıyor
-- (tek `insert … select` yerine), çünkü engel/tercih kontrolleri orada ve
-- `announcement` türü `sistem` kategorisinde: tercih kontrolü zaten "izin
-- var" diyecek. Yine de merkezi yoldan geçmek, ileride bir kural
-- eklendiğinde duyurunun onu atlamamasını sağlıyor.
--
-- Her duyuru denetim kaydına düşüyor: "kim, ne zaman, kaç kişiye".
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.broadcast_announcement(
  title text,
  body  text default null,
  url   text default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  alici record;
  sayac integer := 0;
begin
  if not app.is_admin() then
    raise exception 'Yalnızca yöneticiler duyuru gönderebilir.'
      using errcode = 'insufficient_privilege';
  end if;

  if char_length(coalesce(title, '')) < 3 then
    raise exception 'Duyuru başlığı çok kısa.' using errcode = 'check_violation';
  end if;

  for alici in select id from auth.users loop
    if app.notify(alici.id, null, 'announcement', title, body, url, null, null)
       is not null then
      sayac := sayac + 1;
    end if;
  end loop;

  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (auth.uid(), 'broadcast_announcement', 'notifications', null,
          jsonb_build_object('baslik', title, 'alici_sayisi', sayac));

  return sayac;
end $$;

revoke execute on function public.broadcast_announcement(text, text, text)
  from public, anon;
grant  execute on function public.broadcast_announcement(text, text, text)
  to authenticated;

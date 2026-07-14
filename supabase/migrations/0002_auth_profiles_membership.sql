-- 0002_auth_profiles_membership.sql
-- Astrohub — kimlik, profil, rol ve tek üyelik modeli (§4, §9.2).
-- Her tablo açık RLS ile gelir (§15.1).

-- ══════════════════════════════════════════════════════════════════════════
-- PROFILES — auth.users ile 1:1
-- ══════════════════════════════════════════════════════════════════════════
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      citext unique not null,
  display_name  text,
  bio           text,
  city          text,
  avatar_path   text,                       -- avatars bucket'ında (§10.2)
  website_url   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,30}$')
);

comment on table public.profiles is 'Kullanıcı profili; auth.users ile 1:1.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function app.set_updated_at();

-- Kayıt olan her kullanıcı için otomatik profil oluştur.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    -- Geçici benzersiz kullanıcı adı; kullanıcı sonradan değiştirir.
    'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
    coalesce(new.raw_user_meta_data ->> 'display_name', null)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- ══════════════════════════════════════════════════════════════════════════
-- USER_ROLES — rol = yetki, üyelikten ayrı (§4.4)
-- ══════════════════════════════════════════════════════════════════════════
create table public.user_roles (
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        app.app_role not null,
  granted_by  uuid references auth.users (id),
  granted_at  timestamptz not null default now(),
  primary key (user_id, role)
);

comment on table public.user_roles is 'Kullanıcı yetkileri. Admin/organizatör vb. buradan kontrol edilir (§15.1).';

-- Rol kontrol yardımcıları. Admin yetkisi JWT metadata'ya değil bu tabloya
-- dayanır (§15.1). security definer ile RLS bypass ederek güvenli okur.
create or replace function app.has_role(check_role app.app_role)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = check_role
  );
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select app.has_role('admin');
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- MEMBERSHIPS — tek ücretli paket (§4.1)
-- ══════════════════════════════════════════════════════════════════════════
create type public.membership_status as enum (
  'active', 'grace', 'expired', 'canceled', 'none'
);

create type public.billing_interval as enum ('monthly', 'yearly');

create table public.memberships (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references auth.users (id) on delete cascade,
  status              public.membership_status not null default 'none',
  interval            public.billing_interval,
  current_period_end  timestamptz,
  cancel_at_period_end boolean not null default false,
  provider            text,                 -- ödeme sağlayıcısı (adapter — §14.5)
  provider_customer_id text,
  provider_subscription_id text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.memberships is 'Tek üyelik paketi. Aylık/yıllık aynı hakları verir (§4.1).';

create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function app.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════
-- BILLING_TRANSACTIONS — ödeme/işlem kaydı (§14.5)
-- ══════════════════════════════════════════════════════════════════════════
create table public.billing_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  amount_minor  integer not null,           -- kuruş cinsinden
  currency      text not null default 'TRY',
  status        text not null,              -- succeeded/failed/refunded/pending
  provider      text,
  provider_event_id text unique,            -- webhook idempotency (§14.5)
  created_at    timestamptz not null default now()
);

comment on column public.billing_transactions.provider_event_id is
  'Sağlayıcı olay kimliği; webhook idempotency için benzersiz (§19.1).';

-- ══════════════════════════════════════════════════════════════════════════
-- NOTIFICATION_PREFERENCES — kategori bazlı tercih (§8.13, §14.6)
-- ══════════════════════════════════════════════════════════════════════════
create table public.notification_preferences (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled  boolean not null default false,
  -- Kategori tercihleri esnek tutulur; doğrulama uygulama katmanında.
  categories    jsonb not null default '{}'::jsonb,
  marketing_opt_in boolean not null default false,  -- KVKK: pazarlama ayrı (§15.7)
  updated_at    timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function app.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════
-- PUSH_SUBSCRIPTIONS — web push (§16.3 PWA)
-- ══════════════════════════════════════════════════════════════════════════
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- ══════════════════════════════════════════════════════════════════════════
-- KVKK — hesap silme talebi ve veri dışa aktarma kaydı (§15.7)
-- ══════════════════════════════════════════════════════════════════════════
create table public.account_deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  requested_at  timestamptz not null default now(),
  scheduled_for timestamptz,                -- geri alma penceresi sonu (§10.8)
  status        text not null default 'pending',
  reason        text
);

create table public.account_export_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  export_path  text
);

-- ══════════════════════════════════════════════════════════════════════════
-- RLS POLİTİKALARI (§15.1)
--   Varsayılan: kullanıcı yalnızca kendi verisini görür/yönetir; admin hepsini.
--   Kritik alanlar (üyelik durumu, roller) yalnızca sunucu/service-role yazar.
-- ══════════════════════════════════════════════════════════════════════════

alter table public.profiles                 enable row level security;
alter table public.user_roles               enable row level security;
alter table public.memberships              enable row level security;
alter table public.billing_transactions     enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions       enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.account_export_logs      enable row level security;

-- profiles: herkes okur (public profil); sahibi günceller; admin tümünü yönetir.
create policy profiles_select_all on public.profiles
  for select using (true);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_admin_all on public.profiles
  for all using (app.is_admin()) with check (app.is_admin());

-- user_roles: kullanıcı kendi rollerini görür; yalnızca admin değiştirir.
create policy user_roles_select_own on public.user_roles
  for select using (auth.uid() = user_id or app.is_admin());
create policy user_roles_admin_write on public.user_roles
  for all using (app.is_admin()) with check (app.is_admin());

-- memberships: sahibi okur; yazma yalnızca admin/service-role (webhook entitlement).
create policy memberships_select_own on public.memberships
  for select using (auth.uid() = user_id or app.is_admin());
create policy memberships_admin_write on public.memberships
  for all using (app.is_admin()) with check (app.is_admin());

-- billing_transactions: sahibi okur; yazma service-role/admin.
create policy billing_select_own on public.billing_transactions
  for select using (auth.uid() = user_id or app.is_admin());
create policy billing_admin_write on public.billing_transactions
  for all using (app.is_admin()) with check (app.is_admin());

-- notification_preferences: sahibi tam yönetir.
create policy notif_prefs_own on public.notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- push_subscriptions: sahibi tam yönetir.
create policy push_subs_own on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- account_deletion_requests: sahibi oluşturur/görür; admin yönetir.
create policy deletion_own on public.account_deletion_requests
  for select using (auth.uid() = user_id or app.is_admin());
create policy deletion_insert_own on public.account_deletion_requests
  for insert with check (auth.uid() = user_id);
create policy deletion_admin_all on public.account_deletion_requests
  for all using (app.is_admin()) with check (app.is_admin());

-- account_export_logs: sahibi görür; yazma service-role/admin.
create policy export_select_own on public.account_export_logs
  for select using (auth.uid() = user_id or app.is_admin());
create policy export_admin_write on public.account_export_logs
  for all using (app.is_admin()) with check (app.is_admin());

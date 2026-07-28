-- 0013_tiered_quota_and_user_equipment.sql
-- Kademeye bağlı fotoğraf kotası (§4.2) ve kullanıcı katkılı ekipman (§9.2).

-- ══════════════════════════════════════════════════════════════════════════
-- ÜYELİK KADEMESİ
--
-- `memberships.status` beş değer taşıyor; kota açısından anlamlı olan tek
-- ayrım "ödeme ayakta mı". `active` ve `grace` premium sayılır — grace,
-- ödemesi gecikmiş ama içeriği görünür kalan dönemdir (§4.3) ve o dönemde
-- kullanıcının fotoğraflarını yayından düşürmek, ödeme sorununu bir içerik
-- cezasına çevirmek olurdu.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.membership_tier(target_user uuid)
returns text
language sql
stable
security definer set search_path = ''
as $fn$
  select case
    when exists (
      select 1 from public.memberships m
      where m.user_id = target_user
        and m.status in ('active', 'grace')
    ) then 'premium'
    else 'standart'
  end;
$fn$;

comment on function app.membership_tier is
  'Kullanıcının kota kademesi. active/grace → premium, gerisi standart (§4.2).';

create or replace function app.photo_limit(target_user uuid)
returns integer
language sql
stable
security definer set search_path = ''
as $fn$
  select case app.membership_tier(target_user)
    when 'premium' then 50
    else 3
  end;
$fn$;

/*
 * KOTA TETİKLEYİCİSİ — sınır artık sabit değil, kademeden okunuyor.
 *
 * Hata mesajı sınırı ve kademeyi birlikte söylüyor: yalnızca "kota dolu"
 * demek, standart kullanıcıya premium diye bir seçenek olduğunu hiç
 * duyurmadan kapıyı kapatmak olurdu.
 */
create or replace function app.enforce_photo_quota()
returns trigger
language plpgsql
security definer set search_path = ''
as $fn$
declare
  limit_count integer;
  current_count integer;
  tier text;
begin
  if new.status <> 'published' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;

  select app.photo_limit(new.user_id) into limit_count;
  select app.membership_tier(new.user_id) into tier;
  select app.active_photo_count(new.user_id) into current_count;

  if current_count >= limit_count then
    raise exception
      'Aktif fotoğraf kotası dolu (% / %, % üyelik). Yeni fotoğraf yayımlamak için mevcut bir kaydı arşivleyin.',
      current_count, limit_count, tier
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

-- ══════════════════════════════════════════════════════════════════════════
-- KULLANICI KATKILI EKİPMAN
--
-- Katalogda olmayan bir modelle çekim yapan kullanıcı, künyesini eksik
-- bırakmak zorunda kalıyordu. Artık kendisi ekleyebiliyor — ama kayıt
-- `approved = false` başlıyor ve yalnızca ekleyene görünüyor. Onaysız bir
-- katkının herkese açık katalogda belirmesi, katalogun güvenilirliğini
-- ilk yanlış girişte bitirirdi.
-- ══════════════════════════════════════════════════════════════════════════
alter table public.equipment_models
  add column if not exists submitted_by uuid references auth.users (id) on delete set null,
  add column if not exists approved boolean not null default true;

alter table public.equipment_brands
  add column if not exists submitted_by uuid references auth.users (id) on delete set null,
  add column if not exists approved boolean not null default true;

comment on column public.equipment_models.approved is
  'Editör onayı. Kullanıcı katkıları false başlar ve yalnızca ekleyene görünür.';

/*
 * Mevcut kayıtlar onaylı: tohum katalog editör tarafından hazırlandı.
 * Varsayılanı `true` yapıp katkıda açıkça `false` yazmak, tersinden
 * güvenli: yeni bir kod yolu bayrağı unutursa kayıt görünmez kalır
 * (kaybolur), herkese açık hâle gelmez.
 */
create index if not exists equipment_models_pending_idx
  on public.equipment_models (approved, created_at desc)
  where not approved;

-- ── Okuma: onaylılar herkese; onaysızlar ekleyene ve editöre ──
drop policy if exists equipment_models_read on public.equipment_models;
create policy equipment_models_read on public.equipment_models
  for select using (
    approved
    or auth.uid() = submitted_by
    or app.is_admin()
    or app.has_role('content_editor')
  );

drop policy if exists equipment_brands_read on public.equipment_brands;
create policy equipment_brands_read on public.equipment_brands
  for select using (
    approved
    or auth.uid() = submitted_by
    or app.is_admin()
    or app.has_role('content_editor')
  );

-- ── Katkı: oturum açmış kullanıcı ekleyebilir, onaylı olarak ekleyemez ──
drop policy if exists equipment_models_contribute on public.equipment_models;
create policy equipment_models_contribute on public.equipment_models
  for insert to authenticated
  with check (
    (auth.uid() = submitted_by and approved = false)
    or app.is_admin()
    or app.has_role('content_editor')
  );

drop policy if exists equipment_brands_contribute on public.equipment_brands;
create policy equipment_brands_contribute on public.equipment_brands
  for insert to authenticated
  with check (
    (auth.uid() = submitted_by and approved = false)
    or app.is_admin()
    or app.has_role('content_editor')
  );

/*
 * Kendi onaysız katkısını düzenleyebilir ama ONAYLAYAMAZ: `with check`
 * hâlâ `approved = false` istiyor. Onay editörün işi; kullanıcının kendi
 * kaydını onaylayabilmesi, onay adımını tümüyle anlamsız kılardı.
 */
drop policy if exists equipment_models_edit_own_pending on public.equipment_models;
create policy equipment_models_edit_own_pending on public.equipment_models
  for update to authenticated
  using (auth.uid() = submitted_by and not approved)
  with check (auth.uid() = submitted_by and not approved);

drop policy if exists equipment_models_delete_own_pending on public.equipment_models;
create policy equipment_models_delete_own_pending on public.equipment_models
  for delete to authenticated
  using (auth.uid() = submitted_by and not approved);

-- ── Editör her şeyi yapabilir (0008'deki politika korunuyor) ──
drop policy if exists equipment_models_editor_write on public.equipment_models;
create policy equipment_models_editor_write on public.equipment_models
  for all to authenticated
  using (app.is_admin() or app.has_role('content_editor'))
  with check (app.is_admin() or app.has_role('content_editor'));

drop policy if exists equipment_brands_editor_write on public.equipment_brands;
create policy equipment_brands_editor_write on public.equipment_brands
  for all to authenticated
  using (app.is_admin() or app.has_role('content_editor'))
  with check (app.is_admin() or app.has_role('content_editor'));

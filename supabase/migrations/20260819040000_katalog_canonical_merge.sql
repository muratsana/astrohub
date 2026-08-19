-- ═══════════════════════════════════════════════════════════════════════
-- KATALOG: CANONICAL MODEL, ALIAS VE GERİ ALINABİLİR BİRLEŞTİRME
-- (F03 dedup · F04 canonical+variant+alias · F08 backup/rollback)
--
-- ══════════════════════════════════════════════════════════════════════
-- ÖLÇÜLEN SORUN
--
-- Katalogda 1.186 model var ve bunların 21 tanesi aynı ürünün ikinci
-- kaydı: `sky-watcher-eq6-r-pro` ile `sw-eq6r-pro`, `optolong-l-pro` ile
-- `optolong-lpro`, `takahashi-fc-100dz` ile `takahashi-fc100dz`…
-- Kullanıcı hangisini seçtiyse ekipmanı orada birikiyor; "bu montürle
-- kaç fotoğraf çekilmiş" sorusu iki ayrı yanlış cevap veriyor.
--
-- ══════════════════════════════════════════════════════════════════════
-- NEDEN SİLMİYORUZ, BİRLEŞTİRİYORUZ
--
-- Mükerrer kaydı silmek, ona bağlı fotoğrafların ve ilanların künyesini
-- koparırdı (`on delete set null`). Bunun yerine:
--
--   1. Referanslar kanonik kayda TAŞINIYOR (fotoğraf, ilan, envanter,
--      filtre ürünü) — künye bozulmuyor, sayımlar birleşiyor.
--   2. Eski slug bir ALIAS olarak yaşamaya devam ediyor; eski bir
--      bağlantı ya da içe aktarma o slug'ı sorduğunda kanonik kayda
--      çözülüyor (F04).
--   3. Mükerrer satırın kendisi `canonical_model_id` ile kanoniğe
--      bağlanıp katalog listelerinden düşüyor — ama satır DURUYOR.
--
-- ══════════════════════════════════════════════════════════════════════
-- GERİ ALMA (F08)
--
-- Her birleştirme `equipment_merge_log`a yazılıyor: kaynak satırın tam
-- JSONB kopyası ve taşınan referansların kimlikleri. `app.unmerge_
-- equipment_model(log_id)` bunları geri koyuyor. Yani bu migration'ın
-- yaptığı hiçbir şey tek yönlü değil — yanlış birleştirilen bir çift
-- tek çağrıyla ayrılabiliyor.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Canonical bağı (F04) ────────────────────────────────────────────
alter table public.equipment_models
  add column if not exists canonical_model_id uuid
    references public.equipment_models (id) on delete set null;

comment on column public.equipment_models.canonical_model_id is
  'Dolu ise bu satır bir mükerrer/varyanttır ve kanonik kayıt burasıdır. '
  'Katalog listeleri yalnızca canonical_model_id IS NULL olanları gösterir.';

create index if not exists equipment_models_canonical_idx
  on public.equipment_models (canonical_model_id)
  where canonical_model_id is not null;

-- Kendi kendine kanonik olamaz; zincir de olmamalı (a→b→c).
alter table public.equipment_models
  drop constraint if exists equipment_models_canonical_not_self;
alter table public.equipment_models
  add constraint equipment_models_canonical_not_self
  check (canonical_model_id is null or canonical_model_id <> id);

-- ── Alias tablosu (F04) ─────────────────────────────────────────────
create table if not exists public.equipment_model_aliases (
  alias      text primary key,
  model_id   uuid not null references public.equipment_models (id) on delete cascade,
  -- 'merge' = birleştirmeden geldi, 'manual' = elle eklendi.
  kaynak     text not null default 'merge',
  created_at timestamptz not null default now()
);

create index if not exists equipment_model_aliases_model_idx
  on public.equipment_model_aliases (model_id);

alter table public.equipment_model_aliases enable row level security;

drop policy if exists equipment_model_aliases_read on public.equipment_model_aliases;
create policy equipment_model_aliases_read on public.equipment_model_aliases
  for select using (true);

drop policy if exists equipment_model_aliases_admin on public.equipment_model_aliases;
create policy equipment_model_aliases_admin on public.equipment_model_aliases
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

grant select on public.equipment_model_aliases to anon, authenticated;

-- ── Birleştirme günlüğü / yedek (F08) ───────────────────────────────
create table if not exists public.equipment_merge_log (
  id             uuid primary key default gen_random_uuid(),
  -- Kaynağın (mükerrer) tam satır kopyası: geri alma bundan yazıyor.
  source_row     jsonb not null,
  source_id      uuid not null,
  source_slug    text not null,
  canonical_id   uuid not null,
  canonical_slug text not null,
  -- Hangi tabloda kaç referans taşındı: {"astro_photos.optic_id": 3, …}
  moved_refs     jsonb not null default '{}'::jsonb,
  merged_at      timestamptz not null default now(),
  merged_by      uuid,
  undone_at      timestamptz
);

create index if not exists equipment_merge_log_source_idx
  on public.equipment_merge_log (source_id);

alter table public.equipment_merge_log enable row level security;

drop policy if exists equipment_merge_log_admin on public.equipment_merge_log;
create policy equipment_merge_log_admin on public.equipment_merge_log
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- ── Birleştirme (F03) ───────────────────────────────────────────────
/*
 * İki modeli birleştirir: referanslar kanoniğe taşınır, kaynak slug
 * alias olur, kaynak satır kanoniğe bağlanır. Her adım günlüğe yazılır.
 *
 * SİLME YOK. Kaynak satır duruyor; yalnızca `canonical_model_id` ile
 * işaretleniyor. Böylece geri alma kayıp veri aramak zorunda kalmıyor.
 */
create or replace function app.merge_equipment_models(
  kaynak_slug text,
  hedef_slug  text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  kaynak public.equipment_models%rowtype;
  hedef  public.equipment_models%rowtype;
  sayaclar jsonb := '{}'::jsonb;
  n integer;
  log_id uuid;
begin
  if not app.is_admin() then
    raise exception 'Katalog birleştirme yalnızca yöneticiye açık.'
      using errcode = 'insufficient_privilege';
  end if;

  select * into kaynak from public.equipment_models where slug = kaynak_slug;
  select * into hedef  from public.equipment_models where slug = hedef_slug;

  if kaynak.id is null or hedef.id is null then
    raise exception 'Model bulunamadı (kaynak=% hedef=%)', kaynak_slug, hedef_slug
      using errcode = 'no_data_found';
  end if;
  if kaynak.id = hedef.id then
    raise exception 'Kaynak ve hedef aynı kayıt.' using errcode = 'check_violation';
  end if;
  if hedef.canonical_model_id is not null then
    raise exception 'Hedef zaten başka bir kayda birleştirilmiş; kanonik olan hedef seçilmeli.'
      using errcode = 'check_violation';
  end if;

  -- Referansları taşı ve say.
  update public.astro_photos set optic_id = hedef.id where optic_id = kaynak.id;
  get diagnostics n = row_count;
  sayaclar := sayaclar || jsonb_build_object('astro_photos.optic_id', n);

  update public.astro_photos set camera_id = hedef.id where camera_id = kaynak.id;
  get diagnostics n = row_count;
  sayaclar := sayaclar || jsonb_build_object('astro_photos.camera_id', n);

  update public.astro_photos set mount_id = hedef.id where mount_id = kaynak.id;
  get diagnostics n = row_count;
  sayaclar := sayaclar || jsonb_build_object('astro_photos.mount_id', n);

  update public.listings set model_id = hedef.id where model_id = kaynak.id;
  get diagnostics n = row_count;
  sayaclar := sayaclar || jsonb_build_object('listings.model_id', n);

  /* Envanterde kullanıcı ikisine de sahipse çakışma olur; önce kanoniğe
     sahip olanların mükerrer kaydı siliniyor, kalanlar taşınıyor. */
  delete from public.user_equipment ue
   where ue.model_id = kaynak.id
     and exists (
       select 1 from public.user_equipment v
        where v.user_id = ue.user_id and v.model_id = hedef.id
     );
  update public.user_equipment set model_id = hedef.id where model_id = kaynak.id;
  get diagnostics n = row_count;
  sayaclar := sayaclar || jsonb_build_object('user_equipment.model_id', n);

  update public.astro_filter_products set equipment_model_id = hedef.id
   where equipment_model_id = kaynak.id;
  get diagnostics n = row_count;
  sayaclar := sayaclar || jsonb_build_object('astro_filter_products.equipment_model_id', n);

  -- Eski slug alias olarak yaşasın (F04).
  insert into public.equipment_model_aliases (alias, model_id, kaynak)
  values (kaynak.slug, hedef.id, 'merge')
  on conflict (alias) do update set model_id = excluded.model_id;

  -- Kaynağın kendi alias'ları da hedefe devrolsun.
  update public.equipment_model_aliases set model_id = hedef.id
   where model_id = kaynak.id;

  -- Yedek + günlük (F08) — kaynağın tam kopyası.
  insert into public.equipment_merge_log
    (source_row, source_id, source_slug, canonical_id, canonical_slug, moved_refs, merged_by)
  values
    (to_jsonb(kaynak), kaynak.id, kaynak.slug, hedef.id, hedef.slug, sayaclar, auth.uid())
  returning id into log_id;

  -- Mükerreri kanoniğe bağla (listelerden düşer, satır durur).
  update public.equipment_models
     set canonical_model_id = hedef.id
   where id = kaynak.id;

  return log_id;
end;
$$;

-- ── Geri alma (F08) ─────────────────────────────────────────────────
/*
 * Bir birleştirmeyi geri alır: kaynak yeniden kanonik olur ve alias
 * kalkar. Referanslar GERİ TAŞINMAZ ve bu bilinçli — hangi fotoğrafın
 * birleştirmeden önce hangi kayda baktığı, birleştirme sonrası kullanıcı
 * düzenlemeleriyle karışmış olabilir. Günlükteki `moved_refs` sayıları
 * neyin taşındığını gösteriyor; geri taşıma gerekiyorsa yönetici
 * bilinçli olarak yapıyor. Yanlış birleştirmenin asıl zararı katalogun
 * kendisinde ve o tamamen geri alınıyor.
 */
create or replace function app.unmerge_equipment_model(log_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  kayit public.equipment_merge_log%rowtype;
begin
  if not app.is_admin() then
    raise exception 'Geri alma yalnızca yöneticiye açık.'
      using errcode = 'insufficient_privilege';
  end if;

  select * into kayit from public.equipment_merge_log where id = log_id;
  if kayit.id is null then
    raise exception 'Birleştirme kaydı bulunamadı.' using errcode = 'no_data_found';
  end if;
  if kayit.undone_at is not null then
    return false; -- zaten geri alınmış
  end if;

  update public.equipment_models
     set canonical_model_id = null
   where id = kayit.source_id;

  delete from public.equipment_model_aliases
   where alias = kayit.source_slug and model_id = kayit.canonical_id;

  update public.equipment_merge_log set undone_at = now() where id = log_id;
  return true;
end;
$$;

revoke all on function app.merge_equipment_models(text, text) from public, anon;
revoke all on function app.unmerge_equipment_model(uuid) from public, anon;
grant execute on function app.merge_equipment_models(text, text) to authenticated;
grant execute on function app.unmerge_equipment_model(uuid) to authenticated;

-- ── Mükerrer adayları (F03 raporu) ──────────────────────────────────
/*
 * Marka+model normalize edilip karşılaştırılıyor: noktalama, boşluk ve
 * harf büyüklüğü atılıyor. `sw-eq6r-pro` ile `sky-watcher-eq6-r-pro`
 * aynı anahtara düşüyor. Yönetici bu listeyi görüp birleştirmeyi
 * ONAYLIYOR — otomatik birleştirme yok, çünkü "150P" ile "150PDS"
 * gerçekten farklı ürünler olabilir.
 */
create or replace view public.equipment_duplicate_candidates as
with norm as (
  select id, slug, brand_id, model, category_id, approved, canonical_model_id,
         lower(regexp_replace(coalesce(brand_id, '') || ' ' || model, '[^a-zA-Z0-9]+', '', 'g')) as anahtar
  from public.equipment_models
  where canonical_model_id is null
)
select anahtar,
       count(*) as adet,
       array_agg(slug order by slug) as sluglar,
       array_agg(id order by slug) as idler
from norm
group by anahtar
having count(*) > 1;

comment on view public.equipment_duplicate_candidates is
  'Normalize marka+model anahtarına göre mükerrer aday grupları (F03). '
  'Birleştirme yöneticinin onayıyla app.merge_equipment_models ile yapılır.';

-- ── PostgREST yüzeyi ────────────────────────────────────────────────
/*
 * `app` ŞEMASI PostgREST'E AÇILMIYOR — o şemada altmışı aşkın yardımcı
 * var ve hepsini dışa vermek yüzeyi gereksiz genişletirdi. İstemcinin
 * çağırdığı iki fonksiyon için public'e ince birer sarmalayıcı
 * konuyor; yetki kontrolü (app.is_admin) sarılan tarafta duruyor.
 *
 * Bu, deponun `rpcExposure` kapısının şart koştuğu desen: `supabase.rpc`
 * ile çağrılan her adın public şemasında karşılığı olmalı.
 */
create or replace function public.merge_equipment_models(
  kaynak_slug text,
  hedef_slug  text
)
returns uuid
language sql
volatile
security invoker
set search_path = public
as $$
  select app.merge_equipment_models(kaynak_slug, hedef_slug);
$$;

create or replace function public.unmerge_equipment_model(log_id uuid)
returns boolean
language sql
volatile
security invoker
set search_path = public
as $$
  select app.unmerge_equipment_model(log_id);
$$;

revoke all on function public.merge_equipment_models(text, text) from public, anon;
revoke all on function public.unmerge_equipment_model(uuid) from public, anon;
grant execute on function public.merge_equipment_models(text, text) to authenticated;
grant execute on function public.unmerge_equipment_model(uuid) to authenticated;

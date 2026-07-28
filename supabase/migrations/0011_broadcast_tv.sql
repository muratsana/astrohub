-- 0011_broadcast_tv.sql
-- Astrohub.tv — YouTube üzerinden canlı yayın ve program arşivi.
--
-- NEDEN YOUTUBE, KENDİ AKIŞIMIZ DEĞİL
-- Canlı video dağıtmak transcoding, CDN ve bant genişliği demek; bir gözlem
-- yayınının izleyici sayısı öngörülemez ve tek bir tutulma gecesi aylık
-- bütçeyi yakabilir. YouTube bunu üstlenir. Karşılığında oynatıcı bizim
-- değildir ve izleyici verisi bize gelmez — kabul edilen takas budur.
--
-- SAKLANAN ŞEY BİR KİMLİK, TAM URL DEĞİL
-- `youtube_id` alanı 11 karakterlik video ya da `UC…` kanal kimliğini tutar.
-- Tam URL saklamak, istemcide `<iframe src>` içine doğrudan yazılabilen bir
-- alan üretirdi; kimlik saklayıp gömme adresini kodda kurmak, veritabanına
-- yazma yetkisi olan birinin oynatıcıyı başka bir siteye çevirmesini
-- engeller (§15.4).

do $mig$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'broadcast_kind' and n.nspname = 'app') then
    create type app.broadcast_kind as enum ('live', 'scheduled', 'archive');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'youtube_ref' and n.nspname = 'app') then
    -- Kanal kimliği "o an ne yayındaysa onu göster" demek; video kimliği
    -- belirli bir yayını. İkisi farklı gömme adresi ister.
    create type app.youtube_ref as enum ('video', 'channel');
  end if;
end;
$mig$;

create table if not exists public.tv_broadcasts (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  description text not null default '',

  kind        app.broadcast_kind not null default 'scheduled',
  ref_kind    app.youtube_ref not null default 'video',
  /** 11 karakterlik video kimliği ya da UC ile başlayan kanal kimliği. */
  youtube_id  text not null,

  starts_at   timestamptz,
  ends_at     timestamptz,
  /** Program sırası; canlı yayın her zaman en üstte gösterilir. */
  position    integer not null default 0,
  published   boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint tv_slug_format check (slug ~ '^[a-z0-9-]{3,120}$'),
  constraint tv_title_length check (char_length(title) between 3 and 200),
  /*
   * Kimlik biçimi kısıtı, gömme adresinin güvenliğinin ikinci yarısı.
   * Birincisi kodda adresin sabit olması; bu kısıt da alana `"><script`
   * gibi bir şey yazılamamasını garanti ediyor.
   */
  constraint tv_youtube_id_format check (
    (ref_kind = 'video'   and youtube_id ~ '^[A-Za-z0-9_-]{11}$') or
    (ref_kind = 'channel' and youtube_id ~ '^UC[A-Za-z0-9_-]{22}$')
  ),
  constraint tv_end_after_start check (ends_at is null or starts_at is null or ends_at > starts_at)
);

comment on table public.tv_broadcasts is
  'Astrohub.tv program listesi. Yayın YouTube üzerinden dağıtılır; burada yalnızca kimlik ve program bilgisi durur.';

create index if not exists tv_broadcasts_program_idx
  on public.tv_broadcasts (published, kind, position);
create index if not exists tv_broadcasts_schedule_idx
  on public.tv_broadcasts (starts_at desc) where published;

/*
 * AYNI ANDA EN FAZLA BİR CANLI YAYIN.
 *
 * "Şu an yayında" iki satır döndürürse arayüz hangisini oynatacağını
 * bilemez ve seçim sıralamaya kalır — yani sessizce yanlış yayın açılır.
 * Kısıtı kısmi tekil indeksle kuruyoruz; tetikleyiciyle kontrol etmek
 * eşzamanlı iki yazmada yarış koşuluna açık olurdu.
 */
create unique index if not exists tv_broadcasts_single_live_idx
  on public.tv_broadcasts ((kind))
  where kind = 'live' and published;

drop trigger if exists tv_broadcasts_set_updated_at on public.tv_broadcasts;
create trigger tv_broadcasts_set_updated_at
  before update on public.tv_broadcasts
  for each row execute function app.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════
-- RLS — yayın herkese açık, program yönetimi editörde
-- ══════════════════════════════════════════════════════════════════════════
alter table public.tv_broadcasts enable row level security;

drop policy if exists tv_broadcasts_read on public.tv_broadcasts;
create policy tv_broadcasts_read on public.tv_broadcasts
  for select using (
    published or app.is_admin() or app.has_role('content_editor')
  );

drop policy if exists tv_broadcasts_editor_write on public.tv_broadcasts;
create policy tv_broadcasts_editor_write on public.tv_broadcasts
  for all to authenticated
  using (app.is_admin() or app.has_role('content_editor'))
  with check (app.is_admin() or app.has_role('content_editor'));

revoke all on public.tv_broadcasts from anon, authenticated;
grant select on public.tv_broadcasts to anon;
grant select, insert, update, delete on public.tv_broadcasts to authenticated;

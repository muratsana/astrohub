-- 0007_moderation_and_audit.sql
-- Moderasyon kuyruğu, kullanıcı raporları ve yönetim işlem günlüğü (§13).
--
-- İLKE: her tablo RLS ve politikalarıyla birlikte gelir.
--
-- TASARIM KARARI — TEK KUYRUK, POLİMORFİK HEDEF
-- Fotoğraf, yorum, ilan ve forum mesajı için ayrı kuyruk tabloları yerine tek
-- kuyruk kullanılıyor. Sebep pratik: moderatör "sırada ne var" diye bakar,
-- "sırada hangi fotoğraf var" diye değil. Dört ayrı tablo, dört ayrı sorgu ve
-- dört ayrı ekran demek olurdu; birleştirilmiş görünüm zaten yeniden tek
-- kuyruk üretecekti.
--
-- Bedeli: hedefe foreign key konulamıyor (`target_type` + `target_id`).
-- Bu yüzden hedefin var olduğu uygulama katmanında doğrulanır ve silinen
-- içeriğin kaydı kuyrukta `orphaned` olarak kalır — silinen bir içeriğin
-- moderasyon geçmişini kaybetmemek bilinçli bir tercih (§13.4 denetim izi).

-- ══════════════════════════════════════════════════════════════════════════
-- ENUM'LAR
-- ══════════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'moderation_target' and n.nspname = 'app') then
    create type app.moderation_target as enum (
      'photo', 'comment', 'listing', 'forum_thread', 'forum_post', 'event', 'site', 'profile'
    );
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'moderation_status' and n.nspname = 'app') then
    create type app.moderation_status as enum (
      'pending',    -- sırada
      'in_review',  -- bir moderatör üzerine aldı
      'approved',   -- içerik kalıyor
      'rejected',   -- içerik kaldırıldı
      'escalated'   -- admin kararı bekliyor
    );
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'moderation_reason' and n.nspname = 'app') then
    create type app.moderation_reason as enum (
      'spam',
      'telif',           -- telif ihlali iddiası (§15.5)
      'yanlis-kunye',    -- teknik künye gerçeğe aykırı
      'uygunsuz-icerik',
      'yanlis-konum',    -- hassas nokta ifşası (§15.3)
      'dolandiricilik',  -- ilanlarda
      'diger'
    );
  end if;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- MODERASYON KUYRUĞU
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.moderation_queue (
  id           uuid primary key default gen_random_uuid(),
  target_type  app.moderation_target not null,
  /* FK yok — bkz. dosya başındaki tasarım kararı. */
  target_id    text not null,
  /** Moderatörün içeriğe gitmesi için hazır yol: "/fotograf/m31-lrgb". */
  target_path  text,
  status       app.moderation_status not null default 'pending',
  reason       app.moderation_reason not null,
  /** Raporu açan kullanıcı; sistem tarafından açıldıysa null. */
  reported_by  uuid references auth.users (id) on delete set null,
  note         text not null default '',
  /** Kuyruğu üzerine alan moderatör. */
  assigned_to  uuid references auth.users (id) on delete set null,
  resolved_by  uuid references auth.users (id) on delete set null,
  resolved_at  timestamptz,
  resolution_note text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint moderation_note_length check (char_length(note) <= 2000),
  /* Çözülen kayıt kimin çözdüğünü taşımak zorunda: "kim karar verdi"
     sorusunun cevapsız kaldığı bir moderasyon günlüğü işe yaramaz. */
  constraint moderation_resolution_complete check (
    (status in ('approved', 'rejected') and resolved_by is not null and resolved_at is not null)
    or status not in ('approved', 'rejected')
  )
);

comment on table public.moderation_queue is
  'Moderasyon kuyruğu (§13). Tek kuyruk, polimorfik hedef; hedefe FK yoktur.';

create index if not exists moderation_queue_status_idx
  on public.moderation_queue (status, created_at desc);
create index if not exists moderation_queue_target_idx
  on public.moderation_queue (target_type, target_id);

drop trigger if exists moderation_queue_set_updated_at on public.moderation_queue;
create trigger moderation_queue_set_updated_at
  before update on public.moderation_queue
  for each row execute function app.set_updated_at();

alter table public.moderation_queue enable row level security;

/*
 * OKUMA: yalnızca moderatör ve admin.
 *
 * Raporu açan kullanıcı KENDİ raporunu göremiyor — bilinçli. Rapor edenin
 * kuyruğu izleyebilmesi, hedef kullanıcının kim tarafından rapor edildiğini
 * çıkarmasına ve misilleme zincirine kapı açıyor. Sonuç bildirimi ayrı bir
 * kanaldan (bildirimler) verilecek.
 */
drop policy if exists moderation_queue_read on public.moderation_queue;
create policy moderation_queue_read on public.moderation_queue
  for select to authenticated
  using (app.is_admin() or app.has_role('moderator'));

-- Rapor açmak: her oturumlu kullanıcı, yalnızca kendi adına.
drop policy if exists moderation_queue_report on public.moderation_queue;
create policy moderation_queue_report on public.moderation_queue
  for insert to authenticated
  with check (
    auth.uid() = reported_by
    and status = 'pending'
    and assigned_to is null
    and resolved_by is null
  );

drop policy if exists moderation_queue_moderate on public.moderation_queue;
create policy moderation_queue_moderate on public.moderation_queue
  for update to authenticated
  using (app.is_admin() or app.has_role('moderator'))
  with check (app.is_admin() or app.has_role('moderator'));

drop policy if exists moderation_queue_admin_delete on public.moderation_queue;
create policy moderation_queue_admin_delete on public.moderation_queue
  for delete to authenticated
  using (app.is_admin());

-- ══════════════════════════════════════════════════════════════════════════
-- DENETİM GÜNLÜĞÜ (§13.4)
--
-- Yönetimsel her işlem buraya yazılır. Kayıt SİLİNEMEZ ve GÜNCELLENEMEZ:
-- denetim izinin değiştirilebildiği bir sistemde denetim izi yoktur.
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.audit_logs (
  id          bigserial primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  /** İşlemin ayrıntısı; şema serbest bırakıldı çünkü her işlem farklı alan taşır. */
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint audit_action_length check (char_length(action) between 2 and 100)
);

comment on table public.audit_logs is
  'Yönetim işlem günlüğü (§13.4). Yalnızca eklenir; güncelleme ve silme yoktur.';

create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_read on public.audit_logs;
create policy audit_logs_read on public.audit_logs
  for select to authenticated
  using (app.is_admin());

/*
 * Yazma politikası bilinçli olarak YOK.
 *
 * Günlüğe yazmak istemcinin işi değil: istemci yazabiliyorsa kendi izini
 * uydurabilir. Kayıtlar sunucu tarafındaki SECURITY DEFINER fonksiyonlar
 * ve tetikleyiciler tarafından atılacak. RLS varsayılan olarak reddettiği
 * için ek bir kural gerekmiyor.
 */

-- ══════════════════════════════════════════════════════════════════════════
-- YETKİLER (bkz. 0003 — TRUNCATE RLS'e tabi değildir)
-- ══════════════════════════════════════════════════════════════════════════
revoke all on public.moderation_queue from anon, authenticated;
revoke all on public.audit_logs       from anon, authenticated;

-- anon hiçbir şey göremez: moderasyon içeriği kamuya açık değildir.
grant select, insert, update on public.moderation_queue to authenticated;
grant delete on public.moderation_queue to authenticated; -- politikada yalnızca admin
grant select on public.audit_logs to authenticated;       -- politikada yalnızca admin

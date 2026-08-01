-- ════════════════════════════════════════════════════════════════════════════
-- 0043 — MESAJLAŞMA
--
-- Pazaryerinde ilan var, ilanda satıcı var, satıcıya ulaşmanın yolu yoktu:
-- alıcı ya yorum alanından açık açık telefon istiyordu ya da hiç
-- yazamıyordu. Bu göç o boşluğu kapatıyor.
--
-- ÜÇ TASARIM KARARI:
--
-- 1. BİREBİR SOHBET TEKİL. `direct_key` kanonik bir çift anahtarı
--    (küçük-uuid:büyük-uuid) ve tekil indeksli. Olmasaydı aynı iki kişi
--    arasında, kimin önce yazdığına göre iki ayrı sohbet açılırdı ve
--    mesajların yarısı diğerinde kalırdı.
--
-- 2. RLS ÖZYİNELEMESİZ. "Katılımcı olduğum sohbetin katılımcılarını
--    görebilirim" kuralı doğrudan yazıldığında politika kendi tablosunu
--    sorgular ve Postgres sonsuz özyinelemeyle patlar. Kontrol
--    `app.in_conversation()` içinde, `security definer` olarak duruyor.
--
-- 3. SİLME YUMUŞAK. Mesaj silindiğinde satır kalıyor, gövdesi
--    boşalıyor. Sert silme, karşı taraftaki konuşmayı anlamsız hâle
--    getirirdi: cevabın durup sorunun kaybolduğu bir kayıt.
-- ════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'app' and t.typname = 'conversation_kind') then
    create type app.conversation_kind as enum ('direct', 'group');
  end if;
end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- SOHBET
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  kind       app.conversation_kind not null default 'direct',
  /* Yalnızca grup sohbetinde anlamlı; birebir sohbetin başlığı karşı
     tarafın adıdır ve o profilden okunur. */
  title      text,
  created_by uuid references auth.users(id) on delete set null,
  /*
   * KANONİK ÇİFT ANAHTARI. `least(a,b) || ':' || greatest(a,b)`.
   * Grup sohbetinde null — tekillik kuralı yalnızca birebir için.
   */
  direct_key text,
  created_at       timestamptz not null default now(),
  /* Sohbet listesini sıralamak için. Her mesajda tetikleyici günceller;
     istemciden yazılmıyor ki "listemde üste çıksın" diye kurcalanamasın. */
  last_message_at  timestamptz not null default now(),

  constraint conversations_title_len check (title is null or char_length(title) <= 120),
  constraint conversations_direct_key check (
    (kind = 'direct' and direct_key is not null)
    or (kind <> 'direct' and direct_key is null)
  )
);

create unique index if not exists conversations_direct_key_uniq
  on public.conversations (direct_key)
  where direct_key is not null;

create index if not exists conversations_recent_idx
  on public.conversations (last_message_at desc);

-- ══════════════════════════════════════════════════════════════════════════
-- KATILIMCI
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  /*
   * OKUNMAMIŞ SAYACI BURADAN ÇIKIYOR. Mesaj başına "okundu" satırı
   * tutmak, her mesaj için katılımcı sayısı kadar satır demekti; sohbet
   * başına tek imleç aynı bilgiyi veriyor.
   *
   * Başlangıç `-infinity`: yeni katılımcı için sohbetteki her mesaj
   * okunmamış sayılır. `now()` olsaydı, sohbete eklenen kişi kendisinden
   * önceki mesajları hiç okunmamış görmeden geçerdi.
   */
  last_read_at    timestamptz not null default '-infinity',
  muted           boolean not null default false,
  /* Sohbetten ayrılma: satır silinmiyor ki eski mesajların "kime
     gitti" bilgisi kaybolmasın. */
  left_at         timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists conversation_participants_user_idx
  on public.conversation_participants (user_id, conversation_id);

-- ══════════════════════════════════════════════════════════════════════════
-- MESAJ
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz,

  constraint messages_body_len check (char_length(body) <= 4000)
);

/* Konuşma görünümü: tek sohbet, eskiden yeniye sayfalama. */
create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at desc);

/* Oran sınırı tetikleyicisi "son dakikada bu kullanıcı kaç mesaj yazdı"
   diye soruyor; gönderene göre indeks olmadan bu tablo taraması olurdu. */
create index if not exists messages_sender_recent_idx
  on public.messages (sender_id, created_at desc);

-- ══════════════════════════════════════════════════════════════════════════
-- KATILIMCI KONTROLÜ
--
-- RLS'in temel taşı. `security definer` olması ŞART: politika içinden
-- çağrılıp yine RLS'e tabi olsaydı, kontrol kendi kendini sorgulayıp
-- özyinelemeye girerdi.
--
-- `left_at` kontrolü var: sohbetten ayrılan kişi yeni mesajları görmüyor.
-- Ayrılmadan önceki mesajlar da görünmüyor — yarım bir geçmiş göstermek
-- yerine sohbeti tümüyle kapatmak daha anlaşılır bir sözleşme.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.in_conversation(conv uuid, who uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.conversation_participants cp
     where cp.conversation_id = conv
       and cp.user_id = who
       and cp.left_at is null
  );
$$;

/*
 * SOHBETTE ENGEL VAR MI.
 *
 * Birebir sohbette taraflardan biri diğerini engellediyse mesaj
 * yazılamıyor. Sohbet SİLİNMİYOR: engel kalkarsa geçmiş yerinde duruyor.
 */
create or replace function app.conversation_blocked(conv uuid, who uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.conversation_participants cp
     where cp.conversation_id = conv
       and cp.user_id <> who
       and app.is_blocked(cp.user_id, who)
  );
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- SOHBET AÇMA
--
-- İstemci `conversations`a doğrudan yazamıyor. Sebep: sohbet açmak tek
-- bir satır değil, ÜÇ satırlık bir bütün (sohbet + iki katılımcı) ve
-- arada engel kontrolü var. İstemciye bıraksaydık, ikinci insert
-- başarısız olduğunda katılımcısız bir sohbet kalırdı.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.start_direct_conversation(other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me      uuid := auth.uid();
  pair    text;
  conv    uuid;
begin
  if me is null then
    raise exception 'Mesaj göndermek için giriş yapmalısınız.'
      using errcode = 'insufficient_privilege';
  end if;

  if other_user is null or other_user = me then
    raise exception 'Kendinize mesaj gönderemezsiniz.'
      using errcode = 'check_violation';
  end if;

  if not exists (select 1 from auth.users u where u.id = other_user) then
    raise exception 'Kullanıcı bulunamadı.' using errcode = 'no_data_found';
  end if;

  if app.is_blocked(me, other_user) then
    /* Hangi tarafın engellediğini SÖYLEMİYORUZ. "Seni engelledi" demek,
       engellemenin sessizliğini bozardı. */
    raise exception 'Bu kullanıcıyla mesajlaşamazsınız.'
      using errcode = 'insufficient_privilege';
  end if;

  pair := least(me::text, other_user::text) || ':' || greatest(me::text, other_user::text);

  select id into conv from public.conversations where direct_key = pair;
  if conv is not null then
    /* Daha önce ayrılmış olabilir; yeniden yazınca sohbete geri dönüyor. */
    update public.conversation_participants
       set left_at = null
     where conversation_id = conv and user_id = me and left_at is not null;
    return conv;
  end if;

  insert into public.conversations (kind, created_by, direct_key)
  values ('direct', me, pair)
  returning id into conv;

  insert into public.conversation_participants (conversation_id, user_id)
  values (conv, me), (conv, other_user);

  return conv;
end $$;

grant execute on function public.start_direct_conversation(uuid) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- MESAJ YAZMA KURALLARI
--
-- Üçü de RLS'in ifade edemeyeceği kurallar:
--   · engelli ikili arasında yazım yok
--   · dakikada 20 mesaj üst sınırı
--   · sohbetin `last_message_at` damgası
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  son_dakika integer;
begin
  if btrim(new.body) = '' then
    raise exception 'Boş mesaj gönderilemez.' using errcode = 'check_violation';
  end if;

  if app.conversation_blocked(new.conversation_id, new.sender_id) then
    raise exception 'Bu sohbete mesaj gönderemezsiniz.'
      using errcode = 'insufficient_privilege';
  end if;

  /*
   * ORAN SINIRI VERİTABANINDA, İSTEMCİDE DEĞİL.
   * İstemci tarafı bir sınır, tarayıcı konsolundan atlanabilir bir
   * öneriden ibaret. 20/dakika normal bir sohbetin çok üstünde, bir
   * betiğin çok altında.
   */
  select count(*) into son_dakika
    from public.messages m
   where m.sender_id = new.sender_id
     and m.created_at > now() - interval '1 minute';

  if son_dakika >= 20 then
    raise exception 'Çok hızlı mesaj gönderiyorsunuz, biraz bekleyin.'
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists messages_before_insert on public.messages;
create trigger messages_before_insert
  before insert on public.messages
  for each row execute function app.messages_before_insert();

/*
 * MESAJ SONRASI: sohbeti üste taşı ve alıcılara bildirim üret.
 *
 * Bildirimin hedefi SOHBET (mesaj değil): art arda on mesaj on bildirim
 * değil, tek okunmamış bildirim üretiyor. Sayıyı sohbet listesi zaten
 * gösteriyor.
 */
create or replace function app.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  who     text;
  alici   record;
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;

  select coalesce(pr.display_name, pr.username::text, 'Bir üye') into who
    from public.profiles pr where pr.id = new.sender_id;

  for alici in
    select cp.user_id
      from public.conversation_participants cp
     where cp.conversation_id = new.conversation_id
       and cp.user_id <> new.sender_id
       and cp.left_at is null
       and cp.muted = false
  loop
    perform app.notify(
      alici.user_id,
      new.sender_id,
      'message',
      coalesce(who, 'Bir üye') || ' sana mesaj gönderdi',
      left(new.body, 120),
      '/mesajlar/' || new.conversation_id::text,
      'conversation',
      new.conversation_id
    );
  end loop;

  return new;
end $$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert
  after insert on public.messages
  for each row execute function app.messages_after_insert();

/*
 * DÜZENLEME VE SİLME.
 *
 * Düzenleme penceresi 15 dakika: yazım hatası düzeltmek için yeterli,
 * "dün söylediğimi bugün değiştirdim" için değil. Karşı tarafın okuduğu
 * cümlenin sonsuza dek değiştirilebilir olması, konuşmanın kaydını
 * güvenilmez kılardı.
 *
 * Silme gövdeyi boşaltıyor, satırı bırakıyor — istemci "bu mesaj silindi"
 * yazıyor.
 */
create or replace function app.messages_guard_update()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.id              := old.id;
  new.conversation_id := old.conversation_id;
  new.sender_id       := old.sender_id;
  new.created_at      := old.created_at;

  /* Silme: geri alınamaz ve gövdeyi götürür. */
  if new.deleted_at is not null and old.deleted_at is null then
    new.deleted_at := now();
    new.body       := '';
    return new;
  end if;

  if old.deleted_at is not null then
    raise exception 'Silinmiş mesaj düzenlenemez.' using errcode = 'check_violation';
  end if;

  if new.body is distinct from old.body then
    if old.created_at < now() - interval '15 minutes' then
      raise exception 'Mesaj yalnızca gönderildikten sonraki 15 dakika içinde düzenlenebilir.'
        using errcode = 'check_violation';
    end if;
    if btrim(new.body) = '' then
      raise exception 'Boş mesaj kaydedilemez.' using errcode = 'check_violation';
    end if;
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;

  return new;
end $$;

drop trigger if exists messages_guard on public.messages;
create trigger messages_guard
  before update on public.messages
  for each row execute function app.messages_guard_update();

/*
 * KATILIMCI SATIRI: yalnızca okuma imleci, sessize alma ve ayrılma
 * değiştirilebilir. Kullanıcının kendi `joined_at`ını geri alması ya da
 * satırı başkasına devretmesi anlamsız.
 */
create or replace function app.participants_guard_update()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.conversation_id := old.conversation_id;
  new.user_id         := old.user_id;
  new.joined_at       := old.joined_at;
  return new;
end $$;

drop trigger if exists conversation_participants_guard on public.conversation_participants;
create trigger conversation_participants_guard
  before update on public.conversation_participants
  for each row execute function app.participants_guard_update();

-- ══════════════════════════════════════════════════════════════════════════
-- SATIR GÜVENLİĞİ
-- ══════════════════════════════════════════════════════════════════════════
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;

drop policy if exists conversations_read on public.conversations;
create policy conversations_read on public.conversations
  for select to authenticated
  using (app.in_conversation(id, (select auth.uid())));

/* INSERT/UPDATE yetkisi yok: sohbet yalnızca RPC ile açılıyor,
   `last_message_at` yalnızca tetikleyiciyle güncelleniyor. */
grant select on public.conversations to authenticated;

drop policy if exists conversation_participants_read on public.conversation_participants;
create policy conversation_participants_read on public.conversation_participants
  for select to authenticated
  using (app.in_conversation(conversation_id, (select auth.uid())));

drop policy if exists conversation_participants_update_own on public.conversation_participants;
create policy conversation_participants_update_own on public.conversation_participants
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, update on public.conversation_participants to authenticated;

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages
  for select to authenticated
  using (app.in_conversation(conversation_id, (select auth.uid())));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and app.in_conversation(conversation_id, (select auth.uid()))
  );

drop policy if exists messages_update_own on public.messages;
create policy messages_update_own on public.messages
  for update to authenticated
  using (sender_id = (select auth.uid()))
  with check (sender_id = (select auth.uid()));

/* DELETE YOK. Silme `deleted_at` ile; sert silme karşı taraftaki
   konuşmayı delik deşik ederdi. */
grant select, insert, update on public.messages to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- SOHBET LİSTESİ
--
-- Tek çağrıda: sohbet, karşı taraf, son mesaj, okunmamış sayısı.
-- İstemcide dört ayrı sorguyla kurulsaydı sohbet başına bir istek daha
-- eklenirdi (N+1) ve liste her açılışta gecikmeli dolardı.
--
-- `security definer` ama `auth.uid()` ile kendi kendini sınırlıyor:
-- fonksiyon yalnızca çağıranın katıldığı sohbetleri döndürüyor.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.my_conversations()
returns table (
  id             uuid,
  kind           app.conversation_kind,
  title          text,
  last_message_at timestamptz,
  last_message   text,
  last_sender_id uuid,
  unread         integer,
  muted          boolean,
  other_id       uuid,
  other_username text,
  other_name     text,
  other_avatar   text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with mine as (
    select cp.conversation_id, cp.last_read_at, cp.muted
      from public.conversation_participants cp
     where cp.user_id = auth.uid() and cp.left_at is null
  )
  select
    c.id,
    c.kind,
    c.title,
    c.last_message_at,
    son.body,
    son.sender_id,
    (select count(*)::integer
       from public.messages m
      where m.conversation_id = c.id
        and m.created_at > mine.last_read_at
        and m.sender_id <> auth.uid()),
    mine.muted,
    karsi.user_id,
    karsi_p.username::text,
    karsi_p.display_name,
    karsi_p.avatar_path
  from mine
  join public.conversations c on c.id = mine.conversation_id
  left join lateral (
    select m.body, m.sender_id
      from public.messages m
     where m.conversation_id = c.id
     order by m.created_at desc
     limit 1
  ) son on true
  /* Birebir sohbette tek karşı taraf var; grup sohbetinde bu alan boş
     kalıyor ve başlık kullanılıyor. */
  left join lateral (
    select cp.user_id
      from public.conversation_participants cp
     where cp.conversation_id = c.id and cp.user_id <> auth.uid()
     limit 1
  ) karsi on c.kind = 'direct'
  left join public.profiles karsi_p on karsi_p.id = karsi.user_id
  order by c.last_message_at desc;
$$;

grant execute on function public.my_conversations() to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- CANLI YAYIN
-- ══════════════════════════════════════════════════════════════════════════
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
  end if;
end $$;

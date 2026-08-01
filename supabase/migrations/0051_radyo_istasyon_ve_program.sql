-- 0051_radyo_istasyon_ve_program.sql
--
-- FAZ 7 — ÇALIŞAN ASTROHUB RADYO, birinci parça: istasyon, yayıncı,
-- program ve yayın sağlığı. Podcast altyapısı `0052`de.
--
-- ══════════════════════════════════════════════════════════════════════════
-- BU MIGRATION NEYİ SAKLAMIYOR: SIRLARI
--
-- §10.1 radyoyu ayrı bir sunucuda (AzuraCast + Liquidsoap + Icecast)
-- çalıştırmayı ve "secret'ların yalnızca server-side saklanmasını"
-- istiyor. Bu tabloların hiçbirinde API anahtarı, yayıncı şifresi ya da
-- mount point parolası YOK.
--
-- Sebebi tek cümle: bir tablo satırı, yanlış yazılmış bir politikayla
-- okunabilir hâle gelir; ortam değişkeni veritabanında hiç değildir.
-- AzuraCast API anahtarı `AZURACAST_API_KEY` olarak Vercel'de duruyor ve
-- yalnızca sunucu tarafı fonksiyon okuyor. Burada duran şey zaten
-- HERKESE AÇIK olan bilgi: yayın adresi, mount, bitrate, program
-- takvimi.
--
-- Yayıncı bağlantı bilgisi (§10.3 "bağlantı bilgilerini yalnızca yetkili
-- yayıncıya gösterme") de burada değil: AzuraCast'in kendi kullanıcı
-- kaydında duruyor, AstroHub yalnızca "bu kişi yayıncıdır" bilgisini
-- tutuyor ve bağlantı bilgisini sunucu tarafı bir çağrıyla, o kişiye,
-- o an gösteriyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- "CANLI" BİR KOLON DEĞİL, BİR ÖLÇÜM
--
-- §10.2'nin son maddesi: **sahte "canlı" ibaresi göstermeme**.
-- `radio_stations.is_live boolean` koymak tam olarak o yalanı üretirdi:
-- yayın düşer, kolon `true` kalır, site "canlı yayındayız" yazar.
--
-- Canlılık `radio_stream_health` tablosunda ÖLÇÜM olarak duruyor — ne
-- zaman bakıldığı, ne bulunduğu. Arayüz bayat ölçümü canlı saymıyor
-- (`app.station_is_live`, aşağıda). Ölçüm yoksa cevap "bilmiyoruz",
-- "canlı" değil.
-- ══════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- İSTASYON
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.radio_stations (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text not null default '',

  /* AzuraCast'teki istasyon kimliği. Adapter bunu kullanıyor; kendisi
     bir sır değil (API anahtarı olmadan işe yaramaz). */
  azuracast_station_id integer,

  /* Dinleyiciye verilen yayın adresi. `https` zorunlu: sayfa https ise
     tarayıcı karışık içeriği zaten engelliyor ve hata "ses gelmiyor"
     olarak görünüyor — sebebi bulunması zor bir hata. */
  stream_url    text
    constraint radio_stations_stream_https
    check (stream_url is null or stream_url ~ '^https://'),

  /* Kalite seçenekleri (§10.2 "yayın kalitesi seçimi varsa uygun
     stream"). Biçim: [{"ad":"Yüksek","url":"https://…","bitrate":128}]
     Boş dizi = tek akış var, seçim gösterilmiyor. */
  stream_variants jsonb not null default '[]'::jsonb
    constraint radio_stations_variants_array
    check (jsonb_typeof(stream_variants) = 'array'),

  /* Yayın düştüğünde çalınacak yedek (§10.3 "failover playlist/stream").
     Boşsa yedek yok ve arayüz bunu "çevrimdışı" olarak gösteriyor. */
  fallback_url  text
    constraint radio_stations_fallback_https
    check (fallback_url is null or fallback_url ~ '^https://'),

  /* İstasyonu aç/kapat (§10.5). Kapalıyken arayüz oynatıcıyı
     GÖSTERMİYOR — basılınca hata veren bir düğme bırakmıyor. */
  enabled       boolean not null default false,

  /* Bakım metni: kapalıyken kullanıcıya ne yazılacağı. Boşsa genel
     "yayın şu an kapalı" cümlesi kullanılıyor. */
  offline_note  text,

  /* Ana sayfanın ve mini oynatıcının çalacağı istasyon. Birden fazla
     istasyon (ana kanal, sohbet kanalı) ileride mümkün; bugün birinin
     "varsayılan" olması gerekiyor ki oynatıcı hangisini açacağını
     bilsin. */
  is_default    boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.radio_stations is
  'Radyo istasyonu yapılandırması. Sır YOK: API anahtarı ve yayıncı '
  'şifresi ortam değişkeninde, yalnızca sunucu tarafında.';

/* VARSAYILAN TEK OLMALI. İki varsayılan istasyon, oynatıcının hangisini
   açacağını satır sırasına bırakırdı — sonuç "bazen bu kanal çalıyor"
   gibi tekrarlanamayan bir hata olurdu. */
create unique index if not exists radio_stations_default_uniq
  on public.radio_stations ((true)) where is_default;

-- ══════════════════════════════════════════════════════════════════════════
-- YAYINCI
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.radio_hosts (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  bio         text not null default '',
  avatar_url  text,

  /* SİTE HESABINA BAĞLANMASI ZORUNLU DEĞİL. Konuk bir yayıncının
     AstroHub hesabı olmayabilir; profili yine yayımlanabilmeli.
     Hesap silinirse profil ayakta kalıyor (`set null`) — yayınladığı
     programların künyesi boşalmamalı. */
  user_id     uuid references auth.users(id) on delete set null,

  /* Yayın yapabilir mi (§10.3 "DJ/yayıncı hesabı", "askıya alma").
     Askıya alınan yayıncının PROFİLİ duruyor, yayın yetkisi gidiyor:
     geçmiş programların künyesi silinmemeli. */
  can_broadcast boolean not null default false,
  suspended_at  timestamptz,

  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists radio_hosts_user_idx
  on public.radio_hosts (user_id) where user_id is not null;

-- ══════════════════════════════════════════════════════════════════════════
-- PROGRAM
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.radio_programs (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  summary      text not null default '',
  description  text not null default '',
  artwork_url  text,

  /* Arama ve filtre (§10.2). Kategori tek, etiket çok. */
  category     text,
  tags         text[] not null default '{}',

  /* Öne çıkarılan program (§10.5) — ana sayfa radyo kartı bunu
     gösteriyor. */
  featured     boolean not null default false,

  /* Taslak → yayın. Yayımlanmamış program herkese açık listede yok. */
  published    boolean not null default false,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists radio_programs_published_idx
  on public.radio_programs (published, featured desc, title);

/* Program ↔ yayıncı: bir programın birden fazla sunucusu olabilir ve
   bir yayıncı birden fazla program yapabilir. */
create table if not exists public.program_hosts (
  program_id uuid not null references public.radio_programs(id) on delete cascade,
  host_id    uuid not null references public.radio_hosts(id) on delete cascade,
  /* Künyede sıralama — "sunan" önce, "konuk" sonra. */
  position   integer not null default 0,
  primary key (program_id, host_id)
);

-- ══════════════════════════════════════════════════════════════════════════
-- YAYIN SAATİ
--
-- ANLARI DEĞİL, KURALI SAKLIYORUZ — `reminders` ile aynı gerekçe (0049).
-- "Her salı 21:00" bir kural; bunu önümüzdeki iki yılın satırlarına
-- açsaydık program saati değiştiğinde yüzlerce satır güncellenecekti ve
-- biri kaçtığında takvim yalan söyleyecekti.
--
-- SAAT YEREL, `timestamptz` DEĞİL. Radyo takvimi yerel saatte ilan
-- edilir: "Salı 21:00" yaz saatinde de 21:00'dir. `timestamptz` olarak
-- saklasaydık, saat dilimi kayması programı 20:00'a ya da 22:00'a
-- kaydırırdı. Anlar okuma sırasında `Europe/Istanbul` üstünden
-- hesaplanıyor.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.program_slots (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.radio_programs(id) on delete cascade,

  /* Haftalık tekrar: 1 = pazartesi … 7 = pazar (ISO). Tek seferlik
     yayında boş. */
  weekday    smallint
    constraint program_slots_weekday_range
    check (weekday is null or weekday between 1 and 7),

  /* Tek seferlik yayın anı. Haftalık programda boş. */
  airs_at    timestamptz,

  /* Yerel başlangıç saati — haftalık tekrarda zorunlu. */
  local_time time,

  duration_min integer not null default 60
    constraint program_slots_duration_positive check (duration_min > 0),

  /* Sezon aralığı: program yaz arası verdiyse takvim boş görünmeli. */
  starts_on  date,
  ends_on    date,

  /* Tekrar yayını mı (§10.5 "tekrar planı") — arayüz "tekrar" rozeti
     gösteriyor ki dinleyici canlı sanmasın. */
  is_repeat  boolean not null default false,

  created_at timestamptz not null default now(),

  /* İKİ ŞEKİLDEN BİRİ, İKİSİ BİRDEN DEĞİL. Hem haftalık hem tek
     seferlik doldurulmuş bir satır, takvimin hangi kurala uyacağını
     belirsiz bırakırdı. */
  constraint program_slots_shape check (
    (weekday is not null and local_time is not null and airs_at is null)
    or
    (weekday is null and local_time is null and airs_at is not null)
  ),

  constraint program_slots_season check (
    starts_on is null or ends_on is null or ends_on >= starts_on
  )
);

create index if not exists program_slots_program_idx
  on public.program_slots (program_id);
create index if not exists program_slots_weekday_idx
  on public.program_slots (weekday, local_time) where weekday is not null;
create index if not exists program_slots_airs_idx
  on public.program_slots (airs_at) where airs_at is not null;

-- ══════════════════════════════════════════════════════════════════════════
-- PROGRAM TAKİBİ
--
-- §10.2: "programı takip etme", "canlı yayın hatırlatması", "favori
-- programlar". Üçü tek satır: takip eden kişi favorilemiştir ve yayın
-- başlayınca haber alır. Üç ayrı tablo, aynı niyetin üç kopyası olurdu.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.program_follows (
  user_id    uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.radio_programs(id) on delete cascade,
  /* Yayın başlayınca bildirim istiyor mu. Takip edip bildirim
     istememek geçerli bir tercih: "listemde dursun ama beni uyandırma". */
  notify     boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, program_id)
);

create index if not exists program_follows_program_idx
  on public.program_follows (program_id) where notify;

-- ══════════════════════════════════════════════════════════════════════════
-- YAYIN SAĞLIĞI
--
-- §10.2 "canlı durumu", §10.3 "sağlık durumu", §10.5 "yayın sağlık ve
-- hata kayıtları" ve "hata ve kesinti alarmı" — dördü de aynı ölçümden
-- besleniyor.
--
-- DİNLEYİCİ SAYISI TOPLAM OLARAK SAKLANIYOR, KİŞİ BAŞINA DEĞİL.
-- §10.2 "dinleyici sayısı gösterimi, gizlilik ve doğruluk kontrolüyle"
-- diyor. Kim dinliyor sorusunun cevabı bu şemada YOK ve olmamalı:
-- birinin ne dinlediği, kaç kişinin dinlediğinden bambaşka bir bilgi.
-- Icecast IP başına oturum döndürebiliyor; adapter yalnızca SAYIYI
-- alıyor, listeyi hiç istemiyor.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.radio_stream_health (
  id          uuid primary key default gen_random_uuid(),
  station_id  uuid not null references public.radio_stations(id) on delete cascade,
  checked_at  timestamptz not null default now(),

  /* Yayın o an ayakta mıydı. Ölçümün kendisi — kimsenin elle
     yazabildiği bir bayrak değil. */
  is_live     boolean not null,

  /* Yanıt süresi (ms) — yavaşlama kesintiden önce görünür. */
  latency_ms  integer,

  /* Toplam dinleyici. Bilinmiyorsa boş: 0 yazmak "kimse dinlemiyor"
     demek olurdu ve bu, "sayamadık"tan farklı bir cümle. */
  listeners   integer
    constraint radio_stream_health_listeners_nonneg
    check (listeners is null or listeners >= 0),

  /* O an çalan (§10.2 "şu an çalan içerik"). Adapter'ın verdiği ham
     metin; künye eşleşmesi aranmıyor çünkü AutoDJ'nin çaldığı her parça
     sitede kayıtlı olmayabilir. */
  now_playing text,

  /* Hata metni — `is_live = false` olduğunda sebebi. */
  error       text,

  created_at  timestamptz not null default now()
);

create index if not exists radio_stream_health_station_idx
  on public.radio_stream_health (station_id, checked_at desc);

comment on table public.radio_stream_health is
  'Yayın yoklamaları. Dinleyici SAYISI tutuluyor, dinleyici LİSTESİ değil.';

-- ══════════════════════════════════════════════════════════════════════════
-- CANLILIK: BAYAT ÖLÇÜM CANLI SAYILMIYOR
-- ══════════════════════════════════════════════════════════════════════════

create or replace function app.station_is_live(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app, pg_temp
as $$
  /* Üç dakikadan eski ölçüm "canlı" saymıyor. Yoklama beş dakikada bir
     yapılıyor olsaydı bu pencere yanlış negatif üretirdi; yoklama
     dakikada bir (`radyo-saglik` cron'u) ve üç dakika ard arda üç
     kaçırılmış yoklama demek. O noktada "canlı" demek tahmindir. */
  select coalesce(
    (select h.is_live
       from public.radio_stream_health h
      where h.station_id = target
        and h.checked_at > now() - interval '3 minutes'
      order by h.checked_at desc
      limit 1),
    false
  );
$$;

comment on function app.station_is_live(uuid) is
  'Bayat yoklama canlı sayılmaz — §10.2 "sahte canlı ibaresi göstermeme".';

-- ══════════════════════════════════════════════════════════════════════════
-- CANLI YAYIN BİLDİRİMİ
--
-- `broadcast_live` türü 0042'de zaten var ve `yayin` kategorisine
-- düşüyor; o kategoriyi kapatan kullanıcıya `app.notify` göndermiyor.
-- Yani "takip ediyorum ama yayın bildirimi istemiyorum" iki yerden
-- birden korunuyor: `program_follows.notify` ve bildirim tercihi.
-- ══════════════════════════════════════════════════════════════════════════

create or replace function app.announce_program_live(target_program uuid)
returns integer
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  program record;
  alici   record;
  sayac   integer := 0;
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  select id, slug, title, published
    into program
    from public.radio_programs
   where id = target_program;

  if not found then
    raise exception 'Program bulunamadı' using errcode = 'P0002';
  end if;

  /* YAYIMLANMAMIŞ PROGRAM DUYURULMUYOR. Taslak bir programın canlı
     bildirimini almak, tıklanınca 404 veren bir bildirim demekti. */
  if not program.published then
    raise exception 'Yayımlanmamış program için canlı bildirimi gönderilemez'
      using errcode = '22023';
  end if;

  for alici in
    select f.user_id
      from public.program_follows f
     where f.program_id = target_program
       and f.notify
  loop
    perform app.notify(
      alici.user_id,
      null,
      'broadcast_live',
      program.title || ' canlı yayında',
      null,
      '/radyo/program/' || program.slug,
      'radio_program',
      program.id
    );
    sayac := sayac + 1;
  end loop;

  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (
    auth.uid(), 'radio.program_live', 'radio_program', target_program::text,
    jsonb_build_object('alici_sayisi', sayac)
  );

  return sayac;
end;
$$;

revoke all on function app.announce_program_live(uuid) from public, anon;
grant execute on function app.announce_program_live(uuid) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════════════

alter table public.radio_stations      enable row level security;
alter table public.radio_hosts         enable row level security;
alter table public.radio_programs      enable row level security;
alter table public.program_hosts       enable row level security;
alter table public.program_slots       enable row level security;
alter table public.program_follows     enable row level security;
alter table public.radio_stream_health enable row level security;

/* İSTASYON: açık olan herkese görünüyor. Kapalı istasyon yalnızca
   yöneticide — bakımdaki bir istasyonun yayın adresini herkese açık
   tutmanın kimseye faydası yok. */
drop policy if exists radio_stations_read on public.radio_stations;
create policy radio_stations_read on public.radio_stations
  for select using (enabled or app.is_admin());

drop policy if exists radio_stations_write on public.radio_stations;
create policy radio_stations_write on public.radio_stations
  for all using (app.is_admin()) with check (app.is_admin());

/* YAYINCI: yayımlanmış profil herkese açık. `can_broadcast` ve
   `suspended_at` de bu satırda — ikisi de "bu kişi yayın yapabilir mi"
   sorusunun cevabı ve sır değil. Yayın ŞİFRESİ burada olmadığı için
   satırın okunabilir olması bir risk taşımıyor. */
drop policy if exists radio_hosts_read on public.radio_hosts;
create policy radio_hosts_read on public.radio_hosts
  for select using (published or app.is_admin());

drop policy if exists radio_hosts_write on public.radio_hosts;
create policy radio_hosts_write on public.radio_hosts
  for all using (app.is_admin()) with check (app.is_admin());

/* PROGRAM ve YAYIN SAATİ: yayımlanmışsa herkese açık. */
drop policy if exists radio_programs_read on public.radio_programs;
create policy radio_programs_read on public.radio_programs
  for select using (published or app.is_admin());

drop policy if exists radio_programs_write on public.radio_programs;
create policy radio_programs_write on public.radio_programs
  for all using (app.is_admin()) with check (app.is_admin());

drop policy if exists program_hosts_read on public.program_hosts;
create policy program_hosts_read on public.program_hosts
  for select using (
    exists (
      select 1 from public.radio_programs p
       where p.id = program_id and (p.published or app.is_admin())
    )
  );

drop policy if exists program_hosts_write on public.program_hosts;
create policy program_hosts_write on public.program_hosts
  for all using (app.is_admin()) with check (app.is_admin());

drop policy if exists program_slots_read on public.program_slots;
create policy program_slots_read on public.program_slots
  for select using (
    exists (
      select 1 from public.radio_programs p
       where p.id = program_id and (p.published or app.is_admin())
    )
  );

drop policy if exists program_slots_write on public.program_slots;
create policy program_slots_write on public.program_slots
  for all using (app.is_admin()) with check (app.is_admin());

/* TAKİP: yalnızca kendi satırın. "Bu programı kaç kişi takip ediyor"
   sayısı yönetici RPC'siyle veriliyor; kimin takip ettiği okunmuyor. */
drop policy if exists program_follows_own on public.program_follows;
create policy program_follows_own on public.program_follows
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

/* SAĞLIK KAYDI: OKUMA HERKESE AÇIK DEĞİL.
   Yayının ne sıklıkla düştüğü işletme bilgisi; dinleyicinin ihtiyacı
   olan tek şey "şu an canlı mı" ve onu `app.station_is_live` veriyor.
   Yazma yalnızca sunucu tarafı (service role) — yoklamayı cron yapıyor,
   tarayıcı değil. */
drop policy if exists radio_stream_health_admin on public.radio_stream_health;
create policy radio_stream_health_admin on public.radio_stream_health
  for select using (app.is_admin());

grant execute on function app.station_is_live(uuid) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- `updated_at`
-- ══════════════════════════════════════════════════════════════════════════

create or replace function app.touch_radio_updated_at()
returns trigger
language plpgsql
set search_path = public, app, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists radio_stations_touch on public.radio_stations;
create trigger radio_stations_touch before update on public.radio_stations
  for each row execute function app.touch_radio_updated_at();

drop trigger if exists radio_hosts_touch on public.radio_hosts;
create trigger radio_hosts_touch before update on public.radio_hosts
  for each row execute function app.touch_radio_updated_at();

drop trigger if exists radio_programs_touch on public.radio_programs;
create trigger radio_programs_touch before update on public.radio_programs
  for each row execute function app.touch_radio_updated_at();

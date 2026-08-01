-- ════════════════════════════════════════════════════════════════════════════
-- 0049 — ETKİNLİK TAKİBİ VE HATIRLATMA (Faz 6)
--
-- ══════════════════════════════════════════════════════════════════════════
-- "KATILACAĞIM" ZATEN VARDI — İKİNCİ BİR TABLO AÇMADIK
--
-- §9 "Katılacağım/ilgileniyorum ayrımı" istiyor. İlk akla gelen çözüm
-- `event_follows` tablosuna bir `interest` kolonu koyup her iki durumu
-- orada tutmaktı. Yapmadık: `event_registrations` 0010'dan beri var,
-- kontenjanı `app.enforce_event_capacity` tetikleyicisi koruyor ve
-- `events.registered_count` sayacı ona bağlı.
--
-- İki tabloda iki "katılacağım" olsaydı kontenjan hangisine bakacaktı?
-- Bu yüzden iş bölümü net:
--
--   `event_follows`      → "haberdar olmak istiyorum" (ilgi + hatırlatma)
--   `event_registrations`→ "geleceğim" (kontenjan tüketir)
--
-- Kullanıcıya TEK kontrol gösteriliyor; iki tabloyu `set_event_interest`
-- birlikte yönetiyor. Kayıt olan kişi otomatik olarak takipçi de olur —
-- geleceğini söyleyip iptalden habersiz kalmak saçma olurdu.
--
-- ══════════════════════════════════════════════════════════════════════════
-- HATIRLATMA "NE ZAMAN" DEĞİL "NE KADAR ÖNCE" OLARAK SAKLANIYOR
--
-- `due_at` tek başına saklansaydı, etkinlik tarihi değişince hatırlatma
-- eski tarihte kalırdı — kullanıcı "1 gün önce" dediği hâlde etkinlikten
-- üç gün sonra bildirim alırdı. Bu yüzden NİYET (`offset_kind`) saklanıyor
-- ve `due_at` ondan TÜRETİLİYOR; etkinlik saati kayınca tetikleyici
-- yeniden hesaplıyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- TESLİMAT: SİTE İÇİ BUGÜN ÇALIŞIYOR, E-POSTA SAĞLAYICI BEKLİYOR
--
-- §9'un mimarisi "Cron → Queue → Edge Function" diyor. Site içi teslimat
-- için ARADAKİ İKİ ADIM GEREKSİZ: bildirim üretmek `app.notify` çağrısı,
-- yani veritabanının kendi içinde biten bir iş. Araya bir kuyruk ve bir
-- HTTP sıçraması koymak, veritabanından veritabanına gitmek için ağdan
-- dolaşmak olurdu.
--
-- Kuyruk ve Edge Function E-POSTA için gerekli olacak (dış servis, gerçek
-- başarısızlık, gerçek yeniden deneme) ve sağlayıcı kararı verilmedi
-- (TOPARLAMA §11). O gün geldiğinde `reminders` tablosu hazır: `attempts`
-- ve `last_error` kolonları zaten duruyor.
-- ════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'app' and t.typname = 'reminder_offset') then
    create type app.reminder_offset as enum (
      'hafta',          -- 1 hafta önce
      'gun',            -- 1 gün önce
      'etkinlik_gunu',  -- etkinlik sabahı
      'ozel'            -- kullanıcının seçtiği an
    );
  end if;
end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- TAKİP
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.event_follows (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

comment on table public.event_follows is
  'Etkinlik takibi — değişiklik ve hatırlatma bildirimlerinin kaynağı (§9).';

create index if not exists event_follows_user_idx
  on public.event_follows (user_id, created_at desc);

alter table public.event_follows enable row level security;

/*
 * Takipçi sayısı herkese açık ("42 kişi ilgileniyor" etkinliğin
 * canlılığını gösteriyor); kimin takip ettiği de öyle — etkinlik kamusal
 * bir buluşma, gizli bir liste değil.
 */
drop policy if exists event_follows_read on public.event_follows;
create policy event_follows_read on public.event_follows
  for select using (true);

drop policy if exists event_follows_write_own on public.event_follows;
create policy event_follows_write_own on public.event_follows
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select on public.event_follows to anon;
grant select, insert, delete on public.event_follows to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- HATIRLATMA
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_id    uuid not null references public.events(id) on delete cascade,

  /* NİYET. `due_at` bundan türetiliyor; etkinlik kayınca yeniden hesaplanıyor. */
  offset_kind app.reminder_offset not null,
  /* Yalnızca `ozel` için; diğerlerinde boş. */
  custom_at   timestamptz,

  /* TÜRETİLEN AN. Tarama bu kolona bakıyor, bu yüzden indeksli. */
  due_at      timestamptz not null,

  sent_at     timestamptz,
  /* E-posta boru hattı geldiğinde dolacak; site içi teslimat tek denemede
     ya oluyor ya da satır beklemede kalıyor. */
  attempts    integer not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),

  constraint reminders_custom_at check (
    (offset_kind = 'ozel' and custom_at is not null)
    or (offset_kind <> 'ozel' and custom_at is null)
  )
);

comment on table public.reminders is
  'Etkinlik hatırlatmaları. due_at offset_kind''den türetilir (§9).';

/*
 * TEKRARLI HATIRLATMA ENGELİ (§9). Aynı kullanıcı aynı etkinliğe aynı
 * türden iki hatırlatma kuramıyor. `ozel` için anahtar `custom_at`i de
 * içeriyor — iki farklı özel saat meşru, aynı saat iki kez değil.
 */
create unique index if not exists reminders_unique
  on public.reminders (
    user_id, event_id, offset_kind,
    coalesce(custom_at, '-infinity'::timestamptz)
  );

/* Cron taraması: gönderilmemiş ve vakti gelmiş satırlar. Kısmi indeks
   gönderilmişleri hiç taşımıyor — tablo büyüdükçe tarama büyümüyor. */
create index if not exists reminders_due_idx
  on public.reminders (due_at)
  where sent_at is null;

create index if not exists reminders_user_idx
  on public.reminders (user_id, due_at);

/* Etkinlik saati kayınca tetikleyici o etkinliğin bekleyen hatırlatmalarını
   arıyor; bu indeks olmasaydı her tarih düzeltmesi tabloyu baştan sona
   tarardı. */
create index if not exists reminders_event_idx
  on public.reminders (event_id)
  where sent_at is null;

-- ══════════════════════════════════════════════════════════════════════════
-- NİYETTEN ANA
--
-- SAAT DİLİMİ GÜVENLİĞİ (§9). Her şey `timestamptz`; "etkinlik günü"
-- dışında hiçbir hesap yerel saate bakmıyor. O da bakmak ZORUNDA:
-- "etkinlik sabahı" bir gün kavramı ve gün, saat dilimine göre başlıyor.
-- Site Türkiye'ye ait, referans `Europe/Istanbul` — UTC'de hesaplasaydık
-- gece yarısından sonra başlayan bir etkinlik "bir gün önce"
-- hatırlatılırdı.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.reminder_due_at(
  event_start timestamptz,
  kind app.reminder_offset,
  custom timestamptz
)
returns timestamptz
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case kind
    when 'hafta' then event_start - interval '7 days'
    when 'gun'   then event_start - interval '1 day'
    /* Etkinliğin YEREL gününde sabah 09:00. */
    when 'etkinlik_gunu' then
      ((event_start at time zone 'Europe/Istanbul')::date + time '09:00')
        at time zone 'Europe/Istanbul'
    else custom
  end;
$$;

/*
 * Saf hesap — hiçbir tabloya bakmıyor, yani açık olması bir şey sızdırmıyor.
 * Yine de `public`ten geri alınıyor: 0044/0046'nın kuralı, `app` şemasının
 * yüzeyi ADI ADI verilir. `authenticated` ihtiyaç duyuyor çünkü hatırlatma
 * tetikleyicisi çağıranın yetkisiyle çalışıyor (aşağıda gerekçesi).
 */
revoke execute on function app.reminder_due_at(timestamptz, app.reminder_offset, timestamptz)
  from public, anon;
grant execute on function app.reminder_due_at(timestamptz, app.reminder_offset, timestamptz)
  to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- YAZMA KURALLARI
-- ══════════════════════════════════════════════════════════════════════════
/*
 * ÇAĞIRANIN YETKİSİYLE ÇALIŞIYOR (`security definer` DEĞİL) ve bu bilinçli.
 *
 * Tetikleyici etkinliğin başlangıç saatini okuyor. `security definer`
 * olsaydı bu okuma `events_read` politikasını atlardı: kullanıcı TASLAK bir
 * etkinliğe hatırlatma kurabilir, dönen `due_at`ten henüz yayımlanmamış
 * etkinliğin saatini öğrenebilirdi. Çağıranın yetkisiyle okuyunca taslak
 * satır hiç görünmüyor ve mesaj "Etkinlik bulunamadı" oluyor — ki doğrusu
 * bu: kullanıcı için o etkinlik gerçekten yok.
 */
create or replace function app.reminders_before_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  baslangic timestamptz;
  durum     app.event_status;
begin
  select e.starts_at, e.status into baslangic, durum
    from public.events e where e.id = new.event_id;

  if baslangic is null then
    raise exception 'Etkinlik bulunamadı.' using errcode = 'no_data_found';
  end if;

  if durum = 'cancelled' then
    raise exception 'İptal edilmiş etkinliğe hatırlatma kurulamaz.'
      using errcode = 'check_violation';
  end if;

  new.due_at := app.reminder_due_at(baslangic, new.offset_kind, new.custom_at);

  /*
   * GEÇMİŞE HATIRLATMA KURULAMAZ (§9). Kullanıcı yarın olan bir etkinliğe
   * "1 hafta önce" derse o an çoktan geçmiş; sessizce kabul edip hiç
   * göndermemek, kurduğunu sanan kullanıcıyı bekletmek olurdu.
   */
  if new.due_at <= now() then
    raise exception 'Bu hatırlatmanın zamanı geçmiş.'
      using errcode = 'check_violation';
  end if;

  /*
   * HATIRLATMA ETKİNLİKTEN ÖNCE OLMAK ZORUNDA. Özel saat serbest metin:
   * kullanıcı etkinlikten sonrasını da seçebilirdi ve o bildirim "yaklaşıyor"
   * derken etkinlik çoktan bitmiş olurdu. Kural türetilen türleri de
   * kapsıyor — sabah 06:00'da başlayan bir etkinlikte "etkinlik günü 09:00"
   * seçeneği anlamsız, bu yüzden kabul edilmiyor.
   */
  if new.due_at >= baslangic then
    raise exception 'Hatırlatma etkinlikten sonraya kurulamaz.'
      using errcode = 'check_violation';
  end if;

  /* Hatırlatma kuran kişi etkinliği takip de ediyor: haber almak isteyip
     değişiklikten habersiz kalmak tutarsız olurdu. */
  insert into public.event_follows (event_id, user_id)
  values (new.event_id, new.user_id)
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists reminders_before_write on public.reminders;
create trigger reminders_before_write
  before insert on public.reminders
  for each row execute function app.reminders_before_write();

alter table public.reminders enable row level security;

drop policy if exists reminders_read_own on public.reminders;
create policy reminders_read_own on public.reminders
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists reminders_write_own on public.reminders;
create policy reminders_write_own on public.reminders
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists reminders_delete_own on public.reminders;
create policy reminders_delete_own on public.reminders
  for delete to authenticated
  using (user_id = (select auth.uid()));

/* UPDATE yetkisi YOK: hatırlatmanın "değiştirilmesi" diye bir şey yok,
   silinip yenisi kuruluyor. `sent_at` ve `attempts` yalnızca gönderim
   fonksiyonunun (security definer) yazdığı alanlar. */
grant select, insert, delete on public.reminders to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- TAKİBİ BIRAKAN GELECEK HATIRLATMALARINI DA BIRAKIR (§9)
--
-- Gönderilmişlere dokunulmuyor: onlar olmuş bir olayın kaydı, geleceğe
-- ait bir söz değil.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.event_unfollow_cancels_reminders()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.reminders
   where event_id = old.event_id
     and user_id = old.user_id
     and sent_at is null;
  return old;
end $$;

drop trigger if exists event_follows_cancel_reminders on public.event_follows;
create trigger event_follows_cancel_reminders
  after delete on public.event_follows
  for each row execute function app.event_unfollow_cancels_reminders();

-- ══════════════════════════════════════════════════════════════════════════
-- ETKİNLİK DEĞİŞİNCE: HATIRLATMALARI YENİDEN HESAPLA, TAKİPÇİYE HABER VER
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.event_change_fanout()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  takipci record;
  tur     app.notification_kind;
  baslik  text;
  govde   text;
begin
  /* Saat kaydıysa gönderilmemiş hatırlatmalar yeni saate göre yeniden
     hesaplanıyor — niyet ("1 gün önce") korunuyor, an değişiyor. */
  if new.starts_at is distinct from old.starts_at then
    update public.reminders r
       set due_at = app.reminder_due_at(new.starts_at, r.offset_kind, r.custom_at)
     where r.event_id = new.id and r.sent_at is null;

    /*
     * Yeni hesapla geçerliliğini yitirenler siliniyor: zamanı geçmiş
     * olanlar ve — etkinlik ÖNE alındıysa — artık etkinlikten sonraya düşen
     * özel hatırlatmalar. İkincisi görünmez bir tuzaktı: "15 Eylül 20:00'de
     * hatırlat" diyen kullanıcı, etkinlik 5 Eylül'e çekilince etkinlikten
     * on gün sonra "yaklaşıyor" bildirimi alırdı.
     */
    delete from public.reminders
     where event_id = new.id and sent_at is null
       and (due_at <= now() or due_at >= new.starts_at);
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    tur := 'event_cancelled';
    baslik := new.title || ' iptal edildi';
    govde := 'Takip ettiğin etkinlik iptal edildi.';
    /* İptal edilen etkinliğin hatırlatması gönderilmemeli. */
    delete from public.reminders where event_id = new.id and sent_at is null;
  elsif old.status = 'cancelled' and new.status = 'published' then
    /* İptal geri alındı. Bunu SESSİZ geçmek, "iptal edildi" bildirimini
       almış kullanıcıyı yanlış bilgiyle bırakmak olurdu — üstelik
       hatırlatmaları da silinmişti, kendiliğinden geri gelmiyorlar. */
    tur := 'event_changed';
    baslik := new.title || ' yeniden planlandı';
    govde := 'İptal edilen etkinlik yeniden takvimde: ' ||
             to_char(new.starts_at at time zone 'Europe/Istanbul',
                     'DD.MM.YYYY HH24:MI');
  elsif new.starts_at is distinct from old.starts_at
     or new.venue is distinct from old.venue
     or new.city is distinct from old.city then
    tur := 'event_changed';
    baslik := new.title || ' güncellendi';
    govde := case
      when new.starts_at is distinct from old.starts_at
        then 'Tarih değişti: ' ||
             to_char(new.starts_at at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI')
      else 'Konum değişti: ' || coalesce(new.venue, new.city, '—')
    end;
  else
    return new;
  end if;

  for takipci in
    select f.user_id from public.event_follows f where f.event_id = new.id
  loop
    perform app.notify(
      takipci.user_id, null, tur, baslik, govde,
      '/etkinlik/' || new.slug, 'event', new.id
    );
  end loop;

  return new;
end $$;

drop trigger if exists events_change_fanout on public.events;
create trigger events_change_fanout
  after update on public.events
  for each row execute function app.event_change_fanout();

-- ══════════════════════════════════════════════════════════════════════════
-- TEK KONTROL, İKİ TABLO
--
-- Arayüz "İlgileniyorum / Katılacağım / Vazgeç" gösteriyor; hangi tablonun
-- ne tuttuğunu bilmesi gerekmiyor. Kontenjan kontrolü `event_registrations`
-- üstündeki tetikleyicide kalıyor.
-- ══════════════════════════════════════════════════════════════════════════
-- Bu RPC de `security definer` DEĞİL: iki tablonun da RLS'i zaten "yalnızca
-- kendi satırın" diyor, yükseltilecek bir yetki yok. Definer yazsaydık
-- fonksiyon RLS'i atlar ama etkinliğin görünürlüğünü kontrol etmezdi —
-- taslak bir etkinliğe kayıt açmanın yolu olurdu.
create or replace function public.set_event_interest(
  target_event uuid,
  /* 'yok' | 'ilgileniyorum' | 'katilacagim' */
  level text
)
returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  me    uuid := auth.uid();
  durum app.event_status;
begin
  if me is null then
    raise exception 'Bunun için giriş yapmalısınız.'
      using errcode = 'insufficient_privilege';
  end if;

  if level not in ('yok', 'ilgileniyorum', 'katilacagim') then
    raise exception 'Geçersiz ilgi düzeyi.' using errcode = 'check_violation';
  end if;

  if level = 'yok' then
    delete from public.event_registrations
     where event_id = target_event and user_id = me;
    /* Takip satırının silinmesi gelecek hatırlatmaları da düşürüyor
       (event_follows_cancel_reminders). */
    delete from public.event_follows
     where event_id = target_event and user_id = me;
    return 'yok';
  end if;

  /* Görünürlük kontrolü BURADA, yabancı anahtarda değil: RLS'in gizlediği
     bir etkinliğe satır eklemeye çalışmak FK hatası verirdi ve o hata
     "böyle bir etkinlik var ama göremiyorsun" demekti. */
  select e.status into durum from public.events e where e.id = target_event;
  if durum is null then
    raise exception 'Etkinlik bulunamadı.' using errcode = 'no_data_found';
  end if;
  if durum = 'cancelled' then
    raise exception 'İptal edilmiş etkinlik.' using errcode = 'check_violation';
  end if;

  insert into public.event_follows (event_id, user_id)
  values (target_event, me)
  on conflict do nothing;

  if level = 'katilacagim' then
    insert into public.event_registrations (event_id, user_id)
    values (target_event, me)
    on conflict do nothing;
  else
    delete from public.event_registrations
     where event_id = target_event and user_id = me;
  end if;

  return level;
end $$;

revoke execute on function public.set_event_interest(uuid, text) from public, anon;
grant  execute on function public.set_event_interest(uuid, text) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- GÖNDERİM — SİTE İÇİ, VERİTABANININ İÇİNDE
--
-- Kuyruk ve Edge Function yok, çünkü gerekmiyorlar (dosya başına bakınız).
-- İDEMPOTENT: `sent_at is null` süzgeci + `for update skip locked`. İki
-- tarama üst üste binerse ikincisi kilitli satırları atlıyor, aynı
-- hatırlatma iki kez gönderilmiyor.
--
-- `app.notify` zaten tercih ve engel kontrolü yapıyor; burada tekrar
-- edilmiyor. Bildirim üretilmese bile satır `sent_at` alıyor — "gönderme
-- denendi ve karar verildi" demek, sonsuza dek yeniden denemekten doğru.
-- ══════════════════════════════════════════════════════════════════════════
/*
 * TEK SATIRIN TESLİMİ. Ayrı bir fonksiyon, çünkü aynı iş İKİ yerden
 * çağrılıyor: cron taraması ve yöneticinin "yeniden dene" düğmesi (0050).
 * Gövde tarama döngüsünün içinde kalsaydı, yeniden deneme kopyasını
 * tutmak zorunda kalırdık ve ikisi zamanla ayrışırdı.
 */
create or replace function app.deliver_reminder(target uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  satir record;
begin
  select r.id, r.user_id, r.event_id, e.title, e.slug, e.starts_at, e.status
    into satir
    from public.reminders r
    join public.events e on e.id = r.event_id
   where r.id = target and r.sent_at is null;

  if not found then
    return false;
  end if;

  /* Savunma katmanı: iptalde tetikleyici zaten siliyor, ama tetikleyici
     devre dışıyken (toplu veri düzeltmesi) kalan satır gönderilmemeli. */
  if satir.status = 'cancelled' then
    return false;
  end if;

  begin
    perform app.notify(
      satir.user_id,
      null,
      'event_reminder',
      satir.title || ' yaklaşıyor',
      to_char(satir.starts_at at time zone 'Europe/Istanbul',
              'DD.MM.YYYY HH24:MI') || ' · hatırlatman',
      '/etkinlik/' || satir.slug,
      'event',
      satir.event_id
    );

    update public.reminders
       set sent_at = now(), attempts = attempts + 1, last_error = null
     where id = target;
    return true;
  exception when others then
    /* Tek satırın hatası taramanın tamamını düşürmemeli: kalanlar
       gönderilmeye devam ediyor, hata satırda kayıtlı kalıyor ve yönetici
       panelinde görünüyor. */
    update public.reminders
       set attempts = attempts + 1, last_error = left(sqlerrm, 500)
     where id = target;
    return false;
  end;
end $$;

create or replace function app.dispatch_due_reminders(batch integer default 200)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  satir  record;
  sayac  integer := 0;
begin
  for satir in
    select r.id
      from public.reminders r
      join public.events e on e.id = r.event_id
     where r.sent_at is null
       and r.due_at <= now()
       and e.status <> 'cancelled'
     order by r.due_at
     limit batch
     for update of r skip locked
  loop
    if app.deliver_reminder(satir.id) then
      sayac := sayac + 1;
    end if;
  end loop;

  return sayac;
end $$;

/* İstemciye kapalı: tarama cron'un işi, kullanıcının değil. */
revoke execute on function app.dispatch_due_reminders(integer)
  from public, anon, authenticated;
revoke execute on function app.deliver_reminder(uuid)
  from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'hatirlatma-gonderimi') then
      perform cron.unschedule('hatirlatma-gonderimi');
    end if;

    /*
     * BEŞ DAKİKA. Hatırlatmanın hassasiyeti dakika değil: "1 gün önce"
     * diyen kullanıcı için beş dakikalık kayma görünmez. Daha sık taramak
     * boş sorguları çoğaltmaktan başka bir şey yapmazdı.
     */
    perform cron.schedule(
      'hatirlatma-gonderimi',
      '*/5 * * * *',
      $job$ select app.dispatch_due_reminders(); $job$
    );
  end if;
end $$;

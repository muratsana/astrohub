-- ═══════════════════════════════════════════════════════════════════════
-- HATIRLATMALAR İPTALİ ARTIK TARİHTEN OKUSUN   (FAZ 3/B'nin kaçırdığı üç yer)
--
-- Bir önceki göç (`20260807240000`) `events.status` kolonundan
-- `cancelled` değerini kaldırdı ve iptali `events.cancelled_at`
-- kolonuna taşıdı. Göç, o değeri okuyan fonksiyonları tek tek elden
-- geçirdiğini söylüyordu — ÜÇÜNÜ KAÇIRMIŞ:
--
--   app.reminders_before_write()    — `durum app.event_status` değişkenine
--                                     `e.status` atıyor. Tip artık
--                                     `app.content_status`; atama çalışma
--                                     anında düşerdi. YANİ HİÇBİR
--                                     HATIRLATMA KURULAMAZDI.
--   app.deliver_reminder()          — `satir.status = 'cancelled'`
--                                     karşılaştırması geçersiz enum
--                                     değeri hatası verirdi. YANİ HİÇBİR
--                                     HATIRLATMA GÖNDERİLEMEZDİ.
--   app.dispatch_due_reminders()    — `e.status <> 'cancelled'` aynı hata.
--
-- Üçü de plpgsql gövdesi olduğu için `alter type` onları yakalamadı ve
-- göç sorunsuz uygulandı; hata ilk çağrıda çıkacaktı. Göçün kendi
-- yorumu bu tuzağı tarif ediyordu ama taraması eksik kalmış: `cancelled`
-- geçen fonksiyonları aramak yerine yalnızca içerik tablolarını okuyan
-- fonksiyonlara bakmıştım, hatırlatmalar ise etkinliğe JOIN üzerinden
-- bağlı.
--
-- Bulunma biçimi: göç sonrası `pg_get_functiondef` üzerinde eski değer
-- taraması. Kullanıcıya ulaşmadan yakalandı — üretimde henüz hatırlatma
-- kaydı yok.
--
-- Mantık değişmiyor: "iptal edilmiş mi" sorusunun sorulduğu yer değişiyor.
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

create or replace function app.reminders_before_write()
returns trigger
language plpgsql
set search_path = 'public', 'pg_temp'
as $$
declare
  baslangic timestamptz;
  iptal     timestamptz;
begin
  select e.starts_at, e.cancelled_at into baslangic, iptal
    from public.events e where e.id = new.event_id;

  if baslangic is null then
    raise exception 'Etkinlik bulunamadı.' using errcode = 'no_data_found';
  end if;

  if iptal is not null then
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

create or replace function app.deliver_reminder(target uuid)
returns boolean
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  satir record;
begin
  select r.id, r.user_id, r.event_id, e.title, e.slug, e.starts_at, e.cancelled_at
    into satir
    from public.reminders r
    join public.events e on e.id = r.event_id
   where r.id = target and r.sent_at is null;

  if not found then
    return false;
  end if;

  /* Savunma katmanı: iptalde tetikleyici zaten siliyor, ama tetikleyici
     devre dışıyken (toplu veri düzeltmesi) kalan satır gönderilmemeli. */
  if satir.cancelled_at is not null then
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
set search_path = 'public', 'pg_temp'
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
       and e.cancelled_at is null
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

-- ═══════════════════════════════════════════════════════════════════════
-- BİLDİRİM KATEGORİLERİ VE EKSİK TETİKLEYİCİLER   (Yenileme planı FAZ 6)
--
-- Bir önceki dosya (20260809100000) yalnızca enum değerlerini ekledi;
-- onları KULLANAN her şey burada. Bölünme teknik bir zorunluluk:
-- `alter type ... add value` ile eklenen değer aynı işlemde
-- kullanılamaz.
--
-- ── ÖNCE ÖLÇÜLDÜ ──────────────────────────────────────────────────────
--
-- Bildirim altyapısının kendisi sağlamdı: `app.notify` engellenen
-- göndereni eliyor, kendine bildirim yollamıyor, tercihe bakıyor ve
-- `notifications_unread_unique` ile okunmamış tekrarları katlıyor.
-- Eksik olan altyapı değil, KAPSAM'dı. Ölçüm dört boşluk gösterdi:
--
--   1. Kategori kümesi beş taneydi ve mesaj/forum/galeri hepsi tek bir
--      `sosyal` anahtarının altındaydı — üçünü ayrı ayrı kapatmak
--      mümkün değildi.
--   2. Forum yanıtı `comment_reply` türüyle gidiyordu, yani fotoğraf
--      yorumundan ayırt edilemiyordu.
--   3. Mesaj bildirimi ÜRETİLİYORDU (`app.messages_after_insert`) ama
--      grup konuşmasında hangi gruba yazıldığını söylemiyor ve silinmiş
--      gelen satırı elemiyordu. Buraya önce ikinci bir tetikleyici
--      yazılmıştı; yanlıştı — ölçüm bunu düzeltti, §4'e bakın.
--   4. FAZ 4 içerik onay akışını kurdu ama KARARI SAHİBİNE
--      DUYURMUYORDU. Topluluk gönderen kullanıcı onaylandığını ancak
--      kendi panelini yoklayarak öğrenebiliyordu.
--
-- ── TERCİH GÖÇÜ GEREKMİYOR ────────────────────────────────────────────
--
-- `sosyal`ı üçe bölmek, daha önce "sosyal: kapalı" yazmış bir
-- kullanıcının mesaj bildirimlerini sessizce geri açardı. Ölçtük:
-- `notification_preferences` tablosunda SIFIR satır var, yani kimse
-- henüz tercih kaydetmemiş. Kaydetseydi buraya bir taşıma bloğu
-- gerekirdi; şu an taşınacak veri olmadığı için yazmıyoruz — çalışmayan
-- bir göç kodunu ileride kimse doğrulayamaz.
--
-- Geri alma: bu dosyadaki fonksiyonlar bir önceki hâllerine döner,
-- eklenen üç tetikleyici düşürülür. Enum değerleri kalır (PostgreSQL
-- enum değeri silmez); artık kimse üretmediği için zararsızdırlar.
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

-- ══════════════════════════════════════════════════════════════════════
-- 1 · TÜR → KATEGORİ HARİTASI
--
-- `notifications.category` bu fonksiyondan ÜRETİLEN bir kolon
-- (`generated always as`). Üretilmiş kolonun ifadesi, fonksiyonu
-- değiştirdiğimizde kendiliğinden yeniden hesaplanmaz — eski satırlar
-- eski kategoride donar. Bu yüzden kolonu düşürüp yeniden ekliyoruz:
-- yeniden ekleme tüm satırları yeni haritayla hesaplar, yani geriye
-- dönük doldurma bedava geliyor. Kolona bağlı görünüm ya da politika
-- olmadığı ölçüldü (RLS yalnızca `user_id`ye bakıyor).
-- ══════════════════════════════════════════════════════════════════════

alter table public.notifications drop column category;

create or replace function app.notification_category_of(kind app.notification_kind)
returns app.notification_category
language sql
immutable
set search_path = pg_catalog, app
as $$
  select case kind
    -- Takip, kişiden kişiye tek sosyal olay: kendi anahtarında kalıyor.
    when 'follow'           then 'sosyal'

    -- Galeri: hepsi bir FOTOĞRAFA olan tepkiler. `comment_reply` artık
    -- yalnızca fotoğraf yorumuna yanıt demek; forum yanıtı aşağıda
    -- kendi türüne taşındı.
    when 'comment'          then 'galeri'
    when 'comment_reply'    then 'galeri'
    when 'like'             then 'galeri'
    when 'rating'           then 'galeri'
    when 'photo_featured'   then 'galeri'

    when 'forum_reply'      then 'forum'
    when 'message'          then 'mesaj'
    when 'listing'          then 'ilan'

    -- Moderasyon kararı ayrı kategori ama AŞAĞIDA kapatılamaz olarak da
    -- işaretlenmedi: kullanıcının kendi bildirdiği raporun sonucunu
    -- almak istememesi meşru bir tercih. Kapatılamayan tek şey `sistem`.
    when 'moderation'       then 'moderasyon'

    -- Kullanıcının GÖNDERDİĞİ içeriğin akıbeti. Başkasının içeriğiyle
    -- ilgili değil, bu yüzden galeri/forum değil.
    when 'content_approved' then 'icerik'
    when 'content_rejected' then 'icerik'

    when 'event_new'        then 'etkinlik'
    when 'event_changed'    then 'etkinlik'
    when 'event_cancelled'  then 'etkinlik'
    when 'event_reminder'   then 'etkinlik'
    when 'broadcast_live'   then 'yayin'
    when 'podcast_episode'  then 'yayin'
    else 'sistem'
  end::app.notification_category;
$$;

alter table public.notifications
  add column category app.notification_category
    generated always as (app.notification_category_of(kind)) stored;

-- ══════════════════════════════════════════════════════════════════════
-- 2 · KANAL BOYUTU
--
-- Kabul kriteri: "bildirim tercihleri e-posta/push için genişletilebilir
-- yapıda olsun." Bugünkü `categories` biçimi {"galeri": false} — tek
-- boyutlu, yalnızca site içi. Bu biçim "e-postayı sadece moderasyon
-- için istiyorum"u İFADE EDEMİYOR.
--
-- Genişletme, ikinci bir kolon eklemeden yapılıyor: değer artık ya
-- boolean (eski biçim, tüm kanallar için geçerli) ya da kanal haritası
-- olabiliyor:
--
--     {"galeri": false}                        → galeri hiçbir kanaldan
--     {"galeri": {"site": true, "email": false}} → sitede var, postada yok
--
-- İki biçim aynı anda okunuyor; eski satırlar dokunulmadan çalışmaya
-- devam ediyor. `channel` varsayılanı 'site' olduğu için mevcut tüm
-- çağrılar (app.notify dahil) imza değişikliğini hissetmiyor.
--
-- E-posta/push GÖNDERİMİ bu göçün kapsamında değil — sağlayıcı seçimi
-- ürün kararı. Kurulan şey, o gönderim geldiğinde tercihi soracağı yer.
-- ══════════════════════════════════════════════════════════════════════

-- ESKİ İMZA ÖNCE DÜŞÜYOR. `create or replace` yeni imzayı AYRI bir
-- fonksiyon olarak eklerdi; iki argümanlı çağrı (app.notify'ın yaptığı)
-- o an "function is not unique" hatasına düşerdi — varsayılanlı üçüncü
-- parametre iki argümanla da eşleşiyor.
drop function if exists app.notification_allowed(uuid, app.notification_kind);

create function app.notification_allowed(
  target_user uuid,
  kind        app.notification_kind,
  channel     text default 'site'
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    -- Sistem bildirimi kapatılamaz: üyelik bitişi, hesap uyarısı,
    -- yöneticinin doğrudan mesajı. Kapatılabilseydi kullanıcı kendi
    -- hesabıyla ilgili zorunlu duyuruyu kaçırabilirdi.
    when app.notification_category_of(kind) = 'sistem' then true
    else coalesce(
      (
        select case jsonb_typeof(v)
          -- Eski biçim: tek boolean, bütün kanallar için.
          when 'boolean' then v::text::boolean
          -- Yeni biçim: kanal haritası. Kanal yazılmamışsa açık sayılıyor
          -- — anahtarın yokluğu "hayır" değil "belirtilmemiş" demek ve
          -- varsayılan, kaydı hiç olmayan kullanıcıyla aynı olmalı.
          when 'object'  then coalesce((v ->> channel)::boolean, true)
          else true
        end
        from public.notification_preferences p
        cross join lateral (
          select p.categories -> app.notification_category_of(kind)::text
        ) as t(v)
        where p.user_id = target_user
      ),
      true
    )
  end;
$$;

-- Eski fonksiyonun yetki durumu birebir korunuyor: yalnızca sahibi
-- çalıştırabiliyordu. İstemciye açsaydık, kullanıcı başkasının bildirim
-- tercihlerini tek tek sorgulayarak öğrenebilirdi.
revoke all on function app.notification_allowed(uuid, app.notification_kind, text) from public;

-- ══════════════════════════════════════════════════════════════════════
-- 3 · FORUM YANITI KENDİ TÜRÜNE
--
-- Tek satırlık değişiklik ama "forum" kategorisinin var olma şartı:
-- tür `comment_reply` kaldığı sürece forum yanıtı galeri yorumuyla aynı
-- kutuda kalırdı.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.notify_forum_reply()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  thread record;
  who    text;
begin
  select t.author_id, t.slug, t.title into thread
    from public.forum_threads t where t.id = new.thread_id;

  if thread.author_id is null then
    return new;
  end if;

  select coalesce(pr.display_name, pr.username::text, 'Bir üye') into who
    from public.profiles pr where pr.id = new.author_id;

  perform app.notify(
    thread.author_id, new.author_id, 'forum_reply',
    coalesce(who, 'Bir üye') || ' konuna yanıt yazdı',
    thread.title, '/forum/' || thread.slug, 'forum_thread', new.thread_id
  );
  return new;
end $$;

-- ══════════════════════════════════════════════════════════════════════
-- 4 · MESAJ BİLDİRİMİ — VAR OLAN ÜRETİCİ YERİNDE YÜKSELTİLİYOR
--
-- ÖNCE YANLIŞ ÖLÇMÜŞTÜK. Bu bölüm ilk yazıldığında "messages tablosunda
-- hiç tetikleyici yok" varsayılmış ve `app.notify_message` adında İKİNCİ
-- bir üretici eklenmişti. Ölçüm bunu çürüttü: `app.messages_after_insert`
-- (0043_mesajlasma) zaten `message` bildirimi yazıyor.
--
-- İkinci üreticinin zararı çift bildirim DEĞİLDİ — `app.notify` çakışmada
-- `on conflict do nothing` ile düşüyor, `notifications_unread_unique` de
-- aynı konuşmayı katlıyor. Zararı daha sinsiydi: PostgreSQL tetikleyicileri
-- AD SIRASIYLA çalıştırır, `messages_after_insert` < `messages_notify`,
-- yani satırı hep eski fonksiyon yazıyor ve yenisinin getirdiği grup
-- başlığı ile silinmiş-mesaj koruması HİÇBİR ZAMAN devreye girmiyordu.
-- Ölü kod, üstelik "eklendi" görünen ölü kod.
--
-- Doğrusu tek üretici: eski fonksiyonun gövdesi genişletiliyor, ikinci
-- tetikleyici ve fonksiyonu düşürülüyor.
--
-- HER MESAJ İÇİN AYRI SATIR AÇILMIYOR: `notifications_unread_unique`
-- anahtarı (user_id, kind, subject_id, actor_id) ve subject_id olarak
-- KONUŞMA kimliği veriliyor. Aynı kişiden aynı konuşmada gelen yirmi
-- mesaj, okunmadığı sürece tek satır. Kullanıcı okuyunca satır "okundu"ya
-- geçer ve sonraki mesaj yeni satır açar. Mesaj kimliğini subject
-- yapsaydık zil yirmi kere şişerdi.
--
-- KORUNAN DAVRANIŞ: `last_message_at` güncellemesi koşulsuz kalıyor
-- (konuşma listesinin sıralaması buna bakıyor), gövde `left(body, 120)`
-- ile kırpılmaya devam ediyor, sessize alınmış ve ayrılmış katılımcı
-- eleniyor.
--
-- EKLENEN: grup konuşmasında başlığa grup adı giriyor (birebir konuşmada
-- başlık zaten karşı tarafın adı, tekrar olurdu) ve `deleted_at` dolu
-- gelen satır bildirim üretmiyor.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  convo   record;
  who     text;
  alici   record;
  heading text;
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;

  if new.sender_id is null or new.deleted_at is not null then
    return new;
  end if;

  select c.kind, c.title into convo
    from public.conversations c where c.id = new.conversation_id;

  select coalesce(pr.display_name, pr.username::text, 'Bir üye') into who
    from public.profiles pr where pr.id = new.sender_id;

  heading := case
    when convo.kind = 'group' and convo.title is not null
      then coalesce(who, 'Bir üye') || ' · ' || convo.title
    else coalesce(who, 'Bir üye') || ' sana mesaj gönderdi'
  end;

  for alici in
    select cp.user_id
      from public.conversation_participants cp
     where cp.conversation_id = new.conversation_id
       and cp.user_id <> new.sender_id
       and cp.left_at is null
       and cp.muted = false
  loop
    perform app.notify(
      alici.user_id, new.sender_id, 'message',
      heading,
      left(new.body, 120),
      '/mesajlar/' || new.conversation_id::text,
      'conversation', new.conversation_id
    );
  end loop;

  return new;
end $$;

-- İkinci üretici geri alınıyor. Sıra önemli: önce tetikleyici, sonra
-- fonksiyon — ters sırada `drop function` bağımlılık hatası verirdi.
drop trigger if exists messages_notify on public.messages;
drop function if exists app.notify_message();

-- Konuşma silinince ona işaret eden bildirim ölü bağlantıya dönerdi.
-- Diğer kaynaklarda (fotoğraf, forum konusu) zaten kurulu olan temizlik
-- deseninin aynısı.
drop trigger if exists conversations_notify_cleanup on public.conversations;
create trigger conversations_notify_cleanup
  after delete on public.conversations
  for each row execute function app.notifications_clean_subject('conversation');

-- ══════════════════════════════════════════════════════════════════════
-- 5 · İÇERİK ONAY/RET KARARI SAHİBİNE
--
-- FAZ 4'ün akışı: taslak → incelemede → onaylandi/yayinda/reddedildi.
-- Karar anı, `incelemede`DEN ÇIKIŞ. Koşulu böyle yazmak iki tekrarı
-- birden engelliyor: `onaylandi → yayinda` ikinci bir "onaylandı"
-- bildirimi üretmiyor, ve durum aynı kalan güncellemeler (başlık
-- düzeltmesi gibi) hiç tetiklemiyor.
--
-- ONAY VE RET AYRI TÜR. Tek tür kullansaydık, reddedilip düzeltilen ve
-- sonra onaylanan bir içeriğin onay bildirimi, okunmamış ret satırına
-- `notifications_unread_unique` üzerinden çarpar ve SESSİZCE DÜŞERDİ —
-- kullanıcı ekranında hâlâ "reddedildi" yazarken içerik yayında olurdu.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.notify_content_decision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  onaylandi boolean;
begin
  if new.submitted_by is null then
    return new;
  end if;

  if old.status <> 'incelemede'
     or new.status not in ('onaylandi', 'yayinda', 'reddedildi') then
    return new;
  end if;

  onaylandi := new.status <> 'reddedildi';

  perform app.notify(
    new.submitted_by,
    null,
    case when onaylandi then 'content_approved' else 'content_rejected' end,
    case when onaylandi
      then 'İçeriğin yayına alındı'
      else 'İçeriğin yayımlanmadı'
    end,
    case when onaylandi
      then new.title
      else coalesce(new.rejection_reason, 'Gerekçe panelinde yazıyor.')
    end,
    -- Reddedilen içeriğin herkese açık adresi yok; kullanıcıyı
    -- "bulunamadı" sayfasına değil kendi paneline gönderiyoruz.
    -- `/panel/gonderilerim` FAZ 4'te tam bu iş için açılmıştı: gerekçe
    -- ve "incelemeye tekrar gönder" düğmesi orada.
    case
      when not onaylandi then '/panel/gonderilerim'
      when new.kind = 'haber' then '/haber/' || new.slug
      when new.kind = 'yazi'  then '/yazi/' || new.slug
      else '/panel/gonderilerim'
    end,
    'content_entry', new.id
  );

  return new;
end $$;

drop trigger if exists content_entries_notify_decision on public.content_entries;
create trigger content_entries_notify_decision
  after update on public.content_entries
  for each row execute function app.notify_content_decision();

-- ══════════════════════════════════════════════════════════════════════
-- 6 · TOPLULUK ONAY/RET KARARI GÖNDERENE
--
-- Aynı karar, ayrı tablo. `clubs` bugün sitede kullanıcının GERÇEKTEN
-- gönderdiği içerik (/topluluklar/ekle); onay bildirimi burada
-- `content_entries`ten daha çok işe yarıyor.
--
-- SUBJECT KİMLİĞİ SLUG'DAN TÜRETİLİYOR. `clubs` birincil anahtarı metin
-- (`slug`), `notifications.subject_id` ise uuid. Boş bırakabilirdik ama
-- o zaman iki farklı topluluğun kararı — ikisi de okunmamışken —
-- `notifications_unread_unique` içinde aynı satıra düşer, ikincisi
-- kaybolurdu. `md5(slug)::uuid` deterministik: aynı topluluk hep aynı
-- kimliği alır, farklı topluluklar farklı. Bunun bir yabancı anahtar
-- OLMADIĞINI belirtmek için `subject_type` 'club_slug' yazılıyor —
-- silme temizliği bu kimliği eşleştirmeye çalışmasın.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.notify_club_decision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  hedef     uuid;
  onaylandi boolean;
begin
  hedef := coalesce(new.submitted_by, new.manager_user_id);
  if hedef is null then
    return new;
  end if;

  if old.status <> 'incelemede'
     or new.status not in ('onaylandi', 'yayinda', 'reddedildi') then
    return new;
  end if;

  onaylandi := new.status <> 'reddedildi';

  perform app.notify(
    hedef,
    null,
    case when onaylandi then 'content_approved' else 'content_rejected' end,
    case when onaylandi
      then new.name || ' yayına alındı'
      else new.name || ' yayımlanmadı'
    end,
    case when onaylandi
      then 'Topluluk sayfası artık herkese açık.'
      else coalesce(new.rejection_reason, 'Gerekçe panelinde yazıyor.')
    end,
    -- REDDEDİLENDE DE TOPLULUK SAYFASINA gidiyoruz, panele değil:
    -- `clubs_read` politikası gönderene ve yöneticisine kaydı DURUMU NE
    -- OLURSA OLSUN gösteriyor, ret gerekçesi de o sayfada. Panele
    -- yollasaydık topluluk için böyle bir bölüm olmadığından kullanıcı
    -- boş bir sayfaya düşerdi.
    '/topluluk/' || new.slug,
    'club_slug', md5(new.slug)::uuid
  );

  return new;
end $$;

drop trigger if exists clubs_notify_decision on public.clubs;
create trigger clubs_notify_decision
  after update on public.clubs
  for each row execute function app.notify_club_decision();

comment on function app.notification_allowed(uuid, app.notification_kind, text) is
  'Kullanıcının bu tür bildirimi bu kanaldan isteyip istemediği. Kanal '
  'varsayılanı site içi; e-posta/push aynı tercih haritasından okunur.';

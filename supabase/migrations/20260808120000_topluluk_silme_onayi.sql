-- ═══════════════════════════════════════════════════════════════════════
-- TOPLULUK SİLME ONAY AKIŞI + ARŞİV VE GERİ BİLDİRİM EYLEMLERİ
--                                      (Yenileme planı FAZ 5, görev 2 ve 5)
--
-- Önceki göç iki enum değerini ekledi; burada kullanılıyorlar.
--
-- ── SİLME BUGÜN TEK AŞAMALIYDI VE SESSİZDİ ────────────────────────────
--
-- FAZ 4'te topluluk sahipliği açıldı: `clubs_manager_update` politikası
-- yöneticinin kendi kaydını düzenlemesine izin veriyor.
-- `app.kulup_yonetim_alanlari` tetikleyicisi yayın kararına ait alanları
-- (status, listed, verified_*, reviewed_*, manager_user_id) koruyor ama
-- `deleted_at` o listede DEĞİLDİ. Yani topluluk sahibi tek bir update ile
-- kaydı yok edebiliyordu — planın "sahip tek başına silemez" kuralının
-- tam tersi. Bu göç `deleted_at`/`archived_at`'ı da korumaya alıyor ve
-- silmeyi iki aşamaya bölüyor: TALEP (sahip) → KARAR (admin).
--
-- ── TALEP NEREDE DURUYOR ──────────────────────────────────────────────
--
-- `moderation_queue` içinde, `club_deletion` hedef türüyle. Ayrı bir
-- tablo açmak, "bekleyen yönetim işi" listesinin ikinci bir kaynağını
-- üretirdi (§6.8) — admin iki ayrı ekrana bakmak zorunda kalırdı.
--
-- Talep şikâyetten iki noktada ayrılıyor ve ikisi de burada zorlanıyor:
--   · GEREKÇE ZORUNLU  → `moderation_talep_gerekcesi` kısıtı
--   · YALNIZCA ADMİN GÖRÜR → okuma/yazma politikaları moderatörü bu
--     türün dışında tutuyor (plan: "moderatöre listelenmez")
-- Sahibi kendi talebini görebiliyor; göremeseydi panelde "talebiniz
-- incelemede" diyecek bir kaynak kalmazdı ve aynı talep tekrar tekrar
-- açılırdı.
--
-- ── ONAY BEKLERKEN TOPLULUK YAYINDA KALIYOR ───────────────────────────
--
-- Talep `clubs` satırına hiç dokunmuyor: ne `status`, ne `listed`, ne
-- `deleted_at`. Kabul kriteri bunu istiyor — "onay bekleyen topluluk
-- public'te hâlâ görünüyor". Kaldırma yalnızca admin onayında,
-- `public.topluluk_silme_karari` içinde oluyor.
--
-- ── DÖRT YENİ RPC, HEPSİ TEK YÜZEY ────────────────────────────────────
--
--   topluluk_silme_talebi   (sahip)  talep açar
--   topluluk_silme_durumu   (sahip)  kendi talebinin durumunu okur
--   topluluk_silme_karari   (admin)  onaylar / reddeder
--   moderasyon_geri_bildirim(admin+moderatör) şikâyetçiye mesaj yazar
--
-- Talebin doğrudan `insert` ile açılmaması bilinçli: kimin hangi
-- topluluk için talep açabileceği bir SATIR koşulu değil, bir SAHİPLİK
-- sorusu (`clubs.manager_user_id`). Politikaya yazmak `moderation_queue`
-- politikasını `clubs` tablosuna bağımlı kılardı; insert yolu kapatılıp
-- tek kapı olarak bu fonksiyon bırakıldı.
--
-- Geri alma: dört fonksiyonu düşürmek ve politikaları önceki hâline
-- döndürmek yeterli; enum değerleri kalır (PostgreSQL değer düşürmez).
-- ═══════════════════════════════════════════════════════════════════════

-- ── Parmak izi kontrolü: doğru projede miyiz ───────────────────────────
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
-- 1 · KISITLAR
--
-- `archived` de bir KAPANIŞ: kimin kapattığı yazılmadan kapanmamalı.
-- Kısıt yoksa arşivlenen kayıtta `resolved_by` boş kalır ve altı ay
-- sonra "bunu kim kapattı" sorusunun cevabı hiçbir yerde olmaz.
-- ══════════════════════════════════════════════════════════════════════

alter table public.moderation_queue
  drop constraint if exists moderation_resolution_complete;

alter table public.moderation_queue
  add constraint moderation_resolution_complete check (
    status not in ('approved', 'rejected', 'archived')
    or (resolved_by is not null and resolved_at is not null)
  );

-- Gerekçesiz silme talebi kabul edilmiyor — kabul kriterinin
-- "veritabanı düzeyinde zorunlu alan" dediği yer burası. Şikâyette not
-- isteğe bağlı kalıyor: apaçık spam için gerekçe yazdırmak kuyruğu
-- yavaşlatır. Talep başka: bir topluluğu kapatmak geri alınması zor bir
-- karar ve gerekçesi sahibinin kendi cümlesiyle kalmalı.
alter table public.moderation_queue
  drop constraint if exists moderation_talep_gerekcesi;

alter table public.moderation_queue
  add constraint moderation_talep_gerekcesi check (
    target_type <> 'club_deletion' or char_length(btrim(note)) > 0
  );

-- ══════════════════════════════════════════════════════════════════════
-- 2 · POLİTİKALAR — TALEBİ MODERATÖRDEN GİZLE
--
-- Plan: "Bu talep yalnızca admin'e görünür; moderasyon kuyruğunda
-- moderatöre listelenmez." Süzmeyi arayüze bırakmak yetmezdi: moderatör
-- aynı sorguyu PostgREST üzerinden çalıştırıp satırı okuyabilirdi.
-- ══════════════════════════════════════════════════════════════════════

drop policy if exists moderation_queue_read on public.moderation_queue;
create policy moderation_queue_read on public.moderation_queue
  for select to authenticated
  using (
    app.is_admin()
    or (app.has_role('moderator') and target_type <> 'club_deletion')
    -- Sahibi KENDİ talebini görür: panelde "incelemede" diyebilmek ve
    -- ikinci bir talebi engelleyebilmek için gereken tek satır bu.
    or (target_type = 'club_deletion' and reported_by = (select auth.uid()))
  );

drop policy if exists moderation_queue_moderate on public.moderation_queue;
create policy moderation_queue_moderate on public.moderation_queue
  for update to authenticated
  using (
    app.is_admin()
    or (app.has_role('moderator') and target_type <> 'club_deletion')
  )
  with check (
    app.is_admin()
    or (app.has_role('moderator') and target_type <> 'club_deletion')
  );

-- Şikâyet yolu duruyor; yalnızca silme talebi bu kapıdan giremiyor.
-- Talebin tek yolu `public.topluluk_silme_talebi` — sahiplik kontrolü
-- orada.
drop policy if exists moderation_queue_report on public.moderation_queue;
create policy moderation_queue_report on public.moderation_queue
  for insert to authenticated
  with check (
    (select auth.uid()) = reported_by
    and status = 'pending'
    and assigned_to is null
    and resolved_by is null
    and target_type <> 'club_deletion'
  );

-- ══════════════════════════════════════════════════════════════════════
-- 3 · BİLDİRİM — ARŞİV SESSİZ, TALEP KENDİ METNİNİ YAZIYOR
--
-- `archived` bilinçli olarak bildirim üretmiyor: yinelenen ya da konusu
-- kalmamış bir rapor için "raporun incelendi" bildirimi göndermek,
-- bildirimi değersizleştirir. Şikâyetçiye söylenecek bir şey varsa
-- moderatör `moderasyon_geri_bildirim` ile kendi cümlesini yazıyor —
-- planın ayrı bir eylem olarak istediği "kullanıcıya geri bildirim
-- gönder" tam olarak bu.
--
-- `club_deletion` de burada durduruluyor: "Raporun incelendi ve haklı
-- bulundu" cümlesi bir silme talebinin cevabı değil. O bildirimi
-- `topluluk_silme_karari` topluluk adıyla birlikte gönderiyor.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.notify_moderation_result()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if new.reported_by is null then
    return new;
  end if;

  if new.target_type = 'club_deletion' then
    return new;
  end if;

  if new.status = old.status or new.status not in ('approved', 'rejected') then
    return new;
  end if;

  perform app.notify(
    new.reported_by, null, 'moderation',
    case new.status
      when 'approved' then 'Raporun incelendi ve haklı bulundu'
      else 'Raporun incelendi'
    end,
    coalesce(new.resolution_note, 'İncelemeyi tamamladık, teşekkürler.'),
    null, 'moderation', new.id
  );
  return new;
end $function$;

-- ══════════════════════════════════════════════════════════════════════
-- 4 · DENETİM — TALEP DE KAYDA GEÇİYOR
--
-- Kabul kriteri: "Talep ve karar denetim kaydında, gerekçeleriyle
-- birlikte." Karar zaten yazılıyordu (durum değişikliği); TALEBİN
-- kendisi hiçbir yere düşmüyordu. Yalnızca `club_deletion` eklendi:
-- şikâyetlerin her birini açılış anında denetime yazmak günlüğü
-- kullanıcı hareketiyle doldurur, oysa denetim kaydı YÖNETİM
-- işlemlerinin günlüğü.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.audit_moderation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
    values (
      auth.uid(),
      'moderation.talep',
      new.target_type::text,
      new.target_id::text,
      jsonb_build_object(
        'kuyruk_id', new.id,
        'sebep', new.reason,
        'gerekce', new.note
      )
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
    values (
      auth.uid(),
      'moderation.' || new.status,
      new.target_type::text,
      new.target_id::text,
      jsonb_build_object(
        'kuyruk_id', new.id,
        'onceki', old.status,
        'sonraki', new.status,
        'sebep', new.reason,
        'karar_notu', new.resolution_note
      )
    );
  end if;
  return new;
end;
$function$;

drop trigger if exists moderation_talep_audit on public.moderation_queue;
create trigger moderation_talep_audit
  after insert on public.moderation_queue
  for each row
  when (new.target_type = 'club_deletion')
  execute function app.audit_moderation();

-- ══════════════════════════════════════════════════════════════════════
-- 5 · SAHİP KENDİ TOPLULUĞUNU SİLEMİYOR
--
-- `deleted_at` ve `archived_at` korunan alanlar listesine giriyor.
-- Mesaj yol gösteriyor: kapı kapanmıyor, talebe yönlendiriliyor.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.kulup_yonetim_alanlari()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null or app.is_admin() or app.has_role('moderator') then
    return new;
  end if;

  if new.deleted_at is distinct from old.deleted_at
     or new.archived_at is distinct from old.archived_at then
    raise exception
      'Topluluk kaydı doğrudan silinemez; silme talebi açmalısınız.'
      using errcode = 'insufficient_privilege',
            hint = 'Topluluk sayfanızdaki "Silme talebi" bölümünden gerekçenizle başvurun; kararı yönetim verir.';
  end if;

  if new.status is distinct from old.status
     or new.listed is distinct from old.listed
     or new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.rejection_reason is distinct from old.rejection_reason
     or new.manager_user_id is distinct from old.manager_user_id then
    raise exception
      'Topluluğun onay ve görünürlük alanları yalnızca yönetim tarafından değiştirilebilir.'
      using errcode = 'insufficient_privilege',
            hint = 'İçerik alanlarını düzenleyebilirsiniz; yayın kararı yönetimde.';
  end if;

  return new;
end;
$function$;

-- ══════════════════════════════════════════════════════════════════════
-- 6 · SİLME İZİ `id` OLMAYAN TABLODA DA ÇALIŞSIN
--
-- `app.icerik_silme_izi` denetim satırını `new.id` ile yazıyordu.
-- `clubs` tablosunun birincil anahtarı `slug`; `id` kolonu YOK. Yani
-- bir topluluğun ilk soft delete denemesi 42703 ("record new has no
-- field id") ile düşerdi — FAZ 3'te eklenen tetikleyici bu tabloda hiç
-- çalıştırılmamış. Onay akışı tam olarak o yoldan geçtiği için burada
-- kapanıyor: kimlik artık satırın kendisinden okunuyor.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.icerik_silme_izi()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_kimlik text := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'slug');
begin
  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_by := auth.uid();

    insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'content.soft_delete', tg_table_name, v_kimlik,
            jsonb_build_object('durum', new.status::text));

  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;

    insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'content.restore', tg_table_name, v_kimlik,
            jsonb_build_object('durum', new.status::text));
  end if;

  return new;
end;
$function$;

-- ══════════════════════════════════════════════════════════════════════
-- 7 · TALEP — SAHİP AÇAR
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.topluluk_silme_talebi(
  p_slug text,
  p_gerekce text
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_yonetici uuid;
  v_gonderen uuid;
  v_silinmis timestamptz;
  v_gerekce  text := btrim(coalesce(p_gerekce, ''));
  v_id       uuid;
begin
  if v_uid is null then
    raise exception 'Silme talebi açmak için giriş yapmalısınız.'
      using errcode = 'insufficient_privilege';
  end if;

  select manager_user_id, submitted_by, deleted_at
    into v_yonetici, v_gonderen, v_silinmis
  from public.clubs
  where slug = p_slug;

  if not found then
    raise exception 'Topluluk bulunamadı: %', p_slug
      using errcode = 'no_data_found';
  end if;

  if v_silinmis is not null then
    raise exception 'Bu topluluk zaten kaldırılmış.'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  /* Sahiplik ölçütü `clubs_manager_update` politikasıyla AYNI: atanmış
     yönetici, yoksa kaydı gönderen. İki yerde farklı ölçüt olsaydı
     düzenleyebildiği kaydı kapatamayan bir sahip ortaya çıkardı. */
  if not (v_yonetici = v_uid or (v_yonetici is null and v_gonderen = v_uid)) then
    raise exception 'Bu topluluğun silinmesini yalnızca yöneticisi isteyebilir.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_gerekce = '' then
    raise exception 'Silme talebinde gerekçe zorunlu.'
      using errcode = 'check_violation',
            hint = 'Topluluğu neden kapatmak istediğinizi yazın; kararı veren yönetici bu metni okuyacak.';
  end if;

  if exists (
    select 1 from public.moderation_queue
    where target_type = 'club_deletion'
      and target_id = p_slug
      and status in ('pending', 'in_review')
  ) then
    raise exception 'Bu topluluk için bekleyen bir silme talebi zaten var.'
      using errcode = 'unique_violation';
  end if;

  insert into public.moderation_queue
    (target_type, target_id, target_path, status, reason, reported_by, note)
  values
    ('club_deletion', p_slug, '/topluluk/' || p_slug, 'pending', 'diger', v_uid, v_gerekce)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.topluluk_silme_talebi(text, text) is
  'Topluluk sahibinin silme talebi. Gerekçe zorunlu; topluluk karar verilene kadar yayında kalır.';

revoke all on function public.topluluk_silme_talebi(text, text) from public;
grant execute on function public.topluluk_silme_talebi(text, text) to authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 8 · DURUM — SAHİP KENDİ TALEBİNİ OKUR
--
-- Sahiplik bilgisini (`manager_user_id`) kolon olarak dışa açmak yerine
-- fonksiyondan tek bir "siz misiniz" cevabı dönüyor: dizinde kimin
-- yönetici olduğu ziyaretçiyi ilgilendirmiyor.
-- Yönetici olmayana satır dönmüyor — cevap `null`.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.topluluk_silme_durumu(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select jsonb_build_object(
    'yonetici', true,
    'talep', (
      select jsonb_build_object(
        'id', m.id,
        'durum', m.status,
        'gerekce', m.note,
        'karar_notu', m.resolution_note,
        'olusturuldu', m.created_at
      )
      from public.moderation_queue m
      where m.target_type = 'club_deletion'
        and m.target_id = p_slug
      order by m.created_at desc
      limit 1
    )
  )
  from public.clubs k
  where k.slug = p_slug
    and k.deleted_at is null
    and (
      k.manager_user_id = (select auth.uid())
      or (k.manager_user_id is null and k.submitted_by = (select auth.uid()))
    );
$$;

comment on function public.topluluk_silme_durumu(text) is
  'Çağıran bu topluluğun sahibi mi ve son silme talebi ne durumda. Sahip değilse satır dönmez.';

revoke all on function public.topluluk_silme_durumu(text) from public;
grant execute on function public.topluluk_silme_durumu(text) to authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 9 · KARAR — ADMİN VERİR
--
-- `approved` = talep onaylandı → topluluk kaldırıldı.
-- `rejected` = talep reddedildi → topluluk yerinde kalıyor.
--
-- Şikâyet kayıtlarında bu iki değer İÇERİK hakkında ("kalsın" /
-- "kalksın"); talepte TALEP hakkında. Aynı sütunun iki kayıt türünde
-- farklı okunması riskli görünüyor ama alternatifi daha kötüydü: talep
-- için üçüncü bir durum çifti eklemek, kuyruğu okuyan her sorguyu
-- ikiye bölerdi. Arayüz düğmeleri bu yüzden tür başına ayrı adlandırılıyor
-- ("Silmeyi onayla" / "Talebi reddet").
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.topluluk_silme_karari(
  p_talep_id uuid,
  p_onay boolean,
  p_gerekce text default null
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_talep   public.moderation_queue;
  v_gerekce text := btrim(coalesce(p_gerekce, ''));
  v_ad      text;
begin
  if not app.is_admin() then
    raise exception 'Topluluk silme kararını yalnızca yönetici verebilir.'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_talep
  from public.moderation_queue
  where id = p_talep_id
  for update;

  if not found or v_talep.target_type <> 'club_deletion' then
    raise exception 'Silme talebi bulunamadı.'
      using errcode = 'no_data_found';
  end if;

  if v_talep.status in ('approved', 'rejected', 'archived') then
    raise exception 'Bu talep zaten karara bağlanmış.'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  /* Ret gerekçesi zorunlu: plan "reddederse gerekçesini sahibine
     bildirir" diyor ve aşağıdaki bildirimin gövdesi tam olarak bu metin.
     Boş bırakılsaydı sahibine boş bir bildirim giderdi. */
  if not p_onay and v_gerekce = '' then
    raise exception 'Reddetme gerekçesi zorunlu — bu metin topluluk sahibine iletilecek.'
      using errcode = 'check_violation';
  end if;

  select name into v_ad from public.clubs where slug = v_talep.target_id;

  if p_onay then
    update public.clubs
       set deleted_at = now()
     where slug = v_talep.target_id
       and deleted_at is null;
  end if;

  update public.moderation_queue
     set status          = (case when p_onay then 'approved' else 'rejected' end)::app.moderation_status,
         resolution_note = nullif(v_gerekce, ''),
         resolved_by     = v_uid,
         resolved_at     = now()
   where id = p_talep_id;

  if v_talep.reported_by is not null then
    perform app.notify(
      v_talep.reported_by,
      v_uid,
      'moderation',
      case
        when p_onay then coalesce(v_ad, v_talep.target_id) || ' kaydı kapatıldı'
        else coalesce(v_ad, v_talep.target_id) || ' için silme talebiniz reddedildi'
      end,
      case
        when p_onay then 'Silme talebiniz onaylandı; topluluk dizinden kaldırıldı.'
        else v_gerekce
      end,
      case when p_onay then null else '/topluluk/' || v_talep.target_id end,
      'moderation',
      v_talep.id
    );
  end if;
end;
$$;

comment on function public.topluluk_silme_karari(uuid, boolean, text) is
  'Topluluk silme talebini karara bağlar. Onayda topluluk soft delete edilir; rette gerekçe zorunlu ve sahibine bildirilir.';

revoke all on function public.topluluk_silme_karari(uuid, boolean, text) from public;
grant execute on function public.topluluk_silme_karari(uuid, boolean, text) to authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 10 · GERİ BİLDİRİM — ŞİKÂYETÇİYE MESAJ
--
-- Otomatik bildirim yalnızca karar anında ve sabit bir cümleyle gidiyor.
-- Planın istediği "kullanıcıya geri bildirim gönder" bundan farklı: karar
-- öncesinde de ("hangi mesajı kastettiğinizi yazar mısınız"), karardan
-- sonra da ("kaldırdık, teşekkürler") moderatörün kendi cümlesiyle
-- yazabilmesi.
--
-- Doğrudan `notifications` insert'i açmak yerine RPC: bildirim gövdesini
-- istemcinin yazması, "moderasyon" türünde her istemciden bildirim
-- üretilebilmesi demek olurdu. Burada gönderen kayıtla birlikte
-- doğrulanıyor ve işlem denetime düşüyor.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.moderasyon_geri_bildirim(
  p_kayit_id uuid,
  p_mesaj text
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_kayit public.moderation_queue;
  v_mesaj text := btrim(coalesce(p_mesaj, ''));
begin
  select * into v_kayit from public.moderation_queue where id = p_kayit_id;

  if not found then
    raise exception 'Moderasyon kaydı bulunamadı.'
      using errcode = 'no_data_found';
  end if;

  /* Yetki okuma politikasıyla aynı: admin her kaydı, moderatör silme
     talebi dışındakileri. `security definer` RLS'i atladığı için burada
     açıkça tekrarlanıyor — atlanırsa moderatör göremediği bir talebin
     sahibine mesaj yazabilirdi. */
  if not (
    app.is_admin()
    or (app.has_role('moderator') and v_kayit.target_type <> 'club_deletion')
  ) then
    raise exception 'Bu kayıt için geri bildirim gönderemezsiniz.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_mesaj = '' then
    raise exception 'Geri bildirim metni boş olamaz.'
      using errcode = 'check_violation';
  end if;

  if v_kayit.reported_by is null then
    raise exception 'Bu kaydı açan bir kullanıcı yok; geri bildirim gönderilemez.'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  perform app.notify(
    v_kayit.reported_by,
    v_uid,
    'moderation',
    'Moderasyon ekibinden mesaj',
    v_mesaj,
    v_kayit.target_path,
    'moderation',
    v_kayit.id
  );

  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (
    v_uid,
    'moderation.geri_bildirim',
    v_kayit.target_type::text,
    v_kayit.target_id::text,
    jsonb_build_object('kuyruk_id', v_kayit.id, 'mesaj', v_mesaj)
  );
end;
$$;

comment on function public.moderasyon_geri_bildirim(uuid, text) is
  'Kuyruk kaydını açan kullanıcıya moderatörün kendi cümlesiyle bildirim gönderir. İşlem denetim kaydına düşer.';

revoke all on function public.moderasyon_geri_bildirim(uuid, text) from public;
grant execute on function public.moderasyon_geri_bildirim(uuid, text) to authenticated;

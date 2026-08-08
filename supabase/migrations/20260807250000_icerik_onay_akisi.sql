-- ═══════════════════════════════════════════════════════════════════════
-- İÇERİK ONAY AKIŞI VE TOPLULUK SAHİPLİĞİ   (Yenileme planı FAZ 4)
--
-- Plan görev 2: "gönder → incelemede → onay/ret → yayın".
-- Plan görev 4: "Kullanıcı kendi içeriğinin durumunu panelinden görsün."
-- Plan görev 6: "Topluluk sahipliği: manager_user_id üzerinden düzenleme."
--
-- ── ÖNCE ÖLÇÜLDÜ (§6.8) ───────────────────────────────────────────────
--
-- `clubs` gereken kolonları ZATEN taşıyor: `manager_user_id`,
-- `rejection_reason`, `submitted_by`, `reviewed_at/by`, `verified_at/by`.
-- Yeni kolon eklenmiyor; eksik olan tek şey RLS'ti — bugün kulübü
-- yalnızca admin güncelleyebiliyor, sahibi kendi kaydına dokunamıyor.
--
-- `content_entries` ise katkı akışını HİÇ taşımıyor: yazma tamamen
-- admin'e kapalı (`content_entries_write`), gönderen kim belli değil ve
-- ret gerekçesi tutulacak yer yok. Dört kolon buraya ekleniyor.
--
-- ── DURUM KÜMESİ ZATEN VAR ────────────────────────────────────────────
--
-- Akışın adları FAZ 3'te kurulan `app.content_status`ta hazır bekliyordu:
-- taslak → incelemede → onaylandi/reddedildi → yayinda. Bu göç yeni bir
-- durum icat etmiyor, var olan kümeye KİMİN hangi geçişi yapabileceğini
-- yazıyor.
--
-- ── İZİN FAZ 1'DEN GELİYOR ────────────────────────────────────────────
--
-- Kimin içerik gönderebileceği `app.izin_var('icerik_olustur')` ile
-- soruluyor. Rol listesi buraya kopyalanmıyor: FAZ 1'in mimarisinin
-- amacı tam da buydu — bir rolün içerik gönderebilmesi için
-- `role_permissions`a satır eklemek yetiyor, politika değişmiyor.
--
-- Geri alma: eklenen kolonlar ve politikalar düşürülür; `clubs_write` ve
-- `content_entries_write` bu dosyanın öncesindeki hâllerine döner.
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
-- 1 · İÇERİK KAYDINA KATKI ALANLARI
--
-- `author` zaten var ama SERBEST METİN — imzada görünen ad. Kimin
-- gönderdiğini o alandan çıkarmak mümkün değil: iki kullanıcı aynı adı
-- yazabilir ve ad değiştiğinde bağ kopar. Sahiplik bir yabancı anahtar
-- olmak zorunda.
-- ══════════════════════════════════════════════════════════════════════

alter table public.content_entries
  add column if not exists submitted_by uuid references auth.users (id) on delete set null,
  add column if not exists reviewed_by  uuid references auth.users (id) on delete set null,
  add column if not exists reviewed_at  timestamptz,
  add column if not exists rejection_reason text;

comment on column public.content_entries.submitted_by is
  'İçeriği gönderen kullanıcı. `author` serbest metin bir imza; sahiplik bu kolonda.';
comment on column public.content_entries.rejection_reason is
  'Ret gerekçesi — SAHİBİNE gösterilir. Reddedip sebebini söylememek, katkıyı sessizce çöpe atmaktır.';

create index if not exists content_entries_submitted_by_idx
  on public.content_entries (submitted_by, status)
  where submitted_by is not null;

-- ══════════════════════════════════════════════════════════════════════
-- 2 · GEÇİŞ KURALI — KİM HANGİ DURUMA TAŞIYABİLİR
--
-- ── NEDEN TETİKLEYİCİ, NEDEN POLİTİKA DEĞİL ───────────────────────────
--
-- RLS politikası satırın YENİ hâline bakabiliyor ama "hangi durumdan
-- hangisine geçildiği" sorusunu soramıyor: `with check` ifadesinde
-- `old` yok. Oysa kural tam olarak geçiş hakkında — sahibinin taslağını
-- incelemeye göndermesi serbest, doğrudan yayına alması değil.
--
-- ── SAHİBİ KENDİ İÇERİĞİNİ YAYIMLAYAMAZ ───────────────────────────────
--
-- Onay akışının tek anlamı bu. Sahibi `taslak` ile `incelemede` arasında
-- gidip gelebiliyor ve reddedilen içeriğini düzeltip yeniden
-- gönderebiliyor; `onaylandi`, `yayinda`, `reddedildi` yalnızca
-- yönetimde.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.icerik_gecis_kurali()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  yonetim boolean := app.is_admin() or app.has_role('content_editor');
begin
  /* Servis rolü ve göçler: auth.uid() yok, kural uygulanmıyor. Aynı
     gerekçe `profiles_guard_admin_fields` içinde yazılı — kural KULLANICI
     isteklerini denetliyor. */
  if auth.uid() is null or yonetim then
    return new;
  end if;

  if new.status is distinct from old.status then
    /* Sahibinin yapabileceği tek geçiş: incelemeye göndermek ya da
       geri çekmek. */
    if not (
      (old.status in ('taslak', 'reddedildi') and new.status = 'incelemede')
      or (old.status = 'incelemede' and new.status = 'taslak')
    ) then
      raise exception
        'Bu durum değişikliği yalnızca yönetimde: % → %', old.status, new.status
        using errcode = 'insufficient_privilege',
              hint = 'İçeriğinizi incelemeye gönderebilirsiniz; yayına almayı yönetim yapar.';
    end if;
  end if;

  /* İnceleme alanlarını sahibi yazamaz — kendi içeriğini onaylanmış
     gösterebilirdi. */
  if new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'İnceleme alanları yalnızca yönetim tarafından yazılır.'
      using errcode = 'insufficient_privilege';
  end if;

  /* Sahiplik devredilemez. */
  if new.submitted_by is distinct from old.submitted_by then
    raise exception 'Gönderen değiştirilemez.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

comment on function app.icerik_gecis_kurali() is
  'content_entries durum geçişlerini sınırlar: sahibi yalnızca taslak↔incelemede yapabilir, yayına almak yönetimde.';

drop trigger if exists content_entries_gecis on public.content_entries;
create trigger content_entries_gecis
  before update on public.content_entries
  for each row execute function app.icerik_gecis_kurali();

/*
 * İNCELEME İZİ YÖNETİMDEN OTOMATİK.
 *
 * `reviewed_by`yi istemcinin göndermesine bırakmak, onu istemcinin
 * DOLDURDUĞU bir alan yapardı. Karar anı tetikleyicide damgalanıyor.
 */
create or replace function app.icerik_inceleme_izi()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('onaylandi', 'yayinda', 'reddedildi', 'yayindan_kaldirildi') then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();

    /* Onaylanan içerikte eski ret gerekçesi durmamalı: kullanıcı
       yayımlanmış içeriğinin altında "şu yüzden reddedildi" görürdü. */
    if new.status <> 'reddedildi' then
      new.rejection_reason := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists content_entries_inceleme on public.content_entries;
create trigger content_entries_inceleme
  before update on public.content_entries
  for each row execute function app.icerik_inceleme_izi();

-- ══════════════════════════════════════════════════════════════════════
-- 3 · İÇERİK POLİTİKALARI
--
-- Public okuma FAZ 3'ten geliyor ve değişmiyor: yalnızca `yayinda`.
-- Eklenen tek şey SAHİBİNİN kendi kaydını görebilmesi — plan görev 4
-- ("kullanıcı kendi içeriğinin durumunu panelinden görsün") ve kabul
-- kriteri ("içerik sahibi kendi taslağını ve ret gerekçesini görüyor").
--
-- Durum etiketi public'te GÖRÜNMÜYOR: public sorgular zaten yalnızca
-- yayındakileri döndürüyor, dolayısıyla gösterilecek bir durum yok
-- (plan görev 5).
-- ══════════════════════════════════════════════════════════════════════

drop policy if exists content_entries_read on public.content_entries;
create policy content_entries_read on public.content_entries
  for select using (
    app.icerik_gorunur(status::text, deleted_at)
    or submitted_by = (select auth.uid())
    or app.is_admin()
    or app.has_role('content_editor')
  );

/*
 * KATKI GÖNDERME. İzin FAZ 1'den: `icerik_olustur`. Yeni kayıt her zaman
 * `taslak` ya da `incelemede` başlıyor — doğrudan `yayinda` satır
 * eklemek onay akışını komple atlamak olurdu.
 */
drop policy if exists content_entries_submit on public.content_entries;
create policy content_entries_submit on public.content_entries
  for insert to authenticated
  with check (
    app.is_admin()
    or app.has_role('content_editor')
    or (
      submitted_by = (select auth.uid())
      and status in ('taslak', 'incelemede')
      and app.izin_var('icerik_olustur')
      and app.is_account_active()
    )
  );

/*
 * SAHİBİ KENDİ TASLAĞINI DÜZENLEYEBİLİR — ama yayımlanmış içeriğini
 * değil. Yayına giren metni sahibinin sessizce değiştirebilmesi, onayı
 * anlamsız kılardı: yönetim bir şeyi onaylar, sahibi başka bir şeye
 * çevirirdi. Değişiklik gerekiyorsa yönetime geri gidiyor.
 *
 * Hangi durumların düzenlenebilir olduğu burada; hangi geçişin
 * yapılabileceği `app.icerik_gecis_kurali()` tetikleyicisinde.
 */
drop policy if exists content_entries_update_own on public.content_entries;
create policy content_entries_update_own on public.content_entries
  for update to authenticated
  using (
    submitted_by = (select auth.uid())
    and status in ('taslak', 'incelemede', 'reddedildi')
  )
  with check (
    submitted_by = (select auth.uid())
    and status in ('taslak', 'incelemede', 'reddedildi')
  );

-- ══════════════════════════════════════════════════════════════════════
-- 4 · TOPLULUK SAHİPLİĞİ (plan görev 6)
--
-- Plan: "Bir topluluğu ekleyen kullanıcı onu tamamen düzenleyebilmeli;
-- admin de düzenleyebilir. `manager_user_id` alanı zaten var — sahiplik
-- bunun üzerine kurulur, yeni bir sahiplik kolonu eklemeyin."
--
-- ── "TAMAMEN DÜZENLEYEBİLMELİ" HER ALAN DEMEK DEĞİL ───────────────────
--
-- Sahibi içerik alanlarını (ad, özet, iletişim, fotoğraf…) düzenliyor.
-- Ama `listed`, `status`, `verified_*` ve `manager_user_id` düzenlenemez:
-- ilki dizinde görünmeyi, ikincisi onayı, üçüncüsü "doğrulanmış topluluk"
-- rozetini, dördüncüsü sahipliğin kendisini kontrol ediyor. Sahibi bu
-- dördünü yazabilseydi kendi kulübünü doğrulanmış ve yayında ilan
-- ederdi — onay akışının anlamı kalmazdı.
--
-- Kural tetikleyicide, çünkü RLS `with check` hangi ALANIN değiştiğini
-- soramıyor.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.kulup_yonetim_alanlari()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if auth.uid() is null or app.is_admin() or app.has_role('moderator') then
    return new;
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
$$;

comment on function app.kulup_yonetim_alanlari() is
  'Kulüp sahibinin onay/görünürlük alanlarını değiştirmesini engeller. İçerik alanları serbest.';

drop trigger if exists clubs_yonetim_alanlari on public.clubs;
create trigger clubs_yonetim_alanlari
  before update on public.clubs
  for each row execute function app.kulup_yonetim_alanlari();

/*
 * SAHİBİ DÜZENLEYEBİLİR. `manager_user_id` atanmış kulüplerde yönetici,
 * atanmamışsa ekleyen kişi (`submitted_by`) — bir kulübü ekleyip sonra
 * hiç düzenleyememek, planın şikâyet ettiği durumun ta kendisi.
 *
 * Negatif kabul kriteri ("başkasınınkini düzenleyemiyor") bu politikanın
 * doğrudan sonucu: iki koşul da kimliğe bağlı.
 */
drop policy if exists clubs_manager_update on public.clubs;
create policy clubs_manager_update on public.clubs
  for update to authenticated
  using (
    manager_user_id = (select auth.uid())
    or (manager_user_id is null and submitted_by = (select auth.uid()))
  )
  with check (
    manager_user_id = (select auth.uid())
    or (manager_user_id is null and submitted_by = (select auth.uid()))
  );

/*
 * SAHİBİ KENDİ KULÜBÜNÜ GÖREBİLMELİ — dizinde listelenmemiş olsa bile.
 * `clubs_read` bugün `submitted_by`ye bakıyor ama `manager_user_id`ye
 * bakmıyor: yönetimi devredilmiş bir kulübün yöneticisi, kulüp henüz
 * yayında değilken kendi kaydını göremezdi.
 */
drop policy if exists clubs_read on public.clubs;
create policy clubs_read on public.clubs
  for select using (
    (listed and app.icerik_gorunur(status::text, deleted_at))
    or app.is_admin()
    or app.has_role('moderator')
    or submitted_by = (select auth.uid())
    or manager_user_id = (select auth.uid())
  );

-- 0031_kvkk_ve_kullanim_kosullari_onayi.sql
-- Kullanım koşulları ve KVKK aydınlatma metni onayı KAYIT ALTINA ALINIYOR.
--
-- ══════════════════════════════════════════════════════════════════════
-- SORUN: ONAY ALINIYORDU AMA SAKLANMIYORDU
--
-- Kayıt formunda tek bir onay kutusu vardı ve iki metne birden atıf
-- yapıyordu. Kutu işaretlenmeden form gönderilemiyordu — yani onay
-- gerçekten alınıyordu — ama HİÇBİR YERE YAZILMIYORDU.
--
-- Bunun pratik sonucu şu: "bu kullanıcı koşulları kabul etti mi, ne
-- zaman, hangi sürümünü?" sorusunun cevabı yok. KVKK açısından
-- ispat yükü veri sorumlusunda; ispat edilemeyen bir onay, alınmamış
-- onayla aynı yerde durur.
--
-- Google ile giren kullanıcı ise onay ekranını HİÇ görmüyordu: OAuth
-- akışı doğrudan sağlayıcıya gidiyor ve geri döndüğünde hesap açılmış
-- oluyor.
--
-- ══════════════════════════════════════════════════════════════════════
-- İKİ AYRI ONAY, TEK KUTU DEĞİL
--
-- Kullanım koşulları bir SÖZLEŞME, KVKK aydınlatma metni bir
-- BİLGİLENDİRME; hukuken ayrı şeyler ve ayrı ayrı onaylanmaları
-- gerekiyor. Tek kutuya sıkıştırmak, kullanıcının hangisine onay
-- verdiğini ayırt edilemez hâle getiriyordu.
--
-- SÜRÜM DE SAKLANIYOR: metin bir yıl sonra değişirse, kimin hangi
-- metni onayladığını bilmek gerekir. Sürüm olmadan "onayladı" bilgisi
-- zamanla anlamını yitiriyor.

alter table public.profiles
  add column if not exists terms_accepted_at   timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists consent_version     text;

comment on column public.profiles.terms_accepted_at is
  'Kullanım koşullarının onaylandığı an. NULL ise onay hiç alınmamış — arayüz girişten sonra onay ekranı gösterir (0031).';
comment on column public.profiles.privacy_accepted_at is
  'KVKK aydınlatma metninin onaylandığı an. Koşullardan AYRI tutuluyor: biri sözleşme, diğeri bilgilendirme.';
comment on column public.profiles.consent_version is
  'Onaylanan metin sürümü. Metin değiştiğinde kimin hangi sürümü onayladığı bilinmeli.';

-- ══════════════════════════════════════════════════════════════════════
-- E-POSTA KAYDI: ONAY KAYIT ANINDA YAZILIYOR
--
-- İstemci `signUp` çağrısında onayı `raw_user_meta_data` içine koyuyor;
-- tetikleyici profili açarken oradan okuyor. Böylece onay ile hesabın
-- açılışı AYNI İŞLEMDE oluyor — arada onaysız bir hesap penceresi
-- kalmıyor.
--
-- Google ile girişte bu alanlar boş gelir (sağlayıcı böyle bir şey
-- göndermez); o kullanıcılar girişten sonra onay ekranını görür ve
-- onay kendi profil satırlarına yazılır (`profiles_update_own`).
--
-- ZAMAN DAMGASI SUNUCUDAN: istemcinin gönderdiği bir tarih kabul
-- edilmiyor, `now()` kullanılıyor. Onay anını istemciye yazdırmak,
-- ispat değeri olan bir alanı istemcinin saatine ve iyi niyetine
-- bağlamak olurdu.
-- ══════════════════════════════════════════════════════════════════════
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  onayli boolean := coalesce(
    (new.raw_user_meta_data ->> 'consent_accepted')::boolean, false
  );
begin
  insert into public.profiles (
    id, username, display_name,
    terms_accepted_at, privacy_accepted_at, consent_version
  )
  values (
    new.id,
    -- Geçici benzersiz kullanıcı adı; kullanıcı sonradan değiştirir.
    'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'given_name', '')
    ),
    case when onayli then now() end,
    case when onayli then now() end,
    case when onayli then nullif(new.raw_user_meta_data ->> 'consent_version', '') end
  );
  return new;
end;
$$;

comment on function app.handle_new_user is
  'Yeni kullanıcı için profil satırı. Adı önce kendi formumuzdan, yoksa OAuth sağlayıcısının OIDC alanlarından okur (§4.1). Kayıt formundan gelen onay varsa zaman damgasını SUNUCU saatiyle yazar (0031).';

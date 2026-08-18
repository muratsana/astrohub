-- ═══════════════════════════════════════════════════════════════════════
-- İL ZORUNLU
--
-- Sitenin yarısı konuma bağlı: bu gece gökyüzünde, karanlık pencere,
-- yakındaki gözlem noktaları, şehir sayfaları, etkinlik yakınlığı. İli
-- olmayan hesap bu ekranların hepsinde boşluk görüyor ve çoğu bunun
-- sebebini kendi profilinde aramıyor.
--
-- `ProfileSetupGate` yeni hesaplarda ili zaten istiyor. Ama o bir
-- ARAYÜZ kapısı: profil satırı PostgREST üzerinden doğrudan da
-- güncellenebiliyor ve orada ili boşaltan bir istek hiçbir engele
-- takılmıyordu. Kapı yalnızca ön kapıydı.
--
-- ══════════════════════════════════════════════════════════════════════
-- NEDEN NOT NULL DEĞİL
--
-- Üç sebeple:
--
--   · `handle_new_user()` profil satırını kayıt anında açıyor ve o anda
--     il henüz sorulmadı. NOT NULL kaydın kendisini kırardı.
--   · Canlıda ili olmayan beş hesap var. NOT NULL onların her
--     güncellemesini reddeder ve kullanıcı sebebini anlamadan
--     "kaydedilemedi" görürdü.
--   · Asıl istenen şey "il hep dolu olsun" değil, "GİRİLMİŞ bir il
--     silinmesin". Yeni hesaplarda kapı zaten dolduruyor.
--
-- Tetikleyici tam olarak bunu yapıyor: bir kez girilmiş il boşaltılamaz.
-- Yeni hesap için engel yok, mevcut beş hesap kilitlenmiyor, ama
-- doldurduktan sonra geri dönüş de yok.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function app.profiles_il_kilidi()
returns trigger
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
begin
  /* Servis rolü hariç: yönetim işleri ve veri düzeltmeleri bu kapıdan
     geçmek zorunda değil. */
  if current_setting('role', true) = 'service_role'
     or auth.role() = 'service_role' then
    return new;
  end if;

  if coalesce(btrim(old.city), '') <> ''
     and coalesce(btrim(new.city), '') = '' then
    raise exception
      'Şehir zorunlu: sitenin konuma bağlı bölümleri (bu gece gökyüzünde, karanlık pencere, yakındaki noktalar) şehir olmadan çalışmıyor.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_il_kilidi on public.profiles;
create trigger profiles_il_kilidi
  before update of city on public.profiles
  for each row execute function app.profiles_il_kilidi();

-- ═══════════════════════════════════════════════════════════════════════
-- İLİ OLMAYANLARA BİLDİRİM
--
-- Kapı yalnızca oturum açtığında karşılarına çıkıyor; aylardır
-- girmeyen bir hesap onu hiç görmüyor. Bildirim, kullanıcının zaten
-- baktığı yerde duruyor ve nereye gideceğini söylüyor.
--
-- MÜKERRER GÖNDERİLMİYOR: `not exists` kontrolü dosyayı yeniden
-- çalıştırılabilir yapıyor. Aynı uyarıyı ikinci kez göndermek, uyarıyı
-- gürültüye çevirmenin en hızlı yolu.
-- ═══════════════════════════════════════════════════════════════════════

-- `category` YAZILMIYOR: üretilmiş bir kolon ve `kind`tan türüyor.
-- Elle değer vermek "cannot insert a non-DEFAULT value" ile reddediliyor.
insert into public.notifications (user_id, kind, title, body, url)
select
  p.id,
  'system'::app.notification_kind,
  'Şehrini seç',
  'Profilinde şehir yazmıyor. Bu gece gökyüzünde, karanlık pencere ve yakındaki gözlem noktaları şehrine göre hesaplanıyor; şehir boşken bu bölümler sana boş görünüyor. Hesabım sayfasından bir kez seçmen yeterli.',
  '/hesap?sekme=profilim'
from public.profiles p
where coalesce(btrim(p.city), '') = ''
  and not exists (
    select 1 from public.notifications n
    where n.user_id = p.id and n.title = 'Şehrini seç'
  );

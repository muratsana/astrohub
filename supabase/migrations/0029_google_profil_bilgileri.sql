-- 0029_google_profil_bilgileri.sql
-- Yeni kullanıcı tetikleyicisi OAuth sağlayıcılarının verdiği adı da okusun.
--
-- SORUN
--
-- `app.handle_new_user()` görünen adı yalnızca tek bir alandan okuyordu:
--
--     new.raw_user_meta_data ->> 'display_name'
--
-- Bu alanı bizim kayıt formumuz yazıyor. Google (ve genel olarak OAuth
-- sağlayıcıları) böyle bir alan GÖNDERMİYOR; kimlik bilgisini `name`,
-- `full_name`, `given_name` gibi standart OpenID Connect alanlarında
-- veriyor.
--
-- Sonuç: Google ile giren her kullanıcının profili `display_name = null`
-- ile açılıyordu. Adını Google zaten vermişken profilde
-- `user_a1b2c3d4e5f6` görünüyordu ve kişi daha ilk ekranda kendi adını
-- elle yazmak zorunda kalıyordu. Veri elimizdeydi, kullanılmıyordu.
--
-- SIRA ÖNEMLİ: önce kendi formumuzun alanı (`display_name`), sonra OIDC
-- alanları. Kullanıcı kayıt formunda bir ad yazdıysa sağlayıcının verdiği
-- ad onu EZMEMELİ — kendi yazdığı her zaman daha isabetli.
--
-- `nullif(…, '')` GEREKLİ: sağlayıcılar boş dize gönderebiliyor ve boş bir
-- ad, adın olmamasından farksız — ama `coalesce` boş dizeyi geçerli bir
-- değer sayıp orada dururdu.
--
-- ══════════════════════════════════════════════════════════════════════
-- AVATAR BİLEREK ALINMIYOR
--
-- Google `avatar_url` de veriyor ve ilk hâlde bu değer `avatar_path`
-- kolonuna yazılıyordu. Geri alındı, çünkü kolonun anlamını bozuyor:
-- adı `_path` ve depolama adaptörü onu `avatars` bucket'ı içindeki bir
-- YOL olarak kullanıyor. Oraya tam bir URL yazmak, ilk render eden kodun
-- `.../object/public/avatars/https://lh3.googleusercontent.com/…` gibi
-- bozuk bir adres üretmesi demek — hata, yazıldığı yerde değil aylar
-- sonra başka bir dosyada çıkardı.
--
-- Bugün avatarı render eden bir yer de yok; olmayan bir tüketici için
-- kolonun tipini belirsizleştirmek ve CSP'ye yeni bir dış kaynak eklemek
-- karşılıksız olurdu. Google avatarı istenirse doğru çözüm onu bir kez
-- indirip kendi bucket'ımıza yazmak; o da ayrı bir iş (telif ve kuyruk
-- kararı gerektiriyor).
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    -- Geçici benzersiz kullanıcı adı; kullanıcı sonradan değiştirir.
    'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'given_name', '')
    )
  );
  return new;
end;
$$;

comment on function app.handle_new_user is
  'Yeni kullanıcı için profil satırı. Adı önce kendi formumuzdan, yoksa OAuth sağlayıcısının OIDC alanlarından okur (§4.1).';

-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 10 — PANELİN ANA SAYFA DÜZENİNİ GERÇEKTEN YÖNETEBİLMESİ
--
-- 0058 tabloları ve yazma yollarını kurdu. Paneli yazarken üç boşluk
-- çıktı; üçü de "özellik var ama ulaşılamıyor" cinsinden.
--
-- ══════════════════════════════════════════════════════════════════════════
-- 1) ZAMANLANMIŞ MODÜL PANELDEN KAYBOLUYORDU
--
-- `home_layout` yayın penceresini UYGULUYOR — ziyaretçi için doğru,
-- yönetici için tuzak. Panel de aynı fonksiyonu okuduğu için, bir modüle
-- ileri tarih verildiği anda modül panelden de siliniyordu: düzenlemek
-- için görmek gerekir, görmek için yayında olması gerekirdi. Yöneticinin
-- kendi kurduğu zamanlamayı geri alması imkânsızdı.
--
-- `home_modules_admin()` pencereyi UYGULAMIYOR; hepsini döndürüyor ve
-- pencerenin ne olduğunu ayrıca söylüyor.
--
-- NEDEN TABLOYU DOĞRUDAN OKUMUYORUZ: okuyabilirdik (RLS `select` herkese
-- açık), ama o zaman taslak birleştirmesini istemcide ikinci kez yazmak
-- gerekirdi. İki kopya zamanla ayrışır ve hangisinin doğru olduğu ancak
-- ana sayfa yanlış göründüğünde anlaşılır. Birleştirme tek yerde kalıyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- 2) TASLAK YAYIMLANANA KADAR DOĞRULANMIYORDU
--
-- `draft` bir jsonb; tablo CHECK'leri ona bakmıyor. `item_limit: 99`
-- taslağa sorunsuz yazılıyor, hata YAYIMLARKEN çıkıyordu. Yayımlama
-- atomik olduğu için de tek bozuk modül BÜTÜN yayımlamayı düşürüyor ve
-- PostgreSQL'in "violates check constraint home_modules_limit_check"
-- hatası hangi modülün suçlu olduğunu söylemiyordu.
--
-- Doğrulama taslağı KAYDEDERKEN yapılıyor: hata, hatayı yapan alanın
-- yanında ve modül adıyla birlikte çıkıyor.
--
-- Aynı yerde anahtar beyaz listesi var. 0058'in `save_home_draft`i
-- gönderilen jsonb'yi olduğu gibi birleştiriyordu; paneldeki bir yazım
-- hatası (`enable` yerine `enabled`) taslağa ölü bir anahtar bırakır,
-- `has_draft` true görünür, yayımlanacak bir şey bulunmazdı.
--
-- ══════════════════════════════════════════════════════════════════════════
-- 3) YAYIN PENCERESİ HİÇBİR YOLDAN KURULAMIYORDU
--
-- `publish_from`/`publish_to` sütunları 0058'de var ama `publish_home_draft`
-- onları taslaktan uygulamıyordu. Sütunlar duruyor, onları dolduracak bir
-- yol yok — yani §13.3'ün zamanlanmış yayın maddesi şemada var, üründe
-- yoktu.
--
-- `coalesce` YETMİYOR, `case ... ?` gerekiyor: pencereyi TEMİZLEMEK
-- (null yapmak) da geçerli bir işlem ve `coalesce` onu "değişiklik yok"
-- diye okurdu. Anahtarın taslakta BULUNMASI ile değerinin null OLMASI
-- ayrı şeyler.
-- ══════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- PANELİN OKUDUĞU DÜZEN
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.home_modules_admin()
returns table (
  key text,
  /* Etkin değerler: taslak varsa taslaktan, yoksa canlıdan. Panel bunları
     düzenliyor; "kaydet" taslağa yazıyor. */
  title text,
  subtitle text,
  enabled boolean,
  "position" integer,
  item_limit integer,
  layout text,
  hide_when_empty boolean,
  show_mobile boolean,
  show_desktop boolean,
  publish_from timestamptz,
  publish_to timestamptz,
  /* Ham taslak: panel hangi ALANIN kirli olduğunu bundan işaretliyor.
     Anahtar varlığına bakmak birleştirme mantığı değil, o yüzden
     istemcide olması sorun değil. */
  draft jsonb,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, app, pg_temp
as $$
begin
  /* HATA VERİYOR, BOŞ DÖNMÜYOR. `home_layout` yetkisize sessizce canlı
     düzeni döndürür çünkü onu her ziyaretçi çağırıyor. Bu fonksiyonu
     yalnızca panel çağırıyor ve orada boş liste "modül yok" diye okunur —
     yanlış teşhise yollayan bir sessizlik. */
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  return query
  select
    m.key,
    case when m.draft ? 'title'    then m.draft ->> 'title'    else m.title end,
    case when m.draft ? 'subtitle' then m.draft ->> 'subtitle' else m.subtitle end,
    case when m.draft ? 'enabled'  then (m.draft ->> 'enabled')::boolean else m.enabled end,
    case when m.draft ? 'position' then (m.draft ->> 'position')::integer else m.position end,
    case when m.draft ? 'item_limit' then (m.draft ->> 'item_limit')::integer else m.item_limit end,
    case when m.draft ? 'layout'   then m.draft ->> 'layout'   else m.layout end,
    case when m.draft ? 'hide_when_empty' then (m.draft ->> 'hide_when_empty')::boolean else m.hide_when_empty end,
    case when m.draft ? 'show_mobile'  then (m.draft ->> 'show_mobile')::boolean  else m.show_mobile end,
    case when m.draft ? 'show_desktop' then (m.draft ->> 'show_desktop')::boolean else m.show_desktop end,
    case when m.draft ? 'publish_from' then (m.draft ->> 'publish_from')::timestamptz else m.publish_from end,
    case when m.draft ? 'publish_to'   then (m.draft ->> 'publish_to')::timestamptz   else m.publish_to end,
    m.draft,
    m.updated_at
  from public.home_modules m
  /* Pencere UYGULANMIYOR — bu fonksiyonun bütün varlık sebebi bu. */
  order by 5;
end;
$$;

comment on function public.home_modules_admin() is
  'Panelin ana sayfa düzeni (§13.2). home_layout''tan farkı: yayın penceresini uygulamaz, taslağı ham hâliyle de verir.';

-- ══════════════════════════════════════════════════════════════════════════
-- TASLAK KAYDI — beyaz liste + değer doğrulaması
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.save_home_draft(
  modul text,
  degisiklik jsonb
)
returns void
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  izinli   constant text[] := array[
    'title', 'subtitle', 'enabled', 'position', 'item_limit', 'layout',
    'hide_when_empty', 'show_mobile', 'show_desktop',
    'publish_from', 'publish_to'
  ];
  bilinmeyen text;
  yeni_taslak jsonb;
  baslangic timestamptz;
  bitis     timestamptz;
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  if degisiklik is null or jsonb_typeof(degisiklik) <> 'object' then
    raise exception 'Değişiklik bir JSON nesnesi olmalı' using errcode = '22023';
  end if;

  select string_agg(k, ', ') into bilinmeyen
  from jsonb_object_keys(degisiklik) k
  where k <> all (izinli);

  if bilinmeyen is not null then
    raise exception 'Bu alanlar ana sayfa modülünde yok: %', bilinmeyen
      using errcode = '22023';
  end if;

  /* DEĞER DOĞRULAMASI TASLAKTA. Tablo CHECK'leri jsonb'ye bakmaz; bu
     kontroller olmasa hata yayımlama anında ve modül adı olmadan
     çıkardı. */
  if degisiklik ? 'layout' and (degisiklik ->> 'layout') not in ('grid', 'list') then
    raise exception 'Düzen yalnızca "grid" veya "list" olabilir (%): %',
      modul, degisiklik ->> 'layout' using errcode = '22023';
  end if;

  if degisiklik ? 'item_limit'
     and coalesce((degisiklik ->> 'item_limit')::integer, 0) not between 1 and 24 then
    raise exception 'Öğe sayısı 1 ile 24 arasında olmalı (%): %',
      modul, degisiklik ->> 'item_limit' using errcode = '22023';
  end if;

  if degisiklik ? 'position'
     and coalesce((degisiklik ->> 'position')::integer, 0) < 1 then
    raise exception 'Sıra en az 1 olmalı (%): %',
      modul, degisiklik ->> 'position' using errcode = '22023';
  end if;

  update public.home_modules
     set draft = coalesce(draft, '{}'::jsonb) || degisiklik,
         updated_at = now(), updated_by = auth.uid()
   where key = modul
  returning draft into yeni_taslak;

  if not found then
    raise exception 'Bilinmeyen modül: %', modul using errcode = '22023';
  end if;

  /* PENCERE BİRLEŞTİRİLMİŞ HÂLİYLE KONTROL EDİLİYOR. Başlangıç taslakta,
     bitiş sütunda olabilir; yalnızca gönderilene bakmak ters pencereyi
     kaçırırdı. */
  select
    case when yeni_taslak ? 'publish_from' then (yeni_taslak ->> 'publish_from')::timestamptz else m.publish_from end,
    case when yeni_taslak ? 'publish_to'   then (yeni_taslak ->> 'publish_to')::timestamptz   else m.publish_to end
    into baslangic, bitis
  from public.home_modules m where m.key = modul;

  if baslangic is not null and bitis is not null and bitis <= baslangic then
    raise exception 'Yayın bitişi başlangıçtan sonra olmalı (%)', modul
      using errcode = '22023';
  end if;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- YAYIMLAMA — pencere alanları da uygulanıyor
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.publish_home_draft(gerekce text default null)
returns integer
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  sayi integer;
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  perform set_config('astrohub.reason', coalesce(gerekce, 'Ana sayfa taslağı yayımlandı'), true);

  /* Sıra takası için: iki modül sıra değiştirirken ara adımda ikisi de
     aynı sırada olabilir. Kısıt işlem sonunda bakıyor. */
  set constraints all deferred;

  update public.home_modules m
     set title           = case when m.draft ? 'title' then m.draft ->> 'title' else m.title end,
         subtitle        = case when m.draft ? 'subtitle' then m.draft ->> 'subtitle' else m.subtitle end,
         enabled         = coalesce((m.draft ->> 'enabled')::boolean, m.enabled),
         position        = coalesce((m.draft ->> 'position')::integer, m.position),
         item_limit      = coalesce((m.draft ->> 'item_limit')::integer, m.item_limit),
         layout          = coalesce(m.draft ->> 'layout', m.layout),
         hide_when_empty = coalesce((m.draft ->> 'hide_when_empty')::boolean, m.hide_when_empty),
         show_mobile     = coalesce((m.draft ->> 'show_mobile')::boolean, m.show_mobile),
         show_desktop    = coalesce((m.draft ->> 'show_desktop')::boolean, m.show_desktop),
         /* `coalesce` DEĞİL: pencereyi temizlemek de bir işlem ve
            `coalesce` onu görmezden gelirdi. Aynı gerekçe `title` ve
            `subtitle` için de geçerli — başlığı boşaltmak istenebilir. */
         publish_from    = case when m.draft ? 'publish_from' then (m.draft ->> 'publish_from')::timestamptz else m.publish_from end,
         publish_to      = case when m.draft ? 'publish_to'   then (m.draft ->> 'publish_to')::timestamptz   else m.publish_to end,
         draft = null,
         updated_at = now(), updated_by = auth.uid()
   where m.draft is not null;

  get diagnostics sayi = row_count;
  return sayi;
end;
$$;

revoke all on function public.home_modules_admin() from public, anon;
grant execute on function public.home_modules_admin() to authenticated;

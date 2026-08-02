-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 4 — KAYDEDİLMİŞ GÖRÜNÜMLER (§7 "Kaydedilmiş görünümler", "Kullanıcı
-- varsayılan görünümü", "Admin paylaşılan görünümü")
--
-- Faz 4'ün üç maddesi tek bir tabloya bakıyor ve bugüne kadar açıkta
-- duruyordu ("Tablo gerekiyor — Faz 10"). Tablo altyapısı Faz 10'da
-- geldi; bu göç üçünü birden kapatıyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- SORGU JSON DEĞİL, ADRES PARÇASI OLARAK SAKLANIYOR
--
-- İlk düşünce `{"q": "...", "facets": {...}, "sort": "..."}` gibi bir
-- jsonb'ydi. YAPILMADI: explorer'ın TEK KAYNAĞI zaten adres çubuğu
-- (`parseQuery`/`toParams`). İkinci bir gösterim, iki tarafın
-- ayrışabileceği bir yer açardı — bir facet eklendiğinde jsonb şeması
-- da güncellenmeli, unutulursa kaydedilmiş görünüm sessizce eksik
-- uygulanırdı.
--
-- Adres parçası saklamanın ikinci faydası: `parseQuery` bilinmeyen
-- parametreyi ZATEN sessizce düşürüyor. Yani bir facet kaldırılırsa
-- eski kayıt patlamıyor, o kısmı görmezden geliniyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- `is_shared` KULLANICININ YAZABİLECEĞİ BİR ALAN DEĞİL
--
-- "Admin paylaşılan görünümü" maddesi, yöneticinin bir görünümü herkese
-- açabilmesi demek. Satırın SAHİBİ kullanıcı ama bu bayrağı kullanıcı
-- çeviremiyor — çevirebilseydi herkes kendi görünümünü siteye
-- yayımlayabilirdi ve "paylaşılan görünüm" editoryal bir seçim olmaktan
-- çıkardı.
--
-- RLS tek başına yetmiyor: politika SATIRA izin verir, SÜTUNA değil.
-- Kural bu yüzden bir tetikleyicide (`saved_views_before_write`).
--
-- ══════════════════════════════════════════════════════════════════════════
-- VARSAYILAN TEKİL — VE BU SEFER TEKİLLİK ZORLANABİLİYOR
--
-- `nav_links`/`hero_slides`ta sıra benzersizliği ZORLANMAMIŞTI: panel
-- iki satırı iki ayrı transaction'da takas ediyor ve birinci yazma
-- reddediliyordu. Burada durum farklı — varsayılan değiştirmek bir
-- TAKAS değil, "eskisini bırak, yenisini al" ve `app.set_default_view`
-- ikisini TEK transaction'da yapıyor. Kısmi tekil indeks o yüzden
-- güvenli ve iki varsayılanın aynı anda var olmasını engelliyor.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.saved_views (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  /* Hangi liste sayfası: `galeri`, `ilanlar`, `etkinlikler`… Kodda
     karşılığı olan bir anahtar; serbest metin değil ama veritabanı
     tarafında bir liste tutulmuyor — modül eklemek göç gerektirmesin. */
  module      text not null,
  name        text not null,

  /* Adres çubuğu parçası: `ara=m31&tur=galaksi&sirala=yeni`. Baştaki
     `?` YOK — kayıt bir adres değil, bir sorgu durumu. */
  query       text not null default '',

  /* Kullanıcının BU MODÜLDEKİ varsayılan görünümü mü. */
  is_default  boolean not null default false,
  /* Yönetici herkese açtı mı. Kullanıcı yazamaz (başlığa bakınız). */
  is_shared   boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint saved_views_module_format check (module ~ '^[a-z0-9-]{2,40}$'),
  constraint saved_views_name_len check (char_length(name) between 1 and 60),
  /* Adres parçası uzunluğu sınırlı: kaydedilen şey bir sorgu, bir
     veri dökümü değil. Sınırsız bırakmak, tabloyu istemcinin
     yazabildiği serbest bir metin deposuna çevirirdi. */
  constraint saved_views_query_len check (char_length(query) <= 2000),
  /* Adres parçasında satır sonu ve boşluk olmaz. */
  constraint saved_views_query_format check (query !~ '[[:space:]]')
);

comment on table public.saved_views is
  'Kaydedilmiş liste görünümleri (Faz 4). `query` adres çubuğu parçasıdır; `is_shared` yalnızca yönetici tarafından çevrilebilir.';

create index if not exists saved_views_user_idx
  on public.saved_views (user_id, module, name);

/* Paylaşılan görünümler her kullanıcıya gösteriliyor; ayrı indeks. */
create index if not exists saved_views_shared_idx
  on public.saved_views (module) where is_shared;

/* VARSAYILAN TEKİL — kullanıcı ve modül başına en fazla bir tane. */
create unique index if not exists saved_views_default_uq
  on public.saved_views (user_id, module) where is_default;

alter table public.saved_views enable row level security;

/*
 * OKUMA: kendi görünümlerin + yöneticinin paylaştıkları.
 *
 * `(select auth.uid())` sarmalayıcısı 0043'te ölçülen initplan sorunu
 * için: sarmalanmayan `auth.uid()` satır BAŞINA değerlendiriliyor.
 */
drop policy if exists saved_views_read on public.saved_views;
create policy saved_views_read on public.saved_views
  for select using (is_shared or user_id = (select auth.uid()));

/*
 * YAZMA YALNIZCA KENDİ SATIRINA. `with check` OLMADAN `using` yeterli
 * değil: `using` hangi satıra dokunabileceğini, `with check` dokunduktan
 * sonra satırın ne hâle geleceğini denetler. İkincisi olmasaydı
 * kullanıcı kendi görünümünün `user_id`sini başkasına çevirebilirdi.
 */
drop policy if exists saved_views_write_own on public.saved_views;
create policy saved_views_write_own on public.saved_views
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

/* Yönetici paylaşılan görünümleri yönetebilmeli — kendi satırı
   olmasa da (moderasyon). */
drop policy if exists saved_views_admin on public.saved_views;
create policy saved_views_admin on public.saved_views
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

grant select, insert, update, delete on public.saved_views to authenticated;

drop trigger if exists saved_views_set_updated_at on public.saved_views;
create trigger saved_views_set_updated_at
  before update on public.saved_views
  for each row execute function app.set_updated_at();

-- ── `is_shared` kapısı ───────────────────────────────────────────────────
create or replace function app.saved_views_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  /* Yönetici her şeyi yapabilir. */
  if app.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' and new.is_shared then
    raise exception 'Paylaşılan görünümü yalnızca yönetici açabilir.'
      using errcode = 'insufficient_privilege';
  end if;

  if tg_op = 'UPDATE' and new.is_shared is distinct from old.is_shared then
    raise exception 'Paylaşılan görünümü yalnızca yönetici değiştirebilir.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end $$;

revoke all on function app.saved_views_guard() from public, anon, authenticated;

drop trigger if exists saved_views_before_write on public.saved_views;
create trigger saved_views_before_write
  before insert or update on public.saved_views
  for each row execute function app.saved_views_guard();

-- ── Varsayılan atama — TEK TRANSACTION ───────────────────────────────────
/*
 * İki adım (eskisini bırak, yenisini al) tek çağrıda.
 *
 * İstemciden iki ayrı PostgREST isteğiyle yapılsaydı arada bir an
 * varsayılan HİÇ olmazdı ve ikinci istek düşerse kalıcı olarak öyle
 * kalırdı. Kısmi tekil indeks de bu sırayı zorunlu kılıyor.
 */
create or replace function public.set_default_view(gorunum_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  sahip  uuid;
  modul  text;
begin
  select user_id, module into sahip, modul
    from public.saved_views where id = gorunum_id;

  if sahip is null then
    raise exception 'Görünüm bulunamadı.' using errcode = 'no_data_found';
  end if;

  /* `security invoker`: RLS hâlâ geçerli, yani başkasının görünümünü
     varsayılan yapmaya çalışan kullanıcı sıfır satır günceller.
     `security definer` yazsaydık bu kapı açılırdı. */
  update public.saved_views
     set is_default = false
   where user_id = sahip and module = modul and is_default;

  update public.saved_views set is_default = true where id = gorunum_id;
end $$;

revoke all on function public.set_default_view(uuid) from public, anon;
grant execute on function public.set_default_view(uuid) to authenticated;

-- ── Ölçüm ────────────────────────────────────────────────────────────────
-- TEK BLOK, İÇ İÇE ALT BLOKLAR. İlk yazımda ölçüm iki ayrı `do $$`
-- bloğuna bölünmüştü ve birincinin `exception` dalı BÜTÜN bloğu geri
-- alıyordu — ikinci blok, birincinin kurduğu kullanıcıları bulamıyordu.
-- Beklenen hatalar artık iç `begin … exception` alt bloklarında
-- yakalanıyor; yalnızca o ifade geri alınıyor.
do $$
declare
  ali  uuid := '00000000-0000-0000-0000-0000000000a1';
  veli uuid := '00000000-0000-0000-0000-0000000000b2';
  g1   uuid;
  g2   uuid;
  sayi integer;
begin
  begin
    insert into auth.users (id) values (ali), (veli) on conflict do nothing;
  exception when others then
    raise notice '0069 ölçümü atlandı: auth.users''a yazılamıyor (%).', sqlerrm;
    return;
  end;

  insert into public.saved_views (user_id, module, name, query)
  values (ali, 'galeri', 'Andromeda', 'ara=m31&sirala=yeni')
  returning id into g1;

  insert into public.saved_views (user_id, module, name, query)
  values (ali, 'galeri', 'Sehirden', 'sehir=Ankara')
  returning id into g2;

  /* 1. VARSAYILAN TEKİL: ikisini birden varsayılan yapmak indekse
        takılmalı. */
  begin
    update public.saved_views set is_default = true where id in (g1, g2);
    raise exception '0069 ölçümü: iki görünüm birden varsayılan olabildi.';
  exception when unique_violation then
    null; -- beklenen
  end;

  /* 2. RPC İKİSİNİ TEK TRANSACTION'DA YAPIYOR: eskisi bırakılıyor,
        yenisi alınıyor ve arada varsayılansız bir an kalmıyor. */
  update public.saved_views set is_default = true where id = g1;
  perform public.set_default_view(g2);
  select count(*) into sayi
    from public.saved_views
   where user_id = ali and module = 'galeri' and is_default;
  if sayi <> 1 then
    raise exception '0069 ölçümü: varsayılan sayısı % (1 olmalıydı).', sayi;
  end if;
  if not exists (select 1 from public.saved_views where id = g2 and is_default) then
    raise exception '0069 ölçümü: `set_default_view` yeni görünümü işaretlemedi.';
  end if;

  /* 3. `is_shared` KULLANICI TARAFINDAN ÇEVRİLEMEZ. */
  perform set_config('request.jwt.claims',
    json_build_object('sub', ali::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    update public.saved_views set is_shared = true where id = g1;
    raise exception '0069 ölçümü: kullanıcı görünümü paylaşıma açabildi.';
  exception when insufficient_privilege then
    null; -- beklenen
  end;

  /* 4. BAŞKASININ GÖRÜNÜMÜ GÖRÜNMÜYOR. */
  reset role;
  insert into public.saved_views (user_id, module, name, query)
  values (veli, 'galeri', 'Velinin gorunumu', 'ara=m42');

  perform set_config('request.jwt.claims',
    json_build_object('sub', ali::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into sayi from public.saved_views where user_id = veli;
  if sayi <> 0 then
    reset role;
    raise exception '0069 ölçümü: Ali, Velinin % görünümünü görüyor.', sayi;
  end if;

  /* 5. PAYLAŞILAN GÖRÜNÜM HERKESE GÖRÜNÜYOR.
        Satırı kurmak için kapıyı geçici olarak kaldırıyoruz: ölçüm
        bloğunun bir oturumu yok, dolayısıyla `app.is_admin()` burada
        zaten `false`. Kapının KENDİSİ 3. adımda ölçüldü; buradaki soru
        paylaşılan satırın BAŞKA kullanıcıya görünüp görünmediği. */
  reset role;
  alter table public.saved_views disable trigger saved_views_before_write;
  update public.saved_views set is_shared = true where id = g1;
  alter table public.saved_views enable trigger saved_views_before_write;

  perform set_config('request.jwt.claims',
    json_build_object('sub', veli::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into sayi from public.saved_views where id = g1;
  if sayi <> 1 then
    reset role;
    raise exception '0069 ölçümü: paylaşılan görünüm başka kullanıcıya görünmüyor.';
  end if;
  reset role;

  delete from public.saved_views where user_id in (ali, veli);
  delete from auth.users where id in (ali, veli);

  raise notice '0069 ölçümü geçti: varsayılan tekil ve atomik, paylaşım kapısı yönetiside, satırlar kişisel.';
end $$;

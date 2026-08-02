-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 11 — GÖZLEM GÜNLÜĞÜ (§14.6)
--
-- ══════════════════════════════════════════════════════════════════════════
-- NEDEN YENİ BİR TABLO — FOTOĞRAF ARŞİVİ BUNU KARŞILAMIYOR
--
-- §14'ün açılış kuralı "çakışan modülleri birleştir" diyor, o yüzden önce
-- birleştirilebilir mi diye bakıldı. Birleşmiyor:
--
--   `astro_photos`   → bir GÖRÜNTÜNÜN künyesi. Zorunlu çıktısı bir dosya;
--                      alanları poz, filtre, işleme revizyonu.
--   `observation_logs` → bir GECENİN kaydı. Çıktısı olmayabilir: dürbünle
--                      bakıp not almak da bir gözlemdir ve §14.6 bunu
--                      açıkça istiyor ("çizim/fotoğraf", yani fotoğraf
--                      ZORUNLU DEĞİL).
--
-- İkisini tek tabloda toplamak, fotoğrafı olmayan kayıtlar için yarısı
-- boş bir satır ve "bu bir foto mu gözlem mi" diye soran bir tür sütunu
-- demekti. Ayrı duruyorlar ama BAĞLILAR: `photo_id` ile bir gözlem
-- gecesine o gecenin fotoğrafı iliştirilebiliyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- GİZLİLİK VARSAYILANI: ÖZEL
--
-- §14.6 "özel veya public" diyor ve varsayılanı söylemiyor. ÖZEL seçildi:
-- gözlem günlüğü kişisel bir defter ve içinde konum bilgisi var. Yanlış
-- varsayılan geri alınamaz — kullanıcı fark ettiğinde kayıt zaten
-- görünmüş olur. Tersi zararsız: paylaşmak isteyen tek tıkla açar.
--
-- ══════════════════════════════════════════════════════════════════════════
-- KONUM SERBEST METİN, KOORDİNAT DEĞİL
--
-- §14.4 "hassas ve özel lokasyonların tam koordinatını koruma seçeneği"
-- istiyor. Günlüğe koordinat alanı koysaydık, herkese açık bir kayıt
-- kullanıcının bahçesinin GPS'ini yayınlayabilirdi. Saha kaydı zaten
-- `observing_sites`ta ve orada gizlilik kontrolü var; günlük ya oraya
-- REFERANS veriyor ya da serbest metin ("Kayseri, Erciyes eteği").
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.observation_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  /* Gözlemin YAPILDIĞI gece. `timestamptz` değil `date`: kullanıcı "3
     Ağustos gecesi" diye hatırlıyor, saat 02:14 diye değil. Gecenin
     hangi takvim gününe sayılacağı kararı istemcide (`lib/zone.ts`
     gece tarihi hesabı) — orada zaten IANA saat dilimiyle çözülüyor. */
  observed_on date not null,

  /* Serbest metin konum. Yukarıdaki gerekçe. */
  location_text text,
  /* Kayıtlı bir gözlem sahasına referans — varsa koordinat oradan gelir
     ve oranın gizlilik kuralı geçerli olur. `slug` unique olduğu için FK
     kurulabiliyor; saha silinirse günlük kaydı DURUYOR, yalnızca bağı
     kopuyor (`set null`) — gözlemin kendisi sahaya ait değil. */
  site_slug   text references public.observing_sites(slug) on delete set null,

  /* Hedef: katalog kodu (`M31`) ya da serbest ad. Katalog tablosuna FK
     YOK: kullanıcı katalogda olmayan bir şeye de bakabilir (ISS geçişi,
     bir kuyrukluyıldız, "gökyüzü genel"). FK koymak, günlüğü katalogun
     kapsamıyla sınırlamak olurdu. */
  target      text,

  /* Koşullar. Hepsi opsiyonel — sonradan hatırlanmayan şeyi zorunlu
     kılmak, kaydın hiç girilmemesine yol açar. */
  seeing      smallint,
  transparency smallint,
  /* Kullanılan ekipman seti (`setups`) — serbest metin olarak tutuluyor
     çünkü setler istemci tarafında da saklanabiliyor. */
  equipment   text,

  note        text,
  /* O geceye ait fotoğraf — zorunlu değil (bkz. başlık). */
  photo_id    uuid references public.astro_photos(id) on delete set null,

  /* §14.6 "özel veya public". Varsayılan ÖZEL. */
  is_public   boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  /* 1–5 ölçeği: amatör gözlem defterlerinde yaygın (Antoniadi tersten
     1–5 kullanır ama burada BÜYÜK = İYİ, çünkü arayüzde yıldız gibi
     okunuyor ve tersi her seferinde açıklama gerektirirdi). */
  constraint observation_logs_seeing_check check (
    seeing is null or seeing between 1 and 5
  ),
  constraint observation_logs_transparency_check check (
    transparency is null or transparency between 1 and 5
  ),
  /* Gelecekte yapılmamış bir gözlem kaydedilemez. Bir gün pay: kullanıcı
     kendi saat diliminde "bu gece" derken sunucu UTC'de ertesi güne
     geçmiş olabilir. */
  constraint observation_logs_date_check check (
    observed_on <= (current_date + 1)
  ),
  constraint observation_logs_note_len check (
    note is null or char_length(note) <= 4000
  ),
  constraint observation_logs_target_len check (
    target is null or char_length(target) <= 120
  )
);

comment on table public.observation_logs is
  'Gözlem günlüğü (§14.6). Fotoğraf arşivinden ayrı: çıktısı olmayan gözlem de kayıttır. Varsayılan gizlilik ÖZEL.';

create index if not exists observation_logs_user_idx
  on public.observation_logs (user_id, observed_on desc);

/* Herkese açık kayıtların akışı — profil sayfası ve keşif için. */
create index if not exists observation_logs_public_idx
  on public.observation_logs (observed_on desc) where is_public;

alter table public.observation_logs enable row level security;

/*
 * OKUMA: kendi kayıtların + herkese açık olanlar.
 *
 * `(select auth.uid())` sarmalayıcısı BİLİNÇLİ — 0043'te ölçülen initplan
 * sorunu: sarmalanmayan `auth.uid()` satır BAŞINA değerlendiriliyor ve
 * binlerce satırda planı bozuyor.
 */
drop policy if exists observation_logs_read on public.observation_logs;
create policy observation_logs_read on public.observation_logs
  for select using (is_public or user_id = (select auth.uid()));

/*
 * YAZMA YALNIZCA KENDİ KAYDINA. `with check` OLMADAN `using` yeterli
 * DEĞİL: `using` hangi satıra dokunabileceğini söyler, `with check`
 * dokunduktan sonra satırın ne hâle geleceğini denetler. İkincisi
 * olmasaydı kullanıcı kendi kaydının `user_id`sini başkasına çevirip
 * ona kayıt yazabilirdi.
 */
drop policy if exists observation_logs_write_own on public.observation_logs;
create policy observation_logs_write_own on public.observation_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select on public.observation_logs to anon;
grant select, insert, update, delete on public.observation_logs to authenticated;

/* `updated_at` tetikleyicisi — 0002'de kurulan ortak fonksiyon. */
drop trigger if exists observation_logs_set_updated_at on public.observation_logs;
create trigger observation_logs_set_updated_at
  before update on public.observation_logs
  for each row execute function app.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════
-- ÖLÇÜM — RLS gerçekten ayırıyor mu?
--
-- Politika yazmak yetmiyor; DAVRANIŞI ölçmek gerekiyor. Aşağıdaki blok
-- iki kullanıcı kurup dört soruyu cevaplıyor:
--   1. Kendi özel kaydımı görüyor muyum?          (evet)
--   2. Başkasının özel kaydını görüyor muyum?     (hayır)
--   3. Başkasının açık kaydını görüyor muyum?     (evet)
--   4. Anonim ziyaretçi özel kaydı görüyor mu?    (hayır)
-- ══════════════════════════════════════════════════════════════════════════
do $$
declare
  ali  uuid := '00000000-0000-0000-0000-0000000000a1';
  veli uuid := '00000000-0000-0000-0000-0000000000b2';
  sayi integer;
begin
  /* Ölçüm yalnızca `auth.users`a yazabildiğimiz ortamlarda çalışır;
     üretimde bu blok sessizce atlanır. */
  begin
    insert into auth.users (id) values (ali), (veli) on conflict do nothing;
  exception when others then
    raise notice '0064 ölçümü atlandı: auth.users''a yazılamıyor (%).', sqlerrm;
    return;
  end;

  insert into public.observation_logs (user_id, observed_on, target, is_public)
  values (ali,  current_date, 'M31 — özel',  false),
         (veli, current_date, 'M42 — özel',  false),
         (veli, current_date, 'M13 — açık',  true);

  perform set_config('request.jwt.claims',
    json_build_object('sub', ali::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into sayi from public.observation_logs;
  if sayi <> 2 then
    raise exception '0064 ölçümü: Ali 2 kayıt görmeliydi (kendi özeli + Veli''nin açığı), % gördü.', sayi;
  end if;

  select count(*) into sayi from public.observation_logs where target = 'M42 — özel';
  if sayi <> 0 then
    raise exception '0064 ölçümü: Ali, Veli''nin ÖZEL kaydını görüyor.';
  end if;

  /* JWT TALEBİ DE TEMİZLENİYOR, YALNIZCA ROL DEĞİL.
     İlk yazımda yalnızca `set local role anon` vardı ve ölçüm "anonim 2
     kayıt görüyor" diye patladı. Sebep politikada değil ölçümdeydi:
     `request.jwt.claims` hâlâ Ali'nin `sub`unu taşıyordu, dolayısıyla
     `auth.uid()` Ali'yi döndürüyor ve rol anon olsa da satır sahibi
     sayılıyordu. Gerçek bir anonim istekte o talep hiç yok.

     Boş dize DEĞİL `'{}'` yazılıyor: `''::jsonb` "invalid input syntax"
     hatası veriyor (bu da ilk denemede patladı). `'{}'` geçerli JSON ve
     içinde `sub` yok — yani `auth.uid()` NULL, tam olarak anonim. */
  perform set_config('request.jwt.claims', '{}', true);
  set local role anon;
  select count(*) into sayi from public.observation_logs;
  if sayi <> 1 then
    raise exception '0064 ölçümü: anonim yalnızca 1 açık kayıt görmeliydi, % gördü.', sayi;
  end if;

  reset role;
  delete from public.observation_logs where user_id in (ali, veli);
  delete from auth.users where id in (ali, veli);

  raise notice '0064 ölçümü geçti: özel kayıtlar sahibinden başkasına görünmüyor.';
end $$;

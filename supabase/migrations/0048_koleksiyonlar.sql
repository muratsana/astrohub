-- ════════════════════════════════════════════════════════════════════════════
-- 0048 — KOLEKSİYONLAR (FAVORİ / KAYDEDİLENLER)
--
-- Fotoğraf detayında iki yıldır ölü bir `<span>` duruyordu: "Kaydet".
-- Düğme bile değildi — tıklanamıyordu, imleç değişmiyordu, hiçbir şey
-- olmuyordu. Kullanıcı bir fotoğrafı beğenebiliyor ama SAKLAYAMIYORDU;
-- "sonra bakarım" diye bir yer yoktu.
--
-- ══════════════════════════════════════════════════════════════════════════
-- TEK TABLO DEĞİL, İKİ TABLO — VE BUNUN SEBEBİ BUGÜN DEĞİL YARIN
--
-- Bugünün ihtiyacı tek bir "kaydedilenler" kümesi: bir fotoğrafı sakla,
-- listeden bak. Bunu `saved_photos(user_id, photo_id)` diye tek tabloyla
-- karşılamak mümkündü ve daha az kod olurdu.
--
-- Yapmadık, çünkü ana görev belgesi "Favori / koleksiyon" diyor: adlandırılmış
-- listeler (§7.3'ün "kaydet"i ile aynı düğme, farklı derinlik). O geldiğinde
-- tek tablodan iki tabloya geçmek, kullanıcıların birikmiş kayıtlarını
-- taşıyan bir göç demekti. Şema bugünden iki tablo; ARAYÜZ bugün tek
-- koleksiyon gösteriyor.
--
-- Bu, "ileride lazım olur" diye özellik eklemek DEĞİL: eklenen şey bir
-- özellik değil, aynı verinin doğru biçimi. Kullanıcıya görünen yüzey
-- tek düğme.
--
-- ══════════════════════════════════════════════════════════════════════════
-- VARSAYILAN KOLEKSİYON TEMBEL AÇILIYOR
--
-- Her yeni kullanıcıya boş bir "Kaydedilenler" satırı açmak, hiç
-- kaydetmeyecek kullanıcılar için ölü satır demekti. `handle_new_user`
-- tetikleyicisine eklemek de aynı kapıya çıkardı. Bunun yerine ilk kayıt
-- anında `public.toggle_saved_photo` koleksiyonu kendisi açıyor.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  /* Kullanıcı başına tekil; ileride `/profil/<kullanıcı>/<slug>` adresi
     bunun üstüne kurulacak. */
  slug       text not null,
  /*
   * VARSAYILAN GİZLİ. "Kaydedilenler" bir okuma listesi: kullanıcının
   * neyi sonra bakmak üzere ayırdığı, paylaşmak istediği bir seçki
   * olmayabilir. Herkese açık başlamak, kimsenin istemediği bir
   * paylaşımı varsayılan yapmaktı.
   */
  is_public  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, slug),
  constraint collections_name_len check (char_length(name) between 1 and 60),
  constraint collections_slug_len check (char_length(slug) between 1 and 60)
);

comment on table public.collections is
  'Kullanıcı koleksiyonları. Varsayılanı "kaydedilenler" (§7.3 "kaydet").';

create index if not exists collections_user_idx
  on public.collections (user_id, created_at desc);

drop trigger if exists collections_touch on public.collections;
create trigger collections_touch
  before update on public.collections
  for each row execute function app.set_updated_at();

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  photo_id      uuid not null references public.astro_photos(id) on delete cascade,
  added_at      timestamptz not null default now(),
  primary key (collection_id, photo_id)
);

comment on table public.collection_items is
  'Koleksiyondaki fotoğraflar. Fotoğraf silinince kaydı da gider.';

/* "Bu fotoğrafı kaç kişi kaydetti" ve "bu fotoğraf kaydedilenlerimde mi"
   sorguları fotoğraftan koleksiyona doğru gidiyor. */
create index if not exists collection_items_photo_idx
  on public.collection_items (photo_id);

-- ══════════════════════════════════════════════════════════════════════════
-- KOLEKSİYON OKUNABİLİR Mİ
--
-- İki tabloda da aynı kural geçerli: sahibi her zaman, başkası yalnızca
-- herkese açıksa. `collection_items` politikası bunu doğrudan yazsaydı
-- `collections`a alt sorgu atardı ve iki kural zamanla ayrışırdı —
-- koleksiyon gizlenince içindekiler görünür kalırdı.
--
-- `security definer` DEĞİL: burada gizlenecek bir şey yok, kural zaten
-- "sahibi ya da herkese açık". Çağıranın yetkisiyle çalışması yeterli.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.collection_readable(collection uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.collections c
     where c.id = collection
       and (c.is_public or c.user_id = auth.uid())
  );
$$;

revoke execute on function app.collection_readable(uuid) from public;
grant execute on function app.collection_readable(uuid) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- SATIR GÜVENLİĞİ
-- ══════════════════════════════════════════════════════════════════════════
alter table public.collections      enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists collections_read on public.collections;
create policy collections_read on public.collections
  for select using (is_public or user_id = (select auth.uid()));

drop policy if exists collections_write_own on public.collections;
create policy collections_write_own on public.collections
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select on public.collections to anon;
grant select, insert, update, delete on public.collections to authenticated;

drop policy if exists collection_items_read on public.collection_items;
create policy collection_items_read on public.collection_items
  for select using (app.collection_readable(collection_id));

/*
 * YAZMA SAHİBİNE BAĞLI, OKUNABİLİRLİĞE DEĞİL. Herkese açık bir
 * koleksiyon HERKESİN EKLEYEBİLECEĞİ bir koleksiyon değil; seçkiyi
 * kuran kişi sahibi.
 */
drop policy if exists collection_items_write_own on public.collection_items;
create policy collection_items_write_own on public.collection_items
  for all to authenticated
  using (
    exists (
      select 1 from public.collections c
       where c.id = collection_items.collection_id
         and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.collections c
       where c.id = collection_items.collection_id
         and c.user_id = (select auth.uid())
    )
  );

grant select on public.collection_items to anon;
grant select, insert, update, delete on public.collection_items to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- KAYDET / KAYDI KALDIR
--
-- Tek çağrı, çünkü istemcinin yapması gereken üç iş var ve üçü de
-- birbirine bağlı: varsayılan koleksiyonu bul (yoksa aç), kaydı ekle ya
-- da çıkar, yeni durumu döndür. İstemciye bıraksaydık ilk kaydetmede iki
-- gidiş-dönüş olurdu ve arada koleksiyon açılmışsa yarış koşulu çıkardı.
--
-- `security definer` ama kendi kendini sınırlıyor: koleksiyon her zaman
-- `auth.uid()` adına açılıyor, parametre olarak kullanıcı ALMIYOR.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.toggle_saved_photo(target_photo uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me      uuid := auth.uid();
  koleksiyon uuid;
  vardi   boolean;
begin
  if me is null then
    raise exception 'Kaydetmek için giriş yapmalısınız.'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.astro_photos p where p.id = target_photo) then
    raise exception 'Fotoğraf bulunamadı.' using errcode = 'no_data_found';
  end if;

  select id into koleksiyon
    from public.collections
   where user_id = me and slug = 'kaydedilenler';

  if koleksiyon is null then
    insert into public.collections (user_id, name, slug)
    values (me, 'Kaydedilenler', 'kaydedilenler')
    returning id into koleksiyon;
  end if;

  select exists (
    select 1 from public.collection_items
     where collection_id = koleksiyon and photo_id = target_photo
  ) into vardi;

  if vardi then
    delete from public.collection_items
     where collection_id = koleksiyon and photo_id = target_photo;
    return false;
  end if;

  insert into public.collection_items (collection_id, photo_id)
  values (koleksiyon, target_photo)
  on conflict do nothing;
  return true;
end $$;

/* 0046'nın dersi: `grant … to authenticated` yazmak `anon`un AÇIK
   grant'ını kaldırmıyor. Önce geri al, sonra ver. */
revoke execute on function public.toggle_saved_photo(uuid) from public, anon;
grant  execute on function public.toggle_saved_photo(uuid) to authenticated;

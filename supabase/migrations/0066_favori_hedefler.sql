-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 11 — FAVORİ HEDEFLER / GÖZLEM LİSTESİ (§14.1)
--
-- ══════════════════════════════════════════════════════════════════════════
-- ÖNCE `collections` DENENDİ — UYMUYOR
--
-- §14'ün açılış kuralı "çakışan modülleri birleştir" diyor ve bu tur da
-- öyle başladı: §14.9'da `content_entries` genişletilerek yeni tablo
-- açılmadı. Burada aynı soru soruldu ve cevabı FARKLI çıktı.
--
-- `collection_items` şöyle:
--
--     collection_id uuid not null references collections(id)
--     photo_id      uuid not null references astro_photos(id)
--     primary key (collection_id, photo_id)
--
-- Hedefleri buraya sokmanın tek yolu `photo_id`yi nullable yapmak, bir
-- `target_slug` sütunu eklemek, birincil anahtarı değiştirmek ve "bu
-- satır foto mu hedef mi" diye soran bir ayrım sütunu koymaktı. Yani
-- 0064'te gözlem günlüğü için REDDETTİĞİMİZ şeklin aynısı: yarısı boş
-- satırlar ve tür sütunu.
--
-- Kavramsal olarak da tutmuyor:
--
--     collections     → ADLANDIRILMIŞ, paylaşılabilir, sıralı foto seçkisi
--     favori hedefler → adsız, düz bir küme; "yıldızladım" demek
--
-- Koleksiyonun adı, slug'ı, gizlilik anahtarı ve paylaşım adresi var.
-- Favori hedefte bunların hiçbiri yok ve olması da istenmiyor — kullanıcı
-- bir yıldız düğmesine basıyor, koleksiyon kurmuyor.
--
-- Birleştirme kuralı "her şeyi tek tabloya yığ" demek değil; ÇAKIŞAN
-- modülleri birleştir demek. Bunlar çakışmıyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- "GÖZLEM LİSTESİ" AYRI BİR TABLO DEĞİL — FAVORİLERİN PLANLAYICIDAKİ HÂLİ
--
-- §14.1 "favori hedefler" ve "gözlem listesi"ni ayrı maddeler olarak
-- sayıyor. Bunlar için iki tablo açmadık ve bu bir YORUM, gizlenmiş bir
-- eksik değil: gözlem listesi, favorilerin BU GECEYE göre süzülmüş ve
-- yükseklik/transit sırasına dizilmiş hâli. Sıralamayı kullanıcı değil
-- gökyüzü belirliyor, dolayısıyla saklanacak bir sıra yok.
--
-- İkinci bir tablo, kullanıcıya aynı hedefi iki kez işaretletirdi
-- ("favoriledim ama listeye eklemedim") ve ikisi arasındaki farkı
-- kimseye anlatamazdık.
--
-- ══════════════════════════════════════════════════════════════════════════
-- `target_slug` — KATALOG TABLOSUNA FK YOK
--
-- 0064'teki gerekçenin aynısı. Katalog `celestial_objects` tablosunda
-- ama tohumun bir kısmı kodda (`features/targets/catalog.ts`) ve
-- kullanıcı katalogda olmayan bir şeyi de yıldızlayabilmeli. FK, favori
-- listesini katalogun bugünkü kapsamıyla sınırlardı; katalogdan bir
-- satır silinse kullanıcının favorisi de sessizce yok olurdu.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.target_favorites (
  user_id     uuid not null references auth.users(id) on delete cascade,
  /* Hedefin sabit slug'ı (`m31-andromeda`). Kod ve veritabanı aynı
     slug'ı kullanıyor — `catalog.ts` bunu "eski kayıtların bağlantısını
     kırmamak için sabitlenmiş" diye işaretliyor. */
  target_slug text not null,
  added_at    timestamptz not null default now(),

  primary key (user_id, target_slug),

  constraint target_favorites_slug_format
    check (target_slug ~ '^[a-z0-9-]{2,120}$')
);

comment on table public.target_favorites is
  'Favori hedefler (§14.1). Düz küme; koleksiyon değil. Gözlem listesi bunun planlayıcıdaki görünümü.';

/* "Bu hedefi kaç kişi favoriledi" sorgusu hedeften kullanıcıya gidiyor;
   birincil anahtar ters yönde olduğu için ikinci indeks gerekiyor. */
create index if not exists target_favorites_slug_idx
  on public.target_favorites (target_slug);

alter table public.target_favorites enable row level security;

/*
 * FAVORİ LİSTESİ KİŞİSEL — HERKESE AÇIK DEĞİL.
 *
 * `collections`ta bir `is_public` anahtarı var çünkü orası bir seçki ve
 * paylaşmak anlamlı. Burada yok: hangi hedefleri çekmeyi planladığın,
 * paylaşılacak bir şey olmak zorunda değil ve varsayılan olarak
 * paylaşmak — 0064'teki gerekçe — geri alınamaz bir karar olurdu.
 *
 * Sayaç ("42 kişi favoriledi") bu yüzden BU TURDA YOK: onu vermek için
 * ya politikayı gevşetmek ya da `security definer` bir sayaç fonksiyonu
 * yazmak gerekir. İkincisi doğru yol ama ihtiyaç doğmadan yazmıyoruz.
 *
 * `(select auth.uid())` sarmalayıcısı 0043'te ölçülen initplan sorunu
 * için.
 */
drop policy if exists target_favorites_own on public.target_favorites;
create policy target_favorites_own on public.target_favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

/* `anon`a SELECT verilmiyor: liste kişisel, oturumsuz okunacak bir yanı
   yok. Verilseydi politika zaten boş döndürürdü ama izni hiç vermemek,
   niyeti şemada da yazmak demek. */
grant select, insert, delete on public.target_favorites to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- ÖLÇÜM — liste gerçekten kişisel mi?
-- ══════════════════════════════════════════════════════════════════════════
do $$
declare
  ali  uuid := '00000000-0000-0000-0000-0000000000a1';
  veli uuid := '00000000-0000-0000-0000-0000000000b2';
  sayi integer;
begin
  begin
    insert into auth.users (id) values (ali), (veli) on conflict do nothing;
  exception when others then
    raise notice '0066 ölçümü atlandı: auth.users''a yazılamıyor (%).', sqlerrm;
    return;
  end;

  insert into public.target_favorites (user_id, target_slug)
  values (ali, 'm31-andromeda'), (veli, 'm42-orion');

  perform set_config('request.jwt.claims',
    json_build_object('sub', ali::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into sayi from public.target_favorites;
  if sayi <> 1 then
    raise exception '0066 ölçümü: Ali yalnızca kendi favorisini görmeliydi, % gördü.', sayi;
  end if;

  /* Başkasının adına favori yazılamamalı — `with check` bunu tutuyor. */
  begin
    insert into public.target_favorites (user_id, target_slug)
    values (veli, 'm13-herkul');
    raise exception '0066 ölçümü: Ali, Veli adına favori yazabildi.';
  exception when insufficient_privilege then
    null; -- beklenen
  end;

  /* JWT talebi de temizleniyor: yalnızca rolü değiştirmek yetmiyor —
     0064'te bu tuzağa düşülmüştü (`auth.uid()` eski `sub`u döndürüyordu). */
  perform set_config('request.jwt.claims', '{}', true);
  set local role anon;
  begin
    select count(*) into sayi from public.target_favorites;
    if sayi <> 0 then
      raise exception '0066 ölçümü: anonim % favori gördü, 0 olmalıydı.', sayi;
    end if;
  exception when insufficient_privilege then
    null; -- SELECT izni hiç verilmedi; bu da kabul.
  end;

  reset role;
  delete from public.target_favorites where user_id in (ali, veli);
  delete from auth.users where id in (ali, veli);

  raise notice '0066 ölçümü geçti: favori listesi kişisel, başkası adına yazılamıyor.';
end $$;

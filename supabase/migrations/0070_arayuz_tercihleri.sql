-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 4 — GÖRÜNÜM TERCİHİ HESAPTA SAKLANSIN (§7)
--
-- Faz 4'ün durum kaydında satır şöyleydi: "`localStorage`da saklanıyor
-- (görünüm, yoğunluk, gizli sütunlar), hesapta değil — kullanıcı
-- tercihleri tablosu Faz 10". Tablo altyapısı geldi; bu göç o satırı
-- kapatıyor.
--
-- ══════════════════════════════════════════════════════════════════════════
-- ANAHTAR/DEĞER — VE DEĞER `jsonb` DEĞİL `text`
--
-- Saklanan şeyler kısa seçimler: `grid`, `list`, `table`, `baslik`,
-- gizlenen sütun listesi. `jsonb` seçmek, tipi olmayan bir alana tip
-- görüntüsü vermek olurdu; okuyan taraf zaten dizeyi bir BEYAZ LİSTEYE
-- karşı doğruluyor (`useStoredChoice`in `allowed` parametresi) ve
-- listede olmayan değer sessizce düşüyor.
--
-- Bu, tabloyu istemcinin serbest yazabildiği bir depoya çevirmiyor:
-- uzunluk kısıtı var ve anahtar biçimi dar.
--
-- ══════════════════════════════════════════════════════════════════════════
-- NEDEN `profiles`A SÜTUN EKLENMEDİ
--
-- Bir `ui_prefs jsonb` sütunu mümkündü. Yapılmadı: `profiles` satırı
-- kullanıcının KİMLİĞİNE dair, arayüz tercihine değil. Her görünüm
-- değişikliğinde profil satırını yazmak, o satırın `updated_at`ini
-- anlamsızca kaydırır ve profil güncellemesi ile "ızgaradan listeye
-- geçtim" aynı denetim izine karışırdı.
--
-- Ayrı tablo ayrıca kısmi yazmayı ucuzlatıyor: bir anahtarı güncellemek
-- tek satır, jsonb birleştirme değil.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.ui_preferences (
  user_id    uuid not null references auth.users(id) on delete cascade,
  /* `view:galeri`, `density:forum`, `columns:ilanlar`… İki nokta ayırıcı
     ad alanı, `localStorage` anahtarlarıyla aynı desen. */
  key        text not null,
  value      text not null,
  updated_at timestamptz not null default now(),

  primary key (user_id, key),

  constraint ui_preferences_key_format check (key ~ '^[a-z0-9:_-]{2,60}$'),
  /* Değer kısa bir seçim; gizli sütun listesi bile birkaç yüz bayt. */
  constraint ui_preferences_value_len check (char_length(value) between 1 and 500)
);

comment on table public.ui_preferences is
  'Kullanıcının arayüz tercihleri (Faz 4). Değer kısa bir seçim; okuyan taraf beyaz listeye karşı doğruluyor.';

alter table public.ui_preferences enable row level security;

/*
 * TAMAMEN KİŞİSEL — okuma da yazma da yalnızca sahibine.
 *
 * `anon`a hiçbir izin verilmiyor: oturumsuz kullanıcının tercihi
 * `localStorage`da kalıyor ve orada kalması doğru. Grant vermemek,
 * niyeti şemada da yazmak demek.
 *
 * `(select auth.uid())` sarmalayıcısı 0043'te ölçülen initplan sorunu
 * için.
 */
drop policy if exists ui_preferences_own on public.ui_preferences;
create policy ui_preferences_own on public.ui_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.ui_preferences to authenticated;

drop trigger if exists ui_preferences_set_updated_at on public.ui_preferences;
create trigger ui_preferences_set_updated_at
  before update on public.ui_preferences
  for each row execute function app.set_updated_at();

-- ── Ölçüm ────────────────────────────────────────────────────────────────
do $$
declare
  ali  uuid := '00000000-0000-0000-0000-0000000000a1';
  veli uuid := '00000000-0000-0000-0000-0000000000b2';
  sayi integer;
begin
  begin
    insert into auth.users (id) values (ali), (veli) on conflict do nothing;
  exception when others then
    raise notice '0070 ölçümü atlandı: auth.users''a yazılamıyor (%).', sqlerrm;
    return;
  end;

  insert into public.ui_preferences (user_id, key, value)
  values (ali, 'view:galeri', 'table'), (veli, 'view:galeri', 'grid');

  /* 1. AYNI ANAHTAR İKİ KULLANICIDA ÇAKIŞMIYOR — birincil anahtar
        (user_id, key), yalnızca key değil. */
  select count(*) into sayi from public.ui_preferences where key = 'view:galeri';
  if sayi <> 2 then
    raise exception '0070 ölçümü: aynı anahtar iki kullanıcıda tutulamadı (%).', sayi;
  end if;

  /* 2. BAŞKASININ TERCİHİ GÖRÜNMÜYOR. */
  perform set_config('request.jwt.claims',
    json_build_object('sub', ali::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into sayi from public.ui_preferences;
  if sayi <> 1 then
    reset role;
    raise exception '0070 ölçümü: Ali % tercih görüyor, 1 olmalıydı.', sayi;
  end if;

  /* 3. BAŞKASI ADINA YAZILAMIYOR — `with check` bunu tutuyor. */
  begin
    insert into public.ui_preferences (user_id, key, value)
    values (veli, 'density:forum', 'baslik');
    reset role;
    raise exception '0070 ölçümü: Ali, Veli adına tercih yazabildi.';
  exception when insufficient_privilege then
    null; -- beklenen
  end;
  reset role;

  /* 4. UZUN DEĞER REDDEDİLİYOR — tablo serbest metin deposu değil. */
  begin
    insert into public.ui_preferences (user_id, key, value)
    values (ali, 'uzun', repeat('x', 501));
    raise exception '0070 ölçümü: 500 karakterden uzun değer kabul edildi.';
  exception when check_violation then
    null; -- beklenen
  end;

  delete from public.ui_preferences where user_id in (ali, veli);
  delete from auth.users where id in (ali, veli);

  raise notice '0070 ölçümü geçti: tercihler kişisel, başkası adına yazılamıyor, uzunluk sınırlı.';
end $$;

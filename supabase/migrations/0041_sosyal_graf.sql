-- ════════════════════════════════════════════════════════════════════════════
-- 0041 — SOSYAL GRAF: TAKİP VE ENGELLEME
--
-- Faz 5'in ilk taşı. Bildirim de mesajlaşma da bu iki tabloya yaslanıyor:
-- "kim kimden haber alır" takipten, "kim kime ulaşamaz" engellemeden
-- çıkıyor. Bu yüzden ikisi bildirimden ÖNCE geliyor — sonra gelseydi
-- bildirim tetikleyicileri henüz olmayan bir engelleme kuralını
-- sorgulayamaz, engelleme de sonradan eklenen bir yamaya dönerdi.
--
-- ENGELLEME BİR GİZLİLİK KARARI, BİR DUYURU DEĞİL.
-- Engellenen kişi engellendiğini tablodan öğrenemiyor (aşağıdaki RLS).
-- Bunu tersine çevirmek — "seni engelledi" demek — sessiz bir uzaklaşmayı
-- karşılaşmaya dönüştürürdü; engelleme özelliğinin var olma sebebi tam
-- olarak o karşılaşmayı istememek.
-- ════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- TAKİP
--
-- Bileşik birincil anahtar aynı kişiyi iki kez takip etmeyi şemanın
-- kendisinde imkânsız kılıyor; istemcinin "zaten takip ediyor muyum"
-- diye sorması gerekmiyor, `on conflict do nothing` yetiyor.
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self check (follower_id <> followee_id)
);

comment on table public.follows is
  'Takip ilişkisi. follower_id, followee_id''yi takip eder (§8.13).';

/* Takipçi listesi ("beni kim takip ediyor") ve takip listesi ("ben kimi
   takip ediyorum") iki ayrı yönde okunuyor. Birincil anahtar ilkini
   karşılamıyor: (follower_id, followee_id) indeksi followee'ye göre
   aramada işe yaramaz. */
create index if not exists follows_followee_idx
  on public.follows (followee_id, created_at desc);

-- ══════════════════════════════════════════════════════════════════════════
-- ENGELLEME
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

comment on table public.user_blocks is
  'Engelleme. Tek yönlü kayıt; etkisi çift yönlü (bkz. app.is_blocked).';

/* "Beni kim engelledi" sorgusu doğrudan istemciye açık değil ama
   app.is_blocked() her mesaj ve her bildirimde bu yönde arıyor. */
create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_id);

-- ══════════════════════════════════════════════════════════════════════════
-- ENGEL SORGUSU
--
-- KAYIT TEK YÖNLÜ, ETKİ ÇİFT YÖNLÜ. A, B'yi engellediğinde B de A'ya
-- mesaj atamıyor. Aksi hâlde engelleme yarım bir korumaydı: engellenen
-- kişi engelleyeni rahatsız etmeye devam edebilirdi.
--
-- SECURITY DEFINER ŞART. Çağıran kullanıcı karşı tarafın engelleme
-- satırını RLS yüzünden GÖREMİYOR (görebilseydi engellendiğini öğrenirdi).
-- Kontrolün kendisi de o satıra bakmak zorunda; bu yüzden fonksiyon
-- sahibinin yetkisiyle çalışıyor ve dışarıya yalnızca tek bit sızdırıyor:
-- "bu ikili birbirine yazamaz". Hangi tarafın engellediğini söylemiyor.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.is_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_blocks
     where (blocker_id = user_a and blocked_id = user_b)
        or (blocker_id = user_b and blocked_id = user_a)
  );
$$;

comment on function app.is_blocked(uuid, uuid) is
  'İki kullanıcı arasında herhangi bir yönde engel var mı. Yönü açığa çıkarmaz.';

-- ══════════════════════════════════════════════════════════════════════════
-- ENGELLEME TAKİBİ DE KOPARIR
--
-- Engellediğin kişi seni takip etmeye devam etseydi, akışında görünmeye
-- devam ederdi ve "engelledim" demek hiçbir şey değiştirmezdi. İki yönü
-- birden siliyoruz: engellenen kişinin takibi de, engelleyenin takibi de.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.block_breaks_follow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.follows
   where (follower_id = new.blocker_id and followee_id = new.blocked_id)
      or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end $$;

drop trigger if exists user_blocks_break_follow on public.user_blocks;
create trigger user_blocks_break_follow
  after insert on public.user_blocks
  for each row execute function app.block_breaks_follow();

-- ══════════════════════════════════════════════════════════════════════════
-- SATIR GÜVENLİĞİ — TAKİP
--
-- Takip AÇIK bilgi: profilde "142 takipçi" yazacaksa satırların
-- okunabilmesi gerekiyor. Bunu gizlemek, sayıyı denormalize bir sayaçtan
-- okumayı ve sayacı korumayı gerektirirdi; kazanç yok, karmaşa çok.
-- ══════════════════════════════════════════════════════════════════════════
alter table public.follows enable row level security;

drop policy if exists follows_read on public.follows;
create policy follows_read on public.follows
  for select using (true);

/* Takip yazarken engel kontrolü: engellediğin kişiyi takip edemezsin.
   Tetikleyici yerine `with check` içinde duruyor çünkü bu bir YETKİ
   kuralı — reddedilen satır hiç var olmamalı. */
drop policy if exists follows_write_own on public.follows;
create policy follows_write_own on public.follows
  for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and not app.is_blocked(follower_id, followee_id)
  );

drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own on public.follows
  for delete to authenticated
  using (
    /* Takibi bırakmak takip edenin hakkı; takipçiyi ÜSTÜNDEN ATMAK da
       takip edilenin hakkı. İkincisi olmasaydı istenmeyen bir takipçiden
       kurtulmanın tek yolu karşı tarafı engellemek olurdu — orantısız. */
    follower_id = (select auth.uid())
    or followee_id = (select auth.uid())
  );

grant select on public.follows to anon;
grant select, insert, delete on public.follows to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- SATIR GÜVENLİĞİ — ENGELLEME
--
-- Yalnızca engelleyen kendi listesini görüyor. Yönetici bile değil:
-- moderasyon için gerekli olan "bu kullanıcı kimi engelledi" değil,
-- "bu kullanıcı kimi taciz etti" ve o bilgi moderation_queue'da.
-- ══════════════════════════════════════════════════════════════════════════
alter table public.user_blocks enable row level security;

drop policy if exists user_blocks_read_own on public.user_blocks;
create policy user_blocks_read_own on public.user_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

drop policy if exists user_blocks_write_own on public.user_blocks;
create policy user_blocks_write_own on public.user_blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid()));

drop policy if exists user_blocks_delete_own on public.user_blocks;
create policy user_blocks_delete_own on public.user_blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

grant select, insert, delete on public.user_blocks to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- TAKİPÇİ SAYISI
--
-- SAYAÇ KOLONU YOK, BİLEREK. `astro_photos.like_count` denormalize çünkü
-- galeri kartlarında yüzlerce satırda birden gösteriliyor; takipçi sayısı
-- yalnızca tek bir profil açıldığında okunuyor ve indeksli `count(*)` o iş
-- için fazlasıyla hızlı. Sayaç eklemek, profiles üstünde "bu kolonu
-- kullanıcı kendisi değiştiremesin" diye ayrı bir koruma tetikleyicisi
-- gerektirirdi — profil güncelleme hakkı zaten kullanıcının.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.follow_counts(target_user uuid)
returns table (followers integer, following integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    (select count(*)::integer from public.follows where followee_id = target_user),
    (select count(*)::integer from public.follows where follower_id = target_user);
$$;

grant execute on function public.follow_counts(uuid) to anon, authenticated;

-- 0054_radyo_public_rpc.sql
--
-- `app` şeması PostgREST'e AÇIK DEĞİL ve açılmamalı: oradaki
-- fonksiyonlar `security definer` ve yetki kapılarını kendi
-- gövdelerinde taşıyor; şemayı toptan açmak, her yeni yardımcıyı
-- otomatik olarak internete açmak demekti.
--
-- Bu yüzden dışarı verilecek her fonksiyon `public`te AÇIKÇA
-- sarmalanıyor. Sarmalayıcı listesi, "API'den ne çağrılabilir"
-- sorusunun tek ve okunabilir cevabı.

/**
 * Yayın canlı mı — bayat yoklama canlı sayılmıyor (§10.2).
 *
 * `stable` ve parametresi yalnızca istasyon kimliği: fonksiyon hiçbir
 * şey yazmıyor ve kimlik doğrulama istemiyor, çünkü "yayın var mı"
 * sorusu herkese açık bir sorudur. Anonim kullanıcı da radyo dinliyor.
 */
create or replace function public.station_is_live(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app, pg_temp
as $$
  select app.station_is_live(target);
$$;

revoke all on function public.station_is_live(uuid) from public;
grant execute on function public.station_is_live(uuid) to anon, authenticated;

/**
 * Programın canlı yayın duyurusu (§10.5 "canlı yayın bildirimi").
 *
 * Yetki kapısı sarmalayıcıda DEĞİL, `app.announce_program_live`in
 * içinde: kapıyı sarmalayıcıya koysaydık, iç fonksiyonu başka bir
 * yerden çağıran ilerideki bir kod kapıyı atlardı.
 */
create or replace function public.announce_program_live(target_program uuid)
returns integer
language sql
volatile
security definer
set search_path = public, app, pg_temp
as $$
  select app.announce_program_live(target_program);
$$;

revoke all on function public.announce_program_live(uuid) from public, anon;
grant execute on function public.announce_program_live(uuid) to authenticated;

/*
 * KENAR FONKSİYONU ORAN LİMİTİ — kalıcı sayaç.
 *
 * NEDEN VERİTABANI: meteoblue vekilinde sayaç isolate belleğindeydi ve
 * üretimde ÖLÇÜLDÜ Kİ HİÇ TETİKLENMİYOR — 30 ardışık istek tek bir 429
 * üretmedi, çünkü her istek yeni bir isolate'e düşüyor. Çalışmayan bir
 * korumayı çalışıyormuş gibi bırakmak, hiç koymamaktan kötü: yanlış
 * güven verir.
 *
 * Tablo istemciye tamamen kapalı. RLS açık ve HİÇBİR politika yok —
 * varsayılan ret. Yalnızca SECURITY DEFINER fonksiyon üzerinden, o da
 * yalnızca service_role ile çağrılabilir.
 */
create table if not exists public.edge_rate_limits (
  bucket       text primary key,
  window_start timestamptz not null default now(),
  hits         integer not null default 0
);

comment on table public.edge_rate_limits is
  'Kenar fonksiyonlarının kayan pencere sayacı. İstemciye kapalı; yalnızca consume_rate_limit() yazar.';

alter table public.edge_rate_limits enable row level security;
revoke all on public.edge_rate_limits from anon, authenticated;

/*
 * Tek atomik adımda say ve karar ver.
 *
 * `on conflict` kilidi satır bazında tutuyor: aynı IP'den gelen eşzamanlı
 * istekler sıraya giriyor ve sayaç kaçırmıyor. İki ayrı sorgu (oku +
 * yaz) yarış üretirdi.
 *
 * Dönüş: izin verildi mi.
 */
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_window_seconds integer,
  p_max integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now  timestamptz := now();
  v_hits integer;
begin
  insert into public.edge_rate_limits as e (bucket, window_start, hits)
  values (p_bucket, v_now, 1)
  on conflict (bucket) do update
    set hits = case
          when e.window_start < v_now - make_interval(secs => p_window_seconds)
            then 1
          else e.hits + 1
        end,
        window_start = case
          when e.window_start < v_now - make_interval(secs => p_window_seconds)
            then v_now
          else e.window_start
        end
  returning e.hits into v_hits;

  /*
   * Tablo sınırsız büyümemeli: her yeni IP bir satır bırakır. Ara sıra
   * süpürmek, her çağrıda tüm tabloyu taramaktan ucuz.
   */
  if random() < 0.01 then
    delete from public.edge_rate_limits
    where window_start < v_now - interval '1 day';
  end if;

  return v_hits <= p_max;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;

/*
 * `consume_rate_limit` gerçek gövdesi artık exposed `public` şemasında
 * değil. Edge Function PostgREST RPC yolunu kullanmaya devam edebilsin diye
 * `public` içinde yalnızca service_role-only, SECURITY INVOKER sarmalayıcı
 * kalıyor.
 */
create or replace function app.consume_rate_limit(
  p_bucket text,
  p_window_seconds integer,
  p_max integer
) returns boolean
language plpgsql
security definer
set search_path = ''
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

  if random() < 0.01 then
    delete from public.edge_rate_limits
    where window_start < v_now - interval '1 day';
  end if;

  return v_hits <= p_max;
end;
$$;

revoke all on function app.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function app.consume_rate_limit(text, integer, integer)
  to service_role;

comment on function app.consume_rate_limit(text, integer, integer) is
  'Kenar fonksiyonları için service_role-only kalıcı oran limiti sayacı.';

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_window_seconds integer,
  p_max integer
) returns boolean
language sql
security invoker
set search_path = ''
as $$
  select app.consume_rate_limit(p_bucket, p_window_seconds, p_max);
$$;

revoke all on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to service_role;

comment on function public.consume_rate_limit(text, integer, integer) is
  'PostgREST uyumluluğu için service_role-only sarmalayıcı; ayrıcalıklı gövde app.consume_rate_limit içindedir.';

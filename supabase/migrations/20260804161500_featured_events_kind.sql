-- Etkinlikler sayfasındaki hero kart artık yönetici seçimine bağlı.
-- Mevcut `featured_content` tablosu haber/yazı için kurulmuştu; aynı
-- sıralama tablosu etkinlik slug'ını da taşıyabilir.

do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'public.featured_content'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%kind%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.featured_content drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.featured_content
  add constraint featured_content_kind_check
  check (kind in ('haber', 'yazi', 'etkinlik'));

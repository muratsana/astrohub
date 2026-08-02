-- Patch Faz B — Ekipman ana navigasyondan kaldırıldı.
--
-- `0062` yeni kurulum tohumu artık `/ekipman`ı header'a koymuyor. Bu
-- göç mevcut canlı projelerde daha önce tohumlanmış ya da panelden
-- bırakılmış header satırını kapatır. Tam modül haritası ve route'lar
-- korunur; ekipman profil/araç akışında erişilebilir kalır.

update public.nav_links
   set enabled = false,
       updated_at = now()
 where menu = 'header'
   and path = '/ekipman'
   and enabled = true;

with sirali as (
  select
    id,
    row_number() over (order by position, label, id) as yeni_sira
  from public.nav_links
  where menu = 'header'
    and enabled = true
)
update public.nav_links n
   set position = s.yeni_sira,
       updated_at = now()
  from sirali s
 where n.id = s.id
   and n.position is distinct from s.yeni_sira;

do $$
declare
  olculen text[];
begin
  select array_agg(path order by position) into olculen
    from public.nav_links
   where menu = 'header'
     and enabled;

  if '/ekipman' = any(coalesce(olculen, array[]::text[])) then
    raise exception '20260802202412 ölçümü: /ekipman header menüsünde kaldı.';
  end if;
end $$;

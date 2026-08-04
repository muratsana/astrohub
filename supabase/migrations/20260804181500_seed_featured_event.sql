-- Başlangıç editoryal seçimi: etkinlik sayfasındaki öne çıkan kart
-- admin panelinden değiştirilebilir, ama prod boş başlamasın.
insert into public.featured_content (kind, slug, position) values
  ('etkinlik', 'halk-gozlemi', 0)
on conflict (kind, slug) do update set
  position = excluded.position,
  updated_at = now();

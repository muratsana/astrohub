-- İÇERİK KAYITLARI — haber ve yazıların veritabanı katmanı.
--
-- Haber ve yazı gövdeleri uygulamanın içindeki veri dosyalarındaydı.
-- Yeni bir haber yayımlamak kod değiştirip yeniden yayına almak
-- demekti; yani siteyi yönetmek için geliştirici gerekiyordu.
--
-- Tohum veri SİLİNMEDİ, yedek kaldı: veritabanı boşken site içeriksiz
-- kalmamalı. Okuma katmanı ikisini birleştiriyor ve aynı slug'ı taşıyan
-- veritabanı kaydı tohumun yerine geçiyor — böylece mevcut içerikler de
-- panelden düzenlenebilir hâle geliyor.
--
-- TASLAK/YAYINDA AYRIMINI RLS ÇİZİYOR: okuma politikası yalnızca
-- 'yayinda' satırlarını herkese açıyor, taslakları yalnızca yönetici
-- görüyor. Arayüzdeki filtre bir nezaket, sınır değil.

create table if not exists public.content_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('haber','yazi')),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,120}$'),
  title text not null,
  summary text not null default '',
  body text[] not null default '{}',
  category text not null,
  published_at date not null default current_date,
  status text not null default 'taslak' check (status in ('taslak','yayinda')),
  author text,
  duration text,
  level text,
  tint text,
  image_url text,
  image_credit text,
  image_licence text,
  source_name text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_entries_kind_idx
  on public.content_entries (kind, status, published_at desc);

alter table public.content_entries enable row level security;

drop policy if exists content_entries_read on public.content_entries;
create policy content_entries_read on public.content_entries
  for select using (status = 'yayinda' or app.is_admin());

drop policy if exists content_entries_write on public.content_entries;
create policy content_entries_write on public.content_entries
  for all using (app.is_admin()) with check (app.is_admin());

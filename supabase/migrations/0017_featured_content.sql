-- ÖNE ÇIKAN İÇERİK
--
-- Ana sayfada haber ve yazı şeritleri dörder satır gösteriyor. Hangi
-- dördü? Şimdiye kadar cevap "en yenisi" idi ve bu, editoryal bir kararı
-- tarih alanına devrediyordu: iyi bir rehber bir hafta sonra ana
-- sayfadan düşüyor, güncel ama önemsiz bir duyuru üste çıkıyordu.
--
-- Bu tablo yalnızca SIRALAMAYI taşır, içeriği değil. Haber ve yazı
-- gövdeleri hâlâ uygulama içindeki içerik dosyalarında; buradaki kayıt
-- bir slug'a "önce bunu göster" demekten ibaret. Böylece içerik şeması
-- (E3) henüz yokken de editoryal kontrol çalışıyor ve şema geldiğinde
-- bu tablo olduğu gibi duruyor.
--
-- SLUG'A YABANCI ANAHTAR YOK, olamaz da: karşılığı bir tabloda değil,
-- derlenmiş içerik verisinde. Silinen bir içeriğin kaydı burada
-- kalabilir; okuma katmanı eşleşmeyen slug'ı sessizce atlıyor. Bunun
-- alternatifi ana sayfayı boş bir karta düşürmek olurdu.

create table if not exists public.featured_content (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('haber', 'yazi')),
  slug text not null,
  -- Küçük olan önce. Aralık bırakmak yerine yeniden numaralandırıyoruz;
  -- liste dört-beş öğelik, karmaşık bir sıra yönetimi gereksiz.
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, slug)
);

create index if not exists featured_content_kind_position_idx
  on public.featured_content (kind, position);

alter table public.featured_content enable row level security;

-- Okuma herkese açık: ana sayfa oturum açmadan da doğru sırayı görmeli.
drop policy if exists featured_content_read on public.featured_content;
create policy featured_content_read
  on public.featured_content for select
  using (true);

-- Yazma yalnızca yöneticide. Arayüzdeki rol kontrolü bir nezaket;
-- sınırı çizen şey bu politika.
drop policy if exists featured_content_write on public.featured_content;
create policy featured_content_write
  on public.featured_content for all
  using (app.is_admin())
  with check (app.is_admin());

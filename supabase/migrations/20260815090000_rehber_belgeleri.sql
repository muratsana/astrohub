-- ══════════════════════════════════════════════════════════════════════
-- UZUN FORM REHBER BELGELERİ — PANELDEN DÜZENLENEBİLİR GÖVDE
--
-- SNR, kutup hizalaması ve drizzle rehberlerinin gövdeleri derleme
-- öncesi üretilip (`docs/*/standalone-kaynak.html` → `content.generated.ts`)
-- KOD olarak yaşıyordu. Blok tabanlı yazı modeline sığmadıkları için bu
-- doğru bir karardı (üçü toplam 16 tablo, 11 infografik, 12 canlı
-- hesaplayıcı taşıyor) — ama bedeli, yayındaki bir yazım hatasını
-- düzeltmek için depoyu değiştirip yeniden dağıtmaktı.
--
-- Bu tablo koddaki sürümün YERİNİ ALMIYOR, ÜSTÜNE YAZIYOR: kayıt yoksa
-- site koddaki tohumu çiziyor, kayıt varsa onu. Haber ve yazılarda
-- kullanılan `mergeWithSeed` deseninin aynısı. Kayıt silinirse koddaki
-- sürüm geri döner — geri alma ayrı bir mekanizma gerektirmiyor.
--
-- ── GÜVENLİK ────────────────────────────────────────────────────────
--
-- `segments` içeriği istemcide `dangerouslySetInnerHTML` ile basılıyor.
-- Eskiden HTML depoya işlenmiş sabit bir belgeden geliyordu ve üretici
-- betiği her koşuda doğruluyordu; artık yazılabilir bir yüzeyden geliyor.
-- Doğrulama iki yönlü ve istemcide (`domain/content/guide.ts`): yazarken
-- panel reddediyor, okurken sayfa süzüyor. Burada da JSONB yapısı için
-- bir kısıt var, ama asıl kapı orada — SQL'de HTML ayrıştırmak
-- güvenilmez olurdu.
--
-- YAZMA YALNIZCA admin / content_editor. Rehberler editoryal belge;
-- katkı akışı yok, dolayısıyla `submitted_by` benzeri bir sahiplik
-- sütunu da yok.
-- ══════════════════════════════════════════════════════════════════════

create table if not exists public.guide_documents (
  slug       text primary key,
  toc        jsonb not null default '[]'::jsonb,
  segments   jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,

  constraint guide_documents_slug_format
    check (slug ~ '^[a-z0-9-]{3,120}$'),
  /* Gövde bir DİZİ olmalı ve boş olmamalı: boş bir belge kaydetmek
     sayfayı beyaz bırakırdı. Tohuma dönmek isteyen kaydı SİLER. */
  constraint guide_documents_segments_array
    check (jsonb_typeof(segments) = 'array' and jsonb_array_length(segments) > 0),
  constraint guide_documents_toc_array
    check (jsonb_typeof(toc) = 'array')
);

comment on table public.guide_documents is
  'Uzun form rehberlerin panelden düzenlenmiş gövdesi. Kayıt yoksa site koddaki tohumu çizer.';

create index if not exists guide_documents_updated_idx
  on public.guide_documents (updated_at desc);

-- ── updated_at tetikleyicisi ────────────────────────────────────────
create or replace function app.guide_documents_touch()
returns trigger
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
begin
  new.updated_at := now();
  /* Kim yazdığı istemci payload'ından DEĞİL oturumdan alınıyor: aksi
     hâlde bir yönetici başkasının kimliğini yazabilirdi. */
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists guide_documents_touch on public.guide_documents;
create trigger guide_documents_touch
  before insert or update on public.guide_documents
  for each row execute function app.guide_documents_touch();

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.guide_documents enable row level security;

/* Okuma herkese açık: rehberler public içerik ve prerender edilmiş
   sayfa da anon anahtarla okuyor. Taslak kavramı YOK — kayıt varsa
   yayındadır; hazır olmayan metin kaydedilmez, kaydedilmemiş metin
   tohumdan çizilir. */
drop policy if exists guide_documents_read on public.guide_documents;
create policy guide_documents_read on public.guide_documents
  for select using (true);

drop policy if exists guide_documents_write on public.guide_documents;
create policy guide_documents_write on public.guide_documents
  for all to authenticated
  using (app.is_admin() or app.has_role('content_editor'))
  with check (app.is_admin() or app.has_role('content_editor'));

revoke all on public.guide_documents from anon, authenticated;
grant select on public.guide_documents to anon, authenticated;
grant insert, update, delete on public.guide_documents to authenticated;

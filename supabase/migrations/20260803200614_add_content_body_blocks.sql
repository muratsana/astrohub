-- Expand/contract geçişinin ilk adımı: eski `body text[]` korunur.
-- Eski istemciler yazmaya devam eder; yeni istemci `body_blocks` boşsa
-- `body` alanına düşer. Böylece uygulama ve migration ayrı ayrı geri
-- alınabilir.

alter table public.content_entries
  add column if not exists body_blocks jsonb not null default '[]'::jsonb;

alter table public.content_entries
  drop constraint if exists content_entries_body_blocks_array;

alter table public.content_entries
  add constraint content_entries_body_blocks_array
  check (jsonb_typeof(body_blocks) = 'array');

comment on column public.content_entries.body_blocks is
  'Kapalı şemalı içerik blokları; geçiş süresince body text[] yedeği korunur.';

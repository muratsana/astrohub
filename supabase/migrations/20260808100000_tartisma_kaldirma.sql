-- ═══════════════════════════════════════════════════════════════════════
-- TARTIŞMA İÇERİĞİNİ KALDIRMA   (Yenileme planı FAZ 5, görev 2 ve 3)
--
-- Plan görev 3: "Forum kaldırma: içerik yerine kural ihlali açıklaması
-- göster." Görev 2 de moderasyon eylemleri arasında "arşivle" istiyor.
--
-- ── ÖLÇÜM: KUYRUK ŞİKÂYETİ KAPATIYOR, İÇERİĞE DOKUNMUYOR ──────────────
--
-- `moderation_queue` üzerindeki karar yalnızca kuyruk satırının durumunu
-- değiştiriyordu. Moderatör "şikâyet haklı" diyordu ve şikâyet edilen
-- fotoğraf, yorum ya da gönderi yayında kalmaya devam ediyordu. FAZ 3
-- altı içerik tablosuna `deleted_at` ekledi ama tartışma tabloları o
-- kümede yoktu:
--
--   photo_comments · forum_threads · forum_posts   →  kaldırılamıyordu
--
-- ── İÇERİK SİLİNMİYOR, YERİNE AÇIKLAMA GEÇİYOR ────────────────────────
--
-- Forumda kaldırılan bir gönderiyi listeden düşürmek konuda delik açar:
-- okuyucu kendinden sonraki yanıtların neye cevap verdiğini anlayamaz ve
-- "sansür" algısı, açıklanmış bir kaldırmadan çok daha fazla tartışma
-- üretir. Bu yüzden satır YERİNDE KALIYOR; gövdesi boşalıyor ve yerine
-- kural ihlali açıklaması geçiyor.
--
-- ── KALDIRILAN METİN NEREYE GİDİYOR ───────────────────────────────────
--
-- Kanıt kaybolmamalı: itiraz gelirse "ne yazıyordu" sorusunun cevabı
-- lazım. Metin `public.removed_content` tablosuna taşınıyor ve o tablo
-- yalnızca admin+moderatöre açık.
--
-- Neden aynı tabloda `removed_body` kolonu DEĞİL: PostgreSQL kolon
-- düzeyinde yetki veriyor ama RLS'te herkes aynı `authenticated`
-- rolünde. Kolonu `authenticated`tan almak moderatörden de alırdı;
-- almamak ise şikâyet edilen metni herkese açık bırakırdı. Ayrı tablo bu
-- ikilemi ortadan kaldırıyor — yetki satır güvenliğiyle veriliyor.
--
-- Geri alma: `deleted_at` null'a çekilince tetikleyici gövdeyi geri
-- yazıyor ve saklanan kopyayı siliyor.
-- ═══════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.venue_events') is not null
     or to_regclass('public.studio_profiles') is not null then
    raise exception
      'YANLIŞ PROJE: venue_events/studio_profiles görüldü — burası StageHub. Göç durduruldu.';
  end if;
end
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 1 · KALDIRILAN METNİN ARŞİVİ
-- ══════════════════════════════════════════════════════════════════════

create table if not exists public.removed_content (
  target_type  text        not null,
  target_id    uuid        not null,
  body         text        not null,
  removed_at   timestamptz not null default now(),
  removed_by   uuid        references auth.users (id) on delete set null,
  primary key (target_type, target_id)
);

comment on table public.removed_content is
  'Kaldırılan tartışma içeriğinin metni. Yalnızca admin+moderatör okur; itiraz geldiğinde "ne yazıyordu" sorusunun cevabı burada.';

alter table public.removed_content enable row level security;

drop policy if exists removed_content_read on public.removed_content;
create policy removed_content_read on public.removed_content
  for select using (app.is_admin() or app.has_role('moderator'));

/* Yazma yalnızca tetikleyiciden: fonksiyon `security definer` ve
   politikaları aşıyor. İstemciye açık bir yazma yolu bilerek yok —
   kimse buraya elle satır koymamalı. */

-- ══════════════════════════════════════════════════════════════════════
-- 2 · TARTIŞMA TABLOLARINA KALDIRMA ALANLARI
--
-- `removal_reason` HERKESE AÇIK ve bu kasıtlı: kaldırmanın gerekçesi
-- kaldırmanın kendisi kadar görünür olmalı. Plan görev 3'ün istediği
-- "kural ihlali açıklaması" bu kolon.
-- ══════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  foreach t in array array['photo_comments', 'forum_threads', 'forum_posts']
  loop
    execute format(
      'alter table public.%I
         add column if not exists deleted_at     timestamptz,
         add column if not exists deleted_by     uuid references auth.users (id) on delete set null,
         add column if not exists removal_reason text', t);

    execute format(
      'comment on column public.%I.removal_reason is
         ''Kaldırma gerekçesi. İçeriğin YERİNE gösterilir — herkese açık.''', t);

    execute format(
      'create index if not exists %I on public.%I (deleted_at) where deleted_at is null',
      t || '_yasayanlar_idx', t);
  end loop;
end
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 3 · KALDIRMA TETİKLEYİCİSİ — gövde taşınıyor, açıklama kalıyor
--
-- FAZ 3'ün `app.icerik_silme_izi()` fonksiyonundan ayrı, çünkü o yalnızca
-- damga vuruyor; burada metnin taşınması da var. Denetim kaydı ikisinde
-- de aynı biçimde düşüyor.
-- ══════════════════════════════════════════════════════════════════════

create or replace function app.tartisma_kaldirma()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  /* ── Yalnızca moderatör kaldırır ve yalnızca moderatör geri alır ──
     `*_update_own` politikaları yazara kendi satırını güncelletiyor ve o
     politikada `deleted_at` üzerinde hiçbir koşul yok. Bu kapı olmadan
     yazar iki şeyi yapabilirdi:
       · kendi gönderisine uydurma bir "kural ihlali" metni yazdırmak —
         gövde silinir ama yerine vurgulu bir kutuda istediği metin geçer,
       · moderatörün kaldırdığı gönderide `deleted_at`i null'a çekip
         gövdeyi arşivden geri getirmek.
     İkincisi doğrudan moderasyonu geçersiz kılıyordu.

     `auth.uid() is null` durumu bilerek muaf: oraya yalnızca service_role
     ya da doğrudan SQL düşer, ikisi de zaten RLS'in üstünde. Anonim
     kullanıcı bu tetikleyiciye hiç ulaşamıyor — güncelleme politikalarının
     tamamı kimlik istiyor. */
  if old.deleted_at is distinct from new.deleted_at
     and auth.uid() is not null
     and not (app.is_admin() or app.has_role('moderator')) then
    raise exception 'Bu içeriği yalnızca moderatör kaldırabilir ya da geri alabilir.'
      using errcode = 'insufficient_privilege';
  end if;

  /* ── Kaldırıldı ── */
  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_by := auth.uid();

    /* Gerekçesiz kaldırma yok: plan görev 3 içeriğin YERİNE açıklama
       konmasını istiyor ve boş bir açıklama, içeriği sessizce yok
       etmekle aynı şey olurdu. */
    if coalesce(btrim(new.removal_reason), '') = '' then
      raise exception 'Kaldırma gerekçesi zorunlu — içeriğin yerine bu metin gösterilecek.'
        using errcode = 'check_violation';
    end if;

    /* Metin arşive taşınıyor, satırdan siliniyor. */
    insert into public.removed_content (target_type, target_id, body, removed_by)
    values (tg_table_name, new.id, old.body, auth.uid())
    on conflict (target_type, target_id) do update
      set body = excluded.body,
          removed_at = now(),
          removed_by = excluded.removed_by;

    new.body := '';

    insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'content.removed', tg_table_name, new.id::text,
            jsonb_build_object('gerekce', new.removal_reason,
                               'uzunluk', length(old.body)));

  /* ── Geri alındı ── */
  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;
    new.removal_reason := null;

    /* Gövde arşivden geri yazılıyor. Kayıt yoksa (elle düzeltilmiş bir
       satır) gövde olduğu gibi bırakılıyor — boş bir gövdeyi geri
       getirmek için uydurma metin yazmaktansa boş kalsın. */
    select r.body into new.body
      from public.removed_content r
     where r.target_type = tg_table_name and r.target_id = new.id;

    if new.body is null then
      new.body := old.body;
    end if;

    delete from public.removed_content
     where target_type = tg_table_name and target_id = new.id;

    insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'content.restored', tg_table_name, new.id::text, '{}'::jsonb);
  end if;

  return new;
end;
$$;

comment on function app.tartisma_kaldirma() is
  'Yorum ve forum içeriğini kaldırır: gövdeyi removed_content''e taşır, yerine gerekçe bırakır. Geri almada gövdeyi geri yazar.';

do $$
declare
  t text;
begin
  foreach t in array array['photo_comments', 'forum_threads', 'forum_posts']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_kaldirma', t);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function app.tartisma_kaldirma()',
      t || '_kaldirma', t);
  end loop;
end
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 4 · KİM KALDIRABİLİR
--
-- Yorumu SAHİBİ de silebiliyordu ve o yol duruyor (kendi yorumunu
-- silmek moderasyon değil). Buraya eklenen, MODERATÖRÜN kaldırabilmesi.
--
-- `forum_threads` ve `forum_posts` bugün tohum veriden besleniyor ve
-- tablolarında yazma politikası dar; moderatör satırı bu politikayla
-- güncelleyebiliyor.
-- ══════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  foreach t in array array['photo_comments', 'forum_threads', 'forum_posts']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_moderate', t);
    execute format(
      'create policy %I on public.%I for update to authenticated '
      || 'using (app.is_admin() or app.has_role(''moderator'')) '
      || 'with check (app.is_admin() or app.has_role(''moderator''))',
      t || '_moderate', t);
  end loop;
end
$$;

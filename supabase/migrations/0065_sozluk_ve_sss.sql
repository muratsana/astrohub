-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 11 — TERİMLER SÖZLÜĞÜ VE SSS (§14.9)
--
-- ══════════════════════════════════════════════════════════════════════════
-- YENİ TABLO YOK — FAZIN KENDİ KURALI BUNU EMREDİYOR
--
-- §14'ün açılışı "çakışan modülleri birleştir" diyor. Sözlük ve SSS için
-- ayrı tablo açmadan önce `content_entries` incelendi ve §14.9'un
-- istediği her alanın ZATEN ORADA olduğu görüldü:
--
--     §14.9 maddesi              content_entries karşılığı
--     ─────────────────────      ─────────────────────────
--     içerik seviyesi            level
--     okuma süresi               duration
--     editoryal doğrulama        status ('taslak' / 'yayinda')
--     kaynak                     source_name, source_url
--     güncelleme tarihi          updated_at
--     kaydetme                   slug (koleksiyon zaten slug'a bakıyor)
--
-- Ayrı tablo açmak; ikinci bir RLS politikası, ikinci bir panel yüzeyi,
-- ikinci bir okuma katmanı ve zamanla ayrışan iki "yayınla" akışı
-- demekti. Tek gereken `kind` listesine iki değer eklemek.
--
-- ══════════════════════════════════════════════════════════════════════════
-- `sozluk` VE `sss` ALANLARI NASIL KULLANIYOR
--
--   sozluk → title: terim, summary: tek cümlelik tanım,
--            body: uzun açıklama, category: alan (optik/isleme/gokyuzu…)
--   sss    → title: SORU, summary: kısa cevap, body: uzun cevap
--
-- `published_at` ikisinde de var ama sözlükte anlamsız; liste alfabetik
-- sıralanıyor (aşağıdaki indeks). Sütunu kaldırmıyoruz — `not null` ve
-- varsayılanı var, boş geçmek serbest.
-- ══════════════════════════════════════════════════════════════════════════

alter table public.content_entries drop constraint if exists content_entries_kind_check;
alter table public.content_entries
  add constraint content_entries_kind_check
  check (kind in ('haber', 'yazi', 'sozluk', 'sss'));

/* Sözlük ALFABETİK geziliyor, tarihe göre değil. Mevcut
   `content_entries_kind_idx` (kind, status, published_at desc) sözlük
   sorgusuna hizmet etmiyor: oradaki sıralama sütunu yanlış. */
create index if not exists content_entries_alpha_idx
  on public.content_entries (kind, status, title);

-- ══════════════════════════════════════════════════════════════════════════
-- TOHUM YOK — VE BU BİLİNÇLİ
--
-- Haber/yazı tarafında tohum KODDA duruyor (`features/*/data.ts`) ve
-- `mergeWithSeed` veritabanı kaydını üstüne yazıyor. Sözlük ve SSS de
-- aynı deseni kullanıyor: başlangıç içeriği `features/knowledge/` içinde,
-- panelden eklenen kayıt onu geçersiz kılıyor.
--
-- Tohumu buraya SQL olarak da koymak, aynı metnin iki yerde yaşaması
-- demekti — 0058'in `home_modules` tohumunda yaşadığımız ayrışmanın
-- aynısı. Metin tek yerde: kodda.
-- ══════════════════════════════════════════════════════════════════════════

-- ── Ölçüm ────────────────────────────────────────────────────────────────
do $$
declare
  yasak text;
begin
  /* Yeni türler kabul ediliyor mu? */
  begin
    insert into public.content_entries (kind, slug, title, category)
    values ('sozluk', '0065-olcum-terim', 'Ölçüm terimi', 'olcum'),
           ('sss',    '0065-olcum-soru',  'Ölçüm sorusu?', 'olcum');
  exception when check_violation then
    raise exception '0065 ölçümü: `sozluk`/`sss` türleri kabul edilmedi.';
  end;

  /* Eski türler bozulmadı mı? */
  insert into public.content_entries (kind, slug, title, category)
  values ('yazi', '0065-olcum-yazi', 'Ölçüm yazısı', 'rehber');

  /* Uydurma bir tür hâlâ reddediliyor mu? Kısıt gevşetilirken yanlışlıkla
     kaldırılsaydı panelden her şey yazılabilir hâle gelirdi. */
  yasak := null;
  begin
    insert into public.content_entries (kind, slug, title, category)
    values ('uydurma', '0065-olcum-kotu', 'Olmamalı', 'x');
    yasak := 'kabul edildi';
  exception when check_violation then
    yasak := 'reddedildi';
  end;

  if yasak <> 'reddedildi' then
    raise exception '0065 ölçümü: bilinmeyen `kind` değeri % — kısıt gevşemiş.', yasak;
  end if;

  delete from public.content_entries where slug like '0065-olcum-%';
  raise notice '0065 ölçümü geçti: sozluk/sss kabul, eski türler sağlam, uydurma tür reddediliyor.';
end $$;

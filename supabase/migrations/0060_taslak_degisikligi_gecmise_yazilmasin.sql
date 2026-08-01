-- ══════════════════════════════════════════════════════════════════════════
-- FAZ 10 — TASLAK OYNAMASI DEĞİŞİKLİK GEÇMİŞİNİ KİRLETMESİN
--
-- BULUNUŞU: 0059 sonrası ana sayfa akışı canlı projede uçtan uca ölçüldü
-- (iki `save_home_draft` + bir `publish_home_draft`, iki modül üzerinde).
-- Beklenen 2 geçmiş satırıydı, 4 çıktı. Fazladan ikisi taslak
-- kaydetmelerinden geliyordu ve `reason` alanları boştu.
--
-- SEBEP: `home_modules_history` tetikleyicisi tabloya yapılan HER
-- güncellemede çalışıyor. `save_home_draft` de `home_modules`i
-- güncelliyor (`draft` kolonunu yazıyor), dolayısıyla tetikleyici için
-- taslak yazmasıyla yayımlama arasında hiçbir fark yok.
--
-- NEDEN ÖNEMLİ: §13.3'ün istediği şey "kim değiştirdi / önceki değer /
-- yeni değer / gerekçe / rollback" — yani CANLI yapılandırmanın tarihi.
-- Taslak henüz canlı değil; yayımlanana kadar hiçbir ziyaretçi onu
-- görmüyor. Yönetici bir modülün başlığını yazarken on kere kaydederse
-- geçmişe on satır düşüyor ve gerçek yayımlama satırı aralarında
-- kayboluyor. Üstelik her satır modül satırının TAM jsonb kopyasını
-- (taslak blob'u dahil) iki kez saklıyor.
--
-- Arayüz tarafındaki `summarize()` bu satırları zaten "Değer değişmedi"
-- diye özetliyordu — çünkü `draft` gizli alanlar listesinde. Yani panel
-- kullanıcıya boş satırlar gösteriyordu: kaydın var olması için bir
-- sebep yok, gösterilecek bir içeriği de yok.
--
-- ══════════════════════════════════════════════════════════════════════════
-- ÇÖZÜM: DEĞİŞİKLİK KARŞILAŞTIRMASINDAN `draft` DÜŞÜLÜYOR
--
-- Tetikleyicide zaten bir "hiçbir şey değişmediyse yazma" dalı vardı;
-- karşılaştırmadan `updated_at` ve `updated_by` düşülüyordu. `draft` de
-- aynı sınıfa giriyor: değişmesi tek başına kayda değer bir olay değil.
--
-- Böylece:
--   · yalnız taslak değişti          → geçmişe YAZILMAZ
--   · taslak + canlı alan değişti    → yazılır (canlı alan değiştiği için)
--   · yayımlama (canlı alanlar + draft=null) → yazılır, gerekçesiyle
--
-- NEDEN TETİKLEYİCİYİ `save_home_draft` İÇİN KAPATMADIK: ilk akla gelen
-- çözüm `save_home_draft` içinde bir `set_config` bayrağı kaldırıp
-- tetikleyicide ona bakmaktı. Yapılmadı — o bayrak, tabloyu BAŞKA bir
-- yoldan güncelleyen herhangi bir kodun geçmişten kaçmasına da izin
-- verirdi. Buradaki kural verinin kendisine bakıyor: neyin değiştiği
-- önemli, kimin değiştirdiği değil.
--
-- KAPSAM: `record_setting_change` dört tablo tarafından paylaşılıyor
-- (`app_settings`, `home_modules`, `nav_links`, `feature_flags`).
-- Diğer üçünde `draft` diye bir kolon YOK; `jsonb - 'draft'` olmayan bir
-- anahtarda etkisiz olduğu için onların davranışı birebir aynı kalıyor.
-- ══════════════════════════════════════════════════════════════════════════

create or replace function app.record_setting_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'app', 'pg_temp'
as $function$
declare
  kapsam  text := tg_table_name;
  anahtar text;
  eski    jsonb;
  yeni    jsonb;
  gerekce text;
  riskli  boolean := false;
begin
  gerekce := nullif(current_setting('astrohub.reason', true), '');

  if tg_op = 'DELETE' then
    eski := to_jsonb(old);
    yeni := null;
  elsif tg_op = 'INSERT' then
    eski := null;
    yeni := to_jsonb(new);
  else
    eski := to_jsonb(old);
    yeni := to_jsonb(new);
    -- `draft`: yayımlanmamış değişiklik canlı yapılandırma değildir.
    if eski - 'updated_at' - 'updated_by' - 'draft'
     = yeni - 'updated_at' - 'updated_by' - 'draft' then
      return coalesce(new, old);
    end if;
  end if;

  anahtar := coalesce(yeni ->> 'key', eski ->> 'key', yeni ->> 'id', eski ->> 'id');

  if kapsam = 'feature_flags' then
    riskli := coalesce((yeni ->> 'high_risk')::boolean, (eski ->> 'high_risk')::boolean, false)
              and (eski ->> 'enabled') is distinct from (yeni ->> 'enabled');
  elsif kapsam = 'app_settings' then
    riskli := anahtar in ('maintenance', 'billing', 'quotas');
  end if;

  if riskli and gerekce is null then
    raise exception 'Bu değişiklik gerekçe gerektiriyor (%).', anahtar
      using errcode = '22023',
            hint = 'İstemci set local astrohub.reason ile gerekçe göndermeli.';
  end if;

  insert into public.setting_history (scope, record_key, old_value, new_value, reason, actor_id)
  values (kapsam, coalesce(anahtar, '?'), eski, yeni, gerekce, auth.uid());

  return coalesce(new, old);
end;
$function$;

-- ── Ölçüm ────────────────────────────────────────────────────────────────
-- Taslak yazması geçmişe düşmemeli, yayımlama düşmeli.
do $$
declare
  -- Silme sınırı KİMLİK olmalı, sayım değil: geçmişten daha önce satır
  -- silinmişse count(*) ile max(id) birbirini tutmaz ve `id > count`
  -- ölçümle ilgisi olmayan satırları silerdi.
  sinir_id   bigint;
  ilk_limit  integer;
  onceki     bigint;
  taslakli   bigint;
  yayinli    bigint;
begin
  select coalesce(max(id), 0), count(*) into sinir_id, onceki
    from public.setting_history;

  -- Geri yükleme değeri ÖLÇÜLÜYOR, varsayılmıyor.
  select item_limit into ilk_limit from public.home_modules where key = 'news';
  if ilk_limit is null then
    raise exception '0060 ölçümü: `news` modülü yok.';
  end if;

  -- 1) yalnızca taslak değişimi → geçmişe yazılmamalı
  update public.home_modules
     set draft = jsonb_build_object('item_limit', ilk_limit + 1)
   where key = 'news';
  select count(*) into taslakli from public.setting_history;

  if taslakli <> onceki then
    raise exception 'Taslak değişimi geçmişe yazıldı (% -> %)', onceki, taslakli;
  end if;

  -- 2) canlı alan değişimi (taslak temizlenerek — yayımlamanın yaptığı şey)
  update public.home_modules
     set item_limit = ilk_limit + 1, draft = null
   where key = 'news';
  select count(*) into yayinli from public.setting_history;

  if yayinli <> taslakli + 1 then
    raise exception 'Yayımlama geçmişe yazılmadı (% -> %)', taslakli, yayinli;
  end if;

  -- ölçüm izlerini geri al
  update public.home_modules set item_limit = ilk_limit where key = 'news';
  delete from public.setting_history where id > sinir_id;

  raise notice '0060 ölçümü geçti: taslak yazılmadı, yayımlama yazıldı.';
end $$;

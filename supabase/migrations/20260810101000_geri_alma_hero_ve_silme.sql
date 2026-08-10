-- ═══════════════════════════════════════════════════════════════════════
-- GERİ ALMA: HERO'YU TANIMIYORDU, SİLMEYİ HİÇ TANIMIYORDU
--
-- ── BULUNTU ───────────────────────────────────────────────────────────
--
-- Geçmiş tetikleyicisi (`app.record_setting_change`) BEŞ tabloya bağlı:
-- app_settings, feature_flags, home_modules, nav_links, hero_slides.
-- `rollback_setting` ise yalnızca DÖRDÜNÜ tanıyordu — `hero_slides` dalı
-- hiç yazılmamıştı.
--
-- Eksik dalın sonucu SESSİZ BAŞARIydı, hata değil: fonksiyon hiçbir
-- koşula girmeden devam ediyor, geçmiş satırını "geri alındı" diye
-- işaretliyor ve denetim kaydına `settings.rollback` yazıyordu. Panel
-- hata almadığı için "Geri al" düğmesi çalışmış görünüyordu. Yönetici
-- bir hero başlığını geri alır, listeyi yeniler, başlık eski hâline
-- dönmemiş olurdu — ve geçmişte "geri alma" rozeti duruyor olurdu.
--
-- ── AYNI SESSİZLİĞİN İKİNCİ HÂLİ: SİLİNMİŞ SATIR ──────────────────────
--
-- Tanınan dörtte de geri alma tek bir `update`. Silinmiş bir satır için
-- `update … where key = …` HİÇBİR satırla eşleşmez ve yine hata vermez.
-- `nav_links` için bu bugün de ulaşılabilir bir yol: panelde "Sil" var,
-- silinen bağlantının geçmiş kaydında `old_value` dolu, "Geri al" düğmesi
-- görünüyor — ve hiçbir şey yapmıyordu.
--
-- Bu göç hero slaydı silmeyi açan 20260810100000'in eşi: silmeyi
-- eklemek, geri almayı çalışır hâle getirmeden yarım bir iş olurdu.
--
-- ── ÜÇ DEĞİŞİKLİK ─────────────────────────────────────────────────────
--
--   1. `hero_slides` dalı eklendi.
--   2. Satır yoksa (silinmişse) GERİ YAZILIYOR — `jsonb_populate_record`
--      ile, sütun sütun değil: geçmişteki JSON zaten satırın tamamı.
--      Sütun listesi tekrar edilseydi, tabloya eklenen her yeni sütun
--      burayı sessizce eksik bırakırdı.
--   3. Tanınmayan kapsam ve sıfır satır artık HATA. Gelecekte tetikleyici
--      altıncı bir tabloya bağlanır ve buraya dalı yazılmazsa, sessizce
--      yalan söylemek yerine gürültüyle duruyor.
--
-- Geri alma: fonksiyonun önceki hâli yeniden yüklenir; veri değişmiyor.
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

create or replace function public.rollback_setting(
  gecmis_id bigint,
  gerekce text default null
)
returns void
language plpgsql
security definer
set search_path to 'public', 'app', 'pg_temp'
as $function$
declare
  kayit    public.setting_history%rowtype;
  etkilnen integer := 0;
  hero     public.hero_slides%rowtype;
  bag      public.nav_links%rowtype;
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  select * into kayit from public.setting_history where id = gecmis_id;
  if not found then
    raise exception 'Geçmiş kaydı bulunamadı: %', gecmis_id using errcode = '22023';
  end if;

  if kayit.old_value is null then
    raise exception 'Bu kayıt bir oluşturma; geri alınacak önceki değer yok.'
      using errcode = '22023';
  end if;

  perform set_config('astrohub.reason', coalesce(gerekce, 'Geri alma: #' || gecmis_id), true);

  if kayit.scope = 'app_settings' then
    update public.app_settings
       set value = kayit.old_value -> 'value', updated_at = now(), updated_by = auth.uid()
     where key = kayit.record_key;
    get diagnostics etkilnen = row_count;

  elsif kayit.scope = 'feature_flags' then
    update public.feature_flags
       set enabled = (kayit.old_value ->> 'enabled')::boolean,
           updated_at = now(), updated_by = auth.uid()
     where key = kayit.record_key;
    get diagnostics etkilnen = row_count;

  elsif kayit.scope = 'home_modules' then
    update public.home_modules
       set title           = kayit.old_value ->> 'title',
           subtitle        = kayit.old_value ->> 'subtitle',
           enabled         = (kayit.old_value ->> 'enabled')::boolean,
           position        = (kayit.old_value ->> 'position')::integer,
           item_limit      = (kayit.old_value ->> 'item_limit')::integer,
           layout          = kayit.old_value ->> 'layout',
           hide_when_empty = (kayit.old_value ->> 'hide_when_empty')::boolean,
           publish_from    = (kayit.old_value ->> 'publish_from')::timestamptz,
           publish_to      = (kayit.old_value ->> 'publish_to')::timestamptz,
           show_mobile     = (kayit.old_value ->> 'show_mobile')::boolean,
           show_desktop    = (kayit.old_value ->> 'show_desktop')::boolean,
           updated_at = now(), updated_by = auth.uid()
     where key = kayit.record_key;
    get diagnostics etkilnen = row_count;

  elsif kayit.scope = 'nav_links' then
    update public.nav_links
       set menu        = kayit.old_value ->> 'menu',
           group_label = kayit.old_value ->> 'group_label',
           label       = kayit.old_value ->> 'label',
           path        = kayit.old_value ->> 'path',
           position    = (kayit.old_value ->> 'position')::integer,
           enabled     = (kayit.old_value ->> 'enabled')::boolean,
           new_tab     = (kayit.old_value ->> 'new_tab')::boolean,
           auth_only   = (kayit.old_value ->> 'auth_only')::boolean,
           updated_at = now(), updated_by = auth.uid()
     where id = kayit.record_key::uuid;
    get diagnostics etkilnen = row_count;

    /* Satır yoksa silinmiş demektir: aynı kimlikle geri yazılıyor, böylece
       bu bağlantıya işaret eden geçmiş kayıtları anlamını koruyor. */
    if etkilnen = 0 then
      bag := jsonb_populate_record(null::public.nav_links, kayit.old_value);
      bag.updated_at := now();
      bag.updated_by := auth.uid();
      insert into public.nav_links select bag.*;
      etkilnen := 1;
    end if;

  elsif kayit.scope = 'hero_slides' then
    /* `key` ve `scene` DAHİL her sütun geri yazılıyor. Güncelleme yolunda
       ikisi değişmez sayılırdı; burada geçmişteki satırın tamamına
       dönüyoruz, o yüzden ayrım yapmıyoruz. */
    hero := jsonb_populate_record(null::public.hero_slides, kayit.old_value);
    hero.updated_at := now();
    hero.updated_by := auth.uid();

    update public.hero_slides
       set badge         = hero.badge,
           title         = hero.title,
           subtitle      = hero.subtitle,
           cta_label     = hero.cta_label,
           cta_to        = hero.cta_to,
           scene         = hero.scene,
           tint          = hero.tint,
           image_url     = hero.image_url,
           image_credit  = hero.image_credit,
           image_licence = hero.image_licence,
           focal_x       = hero.focal_x,
           focal_y       = hero.focal_y,
           text_align    = hero.text_align,
           position      = hero.position,
           enabled       = hero.enabled,
           publish_from  = hero.publish_from,
           publish_to    = hero.publish_to,
           updated_at    = hero.updated_at,
           updated_by    = hero.updated_by
     where key = kayit.record_key;
    get diagnostics etkilnen = row_count;

    if etkilnen = 0 then
      begin
        insert into public.hero_slides select hero.*;
      exception when unique_violation then
        /* `position` benzersiz: silinen slaydın sırasını bu arada başka
           bir slayt almış olabilir. Ham Postgres metni yerine ne yapılması
           gerektiğini söylüyoruz. */
        raise exception
          'Slayt geri alınamadı: % sırası artık başka bir slaytta. Önce sırayı boşaltın.',
          hero.position
          using errcode = '22023';
      end;
      etkilnen := 1;
    end if;

  else
    /* Tetikleyici bu kapsamı yazıyor ama geri alma tanımıyor. Sessizce
       "başarılı" dönmek, yöneticiye olmayan bir geri almayı doğrulamak
       olurdu. */
    raise exception 'Bu kapsam için geri alma tanımlı değil: %', kayit.scope
      using errcode = '22023',
            hint = 'rollback_setting içine bu tablonun dalı eklenmeli.';
  end if;

  if etkilnen = 0 then
    raise exception 'Geri alma hiçbir satıra dokunmadı (%, %).',
      kayit.scope, kayit.record_key
      using errcode = '22023';
  end if;

  /* İşareti KAYDIN KENDİ satır dizisi içinde arıyoruz. `max(id)` tüm
     tablodaydı: aynı anda başka bir ayar değişirse geri alma rozeti
     alakasız bir satıra yapışırdı. */
  update public.setting_history
     set rolled_back_from = gecmis_id
   where id = (
     select max(id) from public.setting_history
      where scope = kayit.scope and record_key = kayit.record_key
   );

  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (auth.uid(), 'settings.rollback', kayit.scope, kayit.record_key,
          jsonb_build_object('gecmis_id', gecmis_id, 'gerekce', gerekce));
end;
$function$;

comment on function public.rollback_setting(bigint, text) is
  'Geçmiş kaydındaki önceki değeri geri yazar. Silinmiş satır yeniden '
  'oluşturulur; tanınmayan kapsam ve sıfır satır hata verir — sessiz '
  'başarı, olmayan bir geri almayı doğrulamak demekti.';

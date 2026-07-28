-- 0014_equipment_setup_fields.sql
--
-- SETUP PLANLAYICISININ İHTİYAÇ DUYDUĞU TEKNİK ALANLAR.
--
-- Ekipman modülü artık bir katalog değil bir planlama aracı: montür
-- kapasitesi, backfocus zinciri, vinyet ve bağlantı uyumluluğu hesaplıyor.
-- Bu hesaplar 0008'de olmayan alanlara ihtiyaç duyuyor.
--
-- NEDEN KOLON, NEDEN JSONB
-- Filtrelenecek ve hesaba girecek alanlar (bağlantı standardı, optik
-- uzunluk, görüntü çemberi, üretim durumu) ayrı kolon: bunlar üzerinden
-- "M48 çıkışlı reducer'lar" gibi sorgular çalışacak ve indekslenebilir
-- olmaları gerekiyor. Kaynak listesi ve doküman bağlantıları JSONB:
-- sorgulanmıyorlar, yalnızca gösteriliyorlar.
--
-- HİÇBİR ALAN ZORUNLU DEĞİL. Katalogdaki her ürünün her değeri elimizde
-- yok ve olmayan bir değeri "yaygın olan" ile doldurmak, hesaplama
-- motorunun uydurma sonuç üretmesi demek olurdu. Motor `null` gördüğünde
-- "veri yetersiz" diyor; şema bunu mümkün kılıyor.

alter table public.equipment_models
  /* ── Fiziksel bağlantı ── */
  add column if not exists connection_input  text,
  add column if not exists connection_output text,

  /* ── Optik ve mekanik ölçüler ── */
  /** Işığın geçtiği net açıklık, mm — vinyet hesabının girdisi. */
  add column if not exists clear_aperture_mm numeric(6,2),
  /** Düzeltilmiş görüntü çemberi çapı, mm. */
  add column if not exists image_circle_mm numeric(6,2),
  /** Parçanın optik yola kattığı uzunluk, mm (OAG, filtre çarkı, rotator). */
  add column if not exists optical_length_mm numeric(6,2),
  /** Düzelticinin sensöre kadar istediği mesafe, mm. */
  add column if not exists required_backfocus_mm numeric(6,2),
  /** Kameranın flanş–sensör mesafesi, mm. */
  add column if not exists flange_distance_mm numeric(6,2),
  /** Reducer (<1) ya da barlow (>1) çarpanı. */
  add column if not exists optic_factor numeric(5,3),
  /** Filtre camı kalınlığı, mm. */
  add column if not exists filter_thickness_mm numeric(5,2),
  /** OAG prizma ölçüsü, mm. */
  add column if not exists prism_size_mm numeric(5,2),

  /* ── Ürün yaşam döngüsü ── */
  add column if not exists production_status text
    not null default 'bilinmiyor',
  add column if not exists release_year smallint,
  add column if not exists discontinued_year smallint,

  /* ── Kaynak ve doğrulama ── */
  /** [{kind, label, url}] — gösterilir, sorgulanmaz. */
  add column if not exists sources jsonb not null default '[]'::jsonb,
  add column if not exists verified_at date,
  add column if not exists data_confidence text;

/*
 * Üretim durumu ve güven seviyesi serbest metin OLMAMALI.
 * "üretimde değil", "discontinued", "üretimi durduruldu" üç ayrı değer
 * gibi görünür ve filtre hiçbirini bulamaz.
 */
alter table public.equipment_models
  drop constraint if exists equipment_production_status_valid;
alter table public.equipment_models
  add constraint equipment_production_status_valid
  check (production_status in ('guncel', 'uretimi-durduruldu', 'eski-model', 'bilinmiyor'));

alter table public.equipment_models
  drop constraint if exists equipment_confidence_valid;
alter table public.equipment_models
  add constraint equipment_confidence_valid
  check (
    data_confidence is null
    or data_confidence in ('dogrulanmis', 'tek-kaynak', 'inceleme-gerekli')
  );

/*
 * Çarpan pozitif olmalı: sıfır çarpan efektif odağı sıfırlar ve piksel
 * ölçeği sonsuza gider. Negatif çarpanın fiziksel karşılığı yok.
 */
alter table public.equipment_models
  drop constraint if exists equipment_factor_positive;
alter table public.equipment_models
  add constraint equipment_factor_positive
  check (optic_factor is null or optic_factor > 0);

/*
 * Üretimden kalkış yılı çıkış yılından önce olamaz. Bu, veri girişinde
 * en sık yapılan hata ve fark edilmesi zor — kısıt sınırda yakalıyor.
 */
alter table public.equipment_models
  drop constraint if exists equipment_year_order;
alter table public.equipment_models
  add constraint equipment_year_order
  check (
    release_year is null
    or discontinued_year is null
    or discontinued_year >= release_year
  );

comment on column public.equipment_models.connection_output is
  'Kameraya bakan bağlantı standardı; domain/equipment/connections listesinden.';
comment on column public.equipment_models.optical_length_mm is
  'Backfocus zincirine eklenen uzunluk. Null ise motor "veri yetersiz" der.';
comment on column public.equipment_models.data_confidence is
  'Teknik değerlerin kaynak gücü. inceleme-gerekli = kaynaklar çelişiyor.';

/* Setup planlayıcısının en sık sorgusu: "bu bağlantıya takılan parçalar". */
create index if not exists equipment_models_connection_idx
  on public.equipment_models (connection_input, connection_output);

/* Eksik teknik veri raporu için: yönetici hangi kayıtların boş olduğunu
   listeliyor. Kısmi indeks, tam tabloyu taramaktan çok daha ucuz. */
create index if not exists equipment_models_missing_data_idx
  on public.equipment_models (category_id)
  where connection_input is null and connection_output is null;

-- ══════════════════════════════════════════════════════════════════════════
-- KULLANICI ENVANTERİ VE KAYITLI SETUP'LAR
-- ══════════════════════════════════════════════════════════════════════════

/*
 * "Ekipmanlarım": kullanıcının sahip olduğu modeller.
 *
 * Yalnızca referans saklanıyor — modelin teknik verisi düzeldiğinde
 * envanterdeki kayıt da düzeliyor. Kopyalasaydık kullanıcının listesi
 * eskimiş değerlerle donardı.
 */
create table if not exists public.user_equipment (
  user_id    uuid not null references auth.users (id) on delete cascade,
  model_id   uuid not null references public.equipment_models (id) on delete cascade,
  /** Kullanıcının kendi ölçtüğü ağırlık — katalog değerini geçersiz kılar. */
  weight_override_kg numeric(6,2),
  note       text,
  added_at   timestamptz not null default now(),
  primary key (user_id, model_id)
);

comment on table public.user_equipment is
  'Kullanıcının sahip olduğu ekipmanlar; setup kurarken listesi öne çıkar.';

/*
 * Kayıtlı setup'lar.
 *
 * `slots` JSONB çünkü yuva kümesi kod tarafında evriliyor (rotator,
 * tilt plate, filter drawer…) ve her yeni yuva için migration yazmak
 * modülü dondururdu. Yuva DEĞERLERİ ise model slug'ı — yani katalog
 * referansı, kopyalanmış sayı değil.
 */
create table if not exists public.user_setups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text not null default '',
  purpose     text,
  visibility  text not null default 'ozel',
  is_default  boolean not null default false,
  /** { "montur": "sw-eq6r-pro", "optik": "sw-esprit-100", … } */
  slots       jsonb not null default '{}'::jsonb,
  spacer_mm   numeric(6,2) not null default 0,
  extra_weight_kg numeric(6,2) not null default 0,
  seeing_arcsec numeric(4,2) not null default 3,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint user_setups_name_length check (char_length(name) between 1 and 120),
  constraint user_setups_visibility_valid
    check (visibility in ('ozel', 'profilde', 'herkese-acik')),
  constraint user_setups_seeing_range
    check (seeing_arcsec > 0 and seeing_arcsec <= 15)
);

comment on table public.user_setups is
  'Kullanıcının kaydettiği ekipman zincirleri; fotoğraf künyesini doldurur.';

drop trigger if exists user_setups_set_updated_at on public.user_setups;
create trigger user_setups_set_updated_at
  before update on public.user_setups
  for each row execute function app.set_updated_at();

/*
 * Aynı anda tek varsayılan setup.
 *
 * Kısmi tekil indeks, tetikleyiciden üstün: tetikleyici iki eşzamanlı
 * güncellemede yarışa girer, indeks veritabanı seviyesinde garanti eder.
 */
create unique index if not exists user_setups_single_default_idx
  on public.user_setups (user_id) where is_default;

create index if not exists user_setups_user_idx
  on public.user_setups (user_id, updated_at desc);

-- ══════════════════════════════════════════════════════════════════════════
-- FOTOĞRAF ↔ SETUP BAĞI
-- ══════════════════════════════════════════════════════════════════════════

/*
 * Fotoğraf hangi setupla çekildi?
 *
 * Bağ kuruluyor ama künye alanları YİNE DE fotoğrafta saklanıyor
 * (optic_id, camera_id, setup_text): kullanıcı setup'ını sonradan
 * değiştirdiğinde eski fotoğrafın künyesi değişmemeli. Setup bağı
 * "hangi kurulumla çekildi" sorusunu cevaplar, künyeyi türetmez.
 */
alter table public.astro_photos
  add column if not exists setup_id uuid
    references public.user_setups (id) on delete set null;

comment on column public.astro_photos.setup_id is
  'Çekimde kullanılan kayıtlı setup. Künye alanları ayrıca saklanır — setup sonradan değişirse fotoğrafın künyesi değişmemeli.';

-- ══════════════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════════════

alter table public.user_equipment enable row level security;
alter table public.user_setups    enable row level security;

/* Envanter tamamen özel: başkasının ekipman listesi kimseyi ilgilendirmez
   ve "kimde ne var" bilgisi hırsızlık için kullanılabilir bir veri. */
drop policy if exists user_equipment_own on public.user_equipment;
create policy user_equipment_own on public.user_equipment
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

/* Setup'lar sahibine her zaman açık; başkalarına yalnızca herkese açık
   işaretlenmişse. "profilde" seviyesi profil sayfası üzerinden ayrıca
   filtrelenecek — okuma politikası en dar hâlden başlıyor. */
drop policy if exists user_setups_read on public.user_setups;
create policy user_setups_read on public.user_setups
  for select using (user_id = auth.uid() or visibility = 'herkese-acik');

drop policy if exists user_setups_write on public.user_setups;
create policy user_setups_write on public.user_setups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.user_equipment to authenticated;
grant select, insert, update, delete on public.user_setups    to authenticated;
grant select on public.user_setups to anon;

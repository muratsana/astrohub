# Astrohub Yenileme Planı

**Belge sürümü:** 3.4 · **Hazırlandığı sürüm:** `muratsana/astrohub` @ `e08270e` (main)

---

## 0. Bu belge nasıl kullanılır

Bu bir **iş planı**dır, şartname kopyası değil. Talep edilen 19 sistemin her
biri, Astrohub'ın **bugünkü gerçek durumuyla** eşleştirildi: neyin zaten var
olduğu, neyin bozuk olduğu, neyin sıfırdan yazılacağı ayrıldı.

Claude Code'a verirken **faz faz** verin. Tamamını tek seferde vermek, biri
diğerine bağlı işlerin yanlış sırada yapılmasına yol açar.

Her fazda şunlar var: *neden bu sırada*, *görevler*, *kabul kriteri*,
*dokunulmayacaklar*.

> ⚠️ **En önemli uyarı:** Astrohub'da **96 tablo ve 97 migration** var. Aşağıda
> "zaten var" diye işaretlenen hiçbir şeyi yeniden yazmayın. Bu listeyi
> atlamak, bu projede yapılabilecek en pahalı hata.

---

## 1. Ölçülen başlangıç durumu

Aşağıdakiler tahmin değil, depo ve canlı ekranlar üzerinden doğrulandı.

### 1.1 Zaten VAR olan altyapı — yeniden yazmayın

| Alan | Mevcut karşılık |
|---|---|
| Rol sistemi | `app.app_role` enum'u + `public.user_roles` + `app.is_admin()` / `app.has_role()` (220 ve 89 kullanım) |
| Üyelik | `public.memberships` — `status`, `interval`, `current_period_end`, `cancel_at_period_end` |
| Ödeme kaydı | `public.billing_transactions` — `provider_event_id` benzersiz (webhook idempotency hazır) |
| Denetim kaydı | `public.audit_logs` — `actor_id`, `action`, `target_type`, `target_id`, `detail` |
| Moderasyon kuyruğu | `public.moderation_queue` — `target_type`, `target_id`, `status`, `reason`, `assigned_to`, `resolved_by`, `resolution_note` |
| Bildirim | `public.notifications` + `public.notification_preferences` + `public.push_subscriptions` |
| Mesajlaşma | `public.conversations`, `conversation_participants`, `messages` |
| Engelleme | `public.user_blocks` |
| İçerik (haber/yazı) | `public.content_entries` — `kind`, `status`, `published_at` |
| Diğer içerik | `astro_photos`, `events`, `listings`, `observing_sites`, `celestial_objects`, `clubs` |
| Forum | `forum_categories`, `forum_threads`, `forum_posts` |
| Jüri | `public.jury_members`, `photo_of_week_rounds/nominees/votes` |
| Radyo | `radio_stations`, `radio_programs`, `radio_tracks`, `radio_hosts`, `radio_stream_health` |
| TV | `tv_broadcasts`, `tv_videos`, `tv_playlists`, `tv_playlist_items`, `youtube_connection`, `youtube_quota_log` |
| Site yapısı | `app_settings`, `feature_flags`, `nav_links`, `home_modules`, `hero_slides`, `featured_content`, `setting_history` |
| Katalog | `equipment_models`, `equipment_brands`, `equipment_categories`, `catalog_identifiers`, `astro_filter_*` |
| KVKK | `account_deletion_requests`, `account_export_logs` |
| Zamanlanmış iş | `pg_cron` kullanımda (`0034`, `0049`) |

**Sonuç:** Şartnamedeki maddelerin büyük kısmı için **tablo zaten var**.
Yapılacak iş çoğunlukla *yeni tablo kurmak* değil, **eksik alanları eklemek,
kuralları merkezileştirmek ve arayüzü kurmak.**

### 1.2 Ölçülen taban — depo sağlıklı

Bağımlılıklar kurulup **gerçekten çalıştırıldı** (statik analiz değil):

| Kontrol | Sonuç |
|---|---|
| `npx vitest run` | **188 test dosyası, 2.188 test — hepsi geçiyor** |
| `npm run typecheck` (`tsc -b`) | temiz |
| `npm run lint` (eslint) | temiz |
| `npm audit` | 2 açık: `brace-expansion` (yüksek), `postcss` (orta) — ikisi de `npm audit fix` ile kapanıyor |

**Bu önemli bir bağlam:** §1.3 ve §1.4'teki bulgular **bozukluk değil**.
Kod tabanı iyi test edilmiş ve temiz; eksik olan şey yarım bırakılmış
bağlantılar. Yenileme sırasında bu taban korunmalı — her fazın kabul
kriterinde testlerin yeşil kalması şartı bu yüzden var.

> ⚠️ `react-router` **zaten 8.3.0'da.** Bu belgenin erken sürümlerinde 7.1.1
> ve açık yönlendirme açığı taşıdığı yazıyordu; o bilgi eski bir depo
> anlık görüntüsünden (`02267ef`) geliyordu ve **yanlıştı**. Güncel `main`'de
> geçiş yapılmış durumda; yapılacak bir iş yok.

### 1.3 Tespit edilen gerçek hatalar

| # | Bulgu | Kanıt | Etki |
|---|---|---|---|
| H1 | **Gösterge paneli hiç veri çekmiyor** | Fonksiyon `app.admin_dashboard()` olarak `app` şemasında; frontend `supabase.rpc('admin_dashboard')` çağırıyor. PostgREST varsayılan olarak yalnızca `public` şemasını yayınlar. | "Genel Bakış" tüm kartlarda `—`, rozet sonsuza kadar "yükleniyor…" |
| H2 | **Haber/yazı yönetimi boş görünüyor** | `content_entries` tablosu var ama **boş**; site içeriği hâlâ `src/features/*/data.ts` dizilerinden geliyor. Panelin kendi arayüzü bunu metninde yazıyor. | Panelden içerik yönetilemiyor |
| H3 | **Panel düzeni okunamıyor** | İçerik 2000px'e yayılıyor, her bloğun içinde paragraflarca açıklama var, bilgi yoğunluğu düşük | "Karışık" şikayetinin asıl sebebi |
| H4 | **Panel teması siteden kopuk** | Site çok temalı (`data-theme` = light / field / dark); panel bunu takip etmiyor | Tema değişince panel uyumsuz kalıyor |

Bu dördü **FAZ 0**'da çözülür — üzerine bir şey inşa etmeden önce.

### 1.4 "Yapıldı ama görünmüyor" — ölçüldü

Bu şüphe araştırıldı. Sonuç beklenenden **iyi**: sanılanın aksine sistemli bir
kopukluk yok.

**Yanlış çıkan varsayımlar** (ölçülüp elendi):
- *"Menü var olmayan adreslere gidiyor"* → **Hayır.** 57 menü bağlantısının
  **hiçbiri** kırık değil; adres farklılıkları (`/galeri` ↔ `/fotograflar`)
  yönlendirmelerle karşılanmış.
- *"Fotoğraf detayında puanlama/yorum/plate solve yok"* → **Hayır, hepsi var.**
  `PhotoDetailPage` şunları zaten render ediyor: `RatingControl`, `RatingBadge`,
  `PhotoComments`, `PlateSolvePanel`, `PhotoViewer`, `EquipmentTab`,
  `ExposureTab`, `ProcessingTab`, `LocationTab`, `VersionHistory`,
  `VersionUpload`, `PhotoComparison`, `ExifPanel`, `BortleIndicator`.

**Gerçekten arayüze bağlanmamış olanlar** (frontend'de hiç referansı yok):

| Kurulu ama kullanılmıyor | Not |
|---|---|
| `collections` + `collection_items` | Koleksiyon tabloları var, hiçbir sayfa okumuyor |
| `photo_exact_locations` | Kesin konum tablosu var, hiçbir yerde okunmuyor |
| `astro_filter_aliases` | Filtre eş-adları var — otomatik tamamlama için ideal, kullanılmıyor |

**Kısmen bağlanmış:**
- `astro_filter_products` yalnızca `services/content/filterSpectrum.ts`
  tarafından okunuyor; **yükleme sihirbazının filtre alanı hâlâ düz metin**.
  Yani katalog var, form ondan beslenmiyor (FAZ 17.2).
- `celestial_objects` tablosu var ama katalog sayfaları `targets/data.ts`
  okuyor (FAZ 14).
- `content_entries` tablosu var ama boş; sayfalar `data.ts` okuyor (H2).

**Sonuç:** "Görünmüyor" sorunu sistemli bir arayüz kopukluğu değil,
**üç dar boşluk + statik veri ikiliği**. İkincisi zaten FAZ 15'in konusu.

### 1.5 Ölü ve bağlanmamış yüzey — sistematik tarama

§1.4'teki tekil bulgular yeterli değildi; aynı mercek (**"arka uçta var, ön
uçta yok"**) tüm yüzeye uygulandı. Aşağıdakilerin hepsi ölçüldü, tahmin değil.
Dinamik `import()` ile yüklenen sayfalar ve edge function'dan çağrılan RPC'ler
eleyerek yanlış bulgular ayıklandı.

#### Sahipsiz RPC'ler — 8 adet

`public` şemasında tanımlı, **ne frontend'den ne başka bir SQL fonksiyonundan**
çağrılıyor (42 public fonksiyonun 8'i):

| Fonksiyon | Muhtemelen ne için yazıldı |
|---|---|
| `photo_of_week_results` | Haftanın fotoğrafı sonuçları. Menüde `/haftanin-fotografi` var ama bu fonksiyon kullanılmıyor |
| `toggle_saved_photo` | Fotoğraf kaydetme. Menüde `/panel/kaydedilenler` var |
| `set_event_interest` | Etkinliğe ilgi/katılım işareti |
| `alandaki_cisimler` | Çözülmüş alandaki gök cisimleri — plate solve'un tamamlayıcısı |
| `notify_user` | Bildirim gönderme yardımcısı. FAZ 6 bunu kullanmalı |
| `announce_program_live` · `announce_tv_live` | Radyo/TV canlı yayın duyurusu (FAZ 10) |
| `imm_birlestir` | İMM kompendiyumu birleştirme |

#### Hiç kullanılmayan bileşenler — 3 adet

- `features/explorer/SavedViewsMenu.tsx` — kaydedilmiş görünümler menüsü
  (`saved_views` tablosu da var)
- `features/explorer/CsvExportButton.tsx` — CSV dışa aktarma
- `features/home/sections/DarkSkyStrip.tsx` — anasayfa karanlık gökyüzü şeridi

#### Frontend'den çağrılmayan edge function'lar — 4 adet

`katalog-yukle` · `plate-solve-poll` · `radyo-durum` · `youtube`

> `plate-solve-poll` bir yoklama işi olabilir (zamanlayıcıdan tetiklenir) ve
> `youtube` üç migration'da geçiyor. Bunlar **meşru olabilir** — silmeden önce
> nasıl tetiklendikleri doğrulanmalı. `katalog-yukle` ve `radyo-durum` için
> hiçbir tetikleyici bulunamadı.

#### Kullanılmayan tablolar — 3 adet

`collections` + `collection_items` · `photo_exact_locations` ·
`astro_filter_aliases`

#### Bunun anlamı

Bu 18 parça "bozuk" değil — **yarım bırakılmış**. Her biri için karar iki
seçenekten biri olmalı: **bağla** ya da **kaldır**. Üçüncü seçenek ("dursun,
belki lazım olur") bu listenin nasıl oluştuğunun cevabı.

FAZ 18 bunu ele alıyor.

### 1.6 Mevcut panelin boyutu

`src/features/admin/` → **49 dosya, ~16.000 satır, 15 test**.

Karar gereği çoğu kaldırılacak; **Yayın Merkezi** ve **Katalog ve Araçlar**
korunacak (bkz. §2).

---

## 2. Verilmiş kararlar

Bunlar tartışılmış ve karara bağlanmıştır; fazlar bunları varsayar.

| Karar | İçerik |
|---|---|
| **K1** | Mevcut admin paneli **tamamen değiştirilecek**, işlev kaybı kabul edildi |
| **K2** | **Yayın Merkezi korunacak** (`BroadcastControl`, `RadioControl`, `TvControl`, `RadioVault` — testleriyle) |
| **K3** | **Katalog ve Araçlar korunacak ama yeniden düzenlenecek** (dört blok sekmelere ayrılacak) |
| **K4** | Panel UI'ı StageHub yerleşimini kullanacak (kabuk + kenar çubuğu + shadcn bileşenleri) |
| **K5** | Yeni tablo kurmak yerine **mevcut şema genişletilecek** |
| **K6** | Yetki, arayüzde değil **veritabanında** zorlanacak (RLS + `security definer` fonksiyonlar) |
| **K7** | **RecordsControl ve ClubControl** yeni panelde yeniden yazılacak (kaldırılıp unutulmayacak) |

### Kaldırılınca kaybolacak işlevler — bilinçli kabul

`SiteControl` (site yapısı/menü/hero/modüller) · `ReminderControl` (bildirim
merkezi) · `FeaturedControl` (anasayfa küratörlüğü) · `ForumCategories` ·
`CommentsControl` · `PhotoWeekAdminControl`

**`ClubControl` ve `RecordsControl` bu listede değil** — ikisi de yeni
panelde yeniden yazılacak (K7). Sırasıyla FAZ 4 ve FAZ 5'e işlendi.

**Bunların çoğu şartnamede yeniden isteniyor** (anasayfa yönetimi, forum
yönetimi, haftanın fotoğrafı, bildirim merkezi). Yani kaldırılıp yeni mimaride
**yeniden yazılacaklar**. Kaldırmadan önce ilgili dosyaları
`src/features/admin-legacy/` altına alın — yeniden yazarken iş kuralları oradan
okunacak. Sıfırdan tahmin etmeyin.

---

## 3. Mimari temel: rol, statü ve özellik izinleri

Şartnamenin en belirleyici maddesi bu. Yanlış kurulursa sonraki her faz etkilenir.

### 3.1 Üç ayrı kavram — karıştırılmamalı

| Kavram | Nedir | Nerede tutulur |
|---|---|---|
| **Rol** | Yetki (Admin, Moderatör, Jüri) | `user_roles` + `app.app_role` |
| **Statü** | Üyelik seviyesi (Standart, Premium) | `memberships` |
| **İzin** | Tek tek özellikler (ilan yayınlama, galeriye ekleme…) | **yeni:** izin tablosu |

Astrohub bu ayrımı zaten doğru kurmuş (`user_roles` ≠ `memberships`). Şartname
üçüncü katmanı ekliyor.

### 3.2 Kurulacak yapı

- `app.app_role` enum'una **`jury`** değeri eklenecek.
  Mevcut değerler: `member`, `verified_organizer`, `club_manager`,
  `content_editor`, `moderator`, `admin`.
  **Jüri yetkisi tek bir işten ibaret:** haftanın fotoğrafı adaylarına **oy
  vermek**. Başka hiçbir yönetim yetkisi taşımaz. Bu yüzden jüri, standart
  veya premium statüyle birlikte atanabilir; statüyü değiştirmez.
  Karşılığı olan tablolar zaten var: `jury_members`, `photo_of_week_rounds`,
  `photo_of_week_nominees`, `photo_of_week_votes`.
  **Oy verme yetkisi RLS'te olmalı:** `photo_of_week_votes` tablosuna insert,
  yalnızca ilgili turda jüri üyesi olanlara açık.
- **Etkin statü** bir fonksiyonla hesaplanacak (`app.etkin_statu(uid)`):
  - Admin veya moderatör → **her zaman premium**
  - `memberships.status = 'active'` **ve** `current_period_end` geçmemişse → premium
  - Aksi halde → standart
  - `current_period_end = null` → süresiz premium
- **Özellik izinleri** iki tablodan okunacak:
  - `role_permissions(role, feature)` — role bağlı
  - `tier_permissions(tier, feature)` — statüye bağlı (standart/premium)
- Tek giriş noktası: `app.izin_var(feature text) returns boolean`
  Admin her zaman `true`. Diğerleri rol ∪ statü birleşimi.

> ⚠️ **İzin tek başına yetmez — kota da gerekiyor.**
> "Premium 5 yerine **30** fotoğraf ekleyebilir" bir evet/hayır izni değil,
> bir **sayı**. Boolean izin modeli bunu ifade edemez. Aynı şekilde
> "birden fazla setup" da bir sınırdır.
>
> Bu yüzden ikinci bir tablo gerekir: `tier_limits(tier, key, value)` —
> örn. `(standart, galeri_foto, 5)`, `(premium, galeri_foto, 30)`,
> `(standart, setup_sayisi, 1)`, `(premium, setup_sayisi, null)` (sınırsız).
>
> Okuma yine tek fonksiyondan: `app.kota(key)` → sayı ya da `null` (sınırsız).
> **Kota kontrolü RLS/trigger'da olmalı**, formda değil: sınır yalnızca
> arayüzde kontrol edilirse API üzerinden aşılabilir.
>
> Bu ayrım FAZ 1'de kurulmazsa sonradan eklemek, izin çağıran her yeri
> yeniden yazmak demektir.

### 3.3 Başlangıç özellik listesi

`icerik_olustur` · `galeriye_foto_ekle` · `ilan_yayinla` ·
`canli_sohbete_katil` · `premium_icerik_goruntule` · `katalog_ogesi_oner` ·
`saha_girdisi_ekle` · `forum_konu_ac` · `mesaj_gonder`

### Premium neyi açıyor — karara bağlandı

| Anahtar | Standart | Premium |
|---|---|---|
| `galeri_foto` (kota) | **5** | **30** |
| `gokyuzu_arsivi` (izin) | ✗ | ✔ |
| `setup_sayisi` (kota) | 1 | sınırsız |

**Bunların dışındaki her özellik şimdilik standart kullanıcıya da açıktır.**
§3.3'teki diğer anahtarlar (`icerik_olustur`, `ilan_yayinla`,
`forum_konu_ac`, `katalog_ogesi_oner`, `mesaj_gonder`…) altyapıda tanımlı
kalır ama ikisine de `true` verilir. Ödeme sistemi geldiğinde premium'a
taşınmak istenen özellik, **yalnızca tablo satırı değiştirilerek** kapatılır —
kod değişmez. Mimarinin amacı buydu.

`setup_sayisi` sınırı ürün kararı olarak henüz kesinleşmedi; yukarıdaki değer
bir başlangıç varsayımıdır ve tablodan değiştirilebilir.

Yeni özellik ya da kota eklemek = tabloya satır eklemek. **Kod değişmemeli.**
Ödeme sistemi geldiğinde standart/premium farkı yalnızca `tier_permissions` ve
`tier_limits` satırlarıyla tanımlanacak.

### 3.4 Moderatör sınırı — kritik kural

Moderatör **silemez**. Bu bir arayüz kuralı değil, **RLS kuralı** olmalı:
`delete` politikaları yalnızca `app.is_admin()` kabul etmeli. Butonu gizlemek
yeterli değildir; buton gizli olsa da API çağrısı yapılabilir.

---

## 4. Fazlar

### FAZ 0 — Temizlik ve temel (önkoşul)

**Neden önce:** Bozuk bir panelin üzerine özellik eklemek, hataların yeni
koddan mı eskiden mi geldiğini belirsizleştirir.

**Görevler**
1. H1'i düzelt: `public.admin_dashboard()` sarmalayıcısı ekle
   (`app` şemasını PostgREST'e **açma** — o, tüm yardımcıları dışa açar).
2. Yeni panel kabuğunu kur (kenar çubuğu, üst bar, sayfa başlığı deseni).
3. H4'ü düzelt: tema köprüsü — eksik token'lar (`card`, `popover`, `muted`,
   `accent`, `input`, `ring`, `destructive`, `sidebar*`) astrohub'ın mevcut
   token'larına `var()` ile bağlanmalı. **Sabit renk yazmayın**, yoksa panel
   tema değişimini takip etmez.
4. H3'ü düzelt: panel gövdesine okuma genişliği sınırı (~1400px); geniş
   tablolar sayfa gövdesini değil kendi kutusunu kaydırsın.
5. Korunan modülleri `admin-legacy/`'ye taşı, yeni kabuğa bağla (K2).
6. Kaldırılacak modülleri sil — **testleriyle birlikte**.
7. `npm audit fix` çalıştır (`brace-expansion`, `postcss`) ve 2.188 testin
   hâlâ geçtiğini doğrula.

**Kabul kriteri**
- Genel Bakış gerçek sayı gösteriyor (`—` yok).
- Site açık temaya alındığında panel de geçiyor.
- Yayın Merkezi ve Katalog eski işlevleriyle açılıyor.
- `typecheck`, `lint` ve `build` temiz; **2.188 testin hepsi geçiyor**
  (kaldırılan modüllerin testleri düşülerek).

---

### FAZ 1 — Yetki mimarisi

**Neden bu sırada:** §3'teki her şey sonraki fazların önkoşulu.

**Görevler**
1. `app.app_role`'a `jury` ekle.
2. `role_permissions` ve `tier_permissions` tablolarını kur, §3.3 listesiyle doldur.
3. `app.etkin_statu(uid)` ve `app.izin_var(feature)` fonksiyonlarını yaz.
4. Premium süre sonu için `pg_cron` işi: süresi dolanları standarda düşür.
   Zaten `pg_cron` kullanımda (`0034`, `0049`) — aynı deseni izleyin.
5. Frontend'de tek bir `usePermissions()` kancası. Bileşenler rolü **doğrudan
   okumamalı**; hepsi bu kancadan geçmeli.

**Kabul kriteri**
- Moderatör hesabı premium yetkilerine sahip.
- Süresi dolmuş premium, cron sonrası standarda düşüyor.
- Yeni bir özellik izni **yalnızca tabloya satır ekleyerek** tanımlanabiliyor.
- **Negatif test:** rolsüz kullanıcı, premium özelliği API üzerinden
  çağırdığında RLS reddediyor (arayüz gizlemesine güvenilmiyor).
- **Kota testi:** standart kullanıcı 6. fotoğrafı API üzerinden eklemeye
  çalıştığında veritabanı reddediyor.

---

### FAZ 2 — Kullanıcı yönetimi

**Görevler**
1. Kullanıcı listesi: arama, filtre, sayfalama.
2. Rol ver/al (moderatör, jüri). Admin rolü verme **ayrı onay** istesin.
3. Premium tanımlama: süresiz veya tarihe kadar.
4. Kullanıcıya doğrudan sistem mesajı gönderme (Faz 6 ile bağlanır).
5. Hesap durumu (aktif/askıda/yasaklı) — `profiles.account_status` zaten var.
6. Tüm bu işlemler `audit_logs`'a yazılsın.

**Kabul kriteri**
- Rol ve premium değişiklikleri denetim kaydında görünür (kim, ne zaman, ne).
- Moderatör bu ekranda **hiçbir** rol değiştiremiyor.

**Dokunma:** `auth.users` e-posta alanını panele açmayın. Mevcut panel bunu
bilinçli olarak yapmamış; kullanıcı `username` üzerinden yönetilmeli.

---

### FAZ 3 — İçerik durumları ve soft delete

**Neden bu sırada:** İçerik yönetimi ve moderasyon buna bağlı.

**Görevler**
1. Ortak durum kümesi: `taslak`, `incelemede`, `onaylandi`, `yayinda`,
   `reddedildi`, `arsivlendi`, `yayindan_kaldirildi`, `silindi`.
2. İçerik tablolarına `deleted_at`, `deleted_by`, `archived_at` ekle.
3. **Soft delete kuralı:** public sorgular `deleted_at is null` **ve**
   `status = 'yayinda'` filtresi görmeli. Bunu her sorguya elle yazmak yerine
   view ya da RLS ile merkezileştirin — elle yazılan filtre er geç unutulur.
4. Kalıcı silme yalnızca admin (RLS düzeyinde).
5. Geri alma akışı: arşivden/silindiden yayına döndürme.

**Kabul kriteri**
- Silinen içerik public'te görünmüyor ama veritabanında duruyor.
- Admin geri alabiliyor.
- Moderatör kalıcı silme çağrısını **RLS ile** reddediyor.

**Dikkat:** Mevcut tablolarda durum değerleri farklı (`published`, `pending`…).
Yeni kümeye geçerken **eşleme tablosu** yazın ve tek seferlik dönüştürün;
iki kümeyi bir arada yaşatmayın.

---

### FAZ 4 — İçerik yönetimi ve onay akışı

**Görevler**
1. Sekmeli içerik yönetimi: etkinlik, haber, yazı, ilan, galeri,
   **saha (gözlem noktaları)** ve **topluluklar**.
2. Onay akışı: kullanıcı gönderir → incelemede → onay/ret → yayın.
3. **H2'yi çöz:** `data.ts` içeriğini `content_entries`'e taşı.
   **Modül modül yapın**, hepsini birden değil — hata olduğunda hangi modülün
   sorumlu olduğu belli olsun. Sıra önerisi: haber → yazı → eğitim.
4. Kullanıcı kendi içeriğinin durumunu kendi panelinden görsün.
5. **Public alanda durum etiketi gösterilmeyecek** — "onayda", "reddedildi"
   yalnızca sahibine ve yönetime görünür.

6. **Topluluk sahipliği ve doğrulama** (karar: ClubControl geri isteniyor).
   Bir topluluğu ekleyen kullanıcı onu **tamamen düzenleyebilmeli**;
   admin de düzenleyebilir. Eski `ClubControl`'deki **doğrulama ve onay
   kuralları** (`clubs.verified_at`, `verified_by`, `info_checked_on`,
   `listed`) yeni içerik türüne taşınmalı — `admin-legacy/ClubControl.tsx`
   ve `clubsAdmin.ts` içinden okunur. `clubs` tablosunda
   `manager_user_id` alanı zaten var — sahiplik bunun üzerine kurulur, yeni
   bir sahiplik kolonu eklemeyin.
   Düzenleme yetkisi RLS ile verilmeli: `auth.uid() = manager_user_id or app.is_admin()`.

**Kabul kriteri**
- Ziyaretçi yalnızca yayındaki içeriği görüyor; durum etiketi hiç görünmüyor.
- İçerik sahibi kendi taslağını ve ret gerekçesini görüyor.
- `data.ts` dosyaları silinmiş, site tablodan besleniyor.
- Topluluk sahibi kendi topluluğunu düzenleyebiliyor, **başkasınınkini
  düzenleyemiyor** (negatif test).

---

### FAZ 5 — Moderasyon kuyruğu

**Görevler**
1. Tek merkezi "İnceleme Kuyruğu": katalog önerileri, saha girdileri, ilanlar,
   galeri, forum şikayetleri. `moderation_queue` tablosu **zaten var**, genişletin.
2. Eylemler: onayla · düzenleyerek onayla · reddet · arşivle · kullanıcıya
   geri bildirim gönder.
3. Forum kaldırma: içerik silinmeyecek, yerine
   **"Topluluk kurallarına uymadığından kaldırılmıştır."** gösterilecek.
4. Kullanıcı şikayet akışı: şikayet → kuyruğa düşer.
5. **Topluluk silme onay akışı.** Topluluk sahibi silme talebi açar,
   **gerekçe yazması zorunlu**. Talep moderasyon kuyruğuna düşer; topluluk
   admin onaylayana kadar **yayında kalır**. Admin onaylar veya reddeder;
   reddederse gerekçesini sahibine bildirir.
   Yani silme iki aşamalı: *talep* (sahip) → *onay* (admin). Sahip tek
   başına silemez.
   **Bu talep yalnızca admin'e görünür** (karar); moderasyon kuyruğunda
   moderatöre listelenmez.
6. **RecordsControl'ün yerine geçen işlevler** (karar: geri isteniyor):
   kayıt durumu değiştirme, kayıt silme ve **forum konusu kilitleme**.
   Eski bileşen `admin-legacy/RecordsControl.tsx` ve `records.ts` içinde;
   iş kuralları oradan okunmalı, sıfırdan tahmin edilmemeli.
   Denetim kaydı görüntüleme kısmı FAZ 2'de zaten var — tekrarlamayın (§6.8).

**Kabul kriteri**
- Beş farklı kaynaktan gelen kayıt aynı ekranda listeleniyor.
- Gerekçesiz silme talebi **kabul edilmiyor** (veritabanı düzeyinde zorunlu alan).
- Onay bekleyen topluluk public'te hâlâ görünüyor; onaydan sonra kalkıyor.
- Talep ve karar denetim kaydında, gerekçeleriyle birlikte.
- Kaldırılan forum gönderisinin yerinde açıklama metni var, akış bozulmuyor.
- Her moderasyon işlemi denetim kaydında.

---

### FAZ 6 — Bildirim ve mesajlaşma

**Görevler**
1. Bildirim türleri: sistem, mesaj, forum, içerik, galeri, ilan, moderasyon.
2. Okundu/okunmadı + kullanıcı panelinde liste + badge üzerinde gösterge.
3. Tetikleyiciler: forum cevabı, yeni mesaj, içerik onay/ret, yorum, beğeni,
   yönetim işlemi.
4. İki ayrı mesajlaşma yapısı:
   - **Sistem mesajı** (admin → kullanıcı), bildirimle ilişkili
   - **Kullanıcılar arası özel mesaj**, engelleme + şikayet + moderasyon
5. `notifications`, `messages`, `conversations`, `user_blocks` **zaten var** —
   genişletin.

**Kabul kriteri**
- Engellenen kullanıcı mesaj gönderemiyor (RLS düzeyinde).
- Bildirim tercihleri e-posta/push için genişletilebilir yapıda.

---

### FAZ 7 — Anasayfa ve editör

**Görevler**
1. Hero banner: ekle/sil/düzenle/sırala/görsel değiştir (`hero_slides` var).
2. Öne çıkan haber/yazı/etkinlik seçimi (`featured_content` var).
3. Haftanın fotoğrafı → anasayfa kartına **hafta numarasıyla** otomatik yansısın
   (`photo_of_week_rounds` var).
4. Zengin metin editörü: görsel, bağlantı, tablo, başlık, medya, biçimlendirme.
5. HTML / Word / PDF import — **önizleme ve düzenleme adımı zorunlu**, doğrudan
   içeri aktarma yok.

**Kabul kriteri**
- Import edilen belge mevcut içerik yapısını bozmuyor.
- Haftanın fotoğrafı işaretlendiğinde anasayfa kartı elle müdahale olmadan güncelleniyor.

**Not:** Import (özellikle PDF) bu listedeki en riskli iş. Ayrı bir alt-faz
olarak ele alın; HTML → Word → PDF sırasıyla ilerleyin.

---

### FAZ 8 — İlan yaşam döngüsü

**Görevler**
1. Yayınlanan ilan **6 ay** aktif; süre sonunda otomatik kullanıcı arşivine.
   Bitişten **7 gün ve 1 gün önce** kullanıcıya hatırlatma bildirimi gider
   (karar). Bildirim altyapısı FAZ 6'da kuruluyor; ek maliyeti yok.
2. `pg_cron` işi — Faz 1'deki premium işiyle aynı desen.
3. Kullanıcı panelinde aktif/arşiv ayrımı, yeniden yayına alma.
4. Yeniden aktive edilen ilan gerekirse tekrar onaya düşsün.

**Kabul kriteri**
- Süresi dolan ilan public'ten kalkıyor, kullanıcının arşivinde duruyor.
- Yeniden aktive etme çalışıyor ve denetim kaydına giriyor.

---

### FAZ 9 — Kullanıcı paneli

**Görevler**
İlanlar · içerik başvuruları · saha girdileri · katalog önerileri · galeri
yüklemeleri · mesajlar · bildirimler · premium durumu · arşiv.

**Kabul kriteri**
- Kullanıcı kendi içeriğinin durumunu görüyor; başka kullanıcının durumunu görmüyor.
- Premium bitiş tarihi görünüyor.

---

### FAZ 10 — Radyo ve TV

**Neden en sonda:** Dış servis bağımlılığı en yüksek olan, en çok bekleyebilecek
ve diğer fazları bloke etmeyen alan.

**Görevler**
1. Radyo: canlı yayın sunucusu (deponun `deploy/radyo/README.md` dosyasında
   kurulum adımları olduğu görülüyor — önce onu okuyun).
2. Local MP3 havuzu korunacak ve geliştirilecek: yükleme, sıralama, playlist.
3. Spotify: **yalnızca bağlantı gömme** (karar). Playlist gömülü oynatıcı
   olarak gösterilir; parça senkronizasyonu YAPILMAYACAK. Böylece API kotası,
   token yenileme ve local/canlı/Spotify arası kaynak çakışması derdi doğmaz.
4. Yayın geçmişi: hangi yayın ne zaman, hangi MP3 ne zaman, hangi playlist.
5. TV: YouTube kanal bağlantısı, canlı yayın embed.
6. Canlı sohbet: **yalnızca üyeler** yazabilir, ziyaretçi izler. Admin mesaj
   kaldırabilir ve kullanıcıyı susturabilir.

**Kabul kriteri**
- Ziyaretçi sohbete yazamıyor (RLS düzeyinde, arayüz gizlemesiyle değil).
- Yayın geçmişi panelden görüntülenebiliyor.

**Not:** Panelde "İstasyon kurulmamış" ve "YouTube kanalı bağlanmadı" uyarıları
şu an doğru davranış sergiliyor — olmayan veriyi varmış gibi göstermiyor.
Yeniden yazarken bu davranışı koruyun.

---

### FAZ 11 — Public gezinme ve forum arayüzü *(bağımsız — hemen başlayabilir)*

**Neden ayrı:** Bu iki iş yönetim paneline hiç dokunmaz, hiçbir faza bağımlı
değildir ve kullanıcının günlük deneyimini doğrudan etkiler. Faz 0 ile paralel
yürütülebilir.

#### 11.1 Site geneli geri dönüş

Şikayet: *"kullanıcı kaldığı yeri kaybediyor ve başa dönüyor."*

Bu **iki ayrı sorundur** ve ikisi de çözülmeden şikayet kapanmaz:

**a) Gezinme — nereye dönülecek**
- Her detay sayfasında görünür bir geri dönüş bulunmalı.
- `history.back()` **tek başına yeterli değildir**: kullanıcı sayfaya doğrudan
  bağlantıyla (paylaşılan link, arama sonucu, yeni sekme) geldiyse geçmiş boştur
  ve buton ya çalışmaz ya siteden dışarı atar.
- Doğru yaklaşım: her sayfanın **üst rotası tanımlı** olsun
  (fotoğraf → galeri, konu → forum kategorisi, ilan → ilanlar…). Geçmişte
  site içi bir önceki sayfa varsa oraya, yoksa tanımlı üst rotaya dönülsün.
- Kırıntı yolu (breadcrumb) bu bilgiyi zaten taşır; panelde
  "Ana Sayfa / Yönetim" olarak var. Aynı desen public tarafa da kurulmalı.

**b) Kaydırma konumu — listeye dönünce nereye düşecek**
- Uzun galeri/forum/ilan listelerinde bir öğeye girip geri dönen kullanıcı
  **listenin başına düşmemeli**, ayrıldığı yere dönmeli.
- Bu ayrı bir iştir: geri butonu doğru sayfaya götürse bile kaydırma konumu
  korunmazsa kullanıcı yine "kaldığı yeri kaybetti" der.
- Sonsuz kaydırma ya da sayfalama varsa hangi sayfada olduğu da korunmalı.

**Kabul kriteri**
- Paylaşılan bir bağlantıyla doğrudan açılan detay sayfasında geri butonu
  çalışıyor ve **site içinde** kalıyor.
- Galeride 200. fotoğrafa girip geri dönen kullanıcı 200. fotoğrafın yanında.
- Mobilde de geçerli.

#### 11.2 Forum arayüzü

Şikayet: *"başlıklarda sadece kart görünümü var, standart liste görünümü de
olmalı"* ve *"konuların altındaki başlıklar aynı tasarlanmış, hangi ikonun
hangi alt başlığa ait olduğu ayrılamıyor."*

**a) Liste görünümü**
- Kart görünümü tarama için iyi, ama **yoğun okuma için kötü**: ekranda az
  başlık gösterir, taramayı yavaşlatır.
- Kart / liste arasında geçiş sunulmalı; seçim kullanıcı tercihi olarak
  hatırlanmalı (`ui_preferences` tablosu zaten var).
- Liste görünümünde satır başına: başlık, kategori, cevap sayısı, son
  gönderen, son gönderi zamanı.

**b) Görsel hiyerarşi**
- Asıl sorun ikonlar değil, **kategori ile alt başlığın aynı ağırlıkta
  görünmesi.** İkon değiştirmek bunu çözmez.
- Seviye farkı tipografiyle kurulmalı: kategori üst seviye (daha büyük/kalın),
  alt başlık ikinci seviye (daha küçük, girintili veya belirgin şekilde
  ayrılmış).
- İkon yalnızca **destekleyici** olmalı; hiyerarşiyi tek başına ikon
  taşımamalı — renk körlüğü ve küçük ekran ikonu okunmaz kılar.
- Alt başlığın hangi kategoriye ait olduğu ekrandan **bakar bakmaz**
  anlaşılmalı; gerekiyorsa kategori adı alt başlığın yanında tekrarlansın.

**Kabul kriteri**
- Kullanıcı kart/liste görünümünü değiştirebiliyor ve tercihi bir sonraki
  ziyarette hatırlanıyor.
- Kategori ve alt başlık ayrımı **ikonlar kaldırıldığında da** anlaşılıyor
  (hiyerarşi testi).

#### 11.3 Kullanıcı menüsü (badge)

Üst bardaki kullanıcı görselinden açılan menü. Bugün böyle bir menü yok;
kullanıcı hesabına, mesajlarına ve profiline giden yol dağınık.

**Menü içeriği**

| Öğe | Kime görünür |
|---|---|
| Ad + e-posta | herkese (menü başlığı) |
| Rol/statü rozetleri | herkese — sahip olduğu roller ve premium/standart |
| **Hesabım** | herkese — ayarlar, üyelik durumu, tercihler |
| **Profilim** | herkese — kendi herkese açık profil sayfası |
| **Mesajlarım** | herkese — okunmamış sayısı rozetle |
| **Yönetim** | yalnızca admin / moderatör / içerik editörü |
| Çıkış yap | herkese |

**Kurallar**

- Menü öğeleri **tek yetki kaynağından** filtrelenir: `usePermissions()`.
  İkinci bir rol kontrolü yazılmaz (§6.8).
- "Yönetim" görünmüyor diye yetki verilmiş sayılmaz; erişimi asıl engelleyen
  yine RLS ve panelin kendi kapısıdır. Menüden gizlemek yalnızca deneyim
  içindir.
- Bildirim göstergesi badge'in yanında durur (FAZ 6 ile bağlanır);
  menünün içinde ayrıca tekrarlanmaz.
- Klavyeyle açılıp kapanabilmeli, `Esc` kapatmalı, odak menüde kalmalı.

**Kabul kriteri**
- Rolsüz kullanıcıda "Yönetim" satırı hiç render edilmiyor (gizlenmiş değil).
- Okunmamış mesaj sayısı menüde ve badge'de tutarlı.
- Menü yalnızca fare ile değil klavyeyle de kullanılabiliyor.

#### 11.4 Nav bar araması

Site genelinde arama, üst barda **yer kaplamayan** bir tetikleyiciyle.

**Biçim**
- Üst barda yalnızca küçük bir hap: büyüteç + "Ara". Kalıcı geniş bir
  arama kutusu **değil** — nav bar zaten dolu.
- Tıklanınca (ya da `⌘K` / `Ctrl+K`) sayfanın üstüne bir komut paleti açılır.
- Mobilde tam ekran açılır; üst barda yalnızca ikon durur.

**Kapsam — tüm içerik**
Haber, yazı, etkinlik, ilan, fotoğraf, gök cismi, gözlem noktası, ekipman,
topluluk, forum konusu ve kullanıcı. Sonuçlar **türe göre gruplanır**
("Gök cisimleri · 3", "Etkinlikler · 1") — düz bir liste, hangi sonucun ne
olduğunu kaybettirir.

**Veri kaynağı — kritik**
> Mevcut `src/features/search/` modülü **`targets/data.ts`'ten okuyor**.
> Yani arama bugün statik dosyaya bağlı ve panelden eklenen içeriği
> bulamıyor. FAZ 15'te tabloya bağlanmalı; aksi halde "her şeyde arama"
> vaadi yalnızca tohum verisi için geçerli olur.

Arama tek bir kaynaktan yapılmalı: her modül için ayrı sorgu yazmak yerine
veritabanı tarafında birleşik bir arama görünümü ya da fonksiyonu (§6.8).

**Davranış**
- Yazarken sonuç gelir (gecikmeli, her tuşta sorgu atmadan).
- Sonuçlar klavyeyle gezilir, `Enter` açar, `Esc` kapatır.
- Sonuç yoksa "bulunamadı" yerine ne aranabileceğine dair örnek göster.
- Yetki farkı: taslak/incelemedeki içerik aramada **çıkmaz** (§6.3).

**Kabul kriteri**
- Üst bardaki tetikleyici, geniş ekranda nav öğelerini sıkıştırmıyor.
- `⌘K` ile açılıyor, `Esc` ile kapanıyor, sonuçlar klavyeyle geziliyor.
- Panelden yeni eklenen bir içerik aramada **anında** bulunuyor.
- Yayında olmayan içerik, sahibi dışında kimsenin aramasında çıkmıyor.

---

### FAZ 12 — Dış katalog kaynakları *(bağımsız)*

İstenen iki kaynak incelendi. **İkisi de "fotoğraf ekleme" işi değil** —
sebepleri farklı ve ikisi ayrı ele alınmalı.

#### 12.1 OpenNGC — veri kaynağı, fotoğraf değil

> ⚠️ **Varsayım düzeltmesi:** `github.com/mattiaverga/OpenNGC` deposunda
> **fotoğraf yok.** İçeriği tamamen tablo verisidir: NGC/IC nesnelerinin
> koordinatları, kadirleri, boyutları, sınıflandırmaları ve adları. Format CSV;
> kaynakları NASA/IPAC, HyperLEDA, SIMBAD, HEASARC ve Corwin'in NGC/IC referansı.

Bu kaynak yine de **çok değerli** — ama galeriye değil, `celestial_objects`
tablosuna. Astrohub'ın kendi migration'ı durumu şöyle yazıyor:

> *"`celestial_objects` 182 satır taşıyordu. NGC tek başına 7.840, IC 5.386.
> Katalog eksik değil, neredeyse boştu: kullanıcı Sh2-101 diye arattığında
> sonuç alamıyor ve hedefini serbest metin yazmak zorunda kalıyordu — o da
> fotoğrafın hiçbir hedefe BAĞLANMAMASI demek."*

**Yeni boru hattı yazmayın.** Bu iş için altyapı **zaten var**:
`20260807090000_katalog_ice_aktarma.sql` — `app` şemasında hazırlık tablosu,
toplu yazma, tek küme sorgusuyla eşleştirme. Panelde "Katalog senkronizasyonu"
ve "Teknik veri içe aktarma" ekranları da mevcut.

Mevcut boru hattının iki kuralı **korunmalı**:
1. **Yalnızca boş alan doldurulur.** Eşleşen kayıtlarda ad, açıklama, slug ve
   editör alanlarına dokunulmaz. Bu kural olmasa tek bir içe aktarma, elle
   yazılmış 182 Türkçe adı ve açıklamayı silerdi.
2. Eşleştirme `catalog_identifiers` üzerinden yapılır (M / NGC / IC / Sh2
   kodları), serbest metin adla değil.

**Görevler**
- OpenNGC CSV'sini mevcut hazırlık tablosuna besleyecek bir dönüştürücü yaz
  (alan eşlemesi: `RA`/`Dec` → `ra_deg`/`dec_deg`, `MajAx`/`MinAx` →
  `size_major_arcmin`/`size_minor_arcmin`, `V-Mag`/`B-Mag` → `magnitude`,
  `Const` → `constellation`, `Type` → `kind`).
- `M`, `NGC`, `IC`, `Identifiers`, `Common names` sütunlarını
  `catalog_identifiers`'a yaz — arama bunun üzerinden çalışıyor.
- İçe aktarma **önce kuru çalıştırma** (dry-run) raporu üretsin: kaç kayıt
  eşleşti, kaç yeni, kaç alan dolduruldu. Onaydan sonra yazsın.

**Lisans — ✅ karara bağlandı: atıf vererek içe aktarılacak.**
OpenNGC verisi **CC-BY-SA-4.0**. İki yükümlülük getirir:
- **Atıf (BY):** kaynak belirtilmeli. Astrohub'da `source_name` / `source_url`
  alanları zaten var; kullanılmalı.
- **Aynı lisansla paylaşım (SA):** türetilmiş veri kümesi de aynı lisansı
  taşır. Katalog verisi ileride dışa aktarma/API olarak sunulursa bu koşul
  o yüzeyde de geçerli olur — tasarlarken hatırlanmalı.

**Kabul kriteri**
- `celestial_objects` NGC/IC kapsamına ulaşıyor, mevcut Türkçe içerik bozulmamış.
- "Sh2-101" araması sonuç veriyor.
- Kaynak ve lisans bilgisi kayıtlarda görünüyor.

#### 12.2 deepskycorner.ch — telif engeli var

Site ağ kısıtı nedeniyle buradan incelenemedi; aşağıdaki değerlendirme
sitenin niteliğine dayanıyor ve **uygulamadan önce doğrulanmalı**.

deepskycorner.ch bir **kişisel astrofotoğraf sitesi**. Böyle bir sitedeki
fotoğraflar, aksi açıkça belirtilmedikçe **sahibinin telifi altındadır**.
Varsayılan "serbest kullanım" değil, "tüm hakları saklı"dır.

Fotoğrafları indirip Astrohub veritabanına eklemek, izin alınmadan yapılırsa
telif ihlalidir. Bu, Astrohub'ın kendi standartlarıyla da çelişir: şemada
`license`, `image_credit`, `image_licence` ve `ai_declared` alanları var —
proje içerik kaynağını kayıt altına almayı zaten şart koşuyor.

**Yapılabilecekler, tercih sırasıyla:**
1. **Site sahibinden yazılı izin al.** Hangi fotoğraflar, hangi kullanım
   (galeri mi, yalnızca hedef sayfası küçük görseli mi), hangi atıf metni.
   İzin alınırsa `image_credit` + `image_licence` doldurularak eklenir.
2. **İzin yoksa: bağlantı ver, kopyalama.** Hedef sayfasında "bu nesnenin
   örnek görüntüleri" başlığı altında dış bağlantı. Telif sorunu doğmaz.
3. **Açık lisanslı alternatifler.** Aynı nesneler için serbest lisanslı
   görsel arıyorsanız NASA/ESA/ESO arşivleri ve Wikimedia Commons uygundur;
   her birinin kendi atıf koşulu vardır ve kayıtta belirtilmelidir.

**✅ Karar: deepskycorner.ch kullanılmayacak.** Görseller topluluğun kendi
fotoğraflarından gelecek (FAZ 14.3), eksik kalan nesneler için açık lisanslı
arşivler. Bu alt-faz kapsam dışı; ileride izin alınırsa yeniden değerlendirilir.

---

### FAZ 13 — Gökyüzü Arşivim *(premium)*

Sitenin en can alıcı parçası. Kullanıcının kendi gökyüzü arşivi: hangi objeyi
çekti, hangisini çekmek istiyor, hedefi ne, nerede kaldı.

**Modülün adı: "Gökyüzü Arşivim".** Arayüzde her yerde bu ad kullanılır.
(Planlama sürecinde "külliyat" kelimesi geçti; o bir çalışma tabiriydi,
kullanıcıya gösterilmez.)

**Yeri:** Nav bar'ı kalabalıklaştırmamak için **Araçlar** menüsü altında
(`/araclar/gokyuzu-arsivim`). Orada zaten FOV hesaplayıcı ve mozaik planlayıcı
var; modül oraya doğal oturuyor.

**Erişim:** Yalnızca premium. Premium kullanıcı ayrıca galeriye **30** fotoğraf
yükleyebilir (standart 5) — ikisi de FAZ 1'deki kota tablosundan okunur.

#### 13.1 Zaten var olan parçalar — yeniden yazmayın

Bu modülün ihtiyaç duyduğu şeylerin **çoğu Astrohub'da mevcut**:

| İhtiyaç | Mevcut karşılık |
|---|---|
| Setup (kamera + optik + montür + bileşenler) | **`user_setups`** — `slots` (jsonb) bileşimi tutuyor, `spacer_mm`, `seeing_arcsec`. Birden fazla setup zaten mümkün; premium farkı **kota** ile kurulur, yeni tablo ile değil |
| Kullanıcının ekipmanı | `user_equipment` (`model_id`, `weight_override_kg`) |
| Kare / filtre / süre şekli | **`photo_exposures`** — `filter`, `frames`, `exposure_seconds` |
| İstenen hedefler | `target_favorites` (`target_slug`) |
| Gözlem gecesi kaydı | `observation_logs` — `observed_on`, `target`, `seeing`, `transparency`, `equipment`, `note`, `photo_id` |
| Hedef kataloğu | `celestial_objects` + `catalog_identifiers` (FAZ 12 ile dolacak) |

**Kritik ayrım:** `photo_exposures` *geriye dönük* — yayımlanmış bir fotoğrafa
bağlı, "ne çekildi"yi anlatır. Planlama modülü aynı şekli **ileriye dönük**
kullanır: "ne çekilecek" (hedef) ve "nereye gelindi" (ilerleme). Aynı tabloyu
iki amaca zorlamayın; şekli örnek alın, ayrı tablo kurun.

#### 13.2 Yeni kurulacak kavramlar

1. **Proje** — bir hedef için çekim planı.
   Hedef (`celestial_objects`), setup (`user_setups`), sezon, durum
   (planlanıyor / çekiliyor / işleniyor / tamamlandı / rafta), notlar.
2. **Filtre hedefleri** — proje başına satırlar:
   filtre (L/R/G/B/Ha/OIII/SII/Lum…), **hedef kare sayısı**, kare başına
   pozlama süresi, **birikmiş kare sayısı**.
   Toplam entegrasyon süresi buradan hesaplanır, elle girilmez.
3. **Sezon** — projeleri gruplayan, **kullanıcının kendi tanımladığı** dönem.
   Takvim yılına ya da sabit bir mevsim tanımına bağlı **değildir**: kullanıcı
   bir ad ve **tarih aralığı** (başlangıç–bitiş) girer.
   Gerçek kullanım böyle: kullanıcı bir hafta çeker, tek bir veri seti alır ve
   o aralığı bir sezon olarak kaydeder. Yani sezon "2026 Kış" kadar uzun da
   olabilir, "12–19 Ağustos" kadar kısa da.
   Sabit mevsim listesi dayatmayın — kısa setleri ifade edemez.
4. **İlerleme kaydı** — her ekleme bir satır: tarih, filtre, eklenen kare,
   kaynak (elle / dosya içe aktarma / canlı aktarım), not.
   İlerlemeyi tek bir sayaç olarak tutmayın — geçmiş kaybolur ve yanlış
   girilen bir değer geri alınamaz.
5. **İşleme sonrası not** — kullanıcı projeyi işledikten sonra yazdığı
   değerlendirme; bittiğinde `astro_photos` kaydına bağlanabilmeli.

#### 13.3 Çekim yazılımlarıyla entegrasyon — aşamalı

İstenen: NINA, SGP, TheSkyX, APT ile haberleşip çekilen kare sayısını anlık
aktarmak.

> ⚠️ **Mimari gerçek:** Bu yazılımların hepsi kullanıcının bilgisayarında
> çalışan **masaüstü uygulamalarıdır**. Tarayıcıdaki bir web uygulaması
> bunlara doğrudan erişemez — ASCOM da aynı şekilde yerel bir arabirimdir.
> "Siteden montüre bağlanmak" tarayıcı güvenlik modeli gereği mümkün değildir.
> Bu yüzden entegrasyon üç aşamaya bölünmeli; her aşama kendi başına
> kullanılabilir olmalı.

**Aşama 1 — Elle giriş (ilk sürüm).**
Kullanıcı ilerlemeyi kendi girer. Modül bu aşamada bile tam işlevlidir;
sonraki aşamalar yalnızca veri girişini otomatikleştirir.

**Aşama 2 — Dosya içe aktarma.**
NINA ve SGP çekim günlüğü/CSV üretir. Kullanıcı dosyayı yükler, sistem
filtre + kare + süre çıkarıp ilerleme kaydı olarak ekler. **Önizleme ve
onay adımı zorunlu** — otomatik yazma, yanlış eşleşmeyi sessizce kalıcı yapar.

**Aşama 3 — Yerel köprü (opsiyonel, en son).**
Kullanıcının bilgisayarında çalışan küçük bir yardımcı uygulama, çekim
yazılımının çıktısını izleyip API'ye gönderir. Kimlik doğrulama kullanıcıya
özel bir anahtarla yapılır. Bu bir **masaüstü yazılım projesidir**, web
işi değildir; ayrı planlanmalı ve modülün ön koşulu sayılmamalı.

#### 13.4 Kapsam dışı (şimdilik)

Kullanıcının açık talebiyle ertelendi:
- ASCOM üzerinden montür kontrolü ve otomatik çekim planlama
- Montürün siteden sürülmesi

Modül bunlar olmadan da tam işlevli olacak şekilde tasarlanmalı.

**Kabul kriteri**
- Premium kullanıcı proje açıp filtre hedefleri tanımlayabiliyor; toplam
  entegrasyon süresi otomatik hesaplanıyor.
- İlerleme eklendiğinde geçmiş kayıt olarak duruyor, yanlış giriş geri
  alınabiliyor.
- Standart kullanıcı modüle **API üzerinden de** erişemiyor (negatif test).
- Modül Araçlar menüsünde; nav bar'a yeni üst seviye öğe eklenmemiş.
- Aşama 1 tek başına kullanılabilir — dosya içe aktarma olmadan da modül işe yarıyor.

---

### FAZ 14 — Katalog birleştirme ve görseller

Sitede **aynı işi yapan iki modül** var; biri kaldırılacak, ikisi tek katalogda
birleşecek. Ayrıca katalogda ve detay sayfasında **görsel** görünecek.

#### 14.1 Ölçülen durum

| Modül | Rota | Boyut | Nav |
|---|---|---|---|
| `features/targets` | `/hedefler`, `/hedef/:slug` | 2.124 satır | "Hedef Kataloğu" |
| `features/skycatalog` | `/araclar/gokyuzu-katalogu` | 902 satır | "Gökyüzü Kataloğu" |

**Karar:** Hedef Kataloğu kaldırılacak, **Gökyüzü Kataloğu** kalacak.

> ⚠️ **"targets modülünü sil" demek DEĞİL.** `features/targets/data.ts`
> sitenin **ortak katalog veri kaynağı** ve **14 ayrı modül** tarafından
> kullanılıyor:
> `sitemap`, `domain/catalog/rows`, `admin/catalogSync`, `MosaicPlannerPage`,
> `DiscoverPage`, `explorer`, `home/tonight` (iki dosya), `PhotoDetailPage`,
> `photos/tint`, `search`, `SimulatorPage`, `sky/PlannerPage`,
> `sky/TonightPage` — ve `skycatalog/katalog.ts`'in kendisi.
>
> Bu dosyayı silmek sitenin yarısını kırar. Kaldırılacak olan **yinelenen
> kullanıcı arayüzü**, veri kaynağı değil.

Bir başka tespit: **iki modül de `celestial_objects` tablosunu okumuyor.**
İkisi de statik dosyadan çalışıyor; veritabanına yalnızca `target_favorites`
için değiliyorlar. Yani birleştirme aynı zamanda bir *veri kaynağı* geçişidir.

#### 14.2 Sıra — bu sırayla yapılmalı

1. **FAZ 12.1 önce.** `celestial_objects` OpenNGC ile dolmadan geçiş
   yapılamaz; statik dosyada 182 kayıt var, tabloda ise tam katalog olacak.
2. **Gökyüzü Kataloğu'nu tablodan besle.** `skycatalog` sayfası artık
   `celestial_objects` + `catalog_identifiers` okusun.
3. **Hedef Kataloğu'nun eksiklerini taşı.** `targets/` içindeki şu parçalar
   Gökyüzü Kataloğu'nda yoksa oraya taşınmalı — silinmemeli:
   `grouping.ts` (gruplama), `codeGuess.ts` (katalog kodu çözümleme),
   `favorites.ts` + `FavoriteTargetButton` (favoriler),
   `TargetPicker` (başka akışlarda hedef seçimi için kullanılıyor).
4. **Rotaları birleştir.** `/hedefler` ve `/hedef/:slug` → Gökyüzü Kataloğu'na
   **kalıcı yönlendirme** (301 mantığı). Eski bağlantılar paylaşılmış olabilir;
   doğrudan 404'e düşürmeyin.
5. **Nav'dan "Hedef Kataloğu"nu kaldır.** Gökyüzü Kataloğu Araçlar altında kalır.
6. **`data.ts` bağımlılığını son adımda çöz.** 14 modülü tek seferde
   çevirmeyin; her birini ayrı ayrı tabloya bağlayıp doğrulayın. Hepsi
   geçtikten sonra `data.ts` silinebilir.

#### 14.3 Katalogda görseller

Katalog listesinde ve nesne detay sayfasında görsel görünecek.

**Görsel nereden gelecek — sıra önemli:**

1. **Topluluğun kendi fotoğrafları (birincil kaynak).**
   `astro_photos` tablosunda **`object_id` kolonu zaten var** — fotoğraflar
   gök cismine bağlanabiliyor. Katalog, o nesnenin yayındaki fotoğraflarından
   birini kapak olarak gösterebilir.
   Bu en temiz çözüm: telif sorunu yok, içerik kendi kullanıcılarınızdan
   geliyor ve fotoğrafçıya atıf doğal olarak yapılıyor.
   - Liste: nesne başına bir kapak (editör seçimi ya da en çok beğenilen).
   - Detay: o nesnenin tüm fotoğrafları galeri şeridi olarak + "bu hedefi
     sen de çek" bağlantısı.
2. **Açık lisanslı referans görseli (ikincil).**
   Topluluk fotoğrafı yoksa NASA/ESA/ESO arşivleri veya Wikimedia Commons.
   Her birinin atıf koşulu farklıdır; `image_credit` ve `image_licence`
   alanları **doldurulmadan** görsel yayına alınmamalı.
3. **Görsel yoksa boş bırakma.** Nesnenin türüne göre üretilmiş bir gradyan
   ya da sembol kullanın — sahte/alakasız görsel koymayın.

> deepskycorner.ch bu listede **yok**: telif izni alınmadan kullanılamaz
> (FAZ 12.2). İzin alınırsa 2. sıraya girer.

**Kabul kriteri**
- `/hedefler` adresine giden eski bir bağlantı Gökyüzü Kataloğu'na düşüyor,
  404 vermiyor.
- Katalogda ve detay sayfasında görseller görünüyor; kaynağı ve lisansı
  görselin yanında belirtiliyor.
- Fotoğrafı olmayan nesne bozuk görünmüyor.
- `TargetPicker` ve favoriler hâlâ çalışıyor (başka akışlar bunlara bağlı).
- Nav'da tek katalog var.

---

### FAZ 15 — Tekilleştirme: tek veri kaynağı

**Kural:** Sitede aynı amaca hizmet eden ikinci bir veri kaynağı ya da
fonksiyon kalmayacak. Her içerik türünün **tek** doğruluk kaynağı
veritabanıdır.

#### 15.1 Ölçülen durum — çift kaynak

Sitede **13 statik `data.ts` dosyası, toplam 5.487 satır** var. Bunların
yedisi bir veritabanı tablosunu birebir tekrarlıyor:

| Statik dosya | Satır | Veritabanı karşılığı |
|---|---:|---|
| `equipment/data.ts` | 1.972 | `equipment_models` |
| `observing-sites/data.ts` | 661 | `observing_sites` |
| `news/data.ts` | 500 | `content_entries` (kind=haber) |
| `photos/data.ts` | 440 | `astro_photos` |
| `articles/data.ts` | 318 | `content_entries` (kind=yazi) |
| `events/data.ts` | 281 | `events` |
| `targets/data.ts` | 251 | `celestial_objects` |

Karşılığı henüz olmayanlar: `clubs` (340) → `clubs` tablosu var ama sayfa
dosyadan okuyor · `marketplace` (235) → `listings` · `forum` (162) →
`forum_*` · `home` (256) → `hero_slides`/`featured_content` · `radio`/`tv`.

**Bu neden sadece "artık kod" değil, bir hata kaynağı:**
- Aynı içeriğin iki doğruluk kaynağı var ve hangisinin geçerli olduğu
  hangi kod yolundan geçildiğine bağlı. Yönetim panelinin "0 kayıt"
  gösterirken sitenin dolu görünmesinin sebebi tam olarak budur (H2).
- `admin/catalogSync.ts` **`targets/data.ts`'ten okuyup veritabanına yazıyor**.
  Yani TS dosyası tablonun kaynağı konumunda; panelden yapılan düzenleme bir
  sonraki senkronizasyonda ezilme riski taşıyor.
- Panelden içerik eklemek anlamsız hale geliyor: kullanıcı ekliyor, site
  göstermiyor.

#### 15.2 Hedef durum

- **Veritabanı tek doğruluk kaynağıdır.** Public sayfalar, panel ve arama
  aynı tablodan okur.
- `data.ts` dosyaları **tek seferlik tohum verisine** dönüşür: içerikleri
  tabloya taşınır, sonra dosya silinir.
- `catalogSync` artık TS dosyasından değil, **dış kaynaktan** (OpenNGC —
  FAZ 12.1) besler.
- Aynı işi yapan iki sayfa/rota/fonksiyon bırakılmaz.

#### 15.3 Sıra — modül modül, tek seferde hepsi değil

Her modül için aynı beş adım:

1. `data.ts` içeriğini tabloya yazacak **tek seferlik** taşıma üret.
2. Sayfayı tablodan okuyacak şekilde çevir.
3. Doğrula: sayfa aynı içeriği gösteriyor mu, arama çalışıyor mu.
4. `data.ts`'i sil.
5. O modüle bağlı diğer dosyaları kontrol et — `targets/data.ts` örneğinde
   14 modül bağlıydı (FAZ 14.1).

**Önerilen sıra** (bağımlılığı az olandan çoğa):
`news` → `articles` → `events` → `marketplace` → `clubs` →
`observing-sites` → `photos` → `equipment` → `targets`

`targets` **en sonda**: en çok bağımlısı olan ve FAZ 14'ün de konusu olan
dosya odur.

> ⚠️ Hepsini tek seferde çevirmeyin. Bir modül bozulduğunda hangi taşımanın
> sebep olduğu belirsizleşir ve geri almak zorlaşır.

#### 15.4 Fonksiyon tekilleştirmesi

Veri kaynağı gibi, aynı işi yapan iki fonksiyon da bırakılmayacak.
Faz boyunca şunlar denetlenmeli:

- Aynı sayımı/özeti üreten birden fazla RPC ya da istemci-tarafı hesap
  (H1'de görüldüğü gibi: panel sayıları bir yerde RPC'den, bir yerde
  istemcide ilk 100 kayıttan hesaplanıyordu).
- Aynı yetki sorusunu farklı yollarla soran kod — yetki **yalnızca**
  `app.is_admin()` / `app.has_role()` / `app.izin_var()` / `app.kota()`
  üzerinden sorulmalı, ikinci bir kalıp kurulmamalı.
- Aynı listeyi hem statik dosyadan hem tablodan çeken yardımcılar.

**Kabul kriteri**
- `src/features/*/data.ts` dosyalarından hiçbiri kalmamış.
- Panelden eklenen içerik **anında** public sayfada görünüyor.
- `catalogSync` artık TS dosyasına bağımlı değil.
- Aynı veriyi döndüren ikinci bir fonksiyon/rota yok.
- Arama, site haritası ve keşif sayfaları tablodan besleniyor.

---

### FAZ 16 — İlan akışı düzeltmeleri

#### 16.1 Önce doğrula — mevcut durum

`src/features/marketplace/` altında **`ListingPhotos.tsx` ve testi zaten var**.
Fotoğraf yükleme sıfırdan yazılmadan önce bu dosyanın ne yaptığı okunmalı;
eksik olan tamamlanmalı, çalışan kısım yeniden yazılmamalı.
`listingsSpec.ts` de ilan doğrulama kurallarını taşıyor.

#### 16.2 Bug: "yol bulunamadı" — ilan yayınlanamıyor

Kullanıcı ilan girerken hata alıyor ve ilan yayınlanamıyor.

**Önce yeniden üret, sonra düzelt.** Hata metni ("yol bulunamadı") iki farklı
şeyi işaret edebilir ve yanlış olanı düzeltmek zaman kaybıdır:
- **Rota**: form gönderiminden sonra var olmayan bir adrese yönlendirme
  (`/ilan/:slug` üretilmeden yönlendirme yapılıyor olabilir).
- **Depolama yolu**: fotoğraf yüklenirken storage bucket yolu hatalı ya da
  bucket yok.
- **RLS**: `listings` insert politikası reddediyor ve hata kullanıcıya
  yanlış metinle gösteriliyor.

Tarayıcı konsolu ve ağ sekmesindeki gerçek yanıt görülmeden tahminle
düzeltme yapılmamalı.

#### 16.3 Form sadeleştirme

- **Katalog modeli girdisi kaldırılacak.** `listings.model_id` alanı formdan
  çıkar. Kolonun veritabanından düşürülüp düşürülmeyeceği ayrı karar —
  önce formdan kaldırın, veri kaybı riski yoksa sonra kolonu temizleyin.

#### 16.4 İlan fotoğrafları

- En fazla **3 fotoğraf**, her biri en fazla **5 MB**.
- 5 MB üzeri dosya **otomatik optimize edilir** (yeniden boyutlandırma +
  sıkıştırma), kullanıcıya "dosya çok büyük" hatası verilmez.
- Optimizasyon **istemcide** yapılmalı: 5 MB'ın üzerindeki dosyayı önce
  sunucuya yollayıp orada küçültmek hem kotayı hem kullanıcının bağlantısını
  boşa harcar.
- Sınırlar kotadan okunur (`tier_limits`), koda gömülmez.

#### 16.5 İlan yaşam döngüsü — kullanıcı tarafı

Kullanıcı kendi ilanını:
- **düzenleyebilir** (mevcut değerler forma dolu gelir),
- **silebilir** (soft delete — FAZ 3),
- **arşive alabilir**,
- **arşivden çıkarıp yeniden yayına alabilir**.

> ⚠️ **Yeniden yayına alırken kullanıcı her şeyi baştan girmemeli.** Arşivden
> çıkarma, mevcut kaydın durumunu değiştirmelidir — yeni kayıt açma akışına
> yönlendirme değil. Bu, şikayetin özü.

Yeniden yayına alınan ilan gerekiyorsa tekrar onaya düşer (FAZ 8) ve 6 aylık
süre yeniden başlar.

**Kabul kriteri**
- İlan yayınlama uçtan uca çalışıyor, hata yok.
- 6 MB'lık bir fotoğraf hatasız yükleniyor (otomatik küçültülüyor).
- 4. fotoğraf eklenemiyor.
- Arşivden çıkarılan ilan, önceki tüm bilgileriyle geri geliyor.

---

### FAZ 17 — Galeri ve fotoğraf künyesi

#### 17.1 Önce doğrula — çoğu zaten var

> ⚠️ Bu fazda istenenlerin **büyük kısmı Astrohub'da zaten kurulu.**
> Yeniden yazmadan önce her maddeyi doğrulayın.

| İstenen | Mevcut durum |
|---|---|
| **Plate solve (astrometry.net)** | ✅ **Kurulu.** `0032`, `0033`, `0034` migration'ları + `PhotoViewer.tsx` içinde `PlateSolveOverlay` ve "⌖ Alan çözümü açık/kapalı" düğmesi. Kuyruk durumu bile var. **Yapılacak iş: çalıştığını doğrulamak**, yeniden yazmak değil |
| **Filtre kataloğu (marka/model)** | ✅ **Veritabanı hazır ve dolu.** 6 tablo (`astro_filter_products`, `_categories`, `_passbands`, `_types`, `_aliases`, `_product_categories`), `0072_astro_filtre_veritabani.sql` ile dolduruluyor. ❌ **Eksik: forma bağlı değil** — yükleme sihirbazı düz metin kutusu kullanıyor |
| **Puanlama** | ✅ **Tamamen kurulu.** `photo_ratings` tablosu (`score`, `updated_at`) + `RatingControl` ve `RatingBadge` bileşenleri `PhotoDetailPage`'de render ediliyor. Yapılacak iş: puanın **değiştirilebildiğini** doğrulamak |
| **Yorum** | ✅ **Tamamen kurulu.** `photo_comments` tablosu + `PhotoComments` bileşeni sayfada render ediliyor |
| **Künye sekmeleri** | ✅ `EquipmentTab`, `ExposureTab`, `ProcessingTab`, `LocationTab` zaten var — sıfırdan yazmayın, eksik alanları bunlara ekleyin |
| **İl/ilçe** | ✅ `provinces` ve `districts` tabloları var |
| **Konum** | `photo_exact_locations` ayrı tabloda (gizlilik tasarımı) |

#### 17.2 Filtre seçimi

Yükleme sihirbazındaki poz satırlarında filtre alanı bugün **düz metin**.
Katalogdan beslenen bir seçime dönüşmeli:

- **En üstte sabit sıra** (en sık kullanılanlar):
  `L · R · G · B · Ha · OIII · SII · IR/UV Cut`
- Altında **marka/model tam listesi** — `astro_filter_products` tablosundan.
  Astrohub'da bu veri zaten var; **yeni liste toplamadan önce tablonun
  içeriğine bakın.** Eksik marka varsa katalog tablosuna eklenir, koda değil.
- Elle yazmaya izin verilir ve **otomatik tamamlama** yapılır
  (`astro_filter_aliases` bunun için var).
- Katalogda olmayan bir filtre yazılırsa kayıt kabul edilir ama
  moderasyon kuyruğuna "yeni filtre önerisi" olarak düşer (FAZ 5).

#### 17.3 Kalibrasyon kareleri

Poz bilgisine ek olarak dört alan: **Dark · Flat · Bias · DarkFlat**.
Her biri kare sayısı. `astro_photos.calibration` alanı bunun için uygun;
yeni tablo gerekmez.

#### 17.4 Video / gezegen çekimi

Poz satırında **"Video" işaret kutusu**. İşaretlenince kare sayısı yerine:
- **video süresi** (saniye) ve
- **poz süresi** (ms)

alanları gelir. Gezegen çekimi böyle yapılıyor; kare sayısı istemek yanlış
veri üretir.

`photo_exposures` tablosuna bunu ifade eden alanlar eklenmeli
(`is_video`, `video_seconds`); mevcut `frames` / `exposure_seconds`
korunur.

#### 17.5 İşleme yazılımları

Bugün tek bir metin alanı (`software: string`). **Çoklu seçim listesine**
dönüşmeli: DeepSkyStacker · PixInsight · Photoshop · Lightroom · Siril ·
APP (Astro Pixel Processor) · StarTools · GraXpert · Topaz · AstroSurface ·
AutoStakkert · RegiStax · WinJUPOS · Sequator · Affinity Photo · GIMP

Liste **veritabanında** tutulmalı (yeni bir küçük katalog tablosu ya da
`app_settings` anahtarı), koda gömülmemeli — yeni yazılım çıktığında kod
değişmesin. Elle giriş + otomatik tamamlama.

#### 17.6 Konum

**Konum görünürlüğü seçimi kaldırılacak.** Yerine **il / ilçe** seçimi gelir;
`provinces` ve `districts` tabloları zaten var.

> Kesin koordinat isteniyorsa `photo_exact_locations` tablosunda kalmaya
> devam eder ve public sayfada gösterilmez. İl/ilçe zaten yeterince kaba
> olduğu için ayrı bir görünürlük ayarına gerek kalmıyor — sadeleşmenin
> mantığı bu.

#### 17.7 Künyeden ekipmana göre filtreleme

Fotoğraf künyesinde ekipman adına tıklanınca, **o ekipmanla çekilmiş tüm
fotoğraflar** listelenir. `astro_photos` tablosunda `optic_id`, `camera_id`,
`mount_id` kolonları zaten var — filtreleme bunlar üzerinden yapılır.

#### 17.8 Galeride ekipmana göre arama

Galeri aramasına ekipman filtresi: elle giriş + otomatik tamamlama
(`equipment_models` tablosundan). Nav bar aramasıyla (FAZ 11.4) aynı
otomatik tamamlama altyapısını kullanmalı — ikinci bir arama mantığı
yazılmamalı (§6.8).

#### 17.9 Puanlama ve yorum — yalnızca doğrulama

Her ikisi de **kurulu ve sayfada render ediliyor** (§1.3). Bu madde bir
geliştirme değil, bir **kontrol**:

- Kullanıcı verdiği puanı sonradan **değiştirebiliyor mu**?
  (`photo_ratings.updated_at` şemada destekliyor)
- Yorum ekleme/düzenleme/silme çalışıyor mu?

Çalışıyorsa **dokunmayın**. Çalışan bir bileşeni "iyileştirmek" için yeniden
yazmak, bu projede en sık tekrarlanan hata olur.

#### 17.10 Bağlanmamış tabloları karara bağla

§1.4'te üç tablo "kurulu ama hiç kullanılmıyor" çıktı:
`collections` + `collection_items`, `photo_exact_locations`,
`astro_filter_aliases`.

- `astro_filter_aliases` → **17.2'de kullanılacak** (otomatik tamamlama).
- `photo_exact_locations` → 17.6 ile birlikte karara bağlanmalı: il/ilçe
  yeterliyse tablo kaldırılır, değilse okunur hale getirilir. **Boş bırakmayın**
  — kullanılmayan tablo, ileride hangisinin doğru olduğunu belirsizleştirir (§6.8).
- `collections` → koleksiyon özelliği isteniyor mu? İstenmiyorsa tablolar
  düşürülür.

**Kabul kriteri**
- Filtre seçiminde ilk sekiz filtre üstte, marka/model listesi altında.
- Elle yazılan filtre otomatik tamamlanıyor.
- Video işaretlenince kare sayısı yerine süre alanları geliyor.
- İşleme yazılımı birden fazla seçilebiliyor.
- Künyede ekipmana tıklayınca o ekipmanla çekilen fotoğraflar geliyor.
- Plate solve düğmesi çalışıyor ve overlay açılıp kapanıyor.
- Kullanıcı verdiği puanı değiştirebiliyor.

---

### FAZ 18 — Yarım kalmışları karara bağla

§1.5'te ölçülen **18 parça** için tek tek karar verilecek: **bağla** ya da
**kaldır**. Bu faz yeni özellik geliştirmez; yarım bırakılmış yüzeyi kapatır.

**Yöntem — her parça için sırayla:**
1. Ne için yazıldığını anla (migration/commit mesajı, bileşen içeriği).
2. Şu an bir ihtiyaca karşılık geliyor mu? Kullanıcıya sor, tahmin etme.
3. **Evet** → ilgili faza bağla ve arayüze çıkar.
   **Hayır** → kaldır (RPC'yi `drop`, bileşeni sil, tabloyu düşür).
4. Kararı denetim kaydına ve bu belgeye yaz.

**Doğrudan bir faza bağlanabilecekler** (ayrı karar gerekmez):
- `notify_user` → **FAZ 6** bildirim altyapısı bunu kullanmalı; ikinci bir
  bildirim yolu yazılmamalı (§6.8).
- `announce_program_live`, `announce_tv_live` → **FAZ 10** yayın duyuruları.
- `alandaki_cisimler` → **FAZ 17**; plate solve zaten çalışıyor, bu fonksiyon
  çözülen alandaki cisimleri listeliyor — künyeye doğal olarak oturur.
- `astro_filter_aliases` → **FAZ 17.2** otomatik tamamlama.
- `toggle_saved_photo` + `SavedViewsMenu` + `saved_views` + `/panel/kaydedilenler`
  → **FAZ 9** kullanıcı paneli; parçalar var, birleştirilmemiş.
- `photo_of_week_results` → **FAZ 7**; menüde `/haftanin-fotografi` zaten var.

**Kullanıcı kararı gerekenler:**
- `collections` / `collection_items` — koleksiyon özelliği isteniyor mu?
- `photo_exact_locations` — il/ilçe yeterliyse (FAZ 17.6) tablo kaldırılır.
- `CsvExportButton` — dışa aktarma isteniyor mu?
- `DarkSkyStrip` — anasayfada yer alsın mı? (FAZ 7 anasayfa yönetimi)
- `imm_birlestir` — İMM kompendiyumu ne durumda?

**Doğrulanacaklar (silmeden önce):**
- `plate-solve-poll`, `youtube`, `katalog-yukle`, `radyo-durum` edge
  function'ları nasıl tetikleniyor? Zamanlayıcıdan çağrılıyorsa meşrudur.

**Kabul kriteri**
- 18 parçanın her biri için karar verilmiş ve uygulanmış.
- "Belki lazım olur" diye bırakılan hiçbir parça kalmamış.
- Kaldırılanlar migration ile düşürülmüş, denetim kaydına yazılmış.

---

## 5. Fazlar arası bağımlılık

```
FAZ 0 (temel)
   └─ FAZ 1 (yetki)
        ├─ FAZ 2 (kullanıcı yönetimi)
        ├─ FAZ 3 (durumlar + soft delete)
        │     ├─ FAZ 4 (içerik + onay)
        │     │     └─ FAZ 7 (anasayfa + editör)
        │     ├─ FAZ 5 (moderasyon)
        │     └─ FAZ 8 (ilan döngüsü)
        ├─ FAZ 6 (bildirim + mesaj)
        └─ FAZ 9 (kullanıcı paneli)   ← 3,4,6,8 tamamlandıkça dolar
FAZ 10 (radyo/TV)          — bağımsız, paralel yürüyebilir
FAZ 11 (public gezinme/forum) — bağımsız, hemen başlayabilir
FAZ 12 (dış katalog)          — bağımsız; 12.2 telif iznine bağlı
FAZ 13 (Gökyüzü Arşivim)      — FAZ 1'e (kota) bağlı; FAZ 12.1 hedef kataloğunu besler
FAZ 14 (katalog birleştirme)  — FAZ 12.1'e bağlı (tablo dolmadan geçilemez)
FAZ 15 (tekilleştirme)        — FAZ 4, 12, 14'ü tamamlar; modül modül yürür
FAZ 16 (ilan düzeltmeleri)    — FAZ 3'e (soft delete) bağlı; bug bağımsız
FAZ 17 (galeri künyesi)       — bağımsız; çoğu doğrulama işi
FAZ 18 (yarım kalmışlar)      — 6,7,9,10,17 ile birlikte yürür; kalanlar karar bekler
```

Faz 0 ve 1 **sırayla** yapılmalı. Sonrasında 2, 5, 6 paralel yürüyebilir.
Faz 10 ve 11 hiçbir şeye bağlı değildir; kaynak varsa en baştan başlatılabilir.

---

## 6. Tekrarlayan kurallar

Her fazda geçerli, her fazda kontrol edilecek:

1. **Yetki veritabanında zorlanır.** Arayüzde buton gizlemek yetkilendirme
   değildir. Her yeni tablo/eylem için RLS politikası yazılır.
2. **Moderatör silemez.** Silme politikaları yalnızca `app.is_admin()`.
3. **Public alan durum sızdırmaz.** Ziyaretçi yalnızca yayındakini görür;
   "onayda"/"reddedildi" etiketleri yalnızca sahibine ve yönetime.
4. **Yönetim işlemleri kayda geçer.** Rol, premium, içerik durumu, silme,
   arşivleme, forum moderasyonu → `audit_logs`.
5. **Hiçbir şey sessizce silinmez.** Soft delete varsayılan; kalıcı silme
   ayrı ve yalnızca admin.
6. **Negatif test zorunlu.** Her fazın kabulünde "yetkisiz kullanıcı bunu
   yapamıyor" testi olmalı — politikanın yazılmış olması çalıştığını kanıtlamaz.
7. **Yeni tablo kurmadan önce §1.1'e bakın.**
8. **Tek doğruluk kaynağı.** Aynı içeriğin ikinci bir kaynağı (statik dosya,
   ikinci tablo, ikinci RPC) bırakılmaz. Yeni bir sayfa yazarken veriyi
   nereden okuduğunu sor: cevap her zaman veritabanı olmalı. Bir modülü
   tabloya bağladıktan sonra eski kaynağı **silin** — "şimdilik dursun"
   denilen dosya, aylar sonra hangisinin doğru olduğunun bilinmemesine
   yol açar (bkz. FAZ 15).

---

## 7. Riskler

| Risk | Neden | Azaltma |
|---|---|---|
| **Durum kümesi geçişi** | Mevcut tablolarda farklı durum değerleri var; iki küme bir arada yaşarsa hangi filtrenin doğru olduğu belirsizleşir | Faz 3'te eşleme tablosu + tek seferlik dönüşüm; ara durum bırakmayın |
| **PDF/Word import** | En kırılgan iş; biçim çeşitliliği sonsuz | Ayrı alt-faz, HTML→Word→PDF sırası, her zaman önizleme adımı |
| **Radyo sunucusu** | Altyapı işi, uygulama işi değil | Faz 10'a bırakıldı; diğer fazları bloke etmemeli |
| **Kaldırılan modüllerin iş kuralları** | 16.000 satırda yazılı kurallar siliniyor | `admin-legacy/`'ye taşıyın, yeniden yazarken oradan okuyun |
| **Yanlış Supabase projesi** | Aynı hesapta StageHub projesi de var | Her migration öncesi parmak izi kontrolü: `venue_events`/`studio_profiles` varsa **dur** |
| **`data.ts` → tablo geçişi** | Hepsi birden yapılırsa hata kaynağı belirsizleşir | Modül modül, her adımda doğrula |

---

## 8. Sorular

### 8.1 Cevaplananlar — plana işlendi

| Soru | Cevap | Nereye işlendi |
|---|---|---|
| "Saha modülü" hangi tablo? | **`observing_sites`** (gözlem noktaları) | §3.3 izin adı, FAZ 4 içerik sekmesi |
| Jüri rolü ne yapar? | **Yalnızca haftanın fotoğrafı adaylarına oy verir.** Başka yönetim yetkisi yok; standart veya premium statüyle birlikte atanabilir | §3.2 |
| Topluluk sahipliği | Topluluğu ekleyen kullanıcı **tamamen düzenleyebilir**, admin de düzenleyebilir | FAZ 4, madde 6 |
| Topluluk silme | **İki aşamalı:** sahip gerekçeli talep açar → admin onaylar. Sahip tek başına silemez | FAZ 5, madde 5 |
| Forum görünümü | Kart görünümüne ek **liste görünümü**; kategori/alt başlık hiyerarşisi düzeltilecek | FAZ 11.2 |
| Geri dönüş | Site geneli geri dönüş **+ kaydırma konumu korunması** | FAZ 11.1 |
| Arşiv sezonu | **Kullanıcı kendi tanımlar:** ad + tarih aralığı. Sabit mevsim yok; bir haftalık set de sezon olabilir | FAZ 13.2 |
| OpenNGC içe aktarma | **Evet, atıf vererek.** CC-BY-SA-4.0 kabul edildi | FAZ 12.1 |
| Katalog görselleri | **Önce topluluk fotoğrafları** (`astro_photos.object_id`), eksikler için açık lisanslı arşivler. deepskycorner kullanılmayacak | FAZ 14.3 |
| Spotify | **Yalnızca bağlantı gömme.** Senkronizasyon yok | FAZ 10 |
| İlan bitiş bildirimi | **7 gün ve 1 gün önce** iki hatırlatma | FAZ 8 |
| Topluluk silme talebi | **Yalnızca admin görür.** Moderasyon kuyruğunda moderatöre görünmez | FAZ 5 |
| Geri istenen modüller | **RecordsControl ve ClubControl** yeni panelde yeniden yazılacak | FAZ 5, FAZ 4 |
| Premium ne açıyor | **30 fotoğraf** (standart 5) + **Gökyüzü Arşivim** modülü. Diğer özellikler ikisine de açık | §3.3, FAZ 1 |
| Modülün adı ve yeri | **"Gökyüzü Arşivim"**, Araçlar menüsü altında — nav bar kalabalıklaşmasın | FAZ 13 |

### 8.2 Açık soru kalmadı

Planın uygulanması için gereken tüm ürün kararları verildi. Yeni bir soru
çıkarsa buraya eklenmeli — kod yazarken varsayımla ilerlemek yerine sorun.

---

## 9. Önerilen çalışma düzeni

- Her fazı **ayrı oturumda** verin; faz sonunda kabul kriterini kontrol edin.
- Her faz sonunda `typecheck`, `lint`, `build` ve testler yeşil olmalı —
  bir sonraki faza kırık bir tabanla girmeyin.
- Veritabanı değişikliklerini **migration olarak** yazın; panelden elle SQL
  çalıştırmayın. Aksi halde şema kayması oluşur ve temiz kurulum bozulur.
- Her fazın sonunda **ne kaldırıldığını / ne eklendiğini** yazılı raporlatın.

### 9.1 İlerleme panosu — otomatik

Depoda `docs/ilerleme.html` dosyası bulunur ve **claude.ai artifact olarak
yayımlanmıştır**. Kullanıcı bu panoya **elle dokunmaz**; tıklanabilir bir
işaretleme yoktur. Tek doğruluk kaynağı dosyanın içindeki `DURUM` bloğudur.

**Claude Code'un sorumluluğu — her oturumda:**

1. Bir göreve **başlarken** ilgili anahtarı `"yapiliyor"` yap.
2. Görevi **bitirdiğinde** `"tamamlandi"` yap.
3. `GUNCELLEME` alanına tarihi yaz.
4. Panoyu **aynı URL'ye** yeniden yayımla (Artifact aracına `url` parametresi
   ile). Yeni URL üretme — kullanıcı tek bir adresi takip ediyor.

Anahtar biçimi `"<faz>:<görev sırası>"`, sıra 0'dan başlar. Dosyanın başındaki
açıklama bloğu bunu örnekle anlatır.

**Kurallar**
- Yapılmamış bir işi tamamlandı işaretleme. Pano, kullanıcının işin nerede
  olduğunu gördüğü tek yer; yanlış işaret onu görünmez şekilde yanıltır.
- Kısmen biten görevi `"yapiliyor"` bırak, `"tamamlandi"` yapma.
- Bir görev iptal edildiyse ya da kapsam dışına çıktıysa panoda **bırak** ve
  durumu değiştirme; kullanıcıya raporunda ayrıca söyle.
- Panonun görev listesini bu plan belgesiyle **eşzamanlı tut**: plana yeni
  madde eklenirse panoya da ekle.
- İkinci bir ilerleme listesi tutma. İki liste birbirinden ayrı düşer ve
  hangisinin doğru olduğu belirsizleşir.

---

## 10. Kodlama dışı işler — sende olan adımlar

Planın bazı noktaları kodla bitmez: dış servis hesabı, izin, abonelik, sunucu
ya da ürün kararı gerekir. Bunlar **önceden** listelenmiştir ki iş o noktaya
geldiğinde sürpriz olmasın.

### 10.1 Claude Code'un davranışı — kural

Bir görev kodlama dışı bir engele dayandığında Claude Code:

1. **O iş kolunda durur.** Engeli aşmaya çalışmaz, tahmini kimlik bilgisiyle
   ilerlemez, "şimdilik sahte veriyle yapayım" demez.
2. Panoda ilgili maddeyi **`"sende"`** durumuna alır (bkz. §9.1).
3. Kullanıcıya **adım adım ne yapması gerektiğini** yazar: nereye girilecek,
   hangi hesap açılacak, hangi bilgi geri getirilecek, tahmini ücret varsa o.
4. **Engellenmemiş diğer işlere geçer.** Tek bir engel yüzünden bütün faz
   durmaz; yalnızca o iş kolu bekler.
5. Gerekli bilgi geldiğinde kaldığı yerden devam eder.

> Bu kural olmadan olan şey şudur: ajan engeli fark etmeyip etrafından
> dolaşır, yarı çalışan bir şey bırakır ve eksik olduğu haftalar sonra
> ortaya çıkar.

### 10.2 Bilinen engeller

| # | Ne gerekiyor | Hangi fazı bekletir | Senden istenen |
|---|---|---|---|
| ~~D1~~ | ~~Premium özellik kararı~~ | — | ✅ **Kapandı:** 30 fotoğraf + Gökyüzü Arşivim. Diğer özellikler ikisine de açık (§3.3) |
| D2 | **Supabase panel ayarları** | FAZ 0–1 | Authentication → sızdırılmış şifre koruması ve e-posta onayı ayarlarının teyidi. Panelden yapılır, migration'la değil |
| D3 | **E-posta sağlayıcı** | FAZ 6 | Hesap (Resend vb.) + **alan adı doğrulaması** (SPF/DKIM kayıtları). Doğrulama yapılmadan bildirim e-postaları spam'e düşer |
| D4 | **Web push anahtarları** | FAZ 6 | VAPID anahtar çifti üretimi ve gizli anahtarın Supabase secret'ına konması |
| D5 | **VPS — radyo yayın sunucusu** | FAZ 10 | 2 vCPU / 4 GB RAM / 80 GB disk. Depoda `deploy/radyo/` altında `docker-compose.yml` ve `Caddyfile` **hazır**; README "BLOKE — VPS gerekiyor" diyor. Ayrıca iki alt alan adı ve TLS |
| D6 | **YouTube Data API** | FAZ 10 | Google Cloud projesi, API anahtarı, OAuth onay ekranı, kanal bağlama. Kota sınırı var — `youtube_quota_log` tablosu bunun için |
| D7 | **Spotify Developer** | FAZ 10 | Geliştirici hesabı + uygulama kaydı. Kapsam karara bağlandı: **yalnızca bağlantı gömme** |
| ~~D8~~ | ~~deepskycorner.ch izni~~ | — | ✅ **Kapandı:** kullanılmayacak. Görseller topluluk fotoğraflarından (FAZ 14.3) |
| ~~D9~~ | ~~OpenNGC lisans kararı~~ | — | ✅ **Kapandı:** kabul edildi, atıf verilerek aktarılacak |
| D10 | **Ödeme sağlayıcı** | Premium tahsilatı | Hesap + sözleşme + webhook adresi. `billing_transactions` tablosu ve idempotency alanı **hazır**; eksik olan hesap |
| D11 | **Masaüstü köprü dağıtımı** | FAZ 13 aşama 3 | `tools/mount-bridge/` **zaten var** (Windows, ASCOM Platform gerektiriyor). Eksik olan: kullanıcıya dağıtım yolu ve istenirse kod imzalama sertifikası |

### 10.3 Bunlardan bağımsız ilerleyebilecek fazlar

Yukarıdaki engellerin **hiçbirine** dokunmayan işler:

FAZ 0 (D2 hariç) · FAZ 2 · FAZ 3 · FAZ 4 · FAZ 5 · FAZ 7 · FAZ 8 · FAZ 9 ·
FAZ 11 · FAZ 12.1 (D9 kararından sonra) · FAZ 14 · FAZ 15

Yani engellerin çoğu **FAZ 6 ve FAZ 10**'da toplanıyor. Bu ikisini beklerken
diğer on faz yürüyebilir.

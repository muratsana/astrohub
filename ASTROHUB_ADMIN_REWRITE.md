# ASTROHUB — YÖNETİM PANELİ YENİDEN YAZIMI VE İÇERİK YÖNETİM SİSTEMİ

**Belge sürümü:** v1.0 — 06 Ağustos 2026
**Kapsam:** (A) Sıfırdan admin paneli + gelişmiş kullanıcı yönetimi, (B) Gelişmiş içerik yönetim modülü (zengin editör + PDF/DOCX/HTML import), (C) Zorunlu kullanıcı adı seçimi onboarding akışı
**Hedef ortam:** astrohub.com.tr production kod tabanı (Next.js + Supabase — proje ref: `eoqggvosegjbburyuyba`)
**Uygulayıcı:** Claude Code / Codex ajanı. Bu belge görev tanımı ve kabul kriteri belgesidir; uygulama kodu içermez. Şema önerileri bağlayıcıdır, kod parçacıkları yönlendiricidir.

---

## 0. YÜRÜTME KURALLARI (İHLAL EDİLEMEZ)

1. **Faz 0 tamamlanmadan hiçbir kod yazılamaz.** Önce keşif raporu üretilir.
2. **Görev atlanamaz.** Her görev ya tamamlanır ya da "ENGELLENDİ + gerekçe + öneri" olarak raporlanır. "Kısmen yapıldı" kabul edilmez.
3. **Her sprint sonunda rapor:** tamamlanan görevler, kanıt (dosya yolları, ekran çıktısı, SQL sonucu), atlanan/engellenen görevler ve gerekçeleri.
4. **Migration disiplini:** Her DB değişikliği ayrı, adlandırılmış migration dosyasıdır. Migration'lar geri alınabilir yazılır. Production'a uygulamadan önce kullanıcıdan (Murat) açık onay istenir.
5. **RLS zorunlu:** Yeni her tabloda RLS açık ve politikaları yazılmış olmalıdır. Mevcut RLS mimarisi (app şeması yardımcı fonksiyonları, `user_roles` kontrolü) korunur ve aynı desenle genişletilir.
6. **Audit zorunlu:** Admin panelden yapılan her yazma işlemi `audit_logs` tablosuna kayıt düşürür. İstisna yoktur.
7. **Mevcut site tasarım dili korunur:** `#07090b` koyu zemin, mevcut tipografi ve bileşen dili. Admin paneli sitenin "iç mekân" versiyonudur, yabancı bir ürün gibi durmaz.
8. **Türkçe arayüz:** Tüm admin arayüzü Türkçe. Kod, değişken ve migration adları İngilizce.
9. **Mock/hardcoded veri yasağı:** Yeni admin paneli hiçbir yerde statik sahte veri göstermez. Veri yoksa boş durum (empty state) bileşeni gösterilir.
10. **Silme işlemleri iki aşamalıdır:** onay diyaloğu + sebep alanı. Kalıcı silme yalnızca `admin` rolüne açıktır.

---

## 1. MEVCUT DURUM ANALİZİ (06.08.2026 tespitleri)

Bu bölüm canlı site ve production Supabase şeması incelemesine dayanır. Faz 0'da ajan bu tespitleri kod düzeyinde doğrulayacaktır.

### 1.1. Veritabanında hâlihazırda var olan yönetim altyapısı

| Tablo | Durum | Not |
|---|---|---|
| `user_roles` | 2 kayıt | Rol tabanlı yetki buradan; enum değerleri Faz 0'da çıkarılacak (en az `admin` ve `content_editor` olduğu tablo yorumlarından anlaşılıyor) |
| `audit_logs` | Aktif, yalnızca-ekleme | actor_id, action, target_type, target_id, detail(jsonb) — yeni panel bunu kullanmaya devam eder |
| `moderation_queue` | Boş | Polimorfik hedefli tek kuyruk; şikayet akışı hazır ama panel yüzeyi zayıf |
| `hero_slides`, `nav_links`, `home_modules`, `feature_flags`, `app_settings`, `setting_history` | Dolu | Site ayarları katmanı çalışıyor; YENİ PANELE TAŞINACAK, şema değişmez |
| `featured_content` | 9 kayıt | (kind, slug, position) — öne çıkan içerik mekanizması var, admin yüzeyi geliştirilecek |
| `content_entries` | **0 kayıt** | CMS tablosu kurulmuş ama BOŞ: kind, slug, title, summary, body(text[]), **body_blocks(jsonb)**, category, status('taslak'), author, image_url... Haber/yazı içerikleri şu an DB'de değil |
| `account_deletion_requests`, `account_export_logs` | Boş | KVKK akışları için tablolar hazır, admin işleme yüzeyi yok |

### 1.2. Kritik tespitler

- **T1 — İçerikler kodda gömülü:** Canlı sitedeki haberler ve yazıların önemli kısmı (ör. `/yazi/ilk-setup`, `/yazi/kalibrasyon` — "Gökhan Uzun", "Deniz Arslan" imzalı olanlar) hardcoded/mock. `content_entries` tablosu 0 satır. İçerik yönetiminin ilk işi bu içerikleri DB'ye taşımaktır.
- **T2 — İki farklı yazı rotası:** `/yazilar/[slug]` (etkileşimli, özel bileşenli rehberler: SNR, kutup hizalaması, drizzle) ve `/yazi/[slug]` (statik mock). Bu ikilik Faz 0'da haritalanacak; hedef tek rota + "özel bileşen bloğu" desteğidir.
- **T3 — Yasaklama mekanizması yok:** `profiles` tablosunda hesap durumu kolonu yok. `user_blocks` yalnızca kullanıcı-kullanıcı engelleme. Admin'in kullanıcıyı askıya alma/yasaklama imkânı DB düzeyinde mevcut değil.
- **T4 — Kullanıcı adı akışı:** `profiles.username` özel tip (muhtemelen citext + kısıt). Google OAuth sonrası kullanıcılar rastgele üretilmiş kullanıcı adıyla oluşuyor; zorunlu isim seçim ekranı yok. `display_name` ayrıca mevcut.
- **T5 — Zengin içerik tipleri dağınık:** events, clubs, listings, observing_sites, celestial_objects gibi tabloların uzun metin alanları düz `text` — zengin düzenleme yok.
- **T6 — PostGIS uyarısı:** `spatial_ref_sys` tablosunda RLS kapalı görünüyor. Bu PostGIS'in sistem referans tablosudur; salt-okunur katalogdur ve normal koşulda risk oluşturmaz, ancak Faz 0 raporunda anon rolün bu tabloya yazma yetkisi olmadığı doğrulanacaktır (`REVOKE INSERT/UPDATE/DELETE` kontrolü).

---

## 2. FAZ 0 — ZORUNLU KOD KEŞFİ

**Süre:** İlk oturum. **Çıktı:** `docs/DISCOVERY_REPORT.md`

### GÖREV 0.1 — Kod haritası
Repo kökünden başlayarak çıkar ve rapora yaz:
- Framework ve sürümler (Next.js sürümü, App Router mu, Tailwind sürümü, TypeScript ayarları)
- Rota haritası: tüm `app/` (veya `pages/`) rotaları, hangi rotanın SSR/ISR/SSG/client olduğu
- Mevcut admin rotaları ve bileşenleri: hangi sayfalar var, hangileri çalışıyor, hangileri boş/kırık ("kaotik ortam" envanteri)
- Supabase istemci kurulumu: `@supabase/ssr` kullanımı, middleware, auth callback akışı
- Depolama: görsellerin nerede tutulduğu (Supabase Storage bucket'ları / R2), upload akışı
- `content_entries.body_blocks` alanını okuyan/yazan kod var mı; `/yazilar` özel bileşenli rehberlerin render mimarisi
- Kullanıcı adı üretimi: OAuth sonrası profili oluşturan trigger/fonksiyon (muhtemelen `auth.users` üzerinde trigger) ve rastgele username üretim mantığı
- `user_roles` enum değerlerinin tam listesi ve `app.` şemasındaki yardımcı fonksiyonlar (`app.is_admin()` benzeri)

### GÖREV 0.2 — Admin envanteri ve yıkım planı
Mevcut admin panelindeki her sayfa/menü öğesi için tablo: yol, işlev, durum (çalışıyor / kırık / boş / mock), yeni paneldeki karşılığı (taşınacak / yeniden yazılacak / silinecek). Bu tablo onaylanmadan eski panel silinmez.

### GÖREV 0.3 — Şema doğrulaması
Bölüm 1'deki tespitleri migration dosyaları ve canlı şema üzerinden doğrula. Farklılık varsa raporda "SAPMA" başlığıyla belirt.

**Kabul kriteri:** DISCOVERY_REPORT.md üç bölümü de içerir; Murat onayı alınmadan Faz 1'e geçilmez.

---

## 3. HEDEF MİMARİ

### 3.1. Panel iskeleti

```
/panel                          → Dashboard (istatistik kartları + son aktivite)
/panel/kullanicilar             → Kullanıcı listesi
/panel/kullanicilar/[id]        → Kullanıcı detay + aksiyon paneli
/panel/icerik                   → İçerik listesi (tüm tipler, sekmeli/filtreli)
/panel/icerik/yeni?tip=...      → Yeni içerik (tip seçimi + editör)
/panel/icerik/[id]              → İçerik düzenleme (editör + canlı önizleme)
/panel/one-cikanlar             → Öne çıkan içerik sıralama yüzeyi
/panel/moderasyon               → Moderasyon kuyruğu + şikayetler
/panel/site                     → Hero slaytları, menüler, ana sayfa modülleri, feature flag'ler, ayarlar (mevcut tablolar)
/panel/kayitlar                 → Audit log görüntüleyici
```

Not: Mevcut admin rotası farklı bir yoldaysa (`/admin` vb.) Faz 0 bulgusuna göre yol korunabilir; önemli olan tek, tutarlı bir kök altında toplanmasıdır. Erişim: middleware + layout düzeyinde rol kontrolü; yetkisiz kullanıcı 404 görür (panelin varlığı sızdırılmaz).

### 3.2. Rol modeli

| Rol | Yetki |
|---|---|
| `admin` | Her şey; rol atama, kalıcı silme, ayarlar |
| `moderator` | Kullanıcı askıya alma, moderasyon kuyruğu, içerik yayından kaldırma; rol atayamaz, kalıcı silemez |
| `content_editor` | İçerik modülünün tamamı (oluştur/düzenle/yayınla/öne çıkar); kullanıcı ve ayar modüllerini göremez |

Yetki matrisi tek bir modülde tanımlanır (ör. `lib/panel/permissions.ts`) ve hem arayüzde (menü/buton gizleme) hem RLS'te (asıl güvenlik sınırı) uygulanır. Arayüz gizleme güvenlik önlemi sayılmaz.

---

## 4. FAZ 1 — PANEL ÇEKİRDEĞİ VE KULLANICI YÖNETİMİ

### GÖREV 1.1 — Şema: hesap durumu ve yönetim alanları
**Kritiklik:** P0 · **Migration**

`profiles` tablosuna ek (veya ayrı `account_states` tablosu — Faz 0'daki RLS desenine hangisi uyuyorsa):
- `account_status`: enum `active | suspended | banned | deactivated` (varsayılan `active`)
- `suspended_until timestamptz null` — süreli askı; süresi dolunca otomatik aktif sayılır
- `status_reason text` — kullanıcıya gösterilen gerekçe
- `status_changed_by uuid`, `status_changed_at timestamptz`
- `admin_note text` — yalnızca panelde görünen dahili not
- `username_customized_at timestamptz null` — Faz 3'ün anahtarı: NULL ise kullanıcı adı hâlâ otomatik üretilmiş demektir

RLS/erişim etkisi: `suspended`/`banned` kullanıcı oturum açabilir ama yazma politikaları reddeder (merkezi `app.is_account_active(uid)` yardımcı fonksiyonu tüm INSERT/UPDATE politikalarına eklenir); `banned` kullanıcı middleware'de bilgilendirme sayfasına yönlendirilir. Public profil sayfası `banned` hesap için 404 döner.

**Kabul kriterleri:**
- [ ] Migration uygulanır, mevcut 6 profil `active` olur
- [ ] Askıdaki kullanıcı fotoğraf/yorum/ilan yazamaz (RLS düzeyinde test edilir, arayüz düzeyinde değil)
- [ ] `suspended_until` geçmiş tarihse kullanıcı yazabilir (fonksiyon içinde zaman kontrolü)
- [ ] Tüm durum değişiklikleri audit_logs'a düşer

### GÖREV 1.2 — Panel iskeleti, guard ve layout
**Kritiklik:** P0

- 3.1'deki rota ağacı; sol menü (rol bazlı görünürlük), üstte global arama ve "siteye dön"
- Middleware: rolü olmayan kullanıcıya 404
- Dashboard: gerçek sayılar (toplam kullanıcı, 7 günlük yeni kayıt, bekleyen moderasyon, taslak içerik, bugünkü audit hareketi) + son 20 audit kaydı özeti. Sayılar tek RPC/görünüm ile çekilir, N ayrı sorgu ile değil.

**Kabul kriterleri:**
- [ ] `content_editor` yalnızca İçerik ve Öne Çıkanlar menülerini görür
- [ ] Dashboard'daki hiçbir sayı hardcoded değildir
- [ ] Panel mobilde kullanılabilir (en az: liste görüntüleme ve tekil aksiyonlar)

### GÖREV 1.3 — Kullanıcı listesi
**Kritiklik:** P0

- Sunucu taraflı sayfalama (50/sayfa), sıralama (kayıt tarihi, son görülme*, kullanıcı adı), arama (username, display_name, e-posta†)
- Filtreler: hesap durumu, rol, e-posta doğrulanmış mı, kayıt tarih aralığı, şehir
- Satırda: avatar, username, display_name, e-posta†, roller (rozet), durum (renkli rozet), kayıt tarihi, içerik sayısı (fotoğraf/yorum/ilan toplamı)
- Toplu seçim + toplu aksiyon: askıya al, rol ver/al (yalnızca admin), CSV dışa aktar
- *Son görülme için hafif bir `last_seen_at` güncelleme mekanizması eklenir (oturum yenilemede, en fazla saatte bir yazma)
- †E-posta `auth.users`'tadır; panel sorguları service-role kullanan sunucu aksiyonları/route handler üzerinden yapılır, anon anahtarla asla

**Kabul kriterleri:**
- [ ] 10.000 satır simülasyonunda liste < 1 sn yüklenir (index kanıtı raporda)
- [ ] E-posta hiçbir client bundle'ına sızmaz (network sekmesi kanıtı)
- [ ] CSV dışa aktarım audit_logs'a `users.export` olarak düşer

### GÖREV 1.4 — Kullanıcı detay ve aksiyon paneli
**Kritiklik:** P0

Sol kolon — kimlik ve içerik: profil alanları, e-posta ve doğrulama durumu, OAuth sağlayıcıları, kayıt/son görülme, içerik sekmeleri (fotoğraflar, yorumlar, ilanlar, forum, gözlem günlükleri — her biri kendi moderasyon kısayoluyla).

Sağ kolon — aksiyonlar:
1. **Profili düzenle:** display_name, bio, şehir, website; avatar kaldırma
2. **Kullanıcı adını değiştir:** benzersizlik + format kontrolü; değişiklik `username_customized_at` doldurur; eski→yeni yönlendirme kaydı tutulur (bkz. Görev 3.4)
3. **Rol yönetimi (yalnızca admin):** rol ekle/çıkar; kendi admin rolünü kaldıramaz; son admin kaldırılamaz
4. **Durum yönetimi:** Askıya al (süre + sebep) / Yasakla (sebep) / Aktifleştir / Devre dışı bırak — her biri onay diyaloğu + zorunlu sebep
5. **E-posta işlemleri:** doğrulama e-postasını yeniden gönder, şifre sıfırlama bağlantısı gönder (service role ile; şifre asla panelde görünmez/girilmez)
6. **KVKK işlemleri:** veri dışa aktarımı başlat (`account_export_logs`), silme talebini işle (`account_deletion_requests` kuyruğundan): anonimleştir (içerik kalır, kimlik silinir) veya tam sil — iki ayrı, açıkça etiketlenmiş buton
7. **Dahili not** alanı + bu kullanıcıya ait son 20 audit kaydı

**Kabul kriterleri:**
- [ ] Son admin'in rolü kaldırılamaz (sunucu tarafında engellenir, test edilir)
- [ ] Yasaklanan kullanıcının public profili 404 döner, içerikleri listelerden düşer
- [ ] Anonimleştirme: username → `silinmis-uye-XXXX`, avatar/bio/e-posta temizlenir, fotoğraflar "Anonim" imzasıyla kalır; tam silme: içerikler dahil kaskad politikası raporda belgelenir ve onaya sunulur
- [ ] Her aksiyon audit_logs'a ayrı action koduyla düşer (`user.suspend`, `user.role_grant`, `user.anonymize`...)

### GÖREV 1.5 — Moderasyon kuyruğu yüzeyi
**Kritiklik:** P1

Mevcut `moderation_queue` tablosunun tam panel yüzeyi: filtre (durum, hedef tipi, tarih), atama (assigned_to), çözümleme (resolved + not), hedefe atlama bağlantısı, hedef içeriği panel içinde önizleme. Sitede şikayet butonlarının eksik olduğu yüzeyler Faz 0'da tespit edilip tamamlanır (fotoğraf, yorum, ilan, profil, forum).

**Kabul kriterleri:**
- [ ] Şikayet → kuyruk → çözüm akışı uçtan uca çalışır ve audit'e düşer
- [ ] Çözülen kayıt kuyruğun varsayılan görünümünden düşer, arşivde kalır

### GÖREV 1.6 — Audit log görüntüleyici
**Kritiklik:** P1

Filtre: actor, action, target_type, tarih aralığı; detail jsonb'nin okunur gösterimi (öncesi/sonrası farkı varsa vurgulu). Salt okunur — mevcut yalnızca-ekleme kısıtı korunur.

---

## 5. FAZ 2 — İÇERİK YÖNETİM SİSTEMİ

### 5.1. Tasarım kararları (bağlayıcı)

**K1 — Editör:** TipTap (ProseMirror) tabanlı blok editörü. Gerekçe: Word benzeri deneyim, JSON belge modeli (mevcut `content_entries.body_blocks jsonb` ile birebir uyum), Next.js'te olgun ekosistem, özel blok (custom node) desteği — sitedeki etkileşimli rehber bileşenleri (SNR simülatörü vb.) "özel bileşen bloğu" olarak belgeye gömülebilir.

**K2 — Tek doğruluk kaynağı:** İçerik gövdesi `body_blocks` (TipTap JSON) olarak saklanır. Eski `body text[]` alanı geçiş sonrası salt-okunur mirasa döner; yeni yazımlar yalnızca `body_blocks`'a yapılır. Site render'ı JSON→React bileşen eşlemesiyle yapılır; böylece admin önizlemesi ile canlı sayfa aynı render yolunu kullanır ("önizleme = gerçek").

**K3 — İki içerik katmanı:**
- *Katman A — Serbest içerik* (`content_entries`): haber, yazı/rehber, duyuru, sözlük maddesi, statik sayfa (hakkında, SSS...). Tam blok editörü.
- *Katman B — Yapılandırılmış içerik* (events, clubs, listings, observing_sites, celestial_objects): alan formu + uzun metin alanları için aynı blok editörünün gömülü hali. Şemaya her tabloya `body_blocks jsonb default '[]'` eklenir; mevcut `description text` düz metni ilk açılışta paragraf bloklarına dönüştürülür (tek yönlü, kayıpsız).

**K4 — İmport felsefesi (dürüst sınırlar):**
- **DOCX:** Ana yol. Mammoth.js ile başlıklar, paragraflar, listeler, tablolar, kalın/italik, bağlantılar ve gömülü görseller korunarak blok modeline çevrilir. Görseller otomatik olarak depolamaya yüklenir ve blok içinde referanslanır. Word'deki sayfa düzeni/sütun/metin kutusu gibi "sayfa" kavramları web'de birebir taşınamaz — dönüşüm raporu kullanıcıya gösterilir ("3 tablo, 5 görsel aktarıldı; 1 metin kutusu paragrafa düzleştirildi").
- **HTML:** Sanitize (izinli etiket beyaz listesi) + TipTap parse. Uzak görseller isteğe bağlı "içeri al" seçeneğiyle depolamaya kopyalanır.
- **PDF:** İki mod, kullanıcı seçer:
  1. *Metin çıkarımı:* pdf.js ile başlık sezgisi + paragraf akışı çıkarılır, düzenlenebilir bloklara dönüşür. Çok kolonlu/ağır tasarımlı PDF'lerde sonuç "taslak" kalitesindedir ve arayüz bunu açıkça söyler.
  2. *Belge olarak göm:* PDF orijinal haliyle depolanır ve içerikte gömülü PDF görüntüleyici bloğu olarak sunulur (şekil ve yapı %100 korunur). Uzun raporlar/bültenler için önerilen mod budur.
  Bu iki modun sunulma nedeni raporda kullanıcıya açıklanır: PDF sayfa-tabanlı sabit bir formattır; web'e "hem birebir aynı hem tamamen düzenlenebilir" aktarım teknik olarak mümkün değildir, iki mod bu ödünleşimin iki ucunu karşılar.

**K5 — Rozet ve tür sistemi:** `content_entries`'e eklenir: `badges text[]` (ör. "Öne çıkan", "Yeni", "Editörün seçimi", "Sponsorlu" — rozet sözlüğü `app_settings.content_badges` anahtarında yönetilir), `reading_minutes int`, `level` (mevcut), `pinned boolean`. Yapılandırılmış tablolar kendi tür alanlarını korur; rozet ihtiyacı olanlara aynı desen uygulanır.

**K6 — Öne çıkarma:** Mevcut `featured_content (kind, slug, position)` tablosu tek mekanizma olarak kalır. Panelde sürükle-bırak sıralama yüzeyi yazılır; her içerik düzenleme ekranında "Öne çıkar" anahtarı bu tabloya yazar. `astro_photos.editors_pick` fotoğraflar için korunur.

### GÖREV 2.1 — Şema genişletmesi
**Migration:** `content_entries` yeni alanlar (badges, reading_minutes, pinned, cover_focal_x/y, seo_title, seo_description, published_by, scheduled_at), durum makinesi netleştirmesi (`taslak | incelemede | zamanlanmis | yayinda | arsiv`), `content_revisions` tablosu (entry_id, body_blocks, meta jsonb, saved_by, saved_at — her yayınlamada ve her 10 kayıtta bir otomatik revizyon), yapılandırılmış tablolara `body_blocks jsonb`. Tümü RLS'li; yazma yalnızca `admin`/`content_editor`.

**Kabul kriterleri:**
- [ ] `taslak` durumundaki içerik public sorgularda asla dönmez (RLS testi)
- [ ] `scheduled_at` gelecekte olan `zamanlanmis` içerik zamanı gelince public görünür (SELECT politikasında zaman koşulu — cron gerekmez)
- [ ] Revizyondan geri yükleme çalışır

### GÖREV 2.2 — Blok editörü bileşeni
**Kritiklik:** P0

Tek yeniden kullanılabilir `<ContentEditor>` bileşeni:
- Bloklar: başlık (h2–h4), paragraf, liste (sıralı/sırasız), alıntı, tablo, görsel (yükleme + hizalama + altyazı + kredi/lisans alanları — mevcut image_credit/image_licence deseniyle uyumlu), video gömme (YouTube), ayraç, uyarı/bilgi kutusu, kod bloğu, buton/CTA, **PDF gömme bloğu**, **özel bileşen bloğu** (kayıtlı bileşen anahtarı seçilir: ör. `snr-simulator` — anahtar listesi koddaki gerçek bileşenlerden türetilir, panelden serbest anahtar girilemez; `feature_flags` tablosundaki aynı ilke)
- Word benzeri araç çubuğu + `/` komut menüsü + Markdown kısayolları
- Otomatik kayıt (10 sn'de bir, yalnızca değişiklik varsa) + "kaydedilmemiş değişiklik" uyarısı
- Görsel yapıştırma (pano) ve sürükle-bırak yükleme; yükleme mevcut depolama akışını kullanır
- Aynı kaydı iki kişinin açması durumunda basit kilit uyarısı ("Bu içerik şu an X tarafından düzenleniyor")

**Kabul kriterleri:**
- [ ] 5.000 kelimelik belgede yazma gecikmesi hissedilmez (performans notu raporda)
- [ ] Editör çıktısı ile site render'ı birebir aynı görünür (aynı bileşen seti)
- [ ] Panoya Word'den kopyalanan metin biçimiyle yapışır (başlık/liste/kalın korunur)

### GÖREV 2.3 — Canlı önizleme
Düzenleme ekranında "Önizleme" sekmesi/böl paneli: sitenin gerçek sayfa şablonu (başlık alanı, kapak, künye, gövde) içinde render. Masaüstü/mobil genişlik anahtarı. Ayrıca "Sitede önizle" bağlantısı: yayınlanmamış içerik için imzalı önizleme URL'i (token süreli), yalnızca rol sahiplerine ve token taşıyana açık.

### GÖREV 2.4 — İçerik listesi ve yaşam döngüsü
- Tüm tipler tek listede, tip sekmeleri/filtresiyle: haber, yazı, duyuru, sözlük, sayfa + yapılandırılmış tipler (etkinlik, topluluk, ilan, saha, hedef) aynı listeden kendi düzenleyicilerine açılır
- Kolonlar: kapak küçük görseli, başlık, tip, kategori, rozetler, durum, yazar, yayın tarihi, güncelleyen
- Aksiyonlar: düzenle, çoğalt, arşivle, öne çıkar/kaldır, sil (iki aşamalı)
- Durum geçişleri yetkiye bağlı: `content_editor` yayınlayabilir mi kararı `app_settings.content_publish_policy` anahtarıyla (varsayılan: evet)

### GÖREV 2.5 — İçe aktarma sihirbazı
**Kritiklik:** P0

`/panel/icerik/yeni` içinde "Belgeden içe aktar": dosya bırak → tip algıla (DOCX/HTML/PDF) → K4'teki yola göre dönüştür → **dönüşüm raporu ekranı** (aktarılan öğe sayıları + uyarılar) → editörde aç. PDF'te mod seçim ekranı (metin çıkarımı / belge olarak göm) kısa açıklamalarıyla sunulur. 25 MB üzeri dosya reddedilir (sınır `app_settings`'te).

**Kabul kriterleri:**
- [ ] Başlıklı, tablolu, görselli örnek bir DOCX kayıpsız aktarılır (test dosyası repoya eklenir)
- [ ] Aynı belge HTML olarak da aynı sonucu verir
- [ ] PDF "göm" modunda orijinal belge sitede sayfalanabilir görüntülenir; "çıkarım" modunda düzenlenebilir taslak oluşur ve taslak uyarısı görünür
- [ ] İçe aktarılan tüm görseller kendi depolamamızda barınır (dış URL kalmaz)

### GÖREV 2.6 — Yapılandırılmış içerik düzenleyicileri
Events, clubs, listings, observing_sites, celestial_objects için panel düzenleyicileri: üstte alan formu (tarih, konum, kapasite vb. — mevcut kolonlar), altta gömülü `<ContentEditor>` (body_blocks). Clubs'taki başvuru-onay akışı (submitted_by/reviewed_*) panel yüzeyine bağlanır. Etkinliklerde `event_changes` geçmişi görünür.

**Kabul kriterleri:**
- [ ] Bir etkinliğin açıklaması editörle zenginleştirilip sitede doğru render edilir
- [ ] Topluluk başvurusu panelden onaylanır/reddedilir (sebep zorunlu), audit'e düşer

### GÖREV 2.7 — Mevcut içeriğin göçü
Koddaki hardcoded haber/yazı içerikleri (T1/T2 envanteri) `content_entries`'e seed migration ile taşınır; `/yazi/*` ve `/yazilar/*` ikiliği tek rotada birleştirilir (eskiden yeniye 301). Etkileşimli rehberler "özel bileşen bloğu" ile temsil edilir. Göç sonrası kodda içerik metni kalmaz.

**Kabul kriterleri:**
- [ ] Canlıdaki tüm yazı/haber URL'leri göç sonrası aynı içeriği verir (eski URL'ler 301)
- [ ] Ana sayfa haber/yazı vitrinleri DB'den beslenir

---

## 6. FAZ 3 — KULLANICI ADI ONBOARDING'İ

### GÖREV 3.1 — Kayıt formunda kullanıcı adı
E-posta ile kayıtta kullanıcı adı alanı forma eklenir: anlık uygunluk kontrolü (debounce'lu, RPC ile; enumeration'ı yavaşlatmak için rate-limit — mevcut `edge_rate_limits` deseni), format kuralı: 3–24 karakter, `a-z 0-9 _ .`, harfle başlar, ardışık nokta yok; rezerve liste (`admin`, `panel`, `astrohub`, `api`, mevcut rota adları...) DB'de tutulur.

### GÖREV 3.2 — Zorunlu hoş geldin akışı
**Kritiklik:** P0

- Google OAuth (ve kullanıcı adı seçilmeden tamamlanan her kayıt) sonrası profil `username_customized_at = NULL` ile oluşur
- Middleware: oturumlu kullanıcıda bu alan NULL ise tüm korumalı ve public gezinme `/hosgeldin` sayfasına yönlendirilir (istisnalar: çıkış, hukuki sayfalar, auth callback)
- `/hosgeldin` adımları: (1) kullanıcı adı — zorunlu, anlık kontrol, öneri çipleri (ad-soyaddan türetilmiş 3 öneri); (2) görünen ad + şehir + avatar — isteğe bağlı, "geç" bağlantılı
- Tamamlanınca `username_customized_at` dolar, kullanıcı geldiği sayfaya döner (returnTo parametresi)
- Rastgele üretilmiş kullanıcı adı, seçim tamamlanana kadar hiçbir public yüzeyde görünmez (galeri imzası, yorum vb. "Yeni üye" gösterir)

**Kabul kriterleri:**
- [ ] Google ile ilk giriş → doğrudan /hosgeldin; ad seçmeden siteye dönülemez (adres çubuğuna URL yazarak da)
- [ ] Seçilen ad anında profil URL'i olur: `/u/[username]` (mevcut profil rota deseni Faz 0'da doğrulanır)
- [ ] Mevcut 6 kullanıcıdan otomatik adla kalanlara bir sonraki girişte aynı akış uygulanır (geriye dönük NULL migration kararı raporda)

### GÖREV 3.3 — Kullanıcının kendi adını değiştirmesi
Ayarlar sayfasına taşınır: 30 günde bir değişiklik hakkı (sınır `app_settings`), admin sınırsız (Görev 1.4).

### GÖREV 3.4 — Eski kullanıcı adı yönlendirmesi
`username_history (old_username, user_id, changed_at)` tablosu; `/u/eski-ad` → 301 `/u/yeni-ad`. Eski adlar 90 gün rezerve kalır (başkası alamaz).

---

## 7. SPRINT PLANI VE RAPORLAMA

| Sprint | Kapsam | Çıkış koşulu |
|---|---|---|
| S0 | Faz 0 (0.1–0.3) | DISCOVERY_REPORT.md + Murat onayı |
| S1 | 1.1, 1.2, 1.3 | Panel açılır, kullanıcı listesi gerçek veriyle çalışır |
| S2 | 1.4, 1.5, 1.6 | Tüm kullanıcı aksiyonları + moderasyon + audit uçtan uca |
| S3 | 2.1, 2.2, 2.3 | Editör + önizleme; bir test yazısı panelden yayınlanır |
| S4 | 2.4, 2.5 | Liste/yaşam döngüsü + DOCX/HTML/PDF import kanıtları |
| S5 | 2.6, 2.7 | Yapılandırılmış düzenleyiciler + içerik göçü (301'ler dahil) |
| S6 | 3.1–3.4 | Onboarding uçtan uca; eski panel kalıntıları kaldırılır |

Her sprint raporu şu şablonu kullanır: **Tamamlanan** (görev no + kanıt), **Engellenen** (gerekçe + öneri), **Şema değişiklikleri** (migration listesi), **Açık sorular** (Murat kararı gereken maddeler), **Sonraki sprint planı**.

---

## 8. TEST VE GÜVENLİK ASGARİLERİ

- RLS testleri: her yeni politika için anon / normal üye / content_editor / moderator / admin beşlisiyle pozitif-negatif senaryo (SQL test dosyası repoda)
- Askı/yasak yaptırımının arayüzde değil veritabanında olduğu kanıtlanır (doğrudan REST çağrısı ile deneme)
- İçe aktarma sanitize testi: script/iframe/onerror payload'lı HTML ve makrolu DOCX zararsızlaştırılır
- Editör XSS testi: blok içeriği hiçbir yerde `dangerouslySetInnerHTML` ile ham basılmaz
- Panel rotaları arama motorlarına kapalı (robots + noindex + 404 davranışı)
- `spatial_ref_sys` yazma yetkisi kontrolü (Bölüm 1.2 / T6)

---

*Belge sonu. Uygulama, ekteki TRIGGER_PROMPT.md ile başlatılır.*

# Astrohub — Canlı Uygulama İlerleme Tablosu

**Source of truth:** Bu dosya ve `PROGRESS_TRACKER.csv` main dalında her atomik commit ile güncellenir.

Durumlar: `TODO` → `IN_PROGRESS` → `CODED` → `TESTED` → `READY_FOR_USER` → `VERIFIED`; ayrıca `BLOCKED`.
`VERIFIED` yalnız kullanıcı onayıyla verilir — `scripts/patch-tracker.mjs` bu değeri
`--kullanici-onayi` bayrağı olmadan yazmayı reddediyor.

## Fazlar

91 madde on bir faza bölündü. Sıra **sprint harflerine göre değil, bağımlılığa göre**:
sprint "hangi denetim oturumunda bulundu" demek, "hangi sırayla yapılacak" demek değil.
Önce canlıda kırık olanlar, sonra üzerine iş bina edilecek veri modeli ve medya
mimarisi, en sonda onların üstüne oturan özellikler — paylaşım kiti thumbnail
kadrajını kullanıyor, künye çekim sezonlarını kullanıyor.

| Faz | Kapsam | Maddeler |
|---|---|---|
| 01 | Zemin — takip tablosu, git hijyeni | H05–H12 |
| 02 | Canlıda kırık olanlar | A01–A06, A12–A14, X07 |
| 03 | Hesap ve kimlik | E01–E08 |
| 04 | Çekim sezonları (veri modeli) | C01–C06 |
| 05 | Medya mimarisi | C10–C14, X01–X03, X05 |
| 06 | Thumbnail kadrajı | C07–C09, C15 |
| 07 | Fotoğraf indirme | B01–B07 |
| 08 | Paylaşım kiti | D01–D14 |
| 09 | Ekipman ve katalog | F01–F08 |
| 10 | İlanlar ve kalan arayüz | A07–A11, G01–G03 |
| 11 | QA ve kapanış | H01–H04, H13–H15, X04, X06 |

Canlı pano: `docs/patch-2026-08-18/ilerleme.html`
(`node scripts/patch-progress-artifact.mjs` ile CSV'den üretilir).

| ID | Öncelik | Sprint | Modül | İş | Durum | Commit | Test/Kanıt | Kullanıcı doğrulaması |
|---|---|---|---|---|---|---|---|---|
| A01 | P0 | A | Kayıt | Kullanım Koşulları dönüşünde kayıt form state'i korunmalı | VERIFIED | 6043192 | e2e: kayit formu yasal metin donusunde dolu kaliyor | 18.08.2026 · kullanıcı canlıda kontrol etti |
| A02 | P0 | A | Kayıt | KVKK dönüşünde kayıt form state'i korunmalı | VERIFIED | 6043192 | e2e: yasal metin baglantilari yeni sekmede aciliyor | 18.08.2026 · kullanıcı canlıda kontrol etti |
| A03 | P0 | A | Galeri | Fotoğraf detayında görünür 'Galeriye dön' kontrolü | VERIFIED | 289eb13 | e2e: fotograf detayinda geri donus ilk ekranda | 18.08.2026 · kullanıcı canlıda kontrol etti |
| A04 | P0 | A | Galeri | Galeri pagination sayfası geri dönüşte korunmalı | VERIFIED | 289eb13 | e2e: galeri suzgeci ve sayfasi geri donuste korunuyor | 18.08.2026 · kullanıcı canlıda kontrol etti |
| A05 | P0 | A | Galeri | Galeri scroll/kart konumu geri dönüşte korunmalı | VERIFIED | 289eb13 | e2e: galeri kaydirma konumu geri donuste korunuyor | 18.08.2026 · kullanıcı canlıda kontrol etti |
| A06 | P0 | A | Galeri | Arama/filtre/sıralama state'i geri dönüşte korunmalı | VERIFIED | 289eb13 | e2e: galeri suzgeci ve sayfasi geri donuste korunuyor | 18.08.2026 · kullanıcı canlıda kontrol etti |
| A07 | P1 | A | İlanlar | İlan başına maksimum 5 fotoğraf yükleme | TESTED | 7737eda | vitest photos.test: LISTING_PHOTO_LIMIT=5; migration trigger 5 | Bekliyor |
| A08 | P1 | A | İlanlar | İlan fotoğraflarında merkezi Astrohub optimizasyon pipeline'ını kullan | TESTED | 7737eda | uploadListingPhoto renderResized+checkImageFormat kullanıyor | Bekliyor |
| A09 | P1 | A | İlanlar | İlan foto yönetimi: sil/değiştir/sırala/progress | TESTED | 7737eda | vitest reorderListingPhotos; sil/değiştir/sırala/progress UI | Bekliyor |
| A10 | P1 | A | Fotoğraf Detayı | Benzer Fotoğraflar gerçek thumbnail göstermeli | TESTED | 6a54608 | RemoteImage thumbUrl; PhotoComparison.test aynı mekanizma; build yeşil | Bekliyor |
| A11 | P1 | A | Fotoğraf Detayı | Teknik Karşılaştırma gerçek thumbnail göstermeli | TESTED | 6a54608 | vitest PhotoComparison.test.tsx: A/B gerçek thumbnail src | Bekliyor |
| A12 | P0 | A | Saha | observing_sites canlı HTTP 400 hatası giderilmeli | VERIFIED | d1802f9 | REST 200 / 15 kayit; vitest sites.select.test.ts | 18.08.2026 · kullanıcı canlıda kontrol etti |
| A13 | P1 | A | Ana Sayfa / Hava | Meteoblue 503 için graceful fallback | TESTED | 9f8974e | vitest meteoblue.test.ts: 503 → null zarif düşüş | Bekliyor |
| A14 | P1 | A | Etkinlikler | Mobil etkinlik görünümünde yatay taşma kaldırılmalı | TESTED | 9f8974e | check:viewports: Etkinlikler 3.sayfa, 11 çözünürlük taşmasız | Bekliyor |
| B01 | P1 | B | Fotoğraf Detayı | İndir butonu dropdown açmalı | TESTED | 7fdded8 | vitest annotatedExport.test.ts | Bekliyor |
| B02 | P1 | B | Fotoğraf Detayı | Orijinal / annotasyonsuz fotoğraf indirilebilmeli | TESTED | 1d108cd | vitest DownloadChip.test.tsx: annotasyonsuz fetch + blob indirme | Bekliyor |
| B03 | P1 | B | Fotoğraf Detayı | Plate Solve Annotated fotoğraf ayrı indirilebilmeli | TESTED | 7fdded8 | vitest annotatedExport.test.ts | Bekliyor |
| B04 | P1 | B | Fotoğraf Detayı | Annotated hazır değilse doğru durum | TESTED | 7fdded8 |  | Bekliyor |
| B05 | P2 | B | Fotoğraf Detayı | İndirme dosya adları anlamlı ve sanitize olmalı | TESTED | 7fdded8 | vitest indirmeAdi.test.ts | Bekliyor |
| B06 | P2 | B | Fotoğraf Detayı | Kaydet semantiğini netleştir | TESTED | 1d108cd | vitest SaveChip.test.tsx: Koleksiyona kaydet semantiği | Bekliyor |
| B07 | P2 | B | Plate Solve | Plate solve sonrası takımyıldız otomatik türet | TODO |  |  | Bekliyor |
| C01 | P1 | C | Fotoğraf Yükleme | Yeni filtre satırı son satırın tekrar eden değerlerini kopyalamalı | TESTED | f7ae111 | vitest integration.test.ts: yeniPozSatiri (3 senaryo) | Bekliyor |
| C02 | P1 | C | Fotoğraf Yükleme | Tek tarih / tarih aralığı checkbox | TESTED | a50b6b9 | vitest captureSession/upload/photos; typecheck+build+budgets yeşil | Bekliyor |
| C03 | P1 | C | Fotoğraf Yükleme | Bir fotoğrafa birden fazla çekim sezonu | TESTED | a50b6b9 | vitest captureSession/upload/photos; typecheck+build+budgets yeşil | Bekliyor |
| C04 | P1 | C | Fotoğraf Yükleme | Her sezon tek tarih veya tarih aralığı taşıyabilmeli | TESTED | a50b6b9 | vitest captureSession/upload/photos; typecheck+build+budgets yeşil | Bekliyor |
| C05 | P1 | C | Fotoğraf Metadata | Exposure satırlarını sezonla ilişkilendir | TESTED | a50b6b9 | vitest captureSession/upload/photos; typecheck+build+budgets yeşil | Bekliyor |
| C06 | P2 | C | Fotoğraf Künyesi | Çok sezonlu tarihleri okunabilir göster | TESTED | a50b6b9 | vitest captureSession/upload/photos; typecheck+build+budgets yeşil | Bekliyor |
| C07 | P1 | C | Fotoğraf Yükleme | Thumbnail/Kart kadraj editörü upload akışında olmalı | TESTED | 95ac47b | vitest ThumbnailKadraj/upload/photos; migration thumb_crop; build+bütçe yeşil | Bekliyor |
| C08 | P1 | C | Fotoğraf Yükleme | Thumbnail editöründe ana sayfa ve kart önizlemeleri | TESTED | 95ac47b | vitest ThumbnailKadraj/upload/photos; migration thumb_crop; build+bütçe yeşil | Bekliyor |
| C09 | P1 | C | Fotoğraf Detayı / Owner | Thumbnail kadrajı yüklemeden sonra da düzenlenebilmeli | TESTED | b9acbef | vitest thumbCrop.test; detay sayfası sahip editörü | Bekliyor |
| C10 | P1 | C | Medya Mimarisi | Thumbnail crop state normalize parametre olarak saklanmalı | TESTED | 95ac47b | vitest ThumbnailKadraj/upload/photos; migration thumb_crop; build+bütçe yeşil | Bekliyor |
| C11 | P1 | C | Medya Mimarisi | Thumbnail türevleri storage'da ve versiyonlu tutulmalı | TESTED | b9acbef | vitest thumbCrop.test: versionedThumbPath zaman damgalı | Bekliyor |
| C12 | P0 | C | Medya Temizliği | Thumbnail yeniden düzenlenince eski türev güvenli silinmeli | TESTED | b9acbef | vitest thumbCrop.test: eski türev güvenli silme + geri alma | Bekliyor |
| C13 | P1 | C | Medya Temizliği | Orphan thumbnail garbage collector | TESTED | 539c193 | vitest photo-lifecycle-cleanup: eski versiyonlu thumb orphan süpürülüyor | Bekliyor |
| C14 | P1 | C | Medya İşleme | Thumbnail üretimi idempotent ve content/crop version bağlı olmalı | TESTED | 539c193 | vitest thumbCrop: kadraja bağlı yol, idempotent no-op | Bekliyor |
| C15 | P2 | C | Thumbnail UX | Crop editörü mouse/touch/keyboard erişilebilir olmalı | TESTED | 95ac47b | vitest ThumbnailKadraj/upload/photos; migration thumb_crop; build+bütçe yeşil | Bekliyor |
| D01 | P0 | D | Paylaşım Kiti | Paylaşım kiti yalnız fotoğraf sahibine açık | TESTED | 2a3bfc2 | vitest shareCaption + ShareKit; owner gate, çok sezon, gizlilik, kopyala/indir | Bekliyor |
| D02 | P1 | D | Paylaşım Kiti | Owner için 'Paylaşım kiti hazırla' aksiyonu | TESTED | 2a3bfc2 | vitest shareCaption + ShareKit; owner gate, çok sezon, gizlilik, kopyala/indir | Bekliyor |
| D03 | P1 | D | Paylaşım Kiti | Instagram gönderi çıktısı otomatik üret | TESTED | 8bc69de | vitest ShareKit: feed görseli üretiliyor | Bekliyor |
| D04 | P1 | D | Paylaşım Kiti | Instagram hikâye çıktısı otomatik üret | TESTED | 8bc69de | vitest ShareKit: story görseli üretiliyor | Bekliyor |
| D05 | P1 | D | Paylaşım Kiti | Sosyal resize kadrajı astrofotoğrafı bozmasın | TESTED | 8bc69de | vitest shareImage: contain oran koruma (4) | Bekliyor |
| D06 | P1 | D | Paylaşım Kiti | Instagram künye metni üret | TESTED | 2a3bfc2 | vitest shareCaption + ShareKit; owner gate, çok sezon, gizlilik, kopyala/indir | Bekliyor |
| D07 | P1 | D | Paylaşım Kiti | Künye çok sezonlu tarihleri desteklesin | TESTED | 2a3bfc2 | vitest shareCaption + ShareKit; owner gate, çok sezon, gizlilik, kopyala/indir | Bekliyor |
| D08 | P1 | D | Paylaşım Kiti | Tek tık Kopyala | TESTED | 2a3bfc2 | vitest shareCaption + ShareKit; owner gate, çok sezon, gizlilik, kopyala/indir | Bekliyor |
| D09 | P2 | D | Paylaşım Kiti | Künye TXT indirme | TESTED | 2a3bfc2 | vitest shareCaption + ShareKit; owner gate, çok sezon, gizlilik, kopyala/indir | Bekliyor |
| D10 | P2 | D | Paylaşım Kiti | Opsiyonel künye alanları | TESTED | 2a3bfc2 | vitest shareCaption + ShareKit; owner gate, çok sezon, gizlilik, kopyala/indir | Bekliyor |
| D11 | P2 | D | Paylaşım Kiti | Orijinal / annotated sosyal kaynak seçimi | TESTED | 8bc69de | vitest ShareKit: çözülünce annotated kaynak seçilebilir | Bekliyor |
| D12 | P2 | D | Paylaşım Kiti | Tek ZIP paylaşım paketi | TESTED | 8bc69de | vitest zip (4) + ShareKit ZIP indirme | Bekliyor |
| D13 | P2 | D | Paylaşım Kiti | Opsiyonel watermark/@username | TESTED | 8bc69de | vitest ShareKit: watermark toggle format çağrısını değiştiriyor | Bekliyor |
| D14 | P1 | D | Gizlilik | Paylaşım kiti konum gizliliğine uymalı | TESTED | 2a3bfc2 | vitest shareCaption + ShareKit; owner gate, çok sezon, gizlilik, kopyala/indir | Bekliyor |
| E01 | P2 | E | Hesabım | E-posta doğrulama kutusunu sadeleştir | TESTED | 869f024 | typecheck+lint+test:all yeşil; kutu kaldırıldı, inline rozet | Bekliyor |
| E02 | P1 | E | Navbar | Sağ üstte avatar + kullanıcı adı | VERIFIED | 2fcadac | vitest AccountMenu.test.tsx | 18.08.2026 · kullanıcı canlıda kontrol etti |
| E03 | P0 | E | Navbar | Navbar kullanıcı menüsünde 'Çıkış yap' | VERIFIED | 2fcadac | vitest AccountMenu.test.tsx | 18.08.2026 · kullanıcı canlıda kontrol etti |
| E04 | P0 | E | Navbar | Logout gerçek oturumu temizlemeli | VERIFIED | 2fcadac | vitest: cikis gercekten oturumu kapatiyor | 18.08.2026 · kullanıcı canlıda kontrol etti |
| E05 | P1 | E | Public Profil | LinkedIn benzeri public profil üst alanı | TESTED | 65be33d | vitest ProfilePage.test.tsx; npm run test:all | Bekliyor |
| E06 | P1 | E | Public Profil | Profil içerik bölümleri accordion/collapsible | TESTED | 869f024 | vitest Panel.test.tsx: collapsible <details>/<summary>, defaultOpen | Bekliyor |
| E07 | P2 | E | Public Profil | Bölüm deep-link / hash | TESTED | 869f024 | vitest ProfilePage.test.tsx: hash ile bölüme scrollIntoView | Bekliyor |
| E08 | P1 | E | Public Profil | Public profil responsive | TESTED | 869f024 | check:a11y 5 rota; preview profil/hesap 320px docW 320 taşmasız; collapsible mobilde tek sütun | Bekliyor |
| F01 | P1 | F | Ekipmanlarım | Kayıtlı setup'ı sonradan Düzenle | TESTED | fb2a5dc | vitest store/filters/seriesGap/catalogMerge; prod'da merge+rollback uçtan uca doğrulandı | Bekliyor |
| F02 | P1 | F | Ekipmanlarım | Birden fazla filtre desteği | TESTED | fb2a5dc | vitest store/filters/seriesGap/catalogMerge; prod'da merge+rollback uçtan uca doğrulandı | Bekliyor |
| F03 | P1 | F | Katalog | Ekipman mükerrerlerini canonical merge ile temizle | TESTED | fb2a5dc | vitest store/filters/seriesGap/catalogMerge; prod'da merge+rollback uçtan uca doğrulandı | Bekliyor |
| F04 | P1 | F | Katalog | Canonical model + variant + alias | TESTED | fb2a5dc | vitest store/filters/seriesGap/catalogMerge; prod'da merge+rollback uçtan uca doğrulandı | Bekliyor |
| F05 | P1 | F | Katalog | PrimaLuceLab EAGLE legacy/aktif seri kapsamı | TODO |  |  | Bekliyor |
| F06 | P1 | F | Katalog | Diğer markalarda seri-gap analizi | TESTED | fb2a5dc | vitest store/filters/seriesGap/catalogMerge; prod'da merge+rollback uçtan uca doğrulandı | Bekliyor |
| F07 | P2 | F | Katalog | Katalog source/verification metadata | TESTED | fb2a5dc | vitest store/filters/seriesGap/catalogMerge; prod'da merge+rollback uçtan uca doğrulandı | Bekliyor |
| F08 | P0 | F | Katalog | Dedup migration backup/rollback | TESTED | fb2a5dc | vitest store/filters/seriesGap/catalogMerge; prod'da merge+rollback uçtan uca doğrulandı | Bekliyor |
| G01 | P2 | G | Fotoğraf Detayı | Puanlama panelini aksiyon satırına taşı | TESTED | 7fdded8 |  | Bekliyor |
| G02 | P2 | G | Fotoğraf Detayı | 1–10 puan popover | TESTED | 7fdded8 |  | Bekliyor |
| G03 | P2 | G | Fotoğraf Detayı | Puanlama erişilebilirliği | TESTED | 7fdded8 | vitest RatingChip.test.tsx | Bekliyor |
| H01 | P0 | H | QA | Gerçek onboarding E2E | TODO |  |  | Bekliyor |
| H02 | P0 | H | QA | Rol/persona matrisi | TODO |  |  | Bekliyor |
| H03 | P1 | H | QA | Happy/error/recovery/refresh/cancel/retry matrisi | TODO |  |  | Bekliyor |
| H04 | P0 | H | QA | Her bug regresyon testine dönüşmeli | TESTED | 25f0f98 | 3 canlı bug regresyon testine dönüştü: upload/photosFallback/seriesGap | Bekliyor |
| H05 | P0 | H | İlerleme | IMPLEMENTATION_PROGRESS.md canlı takip kaynağı | TESTED | 25f0f98 | vitest patch-tracker.test.mjs: CSV yuvarlak yolculuk + durum akışı (6) | Bekliyor |
| H06 | P0 | H | İlerleme | PROGRESS_TRACKER.csv canlı agent tablosu | TESTED | 25f0f98 | vitest patch-tracker.test.mjs: CSV yuvarlak yolculuk + durum akışı (6) | Bekliyor |
| H07 | P1 | H | İlerleme | Zorunlu status akışı | TESTED | 25f0f98 | vitest patch-tracker.test.mjs: CSV yuvarlak yolculuk + durum akışı (6) | Bekliyor |
| H08 | P1 | H | İlerleme | Commit/test evidence zorunlu | TESTED | 0f7e03f | node patch-tracker.mjs: kanıtsız TESTED reddediliyor (guard) | Bekliyor |
| H09 | P0 | H | Git | Tüm uygulama doğrudan main | TESTED | b3d401a | git log origin/main: bu oturumun tüm commit'leri doğrudan main'de, dal açılmadı | Bekliyor |
| H10 | P0 | H | Git | Gereksiz branch temizliği | VERIFIED | 9ede6f2 | git diff main origin/codex -- <yollar>: yalnizca is akisi tetikleyicisi farki | 18.08.2026 · kullanıcı canlıda kontrol etti |
| H11 | P1 | H | Git | Stale PR temizliği | TESTED | b096d4d | gh list_pull_requests: 0 açık PR; git ls-remote: yalnız main | Bekliyor |
| H12 | P0 | H | Git | Main history güvenliği | VERIFIED | 9ede6f2 | git log --oneline: 24d4074..d192795 dogrusal | 18.08.2026 · kullanıcı canlıda kontrol etti |
| H13 | P1 | H | Kod Temizliği | Dead code/debug/audit geçici dosya temizliği | TESTED | b096d4d | vitest deadCode.test: iki yönlü ölü kod sayacı; 6 ölü dosya silindi | Bekliyor |
| H14 | P0 | H | Final QA | Tam canlı ürün auditi yeniden koş | TODO |  |  | Bekliyor |
| H15 | P0 | H | Final QA | Kullanıcı doğrulama kapısı | TODO |  |  | Bekliyor |
| X01 | P1 | Extra | Medya Mimarisi | Asset türev registry | TESTED | 1218a84 | vitest derivatives.test; asset_derivatives migration prod'da | Bekliyor |
| X02 | P1 | Extra | Medya İşleme | Original asset immutable | TESTED | e222c78 | vitest upload.test.ts: orijinal upsert:false | Bekliyor |
| X03 | P1 | Extra | Gizlilik | Public türevlerde EXIF/GPS sızıntısını önle | TESTED | e222c78 | vitest upload.test.ts: public türev EXIF'siz, ham dosya gizli bucket | Bekliyor |
| X04 | P2 | Extra | İndirme | İleride owner download izni politikası | TESTED | e04bcb3 | vitest originalDownload.test: imzalı adres + RLS null; owner UI | Bekliyor |
| X05 | P2 | Extra | Medya Temizliği | Social/thumbnail derivative TTL ve GC | TESTED | 1218a84 | vitest photo-lifecycle: süresi dolmuş türev toplanıyor, referanslı korunuyor | Bekliyor |
| X06 | P2 | Extra | Analitik | Export/download kullanım ölçümü | TESTED | 176c15e | vitest downloadMetrics.test; migration download_events; 4 indirme noktası bağlı | Bekliyor |
| X07 | P1 | Extra | Uzun Formlar | Draft/autosave standardı | TESTED | fb44905 | vitest useFormDraft.test: mount/autosave/clear; RegisterPage hook'a geçti | Bekliyor |
| E09 | P1 | E | Navbar | Menüden 'Public profilim' girişini kaldır | TESTED | 07af5a2 | vitest: public profil girisi menude yok | Bekliyor |
| E10 | P1 | E | Public Profil | Kapak görseli (banner) yükleme | TESTED | e3f2c48 | vitest domain/profile; npm run test:all | Bekliyor |
| E11 | P1 | E | Public Profil | Kapak ve avatar için ortak kadraj editörü | TESTED | 65be33d | vitest kadraj.test.ts: kadraj boslugu (3 senaryo) | Bekliyor |
| E12 | P1 | E | Public Profil | Kapak ve avatar silinebilmeli | TESTED | e3f2c48 | profilGorseliSil tek yol | Bekliyor |
| A15 | P0 | A | Galeri | İndir düğmesi doğrudan en yüksek kaliteli JPEG vermeli | TESTED | 95b5782 | vitest indirmeAdi.test.ts (5 senaryo) | Bekliyor |
| A16 | P0 | A | Moderasyon | Kaldırılan içeriği geri getirme düğmesi görünmüyor | TESTED | 95b5782 |  | Bekliyor |
| A17 | P0 | A | Alan Çözümü | Etiketler fotoğrafın dışına taşmamalı | TESTED | 136f0fc | vitest plateProjection.test.ts: kadrajIcinde (4 senaryo) | Bekliyor |
| A18 | P1 | A | Hesap | Şehir seçimi zorunlu olmalı | TESTED | bfe779b | vitest profile.test.ts: sehirsiz profili reddediyor; canli: 5 bildirim | Bekliyor |
| A19 | P1 | A | Performans | profile.ts hesap yonetimi yolunu paylasilan pakete sokuyor | TESTED | ec71e2b | npm run check:budgets: 198.2/200 | Bekliyor |
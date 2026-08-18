# Astrohub — Canlı Uygulama İlerleme Tablosu

**Source of truth:** Bu dosya ve `PROGRESS_TRACKER.csv` main dalında her atomik commit ile güncellenir.

Durumlar: `TODO` → `IN_PROGRESS` → `CODED` → `TESTED` → `READY_FOR_USER` → `VERIFIED`; ayrıca `BLOCKED`.
`VERIFIED` yalnız kullanıcı onayıyla verilir.

| ID | Öncelik | Sprint | Modül | İş | Durum | Commit | Test/Kanıt | Kullanıcı doğrulaması |
|---|---|---|---|---|---|---|---|---|
| A01 | P0 | A | Kayıt | Kullanım Koşulları dönüşünde kayıt form state'i korunmalı | TESTED | 6043192 | e2e: kayit formu yasal metin donusunde dolu kaliyor | Bekliyor |
| A02 | P0 | A | Kayıt | KVKK dönüşünde kayıt form state'i korunmalı | TESTED | 6043192 | e2e: yasal metin baglantilari yeni sekmede aciliyor | Bekliyor |
| A03 | P0 | A | Galeri | Fotoğraf detayında görünür 'Galeriye dön' kontrolü | TODO |  |  | Bekliyor |
| A04 | P0 | A | Galeri | Galeri pagination sayfası geri dönüşte korunmalı | TODO |  |  | Bekliyor |
| A05 | P0 | A | Galeri | Galeri scroll/kart konumu geri dönüşte korunmalı | TODO |  |  | Bekliyor |
| A06 | P0 | A | Galeri | Arama/filtre/sıralama state'i geri dönüşte korunmalı | TODO |  |  | Bekliyor |
| A07 | P1 | A | İlanlar | İlan başına maksimum 5 fotoğraf yükleme | TODO |  |  | Bekliyor |
| A08 | P1 | A | İlanlar | İlan fotoğraflarında merkezi Astrohub optimizasyon pipeline'ını kullan | TODO |  |  | Bekliyor |
| A09 | P1 | A | İlanlar | İlan foto yönetimi: sil/değiştir/sırala/progress | TODO |  |  | Bekliyor |
| A10 | P1 | A | Fotoğraf Detayı | Benzer Fotoğraflar gerçek thumbnail göstermeli | TODO |  |  | Bekliyor |
| A11 | P1 | A | Fotoğraf Detayı | Teknik Karşılaştırma gerçek thumbnail göstermeli | TODO |  |  | Bekliyor |
| A12 | P0 | A | Saha | observing_sites canlı HTTP 400 hatası giderilmeli | TESTED | d1802f9 | REST 200 / 15 kayit; vitest sites.select.test.ts | Bekliyor |
| A13 | P1 | A | Ana Sayfa / Hava | Meteoblue 503 için graceful fallback | TODO |  |  | Bekliyor |
| A14 | P1 | A | Etkinlikler | Mobil etkinlik görünümünde yatay taşma kaldırılmalı | TODO |  |  | Bekliyor |
| B01 | P1 | B | Fotoğraf Detayı | İndir butonu dropdown açmalı | TODO |  |  | Bekliyor |
| B02 | P1 | B | Fotoğraf Detayı | Orijinal / annotasyonsuz fotoğraf indirilebilmeli | TODO |  |  | Bekliyor |
| B03 | P1 | B | Fotoğraf Detayı | Plate Solve Annotated fotoğraf ayrı indirilebilmeli | TODO |  |  | Bekliyor |
| B04 | P1 | B | Fotoğraf Detayı | Annotated hazır değilse doğru durum | TODO |  |  | Bekliyor |
| B05 | P2 | B | Fotoğraf Detayı | İndirme dosya adları anlamlı ve sanitize olmalı | TODO |  |  | Bekliyor |
| B06 | P2 | B | Fotoğraf Detayı | Kaydet semantiğini netleştir | TODO |  |  | Bekliyor |
| B07 | P2 | B | Plate Solve | Plate solve sonrası takımyıldız otomatik türet | TODO |  |  | Bekliyor |
| C01 | P1 | C | Fotoğraf Yükleme | Yeni filtre satırı son satırın tekrar eden değerlerini kopyalamalı | TODO |  |  | Bekliyor |
| C02 | P1 | C | Fotoğraf Yükleme | Tek tarih / tarih aralığı checkbox | TODO |  |  | Bekliyor |
| C03 | P1 | C | Fotoğraf Yükleme | Bir fotoğrafa birden fazla çekim sezonu | TODO |  |  | Bekliyor |
| C04 | P1 | C | Fotoğraf Yükleme | Her sezon tek tarih veya tarih aralığı taşıyabilmeli | TODO |  |  | Bekliyor |
| C05 | P1 | C | Fotoğraf Metadata | Exposure satırlarını sezonla ilişkilendir | TODO |  |  | Bekliyor |
| C06 | P2 | C | Fotoğraf Künyesi | Çok sezonlu tarihleri okunabilir göster | TODO |  |  | Bekliyor |
| C07 | P1 | C | Fotoğraf Yükleme | Thumbnail/Kart kadraj editörü upload akışında olmalı | TODO |  |  | Bekliyor |
| C08 | P1 | C | Fotoğraf Yükleme | Thumbnail editöründe ana sayfa ve kart önizlemeleri | TODO |  |  | Bekliyor |
| C09 | P1 | C | Fotoğraf Detayı / Owner | Thumbnail kadrajı yüklemeden sonra da düzenlenebilmeli | TODO |  |  | Bekliyor |
| C10 | P1 | C | Medya Mimarisi | Thumbnail crop state normalize parametre olarak saklanmalı | TODO |  |  | Bekliyor |
| C11 | P1 | C | Medya Mimarisi | Thumbnail türevleri storage'da ve versiyonlu tutulmalı | TODO |  |  | Bekliyor |
| C12 | P0 | C | Medya Temizliği | Thumbnail yeniden düzenlenince eski türev güvenli silinmeli | TODO |  |  | Bekliyor |
| C13 | P1 | C | Medya Temizliği | Orphan thumbnail garbage collector | TODO |  |  | Bekliyor |
| C14 | P1 | C | Medya İşleme | Thumbnail üretimi idempotent ve content/crop version bağlı olmalı | TODO |  |  | Bekliyor |
| C15 | P2 | C | Thumbnail UX | Crop editörü mouse/touch/keyboard erişilebilir olmalı | TODO |  |  | Bekliyor |
| D01 | P0 | D | Paylaşım Kiti | Paylaşım kiti yalnız fotoğraf sahibine açık | TODO |  |  | Bekliyor |
| D02 | P1 | D | Paylaşım Kiti | Owner için 'Paylaşım kiti hazırla' aksiyonu | TODO |  |  | Bekliyor |
| D03 | P1 | D | Paylaşım Kiti | Instagram gönderi çıktısı otomatik üret | TODO |  |  | Bekliyor |
| D04 | P1 | D | Paylaşım Kiti | Instagram hikâye çıktısı otomatik üret | TODO |  |  | Bekliyor |
| D05 | P1 | D | Paylaşım Kiti | Sosyal resize kadrajı astrofotoğrafı bozmasın | TODO |  |  | Bekliyor |
| D06 | P1 | D | Paylaşım Kiti | Instagram künye metni üret | TODO |  |  | Bekliyor |
| D07 | P1 | D | Paylaşım Kiti | Künye çok sezonlu tarihleri desteklesin | TODO |  |  | Bekliyor |
| D08 | P1 | D | Paylaşım Kiti | Tek tık Kopyala | TODO |  |  | Bekliyor |
| D09 | P2 | D | Paylaşım Kiti | Künye TXT indirme | TODO |  |  | Bekliyor |
| D10 | P2 | D | Paylaşım Kiti | Opsiyonel künye alanları | TODO |  |  | Bekliyor |
| D11 | P2 | D | Paylaşım Kiti | Orijinal / annotated sosyal kaynak seçimi | TODO |  |  | Bekliyor |
| D12 | P2 | D | Paylaşım Kiti | Tek ZIP paylaşım paketi | TODO |  |  | Bekliyor |
| D13 | P2 | D | Paylaşım Kiti | Opsiyonel watermark/@username | TODO |  |  | Bekliyor |
| D14 | P1 | D | Gizlilik | Paylaşım kiti konum gizliliğine uymalı | TODO |  |  | Bekliyor |
| E01 | P2 | E | Hesabım | E-posta doğrulama kutusunu sadeleştir | TODO |  |  | Bekliyor |
| E02 | P1 | E | Navbar | Sağ üstte avatar + kullanıcı adı | TODO |  |  | Bekliyor |
| E03 | P0 | E | Navbar | Navbar kullanıcı menüsünde 'Çıkış yap' | TODO |  |  | Bekliyor |
| E04 | P0 | E | Navbar | Logout gerçek oturumu temizlemeli | TODO |  |  | Bekliyor |
| E05 | P1 | E | Public Profil | LinkedIn benzeri public profil üst alanı | TODO |  |  | Bekliyor |
| E06 | P1 | E | Public Profil | Profil içerik bölümleri accordion/collapsible | TODO |  |  | Bekliyor |
| E07 | P2 | E | Public Profil | Bölüm deep-link / hash | TODO |  |  | Bekliyor |
| E08 | P1 | E | Public Profil | Public profil responsive | TODO |  |  | Bekliyor |
| F01 | P1 | F | Ekipmanlarım | Kayıtlı setup'ı sonradan Düzenle | TODO |  |  | Bekliyor |
| F02 | P1 | F | Ekipmanlarım | Birden fazla filtre desteği | TODO |  |  | Bekliyor |
| F03 | P1 | F | Katalog | Ekipman mükerrerlerini canonical merge ile temizle | TODO |  |  | Bekliyor |
| F04 | P1 | F | Katalog | Canonical model + variant + alias | TODO |  |  | Bekliyor |
| F05 | P1 | F | Katalog | PrimaLuceLab EAGLE legacy/aktif seri kapsamı | TODO |  |  | Bekliyor |
| F06 | P1 | F | Katalog | Diğer markalarda seri-gap analizi | TODO |  |  | Bekliyor |
| F07 | P2 | F | Katalog | Katalog source/verification metadata | TODO |  |  | Bekliyor |
| F08 | P0 | F | Katalog | Dedup migration backup/rollback | TODO |  |  | Bekliyor |
| G01 | P2 | G | Fotoğraf Detayı | Puanlama panelini aksiyon satırına taşı | TODO |  |  | Bekliyor |
| G02 | P2 | G | Fotoğraf Detayı | 1–10 puan popover | TODO |  |  | Bekliyor |
| G03 | P2 | G | Fotoğraf Detayı | Puanlama erişilebilirliği | TODO |  |  | Bekliyor |
| H01 | P0 | H | QA | Gerçek onboarding E2E | TODO |  |  | Bekliyor |
| H02 | P0 | H | QA | Rol/persona matrisi | TODO |  |  | Bekliyor |
| H03 | P1 | H | QA | Happy/error/recovery/refresh/cancel/retry matrisi | TODO |  |  | Bekliyor |
| H04 | P0 | H | QA | Her bug regresyon testine dönüşmeli | TODO |  |  | Bekliyor |
| H05 | P0 | H | İlerleme | IMPLEMENTATION_PROGRESS.md canlı takip kaynağı | CODED | c9e50e5 | node scripts/patch-tracker.mjs --list P0 | Bekliyor |
| H06 | P0 | H | İlerleme | PROGRESS_TRACKER.csv canlı agent tablosu | CODED | c9e50e5 | node scripts/patch-tracker.mjs --list P0 | Bekliyor |
| H07 | P1 | H | İlerleme | Zorunlu status akışı | CODED | c9e50e5 | scripts/patch-tracker.mjs DURUMLAR | Bekliyor |
| H08 | P1 | H | İlerleme | Commit/test evidence zorunlu | TODO |  |  | Bekliyor |
| H09 | P0 | H | Git | Tüm uygulama doğrudan main | IN_PROGRESS | c9e50e5 |  | Bekliyor |
| H10 | P0 | H | Git | Gereksiz branch temizliği | IN_PROGRESS |  |  | Bekliyor |
| H11 | P1 | H | Git | Stale PR temizliği | TODO |  |  | Bekliyor |
| H12 | P0 | H | Git | Main history güvenliği | TODO |  |  | Bekliyor |
| H13 | P1 | H | Kod Temizliği | Dead code/debug/audit geçici dosya temizliği | TODO |  |  | Bekliyor |
| H14 | P0 | H | Final QA | Tam canlı ürün auditi yeniden koş | TODO |  |  | Bekliyor |
| H15 | P0 | H | Final QA | Kullanıcı doğrulama kapısı | TODO |  |  | Bekliyor |
| X01 | P1 | Extra | Medya Mimarisi | Asset türev registry | TODO |  |  | Bekliyor |
| X02 | P1 | Extra | Medya İşleme | Original asset immutable | TODO |  |  | Bekliyor |
| X03 | P1 | Extra | Gizlilik | Public türevlerde EXIF/GPS sızıntısını önle | TODO |  |  | Bekliyor |
| X04 | P2 | Extra | İndirme | İleride owner download izni politikası | TODO |  |  | Bekliyor |
| X05 | P2 | Extra | Medya Temizliği | Social/thumbnail derivative TTL ve GC | TODO |  |  | Bekliyor |
| X06 | P2 | Extra | Analitik | Export/download kullanım ölçümü | TODO |  |  | Bekliyor |
| X07 | P1 | Extra | Uzun Formlar | Draft/autosave standardı | TODO |  |  | Bekliyor |
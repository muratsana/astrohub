# Astrohub — Master Audit + Uygulama Spesifikasyonu

**Tarih:** 18 Ağustos 2026  
**Canlı:** `https://astrohub.com.tr`  
**Repo:** `muratsana/astrohub`  
**Metod:** canlı Playwright black-box audit + authenticated akışlar + kaynak kod + Supabase veri doğrulaması + kullanıcı ekran görüntüleri.

Bu iş bir kod-auditi listesi değil; gerçek kullanıcı deneyimi patch'idir.

## 1. Doğrulanmış kritik sorunlar
- Kayıt formu: Kullanım Koşulları/KVKK dönüşünde state kaybı.
- Galeri: detail dönüşünde page/scroll/search/filter/sort bağlamı yok.
- `/saha`: observing_sites canlı PostgREST request HTTP 400.
- Ana sayfa: Meteoblue Edge Function geçici HTTP 503; graceful fallback gerekli.
- Mobil `/etkinlikler`: 390px viewport'ta yaklaşık 665px document overflow; `min-w-[980px]` tablo mobil kart/list olmalı.
- Benzer Fotoğraflar ve Teknik Karşılaştırma: gerçek thumbnail yerine placeholder.
- Navbar: avatar/kullanıcı menüsünde görünür `Çıkış yap` yok.

## 2. Fotoğraf indirme
Fotoğraf altındaki `İndir` dropdown:
1. `Yüklenen orijinal (annotasyonsuz)`
2. `Plate Solve Annotated`

Gerçek kamera RAW'ı ayrıca saklanmıyorsa "Ham" diye yanlış adlandırma yapma. Annotated hazır değilse disabled + durum. Signed URL/filename güvenliği uygula.

## 3. Owner-only Paylaşım Kiti
Yalnız fotoğraf owner'ı. Client görünürlüğü + server-side ownership zorunlu.

Çıktılar:
- Instagram gönderi: varsayılan 1080×1350 (4:5).
- Instagram hikâye: 1080×1920 (9:16).
- Boyut/aspect oranları config'te.
- Blind center-crop yok; preview ve mevcut thumbnail focal/crop metadata'sını reuse et.
- source: original/annotated.
- opsiyonel watermark/@username.
- Feed + Story + caption.txt için tercihen tek ZIP.

Kopyalanabilir şablon:
```text
Obje Adı: <obje>
Çekim Tarihi: <tek tarih / aralık / sezonlar>
Konum: <privacy politikasına uygun>
Optik Tüp: <optik>
Montür: <montür>
Kamera: <kamera>
Filtre: <filtreler>
Pozlama: <ör. L: 50 × 300 sn; R: 50 × 300 sn>
Toplam Entegrasyon: <opsiyonel>
Yazılım: <yazılımlar>
Takımyıldız: <varsa>
Bortle: <opsiyonel>
```
`Kopyala`, `TXT indir`, `Instagram Gönderi`, `Instagram Hikâye`.

## 4. Çekim tarihleri / sezonlar
- Varsayılan tek tarih.
- `Tarih aralığı` checkbox -> start/end.
- `Sezon ekle` -> birden fazla çekim bloğu.
- Her sezon tek tarih veya range.
- Exposure satırlarını season_id ile ilişkilendirecek veri modelini değerlendir.
- Toplam entegrasyon tüm sezonlardan.
- Yeni filtre satırı son satırın kare sayısı + poz süresini kopyalasın; filtre yeni/boş.

## 5. Thumbnail / Kart Kadraj Editörü
Center-crop astrofotoğrafta objeyi kaybettirebilir.

Upload wizard'da:
- drag/move
- zoom
- focal point
- reset
- touch/pinch
- klavye/fallback
- Gallery Card + Home Card gerçek aspect önizlemeleri

Owner fotoğraf yayınlandıktan sonra da kadrajı düzenleyebilmeli. Non-owner UI/API erişemez.

### Veri/performans
DB'ye büyük thumbnail blob'u yazma. Normalized crop metadata (`focal_x`, `focal_y`, `zoom` veya crop rect, `crop_version`) sakla.
Original immutable.
Derivative'ler object storage'da (`thumbnail_card`, `thumbnail_home`, responsive variants).

### Eski türev temizliği
1. Yeni derivative üret.
2. Decode/size/checksum doğrula.
3. DB pointer/version atomik güncelle.
4. Sonra eski thumbnail derivative'ı delete queue'ya al.
5. Delete başarısızsa orphan GC temizlesin.

Original/web/annotated yanlışlıkla silinmez. Aynı source+crop+processor version idempotent/cacheable olmalı.

## 6. İlan fotoğraf sistemi
- max 5
- ortak Astrohub medya optimizer
- web output <=5MB
- progress
- delete/replace/reorder
- edit'te var olanlar korunur
- client + backend validation

## 7. Fotoğraf detay
- `Kaydet` gerekiyorsa `Koleksiyona kaydet`; `İndir` ayrı.
- plate solve RA/Dec -> constellation; manual override korunur.
- büyük puanlama paneli kaldır; fotoğraf altı kompakt yıldız ikonu -> 1–10 popover.

## 8. Hesap / Navbar
- e-posta yanında kompakt `Doğrulandı` badge.
- `Hesabım` yerine `[avatar] username`.
- user menu: Public profilim / Hesabım / uygun kısayollar / Admin ise Yönetim / **Çıkış yap**.
- Logout gerçek Supabase session'ını temizlemeli.

## 9. Public Profil
LinkedIn benzeri kimlik bölgesi:
- solda avatar
- sağda username/gerçek ad/konum/kısa bio

Fotoğraflar, Ekipmanlar, Hakkında vb. accordion/collapsible. 390/768/1440 responsive. İsteğe bağlı hash deep-link.

## 10. Ekipmanlarım / Katalog
- setup `Düzenle`: builder preload, same id update.
- çoklu filtre envanteri.
- en az 19 duplicate grup için canonical merge.
- canonical model + true variant/SKU + alias.
- legacy product status; kullanıcı eski ekipmanını seçebilmeli.
- PrimaLuceLab EAGLE ailesi ve diğer markalarda seri-gap araştırması.
- dedup migration: dry-run + FK map + backup + rollback.

## 11. Medya Asset Registry
Açık derivative tipleri:
- original_uploaded
- web_optimized
- thumbnail_card
- thumbnail_home
- plate_solve_annotated
- social_feed
- social_story

Metadata: source_asset_id, type, processing_version, status, width/height/mime/bytes, checksum, generated_at.

Kurallar:
- original immutable
- derivative idempotent
- source/crop değişince invalidation
- superseded cleanup
- orphan GC
- geçici social asset TTL
- relational DB'de binary şişmesi yok
- public/social derivative'de unintended EXIF/GPS yok

## 12. QA
Personalar: anonymous, fresh, member, owner, non-owner, admin; 390 ve 1440.
Kritik akışlarda happy, invalid, back/recovery, refresh, cancel, retry, mobile, network failure.
Her düzeltilen bug regresyon testine dönüşür.

## 13. Main-only Git
Yeni branch açma. Force-push yok.
Bilinen non-main branchler: `claude/claude-code-gorev-steps-cb2ora`, `codex/product-ux-audit-20260818`.
Audit PR #22 kapalıdır. Branch silmeden unique diff/commit kontrolü yap; gerekliyi main'e taşı, sonra gereksizi sil.

## 14. İlerleme Artifact
`IMPLEMENTATION_PROGRESS.md` ve `PROGRESS_TRACKER.csv` main'de canlı source of truth.
Durum: TODO → IN_PROGRESS → CODED → TESTED → READY_FOR_USER → VERIFIED; BLOCKED.
VERIFIED yalnız kullanıcı tarafından.

## 15. Ek öneriler
1. Uzun form draft/autosave standardı.
2. Owner aksiyonları ile viewer aksiyonlarını görsel ayır.
3. Thumbnail crop metadata'yı social export'ta reuse et.
4. Katalog import duplicate quality gate.
5. GC telemetry: orphan_count, deleted_count, reclaimed_bytes.
6. Derivative job retry limiti + observable status.
7. Capture season tarihlerini timezone'suz `date` olarak tut; saat yoksa timezone uydurma.
8. Eski capture_date kayıtlarını migration'da default Season 1'e dönüştür.
9. Crop edit sırasında eski derivative yeni dosya doğrulanmadan silinmesin.
10. Media cleanup için dry-run admin/CLI aracı ekle.

## 16. Tamamlanma
Tüm P0/P1/P2 en az READY_FOR_USER; P0/P1 regression; canlı persona smoke; responsive; main clean; branch/PR temiz; media GC ve catalog rollback doğrulanmış; tracker evidence dolu; son kullanıcı doğrulaması.

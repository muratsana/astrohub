# Astrohub — Toparlama Planı (Ağustos 2026)

Bu plan iki kaynağı birleştirir:

1. **Dış QA/GUI/yayın denetimi** (30 Temmuz 2026, `astrohub-main.zip` + canlı
   ortam üzerinde) — NO-GO kararı ve 12 P0 engel.
2. **Bağımsız doğrulama denetimi** (30 Temmuz 2026, bu depo + canlı bundle +
   üretim Supabase projesi üzerinde) — dış raporun kritik iddiaları tek tek
   doğrulandı, rapora girmemiş dört yapısal bulgu eklendi.

Referanslar: [SITE-AUDIT-2026-07.md](./SITE-AUDIT-2026-07.md),
[GELISTIRME-PLANI.md](./GELISTIRME-PLANI.md), dış QA raporu (kullanıcı arşivi).

---

## 0. Neden bu plan — durumun tek paragraflık özeti

Kod tabanı güçlü (65+ rota, 814 birim testi, 26 E2E, temiz typecheck/lint);
fakat canlı site **tek bir bozuk ortam değişkeni yüzünden** tam demo modunda:
Vercel'deki `VITE_SUPABASE_URL` değeri `ttps://...` (baştaki `h` eksik) ve
`VITE_SUPABASE_ANON_KEY` hiç tanımlı değil. `isSupabaseConfigured=false`
olduğu için auth, canlı katalog, forum, ilan ve içerik tamamen kapalı;
ziyaretçi tohum (kurgu) veriyi gerçekmiş gibi görüyor. Canlı veritabanı ise
aslında dolu bekliyor: 1.086 ekipman modeli, 182 hedef, 15 etkinlik.
Bunun üstüne: hava/efemeris hesapları eksik veriyi "iyi koşul" sayabiliyor,
bağımlılıklarda 1 kritik + 8 yüksek açık var, SEO ham HTML'de yok ve
PR #1'in migration'ları canlı DB'ye uygulanmış ama kodu main'de değil.

**Planın omurgası:** önce yanlış bilgiyi durdur → sonra gerçek veriyi aç →
sonra eksikleri tamamla → en son yeni özellik ekle. Her faz sonunda site
yayınlanabilir durumda kalır.

---

## 1. Doğrulanmış kritik bulgular (kanıt haritası)

| # | Bulgu | Kanıt | Kaynak |
| --- | --- | --- | --- |
| B1 | Canlı `VITE_SUPABASE_URL` yazım hatalı (`ttps://`), anon key tanımsız | Canlı bundle sökümü: `Xa="ttps://…".trim(), Ja=void 0` | Doğrulama (QA P0-01'i teyit eder) |
| B2 | Boş tablo/yapılandırmasız durum **sessizce** tohuma düşüyor | `src/services/content/select.ts` | QA P0-02 ✓ |
| B3 | Eksik hava alanı `0` sayılıyor → yapay "uygun" sonucu | `openMeteo.ts` `at(...,0)`; `meteoblue.ts` `upperAir ?? 0` | QA P0-06/ASTRO-03 ✓ |
| B4 | Gece tarihi tarayıcı saat diliminde kuruluyor | `ephemeris.ts:321` `setHours(12)`, `TonightPage.tsx:55` `toDateString()` | QA ASTRO-01 ✓ |
| B5 | 12 npm açığı: 1 kritik, 8 yüksek (react-router dahil) | `npm audit` yerelde birebir aynı | QA P0-08 ✓ |
| B6 | Upload atomik değil; hiç telafi/`remove` çağrısı yok | `src/services/photos/upload.ts` | QA P0-11 ✓ |
| B7 | Radyo admin'i `radio_tracks`'e yazıyor, oynatıcı sabit boş diziyi okuyor | `RadioContext.tsx:11,55` ↔ `radio/data.ts:40` | QA FUNC-04 ✓ |
| B8 | Ana sayfada çift `h1` | `HeroSection.tsx:131` + `TonightPanel.tsx:150` | QA GUI-03 ✓ |
| B9 | 301 adet hardcoded 9–11px metin sınıfı | `grep text-\[(9\|10\|11)px\]` | QA GUI-01 ✓ (raporda ~366) |
| B10 | Ham HTML her rotada aynı; bilinmeyen rota 200 | Canlı HTML kabuğu + `vercel.json` rewrite | QA P0-03/SEO-01 ✓ |
| B11 | **PR #1 açık; migration'ları canlı DB'de, kodu main'de değil** | `list_migrations`: `optik_ve_montur_kunyeleri`, `forum_gruplari_ve_rozetler` uygulanmış | Yeni (QA raporunda yok) |
| B12 | Repo 22 migration dosyası ↔ canlıda 26 uygulanmış sürüm; katalog verisi araç dışı yüklenmiş | `supabase/migrations/` ↔ canlı geçmiş | Yeni |
| B13 | Supabase denetçisi: leaked password protection **kapalı**, `spatial_ref_sys` RLS'siz, `st_estimatedextent` anon'a açık | `get_advisors` çıktısı | Yeni (SEC-04 tahminini teyit eder) |
| B14 | Canlı DB dolu: 1.086 model, 182 hedef, 321 katalog kimliği, 15 etkinlik, 4 saha | `list_tables` satır sayıları | Yeni |

Doğrulanamayanlar: Lighthouse/LCP sayıları (sandbox'tan tarayıcı çıkışı yok) —
kök nedenleri kodda mevcut (`RemoteImage`'da `srcset` yok, hero autoplay,
Wikimedia yönlendirmeleri), iddiaya güven yüksek.

---

## 2. İlkeler (bağlayıcı)

1. **Yanlış bilgi > eksik özellik.** Eksik veriyi iyi koşul sayan hesap,
   olmayan özellikten daha zararlıdır; Faz 1 hiçbir şeyle takas edilmez.
2. **Dürüst durum iletişimi.** "Yakında" yazan ya da bağlı olmayan modül ya
   biter ya navigasyondan çıkar; demo içerik görünür biçimde etiketlenir.
3. **Her faz sonunda yayınlanabilir durum.** Uzun süre kırık kalan dal yok.
4. **Sağlayıcılar adapter arkasında** (hava, efemeris, ödeme, storage,
   bildirim); **türetilmiş veri sürüm taşır** (algoritma/sürüm alanı).
5. **RLS'siz tablo merge edilmez; her yazma idempotent olur.**
6. Çekirdek döngü tamamlanmadan çevresel modüller (radyo/TV büyütme,
   gamification, sosyal akış) **bilinçli olarak ertelenir** (QA §14.7).

---

## 3. Faz 0 — Acil müdahale (0–2 gün)

Amaç: yanıltıcı canlı durumu 48 saat içinde bitirmek. Kod işleri küçük;
asıl kilit iki operasyon adımı.

| ID | İş | Sahip | Kabul ölçütü | Efor |
| --- | --- | --- | --- | --- |
| T-001 | Vercel'de `VITE_SUPABASE_URL`'i düzelt (`https://`), `VITE_SUPABASE_ANON_KEY` ekle; production/preview kapsamlarını ayır | **Sen** (Vercel erişimi) | Canlı `/giris` gerçek auth formu gösterir; katalog DB'den gelir | 15 dk |
| T-002 | **PR #1 kararı**: merge (önerilen — migration'ları zaten canlıda) veya resmi geri alma | **Sen** karar + kod | Kod ↔ canlı şema sürüklenmesi kalmaz | 0,5 g |
| T-003 | Eksik/bozuk env'de production build'i **düşür**: `VITE_SUPABASE_URL` şema doğrulaması (`https://` zorunlu) + production'da iki değişken zorunlu | Kod | `ttps://` benzeri değerle build kırmızı | 0,5 g |
| T-004 | `DemoDataBanner`: `source === 'seed'` iken tüm liste/detay sayfalarında görünür "Örnek içerik" bandı; galeri dahil | Kod | Tohum gösteren hiçbir sayfa etiketsiz kalmaz | 0,5 g |
| T-005 | Supabase dashboard: leaked password protection **aç**; admin/editör için MFA zorunluluğunu planla | **Sen** | Advisor uyarısı kapanır | 15 dk |
| T-006 | `react-router`/`react-router-dom` güvenli sürüme; ardından typecheck+lint+814 test+build+26 E2E | Kod | `npm audit`'te production high/critical = 0 | 0,5 g |
| T-007 | `engines.node` + `.nvmrc` (CI ile aynı LTS'e sabitle; Node 25'te 26 test kırılıyor) | Kod | Yanlış Node'da `npm ci` uyarır, CI/Vercel sabit | 0,25 g |

**Çıkış kriteri:** Canlı site gerçek kataloğu servis eder; tohum gösteren her
yer etiketlidir; kritik paket açığı ve env tuzağı kalmaz.

---

## 4. Faz 1 — Yanlış bilgi üreten hesaplar (2–4 gün)

Amaç: astronomi/hava çıktılarının hiçbirinin eksik veriyi iyi koşul
saymaması. (QA ASTRO-01…08 + B3/B4.)

| ID | İş | Kabul ölçütü | Efor |
| --- | --- | --- | --- |
| T-101 | `openMeteo.ts`: zorunlu alan eksikse değer `null`/`unknown`; `at(...,0)` varsayılanları kalkar; UTC iste veya `utc_offset_seconds` ile açık parse | Eksik bulut/nem/rüzgâr hiçbir yerde 0 görünmez; İstanbul/Londra/New York/DST testleri | 1 g |
| T-102 | `meteoblue.ts`: `upperAir` yoksa seeing **üretme**; koddaki "reddedilir" yorumu davranışla eşleşsin | `upperAir=null` → seeing `unknown` | 0,5 g |
| T-103 | "Gözleme uygun" kararı çok faktörlü + **hard-stop**: yağış veya kritik veri eksikliği → karar yok; amaç bazlı (görsel / derin gökyüzü / gezegen) ayrım ilk sürümde en az "veri yetersiz" durumunu tanır | Hiçbir eksik alan "açık/kuru/sakin" sayılmaz; UI "veri yok"u ayrı gösterir | 1 g |
| T-104 | Gece tarihi seçili konumun IANA zaman diliminde kurulur; hesap UTC instant'ta, yalnız gösterim yerel | Farklı tarayıcı zonundan Türkiye konumu doğru takvim gecesini verir; DST sınır testleri | 1 g |
| T-105 | `greenwichSiderealTime` adlandırma/doküman düzeltmesi (GMST) | Yorum ve isim gerçek formülle eşleşir | 0,25 g |
| T-106 | Ay doğuş/batış kesinlik iddialarını yumuşat; topocentric düzeltme için Astronomy Engine benzeri kütüphaneyi **adapter arkasında** değerlendir (lisans kontrolü ile) | USNO/JPL örnekleriyle golden test; sapma payı UI'da yazılı | 1–2 g |
| T-107 | Seeing her görünümde "tahmin indeksi" + veri kaynağı/üretim saati/güven düzeyi | Ölçüm ile tahmin hiçbir ekranda aynı görünmez | 0,5 g |
| T-108 | Astronomi golden test paketi: karanlık pencere, Ay fazı/doğuş-batış, transit — bağımsız referans değerlerle | CI'da koşar; zaman dilimi matrisi dahil | 1 g |

**Çıkış kriteri:** QA go-live listesindeki "Astronomi" bölümünün ilk üç
maddesi yeşil.

---

## 5. Faz 2 — Veri, migration ve ortam hizalaması (2–3 gün)

| ID | İş | Sahip | Kabul ölçütü | Efor |
| --- | --- | --- | --- | --- |
| T-201 | Migration hizalaması: canlı şemayı baseline kabul et (`db diff` ile fark çıkar), repo dosyalarını canlı geçmişle eşleşecek biçimde yeniden düzenle; araç dışı yüklenmiş katalog verisini idempotent seed/import betiğine taşı | Kod | Boş bir projeye `db push` + import ⇒ canlıyla birebir şema ve referans veri | 1–1,5 g |
| T-202 | **Staging Supabase projesi** kur; migration'ları sıfırdan uygula; Vercel preview'u staging'e bağla | **Sen** (proje açma) + kod | Preview ortamı üretim verisine dokunmaz | 0,5 g |
| T-203 | Production modunda seed fallback **kapalı**: `VITE_APP_MODE=demo\|staging\|production`; production'da boş tablo → tasarlanmış `EmptyState` | Kod | Production'da `source==='seed'` imkânsız; demo modda banner zorunlu | 1 g |
| T-204 | RLS test matrisi: anon / kullanıcı / sahip / editör / admin rolleriyle okuma-yazma senaryoları (staging'de gerçek istemciyle) | Kod | Negatif senaryolar dahil CI'da koşar | 1 g |
| T-205 | `st_estimatedextent` yetkisinin `supabase_admin` ile geri alınması (destek/dashboard); `spatial_ref_sys` RLS kararı — öneri: `ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;` (salt-okunur sistem tablosu; politika eklemeden erişim kesilebilir, sahiplik nedeniyle migration'dan başarısız olabilir → dashboard'dan) | **Sen** + destek | Advisor'da iki uyarı kapanır veya yazılı risk kabulü | 0,5 g |
| T-206 | Seed içeriği üretime taşıyan kontrollü import komutu (haber/yazı/etkinlik gibi editoryal başlangıç içeriği; kurgu kullanıcı/fotoğraflar **taşınmaz**) | Kod | Demo kişiler gerçek kullanıcı izlenimi vermez | 0,5 g |

---

## 6. Faz 3 — SEO, performans, sosyal paylaşım (7–12 gün) *(QA Faz B)*

| ID | İş | Kabul ölçütü |
| --- | --- | --- |
| T-301 | Prerender/SSG kararı ve uygulaması: indekslenebilir rotalar build/deploy sırasında gerçek `<title>`/canonical/OG/JSON-LD ile ham HTML üretir; bilinmeyen rota sunucudan **404**; auth/panel/admin ham HTML'de `noindex` | `curl` ile rota başına doğru metadata + durum kodu; CI kontrolü |
| T-302 | `og:image`/`twitter:image`: fotoğraf, haber, etkinlik, ekipman detayına mutlak URL + ölçü + alt metin + `og:type` | Paylaşım önizlemeleri doğrulanır |
| T-303 | Sitemap'i yayımlanmış DB içeriğinden üret; `lastmod` gerçek `updated_at`; taslak/demo dışlanır | Sitemap URL'leri CI'da 200 + canonical eşleşmesi |
| T-304 | Görselleri kendi storage/CDN'ine al (lisans+atıf kaydıyla); 320–1920 px AVIF/WebP türevleri; `RemoteImage`'a `srcset/sizes/width/height` zorunlu; Rosette PNG (2,9 MB) dönüştürülür | Wikimedia'ya canlı istek kalmaz; üçüncü taraf çerez uyarısı kapanır (QA P0-10) |
| T-305 | Hero: ilk görsel preload + `fetchpriority="high"`; autoplay LCP sonrası veya kaldırılır; diğer slaytlar lazy; `prefers-reduced-motion` | Mobil LCP ≤ 2,5 sn (Lighthouse ile) |
| T-306 | Font ailesi/subset azaltma; rota başına JS bütçesi | İlk rota JS ≤ 200 kB gzip |
| T-307 | Lighthouse CI + bütçe gate'leri (perf ≥ 90; LCP/INP/CLS p75 hedefleri) | CI'da kırmızı/yeşil |

---

## 7. Faz 4 — GUI standardizasyonu ve erişilebilirlik (5–8 gün) *(QA Faz C)*

| ID | İş | Kabul ölçütü |
| --- | --- | --- |
| T-401 | `PageFrame` + beş sayfa şablonu (liste/detay/araç/editoryal/panel); genişlik-gutter-boşluk token'ları | Kritik rotalar şablon kullanır |
| T-402 | Semantik tipografi token'ları (`text-meta/label/caption/body-sm`); **301 hardcoded 9–11px sınıfı sıfırlanır**; metadata min 12 px, gövde min 14 px | `grep text-\[(9\|10\|11)px\]` = 0 |
| T-403 | `--color-faint` kontrastı küçük metinde ≥ 4.5:1; üç temada (dark/light/field) ayrı doğrulama | Axe kritik ihlal = 0 |
| T-404 | Ortak durum bileşenleri: `LoadingState/EmptyState/ErrorState/OfflineState/DemoDataBanner/AuthRequiredState/PermissionState/DegradedDataState` | Tüm sayfalar aynı sözleşmeyi kullanır |
| T-405 | Tek `h1` (TonightPanel `h2` olur); düzenli başlık hiyerarşisi | Rota başına `h1` sayısı testle kilitli |
| T-406 | Dokunma hedefleri ≥ 44×44 px (carousel noktaları dahil); icon-only kontrollere `aria-label`; carousel duraklat/aktif slayt duyurusu | Axe + manuel klavye/VoiceOver/NVDA kritik akışlar |
| T-407 | Galeri 4 kolon varsayılan + mobil künye sadeleşmesi; etkinlik kartında boş görsel yerine kompakt placeholder; forum satır tipografisi; araçlarda sticky sonuç paneli | QA §6.4 sayfa önerileri uygulanır |
| T-408 | Görsel regresyon: onaylı baseline + fark eşiği (390/768/1024/1440 × 3 tema × uzun metin/boş/hata durumları) | CI'da matris koşar |

---

## 8. Faz 5 — Eksik/kopuk modüller (8–15 gün) *(QA Faz D)*

| ID | İş | Sahip | Kabul ölçütü |
| --- | --- | --- | --- |
| T-501 | Radyo: `useRadioTracks` servisi ile `radio_tracks` → oynatıcı; boş yayın/hata durumları; lisans alanları admin formunda zorunlu | Kod | Admin'in eklediği parça oynatıcıda çalar veya modül navigasyondan çıkar |
| T-502 | Fotoğraf yükleme durum makinesi: `upload_sessions` (`created → derivatives_uploaded → original_uploaded → metadata_saved → ready`), idempotency anahtarı, telafi temizliği, sahipsiz nesne süpürücüsü (Edge Function/cron) | Kod | Kısmi hata artıksız; aynı istek iki kez güvenle gönderilebilir |
| T-503 | Sunucu tarafı görsel doğrulama/türev: magic-byte MIME, decode testi, boyut sınırı; türevler kuyrukta (libvips benzeri) — istemcide yalnız önizleme | Kod | 50 MB dosya mobil tarayıcıyı çökertmez; gizlilik metniyle davranış eşleşir (QA P0-09) |
| T-504 | **Üyelik/ödeme kararı**: sağlayıcı seç (iyzico/PayTR/Stripe değerlendirmesi) → ya tam akış (checkout, imzalı idempotent webhook, durum makinesi, fatura/iptal) ya da tüm ödeme vaatlerinin metinlerden **çıkarılması** | **Sen** karar; kod uygular | Üründe/hukuk metninde karşılıksız ödeme iddiası kalmaz |
| T-505 | Panel "Yakında" sayfaları (Planlarım/İlanlarım/Üyelik): bitir veya navigasyondan kaldırıp yol haritası sayfasına taşı | Kod | Navigasyonda işlevsiz hedef kalmaz |
| T-506 | Meteoblue vekili sertleştirme: origin allowlist, IP/oturum oran limiti, koordinat grid cache, sağlayıcı harcama limiti | Kod + **Sen** (limit ayarı) | Anahtar kotası dış istekle tüketilemez |
| T-507 | CSP Report-Only → enforce (`default-src 'self'` + dar allowlist); görseller kendi CDN'ine geçince sadeleşir | Kod | Rapor ihlalsiz; enforce açık |
| T-508 | Auth sertleştirme: min 10–12 karakter, OAuth redirect allowlist, oturum iptali; CAPTCHA/rate limit gözden geçirme | Kod + **Sen** (dashboard) | QA SEC-04 listesi kapanır |
| T-509 | Etkinlik haritası: tile lisansı kararı (**Sen**) → gerçek harita + attribution + cluster; karar gelene dek mevcut şematik dürüst görünüm kalır | **Sen** + kod | "Harita" iddiası gerçek haritayla karşılanır |

---

## 9. Faz 6 — Test, operasyon, dayanıklılık (4–7 gün) *(QA Faz E + §13)*

| ID | İş | Kabul ölçütü |
| --- | --- | --- |
| T-601 | `test:all` zincirini gerçek kapsama getir: typecheck → lint → unit → prod build → preview build → smoke → E2E → Lighthouse CI → axe | Yerel "all" ile CI aynı |
| T-602 | Gerçek Supabase (staging) entegrasyon E2E'si: kayıt→doğrulama→giriş→çıkış→şifre sıfırlama; upload→yayın→kota; forum/etkinlik/ilan yazma; RLS negatifleri | QA FUNC-10 zincirleri CI'da |
| T-603 | Service worker testi (install/update/offline); `buildSw` giriş tespitini regex yerine Vite `isEntry` ile yap | Supabase lazy chunk precache'e girmez |
| T-604 | Gözlemlenebilirlik: istemci hata izleme + source map, Web Vitals RUM, sentetik uptime (kök/giriş/galeri), yapılandırılmış Edge Function logları | Alarm kanalı çalışır (sağlayıcı seçimi **Sen**) |
| T-605 | Yedek/rollback: Supabase PITR/yedek doğrulaması, storage yedeği, restore tatbikatı, Vercel rollback prosedürü, RTO/RPO yazılı | Bir kez uçtan uca denenmiş ve belgelenmiş |
| T-606 | CI supply-chain: action'ları SHA'ya sabitle, izinleri daralt; Dependabot/Renovate + haftalık audit | Release gate: high/critical = 0 |

---

## 10. Faz 7 — Ürün derinliği (Core 1.0 sonrası, seçilmiş MUST'lar)

QA §14'teki ürün önerileri değerli; ama **hiçbiri Faz 0–6'nın önüne
geçmez**. Önerilen sıra (QA MUST setinden, mevcut koda en çok yaslananlar
önce):

1. **Bu Gece çalışma ekranı** (MUST-01) — mevcut `TonightPage` +
   `nightTimeline` üstüne: karanlık türleri, Ay ayrıntısı, saatlik katmanlar,
   veri yaşı/kaynağı, "neden önerildi". *(Faz 1'deki dürüst veri sözleşmesi
   önkoşul.)*
2. **Setup tabanlı açıklanabilir hedef önerisi** (MUST-02) — `domain/setup`
   ve `domain/targets` zaten var; puan bileşenleri deterministik ve
   açıklanabilir olacak.
3. **Gece oturumu günlüğü** (MUST-03) — fotoğraf künyesinin üst kavramı;
   `user_setups` ile ilişkili yeni tablo + RLS.
4. **Genişletilmiş teknik künye** (MUST-04) — isteğe bağlı ama standart
   alanlar; form "temel/çekim/kalibrasyon/işleme" gruplarında.
5. **Saha modu derinleştirme** (MUST-07) — `field` teması mevcut; offline
   gece planı + büyük kontroller + parlak içerik bastırma.
6. **Bildirim/alarm merkezi** (MUST-10) — `notification_preferences` ve
   `push_subscriptions` tabloları hazır; e-posta sağlayıcısı kararı **Sen**.
7. **Moderasyon/güven** (MUST-09) — tek kuyruk mevcut; rapor nedenleri,
   telif başvurusu, itiraz akışı eklenir.
8. Plate solving + FITS analizi (MUST-05/06) ve MUST-08 veri tazelik
   sözleşmesinin tam UI dili — Observatory 2.0 ufku.

BETTER-01…11 ve FUTURE-01…04, Core 1.0 kapanmadan başlatılmaz; IA
sadeleşmesi (QA §14.5: Keşfet/Bu Gece/Planla/Kaydet/Topluluk/Ekipman) Faz 4
şablon işiyle birlikte tek seferde değerlendirilir.

---

## 11. Yalnızca senin yapabileceklerin (erişim/karar listesi)

| Ne | Nerede | Hangi görev |
| --- | --- | --- |
| Env düzeltmesi (`VITE_SUPABASE_URL` typo, anon key) | Vercel | T-001 |
| PR #1 merge/geri alma kararı | GitHub | T-002 |
| Leaked password protection, MFA, auth ayarları | Supabase dashboard | T-005, T-508 |
| Staging Supabase projesi açma | Supabase | T-202 |
| `st_estimatedextent`/`spatial_ref_sys` (supabase_admin yetkisi) | Supabase destek/dashboard | T-205 |
| Ödeme sağlayıcısı seçimi + sözleşme | — | T-504 |
| Harita tile lisansı | — | T-509 |
| Hata izleme/uptime sağlayıcısı seçimi | — | T-604 |
| Meteoblue harcama limiti | meteoblue hesabı | T-506 |
| Hukuk incelemesi (KVKK/koşullar ↔ gerçek davranış) | — | Faz 5 sonu |

---

## 12. Sıra ve efor özeti

| Faz | İçerik | Efor (kişi/gün) | Bağımlılık |
| --- | --- | --- | --- |
| 0 | Acil müdahale | 2–3 | T-001/T-002 sana bağlı |
| 1 | Yanlış bilgi üreten hesaplar | 2–4 | — |
| 2 | Veri/migration hizalaması | 2–3 | T-202 sana bağlı |
| 3 | SEO + performans | 7–12 | Görsel CDN kararı |
| 4 | GUI + erişilebilirlik | 5–8 | Faz 3 ile paralel yürüyebilir |
| 5 | Eksik modüller | 8–15 | T-504/T-509 kararları |
| 6 | Test + operasyon | 4–7 | Faz 2 (staging) |
| **Toplam (güvenli yayın)** | | **30–52** | QA tahmini 27–47 ile uyumlu |
| 7 | Ürün derinliği (Core 1.0) | +20–35 | Faz 0–6 |

Kabul kapıları için QA raporundaki **§16 Go-live kontrol listesi** esas
alınır; her faz kapanışında ilgili bölüm işaretlenir. "Tamamlandı" duyurusu,
P0 listesi kapanmadan yapılmaz.

# Astrohub — Geliştirme Planı ve Yol Haritası

**Sürüm:** 1.0
**Tarih:** 14 Temmuz 2026
**Kaynak şartname:** [`ASTROHUB_PRODUCT_UI_TECHNICAL_SPEC.md`](./ASTROHUB_PRODUCT_UI_TECHNICAL_SPEC.md)

Bu belge, onaylanan ürün/UI/teknik şartnameyi somut mühendislik adımlarına
dönüştüren yürütme planıdır. Şartname "ne" ve "neden"i tanımlar; bu plan
"nasıl", "hangi sırayla" ve "ne zaman"ı tanımlar.

---

## 0. Mevcut durum ve temel karar

**Repo durumu:** Bu repository şu an boştur (henüz commit yok). Şartnamede
temel kaynak olarak gösterilen **StageHub kod tabanı repoda mevcut değildir** —
şartname yalnızca statik olarak incelenmiş bir ZIP'ten referans vermektedir.

Bu durum iki olası yol doğurur:

| Yol | Açıklama | Sonuç |
|---|---|---|
| **A — StageHub fork** | StageHub kaynak kodu repoya eklenir, şartnamedeki §12 dönüştürme planı birebir uygulanır. | Mevcut AppShell/Auth/Admin/PWA kabuğu doğrudan devralınır, hız kazanılır. |
| **B — Temiz kurulum** | Şartnamedeki aynı teknoloji yığını ile sıfırdan başlanır; StageHub yalnızca desen referansı olur. | Miras teknik borç ve müzik alanına özgü tablolar hiç girmez; başlangıç daha yavaş ama daha temiz. |

> Bu plan, **her iki yolla da uyumlu** olacak biçimde yazılmıştır. Faz 0'ın ilk
> kararı bu yolun seçilmesidir. Yol A seçilirse StageHub reposu `add_repo` ile
> eklenir; Yol B seçilirse aşağıdaki scaffold adımları uygulanır.

---

## 1. Teknoloji yığını (şartname §11 ile uyumlu)

**Ön yüz**
- React 19 + TypeScript (strict mode)
- Vite 6 build
- Tailwind CSS 4 + tasarım token'ları (§6.2)
- Radix UI / shadcn tabanlı bileşen sistemi
- React Router 7
- TanStack Query (server state)
- React Hook Form + Zod (form + doğrulama)
- Leaflet / React Leaflet (harita)
- PWA (service worker, offline, push)

**Backend**
- Supabase: Auth, PostgreSQL + PostGIS, RLS, Realtime, Edge Functions
- S3 uyumlu object storage (R2/B2/S3) — `ObjectStorageAdapter` soyutlaması
- CDN (görsel türevleri)
- Ayrı görsel/EXIF worker (Edge Function süre/bellek sınırının dışında)
- İş kuyruğu (durable task)

**Adapter katmanları** (sağlayıcı bağımlılığını azaltmak için — §3.3.8)
- `ObjectStorageAdapter`, `LightPollutionProvider`, `WeatherProvider`,
  `MapProvider`, `EphemerisProvider`, `PaymentProvider`, `SearchAdapter`

---

## 2. Mimari ilkeler (bağlayıcı)

1. **İş kuralları katmanı ayrıdır.** Kota, entitlement, FOV, EXIF normalize,
   konum gizleme gibi kurallar React bileşenlerinde değil `domain/` ve
   `services/` katmanında yaşar (§12.5).
2. **Kota çift doğrulanır.** 50 fotoğraf sınırı hem sunucu API'sinde hem de
   veritabanı fonksiyonunda kontrol edilir; ön yüz asla tek otorite değildir.
3. **Sağlayıcılar adapter arkasında.** Depolama, harita, hava, efemeris, ödeme
   ve arama doğrudan çağrılmaz.
4. **Konum mahremiyeti varsayılan gizlidir.** GPS/exact koordinat açık onay
   olmadan yayımlanmaz.
5. **Orijinal medya public URL almaz.** Yalnızca türevler CDN'den sunulur.
6. **RLS her tabloda açıktır.** Admin yetkisi DB rol tablosuyla kontrol edilir,
   JWT metadata'ya körü körüne güvenilmez.
7. **Idempotency zorunludur.** Upload, ödeme webhook'u ve moderasyon aksiyonları
   tekrar-güvenli tasarlanır.

---

## 3. Klasör yapısı hedefi (şartname §21)

```text
src/
  app/                      # router, providers, layout kompozisyonu
  components/
    shell/ ui/ maps/ media/ astronomy/
  features/
    auth/ membership/ home/ photos/ capture/ targets/ equipment/
    setups/ calculators/ events/ organizers/ observing-sites/
    sky-tonight/ planner/ marketplace/ learning/ clubs/ messages/
    notifications/ profile/ admin/
  services/
    object-storage/ image-processing/ payments/ maps/
    light-pollution/ weather/ ephemeris/ search/
  domain/
    membership/ photography/ equipment/ astronomy/ events/ geography/
  lib/ types/ test/
supabase/
  migrations/ functions/ seed/
workers/
  image-processor/ source-monitor/ import-processor/
```

---

## 4. Veritabanı migration planı (şartname §12.4)

Konsolide, temiz migration grupları — StageHub'ın 100 migration mirası
taşınmaz:

```
0001_extensions_and_core.sql        # postgis, pg_trgm, citext, ortak enum/util
0002_auth_profiles_membership.sql   # profiles, user_roles, memberships, billing
0003_equipment_and_setups.sql       # brands/categories/models/specs/user_setups
0004_targets.sql                    # celestial_objects, catalog_identifiers
0005_photos_and_capture.sql         # astro_photos, capture_sessions, exif, files
0006_events_and_organizers.sql      # events, organizers, sessions, sources
0007_sites_and_maps.sql             # observing_sites (PostGIS), measurements
0008_marketplace.sql                # listings, seller_reviews, price_history
0009_learning.sql                   # learning_contents, datasets
0010_social_notifications.sql       # follows, messages, notifications, clubs
0011_admin_audit.sql                # moderation_queue, audit_logs, import_jobs
0012_storage_and_rls.sql            # storage policy + tüm RLS politikaları
```

Ekipman spec'i için iki-katman: sık filtrelenen ortak alanlar typed kolon,
kategoriye özgü ayrıntılar doğrulanan JSONB (§9.2).

---

## 5. Fazlar → yürütme sprintleri

Şartname §18'deki fazları ölçülebilir sprintlere böldük. Her sprintin sonunda
çalışan, gözle görülür bir çıktı (demoable) hedeflenir.

### Faz 0 — Temel platform (Sprint 0.1 – 0.3)

| Sprint | İçerik | Çıktı / Kabul |
|---|---|---|
| **0.1 Scaffold** | Vite+React19+TS+Tailwind4 kurulumu, ESLint/Prettier, Vitest+Playwright, CI, klasör iskeleti, tema token'ları (§6.2) | `npm run dev` çalışır; lint+test yeşil; CI kurulu |
| **0.2 Tasarım sistemi + Ana sayfa** | AppShell (Topbar/Footer), UI primitive'leri, koyu tema, **kabul edilen ana sayfa** (referans görsele birebir) | Ana sayfa dashboard değil; referansla eşleşir; erişilebilir; responsive |
| **0.3 Supabase temeli** | Yeni Supabase projesi, `0001`+`0002` migration, Auth (kayıt/giriş), tek üyelik iskeleti, `ObjectStorageAdapter` arayüzü | Kullanıcı kayıt/giriş yapar; RLS temel testleri geçer |

### Faz 1 — Çekirdek MVP (Sprint 1.1 – 1.8)

| Sprint | İçerik |
|---|---|
| **1.1** Üyelik + ödeme lifecycle (`PaymentProvider`, webhook, idempotency, grace period, entitlement sunucuda) |
| **1.2** Object storage + fotoğraf pipeline: signed upload, staging, worker, EXIF okuma/normalize, AVIF/WebP türevleri, 50 kota (§10) |
| **1.3** Fotoğraf yükleme sihirbazı (6 adım, §7.4) + fotoğraf detay/yorum/beğeni/koleksiyon (§7.3) |
| **1.4** Hedef veritabanı temel sürüm + katalog arama (Messier/NGC/IC…) (§8.2) |
| **1.5** Ekipman veritabanı + setup oluşturucu + **FOV/pixel scale hesaplayıcı** (§7.11–7.12) |
| **1.6** Etkinlikler: liste/takvim/harita + detay + kayıt (§7.5–7.6) |
| **1.7** Temel kamp/gözlem haritası (Leaflet + PostGIS yakınlık) + site detay (§7.7–7.8) |
| **1.8** Eğitim içerikleri + temel ikinci el ilanları + admin onay kuyrukları (§7.13–7.14, §13) |

### Faz 2 — Türkiye portalı derinliği
Organizatör/kulüp profilleri, etkinlik kaynak izleme + dedupe, kamp noktası
ayrıntılı kriterleri, fotoğraf sürüm karşılaştırma, ekipman uyumluluk,
"Bu gece gökyüzünde", gözlem planlayıcı, push, PWA offline planlar, satıcı
değerlendirmeleri.

### Faz 3 — Astrotrip + canlı gökyüzü ağı
Astrotrip rota, canlı SQM/all-sky, gelişmiş hava/seeing, mosaic planlayıcı,
yurttaş bilimi, işleme laboratuvarı/FITS, teknik sorun teşhis merkezi.

### Faz 4 — Ölçek + uluslararasılaşma
Çoklu dil, TR dışı lokasyonlar, ayrı arama motoru, analitik.

---

## 6. Test ve kalite tabanı (baştan kurulur — §17)

- **Unit:** FOV/pixel scale, entegrasyon süresi, kota, entitlement, EXIF
  normalize, konum gizleme, ekipman uyumluluk.
- **Integration:** RLS, publish akışı, 50 sınırı, ödeme webhook, etkinlik onayı,
  listing lifecycle.
- **E2E (Playwright):** kayıt/ödeme/giriş, upload, yorum, event kaydı, kamp
  ekleme, ilan, admin onayı.
- **Görsel regresyon:** ana sayfalar 1440 / 1024 / 390 px.
- CI'da her PR'da: typecheck + lint + unit + integration; nightly E2E.

---

## 7. Güvenlik / KVKK / moderasyon (kesişen, her sprintte) — §15

- Her yeni tabloya RLS ile birlikte gelir (RLS'siz tablo merge edilmez).
- Dosya güvenliği: magic-byte MIME, decode testi, boyut sınırı, SVG yasak,
  signed URL süresi, upload rate limit.
- Konum gizliliği: tam/yaklaşık/il-ilçe/gizli; hassas noktada otomatik yuvarlama.
- Telif + AI beyanı yükleme akışına gömülü.
- KVKK: aydınlatma, açık rıza ayrımı, veri dışa aktarma, hesap silme, saklama.
- Repo hijyeni: secrets yalnızca ortam değişkeninde; belgede gerçek kimlik yok.

---

## 8. İlk uygulama sırası (şartname §22 ile birebir)

1. Repository ve veritabanı temizliği/kurulumu ← *repo boş olduğu için doğrudan temiz kurulum*
2. **Astrohub tasarım sistemi ve ana sayfa** ← *ilk somut kod çıktısı*
3. Auth, üyelik ve ödeme
4. Object storage ve fotoğraf pipeline
5. Fotoğraf, target, equipment ve setup
6. Etkinlikler
7. Kamp/harita
8. Eğitim ve ikinci el
9. Admin, moderasyon ve operasyon
10. Gözlem planlayıcı ve ileri modüller

---

## 9. Hemen başlanacak iş (Definition of "next")

**Sprint 0.1 + 0.2 birlikte** en yüksek değerli ilk adımdır:

1. Vite + React 19 + TS + Tailwind 4 projesini kur.
2. Şartname §6.2 renk token'larını ve tipografiyi tema olarak tanımla.
3. AppShell (Topbar + Footer) ve temel UI primitive'lerini yaz.
4. Kabul edilen **ana sayfayı** referans görsele göre kur:
   editoryal giriş + dikey fotoğraf seçkisi + hızlı erişim modülleri +
   öne çıkan fotoğraflar + popüler makaleler bölümleri.
5. Route iskeletini (§20 URL yapısı) placeholder sayfalarla kur.
6. Lint/test/CI'yı yeşile al, commit + push.

Bu, gözle doğrulanabilir (referans görselle karşılaştırılabilir) ve sonraki
tüm fazların üstüne oturacağı temeli oluşturur.

---

## 10. Riskler ve erken kararlar

| Risk / Karar | Not |
|---|---|
| **StageHub fork mu, temiz kurulum mu?** | Faz 0'ın ilk kararı. Repo boş → temiz kurulum varsayılan; fork istenirse repo eklenir. |
| **Object storage sağlayıcısı** (R2/B2/S3) | Adapter sayesinde ertelenebilir; maliyet senaryosu §10.7'de kullanıcı başına 2–3 GB üst sınır. |
| **Ödeme sağlayıcısı** (iyzico/Stripe/PayTR?) | TR pazarı → yerel sağlayıcı gerekebilir; `PaymentProvider` ile soyutlanır. |
| **Işık kirliliği veri lisansı** | Kullanım/atıf/cache hakları kod yazmadan doğrulanır (§14.1). |
| **Efemeris kütüphanesi** | Deterministik hesaplar (Ay fazı, transit, FOV) dış servise değil yerel kütüphaneye. |
| **Görsel worker altyapısı** | Edge Function değil ayrı container/worker; erken PoC gerekir. |

---

*Bu plan yaşayan bir belgedir; her faz sonunda gözden geçirilir ve güncellenir.*

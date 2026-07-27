# Astrohub

Türkiye'nin astronomi, astrofotoğrafçılık, gözlem etkinlikleri, karanlık
gökyüzü ve astrocamping platformu.

Astrohub; astrofotoğrafları teknik çekim verileriyle (hedef, setup, ekipman,
filtreler, kalibrasyon, lokasyon, gökyüzü koşulları) birlikte ilişkilendirerek
arşivleyen; Türkiye astronomi etkinliklerini merkezi bir takvimde toplayan;
ışık kirliliği ve astrocamping haritası, ekipman veritabanı, eğitim merkezi ve
ikinci el pazaryeri sunan bir topluluk portalıdır.

## Dokümantasyon

- **[Ürün / UI / Teknik Şartname](./docs/ASTROHUB_PRODUCT_UI_TECHNICAL_SPEC.md)** — onaylanan tam şartname
- **[Geliştirme Planı ve Yol Haritası](./docs/GELISTIRME-PLANI.md)** — fazlar, sprintler, mimari ilkeler

## Öne çıkan kararlar

- Tek ücretli üyelik paketi (aylık/yıllık aynı haklar)
- Kullanıcı başına en fazla 50 aktif yayımlanmış astrofotoğraf
- Koyu, editoryal ana sayfa — dashboard değil
- EXIF sunucu tarafında okunur; GPS varsayılan gizli; orijinal medya public değil
- Büyük medya için S3 uyumlu object storage + CDN (adapter arkasında)
- Türkiye astronomi etkinlikleri merkezi modül

## Teknoloji yığını

React 19 · TypeScript · Vite · Tailwind CSS 4 · Radix/shadcn · React Router ·
TanStack Query · Supabase (Auth / PostgreSQL + PostGIS / RLS / Edge Functions) ·
Leaflet · PWA

## Geliştirme

```bash
npm install          # bağımlılıklar
npm run dev          # geliştirme sunucusu (http://localhost:5173)
npm run build        # üretim derlemesi
npm run build:preview # tek dosya önizleme (dist-preview/index.html)
npm run typecheck    # TypeScript kontrolü
npm run lint         # ESLint
npm test             # Vitest
```

### Tek dosya önizleme

`npm run build:preview`, uygulamayı tüm JS/CSS gömülü **tek bir HTML dosyası**
olarak üretir (`dist-preview/index.html`). Sunucu gerektirmez; doğrudan tarayıcıda
açılır ve dış istek yapmadığı için katı CSP altında da çalışır — tasarım/akış
gözden geçirmelerini paylaşmak için kullanılır.

Bu derlemede router `hash` modundadır (`VITE_ROUTER_MODE=hash`), çünkü sunucusuz
tek dosyada history API tabanlı derin bağlantılar çözülemez. Üretim derlemesi her
zaman normal (history) router ile çalışır.

## Durum

🚧 **Faz 0 — Temel platform.** Tamamlanan:

- ✅ Sprint 0.1 — Proje iskeleti (Vite + React 19 + TS + Tailwind 4),
  ESLint/Prettier, Vitest, CI, tasarım token'ları (§6.2)
- ✅ Sprint 0.2 — AppShell (Topbar/Footer/mobil nav), UI primitive'leri ve
  **kabul edilen ana sayfa** (referans tasarıma sadık, responsive, erişilebilir)
- ✅ Sprint 0.3 — Supabase istemcisi (graceful degradation), AuthContext,
  giriş/kayıt sayfaları (RHF + Zod), `ObjectStorageAdapter`, ilk iki migration
  (extensions + auth/profiles/membership + RLS), entitlement domain kuralları
- ✅ **FOV & Pixel Scale hesaplayıcı** (§7.12) — tam çalışan araç: optik
  matematiği (domain), hazır ekipman ön ayarları, canlı sonuç; backend gerekmez
- ✅ **Fotoğraf galerisi** (§7.2) — arama + tür/palet/şehir/sıralama filtreleri,
  entegrasyon rozetli kartlar, editör seçimi; filtre mantığı saf/test edilebilir
- ✅ **Fotoğraf detay sayfası** (§7.3) — geniş görüntüleyici, temel bilgi,
  5 sekmeli teknik veri (çekim/ekipman/pozlama tablosu/işleme/konum),
  AI beyanı ve konum gizliliği göstergeleri, benzer fotoğraf önerileri
- ✅ **UI iskeleti tamamlandı** — tüm ana modüller mock veriyle çalışır durumda:
  Etkinlikler (liste+detay, kaynak şeffaflığı), Hedef kataloğu (liste+detay,
  hedef→fotoğraf ilişkisi), Ekipman veritabanı, Gözlem noktaları (liste+detay),
  Eğitim merkezi, İkinci el, 6 adımlı yükleme sihirbazı, Üye paneli (kota
  göstergesi), Kullanıcı profili, Keşfet. 18 route duman testinden geçti.
- ⏭️ Sonraki — 3. parti bağlantılar: Supabase (auth/DB), object storage
  (fotoğraf pipeline), ödeme, harita tile'ları — hesaplar açılınca

Yol haritası için [GELISTIRME-PLANI.md](./docs/GELISTIRME-PLANI.md).

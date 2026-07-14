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
npm install       # bağımlılıklar
npm run dev       # geliştirme sunucusu (http://localhost:5173)
npm run build     # üretim derlemesi
npm run typecheck # TypeScript kontrolü
npm run lint      # ESLint
npm test          # Vitest
```

## Durum

🚧 **Faz 0 — Temel platform.** Tamamlanan:

- ✅ Sprint 0.1 — Proje iskeleti (Vite + React 19 + TS + Tailwind 4),
  ESLint/Prettier, Vitest, CI, tasarım token'ları (§6.2)
- ✅ Sprint 0.2 — AppShell (Topbar/Footer/mobil nav), UI primitive'leri ve
  **kabul edilen ana sayfa** (referans tasarıma sadık, responsive, erişilebilir)
- ✅ Sprint 0.3 — Supabase istemcisi (graceful degradation), AuthContext,
  giriş/kayıt sayfaları (RHF + Zod), `ObjectStorageAdapter`, ilk iki migration
  (extensions + auth/profiles/membership + RLS), entitlement domain kuralları
- ⏭️ Sonraki — Faz 1: üyelik/ödeme lifecycle, fotoğraf pipeline ve kota

Yol haritası için [GELISTIRME-PLANI.md](./docs/GELISTIRME-PLANI.md).

# Faz 0 — Baseline ölçümü

Bütün sayılar ÖLÇÜLDÜ; hiçbiri tahmin değil. Ölçüm tarihi commit
geçmişinden okunabilir (bu dosyanın eklendiği commit).

## Teknoloji yığını (tespit edildi, varsayılmadı)

| | |
|---|---|
| Çatı | React 19 + Vite 6 + TypeScript 5.7 |
| Yönlendirme | react-router (65 rota tanımı) |
| Veri | @supabase/supabase-js 2.110, @tanstack/react-query |
| Test | Vitest 4.1 + Testing Library; ayrıca Playwright tabanlı E2E |
| Paket yöneticisi | npm (Node 22.x, `engines` ile sabit) |
| Dağıtım | Vercel (`vercel.json`: framework, buildCommand, outputDirectory, rewrites, headers) |
| Edge fonksiyonları | `meteoblue`, `plate-solve`, `plate-solve-poll` |
| Modüller | admin, articles, auth, calculators, city, clubs, discover, equipment, events, forum, home, location, marketplace, news, observing-sites, panel, photos, preview-editor, privacy, profile, radio, search, setups, sky, static, targets, theme, tv, upload, weather |

## Kalite kapısı baseline'ı

`npm run test:all` zinciri: typecheck → lint → test → build → rewrites →
csp → budgets → preview build → preview → a11y → e2e.

| Ölçüm | Değer |
|---|---|
| Birim/entegrasyon testi | **1226 geçti** (103 dosya) |
| E2E | **26 senaryo**, sayfa hatası yok |
| İlk rota JS | **183.7 kB gzip** (bütçe 200) |
| İlk rota CSS | **13.1 kB gzip** (bütçe 25) |
| Prerender | **421/421 rota** statik HTML |
| CSP | 14 yönerge, **7 rotada sıfır ihlal** |
| Erişilebilirlik | 5 rota, adsız ikon yok, hedefler ≥24px (ikon ≥44px) |

## Supabase baseline'ı (canlı proje `eoqggvosegjbburyuyba`)

| Ölçüm | Değer |
|---|---|
| `public` tablo | 41 |
| RLS açık tablo | 40 / 41 (`spatial_ref_sys` PostGIS'e ait, açılamıyor) |
| Politika | 97 |
| Storage kovası | 4 (`photos`, `photo-originals`, `radio`, `listings`) |
| `app` şeması yardımcı fonksiyon | 18 |
| Migration | 38 dosya (0001–0039, 0034 atlanmış) |
| Kayıtlı kullanıcı | 1 |

## Secret durumu

`.env` yerel ve `.gitignore`da; depoda `.env.example` şablonu var.
Bundle'da yalnızca `VITE_SUPABASE_URL` ve **publishable** anahtar
bulunuyor — `service_role` hiçbir istemci paketinde yok (arama ile
doğrulandı). Bu rapora hiçbir secret değeri yazılmadı.

## Sürüm farkı (repo ↔ canlı site)

Karşılaştırma **yapılamadı**: kum havuzunda tarayıcının dış çıkışı
kesik. `https://www.astrohub.com.tr` üzerinde davranış doğrulaması
`IMPLEMENTED_BLOCKED_EXTERNAL` sayılmalı. Repo tarafındaki davranış,
canlı Supabase verisine karşı yerel derlemeyle doğrulandı (galeri ve
fotoğraf detayı gerçek kaydı çiziyor).

## Harici erişim gerektiren maddeler (bu turda kapatılamaz)

| Konu | Eksik olan | Ulaşılabilecek en üst durum |
|---|---|---|
| AstroHub Radyo canlı yayın | Icecast/VPS erişimi | IMPLEMENTED_BLOCKED_EXTERNAL |
| AstroHub TV | YouTube kanal + OAuth | IMPLEMENTED_BLOCKED_EXTERNAL |
| Premium ödeme | Ödeme sağlayıcısı hesabı | IMPLEMENTED_DISABLED |
| Analitik/monitoring | Hesap ve DSN | IMPLEMENTED_BLOCKED_EXTERNAL |
| Production deployment | Vercel dağıtım yetkisi | IMPLEMENTED_BLOCKED_EXTERNAL |
| `spatial_ref_sys` yazma yetkisi | `supabase_admin` (destek) | Bilinen kabul (0006'da yazılı) |

## Plan limitleri

Supabase Pro ve Vercel plan limitleri **resmî belgelerden
doğrulanamadı** (kum havuzunda dış tarayıcı erişimi kesik). Bu yüzden
kodda hiçbir yere sabit fiyat/kota varsayımı YAZILMADI; kota değerleri
veritabanındaki `app.photo_limit()` üzerinden yönetiliyor ve tek
kaynaktan okunuyor.

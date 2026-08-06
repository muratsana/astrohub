# FAZ 0 — KEŞİF RAPORU

**Belge:** `ASTROHUB_ADMIN_REWRITE.md` v1.0 · **Tarih:** 06.08.2026
**Kapsam:** Görev 0.1 (kod haritası), 0.2 (admin envanteri ve yıkım planı), 0.3 (şema doğrulaması)
**Durum:** Faz 1'e geçmek için Murat onayı bekleniyor (belge §0.1, §2 kabul kriteri).

> **Önce en kritik iki madde:**
>
> 1. **Belge yanlış bir yığın varsayıyor.** Astrohub Next.js değil; **Vite 6 + React Router 8 tek sayfa uygulaması**. Sunucu tarafı çalışma zamanı yok: middleware yok, server action yok, route handler yok, `service_role` çalıştıracak bir yer yok. Belgedeki en az yedi kabul kriteri bu hâliyle uygulanamaz — §4'te her biri için karşılık öneriyorum.
> 2. **Canlıda gerçek bir güvenlik açığı var.** `public.spatial_ref_sys` üzerinde RLS kapalı **ve `anon` rolüne INSERT/UPDATE/DELETE/TRUNCATE verilmiş.** Belge (T6) "salt-okunur katalogdur, risk oluşturmaz" diyordu; ölçüm bunun aksini gösteriyor. Ayrıntı ve düzeltme önerisi §3.3'te.

---

## 1. GÖREV 0.1 — KOD HARİTASI

### 1.1. Yığın ve sürümler

| Alan | Gerçek durum | Belgenin varsaydığı |
|---|---|---|
| Çatı | **Vite 6.4 + React 19 + React Router 8** (SPA, `createBrowserRouter`) | Next.js + App Router |
| Dil/derleme | TypeScript 5.7, `tsc -b` + Vite | — |
| Stil | **Tailwind CSS v4** (`@theme` değişkenleri, `src/index.css`) | Tailwind (sürüm belirtilmemiş) |
| Veri katmanı | `@supabase/supabase-js` 2.110 (tarayıcıda), TanStack Query | `@supabase/ssr` |
| Sunucu | **Yok.** Vercel'de statik dosya + rewrite. `vercel.json` 183 rewrite kuralı, `scripts/vercel-rewrites.mjs` ile rota ağacından ÜRETİLİYOR | middleware + server actions |
| Ön-derleme | `npm run prerender` — `src/entry-prerender.tsx` ile SSG; çıktı statik HTML | ISR/SSR |
| Sunucu tarafı iş | Yalnızca **6 Supabase Edge Function**: `meteoblue`, `plate-solve`, `plate-solve-poll`, `podcast-rss`, `radyo-durum`, `youtube` | — |

**Sonuç:** Belgenin "middleware", "server action", "route handler", "`service_role` ile sunucu tarafı okuma" varsayan bütün maddeleri **Edge Function** üzerinden yeniden tasarlanmak zorunda. Bu bir engel değil ama iş yükünü ve mimariyi değiştirir; §4'te madde madde.

### 1.2. Rota haritası

- `src/app/router.tsx` — **103 rota tanımı**, tek dosya, hepsi `lazy` + `named()` sarmalı.
- Render kipi tek tip: **istemci tarafı SPA**; `scripts/prerender.mjs` seçili rotaları derleme anında HTML'e basıyor. Rota bazında SSR/ISR ayrımı yok.
- `vercel.json` rewrite'ları rota ağacından üretiliyor — **elle düzenlenmez**, `npm run check:rewrites` kapısı bunu doğruluyor.
- İçerik rotalarında ikilik (T2 doğrulandı):
  - `yazilar` → liste
  - `yazilar/drizzle-rehberi`, `yazilar/snr-rehberi`, `yazilar/kutup-hizalamasi` → derleme zamanı üretilen, özel bileşenli **uzun form rehberler**
  - `yazi/:slug` → `content_entries` + tohum diziden beslenen **statik yazı detayı**
  - `yazi/drizzle-rehberi`, `yazi/snr-rehberi`, `yazi/kutup-hizalamasi` → rehberlere **istemci tarafı yönlendirme** (`<Navigate replace>`; HTTP 301 değil)

### 1.3. Yönetim yüzeyleri — iki ayrı "panel" var

| Yol | Ne | Dosya |
|---|---|---|
| `/admin/*` | **Yönetici paneli** — 11 bölüm, 4 menü grubu | `src/features/admin/AdminPage.tsx` (+ 25 kontrol bileşeni) |
| `/panel`, `/panel/:section` | **Üyenin kendi paneli** — fotoğrafları, ilanları, kotası, jüri oyu | `src/features/panel/PanelPage.tsx` |

> **SAPMA-1:** Belge §3.1 admin kökü olarak `/panel` öneriyor. **`/panel` doluk** ve üyeye ait. Admin kökü `/admin` olarak korunmalı (belge §3.1 notu buna zaten izin veriyor).

`src/features/admin/` toplam **14.103 satır**, 25 bileşen + 12 servis modülü + 11 test dosyası.

### 1.4. Supabase istemci kurulumu

- `src/services/supabase/client.ts` — tek `getSupabase()`; anon anahtar, tarayıcı oturumu.
- Auth bağlamı `src/features/auth/AuthContext.tsx`; OAuth callback rotası istemci tarafında.
- **`service_role` anahtarı kod tabanında hiç yok** ve olmamalı (SPA'da her sır istemciye gider).
- Roller `src/features/admin/useRoles.ts` üzerinden `user_roles` tablosundan okunuyor — JWT metadata'sından değil. Dosyanın başlığı bunun bir güvenlik sınırı olmadığını, asıl sınırın RLS olduğunu açıkça yazıyor. **Belgedeki §0.5 / §3.2 ilkesiyle bire bir uyumlu.**

### 1.5. Depolama

Supabase Storage; kod tabanında geçen kovalar: `photos`, `listings`, `club-photos`, `avatars` (adaptör: `src/services/object-storage/supabaseAdapter.ts`). Yükleme akışı `src/services/photos/upload.ts` ve `src/features/admin/clubsAdmin.ts` üzerinden. R2 yok.

### 1.6. `content_entries.body_blocks` — belgenin sandığından çok daha ileride

| Belgenin sorusu | Bulgu |
|---|---|
| `body_blocks` okuyan/yazan kod var mı? | **Var.** `src/services/content/entries.ts` okuma+yazma yolu; `ContentBlocksSchema` ile doğrulama; `body text[]` alanı `blocksToParagraphs()` ile geriye dönük dolduruluyor |
| Blok editörü var mı? | **Var.** `src/features/admin/ContentControl.tsx` — blok listesi düzenleyici + `BlockRenderer` ile canlı önizleme |
| İçe aktarma var mı? | **Var.** `src/features/admin/contentImport.ts` — HTML (DOMParser + beyaz liste), **DOCX (mammoth)**, **PDF (pdf.js metin çıkarımı)**; uyarı listesi üretiyor |
| Önizleme ile canlı sayfa aynı bileşeni mi kullanıyor? | **Evet.** İkisi de `src/components/content/BlockRenderer.tsx` |
| Blok modeli | `src/domain/content/blocks.ts` — `heading, paragraph, list, quote, callout` |

Uzun form rehberlerin (SNR, drizzle, kutup) mimarisi ayrı: kaynak paket `docs/` altında, gövde **derleme zamanında** `content.generated.ts` dosyasına üretiliyor, widget'lar React bileşeni. Bu içerikler `content_entries`e taşınmaya uygun **değil** ve taşınmamalı; belge §2.7'nin "özel bileşen bloğu" fikri tam olarak buraya karşılık geliyor.

### 1.7. Kullanıcı adı üretimi (T4 doğrulandı)

`auth.users` üzerindeki tetikleyici `app.handle_new_user()`:

```sql
username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12)
```

- Tip: `citext` (büyük/küçük harf duyarsız), `NOT NULL`.
- `display_name` OAuth metadata'sından (`full_name`/`name`/`given_name`) alınıyor.
- `username_customized_at` **yok** → Faz 3'ün anahtarı henüz mevcut değil. Doğrulandı.

### 1.8. Roller ve `app.` yardımcıları

`app.app_role` enum — **6 değer** (belge "en az admin ve content_editor" diyordu):

```
member · verified_organizer · club_manager · content_editor · moderator · admin
```

`app` şemasında **69 fonksiyon**. Yetkiyle doğrudan ilgili olanlar: `app.has_role(app_role)`, `app.is_admin()`, `app.is_active_juror(uuid)`, `app.membership_tier(uuid)`, `app.consume_rate_limit(text,int,int)`. Hepsi `SECURITY DEFINER` + `search_path` sabitlenmiş. **`app.is_account_active()` yok** — Görev 1.1'de eklenecek.

---

## 2. GÖREV 0.2 — ADMİN ENVANTERİ VE YIKIM PLANI

> **SAPMA-2:** Belge mevcut paneli "kaotik ortam" olarak niteliyor ve sıfırdan yeniden yazım istiyor. Envanter bunu doğrulamıyor: 11 bölümün **hiçbiri boş ya da kırık değil**, hepsi gerçek tablolara bağlı, 11 test dosyası var. "Yeniden yazım" burada çalışan ve test edilmiş 14 bin satırı atmak demek. Aşağıdaki tabloda her bölüm için gerçekçi karşılığı öneriyorum; **onayınız olursa** belgedeki "yeniden yazım" hedefi "genişletme + eksik yüzeylerin eklenmesi" olarak revize edilir.

| Yol | İşlev | Durum | Bağlı tablolar | Öneri |
|---|---|---|---|---|
| `/admin` | Genel bakış | Çalışıyor | — | **Genişlet** — belge §1.2'deki gerçek sayı kartları + son 20 audit yok |
| `/admin/moderation` | Moderasyon kuyruğu | Çalışıyor | `moderation_queue` | **Genişlet** — atama (`assigned_to`), hedef önizleme, arşiv görünümü eksik (Görev 1.5) |
| `/admin/content` | İçerik ve kayıtlar | Çalışıyor | `content_entries`, `records` | **Genişlet** — Faz 2'nin çekirdeği burada; §5 kararı gerekiyor |
| `/admin/home` | Ana sayfa modülleri | Çalışıyor | `home_modules`, `hero_slides`, `featured_content` | **Koru** |
| `/admin/forum` | Forum kategorileri | Çalışıyor | `forum_categories` | **Koru** |
| `/admin/users` | Kullanıcı yönetimi | Çalışıyor (sınırlı) | `profiles`, `user_roles`, `memberships` | **Yeniden yaz** — liste sayfalama/filtre yok, durum yönetimi yok (T3), detay sayfası yok (Görev 1.3/1.4) |
| `/admin/broadcast` | Yayın merkezi | Çalışıyor | `tv_*`, `radio_*`, `podcast*` | **Koru** |
| `/admin/notifications` | Bildirim/hatırlatma | Çalışıyor | `reminders`, `notifications` | **Koru** |
| `/admin/site-settings` | Site yapısı | Çalışıyor | `app_settings`, `nav_links`, `feature_flags`, `setting_history` | **Koru** (belge §1.1 "şema değişmez" diyor, katılıyorum) |
| `/admin/catalog` | Katalog ve araçlar | Çalışıyor | `equipment_*`, `astro_filter_*`, `celestial_objects` | **Koru** |
| `/admin/audit` | Denetim kaydı | Çalışıyor (sınırlı) | `audit_logs` | **Genişlet** — filtre ve jsonb okunur gösterim yok (Görev 1.6) |

**Yıkım planı:** Bu turda **silinecek dosya yok.** Yıkım ancak yeni yüzey aynı işi yaptıktan sonra, bölüm bölüm yapılır. Bu tablo onaylanmadan tek satır silinmeyecek (belge §2, Görev 0.2 kuralı).

### 2.1. Audit kapsaması — gerçek bir eksik

Belge §0.6 "panelden yapılan her yazma işlemi `audit_logs`'a düşer, istisna yok" diyor. Ölçüm:

- `audit_logs` tablosunda **1 kayıt** var.
- Kod tabanında `audit_logs`'a yazan **yalnızca 2 dosya**: `src/features/admin/records.ts`, `src/features/admin/reminderAdmin.ts`.
- Yani rol atama, içerik yayımlama, site ayarı değişikliği, kulüp onayı gibi işlemler **audit'e düşmüyor**.

Bu, belgenin en doğru tespitlerinden biri ve Faz 1'in gerçek işi. Önerim: audit yazımını çağrı yerlerine dağıtmak yerine **veritabanı tetikleyicisiyle** yapmak — panel dışından gelen yazma da kaçamaz.

---

## 3. GÖREV 0.3 — ŞEMA DOĞRULAMASI

Canlı şema (`eoqggvosegjbburyuyba`) üzerinde doğrulandı. **95 public tablo**, **88 migration dosyası**.

### 3.1. Belgedeki §1.1 tablosunun doğrulaması

| Tablo | Belge | Ölçülen | Sonuç |
|---|---|---|---|
| `user_roles` | 2 kayıt | 2 | ✅ |
| `audit_logs` | Aktif, yalnızca-ekleme | 1 kayıt, 1 politika | ✅ |
| `moderation_queue` | Boş | 0 kayıt, 4 politika | ✅ |
| `hero_slides`/`nav_links`/`home_modules`/`feature_flags`/`app_settings`/`setting_history` | Dolu | `home_modules` 6; `app_settings` 7 anahtar (`announcement`, `billing`, `maintenance`, `quotas`, `reminder_defaults`, `seo_defaults`, `weather_provider`); `setting_history` 0 | ⚠️ kısmen — `setting_history` **boş** |
| `featured_content` | 9 kayıt | 9 | ✅ |
| `content_entries` | 0 kayıt | 0 | ✅ |
| `account_deletion_requests` / `account_export_logs` | Boş | 0 / 0 | ✅ |
| `profiles` | 6 | 6 (`auth.users` da 6) | ✅ |

### 3.2. Kritik tespitlerin doğrulaması

| # | Tespit | Sonuç |
|---|---|---|
| T1 | İçerikler kodda gömülü | ✅ **Doğru.** `src/features/articles/data.ts` (318 satır) ve `src/features/news/data.ts` (500 satır) tohum içerik taşıyor. **Ancak** okuma yolu zaten birleşik: `useNews`/`useArticles`, `mergeWithSeed()` ile DB kayıtlarını tohumun üstüne biniyor. Yani göç bir "yeniden yazım" değil, **veri taşıma** işi |
| T2 | İki yazı rotası | ✅ Doğru — §1.2'de ayrıntılı |
| T3 | Yasaklama mekanizması yok | ✅ **Doğru.** `profiles`'ta `account_status`, `suspended_until`, `status_reason`, `admin_note`, `last_seen_at` **yok** |
| T4 | Kullanıcı adı akışı | ✅ Doğru — §1.7 |
| T5 | Zengin içerik tipleri dağınık | ✅ Doğru — `events`, `clubs`, `listings`, `observing_sites`, `celestial_objects` uzun metinleri düz `text` |
| T6 | PostGIS uyarısı | ❌ **SAPMA — durum belgede yazandan kötü.** Bkz. §3.3 |

### 3.3. SAPMA-3 (P0 güvenlik) — `spatial_ref_sys` yazılabilir

Belge T6: *"salt-okunur katalogdur ve normal koşulda risk oluşturmaz, ancak anon rolün bu tabloya yazma yetkisi olmadığı doğrulanacaktır."*

Doğruladım; **yetki var**:

| Rol | Ayrıcalıklar |
|---|---|
| `anon` | `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` |
| `authenticated` | aynısı |

RLS de kapalı (`relrowsecurity = false`). Yani **kimliksiz bir istemci PostgREST üzerinden bu tabloyu değiştirebilir ya da `TRUNCATE` edebilir.** Tablo PostGIS'in koordinat sistemi kataloğu; boşalırsa coğrafi dönüşümler ve `observing_sites`/`events` konum sorguları bozulur.

**Önerilen düzeltme (migration, onayınıza sunuluyor — belge §0.4):**

```sql
revoke insert, update, delete, truncate on public.spatial_ref_sys from anon, authenticated;
```

`SELECT` korunuyor (PostGIS'in kendi çalışması için gerekli). Geri alınabilir. **Uygulamadım — onay bekliyorum.**

### 3.4. Diğer şema notları

- `edge_rate_limits`: RLS açık, **0 politika** → tabloya yalnızca `SECURITY DEFINER` fonksiyon (`app.consume_rate_limit`) erişiyor. Kasıtlı ve doğru.
- `youtube_connection`: RLS açık, 0 politika — **kasıtlı**. Migration `0055_tv_ve_youtube.sql` yorumu: yenileme jetonu yalnızca `service_role` tarafından okunuyor, yöneticiye bile açılmıyor; panel bağlantıyı `youtube_connection_status` görünümünden görüyor. Bulgu değil, doğru tasarım.
- `content_entries.status` bir `text` alanı, varsayılan `'taslak'`. Belge §2.1 beş değerli bir durum makinesi istiyor (`taslak|incelemede|zamanlanmis|yayinda|arsiv`); mevcut `publish_status` enum'u (`draft|review|published`) İNGİLİZCE ve başka tablolarda kullanılıyor. **Karar gerekiyor:** yeni Türkçe enum mı, mevcut enum'a geçiş mi.

---

## 4. BELGENİN UYGULANAMAZ MADDELERİ VE ÖNERİLEN KARŞILIKLARI

Hepsi tek bir kökten geliyor: **sunucu tarafı çalışma zamanı yok.**

| # | Belgedeki madde | Neden uygulanamaz | Önerilen karşılık |
|---|---|---|---|
| U1 | "Middleware: rolü olmayan kullanıcıya 404" (1.2) | Middleware yok | Rota düzeyinde guard + **RLS**. Panelin varlığı zaten sızıyor (rota tablosu istemcide); "sızdırma" hedefi SPA'da karşılanamaz — kabul kriteri revize edilmeli |
| U2 | "Middleware `/hosgeldin`e yönlendirir" (3.2) | Aynı | Uygulama kökünde guard bileşeni; adres çubuğuna URL yazma da yakalanır (router seviyesinde), ama **RLS ile de desteklenmeli**: `username_customized_at IS NULL` iken yazma politikaları reddetsin |
| U3 | "E-posta service-role ile sunucuda okunur" (1.3/1.4) | `service_role` çalıştıracak yer yok | **Yeni Edge Function** (`admin-users`): rolü JWT'den doğrular, `auth.users`'ı service-role ile okur, yalnızca gerekli alanı döner. Alternatif: e-postayı hiç göstermemek (mevcut bilinçli karar — bkz. SAPMA-4) |
| U4 | "Şifre sıfırlama / doğrulama e-postası gönder" (1.4) | Aynı | Aynı Edge Function |
| U5 | "İmzalı önizleme URL'i (token süreli)" (2.3) | Aynı | Edge Function ile imzalı token; ya da yalnız rol sahibine açık istemci önizlemesi |
| U6 | "Eski URL'ler 301 verir" (2.7/3.4) | SPA istemci tarafında yönlendiriyor (200 + `history.replace`) | `vercel.json` **redirects** bloğu — gerçek 301 verir. `scripts/vercel-rewrites.mjs` üreticisine eklenmeli (dosya elle düzenlenmiyor) |
| U7 | "Panel rotaları robots + noindex" (8) | Yapılabilir | `PageMeta` ile `noindex`; `robots.txt` üreticisine `/admin` eklenmeli |

**SAPMA-4 (karar gerekiyor):** `src/features/admin/users.ts` başlığında, e-postanın panelde **bilinçli olarak gösterilmediği** ve bunun "bir eksik değil, tasarım" olduğu yazılı. Belge §1.3/§1.4 ise e-postayı liste kolonu ve detay alanı olarak istiyor. İkisi aynı anda doğru olamaz. Önerim: **e-posta yalnızca kullanıcı detayında, tek tek, "e-postayı göster" aksiyonuyla ve her gösterim `audit_logs`'a `user.email_view` olarak düşerek** açılsın. Böylece KVKK gereği izlenebilir olur ve liste ekranından toplu sızma yolu açılmaz.

**SAPMA-5 (karar gerekiyor):** Belge §5.1-K1 TipTap'ı bağlayıcı sayıyor. Mevcut sistemde JSON blok modeli, editör, üç formatlı içe aktarma ve **önizleme = canlı sayfa** güvencesi zaten çalışıyor (§1.6). TipTap eklemek ikinci bir belge modeli (ProseMirror JSON) getirir; iki model arasında çevirici yazmak ya da mevcut içerikleri göç ettirmek gerekir. İki seçenek:
- **(a) Mevcut modeli genişlet:** tablo, görsel, video, kod, PDF gömme, özel bileşen bloğu eklenir; editör "Word benzeri" araç çubuğuna kavuşturulur. Daha az risk, daha az iş.
- **(b) TipTap'a geç:** belgeye harfiyen uyulur; blok şeması, `BlockRenderer`, içe aktarma ve mevcut testler yeniden yazılır.

Ölçtüğüm iş farkı yaklaşık üç katı. **Önerim (a)**; kararı size bırakıyorum.

---

## 5. AÇIK SORULAR (Murat kararı gerekiyor)

1. **SAPMA-3:** `spatial_ref_sys` yetki kısıtlama migration'ı uygulansın mı? (P0, tek satır, geri alınabilir)
2. **SAPMA-2:** Admin paneli "sıfırdan yeniden yazım" mı, "genişletme" mi? (§2 tablosu)
3. **SAPMA-4:** E-posta panelde gösterilsin mi? Gösterilecekse §4'teki "tek tek + audit" modeli kabul mü?
4. **SAPMA-5:** Editör (a) mevcut modeli genişlet mi, (b) TipTap'a geç mi?
5. **§3.4:** İçerik durum makinesi Türkçe yeni enum mu, mevcut `publish_status` enum'una hizalama mı?
6. **U3/U4/U5:** Admin Edge Function'ı yazılsın mı? (e-posta okuma, şifre sıfırlama, imzalı önizleme — üçü tek fonksiyonda)
7. **Faz 3 geriye dönük:** Mevcut 6 kullanıcının `username_customized_at` değeri NULL mı yapılsın (hepsi hoş geldin akışına girer) yoksa yalnızca `user_xxx` desenli olanlar mı?

---

## 6. SONRAKİ ADIM

Belge §2 kabul kriteri: *"DISCOVERY_REPORT.md üç bölümü de içerir; Murat onayı alınmadan Faz 1'e geçilmez."*

Üç bölüm tamamlandı. **Faz 1'e (Görev 1.1 — hesap durumu şeması) başlamak için onayınızı ve §5'teki yedi sorunun cevabını bekliyorum.**

Faz 1'e girildiğinde ilk çıktı sırası: 1.1 migration taslağı (uygulanmadan önce özetiyle onaya sunulur) → 1.2 panel iskeleti/guard → 1.3 kullanıcı listesi.

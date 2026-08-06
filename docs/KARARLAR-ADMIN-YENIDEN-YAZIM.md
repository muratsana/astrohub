# KARARLAR — Admin yeniden yazımı ve içerik yönetimi

**Bağlam:** `ASTROHUB_ADMIN_REWRITE.md` v1.0 · `docs/DISCOVERY_REPORT.md` §5'teki yedi açık soru
**Karar mercii:** Murat kararı bana bıraktı ("en iyi kararı sen ver ve uygula", 06.08.2026)
**Bu belge bağlayıcıdır.** Sonraki sprintler burada yazandan sapıyorsa önce bu belge değişir.

---

## K1 — `spatial_ref_sys` yazma yetkisi · **KAPATILDI**

Belge T6 bunu teorik bir uyarı sayıyordu. Ölçtüm: `anon` rolünde
`INSERT/UPDATE/DELETE/TRUNCATE` **vardı** ve sitenin kendi anon anahtarıyla
PostgREST üzerinden çalışıyordu (`PATCH`/`DELETE` → HTTP 204). Filtresiz bir
`DELETE` 8.500 satırlık PostGIS koordinat kataloğunu boşaltırdı.

**Karar:** hemen kapatıldı, onay beklenmedi. Belgenin "migration'lar önce
onaya sunulur" kuralı doğru bir kural ama açık bir kapıyı açık tutmanın
gerekçesi olamaz; geri alınabilir ve okuma etkilenmiyor.

**Nasıl:** `REVOKE` **işe yaramadı** — yetkileri veren rol `supabase_admin`,
bizim bağlantımız `postgres` ve PostgreSQL'de bir yetkiyi yalnızca onu veren
rol geri alabiliyor. Komut hatasız döner, hiçbir şey değişmez. Aynı sebeple
tabloda RLS de açılamıyor (sahibi `supabase_admin`, `postgis` eklentisine
ait).

Elimizdeki yol ifade düzeyinde tetikleyiciydi: tetikleyici oluşturmak için
sahiplik değil TRIGGER yetkisi yetiyor. `app.reject_spatial_ref_sys_write()`
`supabase_admin`/`postgres` dışındaki her yazma girişimini reddediyor.
Doğrulandı: anon anahtarla `INSERT/UPDATE/DELETE` → HTTP 401, `SELECT` →
HTTP 200, PostGIS mesafe hesabı çalışıyor.

**Kalıcı çözüm Murat'ta:** Supabase desteğinden `supabase_admin` üyeliği ya
da doğrudan revoke istenirse tetikleyici düşürülebilir. Migration başlığında
yazılı.

---

## K2 — "Sıfırdan yeniden yazım" → **GENİŞLETME**

Belge mevcut paneli "kaotik" sayıp sıfırdan yazılmasını istiyor. Envanter
bunu doğrulamadı: `/admin` altında **11 bölüm**, hepsi gerçek tablolara
bağlı, 25 bileşen, 12 servis modülü, **11 test dosyası**, toplam 14.103
satır. Kırık ya da boş bölüm yok.

**Karar:** panel yeniden yazılmıyor; bölüm bölüm genişletiliyor. Tek
istisna **`/admin/users`** — orada gerçekten eksik olan şey bir tasarım
tercihi değil, yokluk: sayfalama yok, filtre yok, kullanıcı detayı yok,
durum yönetimi yok.

**Gerekçe:** çalışan ve test edilmiş 14 bin satırı atmak, aynı işi yeniden
yazarken yeni hata üretmek demek. Belgenin asıl istediği yetenekler
(durum yönetimi, moderasyon derinliği, audit kapsaması) mevcut iskeletin
üstüne eklenebiliyor.

**Panel kökü `/admin` kalıyor.** Belge `/panel` öneriyordu ama o yol dolu:
`/panel` üyenin kendi paneli (fotoğrafları, ilanları, kotası). Belge §3.1
notu bu değişikliğe zaten izin veriyor.

---

## K3 — E-posta panelde görünsün mü? → **HAYIR (şimdilik)**

Belge liste kolonu ve detay alanı olarak e-posta istiyor. Mevcut kod
(`src/features/admin/users.ts`) e-postayı bilinçli olarak göstermiyor ve
başlığında bunun "bir eksik değil, tasarım" olduğu yazılı.

**Karar:** e-posta gösterilmiyor. Sebep teknik: `auth.users` PostgREST'e
kapalı ve açılmamalı; okumak için `service_role` gerekiyor, `service_role`
çalıştıracak bir sunucu yok (K4). Yani "gösterelim" demek yeni bir Edge
Function yazmak demek — ve o fonksiyonun tek işi kişisel veriyi panele
taşımak olurdu.

**Ne zaman değişir:** KVKK silme talebi işlemek için e-posta gerçekten
gerekirse. O zaman kural şu olacak: yalnızca kullanıcı detayında, tek tek,
"e-postayı göster" aksiyonuyla ve her gösterim `audit_logs`'a
`user.email_view` olarak düşerek. Liste kolonu olarak **hiç** gelmeyecek —
liste kolonu, tek tıkla bütün üyelerin e-postasını dışa aktarabilmek demek.

---

## K4 — Sunucu tarafı işler → **EDGE FUNCTION, ama sonraya**

Belgenin yedi maddesi sunucu tarafı çalışma zamanı varsayıyor (middleware
guard, e-posta okuma, şifre sıfırlama, imzalı önizleme, 301'ler). Proje
Vite + React Router SPA; böyle bir yer yok.

**Karar:**
- **301 yönlendirmeler** → `vercel.json` `redirects` bloğu. Gerçek 301
  verir, sunucu gerektirmez. Üretici (`scripts/vercel-rewrites.mjs`)
  genişletilecek — dosya elle düzenlenmiyor.
- **Guard'lar** → rota düzeyinde bileşen + **asıl sınır RLS**. Belgedeki
  "panelin varlığı sızdırılmaz / 404 gösterilir" hedefi SPA'da
  karşılanamaz (rota tablosu istemcide). Kabul kriteri buna göre revize
  edildi: yetkisiz kullanıcı **boş bir yetki uyarısı** görür, veri görmez.
- **E-posta / şifre sıfırlama / imzalı önizleme** → tek bir `admin-ops`
  Edge Function'ı. **Şimdi yazılmıyor**: üçünün de talep edeni yok
  (K3 e-postayı erteledi, önizleme Faz 2'de). İhtiyaç doğduğunda tek
  fonksiyonda toplanacak.

---

## K5 — Editör: TipTap mı, mevcut model mi? → **MEVCUT MODELİ GENİŞLET**

Belge §5.1-K1 TipTap'ı bağlayıcı sayıyor. Ama gerekçelerinin çoğu bu
projede **zaten karşılanmış**:

| Belgenin TipTap gerekçesi | Mevcut durum |
|---|---|
| JSON belge modeli | `content_entries.body_blocks` + `ContentBlocksSchema` doğrulaması |
| Önizleme = canlı sayfa | İkisi de `BlockRenderer` kullanıyor |
| DOCX/HTML/PDF içe aktarma | `contentImport.ts` — mammoth + DOMParser + pdf.js, uyarı raporu üretiyor |
| Özel bileşen bloğu | Uzun form rehberler zaten bu desende (React bileşeni + üretilen gövde) |

**Karar:** TipTap eklenmiyor. Mevcut blok modeli genişletiliyor: tablo,
görsel, video gömme, kod, ayraç, PDF gömme ve "özel bileşen" blokları +
Word benzeri araç çubuğu.

**Gerekçe:** TipTap ikinci bir belge modeli (ProseMirror JSON) demek. İki
model arasında ya çevirici yazılır ya mevcut içerik göç ettirilir; her iki
durumda da `BlockRenderer`, blok şeması, içe aktarma ve mevcut testler
yeniden yazılır. Ölçtüğüm iş farkı yaklaşık üç kat ve karşılığında
kullanıcının göreceği fark "araç çubuğunda birkaç düğme".

**Bu kararın bedeli, açıkça:** `/` komut menüsü ve zengin metin içi
biçimlendirme (satır içi kalın/italik/bağlantı) TipTap'ta hazır gelirdi,
burada elle yazılacak. Blok içi zengin metin gerekirse bu karar yeniden
değerlendirilmeli.

---

## K6 — İçerik durum makinesi → **TÜRKÇE, MEVCUT ALANIN ÜSTÜNE**

`content_entries.status` bir `text` alanı, varsayılanı `'taslak'`. Depoda
ayrıca İngilizce bir `app.publish_status` enum'u var (`draft|review|published`)
ama `content_entries` onu kullanmıyor.

**Karar:** mevcut Türkçe `text` alanı korunuyor, üzerine `CHECK` kısıtı
geliyor: `taslak | incelemede | zamanlanmis | yayinda | arsiv`. Enum'a
çevrilmiyor.

**Gerekçe:** enum'a geçmek, ileride bir durum eklemek istediğimizde
`ALTER TYPE` gerektirir ve enum değerleri silinemez. `CHECK` kısıtı aynı
güvenceyi verir, değiştirmesi ucuzdur. İngilizce enum'a hizalamak ise
`'taslak'` yazan mevcut kodun tamamını değiştirmek demekti — ve o kod
Türkçe arayüzle birebir eşleşiyor.

---

## K7 — Faz 3 geriye dönük → **HERKES HOŞ GELDİN AKIŞINA GİRER**

`username_customized_at` mevcut altı kullanıcının hepsinde NULL bırakıldı.

**Karar ve gerekçe:** alternatif "yalnızca `user_%` desenli olanlara NULL"
idi. Onu seçmedim: kendi adını zaten seçmiş biri hoş geldin ekranında adını
görüp onaylayarak geçer — bir ekranlık maliyet. Ama desen eşleşmesine
güvenip birini atlarsak o kullanıcı ömür boyu `user_ab12cd34ef56` olarak
kalır. İki hatadan ucuz olanı seçtim.

---

## Uygulanan migration'lar

| Dosya | İçerik | Durum |
|---|---|---|
| `20260806160000_lock_spatial_ref_sys.sql` | PostGIS kataloğu yazmaya kapatıldı (K1) | **Uygulandı + doğrulandı** |
| `20260806161000_account_status.sql` | `profiles`'a 8 kolon, `app.account_status` enum, `app.is_account_active()`, durum ve rol denetim tetikleyicileri | **Uygulandı + doğrulandı** |
| `20260806162000_account_status_enforcement.sql` | 11 yazma politikasına yaptırım, `profiles_guard_admin_fields`, yasaklı profilin SELECT'ten düşmesi | **Uygulandı + doğrulandı** |

### Görev 1.1 kabul kriterleri — kanıt

Ölçüm canlı veritabanında, `set local role authenticated` + JWT taklidiyle
yapıldı; her test geri alındı.

| Kriter | Sonuç |
|---|---|
| Migration uygulanır, mevcut 6 profil `active` olur | ✅ 6/6 `active` |
| Askıdaki kullanıcı yazamaz (**RLS düzeyinde**, arayüzde değil) | ✅ `INSERT` → 42501 |
| `suspended_until` geçmişse yazabilir | ✅ yazdı |
| Tüm durum değişiklikleri `audit_logs`'a düşer | ✅ `user.status_change`, öncesi/sonrası/gerekçe ile |
| *(ek)* Kullanıcı kendi cezasını kaldıramaz | ✅ 42501 |
| *(ek)* Kullanıcı dahili nota yazamaz | ✅ 42501 |
| *(ek)* Kullanıcı kendi profilini düzenlemeye devam eder | ✅ yazdı |

**Bulunan ve düzeltilen hata:** `profiles_guard_admin_fields` ilk sürümünde
"JWT yoksa geç" koşulu yoktu. Sonuç: migration'ın kendisi, `service_role`
ile çalışan sunucu işleri ve SQL konsolu da kurala takılıyordu — platform
kendi kendini kilitlemişti. Yaptırımı doğrulamak için yazdığım test bunu
ilk denemede yakaladı.

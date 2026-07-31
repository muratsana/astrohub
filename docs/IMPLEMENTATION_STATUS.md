# AstroHub — Uygulama Durumu

> **Bu dosya oturumlar arası DEVAM NOKTASIDIR.** Otomatik devam
> tetikleyicisi (`trig_01FQHAyAR3FHuwNuyDGfC24e`, saatlik) önce bu dosyayı
> okuyup ilk `NOT_STARTED` / `PARTIAL` fazdan devam eder.
>
> Ana görev belgesi:
> `/root/.claude/uploads/82eb6655-3162-599e-957e-95785e4e3696/3a328626-astrohubmasterimplementationprompt.md`
> Bağlamı korumak için belgenin TAMAMI okunmaz; yalnızca çalışılan fazın
> satır aralığı okunur (aşağıdaki tabloda yazılı).

## Durum sözlüğü

Ana talimat §1.2 gereği yalnızca şu durumlar kullanılır ve hiçbiri özet
tabloda `DONE` ile birleştirilmez:

`DONE` · `IMPLEMENTED_DISABLED` · `IMPLEMENTED_BLOCKED_EXTERNAL` ·
`PARTIAL` · `FAILED` · `NOT_STARTED`

## Faz tablosu

| Faz | Konu | Belgedeki satır | Durum |
|---|---|---|---|
| 0 | Envanter, baseline, güvenli ortam | 102–135 | DONE |
| 1 | Veri modeli, Supabase güvenliği, merkezi yapılandırma | 136–257 | PARTIAL |
| 2 | Tek tasarım sistemi ve bütüncül arayüz | 258–355 | NOT_STARTED |
| 3 | Ana sayfa, navbar, hero, hava durumu | 356–461 | NOT_STARTED |
| 4 | Ortak arama, filtreleme, sıralama, görünüm | 462–548 | NOT_STARTED |
| 5 | Bildirim, mesajlaşma, sosyal aktivite | 549–632 | NOT_STARTED |
| 6 | Etkinlik takip ve hatırlatma | 633–682 | NOT_STARTED |
| 7 | Çalışan AstroHub Radyo | 683–832 | NOT_STARTED |
| 8 | AstroHub TV ve YouTube'a hazır altyapı | 833–922 | NOT_STARTED |
| 9 | Standart/Premium üyelik altyapısı | 923–1005 | NOT_STARTED |
| 10 | Admin panelinden kodsuz site yönetimi | 1006–1164 | NOT_STARTED |
| 11 | Zorunlu ürün modülleri | 1165–1349 | NOT_STARTED |
| 12 | Organik kullanıcı kazanımı | 1350–1419 | NOT_STARTED |
| 13 | Fotoğraf, Storage, medya mimarisi | 1420–1462 | NOT_STARTED |
| 14 | macOS, tarayıcı, responsive, erişilebilirlik | 1463–1528 | NOT_STARTED |
| 15 | Güvenlik, KVKK, telif, kötüye kullanım | 1529–1606 | NOT_STARTED |
| 16 | Performans, SEO, analitik, gözlemlenebilirlik | 1607–1690 | NOT_STARTED |
| 17 | Test stratejisi ve kabul kriterleri | 1691–… | NOT_STARTED |
| 18 | (belgenin sonu) | …–1956 | NOT_STARTED |

## Bilinen ortam kısıtları

- **Otomatik devam oturumlarında MCP araçları yok.** Tetikleyici
  oluşturulurken uyarı verildi: fırlatılan oturumlar `mcp__Supabase__*`
  taşımıyor. Migration'lar bu yüzden dosyaya yazılıp `supabase db push`
  ya da `psql` ile uygulanmalı; MCP `apply_migration` yalnızca elle
  sürülen oturumlarda kullanılabilir.
- **Canlı site karşılaştırması sınırlı.** Kum havuzunda tarayıcı dış
  çıkışı kesik (`ERR_CONNECTION_RESET`); `curl` vekilden geçiyor.
  Ekran doğrulaması için istekler Node üzerinden röle ediliyor.
- **Harici kimlik bilgisi yok:** YouTube OAuth, ödeme sağlayıcısı,
  radyo yayın sunucusu (Icecast/VPS), analitik hesabı. Bu alanlarda
  yalnızca `IMPLEMENTED_BLOCKED_EXTERNAL` seviyesine kadar gidilir.


## Faz 1 — ayrıntı

### 1.1 Merkezî konum ve idari birimler — **PARTIAL**

| Madde | Durum | Kanıt |
|---|---|---|
| 81 il veritabanında | DONE | `0040`; canlıda `count(*) = 81` ölçüldü |
| Modül bazında hardcode kaldırılması | PARTIAL | `provinces` servisi kuruldu; tüketici modüller Faz 2'de bağlanacak |
| İl–ilçe FK | DONE | `districts.province_code → provinces.code` (restrict) |
| Plaka kodu, Türkçe ad, normalize ad, slug, aktiflik, sıra | DONE | Altı kolon da mevcut |
| Türkçe I/İ/Ş/Ğ/Ü/Ö/Ç arama ve sıralama | DONE | `app.tr_normalize` + istemci `normalizeTr`; 14 il adında birebir eşleşme testi |
| "Diğer" gibi bütünlük bozan seçenek | DONE | Yok |
| Yanlışlıkla silinememe | DONE | `provinces_no_delete` tetikleyicisi; canlıda ölçüldü (silme engellendi, pasifleştirme geçti) |
| Idempotent seed | DONE | `on conflict do update`; migration sonunda 81 doğrulaması |
| 81 il testi | DONE | Migration'ın kendi bloğu + canlı ölçüm |
| Tekrar/eksik kod testi | DONE | Migration slug tekrarında düşüyor |
| E2E: bütün dropdown'larda 81 il | NOT_STARTED | Tüketici modüller bağlanmadan ölçülemez (Faz 2) |
| **İlçe tohum verisi** | **NOT_STARTED** | Bilinçli: 973 ilçe adını çevrimdışı üretmek uydurma riski taşıyor. Tablo+FK+RLS hazır; resmî kaynak (TÜİK/NVİ) erişiminde tek `insert` ile dolar. Arayüzde ilçe seçimi olmadığı için hiçbir akış kırık değil. |

### 1.2 Konum modu durum makinesi — **PARTIAL**

**Düzeltilen hata:** belgedeki "manuel seçimden sonra GPS yeniden
etkinleştirilemiyor". Sebep mimariydi — tek `permission` değişkeni hem
tarayıcı iznini hem kullanıcının tercihini taşıyordu; şehir seçmek onu
`dismissed` yapıyor, o da GPS yolunu kalıcı kapatıyordu.

`src/domain/location/mode.ts`: beş mod (`AUTO_GPS`, `MANUAL`, `DENIED`,
`UNAVAILABLE`, `ERROR`), izinden ayrılmış tercih, ayrı `lastGps` /
`lastManual`.

| Madde | Durum | Kanıt |
|---|---|---|
| Beş modlu durum makinesi | DONE | `mode.ts`, 14 test |
| Manuel seçim GPS'i kapatmıyor | DONE | "senaryo 4" testleri |
| Sınırsız geçiş | DONE | 10 turluk gidiş-geliş testi |
| Son manuel ve son GPS ayrı saklanıyor | DONE | `lastManual` / `lastGps` |
| DENIED'dan geri dönüş açık | DONE | `canReturnToAuto` testi |
| İzinsiz prompt tetiklenmiyor | DONE | `shouldPrompt` DENIED'da false |
| GPS düşünce site çökmüyor | DONE | UNAVAILABLE'dan manuel seçim testi |
| Context'e bağlanması | DONE | `LocationContext` durum makinesini tüketiyor; `mode`, `modeLabel`, `canReturnToAuto`, `needsPermissionHelp` dışa veriliyor |
| `setCity` izne dokunmuyor | DONE | Eski kod `permission`ı 'dismissed' yapıyordu — kilit buydu, kaldırıldı |
| GPS hataları ayrıştırıldı | DONE | PERMISSION_DENIED / POSITION_UNAVAILABLE / TIMEOUT ayrı ele alınıyor; eskiden hepsi 'denied' sayılıyordu |
| Arayüzde "Otomatik konuma dön" | DONE | `LocationPicker` moda göre metin veriyor; DENIED'da tarayıcı ayar yönergesi, UNAVAILABLE'da HTTPS notu, ERROR'da tekrar denenebilir |
| Reverse-geocoding adapter | NOT_STARTED | — |
| Tarayıcı matrisi (Safari/iOS/Android/Edge) | NOT_STARTED | Kum havuzunda tek Chromium var; gerçek cihaz matrisi IMPLEMENTED_BLOCKED_EXTERNAL |
| Çıkışta konum verisi temizliği | NOT_STARTED | — |
### 1.3 Supabase şema ve RLS denetimi — **NOT_STARTED**


---

## Sonraki oturum için devam notu

**Bittiği yer:** Faz 1.1 ve 1.2'nin ölçülebilir tamamı. Faz 1.3 (Supabase
şema + RLS denetimi) başlamadı.

**Faz 1.3 için hazır bilgi** (yeniden keşfetmeye gerek yok):
- 41 tablo, 40'ında RLS açık (`spatial_ref_sys` PostGIS'e ait, açılamıyor)
- 97 politika; hepsinde `auth.*` çağrıları `(select …)` ile sarmalı (0037)
- Bilinen açık denetçi bulguları: 129 `multiple_permissive_policies`
  (politika birleştirme semantik risk taşır, tablo tablo bakılmalı),
  31 `unindexed_foreign_keys` (dolu tablodakiler 0039'da kapatıldı)
- `docs/BASELINE.md` bütün baseline sayılarını taşıyor

**Faz 1.3'te yapılacaklar** (belge satır 204–257):
1. Belgedeki tablo listesini mevcut şemayla karşılaştır; eksik olanları
   çıkar (bildirimler, mesajlaşma, engelleme, radyo programı, TV kanalı,
   ana sayfa modül konfigürasyonu, feature flag, kota kayıtları gibi
   birçoğu henüz yok)
2. `TO authenticated` tek başına yetkilendirme olan politikaları ara
3. `UPDATE` politikalarında `WITH CHECK` eksiklerini ara
4. Denetçi bulgularını yeniden çalıştır

**Çalışma yöntemi** (bu oturumda işe yaradı):
- Master belgeyi TAMAMEN okuma; yalnızca faz satır aralığını oku
- Her veritabanı kuralını canlıda `raise exception` ile GERİ ALINAN
  işlemde ölç — iddia etme
- Her faz sonunda `npm run test:all`, sonra commit + push
- Durum belgesini her fazda güncelle

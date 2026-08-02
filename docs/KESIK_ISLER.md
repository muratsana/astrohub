# Kesik kalan işler

Bu belge, "hepsini bitir" turunda **bilerek yarıda bırakılan** işleri
listeliyor. Her satırda ne yapılmadığı, NEDEN yapılmadığı ve devam
edecek kişinin ilk hamlesi yazılı.

Ayrım önemli: burada iki tür madde var.

- **BLOKE** — dış bir şey olmadan yapılamaz (kimlik bilgisi, ürün
  kararı, lisans). Kod yazarak açılmaz.
- **SIRADA** — yapılabilir, sadece bu turda sıraya girmedi.

---

## 0. Önce yapılması gerekenler (başka her şeyi kilitliyor)

| # | İş | Neden şimdi | İlk hamle |
|---|---|---|---|
| 0.1 | **JS bütçesi 199.9/200 kB** | Tavana 0.1 kB kaldı. Bir sonraki arayüz eklemesi kapıyı düşürür; yani bu madde açılmadan aşağıdakilerin çoğu yazılamaz | `npm run check:budgets` çıktısındaki ilk rota parçalarına bak; `cities.ts` ve `navigation.ts` gibi kök modülleri lazy sınırın arkasına al. Tavanı yükseltmek son çare — gerekçesi belgelenmeli |
| 0.2 | **`0071` tohumu uzak projeye uygulanmadı** | Şema canlıda var (`districts`, `0040`'tan) ama 974 satır yalnızca depoda. Canlıda ilçe seçici boş açılır | `supabase db push` (ya da `psql -f supabase/migrations/0071_ilceler.sql`). Dosya yerel PostgreSQL'de üç kez çalıştırılıp doğrulandı; tohum idempotent ve yönetici düzeltmesini korumaktadır |

---

## 1. Konum — kullanıcının bu turda özellikle istediği alan

| # | İş | Durum | Not |
|---|---|---|---|
| 1.1 | İl + ilçe seçimi | **BİTTİ** | 974 ilçe, koordinatlı; seçici iki kademeli |
| 1.2 | **Cihaz konumunun ilçe adıyla etiketlenmesi** | SIRADA | `nearestDistrict` ve 40 km sınırı yazıldı ve test edildi ama `LocationContext`in cihaz konumu dalına HENÜZ BAĞLANMADI. Bugün cihaz konumu il adıyla etiketleniyor. İlk hamle: `geocoder` çözümünden sonra o ilin ilçelerini çekip `nearestDistrict` uygulamak |
| 1.3 | **İlçe explorer facet'i** | SIRADA | Liste sayfalarında (ilanlar, etkinlikler, saha) süzgeç hâlâ il düzeyinde. `personalFacet` deseni hazır; ilçe facet'i `districts` okumasıyla kurulabilir |
| 1.4 | Mahalle kademesi | **YAPILMAYACAK** | Elli bine yakın satır, astronomik hiçbir fark üretmiyor (birkaç yüz metre). Daha ince nokta gerektiğinde doğru cevap cihaz konumu, daha ince bir idari liste değil |

### "81 il" durumu — dürüst tablo

Veri kaynaklı her yer **zaten 81 il**: `provinces` tablosu (`0040`), konum
seçici, formlar, filtreler, ters kodlama. İki istisna var ve ikisi de
0.1 (bütçe) maddesine bağlı:

| Yer | Bugün | Neden 81 değil |
|---|---|---|
| Şehir SEO sayfaları (`/{sehir}-astronomi-etkinlikleri`) | **15 il** | Rotalar derleme zamanında üretiliyor, yani liste koda gömülü olmak zorunda. 81 il ~2,5 kB gzip ekler; bütçede 0,1 kB var |
| Bortle ipuçları | **15 il** | Kalan 66 il için ÖLÇÜM YOK. Nüfusa bakıp tahmin etmek gökyüzü beklentisini yanlış kurardı; alan bilerek boş |

`cities.ts` artık "şehir listesi" değil, yapılandırma yokken çalışan bir
yedek — bu ayrım `provinces.ts` başlığında yazılı.

---

## 2. Fazlara göre kalanlar

### Faz 1–11 (üzerinde çalışılmış fazların artıkları)

| Faz | İş | Tür | Not |
|---|---|---|---|
| 4 | Sunucu tarafı sayfalama / cursor pagination | SIRADA | Bilerek ertelendi: kataloglar bugün tamamı belleğe inen listeler. `ExplorerQuery` sayfa ve sayfa boyutu taşıdığı için ŞEKLİ hazır. Veri hacmi gerektirdiğinde `applyQuery` yerine PostgREST sorgusu kurulacak |
| 4 | Sütun sırası (sürükle-bırak) | SIRADA | Göster/gizle var. Sıra değiştirme ayrı bir etkileşim: sürükleme + KLAVYE ALTERNATİFİ gerekiyor ve tek başına bir tur |
| 4 | Harita/takvim görünümlerinin explorer'a bağlanması | SIRADA | `EventMapPage` ve `EventCalendar` ayrı sayfa olarak çalışıyor; explorer'ın görünüm seçeneği değiller |
| 6 | Hatırlatma teslim kanalı | **BLOKE** | E-posta sağlayıcısı kararı verilmedi (kullanıcıya ait). Web push'u belgenin kendisi "ileride" diyor. Site içi teslimat çalışıyor |
| 7 | Canlı radyo yayını | **BLOKE** | Dış VPS gerekiyor. Şema, adaptör, dağıtım paketi ve panel hazır |
| 8 | Canlı YouTube kanalı | **BLOKE** | Gerçek Google OAuth kimliği gerekiyor. Şema, adaptör ve panel hazır |
| 9 | Ödeme | **BLOKE** | Sağlayıcı seçilmedi. Kademe, kota ve yetki mantığı yerinde; yazılacak tek şey webhook |
| 11 | §14.7 kulübün etkinlik yayımlaması | SIRADA | `manager_user_id` bağı `0067`de var ama YETKİ vermiyor (dizin editoryal). `events` tarafında sahiplik ve moderasyon kararı gerektiriyor |
| 11 | §14.3 meteor/tutulma/ISS, §14.1 gökyüzü haritası | **BLOKE** | Dış veri lisansı ya da servis gerekiyor. Adaptör + feature flag ile hazırlanacak, placeholder GÖSTERİLMEYECEK |
| 3 | Hero kontrast ölçümü, "slider gerekli mi" | SIRADA | İkisi de ÖLÇÜM işi, kod işi değil: fotoğraf değişken olduğu için örnekleme, slider için etkileşim verisi gerekiyor |
| 3 | Boş modül durumlarının E2E'si | SIRADA | Ağ kesintisi taklidi gerekiyor; durum ayrımı 10 birim testiyle ölçülüyor |

### Faz 12–18 — hiç başlanmadı

Bunlar tek turda kapatılabilecek işler değil; her biri kendi fazı.

| Faz | Konu | Belgedeki satır | İlk hamle |
|---|---|---|---|
| 12 | Organik kullanıcı kazanımı | 1350–1419 | Fazın maddelerini mevcut modüllerle karşılaştır (Faz 11'de yapılan envanter yöntemi). Davet, paylaşım ve içerik döngüsü büyük ölçüde var; boşluk muhtemelen ölçüm tarafında |
| 13 | Fotoğraf, Storage, medya mimarisi | 1420–1462 | Yükleme, kırpma, revizyon, EXIF, plate solve ve kota ÇALIŞIYOR. Faz muhtemelen büyük ölçüde DONE çıkacak — önce envanter, sonra kod |
| 14 | macOS, tarayıcı, responsive, erişilebilirlik | 1463–1528 | `check:a11y` ve `check:viewports` kapıları zaten var. Gerçek cihaz/tarayıcı matrisi **BLOKE** (kum havuzunda tek Chromium) |
| 15 | Güvenlik, KVKK, telif, kötüye kullanım | 1529–1606 | CSP, RLS, kota, KVKK onayları ve denetim kaydı var. `consume_rate_limit`in `app` şemasına taşınması ve 129 permissive policy birleştirmesi bu faza atanmıştı |
| 16 | Performans, SEO, analitik, gözlemlenebilirlik | 1607–1690 | Bütçe kapısı, prerender, sitemap, JSON-LD var. Analitik ve hata izleme sağlayıcısı **kullanıcı kararı** |
| 17 | Test stratejisi ve kabul kriterleri | 1691–… | 1924 test, 28 E2E senaryosu ve 12 kapı var. Faz muhtemelen belgeleme işi: kabul kriterlerini yazıp mevcut kapılarla eşlemek |
| 18 | Belgenin sonu | …–1956 | Okunmadı |

---

## 3. Ürün kararı bekleyenler (kod işi değil)

| # | Karar | Not |
|---|---|---|
| 3.1 | E-posta sağlayıcısı | Faz 6'nın teslim kanalını açar |
| 3.2 | Ödeme sağlayıcısı | Faz 9'u `IMPLEMENTED_DISABLED`dan çıkarır |
| 3.3 | Analitik / hata izleme sağlayıcısı | Faz 16 |
| 3.4 | Radyo VPS'i | Faz 7'nin canlı yayın ayağı |
| 3.5 | Vercel `VERCEL_TOKEN` | Eski dağıtımların temizliği (görev #74) |
| 3.6 | Tek admin kararı | Verildi ve uygulandı; çoklu admin rolü kurulmayacak (görev #73) |

---

## 4. Bu turda bilerek yapılmayanlar — ve sebepleri

- **`districts` için ikinci tablo açılmadı.** Uzak projede tablo zaten
  vardı (`0040`); yeni şema aynı veriyi iki yerde tutmak olurdu.
- **974 satır MCP üzerinden canlıya yazılmadı.** 60 kB'lık bir seed'i
  araç çağrısına gömmek bağlamın büyük kısmını yerdi; dosya depoda ve
  `db push` ile gidiyor (madde 0.2).
- **Mahalle verisi çekilmedi** (madde 1.4).
- **Bortle tahmini üretilmedi** — 66 il için ölçüm yok, uydurmak
  kullanıcının gökyüzü beklentisini yanlış kurardı.
- **Fazlar 12–18 için kod yazılmadı.** Faz 11'de öğrenilen ders şuydu:
  önce ENVANTER, sonra kod. Karşılaştırma yapılmadan yazılan her şey
  ikinci bir kopya oluyor. Bu fazların envanteri çıkarılmadı, dolayısıyla
  yazılacak kodun ne olduğu da bilinmiyor.

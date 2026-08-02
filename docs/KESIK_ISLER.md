# Kesik kalan işler

Bu belge, "hepsini bitir" turunda **bilerek yarıda bırakılan** işleri
listeliyor. Her satırda ne yapılmadığı, NEDEN yapılmadığı ve devam
edecek kişinin ilk hamlesi yazılı.

Ayrım önemli: burada iki tür madde var.

- **BLOKE** — dış bir şey olmadan yapılamaz (kimlik bilgisi, ürün
  kararı, lisans). Kod yazarak açılmaz.
- **SIRADA** — yapılabilir, sadece bu turda sıraya girmedi.

---

## 0. Önce yapılması gerekenler — İKİSİ DE KAPANDI

Bu bölüm iki maddeyle açılmıştı ve ikisi de aşağıdaki her şeyi kilitliyordu.
Kapanma kayıtları duruyor, çünkü nasıl kapandıkları bir sonraki turu
ilgilendiriyor.

| # | İş | Durum | Nasıl kapandı |
|---|---|---|---|
| 0.1 | JS bütçesi 199.9/200 kB | **KAPANDI — 198.3 kB** | Tavan yükseltilmedi, yük azaltıldı. `services/content/photos.ts`, beş satırlık `publicPhotoUrl` için `services/photos/upload.ts`i çağırıyor; import zinciri yeniden boyutlama, EXIF ve plate solve boru hattını ilk rotaya taşıyordu. URL kurucu `publicUrl.ts`e ayrıldı (`upload.ts` yeniden dışa aktarıyor): −3.2 kB. 81 ilin eklediği ~1 kB bu payın içine sığdı |
| 0.2 | `0071` tohumu uzak projeye uygulanmadı | **KAPANDI — canlıda** | Göç `20260802171241_0071_ilceler` olarak uygulandı. Canlı doğrulama: 974 ilçe, **974'ünde de koordinat**, 81 ilin tamamı temsil ediliyor (min 3 — Bayburt, maks 39 — İstanbul). `search_name` katlaması canlıda da doğru: `beytussebap`, `gumushacikoy`, `yuregir` aranabiliyor |

---

## 1. Konum — kullanıcının bu turda özellikle istediği alan

| # | İş | Durum | Not |
|---|---|---|---|
| 1.1 | İl + ilçe seçimi | **BİTTİ** | 974 ilçe, koordinatlı; seçici iki kademeli |
| 1.2 | Cihaz konumunun ilçe adıyla etiketlenmesi | **BİTTİ** | `geocoder` ili çözdükten sonra o ilin ilçeleri çekilip `nearestDistrict` uygulanıyor. Etiket İKİ HAMLEDE yazılıyor: il adı ilçe isteğini beklemiyor. 40 km sınırının ötesinde ilçe adı yazılmıyor; liste okunamazsa il adı yerinde kalıyor. `cityId`/`districtId` bilerek boş — cihaz konumunun paylaşılabilir karşılığı olmamalı (§14.4) |
| 1.3 | **İlçe explorer facet'i** | SIRADA | Liste sayfalarında (ilanlar, etkinlikler, saha) süzgeç hâlâ il düzeyinde. `personalFacet` deseni hazır; ilçe facet'i `districts` okumasıyla kurulabilir |
| 1.5 | Form alanlarının `label` yerine `provinceName` okuması | **BİTTİ** | 1.2 sırasında bulundu: ilan formu şehir alanını `location.label` ile dolduruyordu. `label` bir gösterim metni ve her zaman il adı değil ("Cihaz konumu", "Ankara / Çankaya"); `ProvinceSelect` bilinmeyen değeri "(listede yok)" diye koruduğu için kullanıcı fark etmeden il olmayan bir değerle ilan verebiliyordu. `ObservingLocation.provinceName` eklendi — doluysa 81 ilden biri olduğu garanti |
| 1.4 | Mahalle kademesi | **YAPILMAYACAK** | Elli bine yakın satır, astronomik hiçbir fark üretmiyor (birkaç yüz metre). Daha ince nokta gerektiğinde doğru cevap cihaz konumu, daha ince bir idari liste değil |

### "81 il" durumu — dürüst tablo

Veri kaynaklı her yer **zaten 81 il**ydi: `provinces` tablosu (`0040`),
konum seçici, formlar, filtreler, ters kodlama. Koda gömülü olmak
ZORUNDA olan iki yer 15 ilde kalmıştı; bütçe açıldıktan sonra biri
tamamlandı, diğeri bilerek eksik:

| Yer | Bugün | Not |
|---|---|---|
| Şehir SEO sayfaları (`/{sehir}-astronomi-etkinlikleri`) | **81 il** | Rotalar derleme zamanında üretiliyor, liste koda gömülü. Nesne literalleri demet satırlarına çevrildi (dört alan adı 81 kez tekrarlanmıyor): ~1 kB gzip. Prerender 424 → 490 rota, `vercel.json` 159 rewrite |
| Bortle ipuçları | **15 il** | Kalan 66 il için ÖLÇÜM YOK. Nüfusa bakıp tahmin etmek gökyüzü beklentisini yanlış kurardı. Alan isteğe bağlı; arayüz o illerde "—" ve "ölçüm yok" gösteriyor. Bu bir eksik değil, KARAR |

`cities.ts` artık "şehir listesi" değil, yapılandırma yokken çalışan bir
yedek — bu ayrım `provinces.ts` başlığında yazılı. Yedek artık **gerçek
plaka kodu** taşıyor: eskiden uydurma negatif kodlar üretiliyordu ve
ilçeler `province_code` ile sorgulandığı için, veritabanı yokken ilçe
seçici sessizce boş kalıyordu.

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
- **Mahalle verisi çekilmedi** (madde 1.4).
- **Bortle tahmini üretilmedi** — 66 il için ölçüm yok, uydurmak
  kullanıcının gökyüzü beklentisini yanlış kurardı.
- **Fazlar 12–18 için kod yazılmadı.** Faz 11'de öğrenilen ders şuydu:
  önce ENVANTER, sonra kod. Karşılaştırma yapılmadan yazılan her şey
  ikinci bir kopya oluyor. Bu fazların envanteri çıkarılmadı, dolayısıyla
  yazılacak kodun ne olduğu da bilinmiyor.

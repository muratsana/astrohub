# Astrohub — Ürün / UX / Fonksiyonellik Audit Raporu

**Tarih:** 18 Ağustos 2026  
**Hedef:** https://astrohub.com.tr  
**Metod:** canlı black-box browser audit + authenticated kullanıcı denemeleri + GitHub kaynak kodu incelemesi + Supabase veri doğrulaması + ürün sahibi ekran görüntüsü/gözlemleri.

> Bu rapor klasik kod kalitesi auditi değildir. Kullanıcının akışı tamamlayabilmesi, hatadan geri dönebilmesi, arayüzün ne anlattığı, mobil davranış, medya görünürlüğü ve ürün mantığı odaklıdır.

---

## 1. Yönetici özeti

Audit sonucunda Astrohub'ın temel mimarisinin ve geniş özellik setinin çalışır durumda olduğu; ancak gerçek kullanıcı deneyiminde özellikle **recovery/navigation, medya yönetimi, içerik üretim kolaylığı, ekipman kataloğu bütünlüğü ve mobil etkinlik görünümü** alanlarında belirgin ürün borcu bulunduğu görüldü.

En yüksek öncelikli kümeler:

1. Kayıt ve geri dönüş akışlarında kullanıcı verisinin kaybolması.
2. Galeri detayından liste bağlamına geri dönüşün korunmaması.
3. İlanlarda fotoğraf desteğinin olmaması.
4. Ekipman setup'larının sonradan düzenlenememesi ve filtre envanteri modelinin yetersizliği.
5. Ekipman kataloğunda mükerrer ve seri kapsamı eksik veriler.
6. Fotoğraf detayında related/technical comparison görsellerinin placeholder'a düşmesi.
7. `/saha` veri isteğinin canlıda HTTP 400 dönmesi.
8. Ana sayfa Meteoblue Edge Function isteğinin zaman zaman HTTP 503 dönmesi.
9. Mobil `/etkinlikler` tablosunun 390px viewport'ta 665px yatay taşma üretmesi.

---

# 2. P0 / Kritik ürün akışları

## P0-01 · Kayıt formundan Kullanım Koşulları / KVKK'ya gidip geri dönünce form verisi kayboluyor

**Kanıt:** canlı Playwright testi ile tekrarlandı.

### Reproduction
1. `/kayit` aç.
2. E-posta ve şifre alanlarını doldur.
3. Kullanım Koşulları veya KVKK bağlantısını aç.
4. Browser Back ile kayıt ekranına dön.
5. Girilmiş form alanları boş.

### Kullanıcı etkisi
Kullanıcı yasal metni okumak istediği için cezalandırılıyor ve kayıt formunu tekrar doldurmak zorunda kalıyor.

### Öneri
- Yasal metinleri modal/drawer veya yeni sekmede açmak; veya
- kayıt draft state'ini sessionStorage/router state ile saklamak.

### Regresyon
`register -> fill -> terms -> back -> inputs preserved` ve `KVKK` için ayrı Playwright senaryosu.

---

## P0-02 · Galeri detayından galeri bağlamına geri dönüş yok

**Ürün sahibi tarafından doğrulandı.**

### Beklenen
Fotoğraf detayında görünür **“← Galeriye dön”** kontrolü olmalı.

Geri dönüşte korunmalı:
- aktif sayfa,
- scroll konumu,
- arama,
- filtreler,
- sıralama,
- mümkünse görünür kartın konumu.

### Teknik öneri
Galeri route state/query state korunmalı. Fotoğraf detayına girerken `returnTo` bilgisi oluşturulabilir; dönüşte liste state restore edilmeli.

---

# 3. P1 / Yüksek öncelikli fonksiyonellik ve UX

## P1-01 · İlanlara fotoğraf eklenemiyor

### Beklenen
- ilan başına maksimum **5 fotoğraf**,
- fotoğraflar Astrohub medya optimizasyon pipeline'ından geçmeli,
- her çıktı **≤ 5 MB**,
- kullanıcı fotoğrafı silebilmeli/değiştirebilmeli,
- yükleme ilerlemesi ve limit geri bildirimi olmalı,
- mümkünse sürükle-bırak sıralama.

---

## P1-02 · Fotoğraf detayında “Benzer fotoğraflar” ve “Teknik karşılaştırma” görselleri görünmüyor

**Ekran görüntüsü ile doğrulandı.**

Kartların metinleri geliyor fakat gerçek thumbnail yerine Astrohub placeholder görünüyor.

### Beklenen
Related-photo veri modeli gerçek thumbnail/preview URL taşımalı ve standart `RemoteImage`/thumbnail pipeline kullanılmalı.

Placeholder yalnız gerçek asset yoksa gösterilmeli; URL mapping/rendering problemi placeholder ile sessizce maskelenmemeli.

---

## P1-03 · Kaydedilmiş ekipman setup'ı sonradan düzenlenemiyor

Kod incelemesinde mevcut kayıt kartlarında:
- görünürlük,
- varsayılan yap,
- aç/paylaş,
- çoğalt,
- sil

eylemleri mevcut; ancak mevcut setup'ı edit builder'a geri yükleyen **Düzenle** akışı yok.

### Beklenen
Kullanıcı sonradan:
- setup adı,
- açıklama,
- amaç,
- teleskop,
- kamera,
- montaj,
- filtreler,
- aksesuarlar

gibi parçaları düzenleyebilmeli.

---

## P1-04 · Ekipman setup içinde birden fazla filtre yönetimi yetersiz

Aktif optik zincirdeki tek filtre ile kullanıcının sahip olduğu filtre koleksiyonu birbirinden ayrılmalı.

### Önerilen model
- `owned_filters[]`
- `active_filter_id` veya çekim planı bazlı `session_filters[]`

Böylece kullanıcı L/R/G/B/Ha/OIII/SII veya çoklu broadband/dualband filtre envanteri tutabilir.

---

## P1-05 · Ekipman kataloğunda mükerrer kayıtlar

Supabase verisinde normalize edilmiş marka+model adına göre **en az 19 açık duplicate grup** bulundu.

Örnekler:
- Optolong L-Ultimate 3nm
- Optolong L-Pro
- Sky-Watcher EQ6-R Pro
- Sky-Watcher EQ8-R Pro
- Sky-Watcher Esprit 100ED
- Sky-Watcher Esprit 120ED
- ZWO ASI533MC Pro
- ZWO ASI6200MM Pro
- Takahashi FSQ-106EDX4
- William Optics ZenithStar 73 III

### L-Ultimate özel durumu
İki ayrı kayıt aynı fiziksel ürünün farklı açıklama seviyelerine sahip kopyalarıdır:
- `L-Ultimate (3 nm)`
- `L-Ultimate 3nm`

### Veri ilkesi
`canonical model + variant/size + alias` sistemi kurulmalı.

Örneğin Optolong L-Ultimate tek canonical ürün olmalı; 2", 1.25" vb. gerçek SKU/ölçü farkları variant olarak tutulmalı.

---

## P1-06 · Ekipman katalog kapsamı legacy/seri ürünlerde eksik

Örnek: PrimaLuceLab EAGLE 5 var ancak önceki nesiller eksik.

Katalog yalnız bugün satılan ürünleri değil, Astrohub kullanıcılarının halen sahip olduğu legacy/discontinued ürünleri de içermeli.

### Beklenen durum alanları
- production_status
- release_year
- discontinued_year
- source / verified_at

Legacy ürün silinmemeli; `discontinued` olarak işaretlenmeli.

---

## P1-07 · `/saha` canlı veri sorgusu HTTP 400

Canlı browser tanılamasında şu Supabase REST isteği **400** dönüyor:

`observing_sites?select=slug,name,region,approx_latitude,approx_longitude,altitude_m,bortle,sqm,road_access,south_horizon,best_months,has_water,has_toilet,has_electricity,has_cell_signal,has_tent_area,caravan_ok,description,warnings,image_url,image_credit,image_licence,source_urls,rating,review_count&status=eq.yayinda&deleted_at=is.null&order=name.asc`

### Muhtemel kök neden
Select edilen kolonlardan biri canlı schema ile uyuşmuyor veya filtre/enum değeri beklenen yapıda değil.

### Yapılacak
Network response body + Supabase PostgREST log ile eksik/yanlış alan bulunmalı.

---

## P1-08 · Mobil `/etkinlikler` görünümünde ciddi yatay taşma

390px viewport'ta document genişliği **1055px**, taşma **665px**.

Kök eleman:
`table.w-full.min-w-[980px]`

Tablo `overflow-x-auto` içinde olsa da document seviyesinde taşma devam ediyor.

### Ürün önerisi
Mobilde geniş tablo yerine kart/list item görünümü tercih edilmeli.

Etkinlik kartında yalnız:
- başlık,
- şehir,
- tarih,
- mesafe,
- görüntüle

gösterilip ikincil detaylar detay sayfasına bırakılabilir.

---

# 4. P2 / Orta öncelikli ürün iyileştirmeleri

## P2-01 · Galeride “Kaydet” eylemi belirsiz

“Kayıt” kavramı koleksiyona/favoriye ekleme mi, cihazına indirme mi anlaşılmıyor.

### İstenen
Fotoğraf için görünür **İndir** eylemi olmalı.

Eğer koleksiyon özelliği korunacaksa adı açıkça **“Koleksiyona kaydet”** olmalı.

---

## P2-02 · Plate solve sonrası takımyıldız bilgisi otomatik künyeye gelmeli

Plate solve sonucu RA/Dec elde edildiğinde koordinatın düştüğü takımyıldız türetilebilir.

### Veri güvenliği
- kullanıcı tarafından elle girilmiş constellation varsa üzerine sessizce yazılmamalı,
- otomatik alanın kaynağı `plate_solve` olarak işaretlenmeli.

---

## P2-03 · Çekim filtresi satırı eklenince önceki tekrar eden değerler kopyalanmalı

Örnek:
- L / 50 kare / 300 sn
- kullanıcı R ekliyor.

Yeni satırda:
- filtre boş/yeni,
- kare sayısı 50,
- poz 300 sn

varsayılan gelmeli.

Kullanıcı değerleri sonradan değiştirebilmeli.

Bu özellikle LRGB ve SHO girişini ciddi hızlandırır.

---

## P2-04 · E-posta doğrulandı kutusu görsel olarak ağır

Ayrı büyük panel yerine e-posta adresinin yanında sade **Doğrulandı** rozeti önerilir.

---

## P2-05 · Header'da “Hesabım” yerine avatar + kullanıcı adı

Giriş yapan kullanıcının sağ üst kimliği:

`[avatar] astrohubtest`

şeklinde olmalı.

Mobilde kullanıcı adı truncate olabilir; avatar korunmalı.

---

## P2-06 · Fotoğraf puanlama bloğu gereksiz alan kaplıyor

Mevcut ayrı “Fotoğrafa puan ver” paneli kaldırılmalı.

### Yeni yerleşim
Fotoğrafın hemen altındaki aksiyon satırı:

`beğeni · yorum · puan/yıldız · paylaş · indir`

### Puan davranışı
- 1–10 arası yıldız/puan,
- kompakt yıldız ikonu,
- hover/tıklama ile 1–10 seçim popup'ı,
- mevcut ortalama ve kullanıcının verdiği puan küçük tooltip/popover ile gösterilebilir.

Mobilde 10 kalıcı buton gösterilmemeli.

---

# 5. Canlı altyapı / runtime bulguları

## NET-01 · Meteoblue Edge Function 503

Ana sayfada canlı tanılamada:

`GET /functions/v1/meteoblue?lat=41.01&lon=28.98` → **503**

### Beklenen
Hava sağlayıcı geçici olarak başarısız olduğunda kullanıcı arayüzü graceful fallback göstermeli ve tekrar politikası kontrollü olmalı.

---

## NET-02 · observing_sites REST 400

Yukarıdaki `/saha` problemi gerçek canlı endpoint seviyesinde doğrulandı.

Bu sorun placeholder/empty state ile saklanmamalı; gözlem sahaları fonksiyonunu doğrudan etkiliyor.

---

# 6. Kayıt / onboarding gözlemi

Yeni kullanıcı yolu gerçekte:

`Kayıt → e-posta doğrulama → giriş → Hesabınızı tamamlayın → kullanıcı adı + şehir → site`

şeklinde.

Bu onboarding bir modal gate olarak tüm uygulamayı kilitliyor. Tasarım bilinçli; ancak tüm E2E testlerin bu gerçek yol üzerinden geçmesi gerekir. Önceki testler bu adımı atladığı için yanlış pozitif sonuç üretebiliyordu.

---

# 7. Katalog araştırma sonucu

## Optolong L-Ultimate

Resmi ürün bilgisine göre L-Ultimate:
- dual narrowband,
- H-alpha 3 nm,
- OIII 3 nm,
- 2022 ürünü,
- daha sonra 1.25" ölçüsü de eklenmiş.

Bu nedenle katalogda aynı optik ürün için ayrı açıklama kayıtları yerine tek canonical ürün ve ölçü variantları tutulmalı.

## PrimaLuceLab EAGLE ailesi

Üreticinin güncel support/download arşivinde EAGLE3 ve EAGLE4 paketleri açıkça bulunuyor; ECCO2 uyumluluk belgelerinde EAGLE2, EAGLE3, EAGLE LE, EAGLE4 ve EAGLE5 birlikte listeleniyor. Güncel kullanıcı kılavuzu sayfasında EAGLE6 aktif nesil, EAGLE5 ise previous-generation archive altında yer alıyor.

Dolayısıyla Astrohub katalog yaklaşımı seri geçmişini koruyacak şekilde genişletilmeli.

---

# 8. Önerilen uygulama sırası

## Sprint A — Kullanıcının hemen hissettiği sorunlar
1. Kayıt legal-link state kaybı.
2. Galeriye geri dön + page/scroll/filter restore.
3. Related/technical comparison gerçek thumbnails.
4. `/saha` 400 düzeltmesi.
5. Mobil etkinlikler kart görünümü.
6. İlanlara 5 fotoğraf + ≤5MB optimization.

## Sprint B — Fotoğraf deneyimi
7. “Kaydet” semantiği / İndir.
8. Plate solve → constellation enrichment.
9. exposure-filter satırı clone-last-values.
10. puanlama widget'ını fotoğraf aksiyon satırına taşı.

## Sprint C — Hesap ve ekipman
11. header avatar + username.
12. verified badge sadeleştirme.
13. equipment setup edit.
14. multiple-owned-filters modeli.

## Sprint D — Katalog kalite projesi
15. 19+ duplicate grubun canonical merge planı.
16. referans bütünlüğü korunarak dedup migration.
17. PrimaLuceLab EAGLE2/3/LE/4/5/6 seri kapsamı.
18. diğer markalarda seri-gap analizi.
19. canonical/variant/alias veri modeli.

---

# 9. Kalıcı QA kapısı

Her düzeltilen ürün hatası Playwright regresyon senaryosuna çevrilmeli.

Minimum canlı test personları:
1. Anonymous visitor
2. Freshly registered user
3. Completed normal member
4. Admin
5. Mobile 390px
6. Desktop 1440px

Her kritik akış için:
- happy path,
- invalid input,
- back/recovery,
- refresh,
- cancel/abandon,
- retry,
- mobile,
- network failure

testleri bulunmalı.

---

# 10. Audit altyapısı

Bu audit için `codex/product-ux-audit-20260818` dalında canlı browser audit runner'ları ve GitHub Actions workflow'ları eklendi. Bunlar üretim kodunu düzeltmez; canlı siteyi kullanıcı gibi gezip rapor/evidence üretmek için tasarlanmıştır.

**Draft PR:** #22 — Live product / UX audit runner

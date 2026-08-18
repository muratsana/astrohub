# Astrohub — kullanıcı tarafından doğrulanan ürün / UX bulguları

Tarih: 2026-08-18
Kaynak: Ürün sahibi canlı kullanım gözlemleri ve ekran görüntüleri.

Bu dosya otomatik browser auditinden ayrı tutulur. Amaç, gerçek kullanıcı tarafından gözlenen sorunların kaybolmaması ve nihai raporda aynı severity/öncelik sistemiyle ele alınmasıdır.

## UF-001 · HIGH · İlanlara fotoğraf eklenemiyor
- Modül: İlanlar
- Beklenti: İlan başına en fazla 5 fotoğraf.
- Dosya politikası: Her fotoğraf Astrohub'ın mevcut fotoğraf optimizasyon kurallarından geçirilmeli; çıktı en fazla 5 MB olmalı.
- UX: yükleme ilerlemesi, hata, silme/değiştirme, sıralama ve limit geri bildirimi görünür olmalı.

## UF-002 · HIGH · Galeri fotoğraf detayından bağlama geri dönüş yok
- Modül: Galeri → Fotoğraf detayı
- Sorun: Fotoğraf detayından sonra görünür “Galeriye geri dön” kontrolü yok.
- Beklenti: Geri dönüş, kullanıcının önceki galeri bağlamını korumalı: sayfa, scroll konumu ve mümkünse aktif filtre/sıralama/arama.
- Amaç: kullanıcı galeriye dönünce baştan başlamak zorunda kalmamalı.

## UF-003 · MEDIUM · Galeride “Kaydet” eyleminin anlamı belirsiz
- Modül: Galeri / fotoğraf kartı-detayı
- Sorun: “Kaydet” kullanıcının neyin nereye kaydedildiğini anlamasını sağlamıyor.
- İstenen ürün davranışı: “İndir” eylemi sunulsun ve kullanıcı fotoğrafı indirebilsin.
- Not: Eğer koleksiyona/favoriye kaydetme ayrıca korunacaksa adı açık olmalı: ör. “Koleksiyona kaydet”.

## UF-004 · MEDIUM · Plate solve sonrası takımyıldız künyeye otomatik gelmiyor
- Modül: Fotoğraf / plate solve / künye
- Beklenti: Plate solve başarılıysa mümkün olduğunda çözüm koordinatından takımyıldız bilgisi türetilip fotoğraf künyesine otomatik yazılmalı/gösterilmeli.
- Veri güveni: otomatik türetilen alanın kaynağı plate solve olarak işaretlenmeli; elle girilen kullanıcı verisinin üzerine sessizce yazılmamalı.

## UF-005 · MEDIUM · Çekim filtresi satırı eklerken önceki değerler kopyalanmıyor
- Modül: Fotoğraf yükleme → Çekim oturumu / filtreler
- Örnek: L / 50 kare / 300 sn girildi. Kullanıcı R eklemek istediğinde yeni satır tamamen boş geliyor.
- Beklenti: “Filtre ekle” ile açılan yeni satır son eklenen satırın kare sayısı ve poz süresi gibi tekrar eden alanlarını varsayılan olarak kopyalasın; filtre seçimi yeni/boş kalsın.
- Kullanıcı yeni satırdaki kopyalanan değerleri değiştirebilmeli.

## UF-006 · LOW · E-posta doğrulandı alanı görsel olarak ağır
- Modül: Hesabım / Profil
- Sorun: “E-posta durumu — Doğrulandı” kutusu gereğinden fazla panel ağırlığı oluşturuyor.
- Beklenti: kutu kaldırılıp e-posta adresinin yanında sade bir “Doğrulandı” rozeti kullanılabilir.

## UF-007 · HIGH · Kaydedilmiş ekipman sonradan düzenlenemiyor
- Modül: Hesabım → Ekipmanlarım
- Kod doğrulaması: kayıtlı kartta görünürlük, varsayılan yap, aç/paylaş, çoğalt ve sil eylemleri var; mevcut setup'ı edit formunda tekrar açan bir Düzenle akışı yok.
- Beklenti: kullanıcı setup adı/açıklaması/amacı ve ekipman parçalarını sonradan değiştirebilmeli.
- Değişiklikler veri tabanında ve diğer cihazlarda kalıcı olmalı.

## UF-008 · HIGH · Bir ekipman setinde birden fazla filtre yönetimi yetersiz
- Modül: Hesabım → Ekipmanlarım
- Beklenti: kullanıcı tek bir setup içinde birden fazla sahip olunan filtre ekleyebilmeli; çekimde bunlardan biri/birden fazlası seçilebilmeli.
- Model önerisi: optik zincirde kullanılan aktif filtre ile kullanıcının filtre envanterini aynı tek slot olarak modellememek.

## UF-009 · HIGH · Ekipman kataloğunda mükerrer kayıtlar var
- Veritabanı doğrulaması: normalize edilmiş marka+model adına göre en az 19 açık mükerrer grup bulundu.
- Doğrulanmış örnekler: Optolong L-Ultimate 3nm, Optolong L-Pro, Sky-Watcher EQ6-R Pro, EQ8-R Pro, Esprit 100ED/120ED, ZWO ASI533MC Pro, ASI6200MM Pro vb.
- L-Ultimate özelinde iki kayıt aynı fiziksel ürünün farklı metinsel zenginlikte kopyaları: “L-Ultimate (3 nm)” ve “L-Ultimate 3nm”.
- Beklenti: canonical model + alias/variant/size ayrımıyla deduplikasyon; user_equipment ve setup referansları canonical kayda taşınmadan kayıt silinmemeli.

## UF-010 · HIGH · Ekipman katalog kapsamı seri bazında eksik
- Örnek: PrimaLuceLab EAGLE 5 kayıtlı; önceki EAGLE nesilleri katalogda eksik.
- Resmi üretici kaynakları EAGLE3 ve EAGLE4 yazılım paketlerini/uyumluluğunu hâlâ belgeliyor; katalog yalnız güncel satış ürünlerini değil kullanıcıların sahada sahip olabileceği discontinued/legacy modelleri de içermeli.
- Beklenti: production_status / release_year / discontinued_year alanları kullanılarak eski modeller saklanmalı; “artık satılmıyor” = “katalogda olmamalı” olmamalı.

## UF-011 · MEDIUM · Giriş yapan kullanıcının üst menü kimliği zayıf
- Modül: Global header
- Mevcut: sağ üstte genel “Hesabım” etiketi.
- Beklenti: giriş yapan kullanıcının avatarı + kullanıcı adı gösterilsin. Avatar kullanıcı adının solunda olsun; tıklama hesap menüsünü açsın.
- Mobilde alan daralınca kullanıcı adı kontrollü truncate edilebilir, avatar korunmalı.

## Ekipman kataloğu için uygulanacak veri ilkeleri
1. Aynı fiziksel ürün yalnız bir canonical model olmalı.
2. Boyut/bağlantı gibi gerçek SKU farkları variant olarak tutulmalı; yalnızca açıklama farkı yeni model üretmemeli.
3. Legacy/discontinued ürünler silinmemeli, durum alanıyla işaretlenmeli.
4. Dedup sırasında user_equipment/setup referansları kaybedilmemeli.
5. Üretici resmi kaynakları birincil; Astroshop, Teleskop-Express, Agena Astro, OPT, Telescopes.net, PrimaLuceLab vb. ikincil doğrulama/kapsam kaynağı olarak kullanılmalı.

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
| 1 | Veri modeli, Supabase güvenliği, merkezi yapılandırma | 136–257 | PARTIAL¹ |
| 2 | Tek tasarım sistemi ve bütüncül arayüz | 258–355 | DONE |
| 3 | Ana sayfa, navbar, hero, hava durumu | 356–461 | PARTIAL⁹ |
| 4 | Ortak arama, filtreleme, sıralama, görünüm | 462–548 | PARTIAL |
| 5 | Bildirim, mesajlaşma, sosyal aktivite | 549–632 | PARTIAL² |
| 6 | Etkinlik takip ve hatırlatma | 633–682 | PARTIAL³ |
| 7 | Çalışan AstroHub Radyo | 683–832 | PARTIAL⁴ |
| 8 | AstroHub TV ve YouTube'a hazır altyapı | 833–922 | PARTIAL⁵ |
| 9 | Standart/Premium üyelik altyapısı | 923–1005 | IMPLEMENTED_DISABLED⁶ |
| 10 | Admin panelinden kodsuz site yönetimi | 1006–1164 | DONE⁷ |
| 11 | Zorunlu ürün modülleri | 1165–1349 | PARTIAL⁸ |
| 12 | Organik kullanıcı kazanımı | 1350–1419 | NOT_STARTED |
| 13 | Fotoğraf, Storage, medya mimarisi | 1420–1462 | NOT_STARTED |
| 14 | macOS, tarayıcı, responsive, erişilebilirlik | 1463–1528 | NOT_STARTED |
| 15 | Güvenlik, KVKK, telif, kötüye kullanım | 1529–1606 | NOT_STARTED |
| 16 | Performans, SEO, analitik, gözlemlenebilirlik | 1607–1690 | NOT_STARTED |
| 17 | Test stratejisi ve kabul kriterleri | 1691–… | NOT_STARTED |
| 18 | (belgenin sonu) | …–1956 | NOT_STARTED |

⁹ **Faz 3'te kodla kapatılabilecek iş kalmadı.** Son iki `NOT_STARTED`
madde bu turda kapandı: hava sağlayıcısı seçimi artık panelden
yönetiliyor (`0068`) ve konum adres çubuğuna yazılabiliyor
(`?sehir=ankara`). İki bayat satır da düzeltildi (modül kapatma ve
"boşsa gizle" Faz 10'da kapanmıştı, kayıt güncellenmemişti). Kalan üç
madde ÖLÇÜM işi, kod işi değil: hero görsel–metin kontrastının
örneklemeyle ölçülmesi, "slider gerçekten gerekli mi" sorusunun
etkileşim verisiyle cevaplanması ve boş modül durumlarının E2E'de
üretilmesi (ağ kesintisi taklidi gerekiyor). Ayrıntı: Faz 3 bölümü.

⁸ **Faz 11'in envanteri çıkarıldı; §14.6 kapandı.** Fazın açılış kuralı
"çakışan modülleri birleştir, çalışmayan placeholder gösterme" diyor, bu
yüzden ilk iş kod yazmak değil KARŞILAŞTIRMAK oldu: dokuz alt bölümün
yedisi mevcut modüllerle büyük ölçüde karşılanıyor (ayrıntı: Faz 11
bölümü). Gerçek boşluk ikiydi — gözlem günlüğü (§14.6) ve bilgi
merkezinin sözlük/SSS ayağı (§14.9). İkisi de kapandı (`0064`, `0065`).
Kalanlar envanter tablosundaki `PARTIAL` satırları.

⁷ **Faz 10 kapandı.** Beş tablo (`home_modules`, `hero_slides`,
`nav_links`, `feature_flags`, `site_settings`), değişiklik geçmişi +
geri alma, taslak/önizleme/yayın akışı ve panelin **Site** sekmesi
çalışıyor. §13.2'nin yönetilebilir yüzeyleri —ana sayfa düzeni, hero
slaytları, menü/footer, yedi bayrak, bakım modu, site duyurusu— hem
panelden yazılıyor hem ziyaretçi tarafından OKUNUYOR. Fazın tekrar eden
hatası ("panel yazıyor, ziyaretçi okumuyor") dört turda kapatıldı.

İKİ MADDE BİLEREK YAPILMADI ve ikisi de kapsam dışı sayıldı:
§13.4'ün çoklu admin rolleri **kurulmayacak** (ürün kararı, tek admin —
bkz. görev #73) ve §13.5'in tek ekran dashboard'u PARTIAL kalıyor
(panel sekmeleri var, birleşik özet ekranı yok). Ayrıntı: Faz 10.

⁶ **Faz 9 tamam — ödeme kapalı olduğu için `IMPLEMENTED_DISABLED`.**
§12.2 bu etiketi açıkça öneriyor: "bu faz kod ve test açısından
tamamlanırsa `IMPLEMENTED_DISABLED` olarak raporlanabilir".

Kota ayarları, kademe fonksiyonları, yarış durumuna kapalı fotoğraf
kotası, depolama sayacı, test entitlement'ı, `/uyelik` sayfası ve panel
düğmesi bitti. Ödeme anahtarı KAPALI ve satın alma yüzeyi hiç yok —
devre dışı düğme bile. **Ödeme sağlayıcısı kullanıcı kararıyla
kurulmuyor**; sağlayıcı seçilince yazılacak tek şey webhook.

⁵ **Faz 8'de kodla kapatılabilecek iş kalmadı.** Şema, YouTube OAuth
adaptörü, kota izleme, video arşivi/seri sayfaları, yayın takibi ve
panel TV sekmesi bitti. Kalan tek şey **canlı kanal bağlantısı**
(`IMPLEMENTED_BLOCKED_EXTERNAL`) — gerçek Google OAuth kimliği
gerekiyor. Ayrıntı: Faz 8 bölümü.

⁴ **Faz 7'nin veri ve sunucu katmanı bitti, arayüzü sürüyor.**
Şema (11 tablo), AzuraCast adaptörü, sağlık yoklaması, dağıtım
dosyaları, güvenlik ayarları, yedekleme planı ve program takvimi hesabı
hazır. Canlı yayın aktivasyonu **IMPLEMENTED_BLOCKED_EXTERNAL** — dış
VPS gerekiyor, §10.1 bu durumu açıkça tarif ediyor. Kalan iş kullanıcı
sayfaları ve panel sekmesi. Ayrıntı: Faz 7 bölümü.

³ **Faz 6'da kodla kapatılabilecek iş kalmadı.** Kullanıcı tarafının
altı maddesi, hatırlatmanın on bir maddesinden onu ve yöneticinin yedi
maddesinin hepsi çalışıyor. Kalan tek şey TESLİMAT KANALI: e-posta
sağlayıcısı kararı verilmedi (TOPARLAMA §11, **Sen**) ve web push'u
belgenin kendisi "ileride" diye yazıyor. Mimarinin "Queue → Edge
Function" ayağı da bu karara bağlı — site içi teslimat için gerekmiyor
ve gerekçesi `0049`ün başında yazılı. Ayrıntı: Faz 6 bölümü.

² **Faz 5'in çekirdeği bitti, kenarları duruyor.** Bildirim merkezi,
mesajlaşma ve sosyal graf (takip + engelleme) uçtan uca çalışıyor:
şema + RLS (`0041`–`0044`), servis katmanı, üç yeni ekran ve giriş
noktaları. Kalan iki tablo `collections` (favori/koleksiyon) ve `clubs`
(kulüp/topluluk) — ikisi de §8'in bu bölümünde değil, kendi
bölümlerinde tanımlı ve kendi turlarını hak ediyor. Ayrıntı: Faz 5
bölümü.

¹ **Faz 1'de kodla kapatılabilecek iş kalmadı.** Kalan üç madde ya dış
kaynak ya da bilinçli erteleme: ilçe tohum verisi (resmî TÜİK/NVİ
kaynağı gerekiyor — 973 ilçe adını çevrimdışı üretmek uydurma olurdu),
gerçek cihaz/tarayıcı matrisi (kum havuzunda tek Chromium) ve
`consume_rate_limit`in `app` şemasına taşınması + 129 permissive policy
birleştirmesi (ikisi de Faz 15'e atandı, açık boşluk değil düzen işi).
Otomatik devam turu buradan **Faz 3'e** geçmeli.

## Ürün kararları — belgeden sapılan yerler

Ana görev belgesi bir şey söylüyor, işletme başka bir şey istiyor.
Bunlar hata değil, **kullanıcının verdiği kararlar**; koda geçmeden
önce buraya yazılıyorlar ki sonraki tur "belge böyle diyor" deyip geri
almasın.

### Ödeme sağlayıcısı KURULMAYACAK (kullanıcı söyleyene kadar)

Kullanıcı talimatı: "ödeme sağlayıcısını ben kur diyene kadar şu an
kurma". Faz 9 (üyelik altyapısı) bu sınırla yapılıyor.

**Yapılan:** üyelik kademeleri, kota/hak tanımları, yükseltme-düşürme
kayıtları, yönetici tarafı ve kullanıcıya planını gösteren yüzey.

**Yapılmayan:** Stripe/iyzico/PayTR gibi bir sağlayıcı entegrasyonu,
ödeme SDK'sı, checkout akışı, webhook alıcısı.

Sınır bilinçli bir yerde: ödeme, üyeliğin SEBEBİ değil TETİKLEYİCİSİ.
Üyelik kademesi veritabanında duruyor ve onu değiştiren şey bugün
yönetici, yarın bir ödeme webhook'u olacak. Sağlayıcı seçilince
yazılacak tek şey o webhook — kademe, kota ve yetki mantığı yerinde
duruyor ve değişmiyor.

### Her faz bitince canlıya alınacak

Kullanıcı talimatı: bir faz tamamlandığında `main`'e birleştir ve
canlıya al; oturumun son hâli de canlıya alınacak.

**Vercel'de eski dağıtımların temizlenmesi (son 2 kalacak) YAPILAMIYOR**
ve sebebi ortamda: Vercel CLI kurulu değil, `VERCEL_TOKEN` yok ve
`api.vercel.com` kimliksiz 403 dönüyor. Depo tarafından dağıtım
silmenin bir yolu yok — bu Vercel API'sinden yapılır.

Açmak için gereken: `VERCEL_TOKEN` (ve proje/takım kimliği). O
geldiğinde `GET /v6/deployments` + `DELETE /v13/deployments/{id}` ile
en yeni ikisi dışındakiler silinebilir.

### Radyo ÜÇ şeyi birden yapıyor

Kullanıcının netleştirmesi: radyo hem yöneticinin yüklediği mp3'leri
döngüde çalacak, hem canlı yayın yapacak, hem de podcast'i olacak.
Program takvimi ve podcast arşivi **kalıyor**.

Bu, bir ara "casting yok, sadece mp3 loop" olarak anlaşıldı ve canlı
yayın altyapısını kaldırmak üzereydim. Sormak doğru karardı: kaldırsaydım
`0051`in istasyon/sağlık tabloları, AzuraCast adaptörü ve
`deploy/radyo/` paketi silinecekti — hepsi gerekliymiş.

**Sonuç: hiçbir şey silinmedi**, eksik olan parça eklendi (aşağıda).

### Sitede TEK admin olacak

Çoklu admin rolü, admin kademesi ya da "teknik admin / içerik admini"
ayrımı **kurulmayacak**. Belgede geçen "yalnızca yetkili teknik admin"
(§11.3) gibi ifadeler tek admin varsayımıyla okunacak.

Mevcut yapı zaten buna uygun: `user_roles` tablosunda tek bir `admin`
rolü var ve bütün kapılar `app.is_admin()` üstünden geçiyor. **Yapılacak
iş bir şey EKLEMEMEK** — rol modeli Faz 13'te (yönetim paneli) ele
alınırken kademe icat edilmeyecek.

`moderator` rolü ayrı bir şey ve duruyor: o bir admin kademesi değil,
farklı bir görev (moderasyon kuyruğu). Karar admin rolünün
çoğaltılmamasıyla ilgili.

---

## Bulunan ve kapatılan sessiz hatalar

| Ne | Nasıl bulundu | Nerede |
|---|---|---|
| `0034` göç dosyası depoda yoktu (uzak geçmişte vardı) — sıfırdan kurulumda plate solve cron işi hiç oluşmazdı | Faz 6 için cron kalıbına bakarken `ls` 0033'ten 0035'e atladı | `DATABASE_AND_RLS.md` §Kaybolmuş göç |
| `app.notify` istemciye açıktı — "bildirim üretimi kapalı" kararını boşa çıkarıyordu | Faz 5 sonrası yetki denetimi | `0045` |
| `0044`ün `PUBLIC` revoke'u yetmiyordu; `anon`un açık grant'ı duruyordu | Supabase denetçisi ısrar edince `proacl` okundu | `0046` |
| Etkinlik sayfasında devre dışı "Katıl (üyelik gerektirir)" düğmesi ve "hesap sistemi devreye alınınca açılacak" cümlesi — hesap sistemi çoktan çalışıyordu ve gerçek kayıt kontrolü hemen altındaydı | Faz 6 arayüzünü bağlarken sağ panel okundu | `EventDetailPage.tsx` |
| Etkinlik ÖNE alınınca özel hatırlatma etkinlikten SONRAYA düşüyordu: "15 Eylül'de hatırlat" diyen kullanıcı, etkinlik 5 Eylül'e çekilince on gün sonra "yaklaşıyor" bildirimi alacaktı | Yeniden hesaplama kuralı yazılırken ters yön düşünüldü | `0049` (`event_change_fanout`) |
| **`0063`–`0066` uzak projeye HİÇ uygulanmamıştı** — dosyalar depoda, tablolar canlıda yok. Ziyaretçi bunu görmezdi (hepsi koddaki yedeğe düşüyor) ama hero yönetimi, gözlem günlüğü ve favoriler canlıda çalışmıyordu | `0067`i uygulamadan önce `list_migrations` okundu, son kayıt `0061`de duruyordu | Beşi de (`0062`–`0067`) uygulandı ve `select count(*)` ile ölçüldü |
| **`nav_links` tablosu canlıda vardı ama BOŞTU** — tablo elle açılmış, `0062`nin tohumu hiç çalışmamış. Menü koddaki yedekten çiziliyordu, yani §13.2'nin "menü panelden yönetilir" vaadi canlıda geçersizdi ve kimse fark etmezdi (yedek doğru menüyü gösteriyor) | Aynı denetimde `count(*) = 0` görüldü | `0062` uygulandı: 9 üst menü + 3 footer satırı |

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

> **1 Ağustos turu:** tüketiciler bağlandı. Açık kalan tek madde ilçe
> tohum verisi — resmî kaynak erişimi gerektiriyor (aşağıda gerekçesi).

| Madde | Durum | Kanıt |
|---|---|---|
| 81 il veritabanında | DONE | `0040`; canlıda `count(*) = 81` ölçüldü |
| Modül bazında hardcode kaldırılması | DONE | Konum seçici, ilan formu ve profil düzenleme aynı `provinces` kaynağından; serbest metin şehir alanları kalktı |
| İl–ilçe FK | DONE | `districts.province_code → provinces.code` (restrict) |
| Plaka kodu, Türkçe ad, normalize ad, slug, aktiflik, sıra | DONE | Altı kolon da mevcut |
| Türkçe I/İ/Ş/Ğ/Ü/Ö/Ç arama ve sıralama | DONE | `app.tr_normalize` + istemci `normalizeTr`; 14 il adında birebir eşleşme testi |
| "Diğer" gibi bütünlük bozan seçenek | DONE | Yok |
| Yanlışlıkla silinememe | DONE | `provinces_no_delete` tetikleyicisi; canlıda ölçüldü (silme engellendi, pasifleştirme geçti) |
| Idempotent seed | DONE | `on conflict do update`; migration sonunda 81 doğrulaması |
| 81 il testi | DONE | Migration'ın kendi bloğu + canlı ölçüm |
| Tekrar/eksik kod testi | DONE | Migration slug tekrarında düşüyor |
| E2E: bütün dropdown'larda 81 il | DONE | Ölçüm E2E'de DEĞİL, bileşen testinde: önizleme derlemesinde veritabanı yok, orada seçici tohuma düşer ve E2E ölçütü ölçemez. `LocationPicker.test.tsx` kaynağı taklit edip 81 seçeneği sayıyor; E2E ilan formunun seçiciyi doldurduğunu doğruluyor |
| **İlçe tohum verisi** | **NOT_STARTED** | Bilinçli: 973 ilçe adını çevrimdışı üretmek uydurma riski taşıyor. Tablo+FK+RLS hazır; resmî kaynak (TÜİK/NVİ) erişiminde tek `insert` ile dolar. Arayüzde ilçe seçimi olmadığı için hiçbir akış kırık değil. |

### 1.2 Konum modu durum makinesi — **PARTIAL**

> **1 Ağustos turu:** ters kodlama adapter'ı ve çıkış temizliği kapandı.
> Açık kalan tek madde tarayıcı matrisi — kum havuzunda tek Chromium var,
> gerçek cihaz matrisi `IMPLEMENTED_BLOCKED_EXTERNAL`.

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
| Reverse-geocoding adapter | DONE | `domain/location/geocode.ts`: `ReverseGeocoder` arayüzü + yerel çözücü (81 il, haversine). Dışarıya istek YOK — koordinat kişisel veri ve "sunucuya gönderilmez" sözü var. 250 km eşiği: sınır/VPN'de il adı uydurulmuyor (belgedeki 10. senaryo). 14 test |
| Tarayıcı matrisi (Safari/iOS/Android/Edge) | NOT_STARTED | Kum havuzunda tek Chromium var; gerçek cihaz matrisi IMPLEMENTED_BLOCKED_EXTERNAL |
| Çıkışta konum verisi temizliği | DONE | `features/location/storage.ts` + `AuthContext`; temizlik sunucu çağrısından ÖNCE ve koşulsuz — arkasına konduğunda yapılandırma yokken atlanıyordu |
### 1.3 Supabase şema ve RLS denetimi — **PARTIAL**

Tam ölçüm dökümü: **`docs/DATABASE_AND_RLS.md`**. Özet:

| Madde | Durum | Kanıt |
|---|---|---|
| Bütün kullanıcı verisi tablolarında RLS | DONE | 43 tablodan 42'sinde açık; tek istisna PostGIS'in `spatial_ref_sys`'i |
| Koşulsuz `TO authenticated` politikası | DONE | Canlı sorgu **0 satır** — hepsinde sahiplik ya da rol koşulu var |
| `UPDATE`/`ALL` politikalarında `WITH CHECK` | DONE | Canlı sorgu **0 satır** eksik |
| `anon`'a yazma veren politika | DONE | **0 politika** |
| RLS açık ama politikasız tablo | DONE | Yalnızca `edge_rate_limits`; bilinçli "herkese kapalı" — `anon`/`authenticated` `select` yetkisi de ölçüldü: false |
| `SECURITY DEFINER` fonksiyon denetimi | DONE | Bizim tek fonksiyon `consume_rate_limit`; ACL ölçüldü, istemci rollerinde execute **yok**, `search_path` sabit |
| Privileged fonksiyonun kontrollü şemada olması | NOT_STARTED | `consume_rate_limit` hâlâ `public` içinde; `app`'e taşınacak (Faz 15) — açık boşluk değil, düzen işi |
| Belgedeki alan modeliyle karşılaştırma | DONE | 18 tablo mevcut, **20 tablo eksik**; her biri kendi fazına atandı (DATABASE_AND_RLS §Şema boşluğu) |
| `spatial_ref_sys` yazma yetkisi | IMPLEMENTED_BLOCKED_EXTERNAL | `revoke` `postgres` ile sessiz no-op (4→4 ayrıcalık ölçüldü); `supabase_admin` gerekiyor |
| `multiple_permissive_policies` (129) | PARTIAL | Performans uyarısı, güvenlik açığı değil; `OR` birleştirme kapsam genişletme riski taşıdığı için tablo tablo yapılacak (Faz 15) |
| `unindexed_foreign_keys` (31) | PARTIAL | Dolu tablodakiler `0039`'da kapandı; kalanlar boş tablolarda |

Eksik 20 tablo Faz 5, 6, 7, 8, 9, 10 ve 16'nın girdisidir; o fazlarda
RLS'leriyle birlikte oluşturulacak.

---

## Faz 2 — ayrıntı

Tam döküm: **`docs/DESIGN_SYSTEM.md`**.

### 2.1 Design token sistemi — **DONE**

Sisteme token eklemek değil, token'ın etrafından dolaşmayı imkânsız
kılmak gerekiyordu. Ölçülen kaçaklar: `text-[12px]` 113 yerde,
`text-[13px]` 50, `text-[12.5px]` 41, `rounded-[2px]` 21.

| Madde | Durum | Kanıt |
|---|---|---|
| Font ailesi (en fazla bir ana aile) | DONE | Inter tek aile; mono yalnızca gösterge sayısında |
| Başlık ve gövde tipografi ölçeği | DONE | 6 rol sınıfı (`type-hero`…`type-panel`), kırılma noktası sınıfın içinde |
| Font ağırlıkları, satır yükseklikleri | DONE | Her punto token'ı kendi `--line-height`ını taşıyor |
| Renk, yüzey, arka plan seviyeleri | DONE | 3 yüzey + 3 metin kademesi, üç temada da AA |
| Spacing, container genişlikleri | DONE | `--spacing-content`, `--spacing-shell` |
| Radius ölçeği | DONE | Tek değer (2px) — bilinçli; serbest radius sayısı **0** |
| Border kuralları | DONE | `--color-border` / `--color-border-strong` |
| Shadow seviyeleri | DONE | Tek yükselti kademesi (`--shadow-overlay`), temaya göre çevriliyor; üç açılır liste üç ayrı gölge kullanıyordu |
| Breakpoint'ler | DONE | Tailwind varsayılanı — bilinçli, belgede yazılı |
| İkon boyutları | DONE | 3 kademe |
| Form alanı boyutları | DONE | 3 kademe + `--spacing-touch-min` 44px |
| Button / Badge varyantları | DONE | 4 varyant × 3 ölçü · 6 ton |
| Status renkleri | DONE | success / warning / danger |
| Skeleton, loading, empty, error | DONE | `ContentCardSkeleton`, `EmptyState`, `Alert`, `RouteFallback` |
| Modal, drawer, popover, tooltip kuralları | PARTIAL | Katman sırası ve yükselti token'landı, üç açılır liste hizalandı; **`Tooltip` bileşeni yok** — §5.4 "tooltip'e taşınmalı" sınıfı için gerekecek, Faz 11'de |
| Focus, hover, active, disabled, selected | PARTIAL | Focus halkası global, hover/disabled `Button`da, kartta `focus-visible`; `selected` durumu için ortak bir kural yok |
| Serbest punto/radius kaçağı | DONE | Sitede **0** — `designSystem.test.ts` kapıyı tutuyor |

### 2.2 Birleşik kart sistemi — **DONE**

Kart kökü **11 dosyada birebir** kopyalanmıştı; kart görselleri **6 ayrı
orandaydı**; **hiçbir kartın yükleme iskeleti yoktu.**

| Madde | Durum | Kanıt |
|---|---|---|
| Tek `ContentCard` ailesi | DONE | 11 modül geçti; kaynak taraması kopya kök bulmuyor |
| Standart görsel oranı | DONE | 6 → 3 (`standard`/`square`/`wide`), her birinin yazılı gerekçesi var |
| Aynı radius, border, shadow | DONE | Kök tek yerde (`CARD_ROOT`) |
| Ortak başlık ve metadata alanları | DONE | `ContentCardTitle` / `ContentCardMeta` |
| Ortak aksiyon bölgesi | DONE | `ContentCardActions`, `mt-auto` ile hizalı |
| Ortak hover/focus davranışı | DONE | Kökte; `focus-visible:border-primary` |
| Ortak skeleton | DONE | `ContentCardSkeleton` kartın kendi sabitlerini kullanıyor |
| Ortak boş ve kırık görsel fallback'i | DONE | `RemoteImage` üç duruma dayanıklı → `StarField` |
| Uzun başlık taşma kuralları | DONE | `lines={1\|2}`, iki satırda yer **önceden** ayrılıyor |
| Masaüstü/mobil tutarlı yükseklik | DONE | `CardGrid` `auto-rows-fr` + kart `h-full` |
| İçerik tipini gösteren tutarlı badge | DONE | `PlateFrame` rozet yuvası |
| Dağılmayı engelleyen kapı | DONE | Kaynak taraması: kopya kök + kayıt dışı oran |

### 2.3 Alan kullanımı — **DONE**

`scripts/check-viewports.mjs` 11 çözünürlüğü gerçek tarayıcıda ölçüyor.

| Madde | Durum | Kanıt |
|---|---|---|
| 11 çözünürlükte ölçüm aracı | DONE | `npm run check:viewports` |
| Yatay taşma | DONE | 320×568'de 9px taşıyordu (künye 143 + aksiyon 158 > kapsayıcı 288); kelime markası 360px altında düşüyor |
| Dokunmatik hedefler | DONE | `check:a11y` zaten ölçüyor: ikon ≥44px, diğer ≥24px |
| Gereksiz üst bilgi şeritleri | DONE | Hero dikey dolgusu alındı |
| **1280×720 / 1366×768'de fold üstü içerik** | DONE | Faz 3.1'de kapandı: içerik 779px → 583px. Kapı 2 sayfa × 11 çözünürlükte geçiyor |
| Büyük ekranda aşırı yayılma | DONE | `--spacing-content` 1520px; 2560px'te içerik sütunu 1424px'te duruyor (ölçüldü) |
| `check:viewports` kapı zincirinde | DONE | `test:all` içinde |

### 2.4 Gereksiz açıklama metinleri — **DONE**

36 başlık/açıklama çifti §5.4'ün altı sınıfına göre tek tek
değerlendirildi.

| Madde | Durum | Kanıt |
|---|---|---|
| Başlığı tekrar eden açıklamalar | DONE | 4 tanesi kaldırıldı (Astrofotoğrafçılar, Popüler Hedefler, Benzer Fotoğraflar, {katalog} Fotoğrafları) |
| Kartların gösterdiğini tekrar edenler | DONE | 4 tanesi kısaltıldı (Karanlık Gökyüzü, Son İlanlar, Yaklaşan Etkinlikler, Hesabım) |
| Astronomi terimi yardım metinleri korundu | DONE | Hesaplayıcılar, gece planı, forum, hukuki uyarılar dokunulmadı |
| "Tooltip'e taşınmalı" sınıfı | NOT_STARTED | `Tooltip` bileşeni yok; bu sınıfa giren metin de çıkmadı — gerekirse Faz 11 |

---

## Faz 3 — ayrıntı

### 3.1 Navbar üzerindeki hava durumu — **DONE**

| Madde | Durum | Kanıt |
|---|---|---|
| Tekrar eden hava şeridi kaldırıldı | DONE | `StatusBar.tsx` silindi; kabuk 88px → 56px |
| Aynı veri "Bu Gece"de | DONE | Bulut ve seeing orada, çizelgeyle birlikte |
| Gereksiz ağ isteği | DONE | `useSkyConditions` kabuktan çıktı; hava ile ilgisi olmayan sayfalar artık istek kurmuyor |
| Navigasyon hiyerarşisi | DONE | Tek yatay şerit kaldı |
| Konum erişimi korundu | DONE | Üst çubukta (≥sm) ve çekmecede (<sm) |

### 3.2 Boş fotoğraf modülü — **PARTIAL**

`ContentSelection` artık bir `status` alanı taşıyor
(`loading` / `ready` / `error`). Asıl kazanım: sorgu sonuçlanana kadar
**tohum listesi çiziliyordu**, yani kullanıcı bir an kurgu fotoğrafları
gerçek sanıp sonra hepsinin değiştiğini görüyordu.

| Belgedeki durum | Durum | Nerede çözülüyor |
|---|---|---|
| Gerçekten içerik yok | DONE | Otoriter boş sonuç → çağrılı boş durum |
| Veri yükleniyor | DONE | `status === 'loading'` → `ContentCardSkeleton`, ızgara sınıfı gerçek listeyle aynı (CLS yok) |
| İstek hata verdi | DONE | `status === 'error'` → `Alert` + "Yeniden dene"; tohum listesi ÇİZİLMİYOR |
| Görsel dosyası bulunamadı | DONE | `RemoteImage` yıldız alanına iniyor — kırık görsel ikonu hiç çıkmıyor |
| İçerik moderasyonda | DONE | Satır sorgudan zaten dönmüyor (RLS + `status` filtresi); modül için "içerik yok"tan farksız |
| Modül admin tarafından kapalı | DONE | `home_modules.enabled`; `toHomeLayout` süzüyor, `HomePage` yalnızca gelen modülleri çiziyor (Faz 10'da kapandı, satır bayattı) |
| Boşsa otomatik gizlenme | DONE | `home_modules.hide_when_empty` → `HomePage` → `RecentRecords hideWhenEmpty`. Varsayılan hâlâ KAPALI ve gerekçesi duruyor: galeri sitenin çekirdek içeriği, boş olması ilk yükleyecek kişi için fırsat. Artık bu bir TERCİH, panelden çevriliyor (Faz 10'da kapandı, satır bayattı) |
| E2E doğrulaması | NOT_STARTED | Durum ayrımı 10 birim testiyle ölçülüyor; E2E'de yükleme/hata durumunu üretmek ağ kesintisi taklidi gerektiriyor |

**Kendi testimin yakaladığı hata:** ilk yazımda boş-durum dalı hata
dalının ÜSTÜNDEYDİ; okuma düştüğünde kullanıcıya "henüz fotoğraf yok"
deniyordu. Yanlış bilgi, sessiz boşluktan kötü. Sıra düzeltildi.

### 3.3 Hero banner — **PARTIAL** (yönetim maddesi Faz 10'da kapandı)

| Madde | Durum | Kanıt |
|---|---|---|
| Kontroller metnin üzerine gelmiyor | DONE | Ölçüldü: sol ok HER genişlikte `<h1>`e biniyordu (320px'te 36×19, 1920px'te 8×44). Metne güvenli alan verildi; kural `check:viewports`ta ve kaldırıldığında düşüyor (kanıtlandı) |
| Metin için güvenli içerik alanı | DONE | `sm:pl-16 lg:pl-20` — ok 56px'te bitiyor, metin 64px'ten başlıyor |
| Oklar kenar güvenli alanında | DONE | `left-3`/`right-3`, 44×44 |
| Mobilde swipe | DONE | 48px eşikli dokunma kaydırması, 3 test; eşik dikey kaydırmanın doğal yatay salınımını (20–30px) eliyor |
| Mobilde okların kaldırılması | DONE | `hidden sm:flex` — 320px'te iki ok metin sütununun %28'ini yiyordu |
| Klavye ile kontrol | DONE | Sol/sağ ok tuşları |
| Erişilebilir isimler | DONE | `aria-roledescription="carousel"`, göstergeler gerçek `tab` |
| `prefers-reduced-motion` | DONE | Otomatik geçiş hiç kurulmuyor; test var |
| Hover/focus sırasında pause | DONE | Ayrı `hovered` durumu |
| **Otomatik geçişi durdurma** | DONE | `aria-pressed` taşıyan düğme; kullanıcının kararı `hovered`dan AYRI tutuluyor — tek değişken olsaydı fare çekilince gösteri yeniden başlar, düğme çalışmıyormuş gibi görünürdü (test var) |
| Hero ana içeriği aşağı itmiyor | DONE | `check:viewports` 2 sayfa × 11 çözünürlükte geçiyor |
| Görsel–metin kontrast kontrolü | NOT_STARTED | Perde var ama ölçülmedi; fotoğraf değişken olduğu için statik ölçüm yetmez, örnekleme gerekiyor |
| **Admin'den yayın tarihi, sıra, odak noktası, metin hizası, CTA** | DONE | `0063` + `heroSlides.ts` + panel bölümü. Yayın penceresi RLS'te; odak `object-position`a, hiza sütun sınıfına bağlandı |
| Slider gerçekten gerekli mi | NOT_STARTED | Beş slaytın etkileşim verisi yok; ölçmeden tek hero'ya indirmek tahmin olur |

**Kendi eklediğim regresyon, kendi kapımla yakalandı:** durdurma düğmesi
mobilde CTA'nın altına bindi — §6.3'ün yasakladığı şeyi bu sefer ben
yaptım. Kapı görmedi çünkü seçicisi yalnızca okları kapsıyordu; metin
seçicisi de İKİ KEZ yanlıştı (`h1 ~ * p` kardeş değil,
`h1.closest('div')` yalnızca `Editable` sarmalayıcısı) ve sessizce
yarım ölçüyordu. Üçü de düzeltildi; kural artık carousel bölgesindeki
her düğmeyi ve her metni kapsıyor.

### 3.4 "Bu Gece" astronomi hava modülü — **PARTIAL**

> **1 Ağustos turu:** 18 zorunlu alanın 18'i de dolu. Kalan maddeler
> yalnızca `site_settings`/`home_modules` tablolarına (Faz 10) ve URL'ye
> yazılacak konuma bağlı.

Belgenin zorunlu tuttuğu 18 bilgi alanı tek tek karşılaştırıldı.

| # | Alan | Durum | Nerede |
|---|---|---|---|
| 1 | Seçili konum | DONE | `LocationPicker` panel içinde |
| 2 | Tarih | DONE | Gece seçici + "Bu gece" |
| 3 | Gün batımı / doğumu | DONE | `NightTimelineChart` ekseninin iki ucu |
| 4 | Astronomik alacakaranlık başlangıç/bitiş | DONE | "Karanlık penceresi" okuması |
| 5 | Ay doğuş / batış | DONE | Ay kartı ipucu |
| 6 | Ay fazı ve aydınlanma | DONE | Ay kartı + `MoonDisc` |
| 7 | Sıcaklık | DONE | **Yeni** sıcaklık kartı |
| 8 | Hissedilen sıcaklık | DONE | **Yeni** — `apparent_temperature` |
| 9 | Nem | DONE | Çiylenme kartı ipucu |
| 10 | Çiy noktası ve yoğuşma riski | DONE | Çiylenme kartı + `dewRisk` |
| 11 | Rüzgâr ve hamle | DONE | **Yeni** rüzgâr kartı — veri çekiliyordu ama panelde HİÇ görünmüyordu |
| 12 | Yağış ihtimali | DONE | **Yeni** — bulut kartı ipucunda |
| 13 | Görüş mesafesi | DONE | `layers.visibilityKm` |
| 14 | Genel bulut örtüsü | DONE | Bulut kartı, sol sütunda ana metrik |
| 15 | Alçak/orta/yüksek bulut | DONE | Bulut kartı ipucu |
| 16 | Seeing | DONE | Seeing kartı + `estimateSeeing` |
| 17 | **Transparency** | **DONE** | Önceki gerekçe doğruydu ama eksikti: AOD tahmin ucunda yok, HAVA KALİTESİ ucunda var ve o uç da anahtarsız. `features/weather/airQuality.ts` — 5 kademe + zenit kadir kaybı. Canlı uçtan ölçüldü (1 Ağustos, Ankara: AOD 0.15 → "Berrak", ~0.16 kadir). Ölçüm gelmezse `null` ve skora HİÇ girmiyor; nemden türetilmedi. CSP'ye ayrı host eklendi |
| 18 | Gözlem / astrofotoğraf uygunluk skoru | DONE | `nightScore(inputs, profil)` — gözlem `{seeing .45, konfor .15, karanlık .40}`, astrofoto `{.35, .40, .25}`. Ayrım gerçek: astrofotoda rüzgâr HAMLESİ kullanılıyor (poz birikimli), gözlemde ay cezası ağır (gözün eşiği yok, dar bant gözle çalışmaz). Öneri satırı da profile göre değişiyor. Panelde halka gözlem, altında astrofotoğraf satırı |

**Tarih kontrolleri**

| Madde | Durum |
|---|---|
| Tek sol/sağ ok — bir gün | DONE |
| Çift ok — bir hafta | DONE |
| Manuel tarih seçici | DONE — yerel `<input type="date">`, sınırlar ufuktan |
| "Bugün" kısayolu | DONE — "Bu geceye dön" |
| Klavye erişimi | DONE (düğmeler) |
| Tahmin ufku dışında sahte veri göstermeme | DONE — `FORECAST_DAYS = 16`, ötesinde açıkça "hava verisi yok" |
| Tarih değişince konumu kaybetmeme | DONE |
| URL ile paylaşılabilir tarih | DONE — `?gece=2026-08-08`; offset DEĞİL tarih yazılıyor ki bağlantı ertesi gün başka geceyi göstermesin. Tarayıcıda gidiş-dönüş doğrulandı |
| URL ile paylaşılabilir konum | DONE — `?sehir=ankara`. **Koordinat DEĞİL şehir slug'ı** yazılıyor; cihaz konumu paylaşılamıyor ve düğme sebebini söylüyor (`locationShare.ts`, 12 test) |
| Europe/Istanbul + seçili konum zaman dilimi | DONE — gece tarihi IANA diliminde kuruluyor |

**Sağlayıcı katmanı**

| Madde | Durum |
|---|---|
| Adapter katmanı | DONE — meteoblue + Open-Meteo, ortak `SkyConditions` |
| Hata fallback'i | DONE — meteoblue düşerse Open-Meteo |
| Veri kaynağı görünürlüğü | DONE — `source` arayüzde |
| Cache | DONE — 15 dk, `retry` önbelleği atlıyor |
| Rate limit | DONE — meteoblue vekilinde |
| Sağlayıcı seçiminin admin ayarından değişmesi | DONE — `app_settings.weather_provider` (`0068`); panelde **Hava servisi** bölümü. İki seçenek: `auto` ve `open-meteo`. "Yalnızca meteoblue" bilerek YOK (gerekçe aşağıda) |
| Veri kaynağı ZAMANI görünürlüğü | DONE — panel başlığında "HH:MM güncellendi" olarak duruyor (`DecisionColumn`); durum kaydı bayattı, kod ölçülünce görüldü |

### Faz 3'ün son iki maddesi — Faz 10 açtı, bu tur kapattı

**Sağlayıcı seçimi: iki seçenek var, üç değil.** İlk tasarımda `auto`,
`meteoblue`, `open-meteo` düşünüldü. `meteoblue` ELENDİ çünkü `auto`dan
farkı yoktu — otomatik mod zaten meteoblue varsa onu kullanıyor. Farkı
olmayan bir seçenek, panelde bir şey yapıyormuş gibi duran bir kontrol
demekti.

**"Yalnızca meteoblue" seçeneği de bilerek YOK ve sebebi asimetrik:**
Open-Meteo her koşulda çağrılıyor (seeing hesabının ihtiyaç duyduğu
200/500 hPa rüzgârını yalnızca o veriyor), yani `open-meteo` seçmek
paneli boş bırakmıyor. Tersi tehlikeliydi — vekil düşerse ayar yüzünden
hiçbir ziyaretçi hava verisi göremez ve düzeltmenin tek yolu panele
girmek olurdu.

`open-meteo` seçilince meteoblue isteği **hiç kurulmuyor**, `catch` ile
yutulmuyor: ayarın sebebi maliyet (anahtar kredili) ve arıza kaçışı;
isteği atıp sonucu atmak ikisini de çözmezdi. Önbellek anahtarı da
sağlayıcıyı taşıyor — yoksa ayar değişir, sayılar değişmez ve ayarın
çalışmadığı sanılırdı.

**Paylaşılabilir konum: koordinat değil ŞEHİR SLUG'I.** `?enlem=&boylam=`
çalışırdı ve yanlış olurdu: cihaz konumu kullanan biri "bu geceye bak"
diye bağlantı gönderdiğinde bahçesinin GPS'ini de göndermiş olurdu.
`?sehir=ankara` paylaşılan şeyi kişisel bir konumdan herkese açık bir
referansa çeviriyor. `planShare.ts` aynı kararı gece planı için zaten
vermişti; bu ikinci yer.

Sonuç: **cihaz konumu paylaşılamıyor** ve arayüz düğmeyi gizlemek yerine
sebebini yazıyor — sessizce çalışmayan bir düğme, açıkça çalışmayan bir
düğmeden kötü.

Adresteki şehir **bir kez** uygulanıyor (`useRef` kilidi). Kilit şart:
il listesi asenkron geliyor ve effect ikinci kez çalışıyor; kilit
olmasaydı bağlantıyı açıp sonra başka şehir seçen kullanıcı liste
yüklenince adresteki şehre geri atılırdı.

**İki bayat satır da düzeltildi:** "modül admin tarafından kapalı" ve
"boşsa otomatik gizlenme" Faz 10'da kapanmıştı ama durum kaydı
güncellenmemişti. Kod okundu, `home_modules.enabled` ve
`hide_when_empty` gerçekten `HomePage`e bağlıydı.

---

## Faz 4 — ayrıntı

**Ölçülen başlangıç durumu:** on liste sayfası, her biri kendi `useState`
filtre durumuyla. Hiçbiri URL'ye yazmıyor, hiçbirinde debounce yok,
sıralama yalnızca üçünde, aktif filtre chip'i ve "hepsini temizle"
hiçbirinde yok.

### Çekirdek — **DONE**

`src/features/explorer/query.ts` saf (React yok, URL yok) ve 31 testle
ölçülüyor; `useExplorer.ts` URL'ye bağlıyor, 7 testle.

| Yetenek | Durum | Not |
|---|---|---|
| Tam metin arama | DONE | |
| Türkçe normalize arama | DONE | `normalizeTr` tek kaynağa indi — ÜÇ kopyası vardı; kural `app.tr_normalize` ile aynı |
| Debounce | DONE | 250 ms; kutu anında, sorgu gecikmeli |
| Sonuç sayısı | DONE | `total` sayfalama öncesi |
| Arama terimini temizleme | DONE | |
| Faceted filtreler + her facet için sayı | DONE | Sayım o facet'in kendi seçimi hariç — yoksa kullanıcı seçimini değiştiremez |
| Çoklu seçim | DONE | Facetler arası VE, değerler arası VEYA |
| Aktif filtre chip'leri | DONE | Motor üretiyordu, HİÇBİR SAYFA ÇİZMİYORDU — tek tüketici testlerdi. `ActiveFilters` yazıldı ve on sayfaya bağlandı; arama terimi de chip |
| Tek tek / tümünü temizleme | DONE | "Tümünü temizle" sıralamayı KORUYOR |
| Filtrelerin URL'ye yazılması | DONE | Varsayılanlar yazılmıyor, yabancı parametre korunuyor |
| Geri/ileri tarayıcı davranışı | DONE | Durum URL'de olduğu için bedava |
| Sayfalama | DONE (istemci) | Aralık dışı sayfa son sayfaya çekiliyor |
| Türkçe alfabetik sıralama | DONE | `Intl.Collator('tr')`; yerelsiz `localeCompare` Ç'yi C'den önce koyuyor (ölçüldü) |
| Null değerlerin kontrollü konumu | DONE | Eksik sayısal değer sona; sıfır sayılmıyor |
| Loading / empty / error | DONE | `ContentSelection.status` (Faz 3.2) |

### Geçiş — **DONE · 10/10**

`adoption.test.ts` sayaç olarak başladı (borç ne saklanabilir ne
büyüyebilirdi), liste boşalınca kapıya dönüştü: kendi filtre durumunu
kuran YENİ bir sayfa artık düşer.

| Sayfa | Not |
|---|---|
| Galeri | ASCII katlama kazandı ("nevsehir" → Nevşehir) |
| Topluluklar | — |
| Saha | HİÇ filtre yoktu; arama + Bortle facet'i + dört sıralama geldi |
| Pazaryeri | Şehir filtresi geldi — ikinci elde elden teslim yaygın |
| Haberler | Kategori paylaşılabiliyor; **arama kutusu 1 Ağustos'ta geldi** — motor destekliyordu, sayfada arayüzü yoktu |
| Yazılar | Seviye + kategori paylaşılabiliyor; **arama kutusu 1 Ağustos'ta geldi** — motor destekliyordu, sayfada arayüzü yoktu |
| Ekipman | **Kısmi ve bilerek**: kategori rota yolunda (`/ekipman/montur`) ve o rotalar prerender ediliyor; sorgu parametresine taşımak verilmiş bağlantıları kırardı. Explorer kategorinin üstünde çalışıyor |
| Etkinlikler | Belgenin istediği gelecek/geçmiş süzgeci geldi; kıyas anı değil GÜNÜ alıyor |
| **Hedefler** | Alaka sıralaması motora eklendikten SONRA taşındı — naif taşıma "m31" aramasında tam eşleşmeyi ilk sıradan düşürürdü |
| **Forum** | Sabitlenmiş konular her sıralamada üstte kalacak şekilde taşındı; bu bir sıralama tercihi değil moderasyon kararı. Dört sıralamada tarayıcıda ölçüldü |

Motora geçiş sırasında eklenen iki yetenek:

| Yetenek | Sebep |
|---|---|
| Boşluk duyarsız arama | Katalog kodları hem "M 31" hem "M31" yazılıyor. Tek başına boşluksuz karşılaştırma yetmiyor — "orion bulutsu" kırılırdı; iki yol birlikte çalışıyor |
| Alaka sıralaması (`relevance`) | Yalnızca arama varken devrede; eşit alakada kullanıcının seçtiği sıralama geçerli |

> **1 Ağustos turu:** mobil çekmece kapandı, aktif filtre chip'leri
> arayüze bağlandı, Haberler ve Yazılar'a arama kutusu geldi. Kalanlar
> tablo görünümü yetenekleri, kaydedilmiş görünümler (tablo gerekiyor)
> ve sunucu tarafı arama.

### Kapsam dışı kalanlar

| Madde | Durum | Sebep |
|---|---|---|
| **Server-side arama/filtre/sayfalama** | NOT_STARTED | Kataloglar bugün tamamı belleğe inen listeler (tohum dizisi ya da birkaç yüz satır); sunucu tarafı sayfalama veri hacmi onu gerektirdiğinde açılır. `ExplorerQuery` sayfa ve sayfa boyutu taşıdığı için ŞEKLİ hazır, ama bugün çalışan şey istemci tarafı ve rapor bunu böyle söylüyor |
| İl/ilçe filtresi | DONE'a yakın | 974 ilçe koordinatlarıyla `districts` tablosunda (`0071`, GeoNames ADM2 / CC BY 4.0); konum seçici iki kademeli. Kalan: explorer facet'i olarak ilçe süzgeci ve cihaz konumunun ilçe adıyla etiketlenmesi |
| Takip edilenler | DONE | `useFollowingIds` + `personalFacet`; galeride "Takip ettiklerim" süzgeci. Oturumsuzda ve küme yüklenirken facet HİÇ çizilmiyor |
| Favoriler | DONE | `useSavedPhotoIds` + `personalFacet`; galeride "Kaydettiklerim" süzgeci. Sınıra dayanırsa `truncated` ile SÖYLENİYOR — sessiz kırpma yok |
| Onay/yayın durumu, premium görünürlük | NOT_STARTED | Faz 9/10 |
| Kaydedilmiş görünümler, kullanıcı varsayılanı, admin paylaşılan görünümü | DONE | `saved_views` (`0069`) + `SavedViewsMenu`; galeride bağlı. Varsayılan kısmi tekil indeksle zorlanıyor ve `set_default_view` RPC'siyle TEK transaction'da atanıyor. `is_shared` kullanıcıya kapalı — kural bir tetikleyicide, çünkü RLS satıra izin verir SÜTUNA değil |
| CSV dışa aktarma (yalnız admin) | DONE | `lib/csv.ts` + `CsvExportButton`; galeride bağlı. RFC 4180 + BOM (Excel Türkçe harfleri bozmasın) + **formül enjeksiyonu koruması**. Yönetici değilse düğme HİÇ çizilmiyor |
| Sütun SIRASI (sürükle-bırak) | NOT_STARTED | Göster/gizle geldi; sıra değiştirme ayrı bir etkileşim (sürükleme + klavye alternatifi) ve tek başına bir tur |
| Mobil filtre drawer'ı | DONE | `FilterBar`ın kendi içinde: ayrı bir bileşen "tutarsız filtre bileşeni üretme" yasağını çiğnerdi. Çocuklar TEK KEZ çiziliyor (çift `id` olmasın); prerender'da masaüstü varsayılıyor. Odak tuzağı, Escape, gövde kilidi, aktif filtre rozeti. 11 birim + 1 E2E (390px ve 1280px'te gerçek tarayıcıda) |
| Tablo görünümü (sütun göster/gizle, yoğunluk, sabit başlık, başlıktan sıralama) | DONE | `DataTable` vardı ama HİÇBİR SAYFA KULLANMIYORDU (tek eşleşme kendi dosyası). Sıralama motorun `sort` değerine yazılıyor — tablo kendi durumunu tutsaydı ızgaraya geçen kullanıcı sıralamasını kaybederdi. Sabit başlık + sabit ilk sütun, yoğunluk, sütun göster/gizle (`localStorage`), mobilde etiket-değer kartı. Pazaryerinde üçüncü görünüm olarak bağlı. 12 birim + 1 E2E |
| Harita / takvim / zaman çizelgesi görünümleri | PARTIAL | `EventMapPage` ve `EventCalendar` ayrı sayfa olarak var; explorer'ın görünüm seçeneği değiller |
| Görünüm tercihinin hesapta saklanması | DONE | `ui_preferences` (`0070`) + `preferenceStore` defteri. `localStorage` ilk kare, hesap gelince gerçek kaynak. Tasarım sistemi ürün katmanına BAĞLANMADI — gerekçe aşağıda |

### Görünüm tercihi hesapta — ve tasarım sistemi ürün katmanına bağlanmadan

`useStoredChoice` bir TASARIM SİSTEMİ kancası (`components/ui`); hesapta
saklama Supabase ve oturum gerektiriyor, yani `features/`e ait. Kancanın
oradan içe aktarma yapması, okun ters yöne bakması demekti —
`components/ui` tek başına test edilemez hâle gelirdi.

Çözüm bir KAYIT DEFTERİ (`preferenceStore.ts`): React'siz, Supabase'siz,
yalnızca bir kayıt noktası. Ürün katmanı (`UiPreferencesProvider`)
kendini oraya yazıyor, kanca yalnızca deftere bakıyor. Adaptör
kaydedilmemişse — testlerde, önizleme derlemesinde, oturumsuz
kullanıcıda — her şey `localStorage` ile çalışmaya devam ediyor ve
kancada "hesap var mı" diye bir dal yok.

**Sıra: yerel ilk kare, hesap gerçek kaynak.** `localStorage` anında
okunuyor (titremesiz), hesap satırı bir ağ turu sonra üstüne yazıyor.
Bedeli, iki seçim farklıysa bir karelik bir değişim; kazancı,
"masaüstünde tabloya geçtim, telefonda da tablo görüyorum". Ters sıra
özelliği anlamsız kılardı: telefondaki seçim masaüstüne hiç ulaşmazdı,
çünkü orada zaten bir yerel değer var.

**Kullanıcının o oturumda yaptığı seçim korunuyor:** ağdan gelen satır
`cache.has` kontrolüyle üstüne yazmıyor. Yazma da önce belleğe gidip
aboneleri uyandırıyor, sonra ağa; aksi hâlde defter eski değeri döndürür
ve "hesap kazanır" etkisi kullanıcının seçimini GERİ ALIRDI.

Çıkışta defter temizleniyor (`setPreferenceAdapter(null)`): bir sonraki
kullanıcıya önceki hesabın tercihleri sızmamalı.

`profiles`a `ui_prefs jsonb` sütunu eklenmedi: o satır kullanıcının
KİMLİĞİNE dair. Her görünüm değişikliğinde profil satırını yazmak
`updated_at`i anlamsızca kaydırır ve "ızgaradan listeye geçtim" profil
güncellemesiyle aynı denetim izine karışırdı.

### CSV dışa aktarmanın gerçek riski biçimlendirme değil

Excel ve LibreOffice `=`, `+`, `-`, `@` ile başlayan hücreyi FORMÜL
sayıyor. Kullanıcı adı `=HYPERLINK("http://…")` olan biri varsa, o
satırı dışa aktaran YÖNETİCİ dosyayı açtığında hücre çalışıyor —
saldırı kullanıcıdan yöneticiye, veri yoluyla geçiyor. `csvCell` böyle
hücrelerin başına tek tırnak koyuyor; tırnak görünen değeri bozmuyor
ama formül olmasını engelliyor.

BOM da standart dışı ama gerekli: BOM'suz bir CSV'yi Excel sistem kod
sayfasıyla açıyor ve "Çankırı" → "Ã‡ankÄ±rÄ±" oluyor.

Düğme yönetici değilse HİÇ çizilmiyor — devre dışı bir düğme, sıradan
kullanıcıya erişemeyeceği bir yetenek göstermek olurdu. Ama bu bir
ARAYÜZ kararı, yetki kontrolü değil: gerçek koruma RLS'te ve dışa
aktarılan satırlar zaten kullanıcının görebildiği satırlar.

`downloadText` `ics.ts`ten `lib/download.ts`e TAŞINDI: indirme işleminin
RFC 5545 ile ilgisi yok ve CSV ikinci çağıran olunca seçenek ikiydi —
kopyalamak ya da taşımak.

### Kaydedilmiş görünümler — üç madde, tek tablo (`0069`)

**Saklanan şey JSON değil ADRES PARÇASI.** `{"q":…,"facets":…}` gibi bir
jsonb düşünüldü ve yapılmadı: explorer'ın tek kaynağı zaten adres
çubuğu. İkinci bir gösterim, iki tarafın ayrışabileceği bir yer açardı —
bir facet eklendiğinde jsonb şeması da güncellenmeli, unutulursa
kaydedilmiş görünüm sessizce eksik uygulanırdı. Yan fayda: `parseQuery`
bilinmeyen parametreyi zaten sessizce düşürüyor, yani bir facet
kaldırılırsa eski kayıt patlamıyor.

**`is_shared` kullanıcının yazabileceği bir alan değil.** "Admin
paylaşılan görünümü" maddesi yöneticinin bir görünümü herkese açması
demek; satırın sahibi kullanıcı ama bu bayrağı çeviremiyor. Kural bir
TETİKLEYİCİDE, politikada değil — **RLS satıra izin verir, SÜTUNA
değil**: "kendi satırını yazabilir ama bu sütununu yazamaz" politikayla
ifade edilemiyor.

**Varsayılan tekil ve bu sefer tekillik ZORLANABİLİYOR.** `nav_links` ve
`hero_slides`ta sıra benzersizliği bilerek zorlanmamıştı: panel iki
satırı iki ayrı transaction'da takas ediyor ve birinci yazma
reddediliyordu. Burada durum farklı — varsayılan değiştirmek bir takas
değil, "eskisini bırak yenisini al" ve `set_default_view` ikisini tek
transaction'da yapıyor. Kısmi tekil indeks o yüzden güvenli.

RPC `security invoker`: RLS hâlâ geçerli, yani başkasının görünümünü
varsayılan yapmaya çalışan kullanıcı sıfır satır günceller. `definer`
yazsaydık o kapı açılırdı.

**Varsayılan görünüm AÇIK BİR BAĞLANTIYI EZMİYOR.** Maddenin en kolay
yanlış uygulaması "sayfa açılır açılmaz varsayılanı uygula" olurdu;
sonuç, birinin paylaştığı `?ara=m31` bağlantısını açan kullanıcının
kendi varsayılanına ışınlanması olurdu. Hiyerarşi `?sehir=` ve
`planShare` ile aynı: **ADRES → KİŞİSEL TERCİH → VARSAYILAN**.

Ölçüm bloğu ilk yazımda İKİ `do $$` bloğuna bölünmüştü ve birincinin
`exception` dalı bütün bloğu geri alıyordu — ikinci blok, birincinin
kurduğu kullanıcıları bulamıyordu. Beklenen hatalar artık iç
`begin … exception` alt bloklarında yakalanıyor.

### Kişisel facet'ler — "veri var, arayüz okumuyor"un dördüncü örneği

`collections` ve `follows` Faz 5'te gelmişti; kullanıcı fotoğrafı
kaydediyor, birini takip ediyor ve sonra galeride **onlara göre
süzemiyordu**. Faz 10'un dört kez çıkan hatasının (panel yazıyor,
ziyaretçi okumuyor) aynısı, başka bir yüzeyde.

**Kişisel facet olağan facet'ten farklı bir şey.** Olağan facet KAYDIN
KENDİSİNE bakar (paleti, şehri) ve `valueOf` modül yüklendiğinde
tanımlıdır. "Bu fotoğrafı kaydettim mi" sorusunun cevabı kayıtta yok —
kullanıcının satırlarında. Yani facet bir küme geldikten SONRA
kurulabiliyor ve küme kullanıcıdan kullanıcıya değişiyor.

**Kural: küme hazır değilse facet YOK.** İki durumda hazır değil —
oturum yoksa ve küme henüz yüklenmediyse. Kutuyu yine de çizseydik
kullanıcı işaretler, liste boşalır ve "hiç kaydetmemişim" diye
düşünürdü; oysa sorun oturumun olmaması ya da bir saniye erken
davranmak. İki test bunu kilitliyor: oturumsuz render'da kutular
çizilmiyor, ve `?kaydettiklerim=evet` bağlantısı oturumsuz ziyaretçide
listeyi BOŞALTMIYOR (facet tanımlı olmadığı için parametre süzmüyor).

**Sessiz kırpma yok.** Kümeler `LIMIT` ile okunuyor — sınırsız bir
sorgu bir gün birinin yirmi bin kaydında sayfayı kilitler. Ama sınıra
dayanıldığında `truncated` dönüyor ve arayüz söylüyor: "kaydetmiştim
ama görünmüyor", yanlış cevabın en sinsi biçimi.

Panel bölümü için yazılmış `useSavedPhotos` KULLANILMADI: fotoğraf
satırını gömülü getiriyor ve 50 kayıtla sınırlı. Süzgeç için ikisi de
yanlış — çizilecek bir şey yok ve 51'inci kayıttan sonrası sessizce
dışarıda kalırdı. Ayrı, yalnızca kimlik seçen bir kanca yazıldı.

**Bir hata canlı şemadan yakalandı:** `follows` sütunu `followee_id`,
`following_id` değil. TypeScript yakalayamazdı — PostgREST kolon adını
çalışma anında çözüyor, hata ancak sorgu gidince çıkardı.

---

## Faz 5 — ayrıntı

### 5.1 Sosyal graf (takip + engelleme) — **DONE**

`follows` ve `user_blocks` (`0041`). Takip açık bilgi, engelleme değil:
engellenen kişi engellendiğini tablodan öğrenemiyor. Engelleme takibi
iki yönde de koparıyor. Takipçi sayısı denormalize sayaç kolonu yerine
indeksli `count(*)` ile — sayaç kolonu, kullanıcının kendi profil
satırını güncelleyebildiği bir şemada ayrıca korunması gereken bir alan
demekti.

Arayüz: profil başlığında takip/mesaj/engelle şeridi, hesap
ayarlarında engellenenler listesi.

### 5.2 Bildirim merkezi — **DONE**

`notifications` + altı üretim tetikleyicisi (`0042`). §8.13'ün
karşılığı. `notification_preferences` 0003'ten beri duruyor ve hiçbir
şeyi yönetmiyordu; artık kategori anahtarları gerçekten bildirim
üretimini durduruyor (kontrol tetikleyicinin içinde, istemcinin insaf
ettiği yerde değil).

Arayüz: üst çubukta canlı rozetli zil (`sm` ve üstü; telefonda modül
haritasında), zilden açılan bildirim merkezi paneli (son beş bildirim +
toplu okundu + tam listeye bağlantı), `/bildirimler` sayfası (gelen/arşiv
+ altı kategori sekmesi + toplu okundu) ve aynı sayfada tercih kutusu.
Rozet üst sınırı `99+`; sayı `useUnreadCount` üstünden realtime.

**Panel neden sayfayı öldürmüyor:** §8.1 merkezin ikondan açılmasını
istiyor, panel bunu karşılıyor. Ama altı kategori sekmesini ve arşivi
320px genişliğinde bir kutuya sıkıştırmak kullanılamaz bir ekran
üretirdi — panel hızlı bakış, sayfa yönetim.

**Bilinçli eksikler:** e-posta ve anlık bildirim gönderilmiyor
(sağlayıcı kararı bekliyor — TOPARLAMA §11), sessiz saatler ve toplu
özet yok. Üçü de tercih ekranında KUTU olarak gösterilmiyor; bunun
yerine neden olmadıkları yazıyor. §8.13'ün on maddelik tercih listesi
dörde indi çünkü kalan altısını üretecek tetikleyici henüz yok
(hatırlatma Faz 6, yayın Faz 7/8).

### 5.3 Mesajlaşma — **DONE**

`conversations` + `conversation_participants` + `messages` (`0043`).
Pazaryerinde satıcıya ulaşmanın hiçbir yolu yoktu; ilan detayındaki
"Satıcıya Mesaj Gönder" düğmesi `disabled` duruyordu ve kullanıcılar
iletişimi yorum alanına taşıyordu — tam olarak engellenmek istenen şey.

Çalışanlar: birebir sohbet (tekil), gerçek zamanlı mesaj akışı, okunmamış
sayacı, okundu durumu, sohbet listesi ve sohbet içi arama, düzenleme
(15 dk pencere), yumuşak silme, sessize alma, yazıyor göstergesi
(realtime broadcast — veritabanına yazmıyor), sohbet içinden engelleme
ve raporlama, dakikada 20 mesaj sınırı.

**Okundu durumu ayrı bir tablo değil**, karşı tarafın okuma imleci:
mesajım onun `last_read_at` damgasından eskiyse okunmuş demektir. Mesaj
başına "okundu" satırı tutmak, her mesaj için katılımcı sayısı kadar
satır ve her açılışta bir yazma demekti. "Teslim edildi" diye ayrı bir
kademe YOK — mesaj veritabanına yazıldıysa teslim edilmiştir; arada
kaybolabileceği bir kuyruk yok ve üç kademeli bir gösterge, hep birlikte
gerçekleşen iki durumu ayrıymış gibi gösterirdi.

**Raporlama moderatöre yazışma açmıyor** (`0047`). İlk akla gelen çözüm
`messages` üstüne "moderatör her şeyi görür" politikası eklemekti;
eklenmedi. Tek bir cümle şikâyet edildiğinde aylarca süren özel bir
konuşmanın tamamını moderasyona açmak orantısız bir yetki olurdu. Bunun
yerine rapor eden kişi şikâyet ettiği metni rapor notunda taşıyor:
moderatör tam olarak şikâyet edilen cümleyi görüyor, bir fazlasını
değil.

**Bilinçli eksikler:** medya/ek desteği (ayrı kova + kota işi),
grup sohbeti (şema `kind = 'group'` taşıyor ama arayüzü yok — §8.2 zaten
"çalışmayan grup mesajlaşma düğmesi gösterme" diyor), çevrimiçi/son
görülme. Sonuncusu bir ölçüm sorunu: realtime "presence"
yalnızca aynı sayfayı açık tutanı görür, bunu "çevrimiçi" diye yazmak
uygulamayı kullanan ama bu sohbeti açmamış birini çevrimdışı göstermek
olurdu.

### 5.4 Koleksiyonlar (kaydedilenler) — **DONE**

`collections` + `collection_items` (`0048`). Fotoğraf detayındaki
"Kaydet" ve "Paylaş" çipleri tıklanamayan `<span>`lerdi; ikisi de artık
çalışıyor. Panelde `/panel/kaydedilenler` bölümü açıldı.

Şema adlandırılmış listeleri destekliyor, **arayüz bugün tek koleksiyon
gösteriyor**: varsayılan "Kaydedilenler". İkinci listenin arayüzü gelene
kadar kullanıcıya seçim sunulmuyor — çalışmayan bir "koleksiyona ekle"
menüsü, olmayan bir özelliği varmış gibi göstermekti. Tek tabloyla
başlayıp sonra bölmek ise kullanıcı kayıtlarını taşıyan bir göç
gerektirirdi.

"Paylaş" sunucu gerektirmiyordu ama yine de ölüydü — `navigator.share`,
yoksa panoya kopyalama. "Altyapı bekliyordu" denemez; sadece
yazılmamıştı.

### 5.5 Kalanlar — **NOT_STARTED**

| Madde | Sebep |
|---|---|
| Adlandırılmış koleksiyonlar (birden çok liste) | Şema hazır (`0048`); liste yönetimi arayüzü ayrı bir tur |
| Explorer "favoriler" facet'i | `collection_items` hazır; explorer sorgusuna bağlanması ayrı iş |
| `clubs` (kulüp/topluluk) | §8.11 kurumsal profil — kendi turu |
| Aktivite akışı ("takip ettiklerin ne yaptı") | `follows` hazır; akış sorgusu ve sayfası ayrı bir iş |
| E-posta/push teslimatı | Sağlayıcı kararı **Sen** (TOPARLAMA §11) |

### Ölçüm

Şema davranışı yerel PostgreSQL 16 üzerinde **63 kontrolle** ölçüldü:
bildirim üretimi ve tekilleştirme, tercih kontrolü, engelleme yayılımı,
RLS yalıtımı (anon + üçüncü kullanıcı), kimlik taklidi denemeleri,
düzenleme penceresi, oran sınırı, sert silme reddi, `app` yardımcılarının
yüzeyi, koleksiyon görünürlüğü. `check:rls` matrisine aynı kuralların
32'si eklendi.

**İki güvenlik açığı bu ölçümlerde bulundu ve kapatıldı**, ikisi de
"yazdım demek kapattım demek değil" kategorisinden:

· `0045` — `app.notify` ve dört kardeşi istemciye açık kalmıştı.
  `notifications` tablosunda `insert` yetkisi vermemenin tek anlamı
  "bildirim üretimi kapalı" idi; `app.notify` çağrılabilir olduğu sürece
  o karar bir kapıyı kilitleyip yanındaki pencereyi açık bırakmaktı.
  (PostgREST `app` şemasını açmadığı için sömürülebilir değildi.)
· `0046` — `0044`ün `PUBLIC`ten revoke'u yetmiyordu: Supabase `public`
  şeması için `anon`a AÇIK grant veren varsayılan ayrıcalık tanımlıyor.
  Denetçi ısrar edince `proacl` okundu ve fark göründü.

Arayüz tarafında 40 yeni birim testi (bildirim listesi, bildirim paneli
ve mesajlaşma — üçü de oturum açık hâlleriyle) ve `relativeTime` için
7 test. `test:all`
tamamı geçiyor; JS bütçesi 190.9/200 kB (bildirim paneli üst çubukta
olduğu için ana pakete giriyor — 0.6 kB).

**Migration listesi:** `0041` sosyal graf · `0042` bildirimler ·
`0043` mesajlaşma · `0044`+`0046` RPC yüzeyi · `0045` `app` yardımcıları ·
`0047` mesaj raporlama · `0048` koleksiyonlar. Sekizi de uzak projeye
uygulandı.

---

## Faz 6 — ayrıntı

Migration `0049` (takip + hatırlatma) ve `0050` (yönetici tarafı); ikisi
de uzak projeye uygulandı. Arayüz: `EventInterest`, `EventChanges`,
`ReminderControl` ve panelde sekizinci sekme (`?bolum=hatirlatma`).

### 6.1 Etkinlik takibi — **DONE**

| Madde | Durum | Kanıt |
|---|---|---|
| Takip et / takibi bırak | DONE | `event_follows` + `set_event_interest` |
| Katılacağım / ilgileniyorum ayrımı | DONE | İki tablo, tek kontrol (aşağıda) |
| Takvime ekle | DONE | `.ics` tarayıcıda üretiliyor; 8 test |
| Etkinlik değişikliklerini takip et | DONE | `event_changes` + `EventChanges` |
| İptal / tarih / konum değişikliğinde bildirim | DONE | `app.event_change_fanout` |
| Hatırlatma yönetimi | DONE | `ReminderPanel` |

**İkinci bir kayıt tablosu açılmadı.** İlk akla gelen çözüm
`event_follows`a bir `interest` kolonu koymaktı. Yapılmadı:
`event_registrations` 0010'dan beri var, kontenjanı
`app.enforce_event_capacity` koruyor ve `events.registered_count` ona
bağlı. İki tabloda iki "katılacağım" olsaydı kontenjan hangisine
bakacaktı? İş bölümü net — `event_follows` "haberdar olmak istiyorum",
`event_registrations` "geleceğim". Kullanıcı **tek kontrol** görüyor.

**Arayüzde üç durum, dört değil.** "Takip et" ve "katılacağım" ayrı
düğmeler olsaydı dört bileşim çıkardı ve biri anlamsızdı ("takip
etmiyorum ama katılacağım"). Seçili düğmeye ikinci basış vazgeçmek
demek; ayrı bir "Vazgeç" düğmesi hiçbir şey seçili değilken de dururdu.

**Takvim dosyası sunucuya gitmiyor.** "Google Takvime ekle" bağlantısı
etkinliğin adını, yerini ve saatini üçüncü tarafa taşırdı. `.ics` her
takvim uygulamasında açılıyor ve kimseye bir şey söylemiyor. İki
ayrıntı ölçüldü: RFC 5545 satır katlaması **oktet** sayıyor (Türkçe
harfler UTF-8'de iki oktet; karakter sayan bir katlama 75'lik sınırı
sessizce aşardı) ve `VALARM` gömülmedi — sitede hatırlatma kuran
kullanıcı aynı an için iki bildirim alırdı.

### 6.2 Hatırlatma — **PARTIAL** (teslimat kanalı hariç DONE)

| Madde | Durum | Kanıt |
|---|---|---|
| 1 hafta / 1 gün / etkinlik günü / özel | DONE | `app.reminder_offset` dört değer |
| Bir etkinliğe birden fazla hatırlatma | DONE | Tekil indeks türe göre, satıra göre değil |
| Saat dilimi güvenliği | DONE | Her şey `timestamptz`; "etkinlik günü" `Europe/Istanbul` 09:00, canlıda ölçüldü (13.12.2026 15:00Z → 13.12.2026 06:00Z) |
| Geçmişe hatırlatma kurmayı engelleme | DONE | `app.reminders_before_write`; canlıda ölçüldü |
| Tekrarlı bildirim engeli | DONE | Tekil indeks; canlıda `unique_violation` ölçüldü |
| Kullanıcı tercihleri | DONE | `app.notify` tercih + engel kontrolü yapıyor (0042) |
| Uygulama içi teslimat | DONE | `app.dispatch_due_reminders`, 5 dakikada bir cron |
| Etkinlik saati değişince yeniden hesapla | DONE | Niyet korunuyor, an değişiyor; geçersizleşenler siliniyor |
| Takipten çıkınca gelecek hatırlatmaları iptal | DONE | `event_follows_cancel_reminders` |
| Her gönderimin teslim durumu | DONE | `sent_at`, `attempts`, `last_error` |
| **E-posta teslimatı** | **IMPLEMENTED_BLOCKED_EXTERNAL** | Sağlayıcı kararı verilmedi (TOPARLAMA §11). Tablo hazır: `attempts` ve `last_error` kolonları o gün için duruyor |
| **Web push** | **NOT_STARTED** | Belgenin kendisi "ileride" diyor; `push_subscriptions` tablosu boş |
| Queue + Edge Function | IMPLEMENTED_DISABLED | Site içi teslimat için gerekmiyor — gerekçe aşağıda |

**Hatırlatma "ne zaman" değil "ne kadar önce" olarak saklanıyor.**
`due_at` tek başına saklansaydı, etkinlik tarihi değişince hatırlatma
eski tarihte kalırdı: kullanıcı "1 gün önce" dediği hâlde etkinlikten
üç gün sonra bildirim alırdı. Niyet (`offset_kind`) saklanıyor, `due_at`
ondan türetiliyor, etkinlik saati kayınca tetikleyici yeniden
hesaplıyor.

**Görünmez bir tuzak kapatıldı:** etkinlik ÖNE alındığında, "15 Eylül
20:00'de hatırlat" diyen özel hatırlatma artık etkinlikten sonraya
düşüyordu — kullanıcı etkinlik bittikten on gün sonra "yaklaşıyor"
bildirimi alacaktı. Yeniden hesapta bu satırlar siliniyor.

**Kuyruk ve Edge Function neden yok.** §9'un mimarisi "Cron → Queue →
Edge Function" diyor. Site içi teslimat için aradaki iki adım gereksiz:
bildirim üretmek `app.notify` çağrısı, yani veritabanının kendi içinde
biten bir iş. Araya kuyruk ve HTTP sıçraması koymak, veritabanından
veritabanına gitmek için ağdan dolaşmak olurdu. İdempotanslık yine var
(`sent_at is null` + `for update skip locked`). Kuyruk E-POSTA için
gerekecek: dış servis, gerçek başarısızlık, gerçek yeniden deneme.

**İstemci sunucunun kopyası değil, ön görünümü.** `reminders.ts`
sunucunun üç kuralını önden uyguluyor ki yarın olan bir etkinlikte
"1 hafta önce" seçeneği tıklanabilir görünmesin. Kuralın sahibi yine
sunucu — istemcinin saati yanlış olabilir, kullanıcı sayfayı açık
bırakabilir. Testlerdeki beklenen anlar `app.reminder_due_at` canlıda
çalıştırılarak alındı; saat dilimi farkı sabit yazılmadı (`Intl`
üstünden hesaplanıyor), çünkü kural değişirse sessizce yanlış
hesaplamak yerine testte düşmeli.

### 6.3 Yönetici tarafı — **DONE**

| Madde | Durum | Kanıt |
|---|---|---|
| Teslim istatistikleri | DONE | `reminder_delivery_stats` — altı sayaç, SQL'de toplanıyor |
| Hatalı işler | DONE | `failed_reminders`; hata metni kırpılmadan gösteriliyor |
| Yeniden deneme | DONE | `retry_reminder` → `app.deliver_reminder` (cron'un gövdesi) |
| Global varsayılanlar | DONE | `app_settings.reminder_defaults` |
| Zorunlu duyuru | DONE | `broadcast_announcement`, iki adımlı onay |
| Kullanıcı tercihlerini hukuka aykırı aşmama | DONE | Aşağıda |
| Etkinlik değişiklik geçmişi | DONE | `event_changes` + tetikleyici |

**Yeniden deneme ikinci bir gönderim yolu değil.** Gövde
`app.deliver_reminder` — cron'un çağırdığı fonksiyonun ta kendisi.
Yöneticiye ayrı bir yol yazsaydık biri düzeltilip diğeri unutulurdu.

**Değişiklik geçmişi `audit_logs`a doldurulmadı.** O tablo yönetici
EYLEMLERİNİ tutuyor ("kim hangi yetkiyle ne yaptı"). Etkinlik
değişikliği farklı bir soru soruyor — "bu etkinliğin tarihi kaç kez
kaydı" — ve cevabı **katılımcıya da** gösterilmeli. İkisini aynı tabloya
doldurmak, katılımcıya gösterilecek bir kaydı denetim kaydının içine
gömmek olurdu. Satır kullanıcı tarafından yazılamıyor: yalnızca
tetikleyici yazıyor, kimseye `insert` yetkisi verilmedi.

**İzlenen alanlar sınırlı.** Her kolonu kaydetmek `registered_count`
güncellemeleriyle tabloyu doldururdu — kayıt sayacı her katılımcıda
değişiyor ve bu bir "etkinlik değişikliği" değil.

**Pazarlama sınırı.** Duyuru `announcement` türünde üretiliyor, o da
`sistem` kategorisinde ve o kategori kapatılamıyor (0042). Sebebi
"yönetici istediğini gönderebilsin" değil: hesabı, üyeliği, güvenliği
ilgilendiren bilgiler kapatılamaz olmalı. `marketing_opt_in` AYRI bir
alan ve duyuru fonksiyonu ona bakmıyor, çünkü bu fonksiyonla pazarlama
gönderilmiyor. Kural kodda değil kullanımda — bu yüzden sınır ekranda
da yazılı ve her duyuru `audit_logs`a kimin gönderdiğiyle düşüyor.

**Yöneticiye `reminders` tablosu açılmadı.** Dört RPC de
`security definer` ve dönen alanlar sınırlı; tabloya "yönetici her şeyi
görür" politikası eklemek, herkesin hangi etkinliğe ne zaman hatırlatma
kurduğunu okunur yapardı.

### Ölçüm

Altı veritabanı kuralı canlıda, **geri alınan bir işlemde** ölçüldü:
`due_at`in BEFORE tetikleyiciden dolması (kolon `not null` ve insert'te
verilmiyor), "etkinlik günü" 09:00 yerel karşılığı, hatırlatma kuranın
takipçi olması, aynı türden ikinci hatırlatmanın reddi, etkinlik
sonrasına ve geçmişe kurmanın reddi.

İstemcide **33 yeni test**: 19'u hatırlatma anı ve `.ics` üretimi
(`reminders.test.ts`), 14'ü arayüz (`EventInterest.test.tsx`,
`ReminderControl.test.tsx`). `test:all` tamamı geçiyor; JS bütçesi
190.9/200 kB (yeni kod etkinlik ve panel rotalarında, ana pakette değil).

**Kaldırılan ölü kod:** etkinlik sayfasındaki devre dışı "Katıl (üyelik
gerektirir)" düğmesi ve altındaki "hesap sistemi devreye alınınca
açılacak" cümlesi. Hesap sistemi çoktan çalışıyordu ve gerçek kayıt
kontrolü hemen altındaydı; basılamayan düğme çalışan kontrolü de
şüpheli gösteriyordu. `EventRegistration` `EventInterest` içinde eridi —
iki bileşen de `event_registrations`a yazsaydı durumları ayrışırdı.

---

## Faz 7 — ayrıntı (sürüyor)

Migration `0051` (istasyon/yayıncı/program/sağlık), `0052` (bildirim
türü), `0053` (podcast); üçü de uzak projeye uygulandı. Sunucu tarafı:
`supabase/functions/radyo-durum` ve `deploy/radyo/`.

### Kapanan

| Madde | Durum | Kanıt |
|---|---|---|
| Şema — istasyon, yayıncı, program, yayın saati, takip, sağlık | DONE | `0051`, 11 kural canlıda ölçüldü |
| Podcast — seri, bölüm, konuk, ilerleme, takip | DONE | `0053`, 9 kural canlıda ölçüldü |
| AzuraCast API adaptörü | DONE | 20 test |
| Sağlık yoklaması ve teslim kaydı | DONE | `radio_stream_health` |
| Dağıtım dosyaları, güvenlik, yedekleme | DONE | `deploy/radyo/` |
| Program takvimi hesabı | DONE | 25 test |
| Program takvimi arayüzü (haftalık ızgara, şu an / sonraki) | DONE | `RadioSchedule` |
| Servis katmanı (istasyon, canlılık, program, takip) | DONE | `radioStation.ts` |
| Panel **Radyo** sekmesi (istasyon durumu, programlar, canlı duyurusu) | DONE | `RadioControl` |
| Program ve yayıncı detay sayfaları | DONE | `ProgramPage`, `HostPage` |
| Podcast arşivi, seri ve bölüm sayfaları | DONE | `PodcastPage`, `EpisodePage` |
| Dinleme ilerlemesi ve oynatma sayacı | DONE | `useEpisodeProgress`, `countPlay` |
| Program takip düğmesi + bildirim tercihi | DONE | `ProgramPage` |
| **Canlı yayın aktivasyonu** | **IMPLEMENTED_BLOCKED_EXTERNAL** | VPS yok |
| Media Session, yeniden bağlanma, kalite seçimi | **BLOCKED_EXTERNAL** | canlı yayın olmadan doğrulanamaz |
| RSS feed üretimi | NOT_STARTED | alanlar hazır (`0053`), üretici yok |

### "Canlı" beş yerde birden korunuyor

§10.2'nin son maddesi sahte "canlı" ibaresini yasaklıyor. Tek bir yerde
uygulamak yetmezdi:

1. **Şemada `is_live` kolonu yok.** Olsaydı yayın düşer, kolon `true`
   kalır, site "canlı yayındayız" yazardı. Canlılık
   `radio_stream_health`teki ÖLÇÜM; `app.station_is_live` üç dakikadan
   eski yoklamayı canlı saymıyor — canlıda ölçüldü, 5 dakikalık yoklama
   `false` döndürüyor.
2. **Adaptörde hata yolu her zaman `canli: false`.** Bu bir arayüz
   kuralı gibi görünüyor ama asıl yeri burası: hata yolundan "canlı"
   dönerse arayüzün yapabileceği bir şey yok.
3. **Takvim "canlı" demiyor.** `currentOccurrence` "bu saatte şu program
   olmalı" diyor. İkisini karıştırmak, sunucu düştüğünde sitenin "Gece
   Gökyüzü canlı yayında" yazması demekti.
4. **Arayüzde dört durumlu rozet**, iki değil: `CANLI` (yayın ayakta ve
   takvimde program var), `YAYINDA` (yayın ayakta, takvim boş — AutoDJ),
   `PROGRAMDA — yayın kapalı` (takvimde var ama yayın yok),
   `ÇEVRİMDIŞI`. Üçüncüsü tuhaf görünüyor ve tam da bu yüzden var:
   takvimi hiç göstermemek dinleyiciyi "program iptal mi oldu" diye
   bırakırdı.
5. **Saat tik atıyor.** `new Date()`i render sırasında kurup bırakmak,
   sayfa açık kalınca "şu an"ı donduruyordu — program bittiği hâlde
   "Şu an: Gece Gökyüzü" yazmaya devam ederdi. Canlı olmayan bir şeyi
   canlı göstermenin sessiz hâli; otuz saniyede bir tik.

Bunun **tersi de** ölçüldü: AzuraCast'in `live.is_live` alanı "DJ bağlı
mı" demek, "yayın var mı" değil. AutoDJ çalarken `false` döner ama
dinleyici müzik duyar. O alanı ölçüt yapsaydık yayın sürerken
"çevrimdışı" yazardı — sahte canlının tersi, aynı derecede yanlış.
`is_online` okunuyor.

**Sonuç: kurulum yapılmadan site radyoyu çevrimdışı gösteriyor ve bu
doğru cevap.** Bugünkü davranış bir eksiklik değil.

### Devir teslim: kasa ↔ canlı yayın

İki kaynak vardı ve **birbirlerinden habersizdiler**: canlı yayın
başlasa bile oynatıcı kasadan çalmaya devam ediyordu. `handover.ts` bunu
kapatıyor.

**Devir parça sonunda, ortasında değil.** Canlı yayın başladığı an çalan
mp3'ü kesmek teknik olarak daha kolaydı ve yanlış olurdu: dinleyici bir
parçanın ortasında, hiçbir şey yapmadan başka bir sese atlar. Gerçek
radyo otomasyonu da böyle yapmaz — AutoDJ parçayı bitirir, sonra
mikrofonu devreder. Ara durum (`pending`) bunun için var ve arayüzde
yazılı: "canlı yayın bu parçadan sonra". Sessiz bir bekleme,
açıklanmamış bir gecikmedir.

**Tersi beklemiyor.** Canlı yayın düştüğünde beklenecek bir şey yok —
ortada ses kalmadı, kasaya hemen dönülüyor.

**Canlıya geçmenin iki şartı var:** ölçüm canlı olmalı VE bir yayın
adresi bulunmalı. Adres olmadan "canlı" demek, çalınacak bir şey olmadan
canlı demektir.

Yoklama 45 saniyede bir: `station_is_live` üç dakikalık bayatlık
penceresi kullanıyor, daha seyrek yoklamak yayının başlangıcını
dakikalarca kaçırırdı.

### Sır saklamayan şema

§10.1 "secret'ların yalnızca server-side saklanması" diyor. Üç tablonun
hiçbirinde API anahtarı, yayıncı şifresi ya da mount parolası yok.
Gerekçe tek cümle: bir tablo satırı yanlış yazılmış bir politikayla
okunabilir hâle gelir, ortam değişkeni veritabanında hiç değildir.
Tablolarda duran şey zaten kamuya açık — yayın adresi, bitrate, program
takvimi.

### Dinleyici sayısı var, dinleyici listesi yok

Adaptör AzuraCast'in `/listeners` uç noktasına **hiç gitmiyor**; o uç
nokta IP, konum ve user-agent döndürüyor. Gösterilecek şey sayı ve
sayıyı almak için listeyi çekmek gerekmiyor — çekmediğimiz veri
sızdıramayacağımız veridir. Sayı bilinmiyorsa kolon **boş** kalıyor,
`0` değil: "kimse dinlemiyor" ile "sayamadık" farklı cümleler.

Podcast tarafında aynı karar: dinleme ilerlemesi kişi başına bölüm
başına TEK satır (üzerine yazılıyor, biriktirilmiyor — "kaldığın yer"
bir imleçtir, bir günlük değil) ve analitik tek sayaç. Her oynatmaya
satır yazsaydık ortaya kullanıcıların ne dinlediğini gösteren bir
geçmiş veritabanı çıkardı.

### Zamanlanmış yayın RLS'in içinde

`status = 'published'` yeterli değil: saati gelmemiş bölüm de o statüde
bekliyor. Zaman politikanın içinde olmasaydı bölüm yayın saatinden önce
API'den okunabilirdi ve "yayında değil" yalnızca arayüzün söylediği bir
şey olurdu. Ölçüldü: yönetici olmayan kimlik beş bölümden yalnızca
birini görüyor — zamanlanmış, taslak, yayın saati boş ve taslak serinin
yayımlanmış bölümü dördü de gizli.

### Saat dilimi matematiği tek kaynağa çıktı

Aynı hesap iki yerde lazım oldu: etkinlik hatırlatmaları ("etkinlik
günü sabahı 09:00") ve radyo takvimi ("her salı 21:00"). İki kopya
kaçınılmaz olarak ayrışırdı — biri düzeltilir, diğeri unutulur ve fark
"bir bildirim bir saat erken geldi" olarak görünürdü. `src/lib/zone.ts`
tek kaynak; `reminders.ts` ona geçti ve 19 testi değişmeden geçiyor.

Sabit `+03` yazılmadı. Türkiye 2016'dan beri yaz saati uygulamıyor ama
sabitlemek, kural değişirse kodun sessizce yanlış hesaplaması demekti.

### Telif — kodla çözülmeyen kısım

Türkiye'de müzik yayını MESAM/MSG lisans yükümlülüğü doğurur ve bu
yükümlülük **işletmenindir**; AzuraCast'in açık kaynak olması müziği
telifsiz yapmıyor. `deploy/radyo/README.md` bunu yazıyor ve yükümlülük
doğurmayan yolu gösteriyor: kendi içeriğiniz, açık lisanslı müzik,
konuşma programları. Sitedeki `radio_tracks` kasası bu kullanım için.

---

## Faz 8 — ayrıntı (sürüyor)

Migration `0055`; uzak projeye uygulandı. TV modülünün bir kısmı zaten
vardı (`tv_broadcasts`, `TvPage`, `BroadcastControl`): onay kapaklı
`youtube-nocookie` gömme, kimlik biçim kısıtı ve program listesi
`0011`den beri çalışıyor.

### Kapanan

| Madde | Durum | Kanıt |
|---|---|---|
| Video arşivi, seri/playlist şeması | DONE | `0055` |
| Yayın takibi + bildirim tercihi + canlı duyurusu | DONE | `tv_follows`, `announce_tv_live` |
| Sunucu/konuk profili | DONE | `broadcast_hosts` (radyoyla ortak) |
| YouTube bağlantı şeması + durum fonksiyonu | DONE | 8 kural canlıda ölçüldü |
| API kota izleme | DONE | `youtube_quota_log` |
| OAuth akışı, jeton yenileme, senkronizasyon, kota sayacı, yeniden deneme | DONE | `supabase/functions/youtube`, 35 test |
| Panel **TV** sekmesi (bağlantı durumu, kota, video arşivi) | DONE | `TvControl` |
| **Canlı kanal bağlantısı** | **IMPLEMENTED_BLOCKED_EXTERNAL** | gerçek OAuth kimliği yok |
| Video arşivi ve seri sayfaları | DONE | `TvArchivePage` |
| Yayın takip düğmesi + bildirim tercihi | DONE | `TvFollow` |

### Sır tablosunda politika yokluğu bir kusur değil

OAuth yenileme jetonu `youtube_connection` tablosunda durmak **zorunda**:
çalışma anında alınıyor, ortam değişkenine yazılamıyor ve fonksiyon
çağrıları arasında yaşaması gerekiyor. Radyoda kullanılan "sırrı hiç
veritabanına koyma" çözümü burada mümkün değil.

O hâlde koruma "kim okuyabilir" sorusuna taşındı: RLS açık, `select`
politikası **hiç yok**, `anon` ve `authenticated` grant'ları geri
alındı. Yalnızca service role (RLS'i atlayan) erişiyor.

**Yöneticiye bile açılmadı.** §11.3 "kanalı bağlama, yalnızca yetkili
teknik admin" diyor — ama *bağlayabilmek* ile *jetonu okuyabilmek* aynı
şey değil. Yönetici bağlantıyı `youtube_connection_status()`
fonksiyonundan görüyor ve o fonksiyon jeton alanlarına hiç dokunmuyor:
yalnızca "var mı" ve "süresi geçmiş mi" diye bakıyor.

Canlıda ölçüldü: **yönetici kimliğiyle tablo okunamadı** (yetki reddi),
ama durum fonksiyonu `bagli=true` ve kanal adını döndürdü.

### Aynı kişiye iki profil açılmadı

§11.1 "sunucu/konuk profilleri" istiyor ve ilk akla gelen `tv_hosts`
açmaktı. Radyoda program sunan biri TV'de de sunabilir; iki tablo o
kişiye iki profil, iki adres ve iki biyografi verirdi — hangisinin
güncel olduğu da kimsenin bilmediği bir soru olurdu.

`radio_hosts` → `broadcast_hosts` olarak yeniden adlandırıldı. Sunucu
bir **kişi**; radyo ve TV onun çalıştığı iki mecra ve tablo mecraya
değil kişiye ait. `0051`deki özgün tanım değiştirilmedi (uygulanmış bir
migration'ı yeniden yazmak olurdu), yalnızca not düşüldü.

### Kota gün sınırı Pasifik saatinde

YouTube Data API günlük 10.000 birim veriyor ve kotayı Pasifik saatinde
sıfırlıyor. Tek bir toplam sayaç dünkü harcamayı bugüne taşırdı.
Kotayı izlemeden senkronlayan bir sistem günün ortasında sessizce
durur ve sebebi "video listesi güncellenmiyor" olarak görünür —
kaynağı bulunması zor bir hata.

### OAuth'ta üç tuzak ve üçü de testte sabit

1. **`prompt=consent` olmadan yenileme jetonu gelmiyor.** Kullanıcı daha
   önce izin verdiyse Google jetonu tekrar göndermiyor ve bağlantı bir
   saat sonra ölüyor. Entegrasyonlarda en sık yapılan hata.
2. **Yenileme yanıtında `refresh_token` yok** ve bu normal. Üzerine
   `null` yazan bir kod, bağlantıyı ilk yenilemede öldürür.
3. **403 kota hatası yeniden denenmemeli**, 429 ve 5xx denenmeli. İkisi
   de "başarısız" görünüyor ama biri bekleyerek çözülüyor, diğeri
   ertesi günü bekliyor.

`search` çağrısı hiç kullanılmıyor: yüz kota birimi yerine bir birim.
Kanalın yükleme playlist'i (`UCxxx` → `UUxxx`) aynı listeyi veriyor ve
kimliği çağrı yapmadan türetilebiliyor.

### Yazarken düzeltilen iki kendi kusurum

**`state` yanlış kolondaydı.** CSRF nonce'ını `access_token` kolonuna
yazmıştım. Çalışıyordu — ama yetki akışı sürerken bir senkronizasyon
çalışsa, state dizgisi bearer jeton sanılıp YouTube'a gönderilirdi. 401
alınır, kimse ölmez; ama sebebi "senkronizasyon bazen çalışmıyor"
olarak görünürdü. Kendi kolonuna taşındı (`0056`) ve on dakikalık
geçerlilik penceresi eklendi.

**Yorum, kodun yapmadığı bir şeyi iddia ediyordu.** "Elle eklenen kayıt
ezilmiyor" yazmıştım ama `on_conflict=youtube_id` upsert'i ayrım
yapmadan her satırı eziyordu. İddiayı koda çevirdim: manuel satırların
kimlikleri önce okunuyor ve yazmadan çıkarılıyor. Bir sorguya mal
oluyor; alternatifi editörün düzeltmesinin her senkronizasyonda geri
alınmasıydı.

### `<iframe src>` güvenliğinin iki yarısı

Birincisi `0011`den beri var: gömme adresi **kodda** kuruluyor,
veritabanından gelmiyor. İkincisi kimlik biçim kısıtı ve `0055` onu
`tv_videos`a da taşıdı — canlıda ölçüldü, `'"><script>x'` reddedildi.

---

## Faz 9 — ayrıntı

Migration `0057`. Arayüz: `/uyelik` sayfası, panelde test premium
düğmesi, `membership.ts` servis katmanı.

### Ödeme, üyeliğin sebebi değil tetikleyicisi

Sınır bilinçli bir yerde: `memberships` kademeyi tutuyor ve onu
değiştiren şey bugün yönetici, yarın bir ödeme webhook'u olacak.
Sağlayıcı alanları (`provider`, `provider_customer_id`,
`provider_subscription_id`) `0021`den beri var ve boş bekliyor.
Sağlayıcı seçilince yazılacak tek şey o webhook — kademe, kota ve
yetki mantığı yerinde duruyor.

Ödeme anahtarı `app_settings.billing`de, kodda değil: koda gömseydik
açmak için yeni bir dağıtım gerekirdi. Arayüz varsayılan olarak KAPALI
kabul ediyor — ayar okunamazsa açık sanmak, kullanıcıyı çalışmayan bir
ödeme akışına sokmak olurdu.

### Satın alma düğmesi yok — devre dışı bile değil

§12.2'nin son maddesi "premium kapalıyken public kullanıcı 'satın al'
düğmesiyle çıkmaza sokulmamalıdır" diyor. Devre dışı bir düğme bu
maddeyi teknik olarak sağlar ve ruhunu çiğner: kullanıcı ona bakıp
bekler, tıklamayı dener, neden çalışmadığını arar.

`/uyelik` sayfası bunun yerine ne olduğunu ve ne zaman olacağını
söylüyor. Kart bilgisi istenecek bir alan sayfada hiç yok.

### Yarış durumu kapatıldı

`enforce_photo_quota` say-sonra-karşılaştır yapıyordu: iki eşzamanlı
yayımlama isteği ikisi de "4 var, limit 5" görüp geçebiliyordu — sonuç
6 fotoğraf. §12.3 bunu adıyla anıyor. Kullanıcı başına danışma kilidi
eklendi; aynı kullanıcının kontrolleri sıraya giriyor, farklı
kullanıcılar birbirini beklemiyor.

### Türetilmiş dosyalar depolamaya giriyor — ama eski satırlar sayılmıyor

§12.1: türetilmiş varyantlar fotoğraf ADEDİNE girmiyor, DEPOLAMAYA
giriyor. `photo_versions`ta boyut kolonu yoktu; eklendi. **Eski satırlar
boş kalıyor** ve bu dürüst bir eksik: geriye dönük doldurmak her dosyayı
storage'dan okumayı gerektirir. Bugün depolama kullanımı olduğundan AZ
görünüyor, fazla değil.

### Test premium: süre ve işaret zorunlu

Süresiz bir test premium'u, unutulduğunda ücretsiz kalıcı premium olur —
en fazla 90 gün. `provider='test'` kalıcı bir işaret: sağlayıcı
bağlandığında gerçek abonelikleri bunlardan ayırmak gerekecek. Geri
alma yalnızca test üyeliğine dokunuyor; gerçek bir aboneliği sitede
kapatıp sağlayıcıda açık bırakmak, kullanıcının parasını ödeyip
erişimini kaybetmesi olurdu.

### Premium bitince fotoğraflar silinmiyor

§12.3'ün şartı. Kota aşımı `over_limit` olarak dönüyor ve `/uyelik`
sayfası bunu açıkça yazıyor: "mevcut fotoğrafların silinmedi ve
silinmeyecek — yalnızca yeni fotoğraf yayımlaman durduruldu". Kullanıcı
bunu görmezse hesabını kaybettiğini sanar.

### Enum değerleri tahmin edilmez

Yazarken `interval` ve `status` enum değerlerini tahmin etmiştim
(`'month'`, `'cancelled'`). İkisi de tabloda yok — gerçekte
`monthly`/`yearly` ve `canceled` (tek L). Veritabanı reddetti.

---

## Faz 10 — ayrıntı

| Madde | Durum | Not |
|---|---|---|
| `home_modules` / `nav_links` / `feature_flags` / `site_settings` şeması | DONE | `0058` |
| Değişiklik geçmişi, gerekçe, geri alma (§13.3) | DONE | `setting_history`, tetikleyiciyle |
| Taslak → önizleme → yayın + zamanlanmış yayın | DONE | `0058`, `0059`, `0060` |
| Panel **Site** sekmesi | DONE | `SiteControl` |
| **Ana sayfanın düzeni okuması** | DONE | `homeLayout.ts`, `0061` |
| **Bayrakların ziyaretçi tarafında çalışması** | DONE | `siteConfig.ts` — yedi bayrak |
| Bakım modu + site duyurusu | DONE | `MaintenanceGate`, `AnnouncementBar` |
| **`nav_links` → gerçek menü/footer** | DONE | `navLinks.ts`, `0062`, panel bölümü |
| **Hero banner yönetimi** | DONE | `0063`, `heroSlides.ts`, panel bölümü |
| Modül `layout` (ızgara/liste) ve `subtitle` | NOT_STARTED | gerekçe `HomePage.tsx`te |
| §13.4 çoklu admin rolleri | — | ürün kararı: kurulmayacak |
| §13.5 dashboard | PARTIAL | panel sekmeleri var, tek ekran özet yok |

Menü işi üç parçalıydı ve üçü de eksikti: tohum yok, panel yüzeyi yok,
okuma yok. Üçü birden bu turda yazıldı.

### Faz 10'un tek hatası aynı hataydı, üç kez

Bu fazın kodu üç turda yazıldı ve üçünde de aynı boşluk çıktı: **panel
yazıyor, ziyaretçi okumuyor.** Sırasıyla `home_modules`, `feature_flags`
ve `nav_links`. Üçüncüsü en kötüsüydü — orada panel tarafı da yoktu:
tablo 0058'de kuruldu, `siteSettings.ts`e `fetchNavLinks`/`upsertNavLink`
yazıldı, sonra hiçbir şey. Tohum yok, panel yüzeyi yok, okuma yok;
borunun üç ucu da açık. `upsertNavLink` aylarca çağıranı olmayan bir
fonksiyon olarak durdu.

Boşluk sinsiydi çünkü panel tarafı KUSURSUZ çalışıyordu: yönetici
anahtarı çeviriyor, `set_feature_flag` yazıyor, `setting_history`ye kayıt
düşüyor, geri alma düğmesi bile doğru davranıyordu. Ölçülebilen her şey
yeşildi. Ölçülmeyen tek şey, ziyaretçinin ne gördüğüydü.

0058 bunu kendi başlığına yazmıştı: *"karşılığı olmayan bayrak
yanıltır."* Cümle doğruydu; yazıldığı gün yedi bayrağın yedisi için de
tutmuyordu.

### Yedek yönü rastgele seçilmez

Bayraklar okunamadığında ne varsayılacağı, bayrak başına ayrı bir karar
gibi görünüyor. Değil — tek kural var: **yedek, sitenin olağan hâli.**

İçerik bayrakları (`radyo_acik`, `tv_acik`, `yorumlar_acik`,
`ilanlar_acik`, `kayit_acik`) AÇIK varsayılıyor; `bakim_modu` ve
`duyuru_acik` KAPALI. Ters yön düşünülünce gerekçe netleşiyor: bakım
modu okunamadığında `true` sayılsaydı tek bir başarısız istek bütün
siteyi "bakımdayız" ekranına düşürürdü. Radyo `false` sayılsaydı aynı
istek çalışan radyoyu yok ederdi. İki hata da aynı kaynaktan (ağ) çıkıp
ürünü kapatırdı.

Aynı kural ana sayfa düzeninde de geçerli: `DEFAULT_HOME_LAYOUT` boş
liste değil, bugün canlıda ne varsa o.

### Bakım modunda kilitlenme tuzağı

Bakım modunu yalnızca yönetici kapatabilir → yönetici olduğunu anlamak
için oturum gerekir → oturum için giriş sayfası gerekir. Giriş sayfası da
kapatılsaydı, oturumu kapalıyken bakım modunu açan yönetici siteyi kendi
kilitlerdi ve geri dönüşü yalnızca veritabanından elle `UPDATE` olurdu.

`MAINTENANCE_ALLOWED_PATHS` bu yüzden var ve içinde yalnızca `/giris`
duruyor. `/kayit` listede yok: bakım sırasında yeni hesap açmak yapılacak
iş değil ve kilidi açmıyor.

İkinci tuzak roller tarafında: roller yüklenirken kapı BEKLİYOR, ama
yalnızca oturumu olanlar için. Beklemenin yönü de bilinçli — bilinmezken
site açık kalıyor, çünkü ters yön roller hiç gelmediğinde (ağ hatası)
yöneticiyi kendi sitesinden kilitlerdi.

### Bakım modu bir güvenlik sınırı değil

Kapı istemcide. Veriyi koruyan şey RLS; bakım modu bir SUNUM kararı
("şu an girmeyin"), erişim kararı değil. Sorguları da kesip "güvenlik"
gibi yazmak yanlış bir güven duygusu verirdi: adresi doğrudan yazan biri
zaten aynı veriyi görürdü, çünkü veriyi veren yer veritabanı.

### Bağlantıyı gizlemek sayfayı kapatmaz

`radyo_acik` / `tv_acik` bayraklarının açıklaması "sayfaları gizlenir"
diyor. Yalnızca menü bağlantılarını kaldırmak bu cümleyi yalanlardı:
adres kaydedilmiş, paylaşılmış ya da arama motoruna düşmüş olabilir.
Kapı üç katmanda birden: modül haritası (`withoutPrefixes`), komut
paleti (`runCommandSearch`in `hiddenPrefixes` parametresi) ve rotanın
kendisi (`FlagRoute`).

`FlagRoute` 404 DÖNDÜRMÜYOR: sayfa yok değil, kapalı. Geri gelecek bir
bölüm için 404 hem ziyaretçiyi hem botu yanıltır. Kapalıyken `noIndex`
basılıyor — o gün taranan sayfa kapalı hâliyle kaydedilmemeli.

### `siteMap` bilerek yönetilebilir yapılmadı

`nav_links` bağlanırken en kolay yol, sitedeki ÜÇ bağlantı listesini de
tabloya taşımaktı. Yapılmadı; sınır şurada:

    `primaryNav` → üst menü + footer modül satırı  → yönetiliyor
    `legalNav`   → footer kurumsal satırı          → yönetiliyor
    `siteMap`    → tam modül haritası (58 bağlantı) → KODDA

`siteMap` bir menü değil, sitenin ERİŞİLEBİLİRLİK GARANTİSİ.
`navigation.ts` bunu kendi başlığında söylüyor: "üst menüde görünmeyen
her sayfa burada görünür olmalıdır — aksi hâlde erişilemez hâle gelir."
Panelden silinebilir olsaydı yönetici bir sayfaya giden TEK yolu yok
edebilirdi ve hata sessiz olurdu: rota çalışır, sayfa durur, yalnızca
kimse bulamaz. "Kodsuz yönetim" hedefi, siteyi bozabilme hakkını
kapsamıyor.

Panelde bu sınır yöneticiye de yazılı olarak söyleniyor — göremediği bir
liste olduğunu bilmezse "menüye ekledim ama çekmecede yok" diye arar.

### İki yapılandırma birbirini görmek zorunda

Yönetici üst menüye `/radyo` bağlantısı ekleyip `radyo_acik` bayrağını
kapatabilir. İki yapılandırma birbirinden habersiz olsaydı panel kendi
kendisiyle çelişirdi: bir yerde kapattığın bölüm başka bir yerde
duruyor olurdu. `selectMenu` bayrak öneklerini de süzüyor.

### Hero: kuralı veritabanına koymak, istemciye anlatmaktan iyi

`home_modules`ta yayın penceresi `home_layout()` RPC'sinde uygulanıyor —
orada zaten taslak birleştirme için bir fonksiyon vardı. Hero'da taslak
akışı yok, dolayısıyla RPC'nin TEK işi pencereyi uygulamak olurdu.
Bunun yerine pencere `hero_slides`ın SELECT politikasına yazıldı:

    using (
      ((publish_from is null or publish_from <= now())
       and (publish_to is null or publish_to > now()))
      or app.is_admin()
    )

Sonuç ölçüldü: `anon` rolü ileri tarihli slaytı GÖRMÜYOR, yönetici
görüyor. Kural veritabanında olduğu için istemcinin unutması, yeni bir
sorgu yazılması ya da tabloya PostgREST'ten doğrudan gidilmesi durumu
değiştirmiyor. Bunun bir sonucu `heroSlides.ts`te `publish_from` diye
bir alanın HİÇ olmaması — okunmayan bir alanı tipe koymak, birinin onu
istemcide "uygulamaya" çalışmasına davetiye olurdu.

0059'un tuzağı (düzenlemek için görmek gerekir, görmek için yayında
olmak gerekirdi) aynı politikadaki `or app.is_admin()` ile çözüldü;
panel ayrı bir okuma yoluna ihtiyaç duymuyor.

### Lisans kuralı yorumdan kısıta çıktı

`slides.ts` şunu yazıyordu: "Kredi ekranda gösteriliyor — CC BY'nin şartı
bu ve gösterilmediğinde lisans ihlali olur." Doğru bir cümleydi ama
hiçbir şey onu zorlamıyordu; slaytlar kodda sabitken yeterliydi.
Panelden görsel eklenebilir olduğu anda yetersiz hâle geldi: krediyi boş
bırakmak lisans ihlalini tek tıkla mümkün kılardı.

`hero_slides_credit_check` artık görsel varsa kredi ve lisansın dolu
olmasını zorluyor (canlı ölçüldü: boş kredi `update`i reddediliyor).
Okuma katmanında ikinci kapı var — kredisiz görsel EKRANA ÇIKMIYOR, ama
slayt atılmıyor: çizilen sahnesiyle kalıyor, çünkü bir künye eksikliğini
içerik kaybına çevirmek orantısız.

### Tohum, kod okunarak yazılmamıştı

0058 `home_modules` tohumunu doldururken makul tahminler kullandı; o
sırada tabloyu okuyan kimse olmadığı için tutmadığı görünmüyordu.
Bağlanınca çıktı: `records` 6 (kod 10), `listings` 4 (kod 5) ve üç
başlıkta büyük/küçük harf farkı (`'Son ilanlar'` ↔ `'Son İlanlar'`).

Düzeltilmeseydi bağlama commit'i, kimsenin istemediği bir ürün
değişikliği yapardı — üstelik düzen kodunda bir hata gibi görünürdü.
**Kural: bir yapılandırma katmanı devreye girdiği gün DAVRANIŞI
KORUMALIDIR.**

`0061` bu yüzden yalnızca tohum değerine dokunuyor (`where item_limit =
6`, `where (key, title) in (...)`): yönetici bir değeri değiştirmişse
satır olduğu gibi kalıyor. Ölçüm bloğu da `updated_by is not null` olan
satırları atlıyor — atlamasaydı göç, tam da doğru davrandığı için
patlardı.

Başlıklar string kopyalanmak yerine `null`a çekildi: sütun zaten
nullable ve panelin yer tutucusu "Varsayılan başlık" diyor, yani
sözleşme hazırdı. Kopyalasaydık aynı cümle iki yerde yaşar ve kodda
başlığı değiştiren biri veritabanının sessizce eskisini dayattığını fark
etmezdi.

---

## Faz 11 — ayrıntı

### Önce envanter, sonra kod

Fazın kendi açılışı şunu istiyor: *"Aşağıdaki özellikleri mevcut ürün
mimarisiyle karşılaştır. Çakışan modülleri birleştir… Çalışmayan
placeholder gösterme."* Sitede 76 rota ve 33 özellik dizini var;
karşılaştırma yapılmadan yazılan her şey ikinci bir kopya olurdu.

| Bölüm | Karşılık | Durum |
|---|---|---|
| §14.1 Gözlem ve gökyüzü planlama | `/planlayici`, `/bu-gece`, `/hedefler`, `features/sky` | DONE'a yakın — hedef arama, yükseklik grafiği, alacakaranlık, ay ayrımı, favori/gözlem listesi (`0066`), **paylaşılabilir plan** ve **takvime ekleme** (`planShare.ts`) var; kalan tek madde **interaktif gökyüzü haritası** (dış veri/lisans gerektiriyor) |
| **§14.2 Astrofotoğraf hesaplama** | `/araclar/*` — FOV, pixel scale, mozaik, setup uyumluluk, **poz-plani** | **DONE — bu turda kapandı**: filtre–hedef uyumu, ay/ışık kirliliğine göre çekim planı ve kalibrasyon rehberi `poz-plani` sayfasına eklendi (`filterPlan.ts`, `calibration.ts`; 37 test) |
| §14.3 Gökyüzü olayları takvimi | `/araclar/takvim`, `events` | PARTIAL — ay fazı ve karanlık takvimi var; **meteor yağmuru**, **tutulma**, **ISS geçişi** yok (dış veri kaynağı gerekiyor) |
| §14.4 Karanlık gökyüzü haritası | `/saha`, `observing_sites`, ışık kirliliği katmanı | DONE'a yakın — koordinat gizliliği `photo_exact_locations` deseniyle çözülmüş |
| §14.5 Ekipman envanteri | `/ekipman`, `user_equipment`, `user_setups` | DONE |
| **§14.6 Gözlem günlüğü** | **`/gunluk`, `observation_logs` (`0064`)** | **DONE — bu turda yazıldı** |
| **§14.7 Kulüpler ve dizin** | **`/topluluklar`, `clubs` (`0067`), `/{sehir}-astronomi-etkinlikleri`** | **DONE'a yakın — bu turda dizin veritabanına taşındı**; doğrulama rozeti, iletişim/katılım alanları, şehir bazlı keşif ve panel bölümü var. Kalan tek madde: **kulübün etkinlik yayımlaması** (yönetici bağı `manager_user_id` olarak duruyor, yetki verilmedi — gerekçe aşağıda) |
| §14.8 İlanlar | `/ilanlar`, `listings` | DONE — §14.8'in on yedi maddesi karşılanıyor |
| §14.9 Bilgi merkezi | `/yazilar`, `/haberler`, **`/sozluk`, `/sss`** | DONE'a yakın — sözlük ve SSS bu turda eklendi (`0065`); kalan tek madde "video/radyo/podcast ilişkileri" |

### §14.6 neden yeni bir tablo — birleştirme denendi, olmadı

`astro_photos` bir GÖRÜNTÜNÜN künyesi; zorunlu çıktısı bir dosya.
`observation_logs` bir GECENİN kaydı ve çıktısı olmayabilir — dürbünle
bakıp not almak da gözlemdir, §14.6 "çizim/fotoğraf" diyerek fotoğrafı
zorunlu saymıyor. Tek tabloda toplamak, fotoğrafsız kayıtlar için yarısı
boş bir satır ve "bu foto mu gözlem mi" diye soran bir tür sütunu
demekti. Ayrı duruyorlar ama `photo_id` ile bağlılar.

### Gizlilik varsayılanı ÖZEL — ve bu geri alınamaz bir karar

§14.6 "özel veya public" diyor, varsayılanı söylemiyor. ÖZEL seçildi:
günlük kişisel bir defter ve içinde konum bilgisi var. Yanlış varsayılan
GERİ ALINAMAZ — kullanıcı fark ettiğinde kayıt zaten görünmüş olur.
Tersi zararsız: paylaşmak isteyen tek tıkla açıyor.

Aynı sebeple günlükte KOORDİNAT ALANI YOK, serbest metin var. §14.4
"hassas lokasyonların tam koordinatını koruma seçeneği" istiyor;
günlüğe koordinat koysaydık herkese açık bir kayıt kullanıcının
bahçesinin GPS'ini yayınlayabilirdi.

### RLS'i yazmak değil, ÖLÇMEK

`0064` politikaları kurduktan sonra kendi ölçüm bloğunu çalıştırıyor:
iki kullanıcı kurup dört soruyu cevaplıyor (kendi özelim görünür mü,
başkasının özeli görünür mü, başkasının açığı görünür mü, anonim ne
görür). İlk çalıştırmada **ölçüm patladı** — "anonim 2 kayıt görüyor".
Hata politikada değil ölçümdeydi: `set local role anon` yalnızca rolü
değiştiriyor, `request.jwt.claims` hâlâ önceki kullanıcının `sub`unu
taşıdığı için `auth.uid()` onu döndürüyordu. Gerçek bir anonim istekte o
talep hiç yok. Talep de temizlenince ölçüm geçti.

Bu, "politika doğru görünüyor" ile "politika doğru davranıyor"
arasındaki farkın somut örneği: ölçüm olmasaydı yanlış olan test değil
varsayımımız olurdu ve bunu hiç öğrenemezdik.

### `.ics` yazıcısı İKİNCİ KEZ YAZILMADI — RFC katmanı ortaklaştı

§14.1 planlayıcıdan "takvime ekleme" istiyor ve `features/events/
reminders.ts` içinde çalışan bir `.ics` yazıcısı ZATEN vardı. Fazın
birleştirme kuralı gereği ikinci bir yazıcı yazmak yerine RFC katmanı
`lib/ics.ts`e taşındı: kaçışlama (§3.3.11), 75 OKTETLİK satır katlama
(§3.1) ve UTC damgası.

Bunlar RFC'nin kuralları — etkinliğe ya da gece planına ait değil. İki
kopya olsaydı biri düzeltilir, öteki sessizce bozuk kalırdı; üstelik
hata takvim uygulamasında görünürdü, bizde değil.

`reminders.ts` kendi kararlarını KORUYOR ve orada kalıyor: iki saatlik
varsayılan bitiş, slug'a bağlı `UID`, mekân + şehir birleşimi. Bunlar
etkinliğe ait, RFC'ye değil. Mevcut 19 `.ics` testi taşımadan sonra
değişmeden geçti — ortaklaştırmanın davranışı bozmadığının ölçüsü.

Ortak yazıcı ÇOKLU VEVENT alıyor; gece planı için gerekliydi (bir
gecede beş hedef, beş kayıt). Tek etkinlik yazan bir imza planlayıcıya
beş ayrı dosya indirtirdi.

### Paylaşılabilir plan için TABLO AÇILMADI

§14.1 "paylaşılabilir plan" istiyor. Bir `plans` tablosu açmak
mümkündü ve yapılmadı: paylaşılan şey birkaç yüz baytlık bir seçim
(hedef slug'ları ve dakikalar). Tablo demek; RLS, kısa adres üretimi,
sahiplik, silme akışı ve "paylaştığım plan ne zaman silinir" sorusu
demekti.

Adres çubuğu bu veriyi zaten taşıyor:
`/planlayici?h=m31-andromeda:90,m42-orion:120&y=30`. Bağlantı
kopyalanabiliyor, forumda paylaşılabiliyor, yer imine eklenebiliyor ve
SUNUCUDA HİÇBİR ŞEY SAKLANMIYOR — silinecek bir şey de yok. Plan zaten
tarayıcıda hesaplanıyor, yani bağlantıyı açan kişi aynı hesabı kendi
konumuyla yapıyor.

KONUM PAYLAŞILMIYOR: bağlantıda yalnızca hedefler ve süreler var.
Konumu da koysaydık, planını paylaşan kullanıcı nerede gözlem yaptığını
da paylaşmış olurdu — §14.4'ün korumaya çalıştığı şey.

Sınır yazılı: çok uzun listeler adres sınırlarını zorlar. Bir gecede
5–8 hedef gerçekçi olduğu için bugün sorun değil; olursa çözüm tabloya
geçmek ve o kararı verecek kişi gerekçeyi kodda bulacak.

Seçimin kaynak sırası: **adres çubuğu → favoriler → katalog**.
Paylaşılan bağlantı kazanıyor — birinin gönderdiği planı açan kullanıcı
kendi favorilerini değil, gönderilen planı görmeli.

### §14.2'nin son üç maddesi: filtre uyumu, ay planı, kalibrasyon

Üçü de `poz-plani` sayfasına eklendi — **yeni rota açılmadı**. Girdilerin
çoğu ortak (hangi hedef, hangi filtreler, kaç gece); ayrı bir araç
kullanıcıya aynı bilgileri iki kez girdirir, iki sonucu kendi
birleştirtirdi.

**Filtre–hedef uyumu tek bir fiziksel soruya dayanıyor:** hedefin ışığı
ÇİZGİ mi, SÜREKLİLİK mi? Emisyon bulutsusu belirli dalga boylarında
parlar (Ha 656,3 / OIII 500,7 / SII 671,6 nm) — dar bant o pencereleri
açıp gerisini kapatır. Galaksi, küme ve yansıma bulutsusu süreklilik
yayar; dar bant hedefin ışığını da keser. Karanlık bulutsu ise "duruma
bağlı" dönüyor ve sebebini söylüyor: kendi ışığı yok, arka perdeye
karşı siluet, o perdenin ne olduğunu bilmiyoruz.

**"Uygun değil" satırları GİZLENMİYOR.** Bir filtrenin neden işe
yaramayacağını öğrenmek, hangisinin yarayacağını öğrenmek kadar
değerli — kullanıcının elinde zaten o filtre olabilir.

**LP filtresi hiçbir koşulda `uygun` dönmüyor** ve bu, §14.2'nin
"belirsiz alanda kesinlik iddiası kullanma" kuralının en somut
uygulaması. O filtreler sodyum/cıva lambalarının AYRIK çizgilerini
kesmek için tasarlandı; aydınlatma LED'e geçtikçe kesilecek çizgi
kalmıyor, çünkü LED'in tayfı sürekli. Aynı filtre aynı şehirde on yıl
önce işe yarıyordu, bugün büyük ölçüde yaramıyor — ve bu, ürünün
kutusunda yazmıyor. Test bunu kilitliyor: üç ayrı gökyüzü koşulunda da
`uygun` dönmediği ölçülüyor.

**Ay etkisi BANT olarak veriliyor, magnitüd olarak değil.** Sayısal
modeli var (Krisciunas & Schaefer 1991) ama ayın yüksekliğini, hava
kütlesini ve aerosol saçılmasını ister; o girdiler bu araçta yok. Bir
sayı uydurmak yerine "hafif / belirgin / ağır" dönülüyor ve ekranda
neden öyle olduğu yazıyor.

**Hesaplanan tek şey süreklilik reddi:** 7 nm'lik bir filtre 300 nm'lik
pencerenin %2,3'ünü geçirir. Düz süreklilik varsayımı ekranda AÇIKÇA
yazılı ve neyin ihmal edildiği sayılıyor (lamba/hava parıltısı
çizgileri, filtre geçirgenliğinin tepede bile %100 olmaması, kameranın
dalga boyuna göre değişen verimi). "SNR şu kadar artar" denmiyor.

**Güneş her sınıfta reddediliyor** ve gerekçe filtre tercihi değil
güvenlik: yanlış filtre göze kalıcı zarar verir. Test bunu da
kilitliyor.

**Kalibrasyon rehberi metin değil VERİ**, çünkü cevap kurulumla
değişiyor: dark-flat çeken bir CMOS kullanıcısı için bias GEREKSİZ ve
listeye hiç girmiyor — yarım çalışan bir adım göstermektense hiç
göstermemek. Kare sayıları aralık; yığınlamada gürültü √N ile azaldığı
için "50 yerine 200" dört katı emek, iki katı iyileşme demek ve ekran
bu oranı yazıyor. Formülün yalnızca ilişkisiz gürültü için geçerli
olduğu da yazılı: sabit desen, amp glow ve ışık sızıntısı yığınlamayla
gitmez.

### §14.7: dizin VARDI ama tablosu YOKTU

Belgede `clubs` tablosu varmış gibi yazıyordu; yoktu. `/topluluklar`
tamamen `features/clubs/data.ts` içindeki altı sabit kayıttan
besleniyordu ve §14.7'nin dört maddesi bu yüzden İMKÂNSIZDI: bir
telefonu düzeltmek, kapanmış bir kulübü çıkarmak, bir kaydı doğrulamak
ya da güncelliğini işaretlemek — hepsi dağıtım almak demekti.

`0067` tabloyu açtı. Tohum ELLE YAZILMADI, `data.ts` okunarak üretildi
ve `clubsSource.test.ts` hizayı kilitliyor (0058'in elle yazılmış
tohumu koddan ayrışmış ve 0061'i yazdırmıştı).

**İki ayrı "doğrulama" var ve karıştırılmıyor:**

| Alan | Ne söyler | Ziyaretçide |
|---|---|---|
| `verified_at` | KULÜBÜN KENDİSİ teyit edildi: yöneticisiyle iletişim kuruldu | "Doğrulanmış" rozeti |
| `info_checked_on` | BİLGİNİN tazeliği: adres/iletişim en son ne zaman kontrol edildi | Künyede tarih |

Birincisi bir GÜVEN ifadesi, ikincisi bir TAZELİK ölçüsü. Tek alanda
toplasaydık "doğrulanmış ama bilgisi iki yıl eski" kulüp ile "bilgisi
taze ama kim olduğu belirsiz" kulüp aynı görünürdü. Panelde de ayrı:
"Doğrula" kendi düğmesinde, tarih formun içinde — bir telefon numarası
düzelten yönetici farkında olmadan kulübü doğrulanmış ilan etmesin.

**Tohum HİÇBİR kulübü doğrulanmış işaretlemiyor.** Rozeti tohumla
vermek onu daha ilk günde yalan hâline getirirdi; göçün ölçüm bloğu
bunu kontrol ediyor.

**`manager_user_id` bir BAĞ, bir YETKİ değil.** Kulübü yöneten
kullanıcıyı işaret ediyor ama yazma hakkı vermiyor: yazma politikası
yalnızca `app.is_admin()`. Sebep, dizinin editoryal olması — kulüpler
kendi kayıtlarını serbestçe düzenleyebilseydi dizin bir tanıtım
panosuna döner ve "doğrulanmış" rozeti anlamını yitirirdi. §14.7'nin
"etkinlik yayınlama" maddesi bu bağın üstüne kurulacak ve o iş açıkken
duruyor.

**İletişim ve katılım alanları tohumda BOŞ.** Kayıtlar gerçek kurumlara
ait; olmayan bir e-posta uydurmak ziyaretçiyi var olmayan bir adrese
yazmaya yollamak olurdu. Alanlar panelden dolduruluyor, boşken profilde
o satırlar hiç çizilmiyor.

**`mergeWithSeed` KULLANILMADI — ve bu bilinçli bir ayrım.** Haber,
yazı ve sözlükte veritabanı satırları koddaki tohumun ÜSTÜNE ekleniyor.
Burada olmaz: tablo zaten tohumun tamamını içeriyor, birleştirme
yapsaydık yöneticinin dizinden ÇIKARDIĞI kulüp koddaki kopyasından geri
gelirdi — moderasyon kararı sessizce iptal olurdu. Tablo okunabildiği
sürece tek kaynak tablo; kod yalnızca yedek.

**Yerel SEO için İKİNCİ bir şehir sayfası ailesi açılmadı.** Sitede
zaten `/{sehir}-astronomi-etkinlikleri` sayfaları var (§20) ve "ankara
astronomi" sorgusu ikisini de hedefliyor; ayrı bir `/topluluklar/{sehir}`
ailesi aynı niyet için birbiriyle yarışan iki adres üretirdi. Fazın
açılış kuralı çakışan modülleri BİRLEŞTİRMEK — kulüpler o sayfalara bir
bölüm olarak eklendi. Sayfası olmayan şehir (ör. Nevşehir) süzgeçli
dizine gidiyor: olmayan bir adrese bağlantı vermektense.

### §14.2: neyin hesaplanacağına da fazın kuralı karar verdi

§14.2 iki şey emrediyor: *"hesapların formüllerini testlerle doğrula"* ve
*"bilimsel sonucu belirsiz alanlarda kesinlik iddiası kullanma"*. İkisi
birlikte, neyin hesaplanıp neyin hesaplanmayacağını da belirliyor.

HESAPLANIYOR (aritmetik, tek doğrusu var):
  · Hedef entegrasyona ulaşmak için filtre başına kare sayısı
  · Gece başına kullanılabilir süreye göre kaç gece gerektiği
  · Ham (sıkıştırılmamış) depolama ihtiyacı

HESAPLANMIYOR (tek doğrusu YOK) — ve bu ekranda da yazıyor:
  · **"Optimum" alt poz süresi.** Gökyüzü parlaklığına, okuma
    gürültüsüne, f oranına ve montaj takibine bağlı. Kullanıcı kendi
    süresini giriyor; araç bir sayı ÖNERMİYOR ve önermediğini söylüyor.
  · **Dither aralığı.** Türetilebileceği bir denklem yok; yerleşik
    pratik bir ARALIK döndürülüyor (2–5 kare gibi), tek sayı değil.
  · **Sıkıştırılmış dosya boyutu.** Kazanç hedefin gürültüsüne bağlı;
    sabit çarpan (%30 gibi) yazmak uydurma olurdu. Ham boyut veriliyor
    ve bunun ÜST SINIR olduğu söyleniyor.

Aracın ne YAPMADIĞINI söylemek, yaptığını söylemek kadar önemli:
kullanıcı poz süresini girerken "acaba doğru mu" diye düşünüyor ve
aracın ona bir sayı önermediğini bilmesi gerekiyor.

### Hesap `integration.ts`e eklenmedi — paket sebebiyle

Mevcut `domain/photography/integration.ts` ÇEKİLMİŞ olanı topluyor ve
`PhotoCard` üzerinden ANA SAYFA paketine giriyor. Plan hesapları oraya
eklenseydi, hiç planlayıcı açmayan ziyaretçiye de inerdi. Ayrı modül
(`capturePlan.ts`) `formatIntegration`ı ondan alıyor — biçimlendirme
yine tek yerde. Yön de farklı: biri "ne çektim", öteki "ne çekmem
gerek".

### Testler elle hesaplanmış sayılarla

§14.2'nin "formülleri testlerle doğrula" maddesi, fonksiyonun kendi
çıktısını beklenen değer olarak almakla karşılanmaz — o yalnızca
değişmezliği ölçer. Testler elle hesaplanabilir sayılar kullanıyor:
10 saat LRGB 4:1:1:1 ve 300 sn alt poz → L için 69, RGB için 18'er kare;
6248×4176×2 bayt × 100 kare → 5 218 329 600 bayt.

Yuvarlama yönü de ölçülüyor: kare sayısı YUKARI yuvarlanıyor, çünkü
aşağı yuvarlamak hedefin ALTINDA kalmak demek. Plan hedefi biraz aşıyor
ve ekranda "istediğin" değil "çıkan" gösteriliyor.

`formatBytes` 1024 tabanı kullanıyor: kullanıcı sonucu diskiyle
karşılaştıracak ve 1000 tabanı "40 GB" derken disk 37,2 GB gösterirdi.

### §14.1'de "birleştir" kuralı SORULDU ve cevabı HAYIR çıktı

§14.9'da `content_entries` genişletilerek yeni tablo açılmamıştı. Aynı
soru favori hedefler için de soruldu — `collections` / `collection_items`
kullanılabilir mi? Cevap farklı çıktı ve bu, kuralın körlemesine
uygulanmadığının kanıtı.

`collection_items` şöyle: `photo_id uuid NOT NULL references
astro_photos(id)`, birincil anahtar `(collection_id, photo_id)`.
Hedefleri sokmanın tek yolu `photo_id`yi nullable yapmak, bir
`target_slug` sütunu eklemek, birincil anahtarı değiştirmek ve "bu satır
foto mu hedef mi" diye soran bir ayrım sütunu koymaktı — yani 0064'te
gözlem günlüğü için REDDETTİĞİMİZ şeklin aynısı.

Kavramsal olarak da tutmuyor:

    collections     → ADLANDIRILMIŞ, paylaşılabilir, sıralı foto seçkisi
    favori hedefler → adsız düz küme; "yıldızladım" demek

Koleksiyonun adı, slug'ı, gizlilik anahtarı ve paylaşım adresi var;
favori hedefte bunların hiçbiri yok ve olması da istenmiyor. Birleştirme
kuralı "her şeyi tek tabloya yığ" demek değil, ÇAKIŞAN modülleri
birleştir demek.

### "Gözlem listesi" ayrı bir tablo değil — bir YORUM, gizli bir eksik değil

§14.1 "favori hedefler" ve "gözlem listesi"ni ayrı maddeler sayıyor.
İkincisini birincinin BU GECEYE göre süzülmüş hâli olarak yorumladık:
sıralamayı gökyüzü belirliyor (yükseklik, transit), kullanıcı değil —
saklanacak bir sıra yok. Pratik karşılığı, favorilenen hedeflerin
planlayıcıyı açtığında seçili gelmesi.

İki ayrı liste, kullanıcıya aynı hedefi iki kez işaretletirdi
("favoriledim ama listeye eklemedim") ve aradaki farkı kimseye
anlatamazdık. Bu yorum burada yazılı olduğu için, ileride biri "gözlem
listesi nerede" diye sorduğunda cevabı var.

Planlayıcıda favoriler BAŞLANGIÇ DEĞERİ, bağlayıcı kaynak değil:
kullanıcı bu gece favorisi olmayan bir hedef eklemek isteyebilir ve
bunun için favorilemek zorunda kalmamalı. Favori listesi geç gelen bir
yanıt olduğu için seçim yalnızca BİR KEZ değiştiriliyor — her yüklemede
uygulasaydık kullanıcının o sırada eklediği hedefleri silerdi.

### §14.9 için YENİ TABLO AÇILMADI — fazın kendi kuralı

Sözlük ve SSS için ayrı tablo açmadan önce `content_entries` incelendi ve
§14.9'un istediği her alanın zaten orada olduğu görüldü:

    §14.9 maddesi          content_entries karşılığı
    ─────────────────      ─────────────────────────
    içerik seviyesi        level
    okuma süresi           duration
    editoryal doğrulama    status ('taslak' / 'yayinda')
    kaynak                 source_name, source_url
    güncelleme tarihi      updated_at

`0065` yalnızca `kind` kısıtına iki değer ekliyor. Ayrı tablo; ikinci bir
RLS politikası, ikinci bir panel yüzeyi, ikinci bir okuma katmanı ve
zamanla ayrışan iki "yayınla" akışı demekti. Göçün ölçümü üç şeyi birden
kontrol ediyor: yeni türler kabul ediliyor mu, eski türler bozuldu mu,
UYDURMA bir tür hâlâ reddediliyor mu (kısıt gevşetilirken yanlışlıkla
kaldırılsaydı panelden her şey yazılabilirdi).

### Türkçe'de arama ile sıralama aynı şey değil

Sözlük araması ilk yazımda `toLocaleLowerCase('tr')` kullanıyordu ve test
yakaladı: Türkçe yerelde `'SEEING'` küçültülünce `'seeıng'` oluyor
(noktasız ı), yani caps lock açık arayan kullanıcı HİÇBİR ŞEY bulamıyordu.

Ayrım şu: Türkçe harf dönüşümü GÖSTERİM ve SIRALAMA için doğru,
EŞLEŞTİRME için yanlış — kullanıcının yazdığı biçimle metindeki biçim
aynı olmak zorunda değil. Arama `lib/text`teki `normalizeTr`e geçti (ı/i,
ş/s, ğ/g, ü/u, ö/o, ç/c katlanıyor); sıralama ve harf dizini Türkçe
kalmaya devam ediyor, çünkü orada "Ö" gerçekten "O"dan sonra gelmeli.

### SSS akordeonu `<details>` — üç şeyi bedava veriyor

Durum tutan bir bileşen yazmadık. `<details>/<summary>` klavyeyle
çalışıyor, ekran okuyucu açık/kapalı durumunu kendisi duyuruyor ve JS
gelmeden önce de açılıyor. Kendi yazdığımız akordeon bu üçünü elle
kurmak zorunda kalırdı; genellikle üçüncüsü unutulur.

Ölçüldü: prerender çıktısında on `<details>` var, hepsi KAPALI ve
cevap metinleri ham HTML'de duruyor — yani arama motoru cevapları
görüyor. JS ile açılan bir akordeonda o metin ilk HTML'de hiç olmazdı.

### Sorgu niyeti RLS'e bırakılmıyor

`fetchMyLogs` `user_id` üzerinde AYRICA filtreliyor. RLS başkasının
özel kaydını zaten vermiyor ama başkasının AÇIK kaydını veriyor —
filtresiz sorgu "benim günlüğüm" sayfasına bütün sitenin açık
kayıtlarını dökerdi. RLS bir güvenlik sınırı, sorgu niyeti değil.

---

## Sonraki oturum için devam notu

**Bittiği yer:** Faz 2, Faz 5 ve Faz 6 kapandı. Faz 3'ün 3.1'i
kapandı; 3.2, 3.3 ve 3.4'ün ölçülebilir tamamı bitti. Faz 3'te kalanlar iki kümede
toplanıyor:
  · **Faz 10'a bağlı** (tablo gerektiriyor): hero slaytlarının admin
    yönetimi, "boşsa gizle" anahtarı, hava sağlayıcı seçimi.
  · **Bağımsız, yapılabilir**: tarih kontrolleri (çift ok, manuel seçici,
    "Bugün", URL'de paylaşılabilir tarih), iki ayrı uygunluk skoru,
    `observedAt`ın arayüzde gösterilmesi.

Faz 4'ün geçişi BİTTİ (10/10). Faz 4'te kalanlar tablo ya da ürün
kararı bekliyor (kaydedilmiş görünümler, CSV, tablo görünümü, mobil
filtre drawer'ı, sunucu tarafı sayfalama).

**Faz 5'in çekirdeği kapandı** (bkz. Faz 5 bölümü): altı yeni tablo
(`follows`, `user_blocks`, `notifications`, `conversations`,
`conversation_participants`, `messages`, `collections`,
`collection_items`), sekiz migration (`0041`–`0048`), üç yeni ekran ve
panelde bir yeni bölüm. Migration numaraları `0049`dan devam ediyor.

Faz 5'te kalan tek tablo `clubs`; §8.11'in konusu ve kendi turunu hak
ediyor.

**Faz 6 kapandı** (bkz. Faz 6 bölümü): iki migration (`0049`, `0050`),
üç yeni tablo (`event_follows`, `reminders`, `event_changes`) + bir ayar
tablosu (`app_settings`), beş dakikada bir çalışan `hatirlatma-gonderimi`
cron işi, etkinlik sayfasında takip/hatırlatma/takvim kontrolü ve
panelde sekizinci sekme. Migration numaraları `0051`den devam ediyor.

Faz 6'da kodla kapatılabilecek iş kalmadı; kalan tek şey e-posta
sağlayıcısı kararı (**Sen**) ve belgenin "ileride" dediği web push.

**Faz 7'nin veri ve sunucu katmanı kapandı** (bkz. Faz 7 bölümü): üç
migration (`0051`–`0053`), on bir yeni tablo, AzuraCast adaptörü, sağlık
yoklaması, dağıtım paketi (`deploy/radyo/`) ve program takvimi hesabı.
Migration numaraları `0054`ten devam ediyor.

**Faz 7'nin arayüzü de kapandı**: servis katmanı, program takvimi,
program/yayıncı/podcast/bölüm sayfaları, dinleme ilerlemesi ve panel
Radyo sekmesi. Beş yeni rota, 86 rewrite.

**Faz 7'de kodla kapatılabilecek iş kalmadı.** Kalan üç madde:
  · **Canlı yayın aktivasyonu** — VPS gerekiyor, on iki adımlık kurulum
    listesi `deploy/radyo/README.md`de.
  · **Media Session, yeniden bağlanma, kalite seçimi** — üçü de çalışan
    bir yayın akışı olmadan doğrulanamaz. Yazılabilirdi ama test
    edilemeyen bir kod, çalıştığı varsayılan bir koddur.
  · **RSS feed** — alanlar `0053`te hazır (`author`, `owner_email`,
    `explicit`, `language`); üreticisi bir sonraki turun işi.

**Faz 8'in veri katmanı kapandı** (bkz. Faz 8 bölümü): `0055`, yedi
tablo, YouTube bağlantı şeması. Migration numaraları `0056`dan devam
ediyor.

**Faz 8'in sunucu tarafı ve paneli kapandı**: `0055`–`0056`, YouTube
adaptörü (35 test) ve panelde onuncu sekme. Migration numaraları
`0057`den devam ediyor.

**Faz 8'in kullanıcı sayfaları da kapandı** (video arşivi, seriler,
yayın takip düğmesi). Faz 8'de kodla kapatılabilecek iş kalmadı.

**Faz 10'un iki turu bitti** (bkz. Faz 10 bölümü): ana sayfa düzeni ve
yedi feature flag ziyaretçi tarafından okunuyor; bakım modu ve site
duyurusu çalışıyor.

**Faz 10'un üçüncü turu da bitti**: `nav_links` tohumlandı (`0062`),
panelde "Menü ve footer" bölümü açıldı, üst çubuk ve footer tabloyu
okuyor. Fazın üç kopuk zincirinin üçü de kapandı.

**FAZ 10 KAPANDI** (bkz. Faz 10 bölümü). Dört tur sürdü ve dördünde de
aynı hata çıktı: panel yazıyor, ziyaretçi okumuyor. Sırasıyla
`home_modules`, `feature_flags`, `nav_links`, `hero_slides`. Dördü de
kapalı; §13.2'nin yönetilebilir yüzeyleri artık uçtan uca çalışıyor.

Faz 3'ün "Faz 10'a bağlı" kalemlerinden hero slaytlarının admin
yönetimi de bu turda açıldı. Kalan iki kalem (hava sağlayıcı seçimi,
"boşsa gizle" anahtarı) Faz 3'ün kendi bölümünde duruyor.

**Faz 11'de §14.2, §14.6, §14.7, §14.9 ve §14.1'in beş maddesi
kapandı** (bkz. Faz 11 bölümü). Yedi turda dört göç (`0064`, `0065`,
`0066`, `0067`), dört domain modülü (`capturePlan.ts`, `planShare.ts`,
`filterPlan.ts`, `calibration.ts`) ve bir ortaklaştırma (`lib/ics.ts`).

Bu turda düzeltilen bir BELGE HATASI: önceki not "`clubs` tablosu var"
diyordu, YOKTU. Dizin sabit bir koddan besleniyordu ve §14.7'nin
doğrulama/moderasyon maddeleri bu yüzden imkânsızdı. `0067` tabloyu
açtı.

**Sıradaki iş: Faz 11'in kalan `PARTIAL` satırları.**
  1. **§14.7 kalanı — kulübün etkinlik yayımlaması.** `manager_user_id`
     bağı `0067`de duruyor ama YETKİ vermiyor (dizin editoryal). Bu
     madde, doğrulanmış bir kulübün yöneticisinin kendi etkinliğini
     girebilmesi demek; `events` tarafında sahiplik ve moderasyon
     kararı gerektiriyor.
  2. **§14.3 meteor/tutulma/ISS** ve **§14.1 interaktif gökyüzü
     haritası** — dış veri lisansı ya da servis gerektiriyor; adapter +
     feature flag ile hazırlanacak, placeholder GÖSTERİLMEYECEK. Bayrak
     altyapısı Faz 10'da kuruldu ve ziyaretçi tarafında çalışıyor.

**Kanal bağlı değilken sahte içerik gösterilmemeli** (§11.2 son madde).
Adaptör ve panel bu kurala uyuyor; kullanıcı sayfaları yazılırken de
uyacak — boş arşiv boş görünmeli, "yakında" satırı yazılmamalı.

**Kanal bağlantısı yokken sahte içerik gösterilmemeli** (§11.2 son
madde) — radyodaki "sahte canlı" yasağının TV karşılığı. Arayüz
yazılırken bu davranış korunmalı.

Hazır olan parçalar: `RadioVault` (admin mp3 kasası), `BroadcastControl`
(yayın programı), üst çubuktaki play/pause ve rota değişiminde ayakta
kalan radyo rıhtımı (E2E'de ölçülü).

**Kurulum yapılmadan site radyoyu çevrimdışı gösteriyor ve bu doğru
cevap** — arayüz yazılırken bu davranış korunmalı.

Sırada bekleyen iki bağımsız iş:
  · **`collections`** — explorer'ın "favoriler" facet'ini açar.
  · **Aktivite akışı** — `follows` hazır; "takip ettiklerin ne yaptı"
    akışı §8'in kalan parçası.

**Faz 3 için hazır bilgi:**
- `check:viewports` artık `test:all` içinde ve geçiyor; ana sayfayı
  büyüten her değişiklik kapıda düşer. 1280×720 payı: içerik 583px'de,
  eşik 600px (720 − 120).
- Hero yüksekliğini `min-h` değil İÇERİK belirliyor.
- `ContentSelection.status` (`loading`/`ready`/`error`) artık her katalog
  kancasında var. Diğer ana sayfa şeritleri (`RecentListings`,
  `UpcomingEvents`, `DarkSkyStrip`) hâlâ bu ayrımı yapmıyor — aynı
  desenle bağlanabilirler.

**Çalışma yöntemi** (bu oturumda işe yaradı):
- Master belgeyi TAMAMEN okuma; yalnızca faz satır aralığını oku
- Her veritabanı kuralını canlıda `raise exception` ile GERİ ALINAN
  işlemde ölç — iddia etme
- Arayüz iddialarını gerçek tarayıcıda `getBoundingClientRect` ile ölç;
  ölçüm aracının kendi kusurunu ürünün kusuru sanma (galeride "ilk blok
  1979px" böyle bir yanlış alarmdı)
- Her faz sonunda `npm run test:all`, sonra commit + push
- Durum belgesini her fazda güncelle

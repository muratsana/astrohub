# Veritabanı ve RLS

Ana görev belgesi Faz 1.3'ün çıktısı. Buradaki her sayı **canlı
veritabanında ölçüldü** (proje `eoqggvosegjbburyuyba`), kaynak koddan ya
da migration dosyalarından çıkarılmadı — migration dosyası neyin
amaçlandığını söyler, veritabanı neyin gerçekleştiğini.

Ölçüm tarihi: 2026-07-31 · Faz 5 eklemeleri 2026-08-01'de ölçüldü.

## Ölçüm yöntemi

Üretim verisi üzerinde yıkıcı test yapılmadı. Yazma davranışını ölçmek
gerektiğinde işlem şu kalıpla geri alındı:

```sql
do $$ declare r text; begin
  -- ölçüm
  raise exception 'GERI ALINDI -- %', r;
end $$;
```

`raise exception` işlemi geri sarar ama ölçüm sonucu hata metniyle
yüzeye çıkar. Böylece "RLS bu yazmayı engelliyor mu" sorusu üretimde
kalıcı iz bırakmadan cevaplanır.

Rol taklidi de aynı işlem içinde yapılır:

```sql
perform set_config('request.jwt.claims', format('{"sub":"%s"}', uid), true);
perform set_config('role', 'authenticated', true);
```

## Genel durum

| Ölçüm | Değer |
|---|---|
| `public` şemasındaki tablo | 49 |
| RLS **kapalı** tablo | 1 (`spatial_ref_sys`) |
| RLS açık, politikasız tablo | 1 (`edge_rate_limits`) |
| Politika sayısı | 116 |
| `app` şemasındaki yardımcı fonksiyon | 38 |
| `anon`/`public` rolüne yazma izni veren politika | **0** |

### `spatial_ref_sys` — PostGIS'e ait, bizim değil

Bu tablo PostGIS eklentisiyle gelir ve sahibi `supabase_admin`'dir. RLS
açılamaz; `alter table` sahiplik hatası verir. Yazma yetkisi de
kapatılamaz: `revoke` komutu `postgres` rolüyle **sessizce hiçbir şey
yapmaz** (hata da vermez), çünkü ayrıcalıkları veren `supabase_admin`.
Bu ölçüldü — `revoke` öncesi ve sonrası ayrıcalık sayısı 4 → 4.

`0006` migration'ının yorumu bu yolun kapatıldığını iddia ediyordu;
yanlıştı ve düzeltildi. Gerçek kapatma yalnızca Supabase destek
tarafından `supabase_admin` ile yapılabilir → **IMPLEMENTED_BLOCKED_EXTERNAL**.

`npm run check:rls` bu durumu her çalıştırmada canlıda yeniden ölçer, ki
sessizce değişirse fark edilsin.

### `edge_rate_limits` — bilinçli olarak politikasız

RLS açık ve **hiç politika yok**. Bu bir eksik değil, kasıtlı bir
"herkese kapalı" tanımı: PostgreSQL'de RLS açık + politika yok = hiçbir
satır görünmez. Ayrıca tablo ayrıcalıkları da dar:

```
postgres=arwdDxtm/postgres | service_role=arwdDxtm/postgres
```

`anon` ve `authenticated` için `select` yetkisi ölçüldü: **false**.
Yani tablo yalnızca sunucu tarafındaki `service_role` ile erişilebilir.
İki katman birlikte duruyor: ileride yanlışlıkla bir `grant` verilse
bile RLS satırları hâlâ kapalı tutar.

## Politika hijyeni

Üç sorgu canlıda çalıştırıldı:

| Kontrol | Sonuç |
|---|---|
| `TO authenticated` verilip başka koşul içermeyen politika | **0 satır** |
| `UPDATE`/`ALL` olup `WITH CHECK` taşımayan politika | **0 satır** |
| `anon`/`public` rolüne `INSERT`/`UPDATE`/`DELETE` veren politika | **0 satır** |

Birinci kontrol önemli: `TO authenticated` tek başına yetkilendirme
**değildir**. Sitedeki her giriş yapmış kullanıcı o roldedir, yani
koşulsuz bir `TO authenticated` politikası "herkes herkesin verisini
görebilir" demektir. Böyle bir politika bulunmadı — hepsinde ya sahiplik
(`user_id = (select auth.uid())`) ya da rol kontrolü
(`app.has_role(...)`) var.

### `auth.uid()` sarmalama

Politikalardaki `auth.uid()` çağrıları `(select auth.uid())` biçiminde.
Fark performans: sarmasız hâlde planlayıcı fonksiyonu **satır başına**
çağırır; `select` içinde InitPlan olarak bir kez değerlendirir. 52
politikanın tamamı `0037` migration'ında kendi tanımlarından yeniden
üretilerek düzeltildi — elle yazılsaydı kopyala-yapıştır hatası bir
tabloyu açık bırakabilirdi.

## `SECURITY DEFINER` fonksiyonlar

`public` şemasında dört tane görünüyor; üçü PostGIS'in `st_estimatedextent`
aşırı yüklemeleri (bizim değil, sahibi `supabase_admin`).

Kalan bir tane bizim: `public.consume_rate_limit(text, integer, integer)`.

| Ölçüm | Değer |
|---|---|
| `prosecdef` | `true` |
| ACL | `postgres=X/postgres, service_role=X/postgres` |
| `anon` execute | **false** |
| `authenticated` execute | **false** |
| `search_path` | `public` (sabitlenmiş) |

Yani `SECURITY DEFINER` ama istemci rollerine **açık değil** — yetki
yükseltme yolu yok. Kalan tek eksik yerleşim: ana görev belgesi
"privileged fonksiyonlar kontrollü şemada tutulmalı" diyor, bu fonksiyon
ise `public` içinde. `app` şemasına taşınması gereken bir düzen işi;
açık bir güvenlik boşluğu değil. Faz 15'te taşınacak.

## Şema boşluğu — belgedeki alan modeliyle karşılaştırma

Ana görev belgesinin gerektirdiği tabloların 24'ü mevcut, **14'ü yok**.
Eksiklerin her biri, onu gerektiren fazda RLS'iyle birlikte
oluşturulacak; burada listelenmesi o fazların girdisidir.

### Mevcut

`profiles` · `user_roles` · `audit_logs` · `moderation_queue` ·
`astro_photos` · `photo_comments` · `photo_likes` · `photo_versions` ·
`photo_exposures` · `content_entries` · `events` · `event_registrations` ·
`listings` · `observing_sites` · `provinces` · `districts` ·
`tv_broadcasts` · `edge_rate_limits` · `notifications` · `conversations` ·
`conversation_participants` · `messages` · `follows` · `user_blocks`

### Eksik

`conversation_participants` listede yoktu ama gerekliydi: sohbet başına
tek okuma imleci (`last_read_at`) olmadan okunmamış sayısı mesaj başına
bir "okundu" satırı isterdi.

| Tablo | Alan | Oluşturulacağı faz |
|---|---|---|
| `collections` | Favori / koleksiyon | 5 (kalan) |
| `clubs` | Kulüp / topluluk | 5 (kalan) |
| `reminders` | Hatırlatma | 6 |
| `radio_stations` | Radyo istasyonu | 7 |
| `radio_programs` | Radyo programı | 7 |
| `radio_hosts` | Radyo sunucusu | 7 |
| `podcasts` | Podcast | 7 |
| `tv_channels` | TV kanalı | 8 |
| `tv_programs` | TV programı | 8 |
| `membership_plans` | Premium plan | 9 |
| `usage_records` | Kota kaydı | 9 |
| `site_settings` | Site ayarı / feature flag | 10 |
| `home_modules` | Ana sayfa modül düzeni | 10 |
| `navigation_items` | Menü yapılandırması | 10 |
| `system_health_events` | Sistem sağlığı | 16 |

## Faz 5 — bildirim, mesaj, sosyal graf (0041–0044)

Dört tasarım kararı bu göçleri şekillendirdi. Hepsi davranış olarak
ölçüldü (yerel PostgreSQL 16 üzerinde 52 kontrol) ve `check:rls`
matrisine 26 yeni satır olarak eklendi.

### 1. Bildirim istemciden yazılamaz

`notifications` tablosunda `insert` yetkisi **hiçbir role verilmedi**.
Üretimin tek yolu `security definer` tetikleyiciler (`app.notify`) ve
yönetici RPC'si (`public.notify_user`). Yetki verilseydi bir kullanıcı
başkasının adına "X seni takip etti" bildirimi uydurabilirdi — kimlik
taklidinin en ucuz biçimi.

`update` yetkisi VERİLDİ (okundu/arşiv işaretlemek için) ama koruma
tetikleyicisi metin alanlarını eski değerine geri yazıyor: alıcı kendi
bildiriminin başlığını değiştirip ekran görüntüsüyle "site bana şunu
yazdı" diyemiyor.

### 2. Kategori veritabanında türetiliyor

`notifications.category`, `kind`ten **üretilen** bir kolon
(`generated always as (app.notification_category_of(kind)) stored`).
İstemcide ikinci bir tür→kategori eşlemesi tutulsaydı, tercih ekranında
"sosyal"i kapatan kullanıcı veritabanının "içerik" saydığı bir bildirimi
almaya devam ederdi ve hangi tarafın doğru olduğu belirsizleşirdi.

Tercih kontrolü de sunucuda: `app.notification_allowed()` kapalı
kategoride hiç satır üretmiyor. `sistem` kategorisi kapatılamıyor
(moderasyon kararı, üyelik ve güvenlik uyarıları) ve arayüz de o kutuyu
göstermiyor.

### 3. Engelleme tek yönlü kayıt, çift yönlü etki

`user_blocks` satırı tek yönlü; `app.is_blocked(a, b)` iki yönü birden
sorguluyor. Fonksiyon `security definer` olmak zorunda: çağıran kullanıcı
karşı tarafın engelleme satırını RLS yüzünden göremiyor (görebilseydi
engellendiğini öğrenirdi) ama kontrolün kendisi o satıra bakmak zorunda.
Dışarıya sızan tek bilgi "bu ikili birbirine yazamaz" — hangi tarafın
engellediği değil.

RLS'in `user_blocks` üzerindeki tek okuma politikası
`blocker_id = auth.uid()`. Yönetici bile listeyi göremiyor: moderasyon
için gereken "bu kullanıcı kimi engelledi" değil, "bu kullanıcı kimi
taciz etti" ve o bilgi `moderation_queue`'da.

Engelleme tetikleyicisi takibi **iki yönde de** koparıyor; yarım bir
engel, engellenen kişiyi akışta bırakırdı.

### 4. Mesaj RLS'i özyinelemesiz

"Katılımcı olduğum sohbetin katılımcılarını görebilirim" kuralı doğrudan
yazıldığında politika kendi tablosunu sorgular ve PostgreSQL sonsuz
özyinelemeyle patlar. Kontrol `app.in_conversation()` içinde,
`security definer` olarak duruyor.

Sohbet açmak da istemciye bırakılmadı: `conversations` tablosunda `insert`
yetkisi yok, tek yol `public.start_direct_conversation()`. Sebep, sohbet
açmanın tek satır değil üç satırlık bir bütün (sohbet + iki katılımcı)
olması ve arada engel kontrolü bulunması — istemciye bırakılsaydı ikinci
insert düştüğünde katılımcısı olmayan bir sohbet kalırdı.

Birebir sohbet tekilliği kanonik çift anahtarıyla:
`direct_key = least(a,b) || ':' || greatest(a,b)`, tekil indeksli.
Olmasaydı aynı iki kişi arasında, kimin önce yazdığına göre iki ayrı
sohbet açılır ve mesajların yarısı diğerinde kalırdı.

`messages` üzerinde `delete` yetkisi **yok**: silme `deleted_at` ile
yumuşak. Sert silme karşı taraftaki konuşmayı delik deşik ederdi —
cevabın durup sorunun kaybolduğu bir kayıt.

### Üretim tetikleyicileri

| Kaynak | Tür | Hedef (tekilleştirme anahtarı) |
|---|---|---|
| `photo_comments` insert | `comment` | fotoğraf |
| `photo_likes` insert | `like` | fotoğraf |
| `follows` insert | `follow` | takip eden |
| `forum_posts` insert | `comment_reply` | konu |
| `messages` insert | `message` | sohbet |
| `moderation_queue` update | `moderation` | kuyruk kaydı |

Tekilleştirme **okunmamış pencereye** bağlı: kısmi tekil indeks
`(user_id, kind, subject_id, actor_id) where read_at is null`. Aynı kişi
aynı fotoğrafa beş yorum yazınca tek satır oluyor; kullanıcı okuduktan
sonra yeni yorum yeni bildirim üretiyor. Kalıcı tekillik, bildirimi bir
kez alıp bir daha asla duymamak demekti.

`astro_photos` ve `forum_threads` silindiğinde ilgili bildirimler
toplanıyor: metin satırda dondurulduğu için bildirim okunur kalırdı ama
bağlantısı 404'e giderdi.

### 0045 — `app` yardımcıları kimlik almasın

0030 bir ilke koymuştu: `app` şemasındaki bir fonksiyon BAŞKASININ
kimliğini parametre alıyorsa istemciye kapalı olmalı. 0041–0043 aynı
sınıftan beş fonksiyon daha açtı ve hiçbirinin yetkisi daraltılmadı:

| Fonksiyon | Açıkken ne sızardı |
|---|---|
| `app.is_blocked(a, b)` | "şu iki yabancı birbirini engellemiş mi" |
| `app.in_conversation(conv, who)` | "şu kullanıcı şu sohbette mi" |
| `app.conversation_blocked(c, w)` | aynı bilginin sohbet üstünden hâli |
| `app.notification_allowed(u, k)` | "şu kullanıcı bu bildirimi alır mı" |
| **`app.notify(alıcı, …)`** | **doğrudan bildirim üretimi** |

Sonuncusu en ağırı: `notifications` tablosunda `insert` yetkisi bilerek
hiç verilmemişti, ama `app.notify` çağrılabilir kaldığı sürece o karar
bir kapıyı kilitleyip yanındaki pencereyi açık bırakmaktı.

PostgREST bugün yalnızca `public` şemasını açıyor, yani bu fonksiyonlar
REST üstünden erişilebilir DEĞİLDİ. Tek savunma katmanının bir
yapılandırma ayarı olması yeterli değil: `db-schemas` listesine bir gün
`app` eklenirse, o değişikliği yapan kişinin bu göçü hatırlaması
gerekmesin.

**Politikaların çağırdığı yardımcılar açık kalmak zorunda** — politika
ifadeleri çağıran rolün yetkisiyle değerlendiriliyor. Çözüm yetkiyi açık
bırakmak değil, fonksiyonu değiştirmek: `app.blocked_with(other)` ve
tek argümanlı `app.in_conversation(conv)` kimliği `auth.uid()`ten
okuyor, yani sızdırabilecekleri tek şey çağıranın zaten bilebileceği
şey.

### 0044 neden ayrı bir göç

0042 ve 0043 üç RPC açtı ve her birine `grant execute … to authenticated`
yazdı. Denetçi hepsini işaretledi: `anon` de çağırabiliyordu. Sebep
grant'ın eksikliği değil, PostgreSQL'in varsayılanı — yeni bir fonksiyon
doğduğu an `EXECUTE` yetkisi `PUBLIC` sözde-rolüne verilmiş oluyor.
Kapatmanın tek yolu önce `PUBLIC`ten geri almak. Üçü de zaten kendi
içinde korunuyordu (`notify_user` yönetici arıyor,
`start_direct_conversation` oturum arıyor, `my_conversations`
`auth.uid()` boşken boş küme dönüyor); bu bir açık kapatma değil, ikinci
kapıyı da kilitleme.

### 0046 — 0044 EKSİK KALMIŞTI

Göçten sonra denetçi hâlâ aynı üç fonksiyonu işaretliyordu. `proacl`
okununca sebep göründü:

```
{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,
 service_role=X/postgres}
```

`PUBLIC` girdisi (`=X/postgres`) gerçekten gitmişti — ama `anon` AYRICA
ve AÇIKÇA yetkiliydi, çünkü Supabase kurulumu `public` şeması için
varsayılan ayrıcalık tanımlıyor:

```sql
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
```

`PUBLIC`ten revoke etmek bu üç açık grant'a dokunmuyor. 0046 `anon`
yetkisini de geri alıyor (`service_role` kalıyor — Edge Function'ların
çağırması meşru).

**Ders:** bir yetkiyi kapattığını İDDİA etmek yetmiyor, `proacl`i okumak
gerekiyor. 0006 aynı hatayı `spatial_ref_sys` için yapmıştı ve bu belge
onu "yanlıştı ve düzeltildi" diye kaydediyor; aynı tuzağa 38 göç sonra
tekrar düşüldü. Ölçüm olmadan yazılan her "kapatıldı" cümlesi bir
tahmindir.

### 0047 — moderatör yazışmaları okuyamıyor, okumamalı da

§8.2 mesajlaşma için raporlama istiyor. İlk akla gelen çözüm `messages`
üstüne "moderatör her şeyi görür" politikası eklemekti; **eklenmedi.**
Rapor edilen tek mesajı görmek için iki kişinin bütün yazışma geçmişini
moderasyona açmak orantısız bir yetki: bir kullanıcı tek bir cümleyi
şikâyet ettiğinde aylarca süren özel bir konuşmanın tamamı okunabilir
hâle gelirdi.

Bunun yerine RAPOR EDEN KİŞİ ŞİKÂYET ETTİĞİ METNİ KENDİSİ TAŞIYOR:
arayüz mesajın gövdesini rapor notuna kopyalıyor ve kullanıcı gönderilen
metni ekranda görüyor. Moderatör tam olarak şikâyet edilen cümleyi
görüyor, bir fazlasını değil. Hukuki olarak da temiz: paylaşılan içerik,
alıcının kendi rızasıyla ilettiği kendi gelen kutusundaki metin.

Daha derin bir inceleme gerekirse (taciz kalıbı, dolandırıcılık ağı) o
ayrı bir süreç: yasal talep + `service_role` erişimi + denetim kaydı.
Onu bir RLS politikasına gömmek, istisnayı varsayılan yapmak olurdu.

## Açık denetçi bulguları

| Bulgu | Adet | Durum |
|---|---|---|
| `multiple_permissive_policies` | 129 | **PARTIAL** — birleştirme semantik risk taşır; tablo tablo incelenecek (Faz 15) |
| `unindexed_foreign_keys` | 31 | **PARTIAL** — dolu tablolardakiler `0039`'da kapatıldı; kalanlar boş tablolarda, veri gelince ölçülecek |
| `spatial_ref_sys` RLS | 1 | **IMPLEMENTED_BLOCKED_EXTERNAL** — yukarıda |

`multiple_permissive_policies` bir performans uyarısıdır, güvenlik açığı
değil: aynı komut için birden çok izin veren politika varsa PostgreSQL
hepsini çalıştırıp `OR`'lar. Birleştirmek okuma başına maliyeti düşürür
ama iki politikanın `OR`'u tek ifadeye elle yazılırken kapsam
genişletmek çok kolaydır — bu yüzden ölçüm yapılmadan dokunulmuyor.

## Migration disiplini

Her şema değişikliği `supabase/migrations/` altında versiyonlu bir
dosyayla yapılır; panelden elle DDL çalıştırılmaz. Bu oturumda
uygulananlar:

| Dosya | Konu |
|---|---|
| `0036` | Puanlama sayaçları ve koruma tetikleyicisi |
| `0037` | RLS InitPlan optimizasyonu (52 politika) |
| `0038` | İlan fotoğrafları |
| `0039` | Yabancı anahtar indeksleri |
| `0040` | Merkezî konum: 81 il + ilçe tablosu |
| `0041` | Sosyal graf: `follows`, `user_blocks`, `app.is_blocked()` |
| `0042` | Bildirim merkezi: `notifications` + üretim tetikleyicileri |
| `0043` | Mesajlaşma: `conversations`, `conversation_participants`, `messages` |
| `0044` | Yeni RPC'lerin `EXECUTE` yetkisini `PUBLIC`ten geri alma |
| `0045` | `app` yardımcıları başkasının kimliğini parametre almasın |
| `0046` | 0044'ün eksiği: `anon`un AÇIK grant'ı da geri alınıyor |
| `0047` | Mesaj raporlama: `moderation_target` enum'una `message` |

`0040` kendi kendini doğrular: seed sonunda il sayısı 81 değilse
`raise exception` ile migration düşer. Sessizce eksik veriyle
tamamlanmasındansa gürültüyle başarısız olması yeğdir.

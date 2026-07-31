# Veritabanı ve RLS

Ana görev belgesi Faz 1.3'ün çıktısı. Buradaki her sayı **canlı
veritabanında ölçüldü** (proje `eoqggvosegjbburyuyba`), kaynak koddan ya
da migration dosyalarından çıkarılmadı — migration dosyası neyin
amaçlandığını söyler, veritabanı neyin gerçekleştiğini.

Ölçüm tarihi: 2026-07-31.

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
| `public` şemasındaki tablo | 43 |
| RLS **kapalı** tablo | 1 (`spatial_ref_sys`) |
| RLS açık, politikasız tablo | 1 (`edge_rate_limits`) |
| Politika sayısı | 101 |
| `app` şemasındaki yardımcı fonksiyon | 20 |
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

Ana görev belgesinin gerektirdiği tabloların 18'i mevcut, **20'si yok**.
Eksiklerin her biri, onu gerektiren fazda RLS'iyle birlikte
oluşturulacak; burada listelenmesi o fazların girdisidir.

### Mevcut

`profiles` · `user_roles` · `audit_logs` · `moderation_queue` ·
`astro_photos` · `photo_comments` · `photo_likes` · `photo_versions` ·
`photo_exposures` · `content_entries` · `events` · `event_registrations` ·
`listings` · `observing_sites` · `provinces` · `districts` ·
`tv_broadcasts` · `edge_rate_limits`

### Eksik

| Tablo | Alan | Oluşturulacağı faz |
|---|---|---|
| `notifications` | Bildirim | 5 |
| `conversations` | Mesaj başlığı | 5 |
| `messages` | Mesaj | 5 |
| `follows` | Takip ilişkisi | 5 |
| `user_blocks` | Engelleme | 5 |
| `collections` | Favori / koleksiyon | 5 |
| `clubs` | Kulüp / topluluk | 5 |
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

`0040` kendi kendini doğrular: seed sonunda il sayısı 81 değilse
`raise exception` ile migration düşer. Sessizce eksik veriyle
tamamlanmasındansa gürültüyle başarısız olması yeğdir.

# Astrohub — Supabase

Bu klasör Astrohub'ın veritabanı şemasını (migrations), edge fonksiyonlarını
ve seed verilerini içerir.

## Bağlı proje

| Alan | Değer |
|---|---|
| Proje adı | `astrohub` |
| Ref | `eoqggvosegjbburyuyba` |
| API URL | `https://eoqggvosegjbburyuyba.supabase.co` |
| Organizasyon | StageHub — **Pro plan** |

Pro'nun bu proje için pratik karşılığı: proje hareketsizlikten
**duraklatılmıyor**, günlük yedek alınıyor, kayıt geçmişi 7 gün saklanıyor ve
**veritabanı dalları** (branching) açılabiliyor.

Anahtarlar `.env` dosyasına konur (repoya girmez); şablon için `.env.example`.

## Migration'lar

Klasörün kendisi kaynaktır (`ls supabase/migrations` — şu an 129 dosya); her
dosya ne yaptığını başındaki yorumda anlatıyor. Burada dosya dosya bir tablo
tutmuyoruz: her migration'da güncellenmesi gereken bir liste er geç yanlış
hale gelir.

İki adlandırma düzeni bir arada duruyor. Erken dosyalar sıra numaralı
(`0001_extensions_and_core.sql`), sonrakiler zaman damgalı
(`20260815090000_rehber_belgeleri.sql`). Yenileri zaman damgalı yazın —
Supabase CLI sicili bu biçime göre sıralıyor.

### Uzak projedeki migration adları birebir eşleşmez

Uzak proje erken dosyalardan daha küçük parçalar halinde kurulmuştu:

```
20260715121837  extensions_and_core                  ← 0001
20260727053310  auth_profiles                        ┐
20260727053326  user_roles_and_helpers               ├ 0002'nin parçaları
20260727053702  memberships_and_billing              ┘
20260727203357  auth_profiles_rls_and_kvkk_tables    ← 0002'nin kalan bölümü
20260727203429  grant_hardening                      ← 0003
```

Güncel listeyi `npm run db:migrations` verir.

> **Not — 2026-07 denetimi.** `0002`'nin RLS bölümü ve son dört tablosu uzak
> projeye hiç uygulanmamıştı: dört tablo RLS **kapalı** durumdaydı ve `anon`
> rolünün hepsinde tam yazma yetkisi vardı. Tablolar boş ve uygulama canlıda
> olmadığı için veri sızıntısı oluşmadı. `auth_profiles_rls_and_kvkk_tables`
> eksik bölümü tamamlar. Buradaki dosyalar sıfırdan kurulumun doğru
> kaynağıdır — `supabase db reset` ile temiz bir veritabanı bu duruma ulaşır.

## Yerel geliştirme

Supabase CLI `devDependencies` içinde: `npm ci` sonrası ayrıca kurulum
gerekmez. `supabase/config.toml` repoda durur; `supabase init` tekrar
çalıştırılmaz.

```bash
npx supabase start         # yerel stack (Docker gerekir)
npx supabase db reset      # tüm migration'ları yerelde uygular

npm run db:migrations      # uzak projedeki migration listesi
npm run db:push            # migration'ları uzak projeye uygular
npm run db:diff            # uzak şema ile dosyalar arasındaki fark
npm run db:types           # TypeScript tipleri üretir
npm run db:seed            # tohum verisini yazar
npm run functions:deploy   # edge fonksiyonlarını dağıtır
```

Uzak projeye dokunan komutlar iki ortam değişkeni ister:

| Değişken | Nereden |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Dashboard → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | Dashboard → Project Settings → Database |

İkisi de `VITE_` öneki almaz; alsalardı istemci paketine gömülürlerdi.

## Edge fonksiyonları

`supabase/functions/` altında sekiz fonksiyon var: `hesap-sil`,
`katalog-yukle`, `meteoblue`, `plate-solve`, `plate-solve-poll`,
`podcast-rss`, `radyo-durum`, `youtube`. `verify_jwt` ayarı ve davranışı için
her fonksiyonun kendi kaynağına bakın — `plate-solve-poll` `pg_cron`
tarafından çağrıldığı için JWT doğrulaması kapalıdır ve kimliği
`x-poll-secret` başlığıyla elle doğrular.

> **Kaldırılan: `taslak-temizle` (2026-07-31).** Tek seferlik bir taslak
> temizliği için yazılmıştı. Yalnızca JWT ile korunuyordu — yani oturum
> açmış **herhangi bir kullanıcı herkesin** onaylanmamış taslaklarını
> silebilirdi. Fark edilir edilmez içi boşaltıldı, işi bitince silindi.
>
> Ders, gelecekteki tek seferlik işler için: servis rolü anahtarı taşıyan bir
> uç noktada `verify_jwt` **yetki denetimi değildir**. "Oturum açmış biri" ile
> "bunu yapmaya hakkı olan biri" ayrı sorulardır; ikincisini fonksiyonun
> kendisi sormak zorunda (`plate-solve` bunu sahiplik kontrolünü çağıranın
> anahtarıyla yaparak çözüyor).

## İlkeler

- Her tabloda açık **RLS** vardır. Yeni tablo eklerken RLS'i ve politikalarını
  aynı migration'a yazın — sonraya bırakılan RLS uygulanmadan kalır (yukarıdaki
  nota bakın).
- Admin yetkisi `app.is_admin()` ile **veritabanı rol tablosundan** kontrol
  edilir; JWT metadata'ya güvenilmez.
- `service_role` anahtarı asla istemciye gönderilmez ve `VITE_` önekli hiçbir
  değişkene konmaz — `VITE_` ile başlayan her değer istemci paketine gömülür.
- Üyelik durumu ve roller yalnızca admin/service-role tarafından yazılır.
- RLS'in kapsamadığı tek DML komutu **TRUNCATE**'tir; istemci rollerine bu
  yetki verilmez.
- İstemcinin yazabildiği bir alan istemcide doğrulanıyorsa, **okuma tarafında
  da** doğrulanmalıdır: panel formu bir güvenlik sınırı değildir, satır
  doğrudan PostgREST üzerinden de değiştirilebilir (`guide_documents` gövdesi
  ve `profiles.website_url` bu yüzden iki yerde süzülüyor).

## Bilinen denetçi uyarıları (kabul edilmiş)

| Uyarı | Neden bırakıldı |
|---|---|
| `spatial_ref_sys` üzerinde RLS kapalı **ve `anon` yazabiliyor** | Tablo `supabase_admin` rolüne aittir: RLS açamayız, yetkileri de geri alamayız (REVOKE yalnızca kendi verdiğin izni kaldırır — `postgres` ile denemek hata vermeden no-op olur). İçerik EPSG koordinat sistemi kataloğudur; kişisel veri yoktur ve PostGIS'ten yeniden doldurulabilir. Supabase'deki her PostGIS projesinde aynıdır. |
| `postgis`, `citext`, `pg_trgm` `public` şemasında | `0001`'de kurulmuş ve `profiles.username citext` gibi sütun tipleri bunlara bağlı. Taşımak tip referanslarını kırar; kazanç düşük. |
| `st_estimatedextent` çağrılabilir | PostGIS'in kendi fonksiyonu, bizim kodumuz değil. İlgili `revoke … from anon, authenticated` satırları **etkisiz**: yetki role değil `PUBLIC`'e verilmiş ve veren `supabase_admin`. ACL bunu açıkça gösteriyor (`=X/supabase_admin`); `postgres` başkasının verdiği izni geri alamaz, komut hata vermeden hiçbir şey yapmaz. Fonksiyon yalnızca geometri sütunlarının istatistiksel sınırlarını döndürür; şemamızda geometri yalnızca etkinlik/gözlem alanı koordinatlarındadır ve zaten `approx_*` olarak yuvarlanmıştır. |
| `edge_rate_limits` üzerinde RLS açık ama **hiç politika yok** | Kasıtlı: politikasız RLS "kimse okuyamaz/yazamaz" demektir ve bu tablo yalnızca `service_role` tarafından kullanılır. Denetçi bunu INFO seviyesinde bildirir, hata olarak değil. |

Rate-limit RPC notu: ayrıcalıklı gövde `app.consume_rate_limit` içindedir;
`public.consume_rate_limit` yalnızca PostgREST uyumluluğu için bırakılmış
`SECURITY INVOKER` ve service_role-only sarmalayıcıdır.

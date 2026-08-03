# Astrohub — Supabase

Bu klasör Astrohub'ın veritabanı şemasını (migrations), edge fonksiyonlarını
ve seed verilerini içerir. Şema plan §12.4'teki konsolide gruplara göre temiz
biçimde yönetilir; StageHub migration mirası taşınmaz.

## Bağlı proje

| Alan | Değer |
|---|---|
| Proje adı | `astrohub` |
| Ref | `eoqggvosegjbburyuyba` |
| Bölge | `eu-central-1` (Frankfurt) |
| API URL | `https://eoqggvosegjbburyuyba.supabase.co` |
| Organizasyon | StageHub — **Pro plan** (2026-07'de yükseltildi) |

Pro'nun bu proje için pratik karşılığı: proje hareketsizlikten
**duraklatılmıyor**, günlük yedek alınıyor, kayıt geçmişi 1 yerine 7 gün
saklanıyor ve **veritabanı dalları** (branching) açılabiliyor. Kota
matematiği (`0027`) zaten Pro'nun 100 GB depolamasına göre yazılmıştı;
ücretsiz plan hiçbir şeyi kısıtlamıyordu.

Anahtarlar `.env` dosyasına konur (repoya girmez); şablon için `.env.example`.

## Migration'lar

| Dosya | İçerik |
|---|---|
| `0001_extensions_and_core.sql` | postgis, pg_trgm, citext, pgcrypto; `app` şeması; `updated_at` tetikleyicisi; `app_role` enum |
| `0002_auth_profiles_membership.sql` | profiles, user_roles, memberships, billing, notification_preferences, push, KVKK tabloları + RLS |
| `0003_grant_hardening.sql` | tablo yetkilerinin daraltılması, TRUNCATE boşluğunun kapatılması, fonksiyon `search_path` sabitlemesi |

Tablo yalnızca ilk üç grubu anlatıyor; şema o zamandan beri `0034`'e
kadar büyüdü. Güncel liste için klasörün kendisi kaynaktır
(`ls supabase/migrations`) — her dosya ne yaptığını başındaki yorumda
anlatıyor, ve buradaki tabloyu her migration'da güncellemek onu er geç
yanlış hale getirirdi.

### Uzak projedeki migration adları

Uzak proje bu dosyalardan daha küçük parçalar halinde kurulmuştu; adlar
birebir eşleşmez:

```
20260715121837  extensions_and_core                  ← 0001
20260727053310  auth_profiles                        ┐
20260727053326  user_roles_and_helpers               ├ 0002'nin parçaları
20260727053702  memberships_and_billing              ┘
20260727…       auth_profiles_rls_and_kvkk_tables    ← 0002'nin uygulanmamış kalan bölümü
20260727…       grant_hardening                      ┐
20260727…       postgis_reference_table_readonly     ├ 0003   (bu adım etkisiz —
20260727…       harden_set_updated_at_search_path    ┘         aşağıdaki nota bakın)
```

> **Not — 2026-07 denetimi.** `0002`'nin RLS bölümü ve son dört tablosu uzak
> projeye hiç uygulanmamıştı: dört tablo RLS **kapalı** durumdaydı ve `anon`
> rolünün hepsinde tam yazma yetkisi vardı. Tablolar boş ve uygulama canlıda
> olmadığı için veri sızıntısı oluşmadı. `auth_profiles_rls_and_kvkk_tables`
> migration'ı eksik bölümü tamamlar. Buradaki dosyalar sıfırdan kurulumun
> doğru kaynağıdır — `supabase db reset` ile temiz bir veritabanı bu duruma
> ulaşır.

## Yerel geliştirme

Supabase CLI artık `devDependencies` içinde: `npm ci` sonrası ayrıca kurulum
gerekmez, `npx supabase …` ya da aşağıdaki npm betikleri doğrudan çalışır.
`supabase/config.toml` repoda durur; `supabase init` tekrar çalıştırılmaz.

```bash
npx supabase start         # yerel stack (Docker gerekir)
npx supabase db reset      # tüm migration'ları yerelde uygular

npm run db:migrations      # uzak projedeki migration listesi
npm run db:push            # migration'ları uzak projeye uygular
npm run db:diff            # uzak şema ile dosyalar arasındaki fark
npm run db:types           # TypeScript tipleri üretir
npm run functions:deploy   # edge fonksiyonlarını dağıtır
```

Uzak projeye dokunan komutlar iki ortam değişkeni ister — şablon
`.env.example` içinde:

| Değişken | Nereden |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Dashboard → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | Dashboard → Project Settings → Database |

İkisi de `VITE_` öneki almaz; alsalardı istemci paketine gömülürlerdi.

## Edge fonksiyonları

| Slug | `verify_jwt` | Ne yapıyor |
|---|---|---|
| `meteoblue` | açık | Hava vekili — anahtarı sunucuda tutuyor, oran limiti uyguluyor |
| `plate-solve` | açık | Yüklenen fotoğrafı astrometry.net'e gönderiyor; sahiplik denetimi **çağıranın anahtarıyla** yapılıyor ki RLS cevap versin |
| `plate-solve-poll` | **kapalı** | `pg_cron` beş dakikada bir çağırıyor; kimlik `x-poll-secret` başlığıyla elle doğrulanıyor (bkz. `docs/YAYIN.md` §6) |

Listenin tamamı bu üç fonksiyon; başkası yok.

> **Kaldırılan: `taslak-temizle` (2026-07-31).** Tek seferlik bir taslak
> temizliği için yazılmıştı. Yalnızca JWT ile korunuyordu — yani oturum
> açmış **herhangi bir kullanıcı herkesin** onaylanmamış taslaklarını
> silebilirdi. Fark edilir edilmez içi boşaltıldı, işi bitince de
> tamamen silindi.
>
> Ders, gelecekteki tek seferlik işler için: servis rolü anahtarı taşıyan
> bir uç noktada `verify_jwt` **yetki denetimi değildir**. "Oturum açmış
> biri" ile "bunu yapmaya hakkı olan biri" ayrı sorulardır; ikincisini
> fonksiyonun kendisi sormak zorunda (`plate-solve` bunu sahiplik
> kontrolünü çağıranın anahtarıyla yaparak çözüyor).

## İlkeler

- Her tabloda açık **RLS** vardır (§15.1). Yeni tablo eklerken RLS'i ve
  politikalarını aynı migration'a yazın — sonraya bırakılan RLS uygulanmadan
  kalır (yukarıdaki nota bakın).
- Admin yetkisi `app.is_admin()` ile **veritabanı rol tablosundan** kontrol
  edilir; JWT metadata'ya güvenilmez.
- `service_role` anahtarı asla istemciye gönderilmez ve `VITE_` önekli hiçbir
  değişkene konmaz — `VITE_` ile başlayan her değer istemci paketine gömülür.
- Üyelik durumu ve roller yalnızca admin/service-role tarafından yazılır
  (webhook entitlement — §14.5).
- RLS'in kapsamadığı tek DML komutu **TRUNCATE**'tir; istemci rollerine bu
  yetki verilmez (`0003`).

## Bilinen denetçi uyarıları (kabul edilmiş)

| Uyarı | Neden bırakıldı |
|---|---|
| `spatial_ref_sys` üzerinde RLS kapalı **ve `anon` yazabiliyor** | Tablo `supabase_admin` rolüne aittir: RLS açamayız, yetkileri de geri alamayız (REVOKE yalnızca kendi verdiğin izni kaldırır — `postgres` ile denemek hata vermeden no-op olur). İçerik EPSG koordinat sistemi kataloğudur; kişisel veri yoktur ve PostGIS'ten yeniden doldurulabilir. Supabase'deki her PostGIS projesinde aynıdır. |
| `postgis`, `citext`, `pg_trgm` `public` şemasında | `0001`'de kurulmuş ve `profiles.username citext` gibi sütun tipleri bunlara bağlı. Taşımak tip referanslarını kırar; kazanç düşük. |
| `st_estimatedextent` çağrılabilir | PostGIS'in kendi fonksiyonu, bizim kodumuz değil. `0016`'daki `revoke … from anon, authenticated` satırları **etkisiz** — yetki role değil `PUBLIC`'e verilmiş ve veren `supabase_admin`. ACL bunu açıkça gösteriyor: `=X/supabase_admin`. `postgres` başkasının verdiği izni geri alamaz, o yüzden komut hata vermeden hiçbir şey yapmıyor. Fonksiyon yalnızca geometri sütunlarının istatistiksel sınırlarını döndürüyor; bizim şemamızda geometri yalnızca etkinlik/gözlem alanı koordinatlarında ve zaten `approx_*` olarak yuvarlanmış halde. |
| `edge_rate_limits` üzerinde RLS açık ama **hiç politika yok** | Kasıtlı: politikasız RLS "kimse okuyamaz/yazamaz" demektir ve bu tablo yalnızca `service_role` tarafından kullanılıyor. RLS matrisi (`0204`) bunu ayrıca ölçüyor. Denetçi bunu INFO seviyesinde bildiriyor, hata olarak değil. |

Rate-limit RPC notu: ayrıcalıklı gövde `app.consume_rate_limit` içinde;
`public.consume_rate_limit` yalnızca PostgREST uyumluluğu için bırakılmış
`SECURITY INVOKER` ve service_role-only sarmalayıcıdır.

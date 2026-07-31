# Google ile Giriş — Kurulum

Kod tarafı hazır. Kalan iki adım **konsollarda** yapılıyor ve ikisi de
senin hesabından geçiyor: Google Cloud'da bir OAuth istemcisi oluşturmak
ve o istemciyi Supabase'e tanıtmak. Bu belge tam olarak hangi değerin
nereye gireceğini yazıyor.

## Neden kod tarafı tek başına yetmiyor

`signInWithOAuth({ provider: 'google' })` çağrısı Supabase'e "bu kullanıcıyı
Google'a gönder" diyor. Supabase bunu ancak Google sağlayıcısı açıksa
yapabiliyor ve açmak için Google'ın verdiği bir **istemci kimliği** ile
**istemci sırrı** gerekiyor. O ikisini yalnızca hesap sahibi üretebilir —
kod deposunda duramazlar, sırrı depoya koymak onu herkese açmak olurdu.

Ölçülen mevcut durum:

```
GET https://eoqggvosegjbburyuyba.supabase.co/auth/v1/settings
→ "google": false
```

## Kullanılacak adresler

Sitenin canonical adresi **apex** — `www` olan adres 308 ile apex'e
yönleniyor:

```
https://www.astrohub.com.tr  →  308  →  https://astrohub.com.tr
```

Bu yüzden aşağıdaki alanlarda `www` **kullanılmıyor**. Yanlış tarafı
yazmak, girişin `redirect_uri_mismatch` hatasıyla düşmesi demek.

## 1. Google Cloud Console

**console.cloud.google.com** → proje seç (yoksa oluştur).

### 1a. OAuth izin ekranı

*APIs & Services → OAuth consent screen*

| Alan | Değer |
| --- | --- |
| User type | External |
| Uygulama adı | Astrohub |
| Kullanıcı destek e-postası | kendi adresin |
| Uygulama ana sayfası | `https://astrohub.com.tr` |
| Gizlilik politikası | `https://astrohub.com.tr/kvkk` |
| Hizmet şartları | `https://astrohub.com.tr/kullanim-kosullari` |
| Yetkili alan adı | `astrohub.com.tr` |

Kapsam (scope) **eklemeye gerek yok**: Supabase varsayılan olarak
`email`, `profile`, `openid` istiyor ve bunlar hassas kapsam sayılmadığı
için Google doğrulaması gerektirmiyor. Fazladan kapsam eklemek, uygulamayı
haftalar sürebilecek bir inceleme sürecine sokar.

Yayın durumu **Testing**'de kalırsa yalnızca test kullanıcısı listesine
eklediğin hesaplar girebilir. Herkese açmak için **Publish app**.

### 1b. OAuth istemcisi

*APIs & Services → Credentials → Create credentials → OAuth client ID*

- **Application type:** Web application
- **Name:** Astrohub Web

**Authorized JavaScript origins** — üçünü de ekle:

```
https://astrohub.com.tr
https://www.astrohub.com.tr
http://localhost:5173
```

> `www` burada var çünkü kullanıcı o adresi yazarak gelebiliyor;
> yönlendirme tarayıcıda oluyor ve origin kontrolü yönlendirmeden önce
> çalışabiliyor. Fazladan origin zarar vermiyor, eksik origin girişi kırıyor.

**Authorized redirect URIs** — yalnızca bu tek adres:

```
https://eoqggvosegjbburyuyba.supabase.co/auth/v1/callback
```

> Buraya kendi alan adını **yazma**. Google, kullanıcıyı önce Supabase'e
> döndürüyor; Supabase kodu jetona çevirip kullanıcıyı bizim sitemize
> gönderiyor. Bizim adresimiz bir sonraki adımın ayarı.

Oluştur → **Client ID** ve **Client secret** değerlerini kopyala.

## 2. Supabase

**supabase.com/dashboard** → astrohub projesi.

### 2a. Sağlayıcıyı aç

*Authentication → Sign In / Providers → Google*

- Enable Sign in with Google: **açık**
- Client ID: Google'dan aldığın değer
- Client Secret: Google'dan aldığın değer
- Save

### 2b. Dönüş adresleri

*Authentication → URL Configuration*

| Alan | Değer |
| --- | --- |
| Site URL | `https://astrohub.com.tr` |
| Redirect URLs | `https://astrohub.com.tr/**` |
| | `https://www.astrohub.com.tr/**` |
| | `http://localhost:5173/**` |

`/**` şart: giriş sonrası `/panel` adresine dönülüyor ve joker olmadan o
yol listede sayılmıyor.

## 3. Doğrulama

Ayar kaydedildikten sonra, **yeniden dağıtıma gerek yok**:

```
curl -s https://eoqggvosegjbburyuyba.supabase.co/auth/v1/settings \
  -H "apikey: <publishable key>" | grep google
```

`"google": true` görülmeli. Site bu uca kendisi soruyor ve düğme ilk sayfa
yenilemesinde beliriyor — düğmenin görünmesi zaten sağlayıcının açık
olduğunun kanıtı.

Sonra `https://astrohub.com.tr/giris` → "Google ile devam et" → hesap seç
→ `/panel`'e dönmelisin.

## Sık karşılaşılan iki hata

**`redirect_uri_mismatch`** — Google'daki redirect URI Supabase'in
callback adresi değil. 1b'deki tek satırı birebir kontrol et.

**`Unsupported provider: provider is not enabled`** — 2a kaydedilmemiş.
Bu hatayı artık kullanıcı görmüyor: sağlayıcı kapalıyken düğme hiç
çizilmiyor.

## Kodun bu akışta yaptıkları

- `signInWithOAuth` dönüş adresini `VITE_SITE_URL`'den kuruyor; tanımsızsa
  o anki köken. (Daha önce burada `VITE_APP_URL` yazıyordu — hiçbir yerde
  tanımlı olmayan bir ad; koşul her zaman `false`'a düşüyordu.)
- Düğme yalnızca sağlayıcı gerçekten açıkken çiziliyor
  (`/auth/v1/settings` sorgulanıyor).
- Yeni kullanıcının profili açılırken ad, Google'ın gönderdiği
  `full_name` / `name` / `given_name` alanlarından okunuyor. Öncesinde
  yalnızca kendi formumuzun `display_name` alanına bakılıyordu ve Google
  ile gelen herkesin adı boş kalıyordu (migration 0029).

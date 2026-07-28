# Astrohub — Yayına Alma

Alan adı: **www.astrohub.com.tr** (Natro, DNS: `ns1.natrohost.com`,
`ns2.natrohost.com`)
Supabase projesi: `eoqggvosegjbburyuyba` (eu-central-1, Frankfurt)

Bu belge yayına alma adımlarını **kimin yapabileceğine göre** ikiye
ayırır. Kod tarafı hazır; kalanlar hesap sahibinin panellerinden
yapılacak işler, çünkü hepsi gizli anahtar ya da hesap yetkisi istiyor.

---

## 1. Kodda hazır olanlar

| Ne | Nerede |
| --- | --- |
| Vercel yapılandırması | `vercel.json` — SPA yeniden yazma, önbellek ve güvenlik başlıkları |
| Google ile giriş | `src/features/auth/GoogleButton.tsx`, `AuthContext.signInWithGoogle` |
| CAPTCHA | `src/features/auth/Captcha.tsx` (Turnstile / hCaptcha) |
| Ortam değişkeni şablonu | `.env.example` |
| Veritabanı şeması | `supabase/migrations/0001…0016` — canlıya uygulandı |
| meteoblue vekili | `supabase/functions/meteoblue` — dağıtıldı, gizli anahtarı bekliyor |

**CAPTCHA site anahtarı boşsa** doğrulama tamamen devre dışı kalır ve
formlar eskisi gibi çalışır. **Supabase yapılandırılmamışsa** Google
düğmesi hiç çizilmez. Yani eksik yapılandırma siteyi kırmaz, yalnızca
o özelliği kapatır.

---

## 2. Vercel

### 2.1 Proje oluşturma

1. Vercel → **Add New → Project** → GitHub'dan `muratsana/astrohub`.
2. Framework **Vite** olarak algılanacak; `vercel.json` zaten build
   komutunu ve çıktı klasörünü veriyor, değiştirmeyin.
3. **Production Branch**: yayına alınacak dal. Bu depoda henüz `main`
   yok; hangi dalın yayın dalı olacağına karar verip Vercel'de onu
   seçin.

### 2.2 Ortam değişkenleri

Vercel → Settings → **Environment Variables**. Üçünü de *Production*,
*Preview* ve *Development* için ekleyin:

| Değişken | Değer |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://eoqggvosegjbburyuyba.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → **publishable** anahtar |
| `VITE_APP_URL` | `https://www.astrohub.com.tr` |
| `VITE_SITE_URL` | `https://www.astrohub.com.tr` |
| `VITE_CAPTCHA_PROVIDER` | `turnstile` |
| `VITE_CAPTCHA_SITE_KEY` | Turnstile site anahtarı (bkz. §4) |

> `service_role` / `secret` anahtarı **hiçbir `VITE_` değişkenine
> konmaz**. O anahtar RLS'i tamamen atlar ve `VITE_` ile başlayan her
> değişken derlenmiş pakete düz metin girer.

`VITE_APP_URL` yayında **tanımlı olmalı**: tanımsızsa önizleme
dağıtımlarından gelen e-posta doğrulama bağlantıları önizleme adresine
döner ve kullanıcı "bağlantı çalışmıyor" der.

### 2.3 Alan adı

1. Vercel → Settings → **Domains** → `www.astrohub.com.tr` ekleyin,
   ardından `astrohub.com.tr` ekleyip `www`'ye yönlendirin (ya da
   tersi — hangisi kanonikse `VITE_SITE_URL` ile aynı olmalı, yoksa
   `canonical` etiketleri ile gerçek adres çelişir).
2. Vercel size iki kayıt verir. Natro → **Alan Adı Yönetimi →
   astrohub.com.tr → DNS Yönetimi**:

   | Tür | Ad | Değer |
   | --- | --- | --- |
   | A | `@` | Vercel'in verdiği IP |
   | CNAME | `www` | Vercel'in verdiği `*.vercel-dns.com` adresi |

   Kesin değerleri Vercel'in Domains ekranından kopyalayın; buraya
   sabit bir IP yazmak, Vercel değiştirdiğinde siteyi düşürür.
3. SSL sertifikasını Vercel otomatik alır (Let's Encrypt). DNS
   yayılması birkaç dakika ile birkaç saat arasında sürer.

---

## 3. Supabase — Auth ayarları

Supabase Dashboard → **Authentication**.

### 3.1 URL yapılandırması

- **Site URL**: `https://www.astrohub.com.tr`
- **Redirect URLs** (hepsini ekleyin):
  - `https://www.astrohub.com.tr/**`
  - `https://astrohub.com.tr/**`
  - `http://localhost:5173/**` (yerel geliştirme)
  - Vercel önizleme adresleri için: `https://*-muratsana.vercel.app/**`

Listede olmayan bir adrese yönlendirme Supabase tarafından reddedilir;
Google girişinin "redirect_uri_mismatch" ile dönmesinin en yaygın
sebebi budur.

### 3.2 Google sağlayıcısı

1. **Google Cloud Console** → yeni proje (ya da mevcut) → **APIs &
   Services → Credentials → Create Credentials → OAuth client ID** →
   *Web application*.
2. **Authorized redirect URIs** alanına Supabase'in verdiği geri dönüş
   adresini yazın:
   `https://eoqggvosegjbburyuyba.supabase.co/auth/v1/callback`
3. OAuth consent screen'i doldurun (uygulama adı "Astrohub", destek
   e-postası, gizlilik ve kullanım koşulları adresleri — ikisi de sitede
   var: `/kvkk`, `/kullanim-kosullari`).
4. Oluşan **Client ID** ve **Client Secret**'ı Supabase → Authentication
   → **Providers → Google** içine girip sağlayıcıyı etkinleştirin.

Uygulama tarafında yapılacak bir şey yok: `signInWithGoogle` zaten
sağlayıcı adını `'google'` olarak gönderiyor.

### 3.3 CAPTCHA

Supabase → Authentication → **Attack Protection → Enable CAPTCHA
protection**. Sağlayıcıyı seçip **gizli anahtarı** girin.

Site anahtarını Vercel'de `VITE_CAPTCHA_SITE_KEY` olarak tanımlayın —
gizli anahtar Supabase'de, site anahtarı istemcide; ikisi karıştırılırsa
doğrulama hep başarısız olur.

### 3.4 E-posta şablonları

Varsayılan şablonlar İngilizce. Authentication → **Email Templates**
altından Türkçeleştirmek, doğrulama e-postasının spam'e düşme ihtimalini
de azaltır.

---

## 4. Cloudflare Turnstile

1. Cloudflare → **Turnstile → Add Site**.
2. Domain: `astrohub.com.tr` (ve `www.astrohub.com.tr`).
3. Widget mode: **Managed** önerilir.
4. Oluşan iki anahtardan:
   - **Site Key** → Vercel `VITE_CAPTCHA_SITE_KEY`
   - **Secret Key** → Supabase Attack Protection

Turnstile çerez kullanmadığı için KVKK tarafında hCaptcha'dan daha
rahat; çerez envanterine (`/cerezler`) bir kayıt eklemesi gerekmiyor.

---

## 5. meteoblue gizli anahtarı

Supabase → **Edge Functions → Secrets** → `METEOBLUE_API_KEY`.

Tanımlanana kadar vekil 503 döner ve site sessizce Open-Meteo'ya düşer —
hiçbir şey bozulmaz, yalnızca bulut katmanı ayrımı gelmez.

Anahtar bir ekran görüntüsünde göründüyse meteoblue panelinden
**yenilemeniz** önerilir; ayrıca aynı panelden **Referer koruması**
açmak, anahtar sızsa bile kullanımı sizin alan adınızla sınırlar.

---

## 6. Yayın sonrası kontrol listesi

- [ ] `https://www.astrohub.com.tr` açılıyor, SSL geçerli
- [ ] `astrohub.com.tr` → `www` yönlendirmesi çalışıyor
- [ ] Bir hesapla e-posta kaydı: doğrulama e-postası geliyor ve
      bağlantı **canlı adrese** dönüyor
- [ ] Google ile giriş: hesap oluşuyor ve `profiles` tablosunda satır
      beliriyor (`handle_new_user` tetikleyicisi)
- [ ] CAPTCHA giriş ekranında görünüyor ve boş token'la giriş
      reddediliyor
- [ ] Forumda konu açılıyor ve `forum_threads` tablosunda görünüyor
- [ ] Fotoğraf yükleniyor ve **galeride görünüyor** (okuma katmanı)
- [ ] "Bu Gece" panelinde kaynak `meteoblue` yazıyor
- [ ] `/sitemap.xml` ve `/robots.txt` doğru alan adını gösteriyor

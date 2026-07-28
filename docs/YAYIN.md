# Astrohub — Yayına Alma

Alan adı: **astrohub.com.tr** — kanonik adres apex (www'suz).
Kayıt: Natro · DNS: `ns1.natrohost.com`, `ns2.natrohost.com`
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
3. **Production Branch**: `main`. Dal oluşturuldu ve bütün çalışma
   orada; her push otomatik yayına çıkar (bkz. §7).

### 2.2 Ortam değişkenleri

Vercel → Settings → **Environment Variables**. Üçünü de *Production*,
*Preview* ve *Development* için ekleyin:

| Değişken | Değer |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://eoqggvosegjbburyuyba.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → **publishable** anahtar |
| `VITE_APP_URL` | `https://astrohub.com.tr` |
| `VITE_SITE_URL` | `https://astrohub.com.tr` |
| `VITE_CAPTCHA_PROVIDER` | `turnstile` |
| `VITE_CAPTCHA_SITE_KEY` | Turnstile site anahtarı (bkz. §4) |

> `service_role` / `secret` anahtarı **hiçbir `VITE_` değişkenine
> konmaz**. O anahtar RLS'i tamamen atlar ve `VITE_` ile başlayan her
> değişken derlenmiş pakete düz metin girer.

`VITE_APP_URL` yayında **tanımlı olmalı**: tanımsızsa önizleme
dağıtımlarından gelen e-posta doğrulama bağlantıları önizleme adresine
döner ve kullanıcı "bağlantı çalışmıyor" der.

### 2.3 Alan adı

1. Vercel → Settings → **Domains**:
   - Önce `astrohub.com.tr` ekleyin — **kanonik** adres bu.
   - Sonra `www.astrohub.com.tr` ekleyip apex'e **yönlendirin**
     (Vercel "Redirect to astrohub.com.tr" seçeneğini sunar).

   `VITE_SITE_URL` bu kanonik adresle aynı olmalı; farklı olursa
   sayfalardaki `canonical` etiketleri gerçek adresle çelişir ve arama
   motoru iki ayrı site görür.

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

- **Site URL**: `https://astrohub.com.tr`
- **Redirect URLs** (hepsini ekleyin):
  - `https://astrohub.com.tr/**`
  - `https://www.astrohub.com.tr/**`
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

- [ ] `https://astrohub.com.tr` açılıyor, SSL geçerli
- [ ] `www.astrohub.com.tr` → apex yönlendirmesi çalışıyor
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

---

## 7. Otomasyon — ne kendiliğinden oluyor

### 7.1 Dağıtım

Vercel'in **Git entegrasyonu** bir kez bağlandıktan sonra dağıtım
tamamen otomatik:

| Olay | Sonuç |
| --- | --- |
| `main` dalına push | Üretim dağıtımı → `astrohub.com.tr` |
| Başka bir dala push | Önizleme dağıtımı → benzersiz `*.vercel.app` adresi |
| Pull request | PR'a önizleme bağlantısı yorum olarak düşer |

Token, iş akışı dosyası ya da elle tetikleme gerekmiyor. Kurulumdaki tek
elle adım, projeyi ilk kez bağlamak.

### 7.2 Doğrulama

`.github/workflows/ci.yml` her push ve pull request'te tam zinciri
koşuyor: tip kontrolü, lint, 701 birim testi, üretim derlemesi, önizleme
derlemesi, yatay taşma denetimi ve 25 E2E senaryosu. Düşen bir senaryonun
ekran görüntüleri iş çıktısına yükleniyor.

**Vercel'in kendi derlemesi bunları koşmuyor** — orada yalnızca
`npm run build` var. CI olmadan bozuk bir akış derlenip yayına
çıkabilirdi.

### 7.3 Neden GitHub Actions'tan Vercel'e dağıtım yapmıyoruz

Yapılabilir (`VERCEL_TOKEN` deposu sırrı olarak) ama gereksiz: Git
entegrasyonu aynı işi sır saklamadan yapıyor. Actions'a taşımanın tek
gerçek gerekçesi "CI geçmeden dağıtma" kuralı; onu Vercel tarafında
**Settings → Git → Ignored Build Step** ile de kurabilirsiniz.

### 7.4 Veritabanı değişiklikleri

Migration'lar otomatik uygulanmıyor — bilinçli. Şema değişikliği geri
alınması en zor işlem ve bir push'un yan etkisi olmamalı. Yeni bir
migration `supabase/migrations/` altına yazılıyor ve elle uygulanıyor.

---

## 8. Sık karşılaşılan tuzaklar

### 8.1 Yayında eski sürüm görünüyor

**Belirti:** Vercel "Ready" diyor ama sitede eski tasarım var.

**Sebep:** Vercel projeyi bağladığı anda **deponun varsayılan dalını**
bir kez derler. Production Branch ayarı `main` olsa bile, o ilk dağıtım
varsayılan daldan gelir ve `main`'e daha önce yapılmış push'lar için
webhook tetiklenmez — bağlantı kurulmadan önce olup bitmişlerdir.

**Çözüm:** `main` dalına yeni bir commit push edin. Vercel'in kendi
ekranı da bunu söylüyor: *"To update your Production Deployment, push to
the main branch."*

**Kalıcı çözüm:** GitHub → Settings → **General → Default branch** →
`main`. Böylece yeni bağlantılar ve pull request'ler de doğru dalı
hedefler.

### 8.2 Depoda gereksiz dal kalması

Bu depoda `main` dışındaki dallar tarihsel; `main` hepsini kapsıyor
(`git merge-base --is-ancestor` ile doğrulandı, birleştirilecek commit
yok). Varsayılan dal `main` yapıldıktan sonra GitHub → **Branches**
ekranından silinebilirler.

Varsayılan dal silinemez — önce değiştirmek gerekir.

### 8.3 Google girişi `redirect_uri_mismatch` veriyor

Sırasıyla kontrol edin:
1. Supabase → Authentication → URL Configuration → **Redirect URLs**
   listesinde adres var mı (`https://astrohub.com.tr/**`).
2. Google Cloud → OAuth client → **Authorized redirect URIs** alanında
   Supabase geri dönüş adresi var mı
   (`https://eoqggvosegjbburyuyba.supabase.co/auth/v1/callback`).

En yaygın sebep birincisi.

# AstroHub Radyo — yayın sunucusu

§10.1'in dağıtım paketi. **Canlı yayın henüz aktif değil**: dış sunucu
erişimi yok, bu yüzden durum `IMPLEMENTED_BLOCKED_EXTERNAL`. Bu dizindeki
her şey kurulmaya hazır; eksik olan tek şey üzerinde çalışacağı makine.

---

## Sınır: neyin bitmiş, neyin beklediği

| Parça | Durum |
|---|---|
| Dağıtım dosyaları (`docker-compose.yml`, `Caddyfile`) | Yazıldı, **çalışan kurulumda doğrulanmadı** |
| Güvenlik ayarları | Yazıldı (aşağıda) |
| Yedekleme planı ve betiği | Yazıldı, **geri yükleme provası yapılmadı** |
| API adaptörü (`supabase/functions/radyo-durum`) | Yazıldı ve test edildi |
| Sağlık yoklaması + veritabanı kaydı | Yazıldı, şema canlıda ölçüldü (`0051`) |
| Yönetim arayüzü | Panelde **Radyo** sekmesi |
| Canlı yayın aktivasyonu | **BLOKE** — VPS gerekiyor |

"Doğrulanmadı" dürüst bir etiket, kusur itirafı değil: AzuraCast kendi
kurucusunu dağıtıyor ve servis adları sürümler arasında değişebiliyor.
Aşağıdaki aktivasyon listesi, bu dosyaların her varsayımını tek tek
sınayacak biçimde sıralandı.

---

## Aktivasyon listesi

Her adım bir öncekinin çıktısını doğruluyor; sırayı bozmayın.

1. **Sunucu.** 2 vCPU / 4 GB RAM / 80 GB disk yeter. Ses dosyaları
   diskin çoğunu yer; 1000 parçalık bir kütüphane ~8 GB.
2. **DNS.** `yayin.astrohub.example` ve `panel.astrohub.example` A
   kayıtları sunucuya. İkisi ayrı ad — gerekçesi `Caddyfile` içinde.
3. **Güvenlik duvarı.** Yalnızca 22, 80, 443, 8000 ve 8005–8100 açık.
   Panel portu (8080) **dışarı açılmıyor**; compose onu `127.0.0.1`e
   bağlıyor.
4. **`.env`.** `.env.ornek`ten kopyalayın. Bu dosya depoya **girmez**
   (`.gitignore`).
5. **Ayağa kaldır.** `docker compose up -d`, sonra
   `docker compose ps` — `web` servisi `healthy` olmalı. Olmuyorsa
   compose'daki port ve volume adları o AzuraCast sürümüne göre
   düzeltilmeli; ilk doğrulama noktası burası.
6. **İlk kurulum sihirbazı.** `https://panel.astrohub.example` →
   yönetici hesabı, istasyon adı, AutoDJ.
7. **Yayını dinle.** `https://yayin.astrohub.example/radio.mp3` —
   tarayıcıda ses gelmeli. Gelmiyorsa `Caddyfile`daki
   `read_timeout 0` satırı kontrol edilmeli.
8. **API anahtarı.** Panelde profil → API anahtarları. Anahtar
   **yalnızca** Supabase gizli değişkenine girer (aşağı bak).
9. **Adaptörü bağla.** Supabase'e üç değişken:
   `AZURACAST_BASE_URL`, `AZURACAST_STATION_ID`, `AZURACAST_API_KEY`.
   Sonra `supabase functions deploy radyo-durum`.
10. **İstasyon satırı.** Panelde **Radyo → İstasyon**: yayın adresi,
    `enabled = true`, `is_default = true`.
11. **Yoklama cron'u.** Dakikada bir `POST /radyo-durum?yokla=1`,
    `x-cron-secret` başlığıyla. Yoklama olmadan site istasyonu
    **çevrimdışı** gösterir — ve bu doğru davranıştır (aşağı bak).
12. **Yedeklemeyi kur.** `yedekleme.sh` + cron. **Aynı gün** boş bir
    dizine geri yükleme provası yapın.

---

## Güvenlik

**Sırlar üç yerde durur, dördüncüsü yoktur.**

| Sır | Yeri | Kim okur |
|---|---|---|
| AzuraCast API anahtarı | Supabase gizli değişkeni | Yalnızca `radyo-durum` fonksiyonu |
| Yayıncı (DJ) şifresi | AzuraCast'in kendi kullanıcı kaydı | Yalnızca o yayıncı |
| Cron sırrı | Supabase + cron sağlayıcı | Yoklama yolu |

Hiçbiri veritabanı tablosunda **değil**. Gerekçe `0051`in başında
yazılı: bir tablo satırı yanlış yazılmış bir politikayla okunabilir hâle
gelir, ortam değişkeni veritabanında hiç değildir.

`VITE_` önekli bir değişkene **asla** konmaz — Vite o değişkenleri
derlenmiş pakete düz metin olarak gömer ve siteyi açan herkes okur.

**Diğer sertleştirmeler**

- Panel ayrı alan adında ve yalnızca yerel arayüze bağlı.
- HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
- Sunucu sürüm başlığı kapalı.
- `Caddyfile`da panel için IP kısıtı hazır — yorum satırında, kendi
  adresinizle açın.
- Şifre rotasyonu (§10.3): yayıncı şifreleri AzuraCast'te; ayrılan
  yayıncının hesabı **askıya alınır**, silinmez —
  `radio_hosts.suspended_at`. Profil durur, yayın yetkisi gider;
  geçmiş programların künyesi boşalmamalı.

---

## Yedekleme

- **Günlük**, gece 04:00, 14 gün saklama (`yedekleme.sh`).
- Yedek konteynerden **dışarı** kopyalanır — volume sunucuyla birlikte
  kaybolur.
- Eski yedekler **yenisi doğrulandıktan sonra** silinir. Ters sıra,
  başarısız bir yedek gecesinde elde hiçbir şey bırakmazdı.
- Boyut kontrolü var: 1 MB altındaki arşiv hata sayılır. Boş bir arşiv
  de sıfırla dönmeyen bir hatadır.
- **Yılda bir geri yükleme provası.** Test edilmemiş yedek, çalıştığı
  bilinmeyen yedektir.

Off-site kopya (S3/B2) **eklenmedi**: hedef ve kimlik bilgisi işletme
kararı. `yedekleme.sh`in sonuna bir `rclone copy` satırı yeterli.

---

## "Canlı" ne demek

§10.2 sahte "canlı" ibaresini yasaklıyor. Bu yasak koda üç yerde
girdi:

1. `radio_stations`ta **`is_live` kolonu yok**. Olsaydı yayın düşer,
   kolon `true` kalır, site "canlı yayındayız" yazardı.
2. Canlılık `radio_stream_health`teki **ölçüm**. `app.station_is_live`
   üç dakikadan eski yoklamayı canlı saymıyor — canlıda ölçüldü:
   5 dakikalık yoklama `false` döndürüyor.
3. Adaptör hata yolunda **her zaman** `canli: false` döndürüyor.
   Yapılandırma eksik, sunucu ulaşılamıyor, yanıt anlaşılmıyor —
   üçünde de. "Bilmiyorum" ile "canlı" arasında varsayılan asla
   "canlı" olamaz.

Sonuç: **kurulum yapılmadan site radyoyu çevrimdışı gösterir ve bu
doğrudur.** Bugünkü davranış bir eksiklik değil, doğru cevap.

---

## Dinleyici sayısı

Adaptör AzuraCast'in `/listeners` uç noktasına **hiç gitmiyor**. O uç
nokta IP, konum ve user-agent döndürüyor; bize lazım olan tek şey sayı
ve sayıyı almak için listeyi çekmek gerekmiyor.

`radio_stream_health.listeners` yalnızca toplamı tutuyor. Kimin
dinlediği bu şemada yok ve olmamalı — birinin ne dinlediği, kaç kişinin
dinlediğinden bambaşka bir bilgi.

Sayı bilinmiyorsa kolon **boş** kalıyor, `0` değil: "kimse dinlemiyor"
ile "sayamadık" farklı cümleler.

---

## Telif

Kodla çözülmüyor, burada yazılı olması gerekiyor.

Türkiye'de müzik yayını meslek birliklerine (MESAM, MSG) lisans
yükümlülüğü doğurur. Bu yükümlülük **işletmenindir**; AzuraCast'in
açık kaynak olması müziğin telifsiz olduğu anlamına gelmez.

Yükümlülüğü doğurmayan yol: kendi ürettiğiniz içerik, açık lisanslı
müzik (CC BY / CC0) ve konuşma programları. `radio_tracks` tablosu bu
kullanım için var — sitenin kendi mp3 kasası.

Yönetim alanları (§10.3 "telif ve lisans uyumluluğu için yönetim
alanları") AzuraCast'in medya kütüphanesindeki metadata alanlarında
tutulur; her parçanın lisansı yüklenirken yazılmalıdır.

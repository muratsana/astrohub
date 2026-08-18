# Ek kullanıcı bulgusu — 2026-08-18

## UF-012 · HIGH · Benzer fotoğraflar / Teknik karşılaştırma kartlarında görsel yerine placeholder var
- Modül: Galeri → Fotoğraf detayı → Benzer fotoğraflar / Teknik karşılaştırma
- Gözlem: İlgili kartlarda başlık ve açıklamalar geliyor ancak thumbnail görseller yüklenmiyor; kartlarda yalnız AstroHub kamera placeholder'ı görünüyor.
- Kullanıcı etkisi: Benzer kareleri ve teknik karşılaştırmayı görsel olarak değerlendirme işlevi fiilen kayboluyor; kullanıcı kart başlıklarına bakmak zorunda kalıyor.
- Beklenen: Kart veri modelinde ilgili fotoğrafın gerçek thumbnail / preview URL'si taşınmalı; RemoteImage/thumbnail pipeline üzerinden yüklenmeli. Görsel gerçekten yoksa placeholder kullanılmalı, URL veya mapping hatasında sessizce placeholder'a düşülmemeli.
- Test: Bir fotoğraf detayında en az 1 benzer fotoğraf ve 1 teknik karşılaştırma kartı varsa, kartların img/src veya background kaynağı gerçek fotoğraf asset'ine bağlanmalı ve doğal genişlik/yükseklik > 0 olmalı.

# Ek kullanıcı bulgusu — 2026-08-18

## UF-013 · MEDIUM · Fotoğraf puanlama bloğu gereksiz dikey alan kaplıyor
- Modül: Galeri → Fotoğraf detayı
- Mevcut: “Fotoğrafa puan ver” başlıklı ayrı geniş bir panel ve 1–10 butonları.
- İstenen tasarım: puanlama kontrolü fotoğrafın hemen altındaki aksiyon satırına taşınmalı.
- Davranış: 1–10 arası yıldızlama sistemi kullanılmalı; kullanıcı tek kompakt kontrol üzerinden puan verebilmeli.
- UX önerisi: yıldız/puan ikonu + mevcut puan özeti; hover/tıklamada 1–10 seçimleri açılır. Seçim sonrası kullanıcı puanı ve ortalama puan görünür kalır.
- Amaç: fotoğraf detayında dikey alan tüketimini azaltmak ve puanlamayı görselin doğal eylem alanına taşımak.
- Mobil: 10 ayrı kalıcı buton yerine açılır/overlay yıldız seçici kullanılmalı; dokunma hedefleri erişilebilir ölçüde kalmalı.

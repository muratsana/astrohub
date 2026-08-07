# Astrohub Yenileme Paketi

Astrohub'ın kapsamlı yenilemesi için hazırlanmış plan ve takip malzemesi.
Kod içermez — bu bir **iş planıdır**.

Hazırlandığı sürüm: `muratsana/astrohub` @ `e08270e` (main)

**Ölçülen taban:** 2.188 test geçiyor · typecheck ve lint temiz ·
2 bağımlılık açığı (`npm audit fix` ile kapanıyor). Depo sağlıklı; plandaki
bulgular bozukluk değil, yarım kalmış bağlantılar.

## İçerik

| Dosya | Ne işe yarar |
|---|---|
| `ASTROHUB-YENILEME-PLANI.md` | **Ana belge.** 16 faz, ölçülen başlangıç durumu, kararlar, riskler, açık sorular |
| `PROMPT.md` | Claude Code'a verilecek promptlar — başlangıç, faz şablonu, özel işler |
| `ilerleme.html` | Otomatik ilerleme panosu. Depoda `docs/ilerleme.html` olarak tutulur |

## Nasıl başlanır

1. Bu klasörü Astrohub deposunun köküne `astrohub-plan/` olarak çıkarın.
2. `PROMPT.md` §1'deki başlangıç promptunu Claude Code'a verin.
3. Sonrasında her fazı **ayrı oturumda**, §2'deki şablonla verin.

## Üç kural

**Faz faz ilerleyin.** Planın tamamını tek seferde vermeyin; 16 faz
birbirine bağımlı.

**§1.1'i atlamayın.** Astrohub'da 96 tablo ve 97 migration var. Orada
"zaten var" diye işaretlenen hiçbir şey yeniden yazılmamalı — bu, bu
projede yapılabilecek en pahalı hata.

**Panoyu tek liste olarak tutun.** İlerleme yalnızca `ilerleme.html`
içindeki `DURUM` bloğunda izlenir. İkinci bir liste tutulursa ikisi
birbirinden ayrı düşer.

## Önce cevaplanması gerekenler

Plan §8.2'de beş açık soru var. FAZ 1'e başlamadan önce en kritiği
cevaplanmalı: **premium hangi özellikleri açıyor?** Bu netleşmeden yetki
mimarisinin kota satırları doldurulamaz.

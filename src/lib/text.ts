/**
 * TÜRKÇEYE DUYARLI BÜYÜK/KÜÇÜK HARF.
 *
 * CSS `text-transform: uppercase` dil duyarlıdır ama duyarlılığı **sayfanın
 * `lang` bilgisine** bağlıdır. Uygulamayı kendi `<html>` iskeletine saran bir
 * ortamda (gömülü önizleme, paylaşılan sayfa, e-posta istemcisi) o bilgi
 * bizim değil; "i" harfi "I" olur ve başlık "KARENIN" diye çıkar.
 *
 * Bu yüzden görünür büyük harf CSS'e bırakılmıyor: dönüşüm burada, açıkça
 * `tr-TR` yerel ayarıyla yapılıyor. Karşılığında metin panoya da büyük harf
 * kopyalanır — kabul edilebilir, çünkü alternatifi yanlış yazılmış bir
 * başlık.
 *
 * İki tuzak:
 *   · i → İ (noktalı), ı → I (noktasız). Varsayılan yerel ayarda ikisi de
 *     I olur ve Türkçe okuyan için kelime bozulur.
 *   · Küçültmede "İ" → "i̇" (i + birleşen nokta) çıkar; arama karşılaştırması
 *     yapan yerler bunu bilmeli (bkz. features/search).
 */

export function upperTr(value: string): string {
  return value.toLocaleUpperCase('tr-TR');
}

export function lowerTr(value: string): string {
  return value.toLocaleLowerCase('tr-TR');
}

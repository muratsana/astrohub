/**
 * TARAYICIYA DOSYA İNDİRTME — ortak yardımcı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `ics.ts`TEN TAŞINDI
 *
 * Bu fonksiyon takvim dosyası yazıcısının içinde yaşıyordu ve orada
 * yeri yoktu: indirme işleminin RFC 5545 ile ilgisi yok. CSV dışa
 * aktarma (Faz 4) ikinci çağıran olunca seçenek ikiydi — ikinci bir
 * kopya yazmak ya da taşımak. Fazın kuralı çakışan modülleri
 * birleştirmek; taşındı ve `ics.ts` buradan içe aktarıyor.
 *
 * `Blob` + `URL.createObjectURL`: veri zaten istemcide, sunucuya gidip
 * geri getirmenin anlamı yok. `revokeObjectURL` çağrılıyor —
 * çağrılmazsa nesne URL'si sekme kapanana kadar bellekte kalır.
 */
export function downloadText(
  fileName: string,
  content: string,
  mime = 'text/plain;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

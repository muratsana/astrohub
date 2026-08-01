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

/**
 * ═══════════════════════════════════════════════════════════════════════
 * ARAMA NORMALİZASYONU — tek kaynak (Faz 4.1)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ÜÇ AYRI KOPYASI VARDI: `features/search/index.ts` içinde `normalize`,
 * `services/content/provinces.ts` içinde `normalizeTr`, ve burada yarım
 * hâliyle `lowerTr`. Üçü aynı işi yapıyordu ve biri değişince diğerleri
 * geride kalırdı — "cankiri" yazan kullanıcı bir modülde Çankırı'yı
 * buluyor, ötekinde bulamıyor olurdu.
 *
 * Kural veritabanındaki `app.tr_normalize` ile de AYNI: istemci "cankiri"
 * arar, sunucu "cankiri" saklar.
 *
 * ─────────────────────────────────────────────────────────────────────
 * TÜRKÇE I/İ TUZAĞI
 *
 * `'I'.toLowerCase()` JavaScript'te 'i' verir; Türkçede 'ı' olmalı.
 * `toLocaleLowerCase('tr-TR')` önce çalışıyor, sonra harfler ASCII
 * karşılığına iniyor — böylece hem "IĞDIR" hem "ığdır" hem "igdir"
 * aynı anahtara düşüyor.
 */
const KATLAMA: Record<string, string> = {
  ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u',
};

export function normalizeTr(value: string): string {
  return lowerTr(value)
    .replace(/[ışğüöçâîû]/g, (ch) => KATLAMA[ch] ?? ch)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Türkçe alfabetik karşılaştırıcı.
 *
 * `localeCompare` YERELSİZ çağrılırsa Ç'yi C'den, Ş'yi S'den, Ü'yü
 * U'dan ÖNCE sıralar — ölçtüm: yerelsiz "Çanakkale Cebeci", `tr` ile
 * "Cebeci Çanakkale". Bir şehir listesinde bu, kullanıcının aradığı ili
 * beklediği yerde bulamaması demek.
 *
 * `Intl.Collator` her çağrıda yeniden kurulmuyor: sıralama bir listede
 * n log n kez çağrılır ve her seferinde collator kurmak ölçülebilir
 * biçimde yavaş.
 */
const collator = new Intl.Collator('tr', { sensitivity: 'base', numeric: true });

export function compareTr(a: string, b: string): number {
  return collator.compare(a, b);
}

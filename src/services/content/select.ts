/**
 * TOHUM VERİ Mİ, VERİTABANI MI — seçim kuralı tek yerde.
 *
 * Uygulama iki kaynaktan da çalışabilmek zorunda:
 *
 *   · Ortam değişkeni yoksa (tek dosya önizleme, çevrimdışı kabuk, test)
 *     Supabase istemcisi hiç kurulmaz. Tohum dizisi tek kaynaktır.
 *   · Yapılandırma varsa veritabanı **otorite**dir; tohum dizisi yalnızca
 *     ilk boyama için kullanılır ve satırlar gelince yerini bırakır.
 *
 * BOŞ SONUÇ TOHUMA DÜŞER. Tablo boşsa bu "içerik yok" değil, "henüz
 * taşınmadı" demektir; boş bir katalog göstermek, yerel kataloğu
 * göstermekten daha yanıltıcıdır. Aynı gerekçe hata durumunda da geçerli.
 *
 * Ama sessiz kalmıyoruz: `degraded` bayrağı, veritabanına ulaşılamadığı
 * hâlde içerik gösterildiğini söyler. Arayüz bunu küçük bir not olarak
 * basar — kullanıcı gördüğü listenin canlı olmadığını bilmeli.
 */

export type ContentSource = 'seed' | 'db';

export interface ContentSelection<T> {
  items: T[];
  source: ContentSource;
  /** Veritabanı yapılandırılmış ama okunamadı; gösterilen liste yerel. */
  degraded: boolean;
}

export function selectContent<T>(params: {
  seed: T[];
  rows: T[] | null | undefined;
  configured: boolean;
  failed: boolean;
}): ContentSelection<T> {
  const { seed, rows, configured, failed } = params;

  if (rows && rows.length > 0) {
    return { items: rows, source: 'db', degraded: false };
  }

  return {
    items: seed,
    source: 'seed',
    // Yapılandırma yokken bozulma yok — o zaten tasarlanmış çalışma biçimi.
    degraded: configured && failed,
  };
}

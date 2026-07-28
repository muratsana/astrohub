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
  /**
   * Listeyi veritabanından yeniden çeker.
   *
   * Yazma akışları için: forum yanıtı gönderildiğinde liste kendiliğinden
   * tazelenmezse kullanıcı kendi mesajını göremez ve iki kez gönderir.
   * İyimser ekleme yapmıyoruz — yanıt sayısı ve sıralama veritabanı
   * tetikleyicisiyle güncelleniyor, iyimser bir kopya onlarla çelişirdi.
   */
  refresh: () => void;
}

export function selectContent<T>(params: {
  seed: T[];
  rows: T[] | null | undefined;
  configured: boolean;
  failed: boolean;
  /** Yapılandırma yoksa çekecek bir şey yok; varsayılan boş işlem. */
  refresh?: () => void;
}): ContentSelection<T> {
  const { seed, rows, configured, failed, refresh = () => {} } = params;

  if (rows && rows.length > 0) {
    return { items: rows, source: 'db', degraded: false, refresh };
  }

  return {
    items: seed,
    source: 'seed',
    // Yapılandırma yokken bozulma yok — o zaten tasarlanmış çalışma biçimi.
    degraded: configured && failed,
    refresh,
  };
}

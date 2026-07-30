/**
 * TOHUM VERİ Mİ, VERİTABANI MI — seçim kuralı tek yerde.
 *
 * Uygulama iki kaynaktan da çalışabilmek zorunda:
 *
 *   · Ortam değişkeni yoksa (tek dosya önizleme, çevrimdışı kabuk, test)
 *     Supabase istemcisi hiç kurulmaz. Tohum dizisi tek kaynaktır.
 *   · Yapılandırma varsa veritabanı **otorite**dir; tohum dizisi yalnızca
 *     ilk boyama için kullanılır ve sorgu sonuçlanınca yerini bırakır.
 *
 * BOŞ SONUÇ ARTIK TOHUMA DÜŞMEZ (QA P0-02, T-203). Eski kural boş tabloyu
 * "henüz taşınmadı" sayıp tohum gösteriyordu; site yayına çıktıktan sonra
 * bu, kurgu içeriği gerçekmiş gibi sunmak anlamına geldi. Veritabanı
 * ulaşılabilir ve sorgu başarılıysa dönen sonuç — boş bile olsa — gerçektir
 * ve arayüz tasarlanmış boş durumunu gösterir. Tohuma yalnızca üç durumda
 * düşülür: yapılandırma yok, sorgu henüz sonuçlanmadı (ilk boyama) ya da
 * sorgu başarısız (degraded).
 *
 * Sessiz de kalmıyoruz: `degraded` bayrağı veritabanına ulaşılamadığı
 * hâlde tohum gösterildiğini söyler; ilk boyamadaki tohum ise
 * `source === 'seed'` + `configured` ile "örnek içerik" olarak etiketlenir.
 */

export type ContentSource = 'seed' | 'db';

export interface ContentSelection<T> {
  items: T[];
  source: ContentSource;
  /** Veritabanı yapılandırılmış ama okunamadı; gösterilen liste yerel. */
  degraded: boolean;
  /**
   * Veritabanı yapılandırılmış mı? Arayüz bununla "tohum" un ne anlama
   * geldiğini ayırt eder: yapılandırma varken gelen tohum, "tablo henüz
   * boş" demektir ve kullanıcıya örnek içerik gösterildiği söylenmelidir;
   * yapılandırma yokken (tek dosya önizleme, çevrimdışı) tohum zaten
   * tasarlanmış çalışma biçimidir, etiket gürültü olur.
   */
  configured: boolean;
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

  /* Sorgudan dönmüş bir sonuç — boş liste dahil — otoritedir. `rows`un
     null/undefined olması "veri yok" değil "henüz sorgulanmadı" demektir;
     otorite ancak gerçekten dönen bir yanıtla el değiştirir. Sonraki bir
     tazeleme hatası (`failed`) eldeki gerçek sonucu tohuma döndürmez —
     bayat gerçek veri, taze kurgudan iyidir. */
  if (rows && configured) {
    return { items: rows, source: 'db', degraded: false, configured, refresh };
  }

  return {
    items: seed,
    source: 'seed',
    // Yapılandırma yokken bozulma yok — o zaten tasarlanmış çalışma biçimi.
    degraded: configured && failed,
    configured,
    refresh,
  };
}

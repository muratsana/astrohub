import type { ContentSelection } from '@/services/content/select';
import { cn } from '@/lib/cn';

/**
 * "Bu liste canlı değil" notu — iki ayrı dürüstlük durumu:
 *
 *   · **Bozulma:** veritabanı yapılandırılmış ama okunamamış; sayfa yerel
 *     katalogla ayakta. Kullanıcı listenin güncel olmayabileceğini bilmeli.
 *   · **Örnek içerik:** veritabanı ulaşılabilir ama tablo boş; gösterilen
 *     kayıtlar tanıtım amaçlı tohum veri. Kurgu içeriği gerçekmiş gibi
 *     sunmak, boş liste göstermekten daha yanıltıcıdır (QA P0-02) — bu
 *     yüzden etiket tercihi değil zorunluluktur.
 *
 * Yapılandırma hiç yokken (tek dosya önizleme, çevrimdışı kabuk) not
 * çıkmaz — orada tohum katalog arıza değil, tasarlanmış çalışma biçimi;
 * üretim derlemesinin yapılandırmasız çıkamamasını da envCheck garanti
 * ediyor (T-003).
 *
 * Not tek satır: uyarı kutusu kurmak, durumun ağırlığını abartmak olur.
 */
export function CatalogSourceNote({
  selection,
  className,
}: {
  selection: Pick<ContentSelection<unknown>, 'degraded' | 'source' | 'configured'>;
  className?: string;
}) {
  if (selection.degraded) {
    return (
      <p
        role="status"
        className={cn('mb-3 text-meta leading-snug text-warning', className)}
      >
        Katalog sunucusuna ulaşılamadı; yerel kayıtlar gösteriliyor. Liste
        güncel olmayabilir.
      </p>
    );
  }

  if (selection.source === 'seed' && selection.configured) {
    return (
      <p
        role="status"
        className={cn('mb-3 text-meta leading-snug text-warning', className)}
      >
        Örnek içerik — bu bölümde henüz yayımlanmış gerçek kayıt yok.
        Gösterilen kayıtlar tanıtım amaçlıdır.
      </p>
    );
  }

  return null;
}

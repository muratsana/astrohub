import type { ContentSelection } from '@/services/content/select';
import { cn } from '@/lib/cn';

/**
 * "Bu liste canlı değil" notu.
 *
 * Yalnızca **bozulma** hâlinde çizilir: veritabanı yapılandırılmış ama
 * okunamamış ve sayfa yerel katalogla ayakta kalmış. Yapılandırma hiç
 * yokken (tek dosya önizleme, çevrimdışı kabuk) not çıkmaz — orada yerel
 * katalog arıza değil, tasarlanmış çalışma biçimi.
 *
 * Sessizce yerel veriye düşmek daha kolay olurdu ama kullanıcı, gördüğü
 * listenin güncel olmayabileceğini bilmeden karar veriyor olurdu. Not tek
 * satır: uyarı kutusu kurmak, düşülen durumun ağırlığını abartmak olur.
 */
export function CatalogSourceNote({
  selection,
  className,
}: {
  selection: Pick<ContentSelection<unknown>, 'degraded'>;
  className?: string;
}) {
  if (!selection.degraded) return null;

  return (
    <p
      role="status"
      className={cn('mb-3 text-[11px] leading-snug text-warning', className)}
    >
      Katalog sunucusuna ulaşılamadı; yerel kayıtlar gösteriliyor. Liste
      güncel olmayabilir.
    </p>
  );
}

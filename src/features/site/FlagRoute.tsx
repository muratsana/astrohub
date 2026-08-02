import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageMeta } from '@/components/seo/PageMeta';
import { FlagClosedNote } from './FlagClosedNote';
import { useFlag } from './SiteConfigContext';
import type { FlagKey } from './siteConfig';
import { ButtonLink } from '@/components/ui/Button';

/**
 * BAYRAĞA BAĞLI ROTA (§13.2).
 *
 * `radyo_acik` / `tv_acik` bayraklarının açıklaması "sayfaları gizlenir"
 * diyor. Yalnızca menü bağlantılarını kaldırsaydık bu cümle yanlış
 * kalırdı: adres kaydedilmiş, paylaşılmış, arama motoruna düşmüş olabilir
 * ve sayfa çalışmaya devam ederdi. Kapı rotanın kendisinde.
 *
 * ══════════════════════════════════════════════════════════════════════
 * 404 DEĞİL, "KAPALI" — VE `noIndex`
 *
 * `NotFoundPage` döndürmek daha kısa olurdu ama yanlış şeyi söylerdi:
 * sayfa YOK değil, şu an KAPALI. Geri gelecek bir bölüm için 404, hem
 * ziyaretçiyi hem arama motorunu yanıltır (404 gören bot adresi düşürür).
 * `noIndex` ise kapalıyken indekslenmemesi için — kapandığı gün taranan
 * sayfa, kapalı hâliyle kaydedilmemeli.
 */
export function FlagRoute({
  flag,
  title,
  children,
}: {
  flag: FlagKey;
  /** Kapalı ekranın başlığı. Açıkken hiç kullanılmıyor. */
  title: string;
  children: ReactNode;
}) {
  const acik = useFlag(flag);
  if (acik) return <>{children}</>;

  return (
    <>
      <PageMeta title={title} description={`${title} şu an kapalı.`} noIndex />
      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: title }]}
          title={title}
        />
        <div className="grid gap-3">
          <FlagClosedNote>
            Bu bölüm şu an kapalı. Yayına döndüğünde buradan
            ulaşabileceksin.
          </FlagClosedNote>
          <div>
            <ButtonLink to="/" variant="secondary" size="sm">
              Ana sayfaya dön
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}

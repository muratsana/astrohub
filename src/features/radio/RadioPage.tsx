import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Panel } from '@/components/ui/Panel';
import { PlayIcon, PauseIcon } from '@/components/ui/icons';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useRadio } from './RadioContext';
import { RadioSchedule } from './RadioSchedule';
import { cn } from '@/lib/cn';

/**
 * ASTROHUB RADYO — kanal sayfası.
 *
 * Sayfanın işi tek kanalın durumunu göstermek; çalmanın kendisi kabuk
 * seviyesindeki `RadioProvider`'da olur, böylece kullanıcı bu sayfadan
 * ayrılınca yayın durmaz.
 */
export function RadioPage() {
  const { hasBroadcast, playing, toggle } = useRadio();

  return (
    <>
      <PageMeta
        title="Astrohub Radyo"
        description="Astrohub'ın gece yayını: çekim boyunca arka planda çalan, editör tarafından programlanmış kesintisiz liste."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Radyo', path: '/radyo' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Astrohub Radyo"
          description="Astrohub'ın kendi yayını. Gece boyunca arka planda çalar; sayfalar arasında gezinmek yayını kesmez — galeriye geçip geri dönebilirsin."
          meta={hasBroadcast ? 'Canlı yayın' : undefined}
        />

        {!hasBroadcast ? (
          <EmptyState
            message="Yayın henüz başlamadı"
            hint="Radyo yayına alındığında bu sayfadan ve üst çubuktan açılır."
          />
        ) : (
          <Panel title="Canlı yayın" status={playing ? 'açık' : 'duraklatıldı'}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggle}
                aria-label={
                  playing ? 'Canlı yayını duraklat' : 'Canlı yayını başlat'
                }
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-card border transition-colors',
                  playing
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:border-primary hover:text-primary'
                )}
              >
                {playing ? (
                  <PauseIcon className="h-4 w-4" />
                ) : (
                  <PlayIcon className="h-4 w-4" />
                )}
              </button>

              <div className="min-w-0">
                <p className="text-body font-medium text-foreground">
                  Astrohub Radyo
                </p>
                <p className="text-meta text-success">Canlı yayın</p>
              </div>
            </div>
          </Panel>
        )}

        {/* Takvim listenin İÇİNDE değil, yanında: canlı yayın ile yerel
            mp3 kasası iki ayrı şey ve biri boşken diğeri dolu olabilir.
            Kasa boş diye takvimi gizlemek, programı olan bir radyoyu
            programsız göstermek olurdu. */}
        <RadioSchedule />

        {/* Podcast arşivine bağlantı: bağlantısı olmayan bir sayfa yok
            sayılır. Arşiv canlı yayından bağımsız çalışıyor — yayın
            sunucusu kurulmasa da bölümler dinlenebilir. */}
        <p className="mt-8 text-body-sm text-muted-foreground">
          Kayıtlı yayınlar ve konuk programları için{' '}
          <Link to="/radyo/podcast" className="text-primary hover:underline">
            podcast arşivine
          </Link>{' '}
          bakabilirsiniz.
        </p>
      </Container>
    </>
  );
}

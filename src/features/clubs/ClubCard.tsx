import { Badge } from '@/components/ui/Badge';
import {
  ContentCard,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
import { cn } from '@/lib/cn';
import { clubKindLabels } from './data';
import type { ClubView } from './clubsSource';

/**
 * DİZİN KARTI — hem ana listede hem şehir sayfalarında.
 *
 * `ClubsPage` içinde yaşıyordu; şehir bazlı yerel SEO sayfaları (§14.7)
 * aynı kartı çizince ortak dosyaya alındı. İkinci bir kopya yazmak,
 * "doğrulanmış" rozetinin bir sayfada görünüp ötekinde görünmemesiyle
 * biterdi.
 */
export function ClubCard({
  club,
  variant,
}: {
  club: ClubView;
  variant: 'grid' | 'list';
}) {
  return (
    <ContentCard
      to={`/topluluk/${club.slug}`}
      className={cn(
        'p-3',
        variant === 'list' && 'sm:flex-row sm:items-center sm:gap-3'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <ContentCardTitle lines={2} className="font-medium leading-snug">
            {club.name}
          </ContentCardTitle>
          <span className="label">{club.city}</span>
        </div>

        {variant === 'grid' && (
          <p className="mt-1.5 line-clamp-3 text-body-sm leading-relaxed text-muted-foreground">
            {club.summary}
          </p>
        )}

        <ContentCardMeta className="mt-1.5 text-faint">
          {club.foundedYear ? `${club.foundedYear} kuruluş` : 'kuruluş bilinmiyor'}
          {club.memberCount ? ` · ${club.memberCount} üye` : ''}
        </ContentCardMeta>
      </div>

      <div className={cn('mt-2', variant === 'list' && 'sm:mt-0 sm:shrink-0')}>
        <div className="flex flex-wrap gap-1">
          <Badge tone="primary">{clubKindLabels[club.kind]}</Badge>
          {/* Doğrulama rozeti önde: ziyaretçinin kartta aradığı ilk şey
              "bu kayıt teyitli mi". */}
          {club.verifiedAt && <Badge tone="success">Doğrulanmış</Badge>}
          {club.publicEvents && <Badge>Halka açık</Badge>}
          {club.sharedEquipment && <Badge tone="cold">Ortak ekipman</Badge>}
        </div>
      </div>
    </ContentCard>
  );
}

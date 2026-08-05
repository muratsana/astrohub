import { Badge } from '@/components/ui/Badge';
import {
  ContentCard,
  ContentCardBody,
  ContentCardMedia,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
import { RemoteImage } from '@/components/media/RemoteImage';
import { cn } from '@/lib/cn';
import { clubKindLabels, clubTopicLabels } from './data';
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
      variant={variant}
      className={variant === 'grid' ? undefined : 'items-stretch'}
    >
      <ContentCardMedia
        variant={variant}
        ratio="standard"
        className={variant === 'list' ? 'mt-0 self-start' : undefined}
      >
        <RemoteImage
          src={club.photos?.[0]?.url}
          alt={club.photos?.[0]?.alt ?? `${club.name} görseli`}
          seed={club.slug}
          tint={club.kind}
          sizes={
            variant === 'list' ? '128px' : '(min-width: 1024px) 260px, 100vw'
          }
        />
      </ContentCardMedia>

      <ContentCardBody
        className={cn(
          'p-0',
          variant === 'grid' ? 'px-2.5 py-2' : 'min-h-28 py-0'
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <ContentCardTitle lines={2} className="font-medium leading-snug">
            {club.name}
          </ContentCardTitle>
          <span className="label">{club.city}</span>
        </div>

        <p
          className={cn(
            'mt-1.5 text-body-sm leading-relaxed text-muted-foreground',
            variant === 'grid' ? 'line-clamp-3' : 'line-clamp-2'
          )}
        >
          {club.summary}
        </p>

        <ContentCardMeta className="mt-1.5 text-faint">
          {club.foundedOn
            ? `${new Date(club.foundedOn).toLocaleDateString('tr-TR')} kuruluş`
            : club.foundedYear
              ? `${club.foundedYear} kuruluş`
              : 'kuruluş bilinmiyor'}
          {club.memberCount ? ` · ${club.memberCount} üye` : ''}
        </ContentCardMeta>

        <div className="mt-auto pt-2">
          <div className="flex flex-wrap gap-1">
            <Badge tone="primary">{clubKindLabels[club.kind]}</Badge>
            {/* Doğrulama rozeti önde: ziyaretçinin kartta aradığı ilk şey
                "bu kayıt teyitli mi". */}
            {club.verifiedAt && <Badge tone="success">Doğrulanmış</Badge>}
            {club.topics?.slice(0, 2).map((topic) => (
              <Badge key={topic} tone="cold">
                {clubTopicLabels[topic]}
              </Badge>
            ))}
            {club.publicEvents && <Badge>Halka açık</Badge>}
            {club.sharedEquipment && <Badge tone="cold">Ortak ekipman</Badge>}
          </div>
        </div>
      </ContentCardBody>
    </ContentCard>
  );
}

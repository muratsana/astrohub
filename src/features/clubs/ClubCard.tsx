import { Link } from 'react-router';
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
import { clubKindLabels } from './data';
import type { ClubView } from './clubsSource';
import { ClubJoinButton } from './ClubJoinButton';

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
    <ContentCard variant={variant} className={variant === 'grid' ? undefined : 'items-stretch'}>
      <Link
        to={`/topluluk/${club.slug}`}
        className={variant === 'list' ? 'shrink-0' : 'block'}
        aria-label={`${club.name} sayfasını aç`}
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
      </Link>

      <ContentCardBody
        className={cn(
          'p-0',
          variant === 'grid' ? 'px-2.5 py-2' : 'min-h-28 py-0'
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Link to={`/topluluk/${club.slug}`} className="min-w-0">
            <ContentCardTitle lines={2} className="font-medium leading-snug">
              {club.name}
            </ContentCardTitle>
          </Link>
          <span className="label">{club.city}</span>
        </div>

        <ContentCardMeta className="mt-1.5 text-faint">
          {club.foundedOn
            ? `${new Date(club.foundedOn).toLocaleDateString('tr-TR')} kuruluş`
            : club.foundedYear
              ? `${club.foundedYear} kuruluş`
              : 'kuruluş bilinmiyor'}
          {club.memberCount ? ` · ${club.memberCount} üye` : ''}
        </ContentCardMeta>

        <div className="mt-auto pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="primary">{clubKindLabels[club.kind]}</Badge>
            {/* Doğrulama rozeti önde: ziyaretçinin kartta aradığı ilk şey
                "bu kayıt teyitli mi". */}
            {club.verifiedAt && <Badge tone="success">Doğrulanmış</Badge>}
            <ClubJoinButton
              clubSlug={club.slug}
              clubName={club.name}
              compact
            />
          </div>
        </div>
      </ContentCardBody>
    </ContentCard>
  );
}

import { Badge } from '@/components/ui/Badge';
import { usePublicProfileBadges } from '@/services/content/photoOfWeek';

export function ProfileBadges({ userId }: { userId: string | undefined }) {
  const badges = usePublicProfileBadges(userId);
  if (!badges) return null;

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Profil rozetleri">
      {badges.weekWins > 0 && (
        <Badge tone="success">⭐ Haftanın Fotoğrafı ×{badges.weekWins}</Badge>
      )}
      {badges.verifiedOrganizer && <Badge tone="cold">✓ Doğrulanmış Organizatör</Badge>}
      {badges.clubManager && <Badge>🏛 Kulüp Yöneticisi</Badge>}
    </div>
  );
}

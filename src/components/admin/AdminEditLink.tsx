import { ButtonLink } from '@/components/ui/Button';
import { useRoles } from '@/features/admin/useRoles';

export function AdminEditLink({ to }: { to: string }) {
  const roles = useRoles();
  if (!roles.isAdmin) return null;

  return (
    <ButtonLink to={to} size="sm" variant="secondary">
      Düzenle
    </ButtonLink>
  );
}

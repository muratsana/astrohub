import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

export function ProfileInlineLink({
  username,
  children,
  className,
  stopPropagation = false,
}: {
  username: string | null | undefined;
  children?: ReactNode;
  className?: string;
  stopPropagation?: boolean;
}) {
  if (!username) {
    return <span className={className}>{children ?? '@bilinmiyor'}</span>;
  }

  const onClick = stopPropagation
    ? (event: MouseEvent<HTMLAnchorElement>) => event.stopPropagation()
    : undefined;

  return (
    <Link
      to={`/profil/${username}`}
      onClick={onClick}
      className={cn(
        'transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        className
      )}
    >
      {children ?? `@${username}`}
    </Link>
  );
}

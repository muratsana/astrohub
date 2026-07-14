import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from './icons';

/**
 * Bölüm başlığı — §6.6: "Tümünü gör" bağlantısı sağ üstte sade biçimde.
 * İkon opsiyonel; başlık + kısa açıklama + opsiyonel bağlantı.
 */
export function SectionHeader({
  title,
  description,
  icon,
  linkTo,
  linkLabel = 'Tümünü Gör',
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground sm:text-2xl">
          {icon && <span className="text-primary">{icon}</span>}
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="group inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          {linkLabel}
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

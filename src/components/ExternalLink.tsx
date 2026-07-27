import type { ReactNode } from 'react';
import { safeUrl, displayHost, EXTERNAL_LINK_REL } from '@/lib/url';
import { cn } from '@/lib/cn';

/**
 * DIŞ BAĞLANTI.
 *
 * Adres `safeUrl`den geçmeden bağlantıya dönüşmez: `javascript:` şeması
 * tıklandığında sayfanın kendi kaynağında betik çalıştırır ve React `href`
 * için hiçbir dizeyi engellemez (§15.4).
 *
 * Adres güvenli değilse bağlantı **hiç kurulmaz**; metin düz metin olarak
 * kalır. Sessizce bir "#" bağlantısı üretmek, tıklanabilir görünen ama
 * çalışmayan bir öğe bırakırdı.
 *
 * `rel` her zaman `noopener noreferrer nofollow`: `noopener` olmadan açılan
 * sekme `window.opener` üzerinden bizim sayfamızı başka bir adrese
 * yönlendirebilir (tabnabbing).
 *
 * Alan adı, kullanıcı nereye gittiğini tıklamadan görebilsin diye
 * gösterilebilir (`showHost`).
 */
export function ExternalLink({
  href,
  children,
  className,
  showHost = false,
}: {
  href: string | undefined | null;
  children: ReactNode;
  className?: string;
  /** Bağlantının ardına "(esa.int)" biçiminde alan adı ekler. */
  showHost?: boolean;
}) {
  const safe = safeUrl(href);

  if (!safe) {
    return <span className={className}>{children}</span>;
  }

  return (
    <a
      href={safe}
      target="_blank"
      rel={EXTERNAL_LINK_REL}
      className={cn('transition-colors hover:text-primary', className)}
    >
      {children}
      {showHost && (
        <span className="ml-1 text-faint">({displayHost(safe)})</span>
      )}
      <span className="sr-only"> (yeni sekmede açılır)</span>
    </a>
  );
}

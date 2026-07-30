import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Badge } from './Badge';
import { PlateFrame } from '@/components/media/PlateFrame';
import { RemoteImage } from '@/components/media/RemoteImage';
import { tintFromSeed } from '@/components/media/tints';
import type { ViewMode } from './useViewMode';
import { cn } from '@/lib/cn';

/**
 * EDİTÖRYEL LİSTE — haber, yazı ve etkinlik için tek düzen.
 *
 * Üç modül de aynı şeyi yapıyor: tarihli, kategorili, özetli kayıtları
 * sıralamak. Üçü ayrı yazıldığında manşet yalnızca haberlerde vardı,
 * görsel yalnızca haberlerde vardı, kart yüksekliği üç sayfada üç
 * türlüydü. Sayfadan sayfaya geçen kullanıcı için bu, aynı sitenin üç
 * farklı bölümü gibi okunuyordu.
 *
 * Düzen tek yerde olunca "manşetli mi, görselli mi, kaç kolon" soruları
 * bir kez cevaplanıyor ve üç sayfa birlikte değişiyor.
 *
 * MANŞET YALNIZCA IZGARA GÖRÜNÜMÜNDE. Liste görünümü tarama içindir;
 * orada bir kaydı öne çıkarmak taramayı bozar.
 */

export interface EditorialItem {
  /** React anahtarı ve görsel tohumu — kayıt slug'ı. */
  slug: string;
  to: string;
  title: string;
  summary: string;
  /** Rozet metni: kategori, tür, seviye. */
  category: string;
  /** Sağ üstte küçük gri metin: tarih, süre. */
  meta?: string;
  /** Kartın altına sabitlenen künye satırı. */
  footer?: ReactNode;
  /** StarField tonu ("r,g,b"). Verilmezse slug'dan türetilir. */
  tint?: string;
  /**
   * Telifi uygun dış görsel. Yoksa (ya da yüklenemezse) kart kendi yıldız
   * alanını çizer — kırık görsel ikonu göstermek yer tutucudan kötüdür.
   */
  imageUrl?: string;
  /** CC BY 4.0'ın şartı: kredi görünür olmalı. */
  imageCredit?: string;
}

export function EditorialList({
  items,
  view,
  leadLabel = 'Manşet',
  emptyMessage,
}: {
  items: EditorialItem[];
  view: ViewMode;
  leadLabel?: string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-card border border-border bg-surface-1 px-4 py-16 text-center text-[12px] text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  if (view === 'list') {
    return (
      <ul className="grid gap-px overflow-hidden rounded-card border border-border bg-border">
        {items.map((item) => (
          <li key={item.slug}>
            <EditorialRow item={item} />
          </li>
        ))}
      </ul>
    );
  }

  const [lead, ...rest] = items;

  return (
    <>
      <LeadCard item={lead} label={leadLabel} />

      {rest.length > 0 && (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>li]:h-full">
          {rest.map((item) => (
            <li key={item.slug}>
              <EditorialCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function seedTint(item: EditorialItem): string {
  return item.tint ?? tintFromSeed(item.slug);
}

function LeadCard({ item, label }: { item: EditorialItem; label: string }) {
  return (
    <Link
      to={item.to}
      className="group mb-2.5 grid gap-3.5 rounded-card border border-border bg-surface-1 p-2.5 transition-colors hover:border-border-strong md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]"
    >
      <PlateFrame
        ratio="aspect-[16/9]"
        badge={
          <span className="rounded-[2px] border border-primary/50 bg-primary/15 px-1.5 py-0.5 text-[9px] tracking-[0.02em] text-primary backdrop-blur-sm">
            {label}
          </span>
        }
      >
        <RemoteImage
          src={item.imageUrl}
          alt={item.title}
          seed={item.slug}
          tint={seedTint(item)}
        />
      </PlateFrame>

      <div className="flex flex-col py-1 pr-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone="primary">{item.category}</Badge>
          {item.meta && (
            <span className="tabular text-[10.5px] text-faint">{item.meta}</span>
          )}
        </div>

        <h2 className="text-[18px] text-foreground transition-colors group-hover:text-primary sm:text-[21px]">
          {item.title}
        </h2>
        <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
          {item.summary}
        </p>

        {item.imageCredit && (
          <p className="mt-2 text-[10px] text-faint">
            Görsel: {item.imageCredit}
          </p>
        )}

        {item.footer && <div className="mt-auto pt-3">{item.footer}</div>}
      </div>
    </Link>
  );
}

/**
 * Kart görsel taşır — haberlerde vardı, yazılarda yoktu.
 *
 * Görselin işlevi süs değil: kayıtlar aynı ölçüde görsel bir üst blokla
 * başlayınca ızgara satırları hizalanıyor ve göz başlıkları tek bir
 * dikey hatta tarayabiliyor. Metin yüksekliği değişse de kart yapısı
 * sabit kalıyor.
 */
function EditorialCard({ item }: { item: EditorialItem }) {
  return (
    <Link
      to={item.to}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface-1',
        'transition-colors hover:border-border-strong'
      )}
    >
      {/* Oran galeri karosuyla aynı (4:3, PlateFrame varsayılanı):
          site genelinde ızgara kartlarının tek bir ölçüsü var. Bir
          modülün 16:9 kalması, aynı sayfada iki farklı kart yüksekliği
          demekti. Üstteki geniş "öne çıkan" kart bunun dışında —
          o bir ızgara karosu değil, tam genişlik bir manşet. */}
      <PlateFrame className="shrink-0 rounded-none border-0 border-b border-border">
        <RemoteImage
          src={item.imageUrl}
          alt={item.title}
          seed={item.slug}
          tint={seedTint(item)}
        />
      </PlateFrame>

      <div className="flex flex-1 flex-col p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge>{item.category}</Badge>
          {item.meta && (
            <span className="tabular text-[10px] text-faint">{item.meta}</span>
          )}
        </div>

        <h2 className="text-[13px] leading-snug text-foreground transition-colors group-hover:text-primary">
          {item.title}
        </h2>
        <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
          {item.summary}
        </p>

        {item.footer && <div className="mt-auto pt-3">{item.footer}</div>}
      </div>
    </Link>
  );
}

/** Liste görünümü: görselsiz, tek satır — tarama için. */
function EditorialRow({ item }: { item: EditorialItem }) {
  return (
    <Link
      to={item.to}
      className="group flex h-full items-baseline gap-3 bg-surface-1 px-3 py-2.5 transition-colors hover:bg-surface-2"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-foreground transition-colors group-hover:text-primary">
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {item.summary}
        </span>
      </span>

      <span className="hidden shrink-0 items-center gap-2 sm:flex">
        <Badge>{item.category}</Badge>
        {item.meta && (
          <span className="tabular w-[92px] shrink-0 text-right text-[10px] text-faint">
            {item.meta}
          </span>
        )}
      </span>
    </Link>
  );
}

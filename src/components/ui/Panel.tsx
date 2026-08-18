import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * PANEL — hairline çerçeveli içerik bloğu.
 *
 * Başlık satırı bir "enstrüman etiketi" gibi davranır: solda büyük harf ad,
 * sağda isteğe bağlı durum. Gölge yoktur; ayrım yalnızca çizgi ve yüzeydir.
 */
export function Panel({
  title,
  titleAs: Heading = 'h2',
  status,
  children,
  className,
  bodyClassName,
  id,
  collapsible = false,
  defaultOpen = true,
}: {
  title?: string;
  /**
   * Başlığın belge hiyerarşisindeki seviyesi.
   *
   * VARSAYILAN `h2` VE BU BİR DÜZELTME. Panel başlığı koşulsuz `h3`
   * çiziyordu; sayfaların çoğunda araya giren bir `h2` olmadığı için
   * yapı `h1 → h3` diye atlıyordu (denetimde 24 sayfada ölçüldü, WCAG
   * 1.3.1). Ekran okuyucu kullanıcısı başlıklar arasında gezinirken bir
   * seviye kayboluyordu.
   *
   * Panel gerçekten bir `h2`nin ALTINDA duruyorsa çağıran `h3` geçiyor —
   * seviye içeriğe göre seçilir, görünüme göre değil. Görünüm zaten
   * seviyeden bağımsız: `label` sınıfı üçünde de aynı.
   */
  titleAs?: 'h2' | 'h3' | 'h4';
  /** Başlığın sağındaki küçük durum bilgisi. */
  status?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /**
   * Bölüm çapası. Verilirse `<section>`/`<details>` bu id'yi taşır ve
   * `scroll-mt-20` ile sabit üst çubuğun altında kalmadan hedeflenebilir
   * — deep-link (URL hash) için (E07).
   */
  id?: string;
  /**
   * Native `<details>` ile aç/kapa. Header bir `<summary>` olur; JS'siz,
   * klavye ve ekran okuyucu uyumlu çalışır (FaqPage'in kabul ettiği yol).
   */
  collapsible?: boolean;
  /** Collapsible panelin ilk hâli. Varsayılan açık — içerik gizlenmesin. */
  defaultOpen?: boolean;
}) {
  const cerceve = cn(
    'rounded-card border border-border bg-surface-1',
    id && 'scroll-mt-20',
    className
  );

  if (collapsible && (title || status)) {
    return (
      <details id={id} open={defaultOpen} className={cn('group', cerceve)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-border px-4 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            {/* Ok, açık/kapalı durumla dönüyor; salt görsel. */}
            <span
              aria-hidden
              className="text-meta text-muted-foreground transition-transform group-open:rotate-90"
            >
              ▸
            </span>
            {title && (
              <Heading className="label text-foreground">{title}</Heading>
            )}
          </span>
          {status && (
            <span className="tabular text-meta text-muted-foreground">
              {status}
            </span>
          )}
        </summary>
        <div className={cn('px-4 py-4', bodyClassName)}>{children}</div>
      </details>
    );
  }

  return (
    <section id={id} className={cerceve}>
      {(title || status) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          {title && <Heading className="label text-foreground">{title}</Heading>}
          {status && (
            <span className="tabular text-meta text-muted-foreground">
              {status}
            </span>
          )}
        </header>
      )}
      <div className={cn('px-4 py-4', bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * Etiket–değer satırı. Teknik künyelerde ve detay sayfalarında
 * (§7.3 sekmeli teknik veri) tekrar eden temel satır.
 */
export function SpecRow({
  label,
  value,
  tone = 'plain',
}: {
  label: string;
  value: ReactNode;
  tone?: 'plain' | 'cold' | 'primary' | 'muted';
}) {
  const toneClass = {
    plain: 'text-foreground',
    cold: 'text-cold',
    primary: 'text-primary',
    muted: 'text-muted-foreground',
  }[tone];

  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
      <dt className="label shrink-0">{label}</dt>
      <dd className={cn('tabular text-right text-meta', toneClass)}>
        {value}
      </dd>
    </div>
  );
}

/** SpecRow'ları saran tanım listesi. */
export function SpecList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn('w-full', className)}>{children}</dl>;
}

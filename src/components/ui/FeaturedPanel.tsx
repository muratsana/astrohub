import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CARD_RATIO } from './cardRatios';
import { cn } from '@/lib/cn';

/**
 * ÖNE ÇIKAN / MANŞET PANELİ — tüm modüllerde tek tasarım.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN TEK BİLEŞEN
 *
 * Manşet altı modülde altı ayrı yerde yazılıydı ve ölçüldüğünde altısı
 * da farklıydı: galeri 1424×431 (görsel %38), haber/yazı/ilan 525px
 * yüksek (görsel %58), etkinlikler kendi kopyasında `min-h-[17.5rem]`.
 * Aynı sitede sayfa değiştiren kullanıcı için bu, her modülün ayrı bir
 * ürün gibi görünmesi demekti (kullanıcı dört ekran görüntüsüyle
 * bildirdi).
 *
 * Ölçü GALERİDEN alındı — kullanıcının referans olarak gösterdiği ekran:
 * sütun 0.62fr, metin sütunu en az 300px, panel `lg` üstünde sabit
 * 350px. Görselin boyunu içerik değil panel belirliyor; metin bu
 * yüksekliğe sığmak zorunda. Tersi denenmişti ve şu sonucu vermişti:
 * dokuz satırlık EXIF tablosu görseli iki katına uzatıyordu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ROZETLER GÖRSELİN ÜSTÜNDE DEĞİL, METİN SÜTUNUNDA
 *
 * Editöryel manşetlerde "Manşet"/"Öne çıkan" rozeti görselin sol üstüne
 * bindiriliyordu, galeride ise metin sütununun ilk satırındaydı. İkisi
 * bir arada olunca göz rozeti iki farklı yerde arıyor. Referans
 * galeri olduğu için rozet satırı metne alındı: aynı hizada etiket,
 * kategori ve tarih.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FİLM ŞERİDİ
 *
 * Çentikler kart ızgarasındaki `PlateFrame` ile aynı. Manşet kendi
 * düzenini kurduğu için `PlateFrame` kullanmıyor, çentikleri elle
 * taşıyor — öne çıkan kare de galerinin görsel diliyle konuşsun diye.
 */
export function FeaturedPanel({
  to,
  mediaLabel,
  media,
  badges,
  title,
  subtitle,
  children,
  footer,
  action,
  className,
}: {
  /** Görselin ve başlığın gittiği adres. */
  to: string;
  /** Görsel bağlantısının erişilebilir adı — "Manşet: <başlık>". */
  mediaLabel: string;
  /** `RemoteImage`, `PhotoPlaceholder` ya da yer tutucu. */
  media: ReactNode;
  /** İlk satır: etiket rozeti, kategori, tarih. */
  badges?: ReactNode;
  title: string;
  /** Başlığın altındaki tek satır — künye, hedef, konum. */
  subtitle?: ReactNode;
  /** Gövde: özet paragrafı, EXIF tablosu, ne gerekiyorsa. */
  children?: ReactNode;
  /** Sütunun altına yaslanan aksiyon ya da künye. */
  footer?: ReactNode;
  /** Yönetim aksiyonu — sağ üstte, bağlantının dışında. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'relative mb-5 overflow-hidden rounded-card border border-border bg-surface-1',
        className
      )}
    >
      {/*
        YÜKSEKLİK SABİT VE ORTAK — `lg` ve üstünde 350px.

        Ölçülen durum: aynı bileşenin altında bile paneller eşit
        değildi. Galeri manşeti 1440px'de 538px, haber/yazı/etkinlik
        291px'ti — çünkü yüksekliği metin sütununun içeriği belirliyordu
        ve galerinin EXIF tablosu diğerlerinin özet paragrafından uzun.
        Kullanıcı için bu, dört modülde dört farklı manşet demekti.

        Sabit yükseklik iki yönü birden kapatıyor: kısa içerik paneli
        küçültemiyor, uzun içerik büyütemiyor. Değer 350px, galerinin
        tam künyesinin (filtre tablosu + ekipman) sığdığı en küçük
        yükseklik; 1920px'de görselin oranı 1.6 çıkıyor, yani 16:9'a
        neredeyse eşit.

        `lg` altında ızgara tek sütuna iniyor; orada sabit yükseklik
        anlamsız olurdu, görsel oranını koruyor ve metin altına akıyor.
      */}
      <div className="grid gap-0 lg:h-[350px] lg:grid-cols-[minmax(0,0.62fr)_minmax(300px,1fr)]">
        <Link
          to={to}
          aria-label={mediaLabel}
          className="relative overflow-hidden bg-surface-2 lg:h-full"
        >
          {/* Oran yalnızca tek sütun düzeninde geçerli: `lg` üstünde
              yüksekliği satır veriyor. */}
          <div aria-hidden className={cn('w-full lg:hidden', CARD_RATIO.wide)} />
          <div className="absolute inset-0">{media}</div>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-background)_24%,transparent))]"
          />
          <span
            aria-hidden
            className="ticks-y pointer-events-none absolute inset-x-0 top-0 h-[5px]"
          />
          <span
            aria-hidden
            className="ticks-y pointer-events-none absolute inset-x-0 bottom-0 h-[5px]"
          />
        </Link>

        <div className="flex min-w-0 flex-col justify-center overflow-y-auto p-4 sm:p-5">
          {badges && (
            <div className="flex flex-wrap items-center gap-2">{badges}</div>
          )}

          <h2 className="type-section mt-3 text-foreground">
            <Link to={to} className="transition-colors hover:text-white">
              {title}
            </Link>
          </h2>

          {subtitle && (
            <p className="mt-1 text-body-sm text-muted-foreground">{subtitle}</p>
          )}

          {children}

          {footer && <div className="mt-4">{footer}</div>}
        </div>
      </div>

      {action && <div className="absolute right-3 top-3 z-10">{action}</div>}
    </section>
  );
}

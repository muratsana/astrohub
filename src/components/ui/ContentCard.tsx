import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PlateFrame } from '@/components/media/PlateFrame';
import { CARD_RATIO, type ContentCardRatio } from './cardRatios';
import { cn } from '@/lib/cn';

/**
 * ═════════════════════════════════════════════════════════════════════
 * İÇERİK KARTI — bütün modüllerin ortak kart ailesi (Faz 2.2)
 * ═════════════════════════════════════════════════════════════════════
 *
 * NEDEN AYRI BİR AİLE
 *
 * Sayım şunu gösterdi: aşağıdaki sınıf dizisi kaynakta ONDAN FAZLA yerde
 * BİREBİR tekrar ediyordu —
 *
 *   group flex h-full flex-col rounded-card border border-border
 *   bg-surface-1 transition-colors hover:border-border-strong
 *
 * İlan, hedef, ekipman, kulüp, gözlem noktası, ana sayfa şeritleri ve
 * keşif kartlarının her biri bu diziyi kendi dosyasına kopyalamıştı. Bu
 * bir tasarım sistemi değil, bir kopyala-yapıştır uzlaşısıdır: biri
 * hover rengini değiştirdiğinde diğer dokuzu geride kalır ve site
 * "farklı projelerden birleştirilmiş" görünür. Ana görev belgesi §5.2
 * tam olarak bunu yasaklıyor.
 *
 * Artık dizi TEK yerde: `CARD_ROOT`. Modüller onu içeri aktarmıyor bile —
 * `ContentCard` bileşenini kullanıyorlar.
 *
 * ─────────────────────────────────────────────────────────────────────
 * ÜÇ ORAN, ALTI DEĞİL
 *
 * Kart görselleri altı ayrı orandaydı ve hiçbirinin gerekçesi yoktu. Üçe
 * indi: `standard` (4:3, varsayılan), `square` (yalnız galeri), `wide`
 * (yalnız manşet). Gerekçeler ve emekliye ayrılan üç oran `cardRatios.ts`
 * içinde yazılı.
 *
 * ─────────────────────────────────────────────────────────────────────
 * SABİT ORAN BİR PERFORMANS KARARI DA
 *
 * Oran kutuyu görsel inmeden ÖNCE ayırır, yani görsel geldiğinde altındaki
 * içerik zıplamaz (CLS). Bu yüzden `ContentCardMedia` oranı zorunlu
 * tutuyor: oransız bir medya alanı sessizce düzen kayması üretir.
 *
 * ─────────────────────────────────────────────────────────────────────
 * KIRIK GÖRSEL VE BOŞ DURUM
 *
 * Medya her zaman `PlateFrame` içinden geçer ve içine konan `RemoteImage`
 * adres yoksa ya da yükleme düşerse yıldız alanına iner. Kart hiçbir
 * durumda tarayıcının kırık görsel ikonunu göstermez — o ikon kullanıcıya
 * "site bozuk" der, yer tutucu demez.
 */

/**
 * Kartın kök sınıfı. TEK KAYNAK — modüller bunu kopyalamaz.
 *
 * `h-full` + `flex-col`: ızgara hücresi gerildiğinde kart da gerilir ve
 * künye bloğu altta hizalı kalır. İkisi birlikte olmadan aynı satırdaki
 * kartlar farklı yükseklikte çıkar (bkz. `CardGrid`).
 *
 * `focus-visible:border-primary`: klavyeyle gezen kullanıcı hangi kartta
 * olduğunu görmeli. Genel focus halkası korunur, bu ona ek.
 */
const CARD_ROOT =
  'group rounded-card border border-border bg-surface-1 transition-colors ' +
  'hover:border-border-strong focus-visible:border-primary';

const CARD_GRID = 'flex h-full flex-col';
const CARD_LIST = 'flex h-full items-center gap-3 px-3 py-2.5';

export type ContentCardVariant = 'grid' | 'list';

/**
 * Kart kökü.
 *
 * `to` verilirse bağlantı, verilmezse `<div>`. Bağlantı olmayan kart da
 * aynı çerçeveyi kullanmalı — yoksa "tıklanmayan kart" görsel olarak
 * başka bir aileye düşer.
 */
export function ContentCard({
  to,
  variant = 'grid',
  children,
  className,
  ariaLabel,
}: {
  to?: string;
  variant?: ContentCardVariant;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const classes = cn(
    CARD_ROOT,
    variant === 'grid' ? CARD_GRID : CARD_LIST,
    className
  );

  if (to) {
    return (
      <Link to={to} aria-label={ariaLabel} className={classes}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}

/**
 * Kartın görsel alanı.
 *
 * `ratio` ZORUNLU değil ama varsayılanı `standard`; oransız çağrı yok.
 * Izgara varyantında görsel üstte tam genişlikte, liste varyantında solda
 * dar bir levha olur — ikisi de aynı `PlateFrame` çentiklerini taşır, yani
 * aynı aileye ait görünür.
 */
export function ContentCardMedia({
  ratio = 'standard',
  variant = 'grid',
  badge,
  flag,
  fieldOfView,
  children,
  className,
}: {
  ratio?: ContentCardRatio;
  variant?: ContentCardVariant;
  badge?: ReactNode;
  flag?: ReactNode;
  fieldOfView?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <PlateFrame
      ratio={CARD_RATIO[ratio]}
      badge={badge}
      flag={flag}
      fieldOfView={fieldOfView}
      className={cn(
        variant === 'grid'
          ? /* Üstte oturur: yalnızca alt kenarda çizgi kalır, kartın kendi
               kenarıyla çift çizgi oluşmaz. */
            'shrink-0 border-0 border-b border-border'
          : 'w-24 shrink-0 border-border sm:w-32',
        className
      )}
    >
      {children}
    </PlateFrame>
  );
}

/**
 * Künye gövdesi.
 *
 * `flex-1` + `flex-col`: içindeki `mt-auto` taşıyan son blok (fiyat,
 * aksiyon satırı) kartın altına yapışır ve kartlar arasında aynı hizada
 * durur.
 */
export function ContentCardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col px-2.5 py-2', className)}>
      {children}
    </div>
  );
}

/**
 * Kart başlığı.
 *
 * `lines` uzun başlığın kaç satırda kesileceğini söyler. Varsayılan tek
 * satır (`truncate`): kart yüksekliği başlık uzunluğuna göre değişmesin.
 * İki satıra izin verilen yerlerde `min-h-[2lh]` ile YER AYRILIR, yani
 * tek satırlık başlık taşıyan komşu kart kısalmaz.
 */
export function ContentCardTitle({
  children,
  lines = 1,
  className,
}: {
  children: ReactNode;
  lines?: 1 | 2;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'font-display text-body-sm font-bold leading-tight text-foreground',
        'transition-colors group-hover:text-primary',
        lines === 1 ? 'truncate' : 'line-clamp-2 min-h-[2lh]',
        className
      )}
    >
      {children}
    </p>
  );
}

/**
 * Künye satırı — tarih, konum, beğeni, yazar gibi ikincil veriler.
 *
 * `tone`: `cold` teknik ölçüm (pozlama, SQM, rakım), `muted` künye
 * (kullanıcı, tarih, şehir). İki renk tek başına anlam taşımaz; ayrımı
 * metin kurar (§6.7).
 */
export function ContentCardMeta({
  children,
  tone = 'muted',
  className,
}: {
  children: ReactNode;
  tone?: 'muted' | 'cold';
  className?: string;
}) {
  return (
    <p
      className={cn(
        'tabular truncate text-meta leading-snug',
        tone === 'cold' ? 'text-cold' : 'text-muted-foreground',
        className
      )}
    >
      {children}
    </p>
  );
}

/**
 * Aksiyon bölgesi — kartın alt şeridi.
 *
 * `mt-auto`: kart ne kadar uzarsa uzasın aksiyonlar altta kalır, yani aynı
 * satırdaki kartların düğmeleri aynı hizada olur.
 */
export function ContentCardActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mt-auto flex flex-wrap items-center gap-1.5 pt-2',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * ═════════════════════════════════════════════════════════════════════
 * YÜKLENİYOR İSKELETİ
 * ═════════════════════════════════════════════════════════════════════
 *
 * Denetimde sitedeki HİÇBİR kartın yükleme iskeleti yoktu: liste gelene
 * kadar ekran boştu, sonra içerik bir anda düşüyordu. Boş ekran
 * kullanıcıya "burada bir şey yok" der; iskelet "geliyor" der.
 *
 * İskelet kartın KENDİ sabitlerini kullanıyor (`CARD_ROOT`, `CARD_RATIO`),
 * yani kart değişince iskelet de değişir. Ayrı yazılsaydı ikisi ilk
 * değişiklikte ayrışırdı — iskeletin kart gibi görünmemesi, iskelet
 * olmamasından beterdir.
 *
 * `aria-hidden`: ekran okuyucu yer tutucu metni okumamalı. Yükleniyor
 * bilgisi listenin kendisinde `aria-busy` ile verilir.
 */
export function ContentCardSkeleton({
  ratio = 'standard',
  variant = 'grid',
  className,
}: {
  ratio?: ContentCardRatio;
  variant?: ContentCardVariant;
  className?: string;
}) {
  if (variant === 'list') {
    return (
      <div
        aria-hidden
        className={cn(CARD_ROOT, CARD_LIST, 'animate-pulse', className)}
      >
        <div className={cn('w-24 shrink-0 bg-surface-2 sm:w-32', CARD_RATIO[ratio])} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3 w-2/3 bg-surface-2" />
          <div className="h-2.5 w-1/3 bg-surface-2" />
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn(CARD_ROOT, CARD_GRID, 'animate-pulse', className)}
    >
      <div className={cn('shrink-0 border-b border-border bg-surface-2', CARD_RATIO[ratio])} />
      <div className="flex flex-1 flex-col gap-1.5 px-2.5 py-2">
        <div className="h-3 w-3/4 bg-surface-2" />
        <div className="h-2.5 w-1/2 bg-surface-2" />
        <div className="mt-auto h-2.5 w-2/5 bg-surface-2" />
      </div>
    </div>
  );
}

/**
 * İskelet ızgarası — liste yüklenirken `CardGrid` içine konur.
 *
 * `count` gerçek liste uzunluğuna yakın olmalı: üç iskelet gösterip yirmi
 * kart indirmek, sayfa boyunun bir anda üç katına çıkması demektir.
 */
export function ContentCardSkeletonGrid({
  count = 10,
  ratio = 'standard',
  variant = 'grid',
}: {
  count?: number;
  ratio?: ContentCardRatio;
  variant?: ContentCardVariant;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ContentCardSkeleton ratio={ratio} variant={variant} />
        </li>
      ))}
    </>
  );
}

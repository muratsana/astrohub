import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Badge } from './Badge';
import { CardGrid } from './CardGrid';
import {
  ContentCard,
  ContentCardMedia,
} from '@/components/ui/ContentCard';
import { RemoteImage } from '@/components/media/RemoteImage';
import { tintFromSeed } from '@/components/media/tints';
import type { ViewMode } from './useViewMode';

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

      {/*
        Izgara `CardGrid`'den geliyor, burada elle kurulmuyor. Önceden aynı
        kolon tanımı iki yerde yazılıydı (`CardGrid` içindeki `default`
        yoğunluğu ve buradaki satır içi sınıflar) — birbirinin kopyası iki
        liste, kaçınılmaz olarak ayrışır. Nitekim ayrışmıştı: satır
        yüksekliklerini eşitleyen `auto-rows-fr` yalnızca `CardGrid`'e
        eklenince haber/etkinlik/yazı sayfaları dışarıda kalıyordu.
      */}
      {rest.length > 0 && (
        <CardGrid view="grid">
          {rest.map((item) => (
            <li key={item.slug}>
              <EditorialCard item={item} />
            </li>
          ))}
        </CardGrid>
      )}
    </>
  );
}

function seedTint(item: EditorialItem): string {
  return item.tint ?? tintFromSeed(item.slug);
}

function LeadCard({ item, label }: { item: EditorialItem; label: string }) {
  return (
    <ContentCard
      to={item.to}
      className="mb-2.5 grid gap-3.5 p-2.5 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]"
    >
      {/* `wide` (16:9) kart ailesindeki üçüncü orandır ve YALNIZCA
          manşete aittir: sayfa başına bir tane, tam genişlik bir sütun
          kaplar, ızgara satır hizasını etkilemez. */}
      <ContentCardMedia
        ratio="wide"
        className="border border-border"
        badge={
          <span className="rounded-card border border-primary/50 bg-primary/15 px-1.5 py-0.5 text-meta tracking-[0.02em] text-primary backdrop-blur-sm">
            {label}
          </span>
        }
      >
        <RemoteImage
          src={item.imageUrl}
          alt={item.title}
          sizes="(min-width: 768px) 340px, 100vw"
          seed={item.slug}
          tint={seedTint(item)}
        />
      </ContentCardMedia>

      <div className="flex flex-col py-1 pr-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone="primary">{item.category}</Badge>
          {item.meta && (
            <span className="tabular text-meta text-faint">{item.meta}</span>
          )}
        </div>

        <h2 className="text-[18px] text-foreground transition-colors group-hover:text-primary sm:text-[21px]">
          {item.title}
        </h2>
        <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
          {item.summary}
        </p>

        {item.imageCredit && (
          <p className="mt-2 text-meta text-faint">
            Görsel: {item.imageCredit}
          </p>
        )}

        {item.footer && <div className="mt-auto pt-3">{item.footer}</div>}
      </div>
    </ContentCard>
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
    <ContentCard to={item.to} className="overflow-hidden">
      {/* Oran galeri karosuyla aynı (4:3, PlateFrame varsayılanı):
          site genelinde ızgara kartlarının tek bir ölçüsü var. Bir
          modülün 16:9 kalması, aynı sayfada iki farklı kart yüksekliği
          demekti. Üstteki geniş "öne çıkan" kart bunun dışında —
          o bir ızgara karosu değil, tam genişlik bir manşet. */}
      <ContentCardMedia className="rounded-none">
        <RemoteImage
          src={item.imageUrl}
          alt={item.title}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          seed={item.slug}
          tint={seedTint(item)}
        />
      </ContentCardMedia>

      <div className="flex flex-1 flex-col p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge>{item.category}</Badge>
          {item.meta && (
            <span className="tabular text-meta text-faint">{item.meta}</span>
          )}
        </div>

        {/*
          BAŞLIK SABİT İKİ SATIR. Önce hiç kısıtı yoktu: başlık uzunluğuna
          göre bir, iki ya da üç satıra taşıyordu ve kartın yüksekliğini
          içerik belirliyordu. Sonuç, aynı ızgarada aynı bileşenin üç sayfada
          üç ayrı yüksekliğe oturmasıydı — ölçtüm: yazılar 410px, haberler
          423px, etkinlikler 428px.

          `line-clamp-2` taşan başlığı kesiyor, `min-h` ise KISA başlıkta da
          iki satırlık yeri ayırıyor. İkincisi olmadan tek satırlık başlıklar
          kartı yine kısaltırdı; eşitliği sağlayan şey kesmek değil, yeri
          her durumda ayırmak.

          `lh` birimi satır yüksekliğinin kendisi — 13px ve `leading-snug`
          değişse de ayrılan yer başlığın gerçek iki satırı kadar kalır.
        */}
        <h2 className="line-clamp-2 min-h-[2lh] text-[13px] leading-snug text-foreground transition-colors group-hover:text-primary">
          {item.title}
        </h2>
        <p className="mt-1.5 line-clamp-3 min-h-[3lh] text-meta leading-relaxed text-muted-foreground">
          {item.summary}
        </p>

        {/*
          FOOTER YUVASI SABİT YÜKSEKLİKTE. İçine ne konduğu kartın boyunu
          değiştirmemeli: haberler künyeye düz bir metin satırı koyuyor,
          etkinlik ve yazılar `Badge` koyuyor. Badge kendi dolgusu ve
          kenarıyla metin satırından 5px yüksek — ölçtüm, haberler 423px'te
          kalırken diğerleri 428px'e çıkıyordu.

          21px bir Badge satırının tam yüksekliği: 10px metin × 1.5 satır
          yüksekliği (15) + dikey dolgu (2 × 2) + kenar (2 × 1). Yuvayı
          buna sabitleyince künye ister metin ister rozet olsun kart aynı
          boyda kalıyor.

          Pay İÇ sarmalayıcıda, `pt-3`'ü taşıyan dış sarmalayıcıda değil:
          dolguyla birlikte dış eleman zaten 21px'i aşıyor, dolayısıyla
          oraya konan `min-h` hiç devreye girmiyordu (ilk denemem buydu —
          haberler 423px'te kaldı).
        */}
        {item.footer && (
          <div className="mt-auto pt-3">
            <div className="flex min-h-[21px] items-center">{item.footer}</div>
          </div>
        )}
      </div>
    </ContentCard>
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
        <span className="mt-0.5 block truncate text-meta text-muted-foreground">
          {item.summary}
        </span>
      </span>

      <span className="hidden shrink-0 items-center gap-2 sm:flex">
        <Badge>{item.category}</Badge>
        {item.meta && (
          <span className="tabular w-[92px] shrink-0 text-right text-meta text-faint">
            {item.meta}
          </span>
        )}
      </span>
    </Link>
  );
}

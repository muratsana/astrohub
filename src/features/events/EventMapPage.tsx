import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useLocationContext } from '@/features/location/LocationContext';
import {
  sortByProximity,
  projectToBox,
  formatDistance,
} from '@/domain/geography/distance';
import { useEventCatalog } from '@/services/content/events';
import { eventTypeLabels, type EventType } from './types';
import type { AstroEvent } from './types';
import { cn } from '@/lib/cn';

/**
 * ETKİNLİK HARİTASI (§7.7 kısmi).
 *
 * NEDEN GERÇEK HARİTA DEĞİL
 * Tam ekran etkileşimli harita bir tile sağlayıcısı ister ve tile lisansı
 * (atıf, önbellek hakkı, istek limiti) kod yazmadan çözülmesi gereken bir
 * konudur (§14.4). Bu sayfa o gelene kadar boş bir "yakında" ekranı olarak
 * durmak yerine sorunun asıl cevabını veriyor: **yakınımda ne var.**
 *
 * Buradaki görsel bilinçli olarak *şematik*: coğrafi sınır çizilmez, ölçek
 * verilmez, "harita" denmez. Noktalar Türkiye'yi kapsayan bir kutuya
 * eşdikdörtgen izdüşümle yerleşir ve yalnızca dağılımı gösterir. Gerçek
 * mesafe her satırda km olarak yazılıdır — göz kararı ölçmeye gerek yok.
 *
 * Tile sağlayıcısı bağlandığında bu sayfa Leaflet'e geçer; yakınlık listesi
 * ve `sortByProximity` aynen kalır.
 */

const MAP_RATIO = 19.3 / 6.4; // sınır kutusunun boylam/enlem oranı

export function EventMapPage() {
  const { location } = useLocationContext();
  const [type, setType] = useState<EventType | 'hepsi'>('hepsi');
  const [active, setActive] = useState<string | null>(null);
  const catalog = useEventCatalog();

  const filtered = useMemo(
    () =>
      type === 'hepsi'
        ? catalog.items
        : catalog.items.filter((e) => e.type === type),
    [catalog.items, type]
  );

  const { located, unlocated } = useMemo(
    () => sortByProximity(filtered, location, (e: AstroEvent) => e.coords),
    [filtered, location]
  );

  const origin = projectToBox(location);

  return (
    <>
      <PageMeta
        title="Etkinlik Haritası"
        description="Türkiye'deki astronomi etkinliklerinin konum dağılımı ve size en yakın etkinlikler — mesafeye göre sıralı."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Etkinlikler', path: '/etkinlikler' },
          { name: 'Harita', path: '/etkinlikler/harita' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Etkinlikler', to: '/etkinlikler' },
            { label: 'Harita' },
          ]}
          title="Etkinlik Haritası"
          description="Etkinlikler konumlarına göre dağıtıldı ve size olan kuş uçuşu mesafeye göre sıralandı. Referans noktası üst çubuktaki konumunuz."
          meta={location.label}
          actions={
            <ButtonLink to="/etkinlikler" size="sm" variant="secondary">
              Takvim Görünümü
            </ButtonLink>
          }
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="tabular label" role="status">
            {located.length} konumlu · {unlocated.length} çevrimiçi
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="map-type" className="sr-only">
              Tür
            </label>
            <Select
              id="map-type"
              value={type}
              onChange={(e) => setType(e.target.value as EventType | 'hepsi')}
              className="h-8 w-auto text-[11px]"
            >
              <option value="hepsi">Tüm türler</option>
              {Object.entries(eventTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          {/* ───────── Şematik dağılım ───────── */}
          <Panel
            title="Konum dağılımı"
            status="şematik — coğrafi ölçek değil"
            bodyClassName="p-3"
          >
            <div
              className="relative w-full overflow-hidden rounded-card border border-border bg-surface-2"
              style={{ aspectRatio: String(MAP_RATIO) }}
            >
              {/* Izgara çizgileri — konumu okumayı kolaylaştıran referans */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
                  backgroundSize: '12.5% 25%',
                }}
              />

              {/* Kullanıcının konumu */}
              <span
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${origin.x * 100}%`, top: `${origin.y * 100}%` }}
                title={`Konumunuz: ${location.label}`}
              >
                <span className="block h-2.5 w-2.5 rounded-full border-2 border-cold bg-background" />
                <span className="sr-only">Konumunuz: {location.label}</span>
              </span>

              {located.map(({ item, distanceKm }) => {
                const pos = projectToBox(item.coords!);
                const isActive = active === item.slug;

                return (
                  <button
                    key={item.slug}
                    type="button"
                    onMouseEnter={() => setActive(item.slug)}
                    onFocus={() => setActive(item.slug)}
                    onMouseLeave={() => setActive(null)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(item.slug)}
                    aria-label={`${item.title}, ${item.city}, ${formatDistance(distanceKm)} uzaklıkta`}
                    className={cn(
                      'absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all',
                      isActive
                        ? 'z-20 h-3.5 w-3.5 bg-primary ring-2 ring-primary/40'
                        : 'h-2.5 w-2.5 bg-primary/70 hover:bg-primary'
                    )}
                    style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
                  />
                );
              })}

              {/* Etkin nokta künyesi */}
              {active && (
                <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-card border border-border bg-surface-1/95 px-2.5 py-1.5">
                  {(() => {
                    const hit = located.find((l) => l.item.slug === active);
                    if (!hit) return null;
                    return (
                      <p className="truncate text-[11.5px] text-foreground">
                        <span className="font-medium">{hit.item.title}</span>
                        <span className="ml-2 text-muted-foreground">
                          {hit.item.city} · {formatDistance(hit.distanceKm)}
                        </span>
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>

            <p className="mt-2 text-[10px] leading-snug text-faint">
              Noktalar enlem/boylamlarına göre yerleştirilmiştir; sınır ve ölçek
              çizilmez. Etkileşimli harita, tile sağlayıcısı lisansı
              netleştiğinde bu sayfaya gelecek (§14.4).
            </p>
          </Panel>

          {/* ───────── Yakınlık listesi ───────── */}
          <div className="space-y-4">
            <Panel title="Size en yakın" status={location.label}>
              {located.length === 0 ? (
                <EmptyState
                  message="Bu türde konumlu etkinlik yok"
                  hint="Tür filtresini genişletin ya da çevrimiçi etkinliklere bakın."
                  className="border-0 py-8"
                />
              ) : (
                <ul>
                  {located.map(({ item, distanceKm }) => (
                    <li key={item.slug} className="border-b border-border last:border-0">
                      <Link
                        to={`/etkinlik/${item.slug}`}
                        onMouseEnter={() => setActive(item.slug)}
                        onMouseLeave={() => setActive(null)}
                        className={cn(
                          'flex items-baseline justify-between gap-3 py-2 transition-colors',
                          active === item.slug ? 'text-primary' : 'hover:text-primary'
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] text-foreground">
                            {item.title}
                          </span>
                          <span className="tabular mt-0.5 block text-[10.5px] text-muted-foreground">
                            {item.city} ·{' '}
                            {new Date(item.startsAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                            })}
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-[11.5px] text-cold">
                          {formatDistance(distanceKm)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {unlocated.length > 0 && (
              <Panel title="Çevrimiçi" status={`${unlocated.length}`}>
                <ul>
                  {unlocated.map((item) => (
                    <li key={item.slug} className="border-b border-border last:border-0">
                      <Link
                        to={`/etkinlik/${item.slug}`}
                        className="flex items-baseline justify-between gap-3 py-2 transition-colors hover:text-primary"
                      >
                        <span className="min-w-0 truncate text-[12.5px] text-foreground">
                          {item.title}
                        </span>
                        <Badge tone="cold">Çevrimiçi</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

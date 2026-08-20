import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExternalButtonLink } from '@/components/ui/Button';
import { PageMeta } from '@/components/seo/PageMeta';
import { Panel } from '@/components/ui/Panel';
import { SpecList, SpecRow } from '@/components/ui/Panel';
import { RemoteImage } from '@/components/media/RemoteImage';
import { fetchAllskyCameras } from '@/services/content/allsky';
import type { AllskyCamera } from './data';

function withRefreshToken(camera: AllskyCamera, now: number): string {
  const seconds = Math.max(5, camera.refreshSeconds);
  const bucket = Math.floor(now / (seconds * 1000));
  const separator = camera.imageUrl.includes('?') ? '&' : '?';
  return `${camera.imageUrl}${separator}astrohub=${bucket}`;
}

export function AllskyPage() {
  const [cameras, setCameras] = useState<AllskyCamera[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    fetchAllskyCameras()
      .then((items) => {
        if (!alive) return;
        setCameras(items);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setCameras([]);
        setError(
          err instanceof Error ? err.message : 'Allsky kayıtları alınamadı'
        );
      });
    return () => {
      alive = false;
    };
  }, []);

  const intervalMs = useMemo(() => {
    const minSeconds = Math.min(
      ...(cameras ?? []).map((camera) => Math.max(5, camera.refreshSeconds))
    );
    return Number.isFinite(minSeconds) ? minSeconds * 1000 : 15_000;
  }, [cameras]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return (
    <>
      <PageMeta
        title="ALLSKY"
        description="Astrohub Allsky kamera yayınları."
      />
      <Container className="py-8">
        <header className="mb-5 border-b border-border pb-5">
          <p className="label text-primary">Canlı gökyüzü</p>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="type-page-sm text-foreground">ALLSKY</h1>
              <p className="mt-2 max-w-2xl text-body-sm leading-relaxed text-muted-foreground">
                Gözlemevlerinden gelen güncel all-sky kamera görüntüleri.
              </p>
            </div>
            <Badge tone="cold">
              {cameras ? `${cameras.length} kamera` : 'yükleniyor'}
            </Badge>
          </div>
        </header>

        {error ? (
          <p
            className="mb-4 rounded-card border border-warning/40 bg-surface-1 px-3 py-2 text-body-sm text-warning"
            role="status"
          >
            {error}
          </p>
        ) : null}

        {!cameras ? (
          <p className="py-12 text-center text-meta text-muted-foreground">
            Kameralar yükleniyor…
          </p>
        ) : cameras.length === 0 ? (
          <EmptyState
            message="Yayında Allsky kamerası yok"
            hint="Admin panelinden ilk kamera kaydı eklenebilir."
          />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {cameras.map((camera) => (
              <li key={camera.id}>
                <Panel
                  title={camera.title}
                  status={`${Math.max(5, camera.refreshSeconds)} sn`}
                  bodyClassName="p-0"
                >
                  <div className="aspect-video overflow-hidden border-b border-border bg-background">
                    <RemoteImage
                      src={withRefreshToken(camera, now)}
                      alt={`${camera.title} canlı allsky görüntüsü`}
                      seed={camera.slug}
                      tint="80,160,210"
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-contain"
                    />
                  </div>
                  <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_12rem]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        {camera.location ? (
                          <Badge tone="primary">{camera.location}</Badge>
                        ) : null}
                        {camera.owner ? <Badge>{camera.owner}</Badge> : null}
                      </div>
                      {camera.notes ? (
                        <p className="mt-3 text-body-sm leading-relaxed text-muted-foreground">
                          {camera.notes}
                        </p>
                      ) : null}
                    </div>
                    <SpecList>
                      <SpecRow
                        label="Kamera"
                        value={camera.camera || '—'}
                        tone="cold"
                      />
                      <SpecRow label="Lens" value={camera.lens || '—'} />
                      <SpecRow
                        label="Kaynak"
                        value={
                          <ExternalButtonLink
                            href={camera.pageUrl}
                            size="sm"
                            variant="secondary"
                          >
                            Aç
                          </ExternalButtonLink>
                        }
                      />
                    </SpecList>
                  </div>
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}

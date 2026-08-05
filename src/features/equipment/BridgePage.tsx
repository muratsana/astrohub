import { useCallback, useEffect, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import {
  DEFAULT_BRIDGE_URL,
  connectMountBridge,
  disconnectMountBridge,
  fetchMountBridgeDrivers,
  fetchMountBridgeStatus,
  type MountBridgeStatus,
} from '@/features/simulator/bridge';

/**
 * MOUNT BRIDGE — ASCOM montür ve capture bağlantısı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN SİMÜLATÖRDEN AYRILDI
 *
 * Bu ekran Simülatör sayfasının içindeydi ve orada iki şeyi birden
 * bozuyordu. Birincisi: sayfa açılır açılmaz üstte "Bridge bekleniyor"
 * ve "Capture bekleniyor" rozetleri duruyordu — kullanıcı hiçbir şey
 * yapmadan, çoğunluğu Windows'ta bir köprü kurmamış ziyaretçiye iki
 * uyarı gösteriliyordu. İkincisi: kadraj hesabı yapmaya gelen kişi
 * ekranın üçte birini hiç kullanmayacağı bir bağlantı paneline
 * veriyordu.
 *
 * Burası ileri seviye ve donanım gerektiren bir alan; ana akıştan çıkıp
 * Ekipman modülünün altına indi. Kadraj hesabı artık yalnızca kadrajla
 * ilgileniyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TARAYICI YEREL AĞA KONUŞUYOR
 *
 * Köprü kullanıcının kendi bilgisayarında çalışıyor (`tools/mount-bridge`)
 * ve istekler `127.0.0.1`e gidiyor — CSP'de `connect-src` bu adrese
 * bilerek açık. Sunucumuz bu trafiği hiç görmüyor.
 */
export function BridgePage() {
  const [bridgeUrl, setBridgeUrl] = useState(DEFAULT_BRIDGE_URL);
  const [driverId, setDriverId] = useState('ASCOM.Simulator.Telescope');
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [driversError, setDriversError] = useState('');
  const [status, setStatus] = useState<MountBridgeStatus | null>(null);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [polling, setPolling] = useState(false);

  const capture = status?.capture ?? null;
  const totalFrames = capture?.totalFrames ?? 0;
  const completedFrames = capture?.completedFrames ?? 0;
  const captureProgress =
    totalFrames > 0 ? Math.round((completedFrames / totalFrames) * 100) : 0;

  const refreshBridge = useCallback(async () => {
    setStatus(await fetchMountBridgeStatus(bridgeUrl));
  }, [bridgeUrl]);

  const loadDrivers = useCallback(async () => {
    setBridgeBusy(true);
    try {
      const result = await fetchMountBridgeDrivers(bridgeUrl);
      setDrivers(result.drivers);
      setDriversError(result.error ?? '');
      if (!result.error && result.drivers.length > 0) {
        setDriverId((current) =>
          result.drivers.some((driver) => driver.id === current)
            ? current
            : result.drivers[0].id
        );
      }
    } finally {
      setBridgeBusy(false);
    }
  }, [bridgeUrl]);

  async function connectBridge() {
    setBridgeBusy(true);
    try {
      setStatus(await connectMountBridge(bridgeUrl, driverId.trim()));
      setPolling(true);
    } finally {
      setBridgeBusy(false);
    }
  }

  async function disconnectBridge() {
    setBridgeBusy(true);
    try {
      setStatus(await disconnectMountBridge(bridgeUrl));
      setPolling(false);
    } finally {
      setBridgeBusy(false);
    }
  }

  /* Canlı izleme yalnızca kullanıcı açtığında: iki saniyede bir istek
     atan bir sayfa, köprü kurmamış ziyaretçide sonsuza kadar hata
     üretirdi. */
  useEffect(() => {
    if (!polling) return;
    refreshBridge();
    const timer = window.setInterval(refreshBridge, 2000);
    return () => window.clearInterval(timer);
  }, [polling, refreshBridge]);

  return (
    <>
      <PageMeta
        title="Mount Bridge"
        description="ASCOM montür bağlantısı ve capture akışı — kendi bilgisayarınızda çalışan köprü üzerinden canlı montür ve sequence verisi."
        noIndex
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Ekipman', path: '/ekipman' },
          { name: 'Mount Bridge', path: '/ekipman/bridge' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Ekipman', to: '/ekipman' },
            { label: 'Mount Bridge' },
          ]}
          title="Mount Bridge"
          description="Kendi bilgisayarınızda çalışan köprü üzerinden ASCOM montürünüzü ve çekim uygulamanızı bu sayfaya bağlayın. Kurulum paketi depoda: tools/mount-bridge."
          actions={
            <ButtonLink to="/araclar/kadraj" size="sm" variant="secondary">
              Kadraj hesabı
            </ButtonLink>
          }
        />

        <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Mount Bridge"
          status={status?.connected ? 'bağlı' : status?.ok ? 'açık' : 'kapalı'}
        >
          <div className="space-y-3">
            <Field label="Bridge adresi" htmlFor="bridge-url">
              <Input
                id="bridge-url"
                value={bridgeUrl}
                onChange={(event) => setBridgeUrl(event.target.value)}
                spellCheck={false}
              />
            </Field>
            <Field label="ASCOM DriverId" htmlFor="bridge-driver">
              <Input
                id="bridge-driver"
                value={driverId}
                onChange={(event) => setDriverId(event.target.value)}
                spellCheck={false}
              />
            </Field>
            {drivers.length > 0 && (
              <Field label="Bulunan ASCOM sürücüleri" htmlFor="bridge-driver-select">
                <Select
                  id="bridge-driver-select"
                  value={driverId}
                  onChange={(event) => setDriverId(event.target.value)}
                >
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} · {driver.id}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={connectBridge} disabled={bridgeBusy || !driverId.trim()}>
                Bağlan
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={disconnectBridge} disabled={bridgeBusy}>
                Kes
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={loadDrivers} disabled={bridgeBusy}>
                Sürücüleri tara
              </Button>
              <Button type="button" size="sm" variant={polling ? 'secondary' : 'primary'} onClick={() => setPolling((value) => !value)}>
                {polling ? 'Durdur' : 'Canlı izle'}
              </Button>
            </div>
            {driversError && (
              <p className="text-meta leading-relaxed text-warning">
                {driversError}. Windows’ta ASCOM Platform ve bridge çalışıyor olmalı.
              </p>
            )}
            {status?.error && (
              <p className="text-meta leading-relaxed text-warning">
                {status.error}. Windows’ta bridge’i başlatın: tools/mount-bridge.
              </p>
            )}
            <SpecList>
              <SpecRow label="Sürücü" value={status?.driverId ?? '—'} />
              <SpecRow label="Model" value={status?.name ?? '—'} />
              <SpecRow label="Takip" value={yesNo(status?.tracking)} />
              <SpecRow label="Slew" value={yesNo(status?.slewing)} />
              <SpecRow label="Alt / Az" value={`${formatDeg(status?.altitudeDeg)} / ${formatDeg(status?.azimuthDeg)}`} />
              <SpecRow label="Konum" value={`${formatDeg(status?.siteLatitudeDeg)} / ${formatDeg(status?.siteLongitudeDeg)}`} />
            </SpecList>
          </div>
        </Panel>

        <Panel title="Capture akışı" status={capture?.state ?? 'bekliyor'}>
          {capture ? (
            <div className="space-y-3">
              <SpecList>
                <SpecRow label="Uygulama" value={capture.app ?? '—'} />
                <SpecRow label="Sequence" value={capture.sequenceName ?? '—'} />
                <SpecRow label="Hedef" value={capture.target ?? '—'} />
                <SpecRow label="Filtre" value={capture.filter ?? '—'} />
                <SpecRow label="Guiding RMS" value={capture.rmsArcsec === undefined ? '—' : `${capture.rmsArcsec.toFixed(2)}″`} />
              </SpecList>
              {/* İlerleme şeridi: iki satırlık bir çubuk için ortak
                  bileşen eklemek doğru değil, kutu burada duruyor. */}
              <div className="h-1.5 overflow-hidden rounded-card bg-surface-3">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${captureProgress}%` }}
                />
              </div>
              <p className="tabular text-meta text-muted-foreground">
                {completedFrames}/{totalFrames || '—'} kare · kalan {capture.remainingFrames ?? '—'}
              </p>
            </div>
          ) : (
            <p className="text-meta leading-relaxed text-muted-foreground">
              PHD2, SGP, TheSkyX, NINA veya ZWO AIR verisi bridge JSON alanına
              geldiğinde sequence ve guiding bilgileri burada canlı görünür.
            </p>
          )}
        </Panel>

        </div>
      </Container>
    </>
  );
}

function yesNo(value?: boolean) {
  return value === undefined ? '—' : value ? 'evet' : 'hayır';
}

function formatDeg(value?: number) {
  return value === undefined || value === null ? '—' : `${value.toFixed(2)}°`;
}

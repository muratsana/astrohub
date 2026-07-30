import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { checkSetup } from '@/domain/equipment/compatibility';
import type { CheckSeverity } from '@/domain/equipment/compatibility';
import { getSetup, decodeSetup, encodeSetup, deleteSetup } from './storage';
import { fetchSharedSetup, isUuid } from './remote';
import { SharedSetupView } from './SharedSetupView';
import { getSetup as getSavedSetup, type SavedSetup } from './store';
import { cn } from '@/lib/cn';

/**
 * SETUP DETAYI (§7.12) — üç kaynak, tek adres.
 *
 *   1. **Veritabanı** (`/setup/<uuid>`) — ekipman modülünde kurulmuş,
 *      hesaba kayıtlı setup. Başkasının tarayıcısında da açılır;
 *      görünürlüğü RLS uyguluyor.
 *   2. **Yerel depo** — aynı kayıt henüz eşitlenmemişse ya da kullanıcı
 *      oturum açmadan kurmuşsa. Çevrimdışı da çalışır.
 *   3. **Bağlantıdaki kodlanmış yük** (`?d=…`) — eski uyumluluk aracının
 *      paylaşım biçimi. Dolaşımdaki bağlantılar kırılmasın diye duruyor.
 *
 * Sıra önemli: veritabanı kaydı katalogdan taze çözülüyor, kodlanmış yük
 * ise kurulduğu andaki sayıları taşıyor. İkisi çakışırsa güncel olan
 * kazanmalı.
 */

const severityLabel: Record<CheckSeverity, string> = {
  ok: 'Uygun',
  warning: 'Ödün var',
  error: 'Kurulamaz',
};

export function SetupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const [deleted, setDeleted] = useState(false);
  const [copied, setCopied] = useState(false);

  /*
   * Yeni model (v2) önce yerelden okunuyor — varsa ekran anında doluyor.
   * Aynı anda veritabanı sorgusu gidiyor: kayıt başka bir cihazda
   * kurulmuş ya da başkasının paylaştığı bir bağlantı olabilir.
   */
  const [saved, setSaved] = useState<SavedSetup | undefined>(() =>
    id ? getSavedSetup(id) : undefined
  );

  useEffect(() => {
    if (!id || !isUuid(id) || deleted) return;
    let active = true;
    void fetchSharedSetup(id).then((row) => {
      if (active && row) setSaved(row);
    });
    return () => {
      active = false;
    };
  }, [id, deleted]);

  const shared = useMemo(() => decodeSetup(params.get('d')), [params]);
  const stored = useMemo(
    () => (id && !deleted ? getSetup(id) : undefined),
    [id, deleted]
  );

  const setup = stored ?? shared;
  const report = useMemo(
    () => (setup ? checkSetup(setup.input) : null),
    [setup]
  );

  /* v2 kaydı varsa yeni motorla çizilen görünüm kazanıyor: değerleri
     katalogdan taze çözüyor, kodlanmış yük ise kurulduğu andaki
     sayılarla donmuş durumda.

     Dallanma bütün kancalardan SONRA: erken dönüş kanca sırasını
     bozuyordu ve React aynı bileşende iki farklı sırayla kanca çağrısı
     kabul etmiyor. */
  if (saved && !deleted) return <SharedSetupView setup={saved} />;

  if (!setup || !report) {
    return (
      <>
        <PageMeta title="Setup bulunamadı" noIndex />
        <Container className="py-8 sm:py-10">
          <PageHeader
            breadcrumb={[
              { label: 'Ana Sayfa', to: '/' },
              { label: 'Setup' },
            ]}
            title="Setup bulunamadı"
          />
          <EmptyState
            message="Bu setup bu cihazda kayıtlı değil"
            hint="Setup'lar hesap sistemi gelene kadar tarayıcınızda saklanıyor. Başkasının paylaştığı bir bağlantıysa, bağlantının kodlanmış setup verisini (?d=…) içermesi gerekir."
            action={
              <ButtonLink to="/araclar/setup-uyumluluk" size="sm">
                Yeni Setup Kur
              </ButtonLink>
            }
          />
        </Container>
      </>
    );
  }

  const shareUrl = `${window.location.origin}${window.location.pathname}${
    window.location.hash ? window.location.hash.split('?')[0] : ''
  }?d=${encodeSetup({ name: setup.name, input: setup.input })}`;

  return (
    <>
      <PageMeta
        title={`${setup.name} — Setup`}
        description={`${setup.input.optic.name} + ${setup.input.camera.name} kombinasyonunun uyumluluk raporu: yük, backfocus, örnekleme ve guide kontrolü.`}
        noIndex
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Araçlar', to: '/araclar' },
            { label: setup.name },
          ]}
          title={setup.name}
          meta={stored ? 'bu cihazda kayıtlı' : 'bağlantıdan açıldı'}
          description={`${setup.input.optic.name} · ${setup.input.camera.name} · ${setup.input.mount.name}`}
          actions={
            <>
              <Badge
                tone={
                  report.verdict === 'ok'
                    ? 'success'
                    : report.verdict === 'warning'
                      ? 'warning'
                      : 'danger'
                }
              >
                {severityLabel[report.verdict]}
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(shareUrl).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
              >
                {copied ? 'Kopyalandı' : 'Bağlantıyı Kopyala'}
              </Button>
              {stored && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    deleteSetup(stored.id);
                    setDeleted(true);
                  }}
                >
                  Sil
                </Button>
              )}
            </>
          }
        />

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout
            label="Toplam yük"
            value={report.totalWeightKg.toFixed(1)}
            unit="kg"
            hint={`pay ${report.usablePayloadKg.toFixed(1)} kg`}
            tone={
              report.totalWeightKg > report.usablePayloadKg ? 'primary' : 'plain'
            }
          />
          <Readout
            label="Optik yol"
            value={report.achievedBackfocusMm.toFixed(1)}
            unit="mm"
            hint={`hedef ${setup.input.optic.requiredBackfocusMm} mm`}
            tone="cold"
          />
          <Readout
            label="Piksel ölçeği"
            value={report.optics.pixelScale.toFixed(2)}
            unit="″/px"
          />
          <Readout
            label="Görüş alanı"
            value={`${report.optics.fov.widthDeg.toFixed(2)}°`}
            unit={`× ${report.optics.fov.heightDeg.toFixed(2)}°`}
            tone="plain"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Panel title="Kontroller" status={`${report.checks.length} başlık`}>
            <ul>
              {report.checks.map((check) => (
                <li
                  key={check.id}
                  className="border-b border-border py-2.5 first:pt-0 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          'inline-block h-1.5 w-1.5 rounded-full',
                          check.severity === 'ok'
                            ? 'bg-success'
                            : check.severity === 'warning'
                              ? 'bg-warning'
                              : 'bg-danger'
                        )}
                      />
                      <span className="text-[12.5px] font-medium text-foreground">
                        {check.title}
                      </span>
                      <span className="sr-only">
                        {severityLabel[check.severity]}
                      </span>
                    </span>
                    <span className="tabular text-body-sm text-muted-foreground">
                      {check.value}
                    </span>
                  </div>
                  <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">
                    {check.detail}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="space-y-4">
            <Panel title="Zincir">
              <SpecList>
                <SpecRow label="Montür" value={setup.input.mount.name} />
                <SpecRow
                  label="Yük kapasitesi"
                  value={`${setup.input.mount.payloadCapacityKg} kg`}
                  tone="muted"
                />
                <SpecRow label="Optik" value={setup.input.optic.name} />
                <SpecRow
                  label="Odak / açıklık"
                  value={`${setup.input.optic.focalLength} mm · f/${(
                    setup.input.optic.focalLength / setup.input.optic.aperture
                  ).toFixed(1)}`}
                  tone="cold"
                />
                <SpecRow label="Kamera" value={setup.input.camera.name} />
                <SpecRow
                  label="Piksel / sensör"
                  value={`${setup.input.camera.pixelSize} µm · ${setup.input.camera.sensorWidth}×${setup.input.camera.sensorHeight} mm`}
                  tone="cold"
                />
                <SpecRow
                  label="Ara halka"
                  value={`${setup.input.spacerMm} mm`}
                  tone="muted"
                />
                <SpecRow
                  label="Filtre"
                  value={
                    setup.input.filterThicknessMm > 0
                      ? `${setup.input.filterThicknessMm} mm`
                      : 'yok'
                  }
                  tone="muted"
                />
                <SpecRow
                  label="Guide"
                  value={setup.input.guide?.name ?? 'yok'}
                  tone="muted"
                />
                <SpecRow
                  label="Saha seeing"
                  value={`${setup.input.seeingArcsec}″`}
                  tone="muted"
                />
              </SpecList>
            </Panel>

            <Panel title="Paylaşım">
              <p className="text-body-sm leading-relaxed text-muted-foreground">
                Bağlantı, setup değerlerini kendi içinde taşır — karşı tarafta
                kayıt olmasa da açılır. Kodlama şifreleme değildir; içinde
                yalnızca ekipman değerleri vardır.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ButtonLink
                  to="/araclar/setup-uyumluluk"
                  size="sm"
                  variant="secondary"
                >
                  Düzenle
                </ButtonLink>
                <ButtonLink to="/panel/setuplar" size="sm" variant="ghost">
                  Kayıtlı setup'lar
                </ButtonLink>
              </div>
            </Panel>
          </div>
        </div>

        {deleted && (
          <p className="mt-4 text-center text-[12px] text-muted-foreground">
            Setup silindi.{' '}
            <Link to="/araclar/setup-uyumluluk" className="text-primary">
              Yeni bir tane kurabilirsiniz.
            </Link>
          </p>
        )}
      </Container>
    </>
  );
}

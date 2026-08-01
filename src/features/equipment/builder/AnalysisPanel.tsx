import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import {
  CHECK_STATUS_LABELS,
  SEVERITY_LABELS,
  type CheckStatus,
  type Computation,
  type SetupCheck,
  type SetupReport,
} from '@/domain/setup/types';
import type { BackfocusSegment } from '@/domain/setup/engine';
import { cn } from '@/lib/cn';

/**
 * CANLI ANALİZ PANELİ.
 *
 * Sonuçlar tablo yerine kompakt metrik kartları ve katlanabilir kontrol
 * satırları olarak gösteriliyor: on satırlık bir tablo hem telefonda
 * taşıyor hem de "hangisi önemli" sorusunu cevapsız bırakıyordu.
 *
 * Her kontrolün ayrıntısı KAPALI başlıyor. Açıldığında formül, girdiler
 * ve kullanılan kabuller görünüyor — bir uyarıya güvenmek için kullanıcının
 * bizim aritmetiğimizi kabul etmesi gerekmiyor.
 */

const STATUS_TONE: Record<CheckStatus, 'success' | 'warning' | 'danger' | 'muted' | 'primary'> = {
  uyumlu: 'success',
  dikkat: 'warning',
  'adaptor-gerekli': 'primary',
  onerilmez: 'danger',
  uyumsuz: 'danger',
  'veri-yok': 'muted',
};

export function VerdictBadge({ status }: { status: CheckStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{CHECK_STATUS_LABELS[status]}</Badge>;
}

/** Tek metrik: değer + birim, hesaplanamadıysa açık bir "veri yok". */
export function Metric({
  label,
  computation,
  digits = 2,
  hint,
}: {
  label: string;
  computation: Computation;
  digits?: number;
  hint?: string;
}) {
  const value =
    computation.value === null
      ? null
      : String(Math.round(computation.value * 10 ** digits) / 10 ** digits);

  return (
    <div className="rounded-card border border-border bg-surface-1 px-2.5 py-2">
      <p className="label text-meta">{label}</p>
      {value === null ? (
        <p className="text-meta text-faint" title={computation.assumptions[0]}>
          veri yok
        </p>
      ) : (
        <p className="tabular text-body-sm leading-tight text-foreground">
          {value}
          <span className="ml-0.5 text-meta text-muted-foreground">
            {computation.unit}
          </span>
        </p>
      )}
      {(hint || computation.confidence === 'varsayim') && (
        <p className="mt-0.5 text-meta leading-snug text-faint">
          {hint ?? 'varsayım içeriyor'}
        </p>
      )}
    </div>
  );
}

function ComputationDetail({ computation }: { computation: Computation }) {
  return (
    <div className="mt-2 rounded-card border border-border bg-surface-2/70 p-2.5">
      <p className="label mb-1 text-meta">Formül</p>
      <p className="tabular text-meta leading-relaxed text-foreground">
        {computation.formula}
      </p>

      {computation.inputs.length > 0 && (
        <>
          <p className="label mb-1 mt-2 text-meta">Kullanılan değerler</p>
          <ul>
            {computation.inputs.map((input, i) => (
              <li
                key={`${input.label}-${i}`}
                className="flex flex-wrap items-baseline justify-between gap-x-2 border-b border-border py-1 last:border-0"
              >
                <span className="text-meta text-muted-foreground">
                  {input.label}
                </span>
                <span className="tabular text-meta text-foreground">
                  {input.value}
                </span>
                {input.source && (
                  <span className="w-full text-meta text-faint">
                    {input.source}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {computation.assumptions.length > 0 && (
        <>
          <p className="label mb-1 mt-2 text-meta">Kabuller</p>
          <ul className="space-y-0.5">
            {computation.assumptions.map((a) => (
              <li key={a} className="text-meta leading-snug text-warning">
                {a}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: SetupCheck }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="border-b border-border py-2 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 text-left"
      >
        <span className="mt-0.5 shrink-0">
          <VerdictBadge status={check.status} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-caption font-medium text-foreground">
              {check.title}
            </span>
            <span className="tabular text-meta text-cold">{check.headline}</span>
          </span>
          <span className="mt-0.5 block text-meta leading-relaxed text-muted-foreground">
            {check.explanation}
          </span>
        </span>
        <span
          className={cn(
            'mt-1 shrink-0 text-meta text-faint transition-transform',
            open && 'rotate-180'
          )}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="pl-1">
          {check.expected && (
            <p className="mt-1.5 text-meta text-muted-foreground">
              <span className="label mr-1 text-meta">Beklenen</span>
              {check.expected}
            </p>
          )}
          {check.advice && (
            <p className="mt-1 rounded-card border border-primary/30 bg-surface-2 px-2 py-1.5 text-meta leading-relaxed text-foreground">
              {check.advice}
            </p>
          )}
          <p className="mt-1 text-meta text-faint">
            Önem: {SEVERITY_LABELS[check.severity]}
          </p>
          {check.computation && <ComputationDetail computation={check.computation} />}
        </div>
      )}
    </li>
  );
}

/** Backfocus zincirinin parça parça görünümü. */
export function BackfocusChainView({
  segments,
  requiredMm,
}: {
  segments: BackfocusSegment[];
  requiredMm: number | null;
}) {
  if (segments.length === 0) {
    return (
      <p className="py-2 text-body-sm text-muted-foreground">
        Zincir henüz kurulmadı. Kamera ve düzeltici seçildiğinde optik yol
        burada parça parça çizilir.
      </p>
    );
  }

  const total = segments.reduce((sum, s) => sum + (s.lengthMm ?? 0), 0);

  return (
    <div>
      <ul className="space-y-1">
        {segments.map((s, i) => (
          <li key={`${s.slot}-${i}`} className="flex items-center gap-2">
            <span
              className={cn(
                'h-4 rounded-sm',
                s.missing ? 'bg-surface-3' : 'bg-primary/70'
              )}
              style={{
                width: `${Math.max(6, ((s.lengthMm ?? 2) / Math.max(total, 1)) * 100)}%`,
              }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-meta text-muted-foreground">
              {s.label}
            </span>
            <span className="tabular shrink-0 text-meta text-foreground">
              {s.missing ? (
                <span className="text-faint">veri yok</span>
              ) : (
                `${Math.round((s.lengthMm ?? 0) * 100) / 100} mm`
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-border pt-1.5">
        <span className="label text-meta">Toplam</span>
        <span className="tabular text-meta text-foreground">
          {Math.round(total * 100) / 100} mm
          {requiredMm !== null && (
            <span className="ml-1 text-meta text-muted-foreground">
              / hedef {requiredMm} mm
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * Kadrajın ölçekli önizlemesi.
 *
 * Gerçek gökyüzü atlası yerine ölçekli bir dikdörtgen: hedefin açısal
 * boyutuyla karşılaştırıldığında kadrajın yeterli olup olmadığını
 * gösteriyor. Atlas bindirmesi ileride bu bileşenin içine girecek —
 * dışarıdan aldığı tek şey derece cinsinden alan olduğu için arayüz
 * değişmeyecek.
 */
export function FovPreview({
  widthArcmin,
  heightArcmin,
}: {
  widthArcmin: number | null;
  heightArcmin: number | null;
}) {
  if (widthArcmin === null || heightArcmin === null) {
    return (
      <p className="py-2 text-body-sm leading-relaxed text-muted-foreground">
        Görüş alanı için etkin odak ve sensör boyutu gerekiyor; ikisi de
        seçildiğinde kadraj burada ölçekli çizilir.
      </p>
    );
  }

  /* Referans: dolunay 31′. Kadraj ona göre ölçekleniyor, böylece sayı
     okumadan da "ne kadar geniş" sorusu cevaplanıyor. */
  const MOON_ARCMIN = 31;
  const span = Math.max(widthArcmin, heightArcmin, MOON_ARCMIN * 1.4);
  const boxW = (widthArcmin / span) * 100;
  const boxH = (heightArcmin / span) * 100;
  const moon = (MOON_ARCMIN / span) * 100;

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card border border-border bg-[#05070d]">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-300/70"
          style={{ width: `${moon}%`, aspectRatio: '1' }}
          title="Dolunay — 31′"
          aria-hidden
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-primary"
          style={{ width: `${boxW}%`, height: `${boxH}%` }}
          aria-hidden
        />
        <span className="tabular absolute bottom-1 right-1.5 text-meta text-faint">
          karşılaştırma: dolunay 31′
        </span>
      </div>
      <p className="tabular mt-1.5 text-meta text-muted-foreground">
        {Math.round(widthArcmin)}′ × {Math.round(heightArcmin)}′ (
        {(widthArcmin / 60).toFixed(2)}° × {(heightArcmin / 60).toFixed(2)}°)
      </p>
    </div>
  );
}

export function AnalysisPanel({
  report,
  segments,
  requiredBackfocusMm,
}: {
  report: SetupReport;
  segments: BackfocusSegment[];
  requiredBackfocusMm: number | null;
}) {
  const m = report.metrics;

  return (
    <div className="space-y-3">
      <Panel
        title="Genel durum"
        status={`${report.checks.length} kontrol`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <VerdictBadge status={report.verdict} />
          {report.missingDataCount > 0 && (
            <span className="text-meta text-muted-foreground">
              {report.missingDataCount} kontrol için veri eksik
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <Metric label="Toplam ağırlık" computation={m.totalWeightKg} digits={1} />
          <Metric label="Güvenli kapasite" computation={m.usablePayloadKg} digits={1} />
          <Metric label="Etkin odak" computation={m.effectiveFocalLengthMm} digits={0} />
          <Metric label="Etkin f/" computation={m.effectiveFRatio} digits={1} />
          <Metric label="Piksel ölçeği" computation={m.pixelScaleArcsec} />
          <Metric label="Sensör diyagonali" computation={m.sensorDiagonalMm} digits={1} />
          <Metric label="Backfocus" computation={m.achievedBackfocusMm} digits={1} />
          <Metric label="Guide oranı" computation={m.guideRatio} digits={1} />
          <Metric label="Kadraj genişliği" computation={m.fovWidthArcmin} digits={0} />
        </div>
      </Panel>

      <Panel title="Kadraj önizlemesi">
        <FovPreview
          widthArcmin={m.fovWidthArcmin.value}
          heightArcmin={m.fovHeightArcmin.value}
        />
      </Panel>

      <Panel title="Backfocus zinciri">
        <BackfocusChainView segments={segments} requiredMm={requiredBackfocusMm} />
      </Panel>

      <Panel title="Uyumluluk kontrolleri" status={report.verdict}>
        <ul>
          {report.checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </ul>
        <p className="mt-2 text-meta leading-snug text-faint">
          Her kontrolün üzerine tıklayınca formül, kullanılan değerler ve
          varsa yapılan kabuller açılır. “Veri yetersiz” yazan kontrollerde
          sistem tahmin üretmez.
        </p>
      </Panel>
    </div>
  );
}

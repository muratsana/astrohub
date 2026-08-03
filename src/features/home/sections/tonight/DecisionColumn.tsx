import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { formatClock } from '@/domain/astronomy/ephemeris';
import type { NightScore, NightVerdict } from '@/domain/astronomy/nightScore';
import type { SkyState } from '@/features/weather/useSkyConditions';
import { cn } from '@/lib/cn';
import type { BestPlace } from './bestPlaces';

/**
 * KARAR KOLONU — "bu gece gözlem yapmaya değer mi?"
 *
 * Modülün ilk kolonu olması mimari bir karar: kullanıcı önce KARARI
 * görüyor, sonra gerekçesini. Eski panel bunun tersini yapıyordu — altı
 * ölçüm gösterip hükmü kullanıcıya bırakıyordu. Bulut %38, seeing 2.5,
 * ay %62 üçlüsünden "bu gece çıkayım mı" sorusunu cevaplamak uzmanlık
 * istiyor; sitenin işi tam olarak o uzmanlığı üstlenmek.
 *
 * SKOR VE KIRILIM AYNI FONKSİYONDAN (`nightScore`) geliyor. Toplamı
 * burada, çubukları başka yerde hesaplamak, ekranda "92" yazarken
 * altındaki dört çubuğun başka bir şey söylemesi demekti.
 *
 * HAVA VERİSİ YOKSA SKOR YOK. Uydurulmuş bir skor, kullanıcıyı gecenin
 * ortasında ekipmanla dışarı çıkarır. Kolon o durumda ne olduğunu
 * söylüyor ve yeniden deneme veriyor; çizelge ile hedef kolonları
 * çalışmaya devam ediyor çünkü onlar havadan bağımsız (efemeris).
 */

interface Props {
  score: NightScore | null;
  deepSpaceScore?: NightScore | null;
  solarSystemScore?: NightScore | null;
  bestPlacesDate: Date;
  onUseBestPlace?: (place: BestPlace) => void;
  bortle?: number | null;
  conditions: SkyState;
  locationLabel: string;
  dateLabel: string;
  timeZone: string;
}

/** Hüküm → token. Tasarımın yeşil/amber/turuncu üçlüsünün karşılığı. */
const VERDICT_TONE: Record<
  NightVerdict,
  { text: string; ring: string; dot: string }
> = {
  'cok-iyi': {
    text: 'text-success',
    ring: 'var(--color-success)',
    dot: 'bg-success',
  },
  iyi: {
    text: 'text-success',
    ring: 'var(--color-success)',
    dot: 'bg-success',
  },
  orta: {
    text: 'text-warning',
    ring: 'var(--color-warning)',
    dot: 'bg-warning',
  },
  zayif: { text: 'text-danger', ring: 'var(--color-danger)', dot: 'bg-danger' },
};

export function DecisionColumn({
  score,
  deepSpaceScore = score,
  solarSystemScore = score,
  bestPlacesDate,
  onUseBestPlace,
  bortle = null,
  conditions,
  locationLabel,
  dateLabel,
  timeZone,
}: Props) {
  const [tab, setTab] = useState<'dso' | 'solar' | 'places'>('dso');
  const [bestPlaces, setBestPlaces] = useState<BestPlace[] | null>(null);
  const activeScore = tab === 'solar' ? solarSystemScore : deepSpaceScore;

  useEffect(() => {
    if (tab !== 'places') return;
    const controller = new AbortController();
    setBestPlaces(null);
    const weatherAt = new Date(bestPlacesDate.getTime() + 25 * 60 * 60_000);
    void import('./bestPlaces').then(
      ({ bestPlacesForNight, bestPlacesForNightWithWeather }) => {
        bestPlacesForNightWithWeather(
          bestPlacesDate,
          weatherAt,
          10,
          controller.signal
        )
          .then((places) => {
            if (!controller.signal.aborted) setBestPlaces(places);
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              setBestPlaces(bestPlacesForNight(bestPlacesDate, 10));
            }
          });
      }
    );
    return () => {
      controller.abort();
    };
  }, [tab, bestPlacesDate]);
  /*
   * Kolonun üstündeki ışıma HÜKMÜN RENGİ, sabit yeşil değil. Tasarım
   * referansı yeşil bir gradyan gösteriyor ama o örnek "çok iyi" bir
   * gece; aynı yeşili kapalı bir gecede çizmek, ekranın rengiyle
   * yazısının birbirini yalanlaması olurdu.
   */
  const glow = activeScore
    ? VERDICT_TONE[activeScore.verdict].ring
    : 'var(--color-cold)';

  return (
    <div
      className="flex flex-col gap-4 bg-background p-5"
      style={{
        backgroundImage: `linear-gradient(165deg, color-mix(in srgb, ${glow} 10%, transparent), transparent 55%)`,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="label caps min-h-7 text-muted-foreground">Bu gece</h2>
        {conditions.data && (
          <span className="inline-flex items-center gap-1.5 text-meta text-faint">
            <span
              aria-hidden
              className="h-[5px] w-[5px] rounded-full bg-success"
            />
            <span className="num">
              {formatClock(conditions.data.observedAt, timeZone)}
            </span>{' '}
            güncellendi
          </span>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Gözlem skoru türü"
        className="grid grid-cols-3 gap-1 rounded-card border border-border bg-surface-1 p-1"
      >
        <DecisionTab selected={tab === 'dso'} onClick={() => setTab('dso')}>
          Derin Uzay
        </DecisionTab>
        <DecisionTab selected={tab === 'solar'} onClick={() => setTab('solar')}>
          Güneş Sistemi
        </DecisionTab>
        <DecisionTab
          selected={tab === 'places'}
          onClick={() => setTab('places')}
        >
          En İyi Yerler
        </DecisionTab>
      </div>

      {tab === 'places' ? (
        <BestPlacesBlock places={bestPlaces} onUseBestPlace={onUseBestPlace} />
      ) : activeScore ? (
        <ScoreBlock
          score={activeScore}
          locationLabel={locationLabel}
          dateLabel={dateLabel}
        />
      ) : (
        <ScoreUnavailable conditions={conditions} />
      )}

      {tab !== 'places' && activeScore && (
        <>
          <BortleIndicator value={bortle} />
          <div aria-hidden className="h-px bg-border" />
          <ReasonList pros={activeScore.pros} cons={activeScore.cons} />
          <p className="mt-auto rounded-card border border-warning/25 bg-warning/8 px-3.5 py-2.5 text-meta leading-relaxed text-warning">
            {activeScore.recommendation}
          </p>
        </>
      )}
    </div>
  );
}

function DecisionTab({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'min-h-8 rounded-card px-2 text-center text-[0.68rem] font-semibold leading-tight transition-colors',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function BestPlacesBlock({
  places,
  onUseBestPlace,
}: {
  places: BestPlace[] | null;
  onUseBestPlace?: (place: BestPlace) => void;
}) {
  const best = places?.[0];

  if (!best) {
    return (
      <p className="rounded-card border border-border bg-surface-2 px-3.5 py-3 text-meta leading-relaxed text-muted-foreground">
        En iyi yerler hesaplanıyor.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="rounded-card border border-primary/35 bg-primary/10 p-3">
        <p className="text-meta font-semibold text-primary">En iyi aday</p>
        <p className="mt-1 text-body-sm font-bold text-foreground">
          {best.site.name}
        </p>
        <p className="mt-0.5 text-meta text-muted-foreground">
          {best.site.region} · Bortle {best.site.bortle} ·{' '}
          <span className="num">{best.site.altitude}</span> m
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-meta">
          <span className="rounded-card bg-background px-2 py-1 text-muted-foreground">
            DSO <span className="num text-foreground">{best.dsoScore}</span>
          </span>
          <span className="rounded-card bg-background px-2 py-1 text-muted-foreground">
            Güneş Sistemi{' '}
            <span className="num text-foreground">{best.solarSystemScore}</span>
          </span>
        </div>
        <p className="mt-2 text-meta text-muted-foreground">
          Öne çıkan: {best.bestProfile === 'dso' ? 'Derin Uzay' : 'Güneş Sistemi'} ·{' '}
          {best.weatherBased ? 'saatlik tahminle' : 'yer profiliyle'}
        </p>
        {onUseBestPlace && (
          <Button
            type="button"
            size="sm"
            className="mt-3 w-full"
            onClick={() => onUseBestPlace(best)}
          >
            En iyi yeri kullan
          </Button>
        )}
      </div>

      <ol className="max-h-[330px] min-h-0 overflow-y-auto pr-1">
        {places.map((place, index) => (
          <li
            key={place.site.name}
            className="border-b border-border last:border-b-0"
          >
            <button
              type="button"
              disabled={!onUseBestPlace}
              aria-label={`${place.site.name} gözlem yerini kullan`}
              onClick={() => onUseBestPlace?.(place)}
              className={cn(
                'grid w-full grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_3.5rem] items-center gap-2 rounded-card px-2 py-2 text-left transition-colors',
                onUseBestPlace
                  ? 'hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'
                  : 'cursor-default'
              )}
            >
              <span className="num text-meta text-faint">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-meta font-semibold text-foreground">
                  {place.site.name}
                </span>
                <span className="block truncate text-[0.68rem] text-faint">
                  Bortle {place.site.bortle} ·{' '}
                  <span className="num">{place.site.altitude}</span> m · aysız{' '}
                  {durationText(place.moonlessMinutes)}
                </span>
              </span>
              <span className="text-right text-[0.68rem] text-muted-foreground">
                DSO <span className="num text-primary">{place.dsoScore}</span>
              </span>
              <span className="text-right text-[0.68rem] text-muted-foreground">
                GS{' '}
                <span className="num text-success">
                  {place.solarSystemScore}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function durationText(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins} dk`;
  if (mins === 0) return `${hours}sa`;
  return `${hours}sa ${String(mins).padStart(2, '0')}dk`;
}

function ScoreBlock({
  score,
  locationLabel,
  dateLabel,
}: {
  score: NightScore;
  locationLabel: string;
  dateLabel: string;
}) {
  const tone = VERDICT_TONE[score.verdict];

  return (
    <>
      <div className="flex items-center gap-4">
        {/*
          HALKA. `conic-gradient` yüzdesi doğrudan skor — ayrı bir görsel
          ölçek yok, çünkü iki ölçek tutmak ikisini birbirinden ayırmak
          demek. Dolgu animasyonu `--ring-fill` üzerinden (bkz. index.css);
          `prefers-reduced-motion` genel kural tarafından zaten kısılıyor.
        */}
        <div
          aria-hidden
          className="score-ring grid h-[78px] w-[78px] shrink-0 place-items-center rounded-full"
          style={
            {
              '--ring-fill': `${score.total}%`,
              '--ring-color': tone.ring,
            } as React.CSSProperties
          }
        >
          <div className="grid h-[62px] w-[62px] place-items-center rounded-full bg-background">
            <span
              className={cn(
                'num text-readout-lg font-semibold leading-none',
                tone.text
              )}
            >
              {score.total}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-readout font-bold leading-tight text-foreground">
            {score.verdictLabel}
          </p>
          <p className="mt-0.5 text-meta font-medium text-muted-foreground">
            {locationLabel} · {dateLabel}
          </p>
          {/*
            Seeing ölçülemediğinde hüküm "İyi gece" ile sınırlanıyor.
            Sebebini yazmazsak kullanıcı mükemmel bir gecede neden en
            yüksek notu görmediğini anlayamaz (QA ASTRO-05).
          */}
          {score.limitedBySeeing && (
            <p className="mt-1 text-meta text-faint">
              Seeing ölçülemedi — hüküm bir kademe sınırlandı.
            </p>
          )}
        </div>
      </div>

      {/*
        TEK GRID, ÜÇ SÜTUN. Her satır kendi grid'i olsaydı etiket
        genişlikleri satırdan satıra kayardı; "Rüzgâr & nem" ile
        "Seeing" alt alta hizalanmazdı. `auto` sütun en uzun etikete
        göre kendini kuruyor — Türkçe metin uzadığında da bozulmuyor.
      */}
      <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2.5 gap-y-2">
        {score.rows.map((row) => (
          <div key={row.key} className="contents">
            <dt className="text-meta text-muted-foreground">{row.label}</dt>
            <dd
              aria-hidden
              className="h-1 overflow-hidden rounded-full bg-surface-3"
            >
              <div
                className={cn(
                  'h-full rounded-full',
                  row.value === null
                    ? 'bg-transparent'
                    : row.tone === 'warn'
                      ? 'bg-warning'
                      : 'bg-success'
                )}
                style={{ width: `${row.barValue ?? row.value ?? 0}%` }}
              />
            </dd>
            <dd
              className={cn(
                'num min-w-[2.5ch] text-right text-meta',
                row.value === null ? 'text-faint' : 'text-muted-foreground'
              )}
            >
              {row.value ?? '—'}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function BortleIndicator({ value }: { value: number | null }) {
  if (value == null) return null;

  const level = Math.min(9, Math.max(1, Math.round(value)));
  const filled = 10 - level;
  const tone =
    level <= 3 ? 'bg-success' : level <= 5 ? 'bg-warning' : 'bg-danger';

  return (
    <div className="rounded-card border border-border bg-surface-1 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-meta font-semibold text-muted-foreground">
          Bortle Skalası
        </span>
        <span className="num text-body-sm font-bold text-foreground">
          {level}/9
        </span>
      </div>
      <div
        aria-label={`Bortle ${level}`}
        className="flex h-5 items-center gap-1 rounded-card border border-border-strong bg-background p-1"
      >
        {Array.from({ length: 9 }, (_, index) => (
          <span
            key={index}
            aria-hidden
            className={cn(
              'min-w-0 flex-1 rounded-sm',
              index < filled ? cn('h-3.5', tone) : 'h-2 bg-surface-3'
            )}
          />
        ))}
        <span
          aria-hidden
          className="ml-0.5 h-2.5 w-1 shrink-0 rounded-sm bg-border-strong"
        />
      </div>
    </div>
  );
}

/**
 * Hava servisi yokken.
 *
 * Üç ayrı sebep var ve üçüne söylenecek şey farklı: bekleniyor,
 * derlemede ağ kapalı, istek düştü. Tek bir "veri yok" cümlesi
 * kullanıcıya ne yapacağını söylemez — beklemek mi, yenilemek mi,
 * hiçbiri mi.
 */
function ScoreUnavailable({ conditions }: { conditions: SkyState }) {
  if (conditions.status === 'loading' || conditions.status === 'idle') {
    return (
      <div aria-busy className="flex items-center gap-4">
        <div className="h-[78px] w-[78px] shrink-0 animate-pulse rounded-full bg-surface-2" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-32 animate-pulse rounded-card bg-surface-2" />
          <div className="h-3 w-40 animate-pulse rounded-card bg-surface-2" />
        </div>
      </div>
    );
  }

  if (conditions.status === 'offline') {
    return (
      <p className="rounded-card border border-border bg-surface-2 px-3.5 py-3 text-meta leading-relaxed text-muted-foreground">
        Bu derlemede dış servis kapalı; gece skoru hesaplanamıyor. Çizelge ve
        hedef sıralaması yerel hesapla çalışmaya devam ediyor.
      </p>
    );
  }

  return (
    <div className="rounded-card border border-warning/25 bg-warning/8 px-3.5 py-3">
      <p className="text-meta leading-relaxed text-warning">
        Hava verisi alınamadı — gece skoru hesaplanamıyor. Çizelge ve hedef
        sıralaması yerel hesapla çalışıyor.
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="mt-2"
        onClick={conditions.retry}
      >
        Yeniden dene
      </Button>
    </div>
  );
}

/**
 * Gerekçeler.
 *
 * `+` ve `−` işaretleri `aria-hidden` DEĞİL: ekran okuyucuda listenin
 * hangi yöne baktığı kayboluyor. Bunun yerine her satır kendi metnini
 * "artı" / "eksi" ile açıyor ve işaret görsel karşılığı.
 */
function ReasonList({ pros, cons }: { pros: string[]; cons: string[] }) {
  const rows = [
    ...pros.map((text) => ({ text, positive: true })),
    ...cons.map((text) => ({ text, positive: false })),
  ];
  if (rows.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li key={row.text} className="flex gap-2.5">
          <span
            className={cn(
              'num shrink-0 text-meta font-semibold leading-relaxed',
              row.positive ? 'text-success' : 'text-warning'
            )}
          >
            <span className="sr-only">{row.positive ? 'Artı' : 'Eksi'}: </span>
            <span aria-hidden>{row.positive ? '+' : '−'}</span>
          </span>
          <span className="text-meta leading-relaxed text-muted-foreground">
            {row.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

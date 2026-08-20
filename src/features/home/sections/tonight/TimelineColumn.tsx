import {
  formatClock,
  formatDuration,
  type MoonPhase,
  type RiseSet,
} from '@/domain/astronomy/ephemeris';
import type { NightTimeline } from '@/domain/astronomy/nightTimeline';
import { seeingLabel } from '@/features/weather/seeing';
import { dewRisk } from '@/features/weather/openMeteo';
import type { SkyState } from '@/features/weather/useSkyConditions';
import { cn } from '@/lib/cn';
import { NightTimelineChart } from './NightTimelineChart';

/**
 * ZAMAN KOLONU — "ne zaman?"
 *
 * Üstte gecenin iki sayısı, ortada çizelge, altta dört koşul kartı.
 *
 * BAŞLIKTAKİ ASIL SAYI "AYSIZ". Karanlık süresi tek başına yanıltıcı:
 * dolunay altındaki altı saat, aysız üç saatten kötü. Panelin ilk
 * sürümünde bu ayrım yoktu ve kullanıcı iyi bir gece sanıp çıkıyordu.
 *
 * KOŞUL KARTLARI HAVA SERVİSİNE BAĞLI, ÇİZELGE DEĞİL. Servis düşse bile
 * çizelge çalışır — alacakaranlık ve ay yerel efemeris hesabı, ağ
 * gerektirmiyor. Bu yüzden kolon tümden bir hata durumuna geçmiyor;
 * yalnızca kartlar "—" gösteriyor.
 */

interface Props {
  timeline: NightTimeline;
  moon: MoonPhase;
  moonTimes: RiseSet;
  conditions: SkyState;
  nowAt: number | null;
  /** Hedef kolonunda işaretlenen satırın zirve anı (0–1). */
  markAt: number | null;
  timeZone: string;
}

export function TimelineColumn({
  timeline,
  moon,
  moonTimes,
  conditions,
  nowAt,
  markAt,
  timeZone,
}: Props) {
  const clock = (date: Date | null) => formatClock(date, timeZone);
  const dark = timeline.dark;
  const darkMinutes = dark
    ? Math.round((dark.to.getTime() - dark.from.getTime()) / 60_000)
    : 0;

  const weather = conditions.data;
  const dew = weather ? dewRisk(weather.temperature, weather.dewPoint) : null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid gap-2">
        <dl className="grid gap-2.5 min-[560px]:grid-cols-[minmax(13rem,1.35fr)_minmax(7rem,0.75fr)_minmax(8rem,0.9fr)]">
          <SummaryMetric
            label="Karanlık penceresi"
            value={
              dark ? (
                <>
                  {clock(dark.from)}
                  <span className="mx-1.5 text-faint">→</span>
                  {clock(dark.to)}
                </>
              ) : (
                'bu enlemde oluşmuyor'
              )
            }
          />

          <SummaryMetric
            label="Toplam Süre"
            value={dark ? formatDuration(darkMinutes) : '—'}
            tone="primary"
          />

          <SummaryMetric
            label="Aysız Pencere"
            value={
              !dark
                ? '—'
                : timeline.moonlessMinutes === 0
                  ? 'yok'
                  : formatDuration(timeline.moonlessMinutes)
            }
            tone={
              !dark
                ? 'faint'
                : timeline.moonlessMinutes === 0
                  ? 'warning'
                  : 'success'
            }
          />
        </dl>

        <p className="justify-self-start text-meta text-muted-foreground min-[560px]:justify-self-end">
          <span className="text-faint">gece</span>{' '}
          <span className="tabular font-medium">
            {clock(timeline.from)}
            <span className="mx-1 text-faint">→</span>
            {clock(timeline.to)}
          </span>
        </p>
      </div>

      <NightTimelineChart
        timeline={timeline}
        timeZone={timeZone}
        nowAt={nowAt}
        markAt={markAt}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <ConditionCard
          label="Bulut örtüsü"
          value={weather ? `%${Math.round(weather.cloudCover)}` : '—'}
          meter={weather ? 1 - weather.cloudCover / 100 : null}
        />

        <ConditionCard
          label="Seeing"
          value={weather?.seeing ? seeingLabel(weather.seeing.index) : '—'}
          meter={weather?.seeing ? 1 - (weather.seeing.index - 1) / 4 : null}
        />

        <ConditionCard
          label="Çiylenme"
          value={dew ? dew.label : '—'}
          meter={
            weather
              ? Math.min(
                  1,
                  Math.max(0, (weather.temperature - weather.dewPoint) / 8)
                )
              : null
          }
          tone={dew?.tone === 'danger' ? 'warn' : 'good'}
        />

        {/*
          RÜZGÂR PANELDE HİÇ YOKTU (Faz 3.4).

          `windSpeed` ilk günden beri çekiliyordu ve yalnızca seeing
          hesabının yerel bileşeni olarak kullanılıyordu — gözlemci onu
          hiç görmüyordu. Oysa rüzgâr, buluttan sonra gecenin en sert
          karar girdisi: 25 km/sa üstünde ince optikle rehberli poz
          tutmuyor.

          HAMLE AYRI GÖSTERİLİYOR. Ortalama 12 km/sa sorunsuz görünür ama
          40 km/sa hamle poz sırasında montürü sarsıp kareyi çöpe atar;
          ortalamayı tek başına göstermek gözlemciyi yanıltır.
        */}
        <ConditionCard
          label="Rüzgâr"
          value={weather ? `${Math.round(weather.windSpeed)} km/sa` : '—'}
          /* 30 km/sa üstü pratikte gözlem dışı; ölçek oraya göre. */
          meter={
            weather ? Math.min(1, Math.max(0, 1 - weather.windSpeed / 30)) : null
          }
        />

        <ConditionCard
          label="Sıcaklık"
          value={weather ? `${Math.round(weather.temperature)}°C` : '—'}
          /* Ölçek YOK: sıcaklık "iyi/kötü" değil, giyinme kararı. Uydurma
             bir eşik (kaç derece iyi?) coğrafyaya göre değişir. */
          meter={null}
        />

        <ConditionCard
          label="Ay Evresi"
          value={moon.name}
          meter={1 - moon.illumination}
          visual={<MoonDisc illumination={moon.illumination} />}
        />
      </div>

      <MoonPhaseStrip moon={moon} moonTimes={moonTimes} timeZone={timeZone} />
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone = 'foreground',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'foreground' | 'primary' | 'success' | 'warning' | 'faint';
}) {
  const toneClass = {
    foreground: 'text-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    faint: 'text-faint',
  }[tone];

  return (
    <div className="min-w-0">
      <dt className="label caps truncate text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'tabular mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-readout-lg font-semibold leading-none min-[560px]:text-readout-xl',
          toneClass
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Tek koşul kartı.
 *
 * `meter` 0 kötü, 1 iyi. Bir sayının "iyi mi" olduğunu bilmek ölçeği
 * bilmeyi gerektirir ve %47 bulutun ne demek olduğunu herkes bilmez.
 */
function ConditionCard({
  label,
  value,
  meter,
  visual,
  tone = 'good',
}: {
  label: string;
  value: string;
  meter: number | null;
  visual?: React.ReactNode;
  tone?: 'good' | 'warn';
}) {
  const empty = value === '—';

  /*
   * ETİKET KARTIN DOĞRUDAN ÇOCUĞU, bir sarmalayıcının içinde değil.
   * Görünüşte fark yok ama etiketten değere ulaşmak isteyen her şey —
   * test, ekran okuyucu betiği, tarayıcı eklentisi — etiketten yukarı
   * çıkıp kardeşlere bakıyor. Araya bir `div` koymak o yolu kesiyordu.
   */
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-card border border-border bg-surface-2 px-3 py-2.5">
      <p className="truncate text-meta font-medium text-muted-foreground">
        {label}
      </p>

      <span className="flex items-center gap-3">
        {meter !== null && (
          <span
            aria-hidden
            className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-surface-3"
          >
            <span
              className={cn(
                'block h-full rounded-full',
                tone === 'warn' ? 'bg-warning' : 'bg-success'
              )}
              style={{ width: `${Math.round(meter * 100)}%` }}
            />
          </span>
        )}

        {visual && (
          <span aria-hidden className="shrink-0">
            {visual}
          </span>
        )}

        <span
          className={cn(
            'shrink-0 text-body-sm font-semibold',
            empty ? 'text-faint' : 'text-foreground'
          )}
        >
          {value}
        </span>
      </span>

    </div>
  );
}

/**
 * Ay evresi diski.
 *
 * Aydınlanma oranı iki yay ile çiziliyor: dış kenar sabit, iç terminatör
 * oranla birlikte genişleyip daralıyor. Basit bir "yarım daire" çizimi
 * %20 ile %80 dolunayı aynı gösterirdi.
 */
function MoonDisc({ illumination }: { illumination: number }) {
  const r = 12;
  const k = Math.min(1, Math.max(0, illumination));
  const rx = r * Math.abs(1 - 2 * k);
  const sweep = k > 0.5 ? 1 : 0;

  return (
    <svg viewBox="0 0 30 30" fill="none" className="h-[18px] w-[18px]">
      <circle
        cx="15"
        cy="15"
        r={r}
        className="fill-surface-3 stroke-border-strong"
        strokeWidth="1.2"
      />
      <path
        d={`M15 3 A ${r} ${r} 0 0 1 15 27 A ${rx} ${r} 0 0 ${sweep} 15 3 Z`}
        fill="#e3b341"
      />
    </svg>
  );
}

function MoonPhaseStrip({
  moon,
  moonTimes,
  timeZone,
}: {
  moon: MoonPhase;
  moonTimes: RiseSet;
  timeZone: string;
}) {
  const clock = (date: Date | null) => (date ? formatClock(date, timeZone) : null);
  const movement = moonTimes.alwaysUp
    ? 'gece boyu ufkun üstünde'
    : moonTimes.alwaysDown
      ? 'ufkun altında'
      : [
          moonTimes.rise ? `doğuş ${clock(moonTimes.rise)}` : null,
          moonTimes.set ? `batış ${clock(moonTimes.set)}` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border border-border bg-surface-2 px-3.5 py-2.5 text-meta text-muted-foreground">
      <span className="inline-flex items-center gap-2 text-foreground">
        <MoonDisc illumination={moon.illumination} />
        <span className="font-medium">Ay Evresi</span>
      </span>
      <span>{moon.name}</span>
      <span className="text-faint">·</span>
      <span>%{Math.round(moon.illumination * 100)} aydınlık</span>
      {movement && (
        <>
          <span className="text-faint">·</span>
          <span>{movement}</span>
        </>
      )}
    </div>
  );
}

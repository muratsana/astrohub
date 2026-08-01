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

  /** Servise ulaşılamadığında kartların ortak alt metni. */
  const hint =
    conditions.status === 'loading' || conditions.status === 'idle'
      ? 'alınıyor…'
      : conditions.status === 'offline'
        ? 'önizlemede dış servis kapalı'
        : 'servise ulaşılamadı';

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <h3 className="label caps text-muted-foreground">
            Karanlık penceresi
          </h3>
          <p className="num mt-1 text-readout-xl font-semibold leading-none text-foreground sm:text-readout-xl">
            {dark ? (
              <>
                {clock(dark.from)}
                <span className="mx-1.5 text-faint">→</span>
                {clock(dark.to)}
              </>
            ) : (
              <span className="text-readout-lg font-normal text-faint">
                bu enlemde oluşmuyor
              </span>
            )}
          </p>
        </div>

        <dl className="flex items-end gap-6 border-border xl:border-l xl:pl-6">
          <div>
            <dt className="text-meta text-faint">süre</dt>
            <dd className="num text-readout font-semibold leading-tight text-primary">
              {dark ? formatDuration(darkMinutes) : '—'}
            </dd>
          </div>
          {/*
            AYSIZ PENCERE panelin asıl sayısı. Sıfır bir CEVAP, veri
            yokluğu değil: "ay bütün gece yukarıda" bilinen bir sonuç ve
            sönük bir tire onu "bilmiyoruz" gibi gösteriyordu.
          */}
          <div>
            <dt className="text-meta text-faint">aysız</dt>
            <dd
              className={cn(
                'text-readout font-semibold leading-tight',
                !dark
                  ? 'text-faint'
                  : timeline.moonlessMinutes === 0
                    ? 'text-warning'
                    : 'num text-success'
              )}
            >
              {!dark
                ? '—'
                : timeline.moonlessMinutes === 0
                  ? 'yok'
                  : formatDuration(timeline.moonlessMinutes)}
            </dd>
          </div>
        </dl>

        <dl className="ml-auto text-right">
          <dt className="text-meta text-faint">gece</dt>
          <dd className="num text-body-sm font-medium leading-tight text-muted-foreground">
            {clock(timeline.from)}
            <span className="mx-1 text-faint">→</span>
            {clock(timeline.to)}
          </dd>
        </dl>
      </div>

      <NightTimelineChart
        timeline={timeline}
        timeZone={timeZone}
        nowAt={nowAt}
        markAt={markAt}
      />

      <div className="grid gap-2.5 sm:grid-cols-2">
        <ConditionCard
          label="Bulut örtüsü"
          value={weather ? `%${Math.round(weather.cloudCover)}` : '—'}
          hint={
            weather
              ? weather.layers
                ? /* Katman ayrımı varsa onu göster: alçak bulut geceyi
                     bitirir, yüksek sirrus yalnızca zorlaştırır. Toplam
                     yüzde bu farkı gizliyor. */
                  `alçak %${Math.round(weather.layers.low)} · yüksek %${Math.round(weather.layers.high)}` +
                  (weather.precipitationProbability !== null
                    ? ` · yağış %${Math.round(weather.precipitationProbability)}`
                    : '')
                : `${Math.round(weather.temperature)}°C`
              : hint
          }
          meter={weather ? 1 - weather.cloudCover / 100 : null}
        />

        <ConditionCard
          label="Seeing"
          value={weather?.seeing ? seeingLabel(weather.seeing.index) : '—'}
          hint={
            weather
              ? weather.seeing
                ? `tahmin · ${weather.seeing.driver}`
                : 'üst atmosfer verisi yok'
              : hint
          }
          meter={weather?.seeing ? 1 - (weather.seeing.index - 1) / 4 : null}
        />

        <ConditionCard
          label="Çiylenme"
          value={dew ? dew.label : '—'}
          hint={
            weather
              ? `çiy ${Math.round(weather.dewPoint)}°C · nem %${Math.round(weather.humidity)}`
              : hint
          }
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
          hint={
            weather
              ? weather.windGust !== null
                ? `hamle ${Math.round(weather.windGust)} km/sa`
                : 'hamle verisi yok'
              : hint
          }
          /* 30 km/sa üstü pratikte gözlem dışı; ölçek oraya göre. */
          meter={
            weather ? Math.min(1, Math.max(0, 1 - weather.windSpeed / 30)) : null
          }
        />

        <ConditionCard
          label="Sıcaklık"
          value={weather ? `${Math.round(weather.temperature)}°C` : '—'}
          hint={
            weather
              ? weather.apparentTemperature !== null
                ? /* Gece boyunca sabit duran gözlemcinin dayanma süresini
                     belirleyen şey yer sıcaklığı değil bu. */
                  `hissedilen ${Math.round(weather.apparentTemperature)}°C`
                : 'hissedilen sıcaklık verisi yok'
              : hint
          }
          /* Ölçek YOK: sıcaklık "iyi/kötü" değil, giyinme kararı. Uydurma
             bir eşik (kaç derece iyi?) coğrafyaya göre değişir. */
          meter={null}
        />

        <ConditionCard
          label="Ay"
          value={`%${Math.round(moon.illumination * 100)}`}
          hint={
            moonTimes.set
              ? `batar ${clock(moonTimes.set)}`
              : moonTimes.rise
                ? `doğar ${clock(moonTimes.rise)}`
                : moonTimes.alwaysUp
                  ? 'gece boyunca yukarıda'
                  : moon.name.toLocaleLowerCase('tr-TR')
          }
          meter={1 - moon.illumination}
          visual={<MoonDisc illumination={moon.illumination} />}
        />
      </div>
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
  hint,
  meter,
  visual,
  tone = 'good',
}: {
  label: string;
  value: string;
  hint: string;
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 rounded-card border border-border bg-surface-2 px-3.5 py-3">
      <p className="truncate text-meta font-medium text-muted-foreground">
        {label}
      </p>

      <span className="row-span-2 flex items-center gap-3">
        {meter !== null && (
          <span
            aria-hidden
            className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-surface-3"
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
            empty ? 'num text-faint' : 'text-foreground',
            // Sayısal değerler mono; "Mükemmel"/"Kuru" gibi kelimeler değil.
            /^[%\d]/.test(value) && 'num'
          )}
        >
          {value}
        </span>
      </span>

      <p className="mt-0.5 truncate text-meta text-faint">{hint}</p>
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

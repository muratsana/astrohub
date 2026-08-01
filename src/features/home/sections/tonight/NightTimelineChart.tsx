import { useMemo } from 'react';
import type { NightTimeline, SegmentKind } from '@/domain/astronomy/nightTimeline';
import { formatClock, formatDuration } from '@/domain/astronomy/ephemeris';
import { cn } from '@/lib/cn';

/**
 * GECE ÇİZELGESİ — batıştan doğuşa tek eksen.
 *
 * ÜZERİNDE DÖRT KATMAN VAR ve hepsi aynı ekseni paylaşıyor:
 *
 *   1. Alacakaranlık bantları — gökyüzünün kendi rengi
 *   2. Tam karanlık kutusu — gecenin gerçek bütçesi
 *   3. Ay yüksekliği eğrisi — bütçeyi kimin yediği
 *   4. "Şu an" imleci
 *
 * Katmanların üst üste durması bilinçli: ay yukarıdayken tam karanlık
 * bandı hâlâ "karanlık" ama gözlem koşulu değil. İki bilgiyi ayrı
 * çizelgelere koymak, aralarındaki ilişkiyi — yani asıl cevabı — gizler.
 *
 * ══════════════════════════════════════════════════════════════════════
 * RENKLER TEMADAN BAĞIMSIZ.
 *
 * Bunlar arayüz yüzeyi değil, GÖKYÜZÜNÜN ÇİZİMİ. Güneş battıkça koyulaşan
 * bir gökyüzü açık temada açık renk olmaz; olursa çizelge bir gösterge
 * olmaktan çıkıp bir renk şeridine döner. Aynı gerekçe yer tutucu gökyüzü
 * görsellerinde de geçerli (bkz. StarField).
 *
 * ÜSTÜNDEKİ İŞARETLER DE SABİT — sebebi aşağıda, `MOON` bloğunda.
 * Çizelgenin DIŞINDAKİ her şey (saat kadranı, alt etiketler, lejant
 * yazısı) token kullanıyor; onlar kolon zemininin üstünde duruyor.
 */

/** Alacakaranlık bantlarının dolgusu — tasarım paketindeki gradyanlar. */
const SEGMENT_FILL: Record<SegmentKind, string> = {
  civil: 'linear-gradient(180deg, #4d67ad, #3e5493)',
  nautical: 'linear-gradient(180deg, #314275, #26335c)',
  astronomical: 'linear-gradient(180deg, #1b2544, #121930)',
  dark: '#04060a',
};

const SEGMENT_LABEL: Record<SegmentKind, string> = {
  civil: 'sivil alacakaranlık',
  nautical: 'denizci alacakaranlığı',
  astronomical: 'astronomik alacakaranlık',
  dark: 'tam karanlık',
};

/**
 * ÇİZELGENİN ÜSTÜNE ÇİZİLEN HER ŞEY SABİT RENK — token değil.
 *
 * Sebep kolay gözden kaçıyor: çizelgenin zemini üç temada da KOYU
 * (gökyüzü çizimi, bkz. yukarısı). Bir işareti `--color-primary` ile
 * çizmek koyu temada doğru görünür, açık temada felaket olur — o
 * temada primary #9b5000 gibi koyu bir kahverengi ve neredeyse siyah
 * bir zeminin üstünde 2.6:1 kontrast veriyor. Yani token kullanmak
 * burada temaya uymak değil, temayı kırmak demek.
 *
 * Değerler #04060a zeminine karşı ölçüldü: ay 8.9:1, karanlık sınırı
 * 6.9:1, hedef imleci 7.9:1, "şu an" 16.6:1 — hepsi AA'nın üstünde.
 */
const MOON = '#e3b341';
/** Tam karanlık sınırı ve etiketi. */
const DARK_EDGE = '#d29922';
/** Hedef zirve imleci — bağlantı mavisi ailesinden. */
const MARK = '#58a6ff';
/** "Şu an" imleci ve etiketi. */
const NOW = '#e6edf3';
const NOW_TEXT = '#0d1117';

/**
 * Eğrinin kapladığı yükseklik payı. Ay 90°'de bile çizelgenin yarısını
 * geçmiyor: eğri bir ölçek değil, bir bağlam — bantları örtmemeli.
 */
const CURVE_BAND = 0.45;

/** Karanlık kutusunun etiketi ancak bu kadar yer varsa sığar. */
const LABEL_MIN_SPAN = 0.24;

interface Props {
  timeline: NightTimeline;
  timeZone: string;
  /** Eksen üzerinde "şu an" (0–1); gündüzse null. */
  nowAt: number | null;
  /** Üzerine gelinen hedefin zirve anı — çizelgede işaretlenir. */
  markAt?: number | null;
}

/**
 * Saat kadranı çentikleri — tam saatler.
 *
 * Sabit yüzdeler yazılamaz: gece uzunluğu mevsime ve enleme göre iki
 * katına çıkıyor. Eksen üzerindeki her tam saat kendi oranından çıkıyor.
 *
 * SEYRELTME CSS'E BIRAKILDI, JS'e değil. Dar ekranda üç saatlik adım
 * isteniyor; bunu `window.innerWidth` ölçerek yapmak sunucuda boyanan
 * HTML ile istemcininkini ayırır (hidrasyon uyuşmazlığı) ve ekran
 * döndürüldüğünde yeniden ölçüm gerektirir. Bütün çentikler basılıyor,
 * ara olanlar dar ekranda `max-lg:hidden` ile gizleniyor.
 */
function hourTicks(
  timeline: NightTimeline,
  timeZone: string
): { at: number; label: string; midnight: boolean; major: boolean }[] {
  const from = timeline.from!.getTime();
  const to = timeline.to!.getTime();
  const span = to - from;

  const ticks: {
    at: number;
    label: string;
    midnight: boolean;
    major: boolean;
  }[] = [];
  const first = new Date(Math.ceil(from / 3_600_000) * 3_600_000);

  for (let t = first.getTime(); t <= to; t += 3_600_000) {
    const label = new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      timeZone,
      hour12: false,
    }).format(new Date(t));
    const hour = Number(label);
    if (Number.isNaN(hour)) continue;
    ticks.push({
      at: (t - from) / span,
      label,
      midnight: hour === 0,
      major: hour % 3 === 0,
    });
  }
  return ticks;
}

/**
 * Ay eğrisinin parçaları — ufkun ÜSTÜNDEKİ örnekler.
 *
 * Parçalara ayrılıyor çünkü ay bir gecede batıp yeniden doğabilir. Tek
 * bir polyline çizmek, ayın ufkun altında geçirdiği saatleri düz bir
 * çizgiyle "orada" gibi gösterirdi.
 */
function curveSegments(
  samples: NightTimeline['moonAltitudes']
): { at: number; altitude: number }[][] {
  const pieces: { at: number; altitude: number }[][] = [];
  let current: { at: number; altitude: number }[] = [];

  for (const sample of samples) {
    if (sample.altitude > 0) {
      current.push(sample);
    } else if (current.length > 0) {
      pieces.push(current);
      current = [];
    }
  }
  if (current.length > 0) pieces.push(current);
  return pieces.filter((piece) => piece.length > 1);
}

export function NightTimelineChart({
  timeline,
  timeZone,
  nowAt,
  markAt = null,
}: Props) {
  const clock = (date: Date) => formatClock(date, timeZone);

  const ticks = useMemo(
    () => (timeline.from ? hourTicks(timeline, timeZone) : []),
    [timeline, timeZone]
  );

  const curves = useMemo(
    () => curveSegments(timeline.moonAltitudes),
    [timeline.moonAltitudes]
  );

  const peak = useMemo(() => {
    let best: { at: number; altitude: number } | null = null;
    for (const sample of timeline.moonAltitudes) {
      if (sample.altitude > 0 && (!best || sample.altitude > best.altitude)) {
        best = sample;
      }
    }
    return best;
  }, [timeline.moonAltitudes]);

  if (!timeline.from || !timeline.to) {
    return (
      <p className="rounded-card border border-border bg-surface-2 px-3 py-6 text-center text-meta text-muted-foreground">
        Bu enlemde güneş bugün ufkun altına inmiyor; gece çizelgesi
        çizilemedi.
      </p>
    );
  }

  const dark = timeline.dark;
  const darkMinutes = dark
    ? Math.round((dark.to.getTime() - dark.from.getTime()) / 60_000)
    : 0;

  const pct = (value: number) => `${(value * 100).toFixed(3)}%`;
  /** Yükseklik (derece) → SVG y ekseni (0 üst, 100 alt). */
  const y = (altitude: number) =>
    100 - Math.min(1, Math.max(0, altitude / 90)) * CURVE_BAND * 100;

  /*
   * ERİŞİLEBİLİR ÖZET. Çizelge tamamen görsel; ekran okuyucu için aynı
   * bilgi bir cümlede veriliyor. `aria-hidden` katmanlara tek tek
   * konmuyor — kabın kendisi `img` rolü taşıyor ve içindekiler onun
   * adının parçası değil.
   */
  const summary = dark
    ? `Gece ${clock(timeline.from)} ile ${clock(timeline.to)} arası. ` +
      `Tam karanlık ${clock(dark.from)}–${clock(dark.to)}, ${formatDuration(darkMinutes)}. ` +
      (timeline.moonlessMinutes > 0
        ? `Aysız karanlık ${formatDuration(timeline.moonlessMinutes)}.`
        : 'Karanlık boyunca ay ufkun üstünde.')
    : `Gece ${clock(timeline.from)} ile ${clock(timeline.to)} arası; tam karanlık oluşmuyor.`;

  return (
    <div>
      {/*
        Saat kadranı — çizelgenin üstünde, oranla konumlandırılmış.

        Uçlardaki çentikler ORTALANMIYOR: %0'daki bir etiketin yarısı
        kabın soluna taşar ve dar ekranda kırpılır. Baştaki sola,
        sondaki sağa yaslanıyor; aradakiler ortalı.
      */}
      <div aria-hidden className="relative mb-1 h-4">
        {ticks.map((tick) => (
          <span
            key={tick.at}
            className={cn(
              'num absolute top-0 text-meta leading-4',
              tick.major ? '' : 'max-lg:hidden',
              tick.at < 0.03
                ? 'translate-x-0'
                : tick.at > 0.97
                  ? '-translate-x-full'
                  : '-translate-x-1/2',
              tick.midnight ? 'text-muted-foreground' : 'text-faint'
            )}
            style={{ left: pct(tick.at) }}
          >
            {tick.label}
          </span>
        ))}
      </div>

      <div
        role="img"
        aria-label={summary}
        className="relative h-[46px] overflow-hidden rounded-card border border-border-strong lg:h-[58px]"
        style={{ backgroundColor: SEGMENT_FILL.dark }}
      >
        {timeline.segments.map((segment) => (
          <span
            key={`${segment.kind}-${segment.start}`}
            title={SEGMENT_LABEL[segment.kind]}
            className="absolute inset-y-0"
            style={{
              left: pct(segment.start),
              width: pct(segment.span),
              background: SEGMENT_FILL[segment.kind],
            }}
          />
        ))}

        {/*
          AY EĞRİSİ. `preserveAspectRatio="none"` ile eksene geriliyor;
          çizgi kalınlığı `vector-effect` sayesinde gerilmiyor — aksi
          hâlde geniş ekranda saç teli, dar ekranda kalın bir bant
          olurdu.
        */}
        {curves.length > 0 && (
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            {curves.map((piece) => {
              const line = piece
                .map((s) => `${(s.at * 100).toFixed(3)},${y(s.altitude).toFixed(3)}`)
                .join(' ');
              const first = piece[0];
              const last = piece[piece.length - 1];
              return (
                <g key={first.at}>
                  <polygon
                    points={`${(first.at * 100).toFixed(3)},100 ${line} ${(last.at * 100).toFixed(3)},100`}
                    fill={MOON}
                    opacity={0.16}
                  />
                  <polyline
                    points={line}
                    fill="none"
                    stroke={MOON}
                    strokeWidth={1.25}
                    strokeOpacity={0.7}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Ay diski zirvede — eğrinin nereye tırmandığını tek bakışta verir. */}
        {peak && (
          <span
            aria-hidden
            className="absolute h-[11px] w-[11px] -translate-x-1/2 translate-y-1/2 rounded-full"
            style={{
              left: pct(peak.at),
              bottom: `${100 - y(peak.altitude)}%`,
              backgroundColor: MOON,
              boxShadow: `0 0 12px ${MOON}99`,
            }}
          />
        )}

        {/*
          TAM KARANLIK KUTUSU. Bantların üstünde duruyor ve rengiyle
          değil KENARLARIYLA konuşuyor: karanlık bandının rengi zaten
          siyah, onu bir kez daha koyulaştırmak bir şey söylemezdi.
        */}
        {dark && (
          <span
            aria-hidden
            className="absolute inset-y-0 border-x-2"
            style={{
              left: pct(dark.start),
              width: pct(dark.span),
              borderColor: DARK_EDGE,
              backgroundColor: `${DARK_EDGE}12`,
            }}
          >
            {dark.span >= LABEL_MIN_SPAN && (
              <span
                style={{ color: DARK_EDGE }}
                className="absolute inset-x-0 top-1.5 text-center text-meta font-semibold leading-none"
              >
                <span className="caps">Tam karanlık</span>
                <span className="num"> · {formatDuration(darkMinutes)}</span>
              </span>
            )}
          </span>
        )}

        {/*
          HEDEF ZİRVE İMLECİ. Üçüncü kolonda bir satırın üstüne gelince
          (ya da klavyeyle odaklanınca) o nesnenin zirve anı burada
          işaretleniyor.

          İki kolonu birbirine bağlayan tek şey bu: "M 31 saat 02:14'te
          zirve yapıyor" satırı okunabilir bir bilgi, ama o anın gecenin
          neresine düştüğü — karanlığın içinde mi, ay batmadan mı —
          ancak eksende görülüyor.
        */}
        {markAt !== null && (
          <span
            aria-hidden
            className="absolute inset-y-0 w-px"
            style={{ left: pct(markAt), backgroundColor: MARK }}
          >
            <span
              className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rotate-45"
              style={{ backgroundColor: MARK }}
            />
          </span>
        )}

        {/* "Şu an" yalnızca gece içindeyken; gündüz bir uca yapışıp
            orada olmayan bir anı gösterirdi. */}
        {nowAt !== null && (
          <span
            aria-hidden
            className="absolute inset-y-0 w-[2px]"
            /*
              Şeffaflık `opacity` ile DEĞİL, rengin alfasıyla: `opacity`
              çocuklara da iniyor ve üstteki "ŞU AN" plakasını da
              soldururdu. Plaka okunması gereken bir etiket, çizginin
              tonu ise bantları tamamen kapatmasın diye kısılıyor.
            */
            style={{ left: pct(nowAt), backgroundColor: `${NOW}d9` }}
          >
            <span
              style={{ backgroundColor: NOW, color: NOW_TEXT }}
              className={cn(
                'num absolute top-0 rounded-b-[3px] px-1.5 py-px text-meta font-semibold leading-tight',
                // Uçlarda etiket dışarı taşmasın.
                nowAt > 0.9
                  ? 'right-0'
                  : nowAt < 0.1
                    ? 'left-0'
                    : 'left-1/2 -translate-x-1/2'
              )}
            >
              ŞU AN
            </span>
          </span>
        )}
      </div>

      {/* Alt etiketler: batış/doğuş uçlarda, karanlık sınırları oranında. */}
      <div aria-hidden className="relative mt-1 h-4">
        <span className="absolute left-0 top-0 text-meta leading-4 text-muted-foreground">
          <span className="num">{clock(timeline.from)}</span>{' '}
          <span className="text-faint">batış</span>
        </span>

        {dark && dark.start > 0.14 && (
          <span
            className="num absolute top-0 -translate-x-1/2 text-meta leading-4 text-primary"
            style={{ left: pct(dark.start) }}
          >
            {clock(dark.from)}
          </span>
        )}
        {dark && dark.start + dark.span < 0.86 && (
          <span
            className="num absolute top-0 -translate-x-1/2 text-meta leading-4 text-primary"
            style={{ left: pct(dark.start + dark.span) }}
          >
            {clock(dark.to)}
          </span>
        )}

        <span className="absolute right-0 top-0 text-meta leading-4 text-muted-foreground">
          <span className="text-faint">doğuş</span>{' '}
          <span className="num">{clock(timeline.to)}</span>
        </span>
      </div>

      {/* Lejant: renkleri isimlendirmeden çubuk okunamaz. */}
      <ul className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-meta text-faint">
        {(['civil', 'nautical', 'astronomical', 'dark'] as SegmentKind[]).map(
          (kind) => (
            <li key={kind} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-[9px] w-[9px] rounded-card border border-border"
                style={{ background: SEGMENT_FILL[kind] }}
              />
              {SEGMENT_LABEL[kind]}
            </li>
          )
        )}
        <li className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-[2px] w-[9px] rounded-full"
            style={{ backgroundColor: MOON, opacity: 0.75 }}
          />
          ay yüksekliği
        </li>
      </ul>
    </div>
  );
}

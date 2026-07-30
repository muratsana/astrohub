import { useMemo } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useLocationContext } from '@/features/location/LocationContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { useSkyConditions } from '@/features/weather/useSkyConditions';
import { seeingLabel, observingVerdict } from '@/features/weather/seeing';
import { dewRisk } from '@/features/weather/openMeteo';
import { targets } from '@/features/targets/data';
import {
  nightTimeline,
  type NightTimeline,
  type SegmentKind,
} from '@/domain/astronomy/nightTimeline';
import {
  moonPhase,
  moonRiseSet,
  targetNightPeak,
  parseRa,
  parseDec,
  formatClock,
  formatDuration,
  formatAltitude,
} from '@/domain/astronomy/ephemeris';
import { cn } from '@/lib/cn';

/**
 * BU GECE — ana sayfanın enstrüman paneli (§7.9).
 *
 * YENİDEN TASARIM GEREKÇESİ
 * Önceki sürüm altı ölçüm hücresiydi: karanlık, süre, ay, bulut, seeing,
 * çiylenme. Her sayı doğruydu ama hiçbiri gecenin ŞEKLİNİ vermiyordu.
 * Astrofotoğrafçının sorduğu soru tek tek sayılar değil, sıra: "Ne zaman
 * kurabilirim, gerçek karanlık ne zaman başlıyor, ay ne zaman çekiliyor,
 * elimde kaç saat kalıyor?" Altı kutu bu soruyu cevaplamıyordu çünkü
 * cevap kutuların arasındaki ilişkide.
 *
 * ŞİMDİ MERKEZDE BİR ZAMAN ÇİZELGESİ var: batıştan doğuşa uzanan tek bir
 * eksen, üstünde alacakaranlık katmanları ve tam karanlık bandı, ayrıca
 * ayın ufkun üstünde olduğu aralık. Bir bakışta okunuyor ve ölçekli —
 * yaz gecesinde ince, kış gecesinde kalın bir karanlık bandı görüyorsunuz.
 *
 * EN ÖNEMLİ SAYI ARTIK "AYSIZ KARANLIK". Astronomik karanlık süresi tek
 * başına yanıltıcı: dolunay altındaki altı saat, aysız üç saatten kötü.
 * Panel bu farkı hesaplayıp ayrı bir sayı olarak veriyor — çizelgede de
 * gözle görülüyor.
 *
 * Değerler gerçek efemeris hesabından gelir; API anahtarı ya da ağ isteği
 * yoktur. Hava ve seeing dış servisten gelir; servise ulaşılamazsa o üç
 * hücre "—" gösterir ve panelin geri kalanı çalışmaya devam eder.
 */
export function TonightPanel() {
  const {
    location,
    permission,
    shouldOfferGeolocation,
    requestDeviceLocation,
    dismissGeolocationOffer,
  } = useLocationContext();
  const { theme } = useTheme();

  // Gün ve konum değişmedikçe yeniden hesaplanmaz — tarama tabanlı arama
  // her render'da çalışmamalı.
  const dayKey = new Date().toDateString();

  const sky = useMemo(() => {
    const date = new Date(dayKey);
    const timeline = nightTimeline(date, location.latitude, location.longitude);
    const moon = moonPhase(date);
    const moonTimes = moonRiseSet(date, location.latitude, location.longitude);

    const visible = timeline.dark
      ? targets
          .map((target) => {
            const coords = {
              ra: parseRa(target.ra),
              dec: parseDec(target.dec),
            };
            if (Number.isNaN(coords.ra) || Number.isNaN(coords.dec)) return null;
            const peak = targetNightPeak(
              coords,
              { start: timeline.dark!.from, end: timeline.dark!.to },
              location.latitude,
              location.longitude
            );
            return peak.neverRises ? null : { target, peak };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null)
          .sort((a, b) => b.peak.peakAltitude - a.peak.peakAltitude)
          .slice(0, 6)
      : [];

    return { timeline, moon, moonTimes, visible };
  }, [dayKey, location.latitude, location.longitude]);

  const { timeline, moon, moonTimes, visible } = sky;
  const conditions = useSkyConditions();
  const weather = conditions.data;

  const verdict = weather
    ? observingVerdict(weather.cloudCover, weather.seeing?.index ?? null)
    : null;
  const dew = weather ? dewRisk(weather.temperature, weather.dewPoint) : null;

  const dateLabel = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  const tz = location.timeZone;
  const clock = (date: Date | null) => formatClock(date, tz);

  /** Hava servisine ulaşılamadığında hücrelerin ortak alt metni. */
  const weatherHint =
    conditions.status === 'loading'
      ? 'alınıyor…'
      : conditions.status === 'offline'
        ? // Tek dosya önizlemede dış istek yapılamaz; "servise
          // ulaşılamadı" demek burada yanlış olurdu — servis ayakta,
          // isteği yapan derleme kapalı.
          'önizlemede dış servis kapalı'
        : 'servise ulaşılamadı';

  return (
    <section className="relative isolate">
      {/*
        GECE ZEMİNİ. Gradyan token'lardan besleniyor, yani üç temada da
        doğru yönde çalışıyor. Yıldızlar yalnızca koyu ve saha modunda:
        açık temada aynı noktalar gökyüzü değil, ekranda toz gibi
        okunuyordu.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(125% 145% at 50% -30%, var(--color-surface-2) 0%, var(--color-surface-1) 38%, var(--color-background) 72%)',
          }}
        />
        {theme !== 'light' && <BackdropStars />}
      </div>

      <Container className="border-b border-border py-5 sm:py-6">
        <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-[20px] text-foreground sm:text-[23px]">Bu Gece</h1>
          <span className="label">{location.label}</span>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span className="tabular text-[11px] text-muted-foreground">
            {dateLabel}
          </span>

          {/* Sayının kaynağı görünür: iki servis aynı saat için farklı
              bulut yüzdesi verebiliyor ve kullanıcı hangisine baktığını
              bilmeden ikisini karşılaştıramaz. */}
          {weather && (
            <span className="text-[10px] text-faint">
              {weather.source === 'meteoblue' ? 'meteoblue' : 'Open-Meteo'}
            </span>
          )}

          {verdict && (
            <span
              className={cn(
                'ml-auto rounded-card border px-2.5 py-1 text-[10.5px] font-medium tracking-[0.04em]',
                {
                  success: 'border-success/45 bg-success/10 text-success',
                  primary: 'border-primary/45 bg-primary/10 text-primary',
                  warning: 'border-warning/45 bg-warning/10 text-warning',
                  danger: 'border-danger/45 bg-danger/10 text-danger',
                }[verdict.tone]
              )}
            >
              {verdict.label}
            </span>
          )}
        </header>

        {shouldOfferGeolocation && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-card border border-cold/40 bg-surface-1 px-3 py-2.5">
            <p className="w-full text-[11.5px] leading-relaxed text-muted-foreground sm:w-auto sm:flex-1">
              Hesaplar <span className="text-foreground">{location.label}</span>{' '}
              için yapılıyor.{' '}
              <span className="text-cold">Koordinat sunucumuza gönderilmez</span>
              ; yalnızca tarayıcında kalır.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={requestDeviceLocation}>
                Konum izni ver
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissGeolocationOffer}>
                Şehir seçeyim
              </Button>
            </div>
          </div>
        )}

        {permission === 'denied' && (
          <p className="mb-3 rounded-card border border-border bg-surface-1 px-3 py-2 text-[11px] text-muted-foreground">
            Konum izni alınamadı — hesaplar seçili şehir üzerinden yapılıyor.
            Üstteki konum seçiciden değiştirebilirsin.
          </p>
        )}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <div className="rounded-card border border-border-strong bg-surface-1/85 p-3">
            <NightBar timeline={timeline} timeZone={tz} />

            {/*
              Ölçümler çizelgenin altında tek bir sıra. Önce altı ayrı
              kutuydu ve her biri kendi çerçevesiyle eşit ağırlık
              iddia ediyordu; oysa gecenin şekli çizelgede, bunlar onu
              tamamlayan sayılar.
            */}
            <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat
                label="Karanlık"
                value={
                  timeline.dark
                    ? `${clock(timeline.dark.from)}→${clock(timeline.dark.to)}`
                    : 'yok'
                }
                hint={
                  timeline.dark
                    ? formatDuration(
                        Math.round(
                          (timeline.dark.to.getTime() -
                            timeline.dark.from.getTime()) /
                            60_000
                        )
                      )
                    : 'bu enlemde oluşmuyor'
                }
                tone="cold"
              />

              {/*
                AYSIZ KARANLIK panelin asıl sayısı ve bu yüzden vurgulu.
                Dolunay altındaki altı saat, aysız üç saatten kötüdür;
                yalnızca "karanlık süresi" göstermek kullanıcıyı iyi bir
                gece sanmaya götürüyordu.
              */}
              <Stat
                label="Aysız karanlık"
                value={
                  /* Sıfır bir cevaptır, veri yokluğu değil: "ay bütün
                     gece yukarıda" bilinen bir sonuç ve sönük bir tire
                     onu "bilmiyoruz" gibi gösteriyordu. */
                  !timeline.dark
                    ? '—'
                    : timeline.moonlessMinutes === 0
                      ? 'yok'
                      : formatDuration(timeline.moonlessMinutes)
                }
                hint={
                  timeline.moonlessMinutes > 0
                    ? 'ay ufkun altında'
                    : timeline.dark
                      ? 'karanlık boyunca ay yukarıda'
                      : '—'
                }
                tone="primary"
                emphasis
              />

              <Stat
                label="Ay"
                value={`%${Math.round(moon.illumination * 100)}`}
                hint={
                  moonTimes.set
                    ? `batar ${clock(moonTimes.set)}`
                    : moonTimes.rise
                      ? `doğar ${clock(moonTimes.rise)}`
                      : moon.name.toLocaleLowerCase('tr-TR')
                }
                tone="muted"
                visual={<MoonDisc illumination={moon.illumination} />}
              />

              <Stat
                label="Bulut"
                value={weather ? `%${Math.round(weather.cloudCover)}` : '—'}
                hint={
                  weather
                    ? weather.layers
                      ? /* Katman ayrımı varsa onu göster: alçak bulut
                           geceyi bitirir, yüksek sirrus yalnızca
                           zorlaştırır. Toplam yüzde bu farkı gizliyor. */
                        `alçak %${Math.round(weather.layers.low)} · yüksek %${Math.round(weather.layers.high)}`
                      : `${Math.round(weather.temperature)}°C · nem %${Math.round(weather.humidity)}`
                    : weatherHint
                }
                tone="cold"
                meter={weather ? 1 - weather.cloudCover / 100 : null}
              />

              <Stat
                label="Seeing"
                value={weather?.seeing ? seeingLabel(weather.seeing.index) : '—'}
                hint={
                  weather
                    ? weather.seeing
                      ? `tahmin · ${weather.seeing.driver}`
                      : 'üst atmosfer verisi yok'
                    : weatherHint
                }
                tone="primary"
                meter={weather?.seeing ? 1 - (weather.seeing.index - 1) / 4 : null}
              />

              <Stat
                label="Çiylenme"
                value={dew ? dew.label : '—'}
                hint={
                  weather
                    ? `çiy noktası ${Math.round(weather.dewPoint)}°C`
                    : weatherHint
                }
                tone={dew?.tone === 'danger' ? 'muted' : 'cold'}
                meter={
                  weather
                    ? clamp((weather.temperature - weather.dewPoint) / 8, 0, 1)
                    : null
                }
              />
            </div>
          </div>

          {/* Bu gece yükselen hedefler */}
          <div className="rounded-card border border-border bg-surface-1/85">
            <header className="flex items-baseline justify-between border-b border-border px-3 py-2">
              <h2 className="label text-foreground">Bu gece yüksek</h2>
              <span className="label">zirve · yükseklik</span>
            </header>

            {visible.length === 0 ? (
              <p className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                Bu gece karanlık pencere oluşmuyor; hedef sıralaması
                hesaplanamadı.
              </p>
            ) : (
              <ul>
                {visible.map(({ target, peak }) => (
                  <li key={target.slug}>
                    <Link
                      to={`/hedef/${target.slug}`}
                      className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-1.5 transition-colors last:border-0 hover:bg-surface-2"
                    >
                      <span className="min-w-0 truncate text-[11.5px] text-foreground">
                        <span className="font-medium">{target.catalog}</span>
                        <span className="ml-1.5 text-muted-foreground">
                          {target.name}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-[11px] text-cold">
                        {clock(peak.peakAt)}
                        <span className="ml-1.5 text-primary">
                          {formatAltitude(peak.peakAltitude)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-border px-3 py-2">
              <ButtonLink to="/hedefler" size="sm" variant="ghost">
                Tüm katalog
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/* ══════════════════════════════════════════════════════════════════════
   GECE ÇİZELGESİ
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Alacakaranlık katmanlarının renkleri — TEMADAN BAĞIMSIZ.
 *
 * Bunlar arayüz yüzeyi değil, gökyüzünün kendisinin çizimi: güneş
 * battıkça koyulaşan bir gökyüzü, açık temada açık renk olmaz. Aynı
 * gerekçe yer tutucu gökyüzü görsellerinde de geçerli (bkz. StarField).
 */
const SEGMENT_COLOR: Record<SegmentKind, string> = {
  civil: '#2f4874',
  nautical: '#1d2c4c',
  astronomical: '#111b30',
  dark: '#05080f',
};

const SEGMENT_LABEL: Record<SegmentKind, string> = {
  civil: 'sivil alacakaranlık',
  nautical: 'denizci alacakaranlığı',
  astronomical: 'astronomik alacakaranlık',
  dark: 'tam karanlık',
};

function NightBar({
  timeline,
  timeZone,
}: {
  timeline: NightTimeline;
  timeZone: string;
}) {
  if (!timeline.from || !timeline.to) {
    return (
      <p className="rounded-card border border-border bg-surface-2 px-3 py-6 text-center text-[11px] text-muted-foreground">
        Bu enlemde güneş bugün ufkun altına inmiyor; gece çizelgesi
        çizilemedi.
      </p>
    );
  }

  const pct = (value: number) => `${(value * 100).toFixed(3)}%`;

  return (
    <figure>
      <figcaption className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="label">Gece çizelgesi</span>
        <span className="tabular text-[10px] text-faint">
          {formatClock(timeline.from, timeZone)} →{' '}
          {formatClock(timeline.to, timeZone)}
        </span>
      </figcaption>

      <div className="relative h-11 overflow-hidden rounded-card border border-border-strong sm:h-12">
        {timeline.segments.map((segment) => (
          <span
            key={`${segment.kind}-${segment.start}`}
            title={SEGMENT_LABEL[segment.kind]}
            className="absolute inset-y-0"
            style={{
              left: pct(segment.start),
              width: pct(segment.span),
              backgroundColor: SEGMENT_COLOR[segment.kind],
            }}
          />
        ))}

        {/*
          AY BANDI ÇİZELGENİN ALT ŞERİDİNDE, katmanların üstünü
          örtmeden. Ay yukarıdayken tam karanlık bandı hâlâ "karanlık"
          ama gözlem koşulu değil — iki bilgi birbirini silmemeli, üst
          üste görünmeli.
        */}
        {timeline.moonUp.map((piece) => (
          <span
            key={`moon-${piece.start}`}
            title="ay ufkun üstünde"
            className="absolute bottom-0 h-[9px] border-t border-[#f0c063]/70 bg-[#f0c063]/35"
            style={{ left: pct(piece.start), width: pct(piece.span) }}
          />
        ))}

        {/* Karanlık bandının kenarları: renk farkı tek başına yeterince
            keskin değil, sınır çizgisi saatle eşleşmeyi kolaylaştırıyor. */}
        {timeline.dark && (
          <>
            <span
              className="absolute inset-y-0 w-px bg-primary/70"
              style={{ left: pct(timeline.dark.start) }}
            />
            <span
              className="absolute inset-y-0 w-px bg-primary/70"
              style={{ left: pct(timeline.dark.start + timeline.dark.span) }}
            />
          </>
        )}

        {/* "Şimdi" yalnızca gece içindeyken çiziliyor; gündüz bir uca
            yapışıp orada olmayan bir anı gösterirdi. */}
        {timeline.now !== null && (
          <span
            className="absolute inset-y-0 w-[2px] bg-foreground shadow-[0_0_6px_var(--color-background)]"
            style={{ left: pct(timeline.now) }}
          >
            <span className="absolute -top-px left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-foreground" />
          </span>
        )}
      </div>

      {/* Saat etiketleri — çizelgenin altında, oranla konumlandırılmış. */}
      <div className="relative mt-1 h-3.5">
        <TimeTick at={0} label={formatClock(timeline.from, timeZone)} />
        {timeline.dark && (
          <>
            <TimeTick
              at={timeline.dark.start}
              label={formatClock(timeline.dark.from, timeZone)}
              accent
            />
            <TimeTick
              at={timeline.dark.start + timeline.dark.span}
              label={formatClock(timeline.dark.to, timeZone)}
              accent
            />
          </>
        )}
        <TimeTick at={1} label={formatClock(timeline.to, timeZone)} />
      </div>

      {/* Lejant: renkleri isimlendirmeden çubuk okunamaz. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-faint">
        {(['civil', 'nautical', 'astronomical', 'dark'] as SegmentKind[]).map(
          (kind) => (
            <span key={kind} className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="h-2 w-2 rounded-[1px] border border-border"
                style={{ backgroundColor: SEGMENT_COLOR[kind] }}
              />
              {SEGMENT_LABEL[kind]}
            </span>
          )
        )}
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden
            className="h-2 w-2 rounded-[1px] border border-[#f0c063]/70 bg-[#f0c063]/35"
          />
          ay yukarıda
        </span>
      </div>
    </figure>
  );
}

/**
 * Saat etiketi.
 *
 * Uçlardaki etiketler dışarı taşmasın diye hizalama orana göre
 * değişiyor: baştaki sola, sondaki sağa, aradakiler ortaya yaslanır.
 */
function TimeTick({
  at,
  label,
  accent,
}: {
  at: number;
  label: string;
  accent?: boolean;
}) {
  const edge = at < 0.02 ? 'start' : at > 0.98 ? 'end' : 'middle';
  return (
    <span
      className={cn(
        'tabular absolute top-0 text-[10px]',
        accent ? 'text-primary' : 'text-faint'
      )}
      style={{
        left: `${at * 100}%`,
        transform:
          edge === 'start'
            ? 'none'
            : edge === 'end'
              ? 'translateX(-100%)'
              : 'translateX(-50%)',
      }}
    >
      {label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ÖLÇÜM HÜCRESİ
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Tek bir ölçüm.
 *
 * Kendi çerçevesi yok: altı ölçüm altı kutu olduğunda hepsi eşit ağırlık
 * iddia ediyordu. Gecenin şekli çizelgede; bunlar onu tamamlayan
 * sayılar ve tek bir sıra hâlinde duruyorlar.
 *
 * `meter` verildiğinde değerin altında ince bir çubuk çiziliyor: 0 kötü,
 * 1 iyi. Bir sayının "iyi mi" olduğunu bilmek ölçeği bilmeyi gerektirir
 * ve %47 bulutun ne demek olduğunu herkes bilmez.
 */
function Stat({
  label,
  value,
  hint,
  tone,
  meter,
  visual,
  emphasis,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'primary' | 'cold' | 'muted';
  meter?: number | null;
  visual?: React.ReactNode;
  emphasis?: boolean;
}) {
  const empty = value === '—';
  const toneClass = {
    primary: 'text-primary',
    cold: 'text-cold',
    muted: 'text-foreground',
  }[tone];

  return (
    <div className={cn('min-w-0', emphasis && 'lg:-my-1')}>
      <p className="label">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {/* Veri yokken kalın ve renkli bir "—" ekranda kısa bir renkli
            çubuğa dönüşüp gösterge sanılıyordu; boş değer sönük ve
            ince. */}
        <p
          className={cn(
            'tabular min-w-0 truncate font-display leading-none',
            empty
              ? 'text-[17px] font-normal text-faint'
              : cn(
                  'font-bold',
                  emphasis ? 'text-[20px] sm:text-[22px]' : 'text-[17px]',
                  toneClass
                )
          )}
        >
          {value}
        </p>
        {visual && (
          <span aria-hidden className="shrink-0">
            {visual}
          </span>
        )}
      </div>

      {meter !== undefined && meter !== null && (
        <div
          aria-hidden
          className="mt-1.5 h-[3px] w-full max-w-[92px] overflow-hidden rounded-full bg-border"
        >
          <div
            className={cn(
              'h-full rounded-full',
              meter > 0.66
                ? 'bg-success'
                : meter > 0.33
                  ? 'bg-warning'
                  : 'bg-danger'
            )}
            style={{ width: `${clamp(meter, 0, 1) * 100}%` }}
          />
        </div>
      )}

      <p className="mt-1.5 truncate text-[10px] leading-snug text-faint">
        {hint}
      </p>
    </div>
  );
}

/**
 * Ay evresi diski.
 *
 * Aydınlanma oranı bir daire üzerinde iki yay ile çiziliyor: dış kenar
 * sabit, iç terminatör oranla birlikte genişleyip daralıyor. Basit bir
 * "yarım daire" çizimi %20 ile %80 dolunayı aynı gösterirdi.
 */
function MoonDisc({ illumination }: { illumination: number }) {
  const r = 12;
  const k = clamp(illumination, 0, 1);
  // Terminatörün yatay yarıçapı: 0'da tam elips (yeni ay), 1'de düz çizgi.
  const rx = r * Math.abs(1 - 2 * k);
  const sweep = k > 0.5 ? 1 : 0;

  return (
    <svg viewBox="0 0 30 30" fill="none" className="h-[22px] w-[22px]">
      <circle
        cx="15"
        cy="15"
        r={r}
        className="fill-surface-3 stroke-border-strong"
        strokeWidth="1.2"
      />
      <path
        d={`M15 3 A ${r} ${r} 0 0 1 15 27 A ${rx} ${r} 0 0 ${sweep} 15 3 Z`}
        className="fill-primary"
      />
    </svg>
  );
}

/**
 * Zemin yıldızları.
 *
 * Konumlar sabit bir listeden geliyor, rastgele değil: her ziyarette
 * aynı gökyüzü. Rastgele üretim sayfanın her boyamasında yıldızları
 * oynatır ve bu, göz ucuyla bakıldığında bir arıza gibi görünür.
 */
const BACKDROP_STARS = [
  [4, 18, 1.4], [11, 62, 1], [17, 31, 1.8], [23, 78, 1.1], [29, 12, 1.3],
  [34, 51, 1], [39, 84, 1.6], [45, 26, 1.1], [52, 66, 1.4], [57, 8, 1],
  [61, 44, 1.7], [66, 88, 1.2], [72, 21, 1.3], [77, 58, 1], [82, 35, 1.5],
  [88, 72, 1.1], [93, 15, 1.4], [97, 49, 1], [8, 41, 1.1], [26, 55, 1.2],
  [48, 92, 1], [69, 68, 1.1], [85, 5, 1.2], [14, 88, 1.3],
] as const;

function BackdropStars() {
  return (
    <div className="absolute inset-0 opacity-60">
      {BACKDROP_STARS.map(([x, y, r]) => (
        <span
          key={`${x}-${y}`}
          className="absolute rounded-full bg-faint"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${r * 2}px`,
            height: `${r * 2}px`,
          }}
        />
      ))}
    </div>
  );
}

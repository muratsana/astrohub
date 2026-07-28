import { useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useLocationContext } from '@/features/location/LocationContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { useSkyConditions } from '@/features/weather/useSkyConditions';
import { seeingLabel, observingVerdict } from '@/features/weather/seeing';
import { dewRisk } from '@/features/weather/openMeteo';
import { targets } from '@/features/targets/data';
import {
  astronomicalNight,
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
 * BU GECE — ana sayfanın üst alanı (§7.9).
 *
 * YENİDEN DÜZENLEME NOTU
 * Önceki sürüm dört büyük ölçüm kutusu + ayrı bir hedef paneli olarak iki
 * blok hâlindeydi ve ekranın yarısını yiyordu. Şimdi tek bir enstrüman
 * şeridi: solda gecenin özeti (verdict + saatler), sağda hedef listesi.
 * Ölçümler büyük kutular yerine bitişik hücrelere indi — aynı bilgi,
 * yaklaşık yarı yükseklik.
 *
 * Değerler gerçek efemeris hesabından gelir; API anahtarı ya da ağ isteği
 * yoktur (bkz. `domain/astronomy/ephemeris.ts`). Hava ve seeing artık
 * Open-Meteo'dan gelir; servis ulaşılamazsa hücreler "—" gösterir ve panel
 * çalışmaya devam eder.
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
    const night = astronomicalNight(date, location.latitude, location.longitude);
    const moon = moonPhase(date);
    const moonTimes = moonRiseSet(date, location.latitude, location.longitude);

    const visible =
      night.start && night.end
        ? targets
            .map((target) => {
              const coords = { ra: parseRa(target.ra), dec: parseDec(target.dec) };
              if (Number.isNaN(coords.ra) || Number.isNaN(coords.dec)) return null;
              const peak = targetNightPeak(
                coords,
                { start: night.start!, end: night.end! },
                location.latitude,
                location.longitude
              );
              return peak.neverRises ? null : { target, peak };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null)
            .sort((a, b) => b.peak.peakAltitude - a.peak.peakAltitude)
            .slice(0, 6)
        : [];

    return { night, moon, moonTimes, visible };
  }, [dayKey, location.latitude, location.longitude]);

  const { night, moon, moonTimes, visible } = sky;
  const conditions = useSkyConditions();
  const weather = conditions.data;

  const verdict = weather
    ? observingVerdict(weather.cloudCover, weather.seeing.index)
    : null;
  const dew = weather ? dewRisk(weather.temperature, weather.dewPoint) : null;

  const dateLabel = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  return (
    <section className="relative isolate">
      {/*
        GECE ZEMİNİ. Panelin arkasında tepeden inen bir gradyan var:
        modül düz zeminde başlayıp bitiyordu ve sayfanın en önemli
        bölümü, altındaki listelerden hiçbir şekilde ayrışmıyordu.
        Gradyan token'lardan besleniyor, yani üç temada da doğru
        yönde çalışıyor — açık temada kâğıt, koyu temada gece.

        Yıldızlar yalnızca koyu ve saha modunda: açık temada aynı
        noktalar gökyüzü değil, ekrandaki toz gibi okunuyordu.
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
                'ml-auto rounded-card border px-2 py-0.5 text-[10px] font-medium tracking-[0.03em]',
                {
                  success: 'border-success/45 text-success',
                  primary: 'border-primary/45 text-primary',
                  warning: 'border-warning/45 text-warning',
                  danger: 'border-danger/45 text-danger',
                }[verdict.tone]
              )}
            >
              {verdict.label}
            </span>
          )}
        </header>

        {shouldOfferGeolocation && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-card border border-cold/40 bg-surface-1 px-3 py-2.5">
            {/*
              Metin kısaltıldı: dört satırlık bir açıklama panelin en üstünde
              en büyük blok oluyordu ve asıl içerik olan ölçümlerin önüne
              geçiyordu. Kalması gereken tek şey karar için gereken bilgi —
              hangi konum kullanılıyor ve koordinatın nereye gittiği.
            */}
            {/* Telefonda `flex-1` metni 120 piksele sıkıştırıp yedi
                satıra bölüyordu; düğmeler cümlenin ortasına
                giriyordu. Dar ekranda metin tam satır, düğmeler
                altında. */}
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

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          {/* Ölçüm hücreleri — bitişik ızgara, hairline ayrımlı */}
          {/*
            `auto-rows-fr`: altı hücre yüksekliği eşit paylaşır. Bunsuz sol
            sütun sağdaki hedef listesi kadar geriliyor ama hücre içeriği
            üste yapışıyordu — panelin altında amaçsız bir boşluk kalıyor,
            enstrüman paneli izlenimi dağılıyordu.
          */}
          <div className="grid auto-rows-fr grid-cols-2 gap-px overflow-hidden rounded-card border border-border-strong bg-border sm:grid-cols-3">
            <Cell
              label="Astr. karanlık"
              value={
                night.neverDark
                  ? 'yok'
                  : formatClock(night.start, location.timeZone)
              }
              hint={
                night.neverDark
                  ? 'bu enlemde oluşmuyor'
                  : `bitiş ${formatClock(night.end, location.timeZone)}`
              }
              tone="primary"
              visual={
                <NightArc
                  from={clockFraction(night.start, location.timeZone)}
                  to={clockFraction(night.end, location.timeZone)}
                />
              }
            />
            <Cell
              label="Süre"
              value={formatDuration(night.durationMinutes)}
              hint="güneş −18° altında"
              tone="cold"
              visual={<DarknessBar minutes={night.durationMinutes} />}
            />
            <Cell
              label="Ay"
              value={`%${Math.round(moon.illumination * 100)}`}
              hint={
                moonTimes.set
                  ? `batar ${formatClock(moonTimes.set, location.timeZone)}`
                  : moonTimes.rise
                    ? `doğar ${formatClock(moonTimes.rise, location.timeZone)}`
                    : moon.name.toLocaleLowerCase('tr-TR')
              }
              tone={moon.illumination > 0.4 ? 'muted' : 'primary'}
              visual={<MoonDisc illumination={moon.illumination} />}
            />
            <Cell
              label="Bulut"
              value={weather ? `%${Math.round(weather.cloudCover)}` : '—'}
              hint={
                weather
                  ? weather.layers
                    ? /* Katman ayrımı varsa onu göster: alçak bulut geceyi
                         bitirir, yüksek sirrus yalnızca zorlaştırır.
                         Toplam yüzde bu farkı gizliyor. */
                      `alçak %${Math.round(weather.layers.low)} · orta %${Math.round(weather.layers.mid)} · yüksek %${Math.round(weather.layers.high)}`
                    : `${Math.round(weather.temperature)}°C · nem %${Math.round(weather.humidity)}`
                  : conditions.status === 'loading'
                    ? 'alınıyor…'
                    : conditions.status === 'offline'
                      // Tek dosya önizlemede dış istek yapılamaz; "servise
                      // ulaşılamadı" demek burada yanlış olurdu — servis
                      // ayakta, isteği yapan derleme kapalı.
                      ? 'önizlemede dış servis kapalı'
                      : 'servise ulaşılamadı'
              }
              tone="cold"
              visual={<CloudRing cover={weather ? weather.cloudCover : null} />}
            />
            <Cell
              label="Seeing"
              value={weather ? seeingLabel(weather.seeing.index) : '—'}
              hint={
                weather
                  ? `tahmin · ${weather.seeing.driver}`
                  : 'yüksek irtifa rüzgârından'
              }
              tone="primary"
              visual={<SeeingDisc index={weather ? weather.seeing.index : null} />}
            />
            <Cell
              label="Çiylenme"
              value={dew ? dew.label : '—'}
              hint={
                weather
                  ? `çiy noktası ${Math.round(weather.dewPoint)}°C`
                  : 'ısıtıcı bandı kararı için'
              }
              tone={dew?.tone === 'danger' ? 'muted' : 'cold'}
              visual={
                <DewDrop
                  spread={weather ? weather.temperature - weather.dewPoint : null}
                />
              }
            />
          </div>

          {/* Bu gece yükselen hedefler */}
          <div className="rounded-card border border-border bg-surface-1">
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
                        {formatClock(peak.peakAt, location.timeZone)}
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

/**
 * Ölçüm hücresi. Önceki `Readout` kutusundan farkı: kendi kenarlığı ve
 * yuvarlaması yok — çerçeveyi saran ızgara çiziyor. Böylece altı ölçüm
 * altı ayrı kutu değil, tek bir enstrüman paneli gibi duruyor.
 */
function Cell({
  label,
  value,
  hint,
  tone,
  visual,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'primary' | 'cold' | 'muted';
  /**
   * Hücrenin sağında duran görsel.
   *
   * Fotoğraf değil, **ölçüm çizimi**: ay evresinin diski, karanlık
   * penceresinin çubuğu, bulut örtüsünün doluluğu. Bir veri panelinde
   * dekoratif fotoğraf gürültüdür; bu çizimler sayıyı tekrar etmiyor,
   * onu bir bakışta okunur hâle getiriyor.
   */
  visual?: React.ReactNode;
}) {
  const toneClass = {
    primary: 'text-primary',
    cold: 'text-cold',
    muted: 'text-muted-foreground',
  }[tone];

  /*
    ÇİZİM ARTIK METNİN ÜSTÜNDE DEĞİL, YANINDA.
    Önce mutlak konumla sağ kenara yapıştırılmıştı ve 30px'ti; küçük
    olmasının tek sebebi metnin altına girmemesiydi. Kendi sütununa
    alınınca boyut kısıtı kalktı: telefonda 42, sonrasında 54 piksel.
    Aynı çizimler, okunur bir ölçekte.
  */
  return (
    <div className="flex items-center gap-2.5 overflow-hidden bg-surface-1/85 px-3 py-3.5 sm:gap-3">
      <div className="min-w-0 flex-1">
        <p className="label">{label}</p>
        {/*
          VERİ YOKKEN TİRE, ÖLÇÜM GİBİ GÖRÜNMEMELİ. 24 punto kalın ve
          renkli bir "—" ekranda kısa bir renkli çubuğa dönüşüyordu:
          uzaktan bakan biri onu bir gösterge sanıyor. Boş değer artık
          sönük ve ince — bir sayının yokluğu, sayı gibi durmuyor.
        */}
        <p
          className={cn(
            'tabular mt-1 font-display leading-none',
            value === '—'
              ? 'text-[20px] font-normal text-faint'
              : cn('text-[22px] font-bold sm:text-[24px]', toneClass)
          )}
        >
          {value}
        </p>
        <p className="mt-1.5 truncate text-[10.5px] leading-snug text-faint">
          {hint}
        </p>
      </div>
      {visual && (
        <span aria-hidden className="shrink-0">
          {visual}
        </span>
      )}
    </div>
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

/* ══════════════════════════════════════════════════════════════════════
   HÜCRE GÖRSELLERİ

   Altısı da saf SVG ve **veriyle çizilir**: ay diskindeki gölge gerçek
   aydınlanma oranından, karanlık çubuğu gerçek süreden, kadranın yayı
   gerçek başlangıç–bitiş saatinden, bulut halkası gerçek örtü
   yüzdesinden, seeing diski indeksten, damla ise sıcaklık–çiy noktası
   açıklığından. Sabit bir ikon seti daha kolay olurdu ama ikon yalnızca
   "bu hücre ay hakkında" der; bu çizimler değeri gösterir.

   Altı hücrenin altısında da çizim olmasının ikinci bir sebebi var:
   üçünde çizim, üçünde boşluk olduğunda ızgara yarım kalmış görünüyordu.
   Ölçüm panelinde boşluk, veri yokluğu gibi okunur.

   Veri yoksa çizim boş çerçevesiyle kalır — "%0 bulut" ile "bilmiyoruz"
   asla aynı görünmemeli.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Çizim kutusu — altı hücrenin tamamı aynı ölçüde.
 *
 * Ölçü piksel özniteliğiyle değil sınıfla veriliyor: telefonda 42,
 * `sm` üstünde 54 piksel. Sabit tek bir boy, iki uçtan birinde yanlış
 * olurdu — dar hücrede metni eziyor, geniş hücrede kayboluyordu.
 */
const GLYPH = 'h-[42px] w-[42px] sm:h-[54px] sm:w-[54px]';

/**
 * Saat–dilimi farkındalıklı "gün içindeki an" oranı: 00:00 → 0, 12:00 → 0.5.
 *
 * `formatClock` üzerinden gidiyoruz çünkü `Date` nesnesi tarayıcının yerel
 * saatini taşır, gösterdiğimiz saat ise seçili konumun saat dilimine göre
 * biçimlendiriliyor. Kadranın yayı ile hücrede yazan saat aynı kaynaktan
 * gelmezse ikisi birbirini yalanlardı.
 */
function clockFraction(date: Date | null, timeZone: string): number | null {
  if (!date) return null;
  const [h, m] = formatClock(date, timeZone).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return (h + m / 60) / 24;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Karanlık penceresi kadranı — 24 saatlik saat yüzü, tepesi gece yarısı.
 *
 * Yanındaki `DarknessBar` "ne kadar" sorusunu cevaplıyor; bu kadran "ne
 * zaman"ı cevaplıyor. Aynı geceyi iki farklı soruyla okumak, iki hücreyi
 * birbirinin tekrarı olmaktan çıkarıyor: yaz gecesinde yay ince ve geç
 * başlar, kışın kalın ve erken.
 */
function NightArc({ from, to }: { from: number | null; to: number | null }) {
  const r = 10;
  const c = 2 * Math.PI * r;
  // Gece yarısını geçen pencere için mod: 22:30 → 04:10 negatif fark verir.
  const span = from === null || to === null ? 0 : (((to - from) % 1) + 1) % 1;

  return (
    <svg viewBox="0 0 30 30" fill="none" className={GLYPH}>
      {/* Saat işaretleri: yayın nereye düştüğünü okumak için bir
          referans gerekiyor. Tepe = gece yarısı. */}
      {[0, 6, 12, 18].map((hour) => {
        const a = (hour / 24) * 2 * Math.PI - Math.PI / 2;
        return (
          <line
            key={hour}
            x1={15 + Math.cos(a) * 13}
            y1={15 + Math.sin(a) * 13}
            x2={15 + Math.cos(a) * 14.6}
            y2={15 + Math.sin(a) * 14.6}
            className="stroke-border-strong"
            strokeWidth="1.2"
          />
        );
      })}
      <circle
        cx="15"
        cy="15"
        r={r}
        className="stroke-border-strong"
        strokeWidth="3.4"
      />
      {span > 0 && (
        <circle
          cx="15"
          cy="15"
          r={r}
          className="stroke-primary"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeDasharray={`${c * span} ${c}`}
          /* 0 oranı tepede olsun diye çeyrek tur geri, sonra başlangıç
             saati kadar ileri döndürülüyor. */
          transform={`rotate(${-90 + (from ?? 0) * 360} 15 15)`}
        />
      )}
    </svg>
  );
}

/**
 * Seeing yıldızı — atmosferin yıldızı ne kadar şişirdiği.
 *
 * ÖNCEKİ ÇİZİM İÇ İÇE İKİ DAİREYDİ ve yanındaki bulut halkasıyla aynı
 * siluete sahipti; ızgarada altı hücrenin ikisi birbirinin kopyası gibi
 * duruyordu. Şimdi gerçek bir yıldız işareti: iyi seeing'de sivri ve
 * temiz, kötüde şişmiş bir hâle içinde. Şekil artık hücreye bakmadan
 * hangi ölçüm olduğunu söylüyor.
 *
 * Ölçek indeksin kendisiyle doğrusal; saniye-yay iddiası taşımıyor
 * (bkz. `features/weather/seeing.ts` — çıktı ölçüm değil tahmin).
 *
 * Veri yoksa yalnızca sönük bir çerçeve kalır: "mükemmel seeing" ile
 * "bilmiyoruz" aynı görünmemeli.
 */
function SeeingDisc({ index }: { index: number | null }) {
  const level = index === null ? 0 : clamp(index, 1, 5);
  // 1 → dar hâle (2.5), 5 → dış çembere dayanan hâle (11)
  const halo = level === 0 ? 0 : 2.5 + (level - 1) * 2.1;
  const spike = level === 0 ? 0 : 11 - (level - 1) * 0.9;

  return (
    <svg viewBox="0 0 30 30" fill="none" className={GLYPH}>
      <circle
        cx="15"
        cy="15"
        r="13"
        className="stroke-border-strong"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      {index !== null && (
        <>
          <circle cx="15" cy="15" r={halo} className="fill-primary/18" />
          <path
            d={`M15 ${15 - spike} L${15 + spike * 0.26} ${15 - spike * 0.26} L${15 + spike} 15 L${15 + spike * 0.26} ${15 + spike * 0.26} L15 ${15 + spike} L${15 - spike * 0.26} ${15 + spike * 0.26} L${15 - spike} 15 L${15 - spike * 0.26} ${15 - spike * 0.26} Z`}
            className="fill-primary"
          />
        </>
      )}
    </svg>
  );
}

/**
 * Çiylenme damlası — sıcaklık ile çiy noktası arasındaki açıklık.
 *
 * Damla doldukça yoğuşma yaklaşır: 8 °C ve üstü açıklıkta boş, 0'da tam
 * dolu. 8 °C'yi üst sınır seçtik çünkü bunun ötesinde ısıtıcı bandı kararı
 * değişmiyor; ölçeği daha geniş tutmak damlayı hep boş gösterirdi.
 */
function DewDrop({ spread }: { spread: number | null }) {
  const clipId = useId();
  const level = spread === null ? 0 : clamp(1 - spread / 8, 0, 1);
  const shape = 'M15 5 C 19 12, 23 15, 23 19 A 8 8 0 0 1 7 19 C 7 15, 11 12, 15 5 Z';

  return (
    <svg viewBox="0 0 30 30" fill="none" className={GLYPH}>
      <defs>
        <clipPath id={clipId}>
          <path d={shape} />
        </clipPath>
      </defs>
      {level > 0 && (
        <rect
          x="0"
          y={27 - 22 * level}
          width="30"
          height={22 * level}
          className="fill-cold"
          clipPath={`url(#${clipId})`}
        />
      )}
      <path d={shape} className="stroke-border-strong" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * Ay evresi diski.
 *
 * Aydınlanma oranı bir daire üzerinde iki yay ile çiziliyor: dış kenar
 * sabit, iç terminatör oranla birlikte genişleyip daralıyor. Basit bir
 * "yarım daire" çizimi, %20 ile %80 dolunayı aynı gösterirdi.
 */
function MoonDisc({ illumination }: { illumination: number }) {
  const r = 12;
  const k = clamp(illumination, 0, 1);
  // Terminatörün yatay yarıçapı: 0'da tam elips (yeni ay), 1'de düz çizgi.
  const rx = r * Math.abs(1 - 2 * k);
  const sweep = k > 0.5 ? 1 : 0;

  return (
    <svg viewBox="0 0 30 30" fill="none" className={GLYPH}>
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

/** Karanlık penceresi çubuğu — gece içindeki astronomik karanlık payı. */
function DarknessBar({ minutes }: { minutes: number }) {
  // 8 saat pratik bir üst sınır: yaz gecelerinde toplam karanlık bunun
  // altında kalır, kışın da çubuk dolar ve fark okunmaz hâle gelmez.
  const ratio = clamp(minutes / (8 * 60), 0, 1);

  return (
    <svg viewBox="0 0 30 30" fill="none" className={GLYPH}>
      <rect
        x="7"
        y="4"
        width="16"
        height="22"
        rx="2.5"
        className="stroke-border-strong"
        strokeWidth="1.6"
      />
      <rect
        x="7"
        y={4 + 22 * (1 - ratio)}
        width="16"
        height={22 * ratio}
        rx="2.5"
        className="fill-cold"
      />
      {/* Saat kertikleri: dolu bir çubuk tek başına "ne kadar" demiyor,
          yalnızca "çok" diyor. Dört kertik onu okunur bir ölçeğe
          çeviriyor (üst sınır 8 saat). */}
      {[1, 2, 3].map((i) => (
        <line
          key={i}
          x1="7"
          x2="23"
          y1={4 + (22 * i) / 4}
          y2={4 + (22 * i) / 4}
          className="stroke-background/45"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

/**
 * Bulut örtüsü — bulut silueti, örtü oranınca dolar.
 *
 * ÖNCE BİR HALKAYDI ve yandaki karanlık kadranıyla birebir aynı şekle
 * sahipti; iki ölçüm yan yana durduğunda hangisinin hangisi olduğu
 * ancak yazıyı okuyunca anlaşılıyordu. İkon başlığı tekrar etmek için
 * değil, başlığa bakmadan tanınmak için var.
 *
 * Veri yoksa silüet boş kalır — "%0 bulut" ile "veri yok" aynı
 * görünmemeli.
 */
const CLOUD_PATH =
  'M7.5 22.5 a5 5 0 0 1 0.7 -9.9 a7.6 7.6 0 0 1 14.2 1.5 a4.7 4.7 0 0 1 -0.7 8.4 Z';

function CloudRing({ cover }: { cover: number | null }) {
  const clipId = useId();
  const ratio = cover === null ? 0 : clamp(cover / 100, 0, 1);

  return (
    <svg viewBox="0 0 30 30" fill="none" className={GLYPH}>
      <defs>
        <clipPath id={clipId}>
          <path d={CLOUD_PATH} />
        </clipPath>
      </defs>
      {cover !== null && ratio > 0 && (
        <rect
          x="0"
          y={22.5 - 10 * ratio}
          width="30"
          height={10 * ratio}
          className="fill-cold"
          clipPath={`url(#${clipId})`}
        />
      )}
      <path
        d={CLOUD_PATH}
        className="stroke-border-strong"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

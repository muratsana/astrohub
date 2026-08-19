import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { siteMap } from '@/app/navigation';
import {
  CalendarIcon,
  CalculatorIcon,
  FrameIcon,
  GridIcon,
  MapIcon,
  MoonIcon,
  MosaicIcon,
  RouteIcon,
  SparkleIcon,
} from '@/components/ui/icons';

/**
 * ARAÇLAR giriş sayfası (§7.12).
 * Modül haritasıyla aynı kaynaktan beslenir — yeni bir araç eklendiğinde
 * iki yerde ayrı bakım gerekmez.
 */
const tools =
  siteMap
    .find((group) => group.title === 'Araçlar')
    ?.items.filter((tool) => tool.to !== '/araclar') ?? [];

/**
 * ARAÇLARIN GRUPLANMASI — kullanıcının SORUSUNA göre.
 *
 * Eskiden yedi kart düz bir ızgarada, hepsi aynı ağırlıkta duruyordu:
 * "Bu gece ne çekeyim" ile "kaç panele böleyim" yan yanaydı ve
 * aralarındaki fark görünmüyordu. Numaralandırma (01–07) bir sıra
 * vaat ediyordu ama o sıranın bir anlamı yoktu.
 *
 * Dört grup, çekim gecesinin sırasını izliyor: önce geceyi seç, sonra
 * gökyüzü kataloğundan hedefi seç, sonra kadrajı kur, sonra pozu
 * planla. Referans ayrı duruyor çünkü araç değil, araçların beslendiği veri.
 *
 * KAYNAK YİNE `siteMap`: bir araç eklendiğinde burada görünür ama
 * gruplanmamışsa "Diğer" başlığına düşer — kaybolmaz, sadece buraya bir
 * satır eklemeyi hatırlatan görünür bir iz bırakır.
 */
const GROUPS: { title: string; hint: string; paths: string[] }[] = [
  {
    title: 'Gece',
    hint: 'Ne zaman, hangi hedef, ne kadar karanlık',
    paths: ['/bu-gece', '/bu-gece/plan', '/bu-gece/takvim'],
  },
  {
    title: 'Katalog',
    hint: 'Gökyüzünde ne var, hangisi çekilir',
    paths: ['/araclar/gokyuzu-katalogu'],
  },
  {
    title: 'Kadraj',
    hint: 'Hedef bu ekipmana sığıyor mu',
    paths: ['/araclar/kadraj', '/araclar/kadraj/mozaik'],
  },
  {
    title: 'Poz ve saha',
    hint: 'Kaç kare, kaç gece, nereden',
    paths: ['/araclar/poz-plani', '/araclar/isik-kirliligi'],
  },
];

/**
 * Referans alanları — araç değil, araçların okuduğu katalog.
 *
 * Hedef kataloğu kaldırıldı: ana katalog artık `/araclar/gokyuzu-katalogu`.
 * Burada yalnızca araçların okuduğu setup alanı kalıyor.
 */
const REFERENCE: { label: string; to: string; description: string }[] = [
  {
    label: 'Ekipmanlarım',
    to: '/hesap?sekme=ekipmanlarim',
    description: 'Ekipmanını kur ve kaydet — bütün araçlar onu okur.',
  },
];

const grouped = GROUPS.map((group) => ({
  ...group,
  items: group.paths
    .map((path) => tools.find((tool) => tool.to === path))
    .filter((tool): tool is (typeof tools)[number] => tool !== undefined),
}));

/** Hiçbir gruba girmeyen araçlar — yeni eklenmiş olabilir. */
const ungrouped = tools.filter(
  (tool) => !GROUPS.some((group) => group.paths.includes(tool.to))
);

/**
 * Araç ikonları — rotaya göre.
 *
 * NEDEN BURADA, `navigation.ts` İÇİNDE DEĞİL: gezinme haritası saf veri
 * ve o dosya bir React bileşenine bağımlı olmamalı; site haritası,
 * arama dizini ve sitemap üretimi de aynı diziyi okuyor. İkon bir sunum
 * ayrıntısı, dolayısıyla sunumun yanında duruyor.
 *
 * Eşleşmeyen rota ikonsuz kalır, çökmez: yeni bir araç eklendiğinde
 * sayfa çalışmaya devam eder, yalnızca o kartın ikonu boş görünür ve
 * bu, buraya bir satır eklemeyi hatırlatan görünür bir iz bırakır.
 */
const toolIcons: Record<string, typeof GridIcon> = {
  '/araclar': GridIcon,
  '/araclar/gokyuzu-katalogu': SparkleIcon,
  '/araclar/kadraj': FrameIcon,
  '/araclar/isik-kirliligi': MapIcon,
  '/bu-gece': MoonIcon,
  '/bu-gece/plan': RouteIcon,
  '/araclar/poz-plani': CalculatorIcon,
  '/araclar/kadraj/mozaik': MosaicIcon,
  '/bu-gece/takvim': CalendarIcon,
};

export function ToolsIndexPage() {
  return (
    <>
      <PageMeta
        title="Astrofotoğrafçılık Araçları"
        description="FoV, pixel scale, setup simülatörü, mosaic planlayıcı ve gökyüzü araçları — ekipmanınıza göre çalışan astrofotoğrafçılık araçları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Araçlar', path: '/araclar' },
        ])}
      />

      <Container className="py-10 sm:py-12">
        <header className="mb-8 border-b border-border pb-6">
          <h1 className="type-page text-foreground">Araçlar</h1>
          <p className="mt-3 max-w-[70ch] text-caption leading-relaxed text-muted-foreground">
            Çekim öncesi kararları sayıya dayandıran araçlar. FoV, pixel scale
            ve setup uyumluluk artık tek Simülatör çalışma alanında birleşir.
          </p>
        </header>

        {[...grouped, { title: 'Diğer', hint: '', items: ungrouped }]
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <section key={group.title} className="mb-8 last:mb-0">
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 border-b border-border pb-2">
                <h2 className="type-section text-foreground">{group.title}</h2>
                {group.hint && (
                  <p className="text-meta text-muted-foreground">
                    {group.hint}
                  </p>
                )}
              </div>

              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((tool) => {
                  const Icon = toolIcons[tool.to];
                  return (
                    <li key={tool.to + tool.label}>
                      <Link
                        to={tool.to}
                        className="group flex h-full flex-col rounded-card border border-border bg-surface-1 p-3 transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface-2 sm:p-4"
                      >
                        <ToolVisual path={tool.to} Icon={Icon} />
                        <span className="flex items-baseline gap-2">
                          <span className="font-display text-readout-sm font-bold text-foreground transition-colors group-hover:text-primary">
                            {tool.label}
                          </span>
                          {tool.soon && <Badge>Yakında</Badge>}
                        </span>
                        {tool.description && (
                          <span className="mt-2 text-meta leading-relaxed text-muted-foreground">
                            {tool.description}
                          </span>
                        )}
                        <span className="mt-auto pt-5 text-meta tracking-[0.04em] text-faint transition-colors group-hover:text-primary">
                          {tool.soon ? 'yol haritasında' : 'aracı aç →'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

        {REFERENCE.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 border-b border-border pb-2">
              <h2 className="type-section text-foreground">Referans</h2>
              <p className="text-meta text-muted-foreground">
                Araçların okuduğu kataloglar
              </p>
            </div>
            <ul className="grid gap-px border border-border bg-border sm:grid-cols-2">
              {REFERENCE.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="group flex h-full flex-col bg-surface-1 p-5 transition-colors hover:bg-surface-2"
                  >
                    <span className="font-display text-readout-sm font-bold text-foreground transition-colors group-hover:text-primary">
                      {item.label}
                    </span>
                    <span className="mt-2 text-meta leading-relaxed text-muted-foreground">
                      {item.description}
                    </span>
                    <span className="mt-auto pt-5 text-meta tracking-[0.04em] text-faint transition-colors group-hover:text-primary">
                      katalogu aç →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </>
  );
}

function ToolVisual({ path, Icon }: { path: string; Icon?: typeof GridIcon }) {
  const visual = toolVisuals[path] ?? toolVisuals.default;

  return (
    <span
      aria-hidden
      className={`relative mb-4 block h-32 overflow-hidden rounded-card border border-border-strong bg-gradient-to-br ${visual.tone}`}
    >
      <svg
        viewBox="0 0 360 112"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id={`${visual.id}-glow`} cx="72%" cy="30%" r="70%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="55%" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${visual.id}-wash`} x1="0" x2="1" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-background)"
              stopOpacity="0.25"
            />
            <stop offset="52%" stopColor="currentColor" stopOpacity="0.09" />
            <stop
              offset="100%"
              stopColor="var(--color-background)"
              stopOpacity="0.45"
            />
          </linearGradient>
          <pattern
            id={`${visual.id}-grid`}
            width="36"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M36 0H0V28"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.08"
            />
          </pattern>
        </defs>
        <rect width="360" height="112" fill={`url(#${visual.id}-wash)`} />
        <rect width="360" height="112" fill={`url(#${visual.id}-grid)`} />
        <rect width="360" height="112" fill={`url(#${visual.id}-glow)`} />
        <path
          d="M0 86 C58 72 102 92 158 79 S260 57 360 75 V112 H0Z"
          fill="var(--color-background)"
          fillOpacity=".23"
        />
        {[
          [34, 21, 1.2],
          [78, 41, 1.6],
          [122, 18, 1.1],
          [266, 22, 1.7],
          [318, 50, 1.2],
          [338, 18, 1],
        ].map(([cx, cy, r]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="currentColor"
            opacity=".5"
          />
        ))}
        {visual.kind === 'tonight' && <TonightVisual />}
        {visual.kind === 'planner' && <PlannerVisual />}
        {visual.kind === 'calendar' && <CalendarVisual />}
        {visual.kind === 'catalog' && <CatalogVisual />}
        {visual.kind === 'framing' && <FramingVisual />}
        {visual.kind === 'mosaic' && <MosaicVisual />}
        {visual.kind === 'exposure' && <ExposureVisual />}
        {visual.kind === 'pollution' && <PollutionVisual />}
        {visual.kind === 'default' && <DefaultVisual />}
      </svg>
      {Icon && (
        <span className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-card border border-border bg-background/80 text-primary backdrop-blur-sm transition-colors group-hover:text-primary-hover">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <span className="absolute bottom-4 right-4 h-2.5 w-2.5 rounded-full border border-primary bg-primary ring-4 ring-primary/20" />
    </span>
  );
}

const toolVisuals: Record<
  string,
  {
    id: string;
    kind:
      | 'tonight'
      | 'planner'
      | 'calendar'
      | 'catalog'
      | 'framing'
      | 'mosaic'
      | 'exposure'
      | 'pollution'
      | 'default';
    tone: string;
  }
> = {
  '/bu-gece': {
    id: 'tool-tonight',
    kind: 'tonight',
    tone: 'from-primary/20 via-warning/10 to-transparent text-primary',
  },
  '/bu-gece/plan': {
    id: 'tool-planner',
    kind: 'planner',
    tone: 'from-primary/20 via-cold/10 to-transparent text-primary',
  },
  '/bu-gece/takvim': {
    id: 'tool-calendar',
    kind: 'calendar',
    tone: 'from-warning/20 via-primary/10 to-transparent text-warning',
  },
  '/araclar/gokyuzu-katalogu': {
    id: 'tool-catalog',
    kind: 'catalog',
    tone: 'from-cold/25 via-primary/10 to-transparent text-cold',
  },
  '/araclar/kadraj': {
    id: 'tool-framing',
    kind: 'framing',
    tone: 'from-primary/25 via-cold/10 to-transparent text-primary',
  },
  '/araclar/kadraj/mozaik': {
    id: 'tool-mosaic',
    kind: 'mosaic',
    tone: 'from-cold/20 via-primary/10 to-transparent text-cold',
  },
  '/araclar/poz-plani': {
    id: 'tool-exposure',
    kind: 'exposure',
    tone: 'from-primary/20 via-warning/10 to-transparent text-warning',
  },
  '/araclar/isik-kirliligi': {
    id: 'tool-pollution',
    kind: 'pollution',
    tone: 'from-success/20 via-primary/10 to-transparent text-success',
  },
  default: {
    id: 'tool-default',
    kind: 'default',
    tone: 'from-primary/20 via-warning/10 to-transparent text-primary',
  },
};

function TonightVisual() {
  return (
    <>
      <path
        d="M34 82 C72 36 125 38 170 76 S270 104 330 42"
        stroke="currentColor"
        strokeOpacity=".28"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M68 33a22 22 0 1 0 27 30 24 24 0 0 1-27-30Z"
        fill="currentColor"
        opacity=".9"
      />
      <rect
        x="128"
        y="78"
        width="148"
        height="10"
        rx="5"
        fill="currentColor"
        opacity=".18"
      />
      <rect
        x="170"
        y="78"
        width="72"
        height="10"
        rx="5"
        fill="currentColor"
        opacity=".72"
      />
      <circle cx="296" cy="71" r="4" fill="currentColor" />
      <circle cx="319" cy="35" r="2.4" fill="currentColor" opacity=".75" />
      <circle cx="244" cy="31" r="2" fill="currentColor" opacity=".55" />
    </>
  );
}

function PlannerVisual() {
  return (
    <>
      <path
        d="M64 72 C112 22 154 95 204 49 S276 28 318 74"
        stroke="currentColor"
        strokeOpacity=".58"
        strokeWidth="3"
        fill="none"
        strokeDasharray="7 9"
      />
      {[64, 144, 220, 318].map((x, index) => (
        <g key={x}>
          <circle
            cx={x}
            cy={index % 2 ? 60 : 72}
            r="11"
            fill="var(--color-background)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx={x} cy={index % 2 ? 60 : 72} r="3" fill="currentColor" />
        </g>
      ))}
      <path
        d="M42 31h70M42 45h46M248 31h70M272 45h46"
        stroke="currentColor"
        strokeOpacity=".18"
        strokeWidth="2"
      />
    </>
  );
}

function CalendarVisual() {
  return (
    <>
      <rect
        x="66"
        y="22"
        width="220"
        height="68"
        rx="10"
        fill="var(--color-background)"
        fillOpacity=".42"
        stroke="currentColor"
        strokeOpacity=".35"
      />
      <path
        d="M66 42h220M112 22v68M158 22v68M204 22v68M250 22v68"
        stroke="currentColor"
        strokeOpacity=".18"
      />
      {[92, 138, 184, 230, 264].map((x, index) => (
        <path
          key={x}
          d={
            index % 2
              ? `M${x - 7} 67a9 9 0 1 0 13-11 10 10 0 0 1-13 11Z`
              : `M${x} 55a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z`
          }
          fill="currentColor"
          opacity={index === 2 ? '.95' : '.42'}
        />
      ))}
    </>
  );
}

function CatalogVisual() {
  return (
    <>
      <circle
        cx="176"
        cy="56"
        r="42"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".22"
      />
      <circle
        cx="176"
        cy="56"
        r="18"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".38"
      />
      <path
        d="m206 83 36 18"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".7"
      />
      {[
        [72, 28, 2],
        [112, 72, 3],
        [158, 39, 2],
        [190, 65, 2],
        [258, 34, 3],
        [302, 78, 2],
        [322, 30, 2],
      ].map(([cx, cy, r]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={r}
          fill="currentColor"
          opacity=".82"
        />
      ))}
    </>
  );
}

function FramingVisual() {
  return (
    <>
      <rect
        x="74"
        y="28"
        width="214"
        height="58"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <rect
        x="124"
        y="40"
        width="114"
        height="34"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".4"
      />
      <path
        d="M181 18v80M46 57h270"
        stroke="currentColor"
        strokeOpacity=".18"
      />
      <circle
        cx="181"
        cy="57"
        r="22"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".5"
        strokeDasharray="5 6"
      />
      <path
        d="m79 32 24 24M286 32l-24 24M79 82l24-24M286 82l-24-24"
        stroke="currentColor"
        strokeOpacity=".38"
      />
    </>
  );
}

function MosaicVisual() {
  return (
    <>
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={92 + col * 58}
            y={22 + row * 24}
            width="68"
            height="32"
            rx="4"
            fill="currentColor"
            fillOpacity=".08"
            stroke="currentColor"
            strokeOpacity=".42"
          />
        ))
      )}
      <path
        d="M78 56h214M181 16v80"
        stroke="currentColor"
        strokeOpacity=".16"
      />
      <circle cx="181" cy="56" r="7" fill="currentColor" opacity=".8" />
    </>
  );
}

function ExposureVisual() {
  return (
    <>
      <path
        d="M58 84h244"
        stroke="currentColor"
        strokeOpacity=".18"
        strokeWidth="2"
      />
      {[46, 68, 90, 112, 134].map((height, index) => (
        <rect
          key={height}
          x={82 + index * 34}
          y={84 - height}
          width="20"
          height={height}
          rx="4"
          fill="currentColor"
          opacity={index === 3 ? '.78' : '.38'}
        />
      ))}
      <path
        d="M238 69h70M238 52h48M238 35h62"
        stroke="currentColor"
        strokeOpacity=".46"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="308" cy="69" r="4" fill="currentColor" />
    </>
  );
}

function PollutionVisual() {
  return (
    <>
      <path
        d="M48 82 C92 32 144 94 194 44 S278 46 320 24"
        stroke="currentColor"
        strokeOpacity=".5"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M62 90h58V54h26v36h28V66h24v24h106"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".3"
        strokeWidth="3"
      />
      <circle cx="112" cy="52" r="22" fill="currentColor" opacity=".16" />
      <circle cx="112" cy="52" r="8" fill="currentColor" opacity=".65" />
      <circle cx="286" cy="30" r="2.5" fill="currentColor" opacity=".9" />
      <circle cx="306" cy="50" r="2" fill="currentColor" opacity=".65" />
      <circle cx="250" cy="38" r="1.8" fill="currentColor" opacity=".55" />
    </>
  );
}

function DefaultVisual() {
  return (
    <>
      <path d="M56 56h248M180 18v78" stroke="currentColor" strokeOpacity=".2" />
      <circle
        cx="180"
        cy="56"
        r="36"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".38"
      />
      <circle cx="180" cy="56" r="5" fill="currentColor" />
    </>
  );
}

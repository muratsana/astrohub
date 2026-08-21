import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { siteMap } from '@/app/navigation';
import { RemoteImage } from '@/components/media/RemoteImage';
import { CARD_RATIO } from '@/components/ui/cardRatios';
import { CardGrid } from '@/components/ui/CardGrid';
import { commonsImage } from '@/lib/commons';
import {
  CalendarIcon,
  CalculatorIcon,
  ChainIcon,
  FrameIcon,
  GridIcon,
  MapIcon,
  MoonIcon,
  MosaicIcon,
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
    paths: ['/bu-gece', '/bu-gece/takvim'],
  },
  {
    title: 'Katalog',
    hint: 'Gökyüzünde ne var, hangisi çekilir',
    paths: ['/araclar/gokyuzu-katalogu'],
  },
  {
    title: 'Kadraj',
    hint: 'Hedef bu ekipmana sığıyor mu',
    paths: [
      '/araclar/kadraj',
      '/araclar/rehber-kurulumu',
      '/araclar/kadraj/mozaik',
    ],
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
  '/araclar/rehber-kurulumu': ChainIcon,
  '/araclar/isik-kirliligi': MapIcon,
  '/bu-gece': MoonIcon,
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

      <Container className="py-8 sm:py-10">
        <header className="mb-6 border-b border-border pb-5">
          <h1 className="type-page text-foreground">Araçlar</h1>
          <p className="mt-3 max-w-[70ch] text-caption leading-relaxed text-muted-foreground">
            Çekim öncesi kararları sayıya dayandıran araçlar. FoV, pixel scale
            ve setup uyumluluk artık tek Simülatör çalışma alanında birleşir.
          </p>
        </header>

        {[...grouped, { title: 'Diğer', hint: '', items: ungrouped }]
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <section key={group.title} className="mb-6 last:mb-0">
              <div className="mb-2 flex flex-wrap items-baseline gap-x-3 border-b border-border pb-2">
                <h2 className="type-section text-foreground">{group.title}</h2>
                {group.hint && (
                  <p className="text-meta text-muted-foreground">
                    {group.hint}
                  </p>
                )}
              </div>

              <CardGrid view="grid">
                {group.items.map((tool) => {
                  const Icon = toolIcons[tool.to];
                  const cover = toolCovers[tool.to] ?? toolCovers.default;
                  return (
                    <li key={tool.to + tool.label}>
                      <Link
                        to={tool.to}
                        className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface-1 transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface-2"
                      >
                        <ToolCover cover={cover} Icon={Icon} />
                        <span className="flex items-baseline gap-2 px-3 pt-3">
                          <span className="font-display text-body font-bold text-foreground transition-colors group-hover:text-primary">
                            {tool.label}
                          </span>
                          {tool.soon && <Badge>Yakında</Badge>}
                        </span>
                        {tool.description && (
                          <span className="mt-1.5 line-clamp-2 px-3 text-meta leading-relaxed text-muted-foreground">
                            {tool.description}
                          </span>
                        )}
                        <span className="mt-auto px-3 pb-3 pt-4 text-meta tracking-[0.04em] text-faint transition-colors group-hover:text-primary">
                          {tool.soon ? 'yol haritasında' : 'aracı aç →'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </CardGrid>
            </section>
          ))}

        {REFERENCE.length > 0 && (
          <section className="mt-6">
            <div className="mb-2 flex flex-wrap items-baseline gap-x-3 border-b border-border pb-2">
              <h2 className="type-section text-foreground">Referans</h2>
              <p className="text-meta text-muted-foreground">
                Araçların okuduğu kataloglar
              </p>
            </div>
            <CardGrid view="grid">
              {REFERENCE.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface-1 transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface-2"
                  >
                    <ToolCover cover={toolCovers.reference} Icon={GridIcon} />
                    <span className="px-3 pt-3 font-display text-body font-bold text-foreground transition-colors group-hover:text-primary">
                      {item.label}
                    </span>
                    <span className="mt-1.5 line-clamp-2 px-3 text-meta leading-relaxed text-muted-foreground">
                      {item.description}
                    </span>
                    <span className="mt-auto px-3 pb-3 pt-4 text-meta tracking-[0.04em] text-faint transition-colors group-hover:text-primary">
                      katalogu aç →
                    </span>
                  </Link>
                </li>
              ))}
            </CardGrid>
          </section>
        )}
      </Container>
    </>
  );
}

function ToolCover({
  cover,
  Icon,
}: {
  cover: ToolCoverData;
  Icon?: typeof GridIcon;
}) {
  return (
    <span
      className={`relative block overflow-hidden bg-surface-2 ${CARD_RATIO.wide}`}
    >
      <RemoteImage
        src={cover.url}
        alt={cover.alt}
        seed={cover.seed}
        tint={cover.tint}
        sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        className="transition duration-500 group-hover:scale-[1.03]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/15 to-background/10" />
      {Icon && (
        <span className="absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-card border border-border bg-background/82 text-primary shadow-overlay backdrop-blur-sm transition-colors group-hover:text-primary-hover">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span className="absolute bottom-2 right-2 rounded-card border border-border-strong bg-background/82 px-2 py-1 text-meta text-muted-foreground backdrop-blur-sm">
        {cover.credit}
      </span>
    </span>
  );
}

interface ToolCoverData {
  url: string;
  alt: string;
  seed: string;
  tint: string;
  credit: string;
}

const toolCovers: Record<string, ToolCoverData> = {
  '/bu-gece': {
    url: commonsImage('Milky Way over the VLT (dsc4081-cc).jpg'),
    alt: 'Samanyolu altında ESO VLT teleskopları',
    seed: 'tool-tonight',
    tint: '230,205,150',
    credit: 'ESO',
  },
  '/bu-gece/takvim': {
    url: commonsImage('Circumpolar star trails.jpg'),
    alt: 'Kutup çevresinde yıldız izleri',
    seed: 'tool-calendar',
    tint: '150,185,235',
    credit: 'Commons',
  },
  '/araclar/gokyuzu-katalogu': {
    url: commonsImage('Orion Nebula - Hubble 2006 mosaic.jpg'),
    alt: 'Hubble Orion Bulutsusu mozaiği',
    seed: 'tool-catalog',
    tint: '190,150,220',
    credit: 'NASA/ESA',
  },
  '/araclar/kadraj': {
    url: commonsImage(
      'Two telescopes observing the night sky at the Paranal Observatory.jpg'
    ),
    alt: 'Paranal Gözlemevi’nde gece çalışan teleskoplar',
    seed: 'tool-framing',
    tint: '120,190,220',
    credit: 'ESO',
  },
  '/araclar/rehber-kurulumu': {
    url: commonsImage(
      'ESO astronomers testing a new all-sky camera at Paranal.jpg'
    ),
    alt: 'Gece gökyüzü altında takip ve rehberleme ekipmanı',
    seed: 'tool-guiding',
    tint: '120,215,200',
    credit: 'ESO',
  },
  '/araclar/kadraj/mozaik': {
    url: commonsImage('Andromeda galaxy.jpg'),
    alt: 'Andromeda Galaksisi geniş alan fotoğrafı',
    seed: 'tool-mosaic',
    tint: '150,185,235',
    credit: 'Commons',
  },
  '/araclar/poz-plani': {
    url: commonsImage('Laser Towards Milky Ways Centre.jpg'),
    alt: 'Samanyolu merkezine yönelen gözlemevi lazeri',
    seed: 'tool-exposure',
    tint: '232,140,110',
    credit: 'ESO',
  },
  '/araclar/isik-kirliligi': {
    url: commonsImage('Milky Way above ESO telescopes ( H9A2493P-CC).jpg'),
    alt: 'Teleskopların üzerinde Samanyolu ve karanlık gökyüzü',
    seed: 'tool-pollution',
    tint: '120,215,200',
    credit: 'ESO',
  },
  reference: {
    url: commonsImage('Orion Nebula - Hubble 2006 mosaic.jpg'),
    alt: 'Orion Bulutsusu katalog referans görseli',
    seed: 'tool-reference',
    tint: '190,150,220',
    credit: 'NASA/ESA',
  },
  default: {
    url: commonsImage('North America Nebula (NGC7000) in Hubble Palette.jpg'),
    alt: 'Kuzey Amerika Bulutsusu geniş alan fotoğrafı',
    seed: 'tool-default',
    tint: '230,205,150',
    credit: 'Commons',
  },
};

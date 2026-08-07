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
 * Üç grup, çekim gecesinin sırasını izliyor: önce geceyi seç, sonra
 * kadrajı kur, sonra pozu planla. Referans (ekipman, hedef katalogu)
 * ayrı duruyor çünkü onlar araç değil, araçların beslendiği veri.
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
    hint: 'Hedef bu setup’a sığıyor mu',
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
 * Denetimde ölçülen boşluk şuydu: `/ekipman` ve `/hedefler` bu sayfada
 * HİÇ görünmüyordu, oysa araçların tamamı ikisinden besleniyor.
 * Kullanıcı "araçlar" diye girip setup'ını nereden kuracağını
 * bulamıyordu.
 */
const REFERENCE: { label: string; to: string; description: string }[] = [
  {
    label: 'Ekipman ve Setup',
    to: '/ekipman',
    description:
      'Setup’ını burada kur ve kaydet — bütün araçlar onu okur.',
  },
  {
    label: 'Hedef Kataloğu',
    to: '/hedefler',
    description: 'Messier, NGC, IC — açısal boyut ve konum verisiyle.',
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
                  <p className="text-meta text-muted-foreground">{group.hint}</p>
                )}
              </div>

              {/*
                `auto-rows-fr` + tam dolan satır: eski ızgarada yedi kart
                üç sütuna yerleşince sağ altta boş bir dolgu bloğu
                kalıyordu (kapsayıcının `bg-border` zemini görünüyordu).
                Gruplar iki ve üçlü olduğu için artık boş hücre çıkmıyor.
              */}
              <ul className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((tool) => {
                  const Icon = toolIcons[tool.to];
                  return (
                    <li key={tool.to + tool.label}>
                      <Link
                        to={tool.to}
                        className="group flex h-full flex-col bg-surface-1 p-5 transition-colors hover:bg-surface-2"
                      >
                        {Icon && (
                          <Icon className="mb-3 h-6 w-6 shrink-0 text-border-strong transition-colors group-hover:text-primary" />
                        )}
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
      </Container>
    </>
  );
}

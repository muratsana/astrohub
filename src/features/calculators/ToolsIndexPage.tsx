import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { siteMap } from '@/app/navigation';
import {
  CalendarIcon,
  ChainIcon,
  FrameIcon,
  GridIcon,
  MapIcon,
  MoonIcon,
  MosaicIcon,
  PixelIcon,
  RouteIcon,
} from '@/components/ui/icons';

/**
 * ARAÇLAR giriş sayfası (§7.12).
 * Modül haritasıyla aynı kaynaktan beslenir — yeni bir araç eklendiğinde
 * iki yerde ayrı bakım gerekmez.
 */
const tools = siteMap.find((group) => group.title === 'Araçlar')?.items ?? [];

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
  '/araclar/fov': FrameIcon,
  '/araclar/pixel-scale': PixelIcon,
  '/araclar/isik-kirliligi': MapIcon,
  '/bu-gece': MoonIcon,
  '/planlayici': RouteIcon,
  '/araclar/mosaic': MosaicIcon,
  '/araclar/setup-uyumluluk': ChainIcon,
  '/araclar/takvim': CalendarIcon,
};

export function ToolsIndexPage() {
  return (
    <>
      <PageMeta
        title="Astrofotoğrafçılık Araçları"
        description="FOV ve pixel scale hesaplayıcı, mosaic planlayıcı, setup uyumluluk kontrolü — ekipmanınıza göre çalışan astrofotoğrafçılık araçları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Araçlar', path: '/araclar' },
        ])}
      />

      <Container className="py-10 sm:py-12">
        <header className="mb-8 border-b border-border pb-6">
          <h1 className="type-page text-foreground">Araçlar</h1>
          <p className="mt-3 max-w-[70ch] text-caption leading-relaxed text-muted-foreground">
            Çekim öncesi kararları sayıya dayandıran hesaplayıcılar. Değerleri
            elle girebilir ya da ekipman veritabanından hazır ön ayar
            seçebilirsiniz.
          </p>
        </header>

        <ul className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, i) => {
            const Icon = toolIcons[tool.to];
            return (
            <li key={tool.to + tool.label}>
              <Link
                to={tool.to}
                className="group flex h-full flex-col bg-surface-1 p-5 transition-colors hover:bg-surface-2"
              >
                {/* İkon ve sıra numarası aynı satırda: numara künye,
                    ikon tanıma işareti — ikisi de küçük ve üstte. */}
                <span className="mb-3 flex items-center gap-2.5">
                  {Icon && (
                    <Icon className="h-6 w-6 shrink-0 text-border-strong transition-colors group-hover:text-primary" />
                  )}
                  <span className="tabular label text-primary">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </span>
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
      </Container>
    </>
  );
}

import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { ArrowRightIcon, CalculatorIcon } from '@/components/ui/icons';
import { primaryNav } from '@/app/navigation';

/**
 * Araçlar giriş sayfası (§5.2 Araçlar grubu, §7.12).
 * Menüdeki araç listesiyle aynı kaynaktan beslenir — yeni bir araç
 * eklendiğinde iki yerde ayrı bakım gerekmez.
 */
const toolItems =
  primaryNav.find((entry) => entry.to === '/araclar')?.children ?? [];

export function ToolsIndexPage() {
  return (
    <>
      <PageMeta
        title="Astrofotoğrafçılık Araçları"
        description="FOV ve pixel scale hesaplayıcı, mosaic planlayıcı, setup uyumluluk kontrolü ve gözlem planlayıcı — ekipmanınıza göre çalışan astrofotoğrafçılık araçları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Araçlar', path: '/araclar' },
        ])}
      />
      <Container className="py-10 sm:py-14">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Araçlar
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Çekim öncesi kararlarınızı sayıya dayandıran hesaplayıcılar.
            Değerleri elle girebilir ya da ekipman veritabanından hazır ön ayar
            seçebilirsiniz.
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {toolItems.map((tool) => (
            <li key={tool.to + tool.label}>
              <Link
                to={tool.to}
                className="group flex h-full flex-col rounded-card border border-border bg-surface-1 p-5 transition-colors hover:border-white/20 hover:bg-surface-2"
              >
                <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2 text-primary">
                  <CalculatorIcon className="h-5 w-5" />
                </span>
                <span className="flex items-center gap-2 text-base font-semibold text-foreground">
                  {tool.label}
                  {tool.soon && <Badge>Yakında</Badge>}
                </span>
                {tool.description && (
                  <span className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {tool.description}
                  </span>
                )}
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm text-muted-foreground transition-colors group-hover:text-primary">
                  {tool.soon ? 'Yol haritasında' : 'Aracı aç'}
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}

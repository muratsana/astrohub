import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { siteMap } from '@/app/navigation';

/**
 * ARAÇLAR giriş sayfası (§7.12).
 * Modül haritasıyla aynı kaynaktan beslenir — yeni bir araç eklendiğinde
 * iki yerde ayrı bakım gerekmez.
 */
const tools = siteMap.find((group) => group.title === 'Araçlar')?.items ?? [];

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
          <h1 className="text-[28px] text-foreground sm:text-[34px]">Araçlar</h1>
          <p className="mt-3 max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground">
            Çekim öncesi kararları sayıya dayandıran hesaplayıcılar. Değerleri
            elle girebilir ya da ekipman veritabanından hazır ön ayar
            seçebilirsiniz.
          </p>
        </header>

        <ul className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, i) => (
            <li key={tool.to + tool.label}>
              <Link
                to={tool.to}
                className="group flex h-full flex-col bg-surface-1 p-5 transition-colors hover:bg-surface-2"
              >
                <span className="tabular label mb-3 text-primary">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-[17px] font-bold text-foreground transition-colors group-hover:text-primary">
                    {tool.label}
                  </span>
                  {tool.soon && <Badge>Yakında</Badge>}
                </span>
                {tool.description && (
                  <span className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                    {tool.description}
                  </span>
                )}
                <span className="mt-auto pt-5 text-[10px] tracking-[0.04em] text-faint transition-colors group-hover:text-primary">
                  {tool.soon ? 'yol haritasında' : 'aracı aç →'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}

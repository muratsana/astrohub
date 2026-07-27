import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { siteMap } from '@/app/navigation';

/**
 * ARAÇLAR — modül haritasından beslenen kısa şerit.
 *
 * Yeni bir araç eklendiğinde `siteMap` güncellenir, burası kendiliğinden
 * güncel kalır. Yayında olmayanlar açıkça işaretlenir.
 */
const tools = siteMap.find((g) => g.title === 'Araçlar')?.items ?? [];

export function ToolsStrip() {
  return (
    <Container className="py-9 sm:py-11">
      <SectionHeader
        title="Araçlar"
        description="Çekim öncesi kararları sayıya dayandıran hesaplayıcılar."
        linkTo="/araclar"
      />

      <ul className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool) => (
          <li key={tool.to + tool.label}>
            <Link
              to={tool.to}
              className="group flex h-full flex-col bg-surface-1 p-4 transition-colors hover:bg-surface-2"
            >
              <span className="flex items-baseline gap-2">
                <span className="text-[14px] font-medium text-foreground transition-colors group-hover:text-primary">
                  {tool.label}
                </span>
                {tool.soon && (
                  <span className="shrink-0 text-[9px] uppercase tracking-widest text-faint">
                    yakında
                  </span>
                )}
              </span>
              {tool.description && (
                <span className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  {tool.description}
                </span>
              )}
              <span className="mt-auto pt-3 text-[10px] uppercase tracking-[0.16em] text-faint transition-colors group-hover:text-primary">
                {tool.soon ? 'yol haritasında' : 'aç →'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}

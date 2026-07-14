import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import {
  ImageIcon,
  MapIcon,
  GraduationIcon,
  CalculatorIcon,
  TagIcon,
  MountainIcon,
  ArrowRightIcon,
} from '@/components/ui/icons';
import { quickModules } from '../data';
import type { QuickModule } from '../data';

const icons = {
  image: ImageIcon,
  map: MapIcon,
  graduation: GraduationIcon,
  calculator: CalculatorIcon,
  tag: TagIcon,
  mountain: MountainIcon,
} as const;

/**
 * Hızlı erişim modülleri (§7.1). Tek satır (yatay kaydırma / grid).
 * §6.6: mini istatistik kutusu yok, tam işlevli form gömülmez.
 */
export function QuickAccess() {
  return (
    <section className="pt-14 sm:pt-16">
      <Container>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {quickModules.map((mod) => (
            <li key={mod.id}>
              <ModuleCard module={mod} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function ModuleCard({ module }: { module: QuickModule }) {
  const Icon = icons[module.icon];
  return (
    <Link
      to={module.to}
      className="group flex h-full flex-col rounded-card border border-border bg-surface-1 p-4 transition-colors hover:border-white/20 hover:bg-surface-2"
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            backgroundColor: 'color-mix(in srgb, ' + module.accent + ' 16%, transparent)',
            color: module.accent,
          }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRightIcon className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">{module.title}</p>
      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
        {module.subtitle}
      </p>
    </Link>
  );
}

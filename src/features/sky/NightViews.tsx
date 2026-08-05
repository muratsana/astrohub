import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';

/**
 * GECE MODÜLÜNÜN GÖRÜNÜM ŞERİDİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ÜÇ SAYFA TEK MODÜL OLDU
 *
 * "Bu gece ne çekeyim, ne zaman?" sorusunun cevabı üç ayrı adrese
 * dağılmıştı: `/bu-gece` bu gecenin hedeflerini, `/planlayici` o
 * hedeflerin sırasını, `/araclar/takvim` ise hangi gecenin uygun
 * olduğunu söylüyordu. Üçü de aynı konumu ve aynı geceyi konuşuyor ama
 * birbirine yalnızca sayfa içi düğmelerle bağlıydı; araçlar listesinde
 * de üç ayrı kart olarak duruyorlardı. Kullanıcı hangisinin nerede
 * olduğunu ezberlemek zorundaydı (denetim §3.6).
 *
 * Artık üçü `/bu-gece` altında ve her biri diğer ikisini üstte taşıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN GERÇEK SEKME (`role="tablist"`) DEĞİL
 *
 * Bunlar bir panelin sekmeleri değil, ayrı adreslerde ayrı belgeler:
 * her birinin kendi `h1`i, kendi başlığı, kendi paylaşılabilir
 * bağlantısı var. WAI-ARIA sekme deseni klavye okunu sekmeler arasında
 * gezdirip paneli yerinde değiştirmeyi vaat eder — burada gezinme
 * sayfayı değiştiriyor, yani o vaat yalan olurdu. Doğru semantik
 * `nav` + `aria-current="page"`.
 */

const GORUNUMLER = [
  { to: '/bu-gece', label: 'Bu Gece', end: true },
  { to: '/bu-gece/plan', label: 'Gece Planı', end: false },
  { to: '/bu-gece/takvim', label: 'Karanlık Takvimi', end: false },
];

export function NightViews({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Gece modülü görünümleri"
      className={cn(
        'mb-4 flex flex-wrap gap-1 rounded-card border border-border bg-surface-1 p-1',
        className
      )}
    >
      {GORUNUMLER.map((gorunum) => (
        <NavLink
          key={gorunum.to}
          to={gorunum.to}
          end={gorunum.end}
          className={({ isActive }) =>
            cn(
              'rounded-card px-3 py-1.5 text-body-sm font-medium transition-colors',
              isActive
                ? 'bg-surface-2 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          {gorunum.label}
        </NavLink>
      ))}
    </nav>
  );
}

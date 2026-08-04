import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import {
  loadArchivePlans,
  saveArchivePlans,
  type ArchivePlan,
} from './bridge';

export function ArchivePage() {
  const [plans, setPlans] = useState<ArchivePlan[]>(() => loadArchivePlans());
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return plans;
    return plans.filter((plan) =>
      `${plan.targetCatalog} ${plan.targetName} ${plan.equipment}`
        .toLocaleLowerCase('tr-TR')
        .includes(q)
    );
  }, [plans, query]);

  function removePlan(id: string) {
    const updated = plans.filter((plan) => plan.id !== id);
    setPlans(updated);
    saveArchivePlans(updated);
  }

  return (
    <>
      <PageMeta
        title="Arşivim"
        description="Kişisel astrofotoğraf hedef planları, tamamlanan entegrasyon süreleri ve ekipman notları."
        noIndex
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Arşivim', path: '/arsivim' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Arşivim' },
          ]}
          title="Arşivim"
          description="Simülatör üzerinden planladığınız hedefler ve tamamlanan entegrasyon durumu. İlk sürüm cihazınızda yerel saklar."
        />

        <Panel title="Hedef planları" status={`${filtered.length} kayıt`}>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hedef, katalog veya ekipman ara…"
            className="mb-4 max-w-xl"
          />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-body-sm">
              <thead>
                <tr className="border-b border-border text-meta text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Hedef</th>
                  <th className="py-2 pr-4 font-medium">Ekipman</th>
                  <th className="py-2 pr-4 font-medium">Plan</th>
                  <th className="py-2 pr-4 font-medium">Tamamlanan</th>
                  <th className="py-2 pr-4 font-medium">İlerleme</th>
                  <th className="py-2 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((plan) => {
                  const progress = Math.min(
                    100,
                    (plan.completedHours / Math.max(1, plan.plannedHours)) * 100
                  );
                  return (
                    <tr key={plan.id} className="border-b border-border">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-foreground">
                          {plan.targetName}
                        </div>
                        <div className="mt-1">
                          <Badge tone="cold">{plan.targetCatalog}</Badge>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {plan.equipment}
                      </td>
                      <td className="tabular py-3 pr-4">{plan.plannedHours} sa</td>
                      <td className="tabular py-3 pr-4">{plan.completedHours} sa</td>
                      <td className="py-3 pr-4">
                        <div className="h-2 min-w-28 overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="tabular mt-1 text-meta text-faint">
                          %{Math.round(progress)}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removePlan(plan.id)}
                        >
                          Sil
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <p className="mt-4 text-meta text-muted-foreground">
              Kayıt yok. Simülatör sayfasından bir hedef planı ekleyin.
            </p>
          )}
        </Panel>
      </Container>
    </>
  );
}

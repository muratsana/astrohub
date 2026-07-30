import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useEquipmentCatalog } from '@/services/content/equipment';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { EquipmentGlyph } from './EquipmentGlyph';
import {
  equipmentCategoryLabels,
  equipmentCategoryOrder,
  equipmentPath,
  type EquipmentCategory,
  type EquipmentModel,
} from './data';
import {
  MAX_COMPARE,
  compareRows,
  parseCompareParam,
  toggleCompare,
} from './compare';
import { cn } from '@/lib/cn';

/**
 * EKİPMAN KARŞILAŞTIRMA (§7.11).
 *
 * Seçim URL'de (`?m=slug,slug`) taşınıyor: forumda "şu ikisi arasında
 * kaldım" diye sorarken bağlantıyı yapıştırmak yetiyor. Tarayıcı geri
 * tuşu da doğru çalışıyor.
 *
 * Tablo farklı olan satırları işaretliyor. Ortak değerleri gizlemek
 * yerine soluklaştırıyoruz: "ikisinde de var" bilgisi kararı etkilemese de
 * eksik olduğu izlenimini vermemeli.
 */
export function EquipmentComparePage() {
  const catalog = useEquipmentCatalog();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EquipmentCategory | 'hepsi'>('hepsi');
  const [warning, setWarning] = useState<string | null>(null);

  const known = useMemo(
    () => new Set(catalog.items.map((m) => m.slug)),
    [catalog.items]
  );

  const selectedSlugs = useMemo(
    () => parseCompareParam(params.get('m'), known),
    [params, known]
  );

  const selected = useMemo(
    () =>
      selectedSlugs
        .map((slug) => catalog.items.find((m) => m.slug === slug))
        .filter((m): m is EquipmentModel => m !== undefined),
    [selectedSlugs, catalog.items]
  );

  const rows = useMemo(() => compareRows(selected), [selected]);

  /*
   * Kategori filtresi seçili modelden **türetiliyor**: farklı kategorilerden
   * iki kaydı yan yana koymak (bir montürle bir filtre) anlamlı bir tablo
   * üretmiyor. İlk seçim kategoriyi belirliyor, sonraki aramalar ona
   * kilitleniyor — ama kullanıcı isterse filtreyi elle gevşetebiliyor.
   */
  const lockedCategory = selected[0]?.category;

  const candidates = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return catalog.items
      .filter((m) => {
        if (selectedSlugs.includes(m.slug)) return false;
        const wanted = category !== 'hepsi' ? category : lockedCategory;
        if (wanted && m.category !== wanted) return false;
        if (!q) return true;
        return `${m.brand} ${m.model}`.toLocaleLowerCase('tr-TR').includes(q);
      })
      .slice(0, 24);
  }, [catalog.items, search, category, lockedCategory, selectedSlugs]);

  function toggle(slug: string) {
    const { next, full } = toggleCompare(selectedSlugs, slug);
    if (full) {
      setWarning(
        `En fazla ${MAX_COMPARE} model karşılaştırılır. Yeni bir model eklemek için önce birini çıkarın.`
      );
      return;
    }
    setWarning(null);
    setParams(next.length > 0 ? { m: next.join(',') } : {}, { replace: false });
  }

  return (
    <>
      <PageMeta
        title="Ekipman Karşılaştırma"
        description="Teleskop, kamera, montür ve filtreleri teknik özellikleriyle yan yana karşılaştırın; farklı olan satırlar işaretlenir."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Ekipman', path: '/ekipman' },
          { name: 'Karşılaştırma', path: '/ekipman/karsilastir' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Ekipman', to: '/ekipman' },
            { label: 'Karşılaştırma' },
          ]}
          title="Ekipman Karşılaştırma"
          description={`En fazla ${MAX_COMPARE} modeli teknik özellikleriyle yan yana koyun. Farklı olan satırlar işaretlenir; seçiminiz adres çubuğunda taşındığı için bağlantıyı paylaşabilirsiniz.`}
          actions={
            selected.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setParams({}, { replace: false })}
              >
                Seçimi temizle
              </Button>
            )
          }
        />

        <CatalogSourceNote selection={catalog} />

        {warning && (
          <p
            role="alert"
            className="mb-3 rounded-card border border-warning/40 bg-surface-1 px-3 py-2 text-body-sm text-warning"
          >
            {warning}
          </p>
        )}

        {/* ── Seçilenler ── */}
        {selected.length === 0 ? (
          <EmptyState
            message="Henüz model seçilmedi"
            hint="Aşağıdaki listeden en az iki model ekleyin. Tek modelde karşılaştırma tablosu yerine model sayfası daha faydalıdır."
            action={
              <ButtonLink to="/ekipman" size="sm" variant="secondary">
                Ekipman Veritabanı
              </ButtonLink>
            }
          />
        ) : (
          <div className="mb-4 flex flex-wrap gap-2">
            {selected.map((model) => (
              <span
                key={model.slug}
                className="flex items-center gap-2 rounded-card border border-primary/40 bg-surface-2 py-1.5 pl-2 pr-1.5"
              >
                <EquipmentGlyph
                  category={model.category}
                  className="h-5 w-5 shrink-0 text-primary"
                />
                <span className="text-[12px] text-foreground">
                  <span className="text-muted-foreground">{model.brand}</span>{' '}
                  {model.model}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggle(model.slug)}
                  aria-label={`${model.brand} ${model.model} karşılaştırmadan çıkar`}
                >
                  ×
                </Button>
              </span>
            ))}
          </div>
        )}

        {/* ── Tablo ── */}
        {selected.length > 0 && (
          <div className="mb-6 overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border-strong bg-surface-2">
                  <th className="label px-3 py-2 font-normal">Özellik</th>
                  {selected.map((model) => (
                    <th key={model.slug} className="px-3 py-2 align-top">
                      <Link
                        to={equipmentPath(model)}
                        className="block text-[12.5px] font-medium text-foreground hover:text-primary"
                      >
                        {model.model}
                      </Link>
                      <span className="mt-0.5 block text-meta text-muted-foreground">
                        {model.brand} · {equipmentCategoryLabels[model.category]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.label}
                    className={cn(
                      'border-b border-border last:border-0',
                      !row.differs && 'text-muted-foreground'
                    )}
                  >
                    <th
                      scope="row"
                      className="px-3 py-2 align-top text-meta font-normal text-muted-foreground"
                    >
                      {row.label}
                      {row.differs && (
                        <Badge tone="primary" className="ml-1.5 align-middle">
                          fark
                        </Badge>
                      )}
                    </th>
                    {row.values.map((value, i) => (
                      <td
                        key={selected[i].slug}
                        className={cn(
                          'tabular px-3 py-2 align-top text-[12px]',
                          row.differs ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {value ?? (
                          <span className="text-faint" title="Bu model için veri yok">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-border px-3 py-2 text-meta leading-snug text-faint">
              “—” veri yok demektir, sıfır değil. Katalogda eksik bir alan
              gördüyseniz model sayfasından düzeltme önerebilirsiniz.
            </p>
          </div>
        )}

        {/* ── Model ekleme ── */}
        <div className="rounded-card border border-border bg-surface-1 p-3">
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="cmp-search" className="label mb-1 block">
                Model ara
              </label>
              <Input
                id="cmp-search"
                type="search"
                placeholder="Marka ya da model"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 text-[13px]"
              />
            </div>
            <div>
              <label htmlFor="cmp-category" className="label mb-1 block">
                Kategori
              </label>
              <Select
                id="cmp-category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as EquipmentCategory | 'hepsi')
                }
                className="h-10 text-[13px]"
              >
                <option value="hepsi">
                  {lockedCategory
                    ? `Seçime göre (${equipmentCategoryLabels[lockedCategory]})`
                    : 'Tüm kategoriler'}
                </option>
                {equipmentCategoryOrder.map((c) => (
                  <option key={c} value={c}>
                    {equipmentCategoryLabels[c]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {candidates.length === 0 ? (
            <p className="py-4 text-center text-body-sm text-muted-foreground">
              Eşleşen model yok. Aramayı kısaltın ya da kategori filtresini
              değiştirin.
            </p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {candidates.map((model) => (
                <li key={model.slug}>
                  <button
                    type="button"
                    onClick={() => toggle(model.slug)}
                    className="flex w-full items-center gap-2 rounded-card border border-border bg-surface-2 px-2.5 py-2 text-left transition-colors hover:border-border-strong"
                  >
                    <EquipmentGlyph
                      category={model.category}
                      className="h-6 w-6 shrink-0 text-muted-foreground"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] text-foreground">
                        {model.model}
                      </span>
                      <span className="block truncate text-meta text-muted-foreground">
                        {model.brand}
                      </span>
                    </span>
                    <span className="shrink-0 text-[16px] leading-none text-primary">
                      +
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </>
  );
}

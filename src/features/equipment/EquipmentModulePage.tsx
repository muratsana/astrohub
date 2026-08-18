import { useDeferredValue, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { Alert } from '@/components/ui/Alert';
import { ContentCard } from '@/components/ui/ContentCard';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import {
  CATALOG_PAGE_SIZE,
  useEquipmentCatalogPage,
} from '@/services/content/equipment';
import { EquipmentGlyph } from './EquipmentGlyph';
import { headlineSpec } from './builder/headline';
import {
  equipmentCategoryLabels,
  equipmentCategoryOrder,
  equipmentPath,
  productionStatusLabels,
  type EquipmentCategory,
} from './data';
import { cn } from '@/lib/cn';

/**
 * EKİPMAN KATALOĞU.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU SAYFA ARTIK YALNIZCA KATALOG
 *
 * Dört sekmesi vardı: "Setup Oluştur", "Ekipman Kataloğu", "Setup'larım",
 * "Ekipmanlarım". Dördünden ÜÇÜ kullanıcının kendi verisiydi — yani
 * kişisel bir depo, herkese açık ve arama motoruna sunulan bir katalog
 * sayfasının içinde duruyordu.
 *
 * Ayrımın maliyeti ölçülebilirdi: canlıda bir tek kayıtlı ekipman ve
 * dört envanter satırı vardı. Kullanıcı kendi ekipmanını profilinde
 * değil, katalog sayfasının üçüncü sekmesinde arıyordu ve bulamıyordu.
 *
 * Kişisel olan `/hesap?sekme=ekipmanlarim`a taşındı (bkz.
 * `MyEquipmentPanel`). Burada kalan tek şey katalog: herkese açık,
 * oturum gerektirmeyen, indekslenebilir bir ürün listesi.
 *
 * Sekme çubuğu da kalktı — tek bölüm için sekme çizmek, olmayan bir
 * seçim varmış gibi göstermekti.
 */
/*
 * Eski kişisel sekmelerin adresleri: `?sekme=olustur|setuplarim|ekipmanlarim`.
 * Üçü de artık hesapta. Yer imi ya da paylaşılmış bağlantı bu adreslere
 * geliyorsa boş bir kataloğa düşürmek yerine doğru yere gönderiyoruz.
 */
const TASINAN_SEKMELER = ['olustur', 'setuplarim', 'ekipmanlarim'];

export function EquipmentModulePage() {
  const [params] = useSearchParams();
  const sekme = params.get('sekme');
  if (sekme && TASINAN_SEKMELER.includes(sekme)) {
    return <Navigate to="/hesap?sekme=ekipmanlarim" replace />;
  }

  return (
    <>
      <PageMeta
        title="Ekipman Kataloğu"
        description="Teleskop, kamera, montür, filtre ve aksesuar modelleri; teknik verileriyle karşılaştırmalı katalog."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Ekipman', path: '/ekipman' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: 'Ekipman' }]}
          title="Ekipman Kataloğu"
          description="Marka ve modelleri teknik verileriyle inceleyin. Kendi ekipmanınızı kurmak, kaydetmek ve profilinizde göstermek için hesabınızdaki Ekipmanlarım bölümünü kullanın."
          actions={
            <div className="flex flex-wrap gap-2">
              <ButtonLink to="/ekipman/karsilastir" size="sm" variant="secondary">
                Model karşılaştır
              </ButtonLink>
              <ButtonLink to="/hesap?sekme=ekipmanlarim" size="sm">
                Ekipmanlarım
              </ButtonLink>
            </div>
          }
        />

        <CatalogBody />
      </Container>
    </>
  );
}

/**
 * Katalog gövdesi.
 *
 * Kategori seçilmeden model listelenmiyor. Eski tasarımda 129 kayıt tek
 * sayfaya dökülüyordu ve sayfa hem uzuyor hem de "ne arıyordum" sorusunu
 * kaybettiriyordu. Şimdi önce kategori, sonra arama.
 */
function CatalogBody() {
  const [category, setCategory] = useState<EquipmentCategory | ''>('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const deferredQuery = useDeferredValue(query.trim());
  const catalog = useEquipmentCatalogPage({
    category: category || 'hepsi',
    search: deferredQuery,
    page,
    pageSize: CATALOG_PAGE_SIZE,
  });
  const active = Boolean(category || deferredQuery);
  const pageCount = Math.max(1, Math.ceil(catalog.page.total / catalog.page.pageSize));

  useEffect(() => setPage(0), [category, deferredQuery]);

  return (
    <div className="space-y-3">
      <Panel
        title="Katalogda ara"
        status={
          catalog.loading
            ? 'aranıyor…'
            : active
              ? `${catalog.page.total} model`
              : 'kategori veya model seçin'
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {equipmentCategoryOrder.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(category === c ? '' : c)}
                className={cn(
                  'flex items-center gap-1.5 rounded-card border px-2.5 py-1.5 text-body-sm transition-colors',
                  category === c
                    ? 'border-primary/50 bg-surface-2 text-foreground'
                    : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                )}
              >
                <EquipmentGlyph category={c} className="h-4 w-4" />
                {equipmentCategoryLabels[c]}
              </button>
            ))}
        </div>

        <Input
          type="search"
          placeholder="Model ara"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-3 h-10 text-body-sm"
        />
      </Panel>

      {catalog.error && (
        <Alert>
          Katalog aranamadı: {catalog.error}. Yeniden denemek için{' '}
          <button type="button" className="text-primary" onClick={catalog.refresh}>
            tıklayın
          </button>
          .
        </Alert>
      )}

      {!active || catalog.page.items.length === 0 ? (
        <EmptyState
          message={category || query ? 'Eşleşen model yok' : 'Bir kategori seçin'}
          hint={
            category || query
              ? 'Aramayı kısaltın ya da başka bir kategori deneyin.'
              : 'Katalog burada tek seferde dökülmüyor: önce ne aradığınızı seçin, model listesi ona göre daralsın.'
          }
        />
      ) : (
        <>
          <ul className="grid gap-2 sm:grid-cols-2">
            {catalog.page.items.map((m) => (
              <li key={m.slug}>
                <ContentCard
                  to={equipmentPath(m)}
                  variant="list"
                  className="gap-2.5"
                >
                  <EquipmentGlyph
                    category={m.category}
                    className="h-8 w-8 shrink-0 text-muted-foreground group-hover:text-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm text-foreground transition-colors group-hover:text-primary">
                      {m.model}
                    </span>
                    <span className="tabular block truncate text-meta text-muted-foreground">
                      {m.brand} · {headlineSpec(m)}
                    </span>
                  </span>
                  {m.productionStatus && m.productionStatus !== 'guncel' && (
                    <Badge tone="muted">
                      {productionStatusLabels[m.productionStatus]}
                    </Badge>
                  )}
                </ContentCard>
              </li>
            ))}
          </ul>
          {pageCount > 1 && (
            <nav
              aria-label="Katalog sayfaları"
              className="flex items-center justify-between gap-3 border-t border-border pt-3"
            >
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 0 || catalog.loading}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                ← Önceki
              </Button>
              <span className="tabular text-meta text-muted-foreground">
                {page + 1} / {pageCount}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={page + 1 >= pageCount || catalog.loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Sonraki →
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

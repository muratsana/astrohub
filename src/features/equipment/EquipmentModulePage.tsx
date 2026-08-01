import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { ContentCard } from '@/components/ui/ContentCard';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useEquipmentCatalog } from '@/services/content/equipment';
import { useAuth } from '@/features/auth/AuthContext';
import { SetupBuilder } from './builder/SetupBuilder';
import { headlineSpec } from './builder/headline';
import { EquipmentGlyph } from './EquipmentGlyph';
import {
  equipmentCategoryLabels,
  equipmentCategoryOrder,
  equipmentPath,
  productionStatusLabels,
  type EquipmentCategory,
} from './data';
import {
  emptyDraft,
  visibilityLabels,
  type SavedSetup,
} from '@/features/setups/store';
import { useSetups, type SetupStore } from '@/features/setups/useSetups';
import { isUuid } from '@/features/setups/remote';
import { useInventory } from '@/features/setups/useInventory';
import { SLOT_LABELS, type SetupDraft, type SlotId } from '@/domain/setup/types';
import { cn } from '@/lib/cn';
import { Alert } from '@/components/ui/Alert';

/**
 * EKİPMAN MODÜLÜ.
 *
 * Bu modül bir ürün kataloğu değil, bir planlama aracı. Varsayılan sekme
 * bu yüzden "Setup Oluştur": kullanıcı buraya "hangi teleskoplar var"
 * diye değil, "elimdekiler birlikte çalışır mı" diye geliyor. Katalog
 * ikinci sekmede ve orada da liste tek seferde dökülmüyor.
 *
 * Sekme adresle taşınıyor (`?sekme=katalog`) — paylaşılan bir bağlantı
 * doğru sekmeyi açıyor ve tarayıcı geri tuşu çalışıyor.
 */

const TABS = [
  { id: 'olustur', label: 'Setup Oluştur' },
  { id: 'katalog', label: 'Ekipman Kataloğu' },
  { id: 'setuplarim', label: 'Setup’larım' },
  { id: 'ekipmanlarim', label: 'Ekipmanlarım' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTab(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

export function EquipmentModulePage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('sekme');
  const tab: TabId = isTab(raw) ? raw : 'olustur';

  return (
    <>
      <PageMeta
        title="Ekipman ve Setup Planlayıcı"
        description="Astrofotoğraf setup'ınızı adım adım kurun; montür kapasitesi, örnekleme, backfocus, vinyet ve bağlantı uyumluluğunu hesaplı olarak kontrol edin."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Ekipman', path: '/ekipman' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: 'Ekipman' }]}
          title="Ekipman ve Setup Planlayıcı"
          description="Bileşenleri seçin, aralarındaki teknik uyumluluğu ve optik hesapları anında görün, setup’ınızı kaydedin. Her sonuç hangi değerlerden çıktığını gösterir; veri eksikse sistem tahmin üretmez."
          actions={
            <ButtonLink to="/ekipman/karsilastir" size="sm" variant="secondary">
              Model karşılaştır
            </ButtonLink>
          }
        />

        <div
          role="tablist"
          aria-label="Ekipman modülü bölümleri"
          className="mb-4 flex flex-wrap gap-1.5"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() =>
                  setParams(t.id === 'olustur' ? {} : { sekme: t.id })
                }
                className={cn(
                  'rounded-card border px-3 py-1.5 text-[12px] transition-colors',
                  active
                    ? 'border-primary/50 bg-surface-2 text-foreground'
                    : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'olustur' && <BuilderTab />}
        {tab === 'katalog' && <CatalogTab />}
        {tab === 'setuplarim' && <SetupsTab />}
        {tab === 'ekipmanlarim' && <InventoryTab />}
      </Container>
    </>
  );
}

/* ══════════════════════ Setup Oluştur ══════════════════════ */

function BuilderTab() {
  const [draft, setDraft] = useState<SetupDraft>(emptyDraft);
  const store = useSetups();

  return (
    <>
      <SetupBuilder
        draft={draft}
        onChange={setDraft}
        onSave={(meta) => void store.save({ ...meta, draft })}
      />
      <SyncNotice store={store} />
    </>
  );
}

/**
 * Kalıcılık durumu.
 *
 * "Kaydedildi" deyip aslında yalnızca tarayıcıya yazmış olmak, kullanıcı
 * cihaz değiştirdiğinde ortaya çıkan ve sebebi anlaşılmayan bir kayıp
 * üretir. Nerede durduğunu söylemek bir uyarı değil, dürüstlük.
 */
function SyncNotice({ store }: { store: SetupStore }) {
  if (store.error) {
    return (
      <Alert variant="text" className="mt-2">
        Veritabanına yazılamadı ({store.error}). Setup tarayıcınızda duruyor;
        bir sonraki girişte yeniden denenecek.
      </Alert>
    );
  }

  if (!store.durable) {
    return (
      <p className="mt-2 text-meta text-muted-foreground">
        Setup’larınız yalnızca bu tarayıcıda saklanıyor.{' '}
        <Link to="/giris" className="text-primary hover:underline">
          Giriş yaparsanız
        </Link>{' '}
        hesabınıza kaydedilir ve diğer cihazlarınızda da görünür.
      </p>
    );
  }

  return store.syncing ? (
    <p className="mt-2 text-meta text-faint">Hesabınızla eşitleniyor…</p>
  ) : null;
}

/* ══════════════════════ Katalog ══════════════════════ */

/**
 * Katalog sekmesi.
 *
 * Kategori seçilmeden model listelenmiyor. Eski tasarımda 129 kayıt tek
 * sayfaya dökülüyordu ve sayfa hem uzuyor hem de "ne arıyordum" sorusunu
 * kaybettiriyordu. Şimdi önce kategori, sonra arama.
 */
function CatalogTab() {
  const catalog = useEquipmentCatalog();
  const [category, setCategory] = useState<EquipmentCategory | ''>('');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of catalog.items) map.set(m.category, (map.get(m.category) ?? 0) + 1);
    return map;
  }, [catalog.items]);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!category && !q) return [];
    return catalog.items
      .filter((m) => (category ? m.category === category : true))
      .filter((m) =>
        q ? `${m.brand} ${m.model}`.toLocaleLowerCase('tr-TR').includes(q) : true
      )
      .slice(0, 40);
  }, [catalog.items, category, query]);

  return (
    <div className="space-y-3">
      <Panel title="Kategori seç" status={`${catalog.items.length} model`}>
        <div className="flex flex-wrap gap-1.5">
          {equipmentCategoryOrder
            .filter((c) => (counts.get(c) ?? 0) > 0)
            .map((c) => (
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
                <span className="tabular text-faint">{counts.get(c)}</span>
              </button>
            ))}
        </div>

        <Input
          type="search"
          placeholder="Marka ya da model ara"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-3 h-10 text-[13px]"
        />
      </Panel>

      {results.length === 0 ? (
        <EmptyState
          message={category || query ? 'Eşleşen model yok' : 'Bir kategori seçin'}
          hint={
            category || query
              ? 'Aramayı kısaltın ya da başka bir kategori deneyin.'
              : 'Katalog burada tek seferde dökülmüyor: önce ne aradığınızı seçin, model listesi ona göre daralsın.'
          }
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {results.map((m) => (
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
      )}
    </div>
  );
}

/* ══════════════════════ Setup'larım ══════════════════════ */

function SetupsTab() {
  const store = useSetups();
  const setups = store.setups;

  if (setups.length === 0) {
    return (
      <EmptyState
        message="Henüz kayıtlı setup yok"
        hint="“Setup Oluştur” sekmesinde bileşenleri seçip kaydettiğinizde burada listelenir. Kayıtlı setup, fotoğraf yüklerken künyeyi tek seçimle doldurur."
      />
    );
  }

  return (
    <>
      <ul className="grid gap-2 sm:grid-cols-2">
        {setups.map((setup) => (
          <li key={setup.id}>
            <SetupCard setup={setup} store={store} />
          </li>
        ))}
      </ul>
      <SyncNotice store={store} />
    </>
  );
}

function SetupCard({
  setup,
  store,
}: {
  setup: SavedSetup;
  store: SetupStore;
}) {
  const catalog = useEquipmentCatalog();
  const parts = (Object.entries(setup.draft.slots) as [SlotId, string][])
    .map(([slot, slug]) => {
      const model = catalog.items.find((m) => m.slug === slug);
      return model ? { slot, model } : null;
    })
    .filter((p): p is { slot: SlotId; model: (typeof catalog.items)[number] } => p !== null);

  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-surface-1 p-3">
      <div className="mb-1 flex flex-wrap items-baseline gap-2">
        <h3 className="text-[14px] font-medium text-foreground">{setup.name}</h3>
        {setup.isDefault && <Badge tone="primary">varsayılan</Badge>}
        <Badge tone="muted">{visibilityLabels[setup.visibility]}</Badge>
      </div>
      {setup.purpose && (
        <p className="text-meta text-cold">{setup.purpose}</p>
      )}
      {setup.description && (
        <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">
          {setup.description}
        </p>
      )}

      <ul className="mt-2 space-y-0.5">
        {parts.map(({ slot, model }) => (
          <li
            key={slot}
            className="flex items-baseline justify-between gap-2 text-meta"
          >
            <span className="text-muted-foreground">{SLOT_LABELS[slot]}</span>
            <span className="truncate text-right text-foreground">
              {model.brand} {model.model}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-2.5">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void store.makeDefault(setup.id)}
        >
          Varsayılan yap
        </Button>
        {/* Paylaşım bağlantısı yalnızca veritabanına yazılmış kayıtlar
            için anlamlı: yerel kimlik karşı tarafta hiçbir şey açmaz. */}
        {isUuid(setup.id) && (
          <ButtonLink to={`/setup/${setup.id}`} size="sm" variant="ghost">
            Aç / paylaş
          </ButtonLink>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void store.duplicate(setup.id)}
        >
          Çoğalt
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => void store.remove(setup.id)}
        >
          Sil
        </Button>
      </div>

      <p className="tabular mt-1.5 text-meta text-faint">
        {new Date(setup.updatedAt).toLocaleDateString('tr-TR')} tarihinde
        güncellendi
      </p>
    </div>
  );
}

/* ══════════════════════ Ekipmanlarım ══════════════════════ */

function InventoryTab() {
  const catalog = useEquipmentCatalog();
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  const inventory = useInventory();
  const owned = inventory.owned;
  const ownedSet = new Set(owned);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return [];
    return catalog.items
      .filter((m) => `${m.brand} ${m.model}`.toLocaleLowerCase('tr-TR').includes(q))
      .slice(0, 12);
  }, [catalog.items, query]);

  const ownedModels = catalog.items.filter((m) => ownedSet.has(m.slug));

  return (
    <div className="space-y-3">
      <Panel title="Ekipmanlarım" status={`${owned.length} kayıt`}>
        <p className="mb-3 text-body-sm leading-relaxed text-muted-foreground">
          Sahip olduğunuz ekipmanları işaretleyin; setup kurarken listeniz
          önce gelir ve ilanlarda eşleşme kolaylaşır. Katalogda olmayan bir
          ürününüz varsa model sayfasından katalog önerisi gönderebilirsiniz —
          onaylanana kadar yalnızca size görünür.
        </p>

        <Input
          type="search"
          placeholder="Eklemek için marka ya da model ara"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 text-[13px]"
        />

        {results.length > 0 && (
          <ul className="mt-2 rounded-card border border-border">
            {results.map((m) => (
              <li key={m.slug}>
                <button
                  type="button"
                  onClick={() => void inventory.toggle(m.slug)}
                  className="flex w-full items-center gap-2 border-b border-border px-2.5 py-2 text-left transition-colors last:border-0 hover:bg-surface-2"
                >
                  <EquipmentGlyph
                    category={m.category}
                    className="h-6 w-6 shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                    {m.brand} {m.model}
                  </span>
                  <span className="shrink-0 text-meta text-primary">
                    {ownedSet.has(m.slug) ? 'çıkar' : 'ekle'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!user && (
          <p className="mt-2 text-meta leading-snug text-warning">
            Giriş yapılmadığı için envanter yalnızca bu tarayıcıda saklanıyor.
            Hesap sistemi bağlandığında listeniz hesabınıza taşınacak.
          </p>
        )}
      </Panel>

      {ownedModels.length === 0 ? (
        <EmptyState
          message="Envanteriniz boş"
          hint="Yukarıdaki aramadan sahip olduğunuz ekipmanları ekleyin."
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {ownedModels.map((m) => (
            <li
              key={m.slug}
              className="flex items-center gap-2.5 rounded-card border border-border bg-surface-1 px-3 py-2.5"
            >
              <EquipmentGlyph
                category={m.category}
                className="h-8 w-8 shrink-0 text-primary"
              />
              <span className="min-w-0 flex-1">
                <Link
                  to={equipmentPath(m)}
                  className="block truncate text-[13px] text-foreground hover:text-primary"
                >
                  {m.model}
                </Link>
                <span className="tabular block truncate text-meta text-muted-foreground">
                  {m.brand} · {headlineSpec(m)}
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void inventory.toggle(m.slug)}
              >
                Çıkar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

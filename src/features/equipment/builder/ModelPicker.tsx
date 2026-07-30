import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EquipmentGlyph } from '../EquipmentGlyph';
import {
  equipmentCategoryLabels,
  productionStatusLabels,
  type EquipmentCategory,
  type EquipmentModel,
} from '../data';
import { headlineSpec } from './headline';
import { cn } from '@/lib/cn';

/**
 * KATEGORİ → MARKA → MODEL SEÇİCİ.
 *
 * Üç kademeli ve her kademe bir öncekine bağlı. Sebebi ölçek: katalog on
 * binlerce modele çıktığında tek bir açılır liste kullanılamaz hâle
 * geliyor. Marka kademesi arama alanını onlarca kayda indiriyor ve model
 * araması ancak o zaman gerçekten "aranabilir" oluyor.
 *
 * LİSTE HİÇBİR ZAMAN TÜMÜYLE DÖKÜLMEZ. Her kademede en fazla bir ekran
 * dolusu sonuç gösteriliyor; gerisi için arama daraltılıyor. Bu, sayfayı
 * kısa tutmanın yanı sıra "hepsini görüyorum" yanılsamasını da önlüyor.
 *
 * SATIRDA YALNIZCA DÖRT BİLGİ var: ad, tür, tek bir temel teknik değer ve
 * üretim durumu. Teknik künyenin tamamı seçimden SONRA açılıyor — liste
 * içinde göstermek, seçim yapmayı zorlaştıran bir duvar üretiyordu.
 */

interface Props {
  /** Bu yuvaya konabilecek katalog kategorileri. */
  categories: string[];
  catalog: EquipmentModel[];
  value?: EquipmentModel;
  onChange: (model: EquipmentModel | undefined) => void;
  /** Yuva adı — boş durumda düğmede görünür. */
  label: string;
}

const PAGE = 14;

export function ModelPicker({ categories, catalog, value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<EquipmentCategory | ''>('');
  const [brand, setBrand] = useState('');
  const [query, setQuery] = useState('');
  const panelId = useRef(
    `picker-${Math.random().toString(36).slice(2, 7)}`
  ).current;

  /* Yuvaya tek kategori uygunsa kademeyi hiç sormuyoruz: kullanıcıya
     tek seçenekli bir menü göstermek, tıklama saymaktan başka bir şey
     yapmaz. */
  const available = useMemo(
    () => categories.filter((c) => catalog.some((m) => m.category === c)),
    [categories, catalog]
  );

  useEffect(() => {
    if (available.length === 1) setCategory(available[0] as EquipmentCategory);
  }, [available]);

  const inCategory = useMemo(
    () => catalog.filter((m) => (category ? m.category === category : available.includes(m.category))),
    [catalog, category, available]
  );

  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of inCategory) counts.set(m.brand, (counts.get(m.brand) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'tr'));
  }, [inCategory]);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return inCategory.filter((m) => {
      if (brand && m.brand !== brand) return false;
      if (!q) return true;
      return `${m.brand} ${m.model}`.toLocaleLowerCase('tr-TR').includes(q);
    });
  }, [inCategory, brand, query]);

  const shown = results.slice(0, PAGE);

  function pick(model: EquipmentModel) {
    onChange(model);
    setOpen(false);
    setQuery('');
  }

  if (value && !open) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-border bg-surface-2 p-1.5 text-primary">
          <EquipmentGlyph category={value.category} className="block h-full w-full" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-foreground">
            {value.model}
          </span>
          <span className="tabular block truncate text-meta text-muted-foreground">
            {value.brand} · {headlineSpec(value)}
          </span>
        </span>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          Değiştir
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onChange(undefined)}>
          Kaldır
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        + {label} ekle
      </Button>
    );
  }

  return (
    <div className="rounded-card border border-border-strong bg-surface-2 p-2.5">
      {/* ── Kademe 1: kategori ── */}
      {available.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {available.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategory(c as EquipmentCategory);
                setBrand('');
              }}
              className={cn(
                'rounded-card border px-2 py-0.5 text-meta transition-colors',
                category === c
                  ? 'border-primary/50 bg-surface-3 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {equipmentCategoryLabels[c as EquipmentCategory]}
            </button>
          ))}
        </div>
      )}

      {/* ── Kademe 2: marka ── */}
      <div className="mb-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setBrand('')}
          className={cn(
            'rounded-card border px-2 py-0.5 text-meta transition-colors',
            brand === ''
              ? 'border-primary/50 bg-surface-3 text-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          Tüm markalar
        </button>
        {brands.map(([name, count]) => (
          <button
            key={name}
            type="button"
            onClick={() => setBrand(name)}
            className={cn(
              'rounded-card border px-2 py-0.5 text-meta transition-colors',
              brand === name
                ? 'border-primary/50 bg-surface-3 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {name}{' '}
            <span className="tabular text-faint">{count}</span>
          </button>
        ))}
      </div>

      {/* ── Kademe 3: model araması ── */}
      <label htmlFor={panelId} className="sr-only">
        {label} ara
      </label>
      <Input
        id={panelId}
        type="search"
        autoFocus
        placeholder={`${label} ara — marka ya da model`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-2 h-9 text-[12.5px]"
      />

      {shown.length === 0 ? (
        <p className="px-1 py-3 text-body-sm leading-relaxed text-muted-foreground">
          Eşleşme yok. Aramayı kısaltın ya da başka bir marka seçin.
          Katalogda olmayan bir ürünü “Ekipmanlarım” bölümünden
          ekleyebilirsiniz.
        </p>
      ) : (
        <ul className="max-h-72 overflow-auto rounded-card border border-border bg-surface-1">
          {shown.map((m) => (
            <li key={m.slug}>
              <button
                type="button"
                onClick={() => pick(m)}
                className="flex w-full items-center gap-2 border-b border-border px-2.5 py-2 text-left transition-colors last:border-0 hover:bg-surface-2"
              >
                <EquipmentGlyph
                  category={m.category}
                  className="h-7 w-7 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] text-foreground">
                    {m.model}
                  </span>
                  <span className="tabular block truncate text-meta text-muted-foreground">
                    {m.brand} · {equipmentCategoryLabels[m.category]} ·{' '}
                    {headlineSpec(m)}
                  </span>
                </span>
                {m.productionStatus && m.productionStatus !== 'guncel' && (
                  <Badge tone="muted">
                    {productionStatusLabels[m.productionStatus]}
                  </Badge>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="tabular text-meta text-faint">
          {results.length > shown.length
            ? `${results.length} eşleşmenin ilk ${shown.length} tanesi`
            : `${results.length} eşleşme`}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}

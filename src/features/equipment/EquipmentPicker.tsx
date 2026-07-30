import { useMemo, useRef, useState } from 'react';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/AuthContext';
import { useEquipmentCatalog } from '@/services/content/equipment';
import {
  contributeEquipment,
  validateContribution,
} from '@/services/content/equipmentContribute';
import {
  equipmentCategoryLabels,
  type EquipmentCategory,
  type EquipmentModel,
} from './data';
import { cn } from '@/lib/cn';
import { Alert } from '@/components/ui/Alert';

/**
 * EKİPMAN SEÇİCİ — künye alanlarının katalog bağı.
 *
 * Serbest metin alanı yerine katalogdan seçim: "ASI2600", "asi 2600 mm",
 * "ZWO ASI2600MM Pro" aynı kameranın üç yazımı ve serbest metin bunları
 * üç ayrı ekipman yapıyordu. Katalog bağı olunca "bu ekipmanla çekilmiş
 * fotoğraflar" sorusu cevaplanabilir hâle geliyor.
 *
 * AMA SERBEST METİN TÜMDEN KAPANMIYOR. Katalogda olmayan bir modelle
 * çekim yapan kullanıcıyı künyeyi eksik bırakmaya zorlamak, veriyi
 * temizlemek uğruna veriyi kaybetmek olurdu. İki çıkış var:
 *
 *   1. "Katalogda yok, ekle" — kayıt onaysız açılır, yalnızca ekleyene
 *      görünür, editör onaylayınca kataloğa girer (0013).
 *   2. Oturum yoksa girilen metin künyede serbest metin olarak kalır.
 *
 * Liste `<datalist>` ile değil elle çiziliyor: datalist'te seçilen öğenin
 * kimliğini almanın taşınabilir bir yolu yok — yalnızca metin döner ve
 * katalog bağı kurulamaz.
 */
export function EquipmentPicker({
  category,
  label,
  value,
  onChange,
  placeholder,
}: {
  category: EquipmentCategory;
  label: string;
  /** Seçilen model ya da serbest metin. */
  value: { slug?: string; text: string };
  onChange: (next: { slug?: string; text: string }) => void;
  placeholder?: string;
}) {
  const catalog = useEquipmentCatalog();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inputId = useRef(
    `eq-picker-${category}-${Math.random().toString(36).slice(2, 7)}`
  ).current;

  const options = useMemo(() => {
    const inCategory = catalog.items.filter((m) => m.category === category);
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return inCategory.slice(0, 12);

    return inCategory
      .filter((m) =>
        `${m.brand} ${m.model}`.toLocaleLowerCase('tr-TR').includes(q)
      )
      .slice(0, 12);
  }, [catalog.items, category, query]);

  function select(model: EquipmentModel) {
    onChange({ slug: model.slug, text: `${model.brand} ${model.model}` });
    setQuery('');
    setOpen(false);
  }

  async function submitNew() {
    if (!user) return;
    const problem = validateContribution({ brand: newBrand, model: newModel });
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const created = await contributeEquipment({
        brand: newBrand,
        model: newModel,
        category,
        userId: user.id,
      });
      onChange({ slug: created.slug, text: `${created.brand} ${created.model}` });
      setAdding(false);
      setOpen(false);
      setNewBrand('');
      setNewModel('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt eklenemedi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor={inputId} className="label mb-1 block">
        {label}
      </label>

      {value.slug ? (
        /* Seçili durum: katalog bağı kurulmuş. */
        <div className="flex items-center gap-2 rounded-card border border-primary/40 bg-surface-2 px-3 py-2">
          <Badge tone="primary">Katalog</Badge>
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
            {value.text}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ text: '' })}
          >
            Değiştir
          </Button>
        </div>
      ) : (
        <>
          <Input
            id={inputId}
            value={query || value.text}
            placeholder={placeholder ?? `${equipmentCategoryLabels[category]} ara`}
            onChange={(e) => {
              setQuery(e.target.value);
              // Serbest metin de künyeye yazılır: katalogda olmayan bir
              // ekipmanı hiç kaydetmemektense adını kaydetmek iyidir.
              onChange({ text: e.target.value });
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="h-10 text-[13px]"
          />

          {open && (
            <div className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-auto rounded-card border border-border-strong bg-surface-1 shadow-lg">
              {options.length > 0 ? (
                <ul>
                  {options.map((model) => (
                    <li key={model.slug}>
                      <button
                        type="button"
                        onClick={() => select(model)}
                        className="flex w-full items-baseline gap-2 border-b border-border px-3 py-2 text-left transition-colors last:border-0 hover:bg-surface-2"
                      >
                        <span className="text-[12.5px] text-foreground">
                          <span className="text-muted-foreground">
                            {model.brand}
                          </span>{' '}
                          {model.model}
                        </span>
                        <span className="tabular ml-auto shrink-0 text-meta text-faint">
                          {Object.values(model.specs).slice(0, 2).join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-3 text-body-sm text-muted-foreground">
                  Katalogda eşleşme yok.
                </p>
              )}

              <div className="border-t border-border-strong p-2">
                {adding ? (
                  <div className="space-y-2">
                    <Input
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="Marka (ör. Takahashi)"
                      className="h-9 text-[12px]"
                    />
                    <Input
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="Model (ör. FSQ-106EDX4)"
                      className="h-9 text-[12px]"
                    />
                    {error && (
                      <Alert variant="text">
                        {error}
                      </Alert>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void submitNew()}
                      >
                        {busy ? 'Ekleniyor…' : 'Ekle'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAdding(false)}
                      >
                        Vazgeç
                      </Button>
                    </div>
                    <p className="text-meta leading-snug text-faint">
                      Kayıt onaya gider ve o zamana kadar yalnızca size
                      görünür. Künyenizde hemen kullanabilirsiniz.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-meta text-muted-foreground">
                      {user
                        ? 'Aradığınız model yok mu?'
                        : 'Girdiğiniz ad künyede serbest metin olarak kalır.'}
                    </span>
                    {user && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setAdding(true)}
                      >
                        Katalog’a ekle
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Açık listeyi kapatmak için arka plan yakalayıcı. */}
      {open && !adding && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-10 cursor-default"
        />
      )}
    </div>
  );
}

/** Filtre seçimi için basit çoklu liste — filtreler kategoriden gelir. */
export function FilterSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  id: string;
}) {
  const catalog = useEquipmentCatalog();
  const filters = catalog.items.filter((m) => m.category === 'filtre');

  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn('h-10 text-[13px]')}
    >
      <option value="">Filtre seçin (isteğe bağlı)</option>
      {filters.map((f) => (
        <option key={f.slug} value={`${f.brand} ${f.model}`}>
          {f.brand} {f.model}
        </option>
      ))}
    </Select>
  );
}

import { useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  isMovingKind,
  targetKindLabels,
  type TargetKind,
} from '@/domain/targets/derive';
import { searchTargets, targets, type CelestialTarget } from './data';

/**
 * HEDEF SEÇİCİ — önce obje tipi, sonra katalog kaydı.
 *
 * Katalog 200 kaydı geçince tek bir `<select>` işe yaramaz hâle geldi:
 * açılan listede 200 satırı gözle taramak, aradığı hedefi bilen kullanıcı
 * için de bilmeyen için de kötü. Bu yüzden iki aşama var ve sıra bilinçli:
 *
 *   1. OBJE TİPİ. Kullanıcı ne çektiğini her zaman bilir — "bir galaksi",
 *      "Ay", "bir meteor yağmuru". Tipi önce sormak, aday listesini 200'den
 *      onlarcaya indiriyor ve ikinci adımı gerçekten aranabilir kılıyor.
 *   2. KATALOG KAYDI. Serbest metinle arama; kod, Türkçe ad, alias ve
 *      takımyıldız üzerinden eşleşir. "NGC 224" yazan kullanıcı M 31'i
 *      bulur — aksi hâlde aynı cisim iki ayrı hedef gibi kaydedilirdi.
 *
 * TİP SEÇMEK ZORUNLU DEĞİL. "Tüm türler" seçiliyken arama tüm katalogda
 * çalışır; kodu ezbere bilen kullanıcıyı iki tıkla yormanın anlamı yok.
 */

/** Tipleri kabaca "derin uzay" ve "güneş sistemi / manzara" diye ayırıyoruz. */
function groupedKinds(): { label: string; kinds: TargetKind[] }[] {
  const present = new Set(targets.map((t) => t.kind));
  const all = (Object.keys(targetKindLabels) as TargetKind[]).filter((k) =>
    present.has(k)
  );
  return [
    { label: 'Derin uzay', kinds: all.filter((k) => !isMovingKind(k)) },
    { label: 'Güneş sistemi ve manzara', kinds: all.filter(isMovingKind) },
  ];
}

export function TargetPicker({
  value,
  onChange,
  kind,
  onKindChange,
  selectClassName,
}: {
  /** Seçili hedefin slug'ı; boşsa seçim yok. */
  value: string;
  onChange: (target: CelestialTarget | null) => void;
  kind: TargetKind | 'hepsi';
  onKindChange: (kind: TargetKind | 'hepsi') => void;
  selectClassName: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const listId = useRef(
    `target-picker-${Math.random().toString(36).slice(2, 7)}`
  ).current;

  const groups = useMemo(groupedKinds, []);
  const selected = useMemo(
    () => targets.find((t) => t.slug === value) ?? null,
    [value]
  );

  const options = useMemo(() => {
    const base = query.trim() ? searchTargets(query, targets.length) : targets;
    const filtered =
      kind === 'hepsi' ? base : base.filter((t) => t.kind === kind);
    // On beş satır: listenin altını görmek için kaydırma gerekmesin, ama
    // "hiç sonuç yok" ile "çok sonuç var" ayrımı da kaybolmasın.
    return filtered.slice(0, 15);
  }, [query, kind]);

  const totalMatches = useMemo(() => {
    const base = query.trim() ? searchTargets(query, targets.length) : targets;
    return kind === 'hepsi'
      ? base.length
      : base.filter((t) => t.kind === kind).length;
  }, [query, kind]);

  function pick(target: CelestialTarget) {
    onChange(target);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      {/* ── Adım 1: obje tipi ── */}
      <div>
        <label htmlFor={`${listId}-kind`} className="label mb-1 block">
          Obje tipi
        </label>
        <select
          id={`${listId}-kind`}
          className={selectClassName}
          value={kind}
          onChange={(e) => {
            const next = e.target.value as TargetKind | 'hepsi';
            onKindChange(next);
            // Seçili hedef yeni tipe uymuyorsa seçim düşer: aksi hâlde
            // "Gezegen" filtresi altında bir galaksi seçili görünürdü.
            if (next !== 'hepsi' && selected && selected.kind !== next) {
              onChange(null);
            }
          }}
        >
          <option value="hepsi">Tüm türler ({targets.length} kayıt)</option>
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.kinds.map((k) => (
                <option key={k} value={k}>
                  {targetKindLabels[k]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* ── Adım 2: katalog kaydı ── */}
      <div className="relative">
        <label htmlFor={`${listId}-search`} className="label mb-1 block">
          Katalog kaydı
        </label>

        {selected ? (
          <div className="flex items-center gap-2 rounded-card border border-primary/40 bg-surface-2 px-3 py-2.5">
            <Badge tone="primary">{selected.catalog}</Badge>
            <span className="min-w-0 flex-1 truncate text-body-sm text-foreground">
              {selected.name}
            </span>
            <span className="hidden shrink-0 text-meta text-muted-foreground sm:inline">
              {targetKindLabels[selected.kind]}
            </span>
            <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
              Değiştir
            </Button>
          </div>
        ) : (
          <>
            <Input
              id={`${listId}-search`}
              type="search"
              autoComplete="off"
              placeholder="M 31, NGC 7000, Andromeda, Jüpiter…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              className="h-11 text-sm"
            />

            {open && (
              <div className="absolute left-0 right-0 z-[var(--z-popover)] mt-1 overflow-hidden rounded-card border border-border-strong bg-surface-1 shadow-overlay">
                {options.length === 0 ? (
                  <p className="px-3 py-3 text-body-sm leading-relaxed text-muted-foreground">
                    Bu türde eşleşen kayıt yok. Katalogda olmayan bir hedef
                    çektiyseniz seçimi boş bırakıp başlığa yazabilirsiniz —
                    künye yine kaydedilir.
                  </p>
                ) : (
                  <>
                    <ul className="max-h-72 overflow-auto">
                      {options.map((t) => (
                        <li key={t.slug}>
                          <button
                            type="button"
                            onClick={() => pick(t)}
                            className="flex w-full items-baseline gap-2 border-b border-border px-3 py-2 text-left transition-colors last:border-0 hover:bg-surface-2"
                          >
                            <span className="tabular w-16 shrink-0 text-body-sm font-medium text-primary">
                              {t.catalog}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-caption text-foreground">
                              {t.name}
                            </span>
                            <span className="hidden shrink-0 text-meta text-faint sm:inline">
                              {t.moving ? '—' : t.constellation} ·{' '}
                              {targetKindLabels[t.kind]}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {totalMatches > options.length && (
                      <p className="border-t border-border-strong px-3 py-1.5 text-meta text-faint">
                        {totalMatches} eşleşmenin ilk {options.length} tanesi —
                        aramayı daraltın.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {open && (
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
        )}
      </div>

      {selected && (
        <div className="rounded-card border border-border bg-surface-2/60 px-3 py-2.5">
          <p className="text-body-sm leading-relaxed text-muted-foreground">
            {selected.description}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
            <Fact label="Takımyıldız" value={selected.constellation} />
            <Fact label="Açısal boyut" value={selected.angularSize} />
            <Fact label="Önerilen odak" value={selected.recommendedFocal} />
            <Fact label="Zorluk" value={selected.difficulty} />
          </dl>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="label text-meta">{label}</dt>
      <dd className="tabular truncate text-meta text-foreground">{value}</dd>
    </div>
  );
}

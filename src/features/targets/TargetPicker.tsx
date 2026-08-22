import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import {
  isMovingKind,
  targetKindLabels,
  type TargetKind,
} from '@/domain/targets/derive';
import { searchTargets, targets, type CelestialTarget } from './data';
import { useCatalogSearch } from '@/services/content/targets';
import {
  canonicalCatalogCode,
  contributeTarget,
  validateTargetContribution,
} from '@/services/content/targetContribute';

/**
 * HEDEF SEÇİCİ — tek kaynak katalog kaydı.
 *
 * Katalog 200 kaydı geçince tek bir `<select>` işe yaramaz hâle geldi:
 * açılan listede 200 satırı gözle taramak, aradığı hedefi bilen kullanıcı
 * için de bilmeyen için de kötü. Bu yüzden serbest arama var:
 *
 *   · KATALOG KAYDI. Kod, Türkçe ad, alias ve takımyıldız üzerinden
 *     eşleşir. "NGC 224" yazan kullanıcı M 31'i bulur — aksi hâlde aynı
 *     cisim iki ayrı hedef gibi kaydedilirdi.
 *
 * Upload akışında obje tipi kullanıcı girdisi değildir. Katalog satırında
 * zaten bulunur ve seçimden sonra yalnızca bilgi olarak gösterilir; fotoğraf
 * türü de yükleme sihirbazında bu katalog türünden türetilir. Kadraj ve
 * mozaik araçlarında aynı bileşenin tip filtresi açık kalabilir.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İKİ KAYNAK, TEK LİSTE
 *
 * Paketlenmiş liste 230 kayıt taşıyor; veritabanındaki katalog 16.149.
 * Arama ikisini birden yapıyor:
 *
 *   · Paketlenmiş liste ANINDA cevap veriyor ve ağ gerektirmiyor. En
 *     bilinen hedefler (M 31, NGC 7000, Ay) burada.
 *   · Sunucu araması gecikmeli geliyor ve gerisini kapsıyor — Sh2-101,
 *     LDN 1235, Arp 273 yalnızca orada.
 *
 * Sonuçlar slug'a göre tekilleniyor ve paketlenmiş olan önce geliyor:
 * onun Türkçe adı ve editör açıklaması var, sunucudan gelen ikizinde
 * yoksa listede iki kez görünmesindense iyisini göstermek doğru.
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
  kind = 'hepsi',
  onKindChange,
  selectClassName = 'h-11 w-full rounded-card border border-border bg-surface-1 px-3 text-sm text-foreground focus:border-primary/60',
  showKindFilter = true,
  showDetails = true,
  initialTarget = null,
}: {
  /** Seçili hedefin slug'ı; boşsa seçim yok. */
  value: string;
  onChange: (target: CelestialTarget | null) => void;
  kind?: TargetKind | 'hepsi';
  onKindChange?: (kind: TargetKind | 'hepsi') => void;
  selectClassName?: string;
  showKindFilter?: boolean;
  /** Dar araç kolonlarında seçili hedef açıklama kartını gizler. */
  showDetails?: boolean;
  /** Paket dışı seçili hedef; ör. mevcut fotoğrafı düzenlerken DB'den gelir. */
  initialTarget?: CelestialTarget | null;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newCatalog, setNewCatalog] = useState('');
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<TargetKind>(
    kind !== 'hepsi' ? kind : 'emisyon-bulutsusu'
  );
  const [newConstellation, setNewConstellation] = useState('');
  const [contributionError, setContributionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const auth = useAuth();
  /*
    Seçilen kayıt burada TUTULUYOR, yalnızca slug'la aranmıyor: sunucudan
    gelen bir hedef paketlenmiş listede yok ve `targets.find` onu
    bulamazdı. Seçim yapıldıktan sonra kutunun boşalması, kullanıcının
    seçtiğinin kaydedilmediği izlenimi verirdi.
  */
  const [secilenUzak, setSecilenUzak] = useState<CelestialTarget | null>(null);
  const listId = useRef(
    `target-picker-${Math.random().toString(36).slice(2, 7)}`
  ).current;
  const groups = useMemo(groupedKinds, []);
  const activeKind = showKindFilter ? kind : 'hepsi';

  const selected = useMemo(
    () =>
      targets.find((t) => t.slug === value) ??
      (secilenUzak?.slug === value ? secilenUzak : null),
    [value, secilenUzak]
  );

  useEffect(() => {
    if (!initialTarget || initialTarget.slug !== value) return;
    setSecilenUzak(initialTarget);
  }, [initialTarget, value]);

  const { rows: uzak, loading: uzakYukleniyor } = useCatalogSearch(
    query,
    activeKind
  );

  const yerel = useMemo(() => {
    const base = query.trim() ? searchTargets(query, targets.length) : targets;
    return activeKind === 'hepsi'
      ? base
      : base.filter((t) => t.kind === activeKind);
  }, [query, activeKind]);

  const eslesenler = useMemo(() => {
    const gorulen = new Set(yerel.map((t) => t.slug));
    return [...yerel, ...uzak.filter((t) => !gorulen.has(t.slug))];
  }, [yerel, uzak]);

  // On beş satır: listenin altını görmek için kaydırma gerekmesin, ama
  // "hiç sonuç yok" ile "çok sonuç var" ayrımı da kaybolmasın.
  const options = eslesenler.slice(0, 15);
  const totalMatches = eslesenler.length;

  function pick(target: CelestialTarget) {
    setSecilenUzak(target);
    onChange(target);
    setQuery('');
    setOpen(false);
    setAdding(false);
    setContributionError(null);
  }

  async function submitContribution() {
    if (!auth.user) {
      setContributionError('Katalog kaydı eklemek için giriş yapmalısınız.');
      return;
    }

    const payload = {
      catalog: canonicalCatalogCode(newCatalog || query),
      name: newName,
      kind: newKind,
      constellation: newConstellation,
    };
    const problem = validateTargetContribution(payload);
    if (problem) {
      setContributionError(problem);
      return;
    }

    setSubmitting(true);
    setContributionError(null);
    try {
      const created = await contributeTarget({
        ...payload,
        userId: auth.user.id,
      });
      pick(created);
      setNewCatalog('');
      setNewName('');
      setNewConstellation('');
    } catch (error) {
      setContributionError(
        error instanceof Error ? error.message : 'Katalog kaydı eklenemedi.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {showKindFilter && (
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
              onKindChange?.(next);
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
      )}

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
              placeholder="M 31, NGC 7000, Sh2-101, Andromeda…"
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
                  <div className="px-3 py-3">
                    <p className="text-body-sm leading-relaxed text-muted-foreground">
                      {uzakYukleniyor
                        ? 'Katalogda aranıyor…'
                        : activeKind === 'hepsi'
                          ? 'Eşleşen katalog kaydı yok. Kodu kontrol edin veya eksik hedefi katalog koduyla ekleyin.'
                          : 'Bu türde eşleşen katalog kaydı yok. Tür filtresini kaldırabilir veya eksik hedefi katalog koduyla ekleyebilirsiniz.'}
                    </p>
                    {!uzakYukleniyor && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => {
                          setAdding(true);
                          setNewCatalog(canonicalCatalogCode(query));
                        }}
                      >
                        + Katalog kaydı ekle
                      </Button>
                    )}
                  </div>
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
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-strong px-3 py-2">
                      <p className="text-meta text-faint">
                        {uzakYukleniyor
                          ? 'Katalogda aranıyor…'
                          : totalMatches > options.length
                            ? `${totalMatches} eşleşmenin ilk ${options.length} tanesi — aramayı daraltın.`
                            : `${totalMatches} eşleşme`}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAdding(true);
                          setNewCatalog(canonicalCatalogCode(query));
                        }}
                      >
                        Listede yoksa ekle
                      </Button>
                    </div>
                  </>
                )}

                {adding && (
                  <div className="border-t border-border-strong bg-surface-2 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="label mb-1 block">Katalog kodu</span>
                        <Input
                          value={newCatalog}
                          onChange={(e) => setNewCatalog(e.target.value)}
                          placeholder="NGC 6888, Sh2-157, vdB 141, V398 Cyg"
                          className="h-9 text-caption"
                        />
                      </label>
                      <label className="block">
                        <span className="label mb-1 block">Orijinal ad</span>
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Crescent Nebula"
                          className="h-9 text-caption"
                        />
                      </label>
                      <label className="block">
                        <span className="label mb-1 block">Obje tipi</span>
                        <select
                          value={newKind}
                          onChange={(e) => setNewKind(e.target.value as TargetKind)}
                          className="h-9 w-full rounded-card border border-border bg-surface-1 px-2 text-caption text-foreground"
                        >
                          {Object.entries(targetKindLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="label mb-1 block">Takımyıldız</span>
                        <Input
                          value={newConstellation}
                          onChange={(e) => setNewConstellation(e.target.value)}
                          placeholder="Kuğu"
                          className="h-9 text-caption"
                        />
                      </label>
                    </div>
                    {contributionError && (
                      <Alert variant="text" className="mt-2">
                        {contributionError}
                      </Alert>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAdding(false);
                          setContributionError(null);
                        }}
                      >
                        Vazgeç
                      </Button>
                      <Button size="sm" onClick={submitContribution} disabled={submitting}>
                        {submitting ? 'Ekleniyor…' : 'Ekle ve seç'}
                      </Button>
                    </div>
                  </div>
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

      {selected && showDetails && (
        <div className="rounded-card border border-border bg-surface-2/60 px-3 py-2.5">
          <p className="text-body-sm leading-relaxed text-muted-foreground">
            {selected.description}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
            <Fact label="Takımyıldız" value={selected.constellation} />
            <Fact label="Açısal boyut" value={selected.angularSize} />
            <Fact label="Önerilen odak" value={selected.recommendedFocal} />
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

import { useId, useMemo, useState } from 'react';
import { Input, Select } from '@/components/ui/Input';
import { FilterCell } from '@/components/ui/FilterBar';
import { cn } from '@/lib/cn';

/**
 * ÖN AYAR SEÇİCİ — katalog büyüdüğü için gerekli oldu.
 *
 * Araçların hazır ekipman listesi tohum veriden beslenirken 30–40
 * seçenekti ve düz bir `<select>` yetiyordu. Liste canlı kataloğa
 * bağlanınca 380 teleskop ve 250 kamera oldu; aynı düz liste artık
 * kullanılamaz — kullanıcı "Askar 71F"i bulmak için yüzlerce satır
 * kaydırıyor.
 *
 * İKİ DEĞİŞİKLİK:
 *
 *   1. Süzgeç kutusu. Marka ya da model parçası yazılınca liste daralır.
 *      Türkçe küçültme (`tr-TR`) kullanılıyor: "İ" harfi JavaScript'in
 *      varsayılan küçültmesinde "i̇" olur ve "istanbul optik" yazan
 *      kullanıcı "İstanbul Optik"i bulamaz.
 *
 *   2. Markaya göre `<optgroup>`. Aynı markanın modelleri bir arada
 *      durur; liste taranabilir hâle gelir.
 *
 * SEÇİM DEĞERİ SLUG, DİZİN DEĞİL. Liste önce tohum veriyle çiziliyor,
 * veritabanı yanıtı gelince değişiyor. Dizinle çalışan bir seçim, o an
 * kullanıcının seçtiği modelin yerine bambaşka bir modeli işaret ederdi
 * — üstelik sessizce, çünkü dizin hâlâ geçerli bir sayı.
 */

export interface PresetOption {
  slug: string;
  brand: string;
  label: string;
}

export function PresetSelect<T extends PresetOption>({
  label,
  options,
  value,
  onSelect,
  placeholder = 'Seç veya elle gir…',
  className,
  emptyHint,
}: {
  label: string;
  options: T[];
  /** Seçili slug; boş dize "seçilmedi" demek. */
  value: string;
  onSelect: (option: T | null) => void;
  placeholder?: string;
  className?: string;
  /** Liste boşken gösterilecek açıklama — sessiz boş kutu bırakmamak için. */
  emptyHint?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return options;
    return options.filter((o) =>
      `${o.brand} ${o.label}`.toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [options, query]);

  /* Markalar liste sırasını korur: ön ayarlar odak/piksel/yük sırasına
     göre geliyor ve o sıra bilgi taşıyor. Marka içinde alfabetik
     sıralamak, "en kısa odaktan en uzuna" bilgisini yok ederdi. */
  const groups = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const option of filtered) {
      const key = option.brand || 'Diğer';
      const list = map.get(key);
      if (list) list.push(option);
      else map.set(key, [option]);
    }
    return [...map.entries()];
  }, [filtered]);

  const selected = options.find((o) => o.slug === value);

  return (
    <FilterCell label={label} htmlFor={id} className={className}>
      <div className="grid gap-1.5">
        <Select
          id={id}
          value={value}
          className="h-9 w-full text-caption"
          onChange={(e) => {
            const next = options.find((o) => o.slug === e.target.value);
            onSelect(next ?? null);
          }}
        >
          <option value="">{placeholder}</option>
          {/* Süzgeç seçili kaydı eleyebilir; o zaman seçim kutuda
              görünmez ve kullanıcı "seçimim silindi" sanır. */}
          {selected && !filtered.includes(selected) && (
            <option value={selected.slug}>{selected.label}</option>
          )}
          {groups.map(([brand, items]) => (
            <optgroup key={brand} label={brand}>
              {items.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>

        {options.length > 12 && (
          <div className="flex items-center gap-1.5">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Marka veya model ara…"
              spellCheck={false}
              className="h-7 flex-1 text-meta"
              aria-label={`${label} içinde ara`}
            />
            <span
              className={cn(
                'tabular shrink-0 text-meta',
                filtered.length === 0 ? 'text-warning' : 'text-faint'
              )}
            >
              {filtered.length}/{options.length}
            </span>
          </div>
        )}

        {options.length === 0 && emptyHint && (
          <p className="text-meta leading-snug text-faint">{emptyHint}</p>
        )}
      </div>
    </FilterCell>
  );
}

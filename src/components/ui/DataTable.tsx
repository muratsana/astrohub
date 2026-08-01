import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { useIsNarrow } from './useIsNarrow';
import { useStoredChoice } from './useViewMode';

/**
 * VERİ TABLOSU — terminalin ana okuma birimi.
 *
 * Hairline satır ayrımı, büyük harf başlıklar, tabular sayılar. Satırlar
 * bağlantı olabilir; olduklarında yalnızca ilk hücre bir `<a>` taşır —
 * böylece klavye sırası tek adımda kalır ve ekran okuyucu satır başına
 * tek bağlantı duyurur.
 *
 * ══════════════════════════════════════════════════════════════════════
 * §7.3'ÜN TABLO MADDELERİ BURADA
 *
 * Bileşen vardı ama HİÇBİR SAYFA KULLANMIYORDU (kaynak taramasında tek
 * eşleşme kendi dosyasıydı) ve belgenin istediği yeteneklerin hiçbiri
 * yoktu. Eklenenler ve sebepleri:
 *
 * · SÜTUN BAŞLIĞINDAN SIRALAMA — tabloya bakan kullanıcı sıralamayı
 *   başlıkta arar. Sıralama motorun kendisine (`ExplorerQuery.sort`)
 *   yazılıyor, tablonun içine DEĞİL: ikinci bir sıralama durumu tutmak,
 *   ızgaradan tabloya geçen kullanıcıya sıralamasını kaybettirirdi.
 * · YÖN GÖRÜNÜR — `aria-sort` + ok. Yönü göstermeyen başlık, tıklayınca
 *   ne olacağını da söylemiyor demektir.
 * · YOĞUNLUK — aynı ekranda iki kat satır; karşılaştırma yapan
 *   kullanıcı için asıl kazanç bu.
 * · SÜTUN GÖSTER/GİZLE — herkes aynı üç sütuna bakmıyor.
 * · SABİT BAŞLIK ve SABİT İLK SÜTUN — kaydırırken hangi sütuna
 *   baktığını ve hangi satırda olduğunu kaybetmemek için.
 * · MOBİLDE KART — belge "tablo yerine uygun kart/liste dönüşümü"
 *   diyor. Yatay kaydırmalı tablo telefonda okunmuyor.
 */

export interface Column<T> {
  key: string;
  header: string;
  /** Hücre içeriği. */
  cell: (row: T) => ReactNode;
  /** Sayısal sütun: sağa hizalanır ve tabular yazılır. */
  numeric?: boolean;
  /** Dar ekranda gizlenecek sütun. */
  hideOnMobile?: boolean;
  width?: string;
  /**
   * Bu sütunun sıralama karşılıkları — motordaki sıralama DEĞERLERİ.
   *
   * Motor sıralamayı (alan, yön) çifti olarak değil ADLANDIRILMIŞ
   * seçenek olarak tutuyor (`ucuz`, `pahali`). Sütun o adları taşıyor:
   * başlığa tıklamak, açılır kutudaki seçimle AYNI durumu kuruyor ve
   * ikisi asla ayrışmıyor.
   */
  sort?: { asc?: string; desc?: string };
  /** Kullanıcı gizleyemesin — kimlik sütunu gibi. */
  alwaysVisible?: boolean;
}

export type TableDensity = 'rahat' | 'sik';

const DENSITY: Record<TableDensity, { cell: string; label: string }> = {
  rahat: { cell: 'py-2.5', label: 'Rahat' },
  sik: { cell: 'py-1', label: 'Sık' },
};

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  rowHref,
  empty = 'Kayıt yok.',
  className,
  sort,
  /**
   * Sütun ve yoğunluk tercihlerinin saklanacağı anahtar. Verilmezse
   * kontroller çizilmiyor: tercihi saklayamayacağımız bir ayarı sunmak,
   * kullanıcıya her ziyarette aynı işi yaptırmak olurdu.
   */
  preferenceKey,
}: {
  caption?: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Verilirse satırın ilk hücresi bağlantıya dönüşür. */
  rowHref?: (row: T) => string;
  empty?: string;
  className?: string;
  /** Motorun sıralama durumu; başlıklar bunu değiştiriyor. */
  sort?: { value: string; onChange: (value: string) => void };
  preferenceKey?: string;
}) {
  const narrow = useIsNarrow();
  const [density, setDensity] = useStoredChoice<TableDensity>(
    `tablo-yogunluk-${preferenceKey ?? 'genel'}`,
    ['rahat', 'sik'],
    'rahat'
  );
  const [hidden, setHidden] = useHiddenColumns(preferenceKey);
  const [pickerOpen, setPickerOpen] = useState(false);

  const visible = useMemo(
    () => columns.filter((c) => c.alwaysVisible || !hidden.includes(c.key)),
    [columns, hidden]
  );

  if (rows.length === 0) {
    return (
      <p className="border border-border bg-surface-1 px-4 py-10 text-center text-meta text-muted-foreground">
        {empty}
      </p>
    );
  }

  /*
   * MOBİLDE TABLO DEĞİL KART. Yatay kaydırmalı tabloda kullanıcı
   * başlığı kaybediyor ve hangi sayının hangi sütuna ait olduğunu
   * göremiyor. Aynı veri satır başına etiket-değer listesi oluyor.
   */
  if (narrow) {
    return (
      <ul className={cn('grid gap-2', className)}>
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className="rounded-card border border-border bg-surface-1 p-3"
          >
            <p className="text-caption text-foreground">
              {rowHref ? (
                <Link
                  to={rowHref(row)}
                  className="font-medium transition-colors hover:text-primary"
                >
                  {columns[0].cell(row)}
                </Link>
              ) : (
                columns[0].cell(row)
              )}
            </p>
            <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
              {columns.slice(1).map((col) => (
                <div key={col.key} className="contents">
                  <dt className="label text-muted-foreground">{col.header}</dt>
                  <dd
                    className={cn(
                      'text-meta text-foreground',
                      col.numeric && 'tabular'
                    )}
                  >
                    {col.cell(row)}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={className}>
      {preferenceKey && (
        <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
              className="min-h-8 rounded-card border border-border px-2.5 text-meta text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              Sütunlar
            </button>
            {pickerOpen && (
              <div className="absolute right-0 top-full z-[var(--z-popover)] mt-1 w-52 rounded-card border border-border-strong bg-surface-1 p-2 shadow-overlay">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className={cn(
                      'flex min-h-8 items-center gap-2 px-1 text-meta',
                      col.alwaysVisible
                        ? 'text-faint'
                        : 'cursor-pointer text-foreground'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={col.alwaysVisible || !hidden.includes(col.key)}
                      /* Kimlik sütunu kapatılamaz: kapanırsa satırın
                         hangi kayıt olduğu okunamaz hâle gelir. */
                      disabled={col.alwaysVisible}
                      onChange={(e) =>
                        setHidden(
                          e.target.checked
                            ? hidden.filter((k) => k !== col.key)
                            : [...hidden, col.key]
                        )
                      }
                    />
                    {col.header}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div
            role="group"
            aria-label="Satır yoğunluğu"
            className="inline-flex overflow-hidden rounded-card border border-border"
          >
            {(['rahat', 'sik'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDensity(value)}
                aria-pressed={density === value}
                className={cn(
                  'min-h-8 border-l border-border px-2.5 text-meta transition-colors first:border-l-0',
                  density === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {DENSITY[value].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Yatay taşma yönetimi: tablo kendi kabında kayıyor, sayfa değil. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          {caption && (
            <caption className="label pb-2.5 text-left">{caption}</caption>
          )}
          <thead>
            <tr>
              {visible.map((col, i) => (
                <HeaderCell
                  key={col.key}
                  column={col}
                  sort={sort}
                  sticky={i === 0}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-border transition-colors hover:bg-surface-1"
              >
                {visible.map((col, i) => (
                  <td
                    key={col.key}
                    className={cn(
                      'pr-4 align-middle text-meta last:pr-0',
                      DENSITY[density].cell,
                      col.numeric && 'tabular text-right',
                      col.hideOnMobile && 'hidden md:table-cell',
                      /* Sabit ilk sütun. Arka plan zorunlu: saydam
                         bırakılırsa altından geçen sütunlar görünür. */
                      i === 0 && 'sticky left-0 bg-background'
                    )}
                  >
                    {i === 0 && rowHref ? (
                      <Link
                        to={rowHref(row)}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {col.cell(row)}
                      </Link>
                    ) : (
                      col.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Başlık hücresi — sıralanabilirse düğme, değilse düz metin.
 *
 * Sıralanamayan sütunu da düğme yapmak, tıklanınca hiçbir şey olmayan
 * bir kontrol sunmak olurdu.
 */
function HeaderCell<T>({
  column,
  sort,
  sticky,
}: {
  column: Column<T>;
  sort?: { value: string; onChange: (value: string) => void };
  sticky: boolean;
}) {
  const asc = column.sort?.asc;
  const desc = column.sort?.desc;
  const sortable = sort && (asc || desc);
  const active = sortable && (sort.value === asc || sort.value === desc);
  const direction = !active ? null : sort.value === asc ? 'asc' : 'desc';

  const className = cn(
    'label border-b border-border-strong pb-2 pr-4 text-left font-normal last:pr-0',
    column.numeric && 'text-right',
    column.hideOnMobile && 'hidden md:table-cell',
    /* Sabit başlık: uzun listede kaydırırken sütunu kaybetmemek için. */
    'sticky top-0 z-10 bg-background',
    sticky && 'left-0 z-20'
  );

  if (!sortable) {
    return (
      <th
        scope="col"
        style={column.width ? { width: column.width } : undefined}
        className={className}
      >
        {column.header}
      </th>
    );
  }

  /*
   * TIKLAMA SIRASI: aktif değilse artan (varsa), aktifse diğer yöne.
   * Tek yönü olan sütunlarda (ör. "en yeni") tıklama o yöne sabitliyor
   * ve ok tek yönlü çiziliyor — olmayan bir yönü varmış gibi
   * göstermemek için.
   */
  const next =
    direction === 'asc'
      ? (desc ?? asc)
      : direction === 'desc'
        ? (asc ?? desc)
        : (asc ?? desc);

  return (
    <th
      scope="col"
      style={column.width ? { width: column.width } : undefined}
      aria-sort={
        direction === 'asc'
          ? 'ascending'
          : direction === 'desc'
            ? 'descending'
            : 'none'
      }
      className={className}
    >
      <button
        type="button"
        onClick={() => next && sort.onChange(next)}
        className={cn(
          'label inline-flex min-h-8 items-center gap-1 transition-colors hover:text-primary',
          active ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {column.header}
        <span aria-hidden className="text-meta">
          {direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : '↕'}
        </span>
      </button>
    </th>
  );
}

/**
 * Gizlenen sütunlar — modül bazında `localStorage`.
 *
 * Belge tercihin HESAPTA saklanmasını istiyor; kullanıcı tercihleri
 * tablosu yok (Faz 10). Cihazda saklamak hiç saklamamaktan iyi ve o
 * tablo geldiğinde taşınacak tek yer burası.
 */
function useHiddenColumns(
  preferenceKey: string | undefined
): [string[], (next: string[]) => void] {
  const storageKey = `astrohub:tablo-gizli:${preferenceKey ?? 'genel'}`;
  const [hidden, setHiddenState] = useState<string[]>(() => {
    if (!preferenceKey) return [];
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      /* Depoda kalmış bozuk ya da başka modüle ait bir değer sessizce
         geçerli sayılırsa tablo sütunsuz bir kabuğa döner. */
      return Array.isArray(parsed)
        ? parsed.filter((v): v is string => typeof v === 'string')
        : [];
    } catch {
      return [];
    }
  });

  return [
    hidden,
    (next: string[]) => {
      setHiddenState(next);
      if (!preferenceKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Seçim yalnızca bu oturumda geçerli olur.
      }
    },
  ];
}

import type { ReactNode } from 'react';
import { Select } from './Input';
import { ViewToggle } from './ViewToggle';
import type { ViewMode } from './useViewMode';
import { cn } from '@/lib/cn';

/**
 * ARAÇ ŞERİDİ — sonuç sayacı, sıralama ve görünüm anahtarı.
 *
 * NEDEN AYRI BİR BİLEŞEN
 * Bu şerit her modülde elle yazılmıştı ve her yerde biraz farklıydı:
 * galeride sayaç `label` sınıfındaydı, etkinliklerde değildi; sıralama
 * etiketinin `hidden sm:block` kırılımı bazı sayfalarda vardı bazılarında
 * yoktu; anahtarın yüksekliği (32px) sıralama kutusuyla (32px) hizalıyken
 * araya giren etiket satırı hizayı bozuyordu. Sonuç, sayfadan sayfaya
 * "aynı ama biraz kaymış" bir şeritti.
 *
 * Burada üç şey sabitlenir:
 *   1. Tek satır yüksekliği — bütün kontroller 32px, dikey ortalı.
 *   2. Kontroller tek bir hairline kutuda gruplanır; ayrı ayrı yüzen
 *      kutucuklar yerine bitişik bir enstrüman paneli gibi durur.
 *   3. Dar ekranda sayaç ve kontroller alt alta geçer, sıkışmaz.
 */
export function ToolBar<M extends string = ViewMode>({
  left,
  sort,
  view,
  extra,
  className,
}: {
  /** Genelde sonuç sayacı. */
  left?: ReactNode;
  /** Sıralama seçicisi — verilirse kontrol grubunda görünür. */
  sort?: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    id?: string;
  };
  /**
   * Görünüm anahtarı. `modes` verilmezse ızgara/liste; tabloyu
   * destekleyen modül kendi kümesini geçiyor. Şerit görünüm kümesinde
   * GENEL olduğu için tabloyu desteklemeyen sayfalar hiçbir şey
   * değiştirmiyor.
   */
  view?: {
    mode: M;
    onChange: (mode: M) => void;
    modes?: readonly M[];
  };
  /** Gruba eklenecek ekstra kontrol. */
  extra?: ReactNode;
  className?: string;
}) {
  const hasControls = Boolean(sort || view || extra);

  return (
    <div
      className={cn(
        'mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2',
        className
      )}
    >
      <div className="min-w-0">{left}</div>

      {hasControls && (
        <div className="flex shrink-0 items-center gap-2">
          {extra}

          {sort && (
            <div className="inline-flex h-8 items-center overflow-hidden rounded-card border border-border">
              <label
                htmlFor={sort.id ?? 'toolbar-sort'}
                className="label hidden h-full items-center border-r border-border bg-surface-2 px-2.5 sm:inline-flex"
              >
                Sırala
              </label>
              <Select
                id={sort.id ?? 'toolbar-sort'}
                value={sort.value}
                onChange={(e) => sort.onChange(e.target.value)}
                /*
                 * Kutunun kendi kenarlığı yok — çerçeveyi saran grup çiziyor.
                 * `h-full` hizayı anahtara kilitler; sabit yükseklik vermek
                 * tarayıcılar arasında 1px kaymalara yol açıyordu.
                 */
                className="h-full w-auto rounded-none border-0 bg-transparent pl-2.5 pr-7 text-meta focus:bg-surface-2"
              >
                {sort.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {view && (
            <ViewToggle
              mode={view.mode}
              onChange={view.onChange}
              modes={view.modes}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Sonuç sayacı. Filtre uygulanmışsa `12 / 48`, uygulanmamışsa yalnızca
 * toplam gösterilir — "48 / 48" hiçbir bilgi taşımıyor, sadece gürültü.
 */
export function ResultCount({
  current,
  total,
  noun,
}: {
  current: number;
  total: number;
  noun: string;
}) {
  const filtered = current !== total;

  return (
    <p className="tabular label" role="status" aria-live="polite">
      {filtered ? `${current} / ${total}` : total} {noun}
    </p>
  );
}

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

/**
 * VERİ TABLOSU — terminalin ana okuma birimi.
 *
 * Hairline satır ayrımı, büyük harf başlıklar, tabular sayılar. Satırlar
 * bağlantı olabilir; olduklarında tüm satır tıklanabilir hâle gelir ama
 * yalnızca ilk hücre bir `<a>` taşır — böylece klavye sırası tek adımda
 * kalır ve ekran okuyucu satır başına tek bağlantı duyurur.
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
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  rowHref,
  empty = 'Kayıt yok.',
  className,
}: {
  caption?: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Verilirse satırın ilk hücresi bağlantıya dönüşür. */
  rowHref?: (row: T) => string;
  empty?: string;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="border border-border bg-surface-1 px-4 py-10 text-center text-meta text-muted-foreground">
        {empty}
      </p>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[560px] border-collapse">
        {caption && (
          <caption className="label pb-2.5 text-left">{caption}</caption>
        )}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  'label border-b border-border-strong pb-2 pr-4 text-left font-normal last:pr-0',
                  col.numeric && 'text-right',
                  col.hideOnMobile && 'hidden md:table-cell'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-border transition-colors hover:bg-surface-1"
            >
              {columns.map((col, i) => (
                <td
                  key={col.key}
                  className={cn(
                    'py-2.5 pr-4 align-middle text-meta last:pr-0',
                    col.numeric && 'tabular text-right',
                    col.hideOnMobile && 'hidden md:table-cell'
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
  );
}

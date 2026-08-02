import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { formatAltitude, formatClock } from '@/domain/astronomy/ephemeris';
import { properName, targetKindLabels } from '@/domain/targets/derive';
import { targets as catalog } from '@/features/targets/data';
import {
  matchesGroup,
  TARGET_GROUP_CHIPS,
  type TargetGroupFilter,
} from '@/features/targets/grouping';
import { cn } from '@/lib/cn';
import type { TonightTarget } from './useTonight';

/**
 * HEDEF KOLONU — "neye bakayım?"
 *
 * Bu gece karanlık pencerede en yükseğe çıkan katalog nesneleri, zirve
 * saati ve yüksekliğiyle. Yükseklik sıralaması keyfi değil: 30°'nin
 * altındaki bir hedef beş kat daha fazla atmosferden geçiyor ve hiçbir
 * işleme bunu geri getirmiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖNCE SÜZ, SONRA KES.
 *
 * Liste altı satır gösteriyor ama süzme ALTI SATIRA DEĞİL, tam sıralamaya
 * uygulanıyor. Tersi yapılsaydı "Galaksi" çipi çoğu gece boş çıkardı:
 * ilk altı sırayı küresel kümeler kapmışken katalogda o gece yüksekte
 * onlarca galaksi olurdu. Kullanıcı bunu "arıza" diye okur.
 *
 * Çipler tek seçimli ve `radiogroup` semantiğinde. `aria-pressed` taşıyan
 * dört ayrı düğme, ekran okuyucuda dördü de basılabilir dört bağımsız
 * anahtar gibi okunuyordu; oysa biri açıkken diğerleri kapanıyor.
 */

/** Kolonun gösterdiği satır sayısı. */
const ROWS = 9;
type SortKey = 'peak' | 'altitude';
type SortDir = 'asc' | 'desc';

interface Props {
  ranked: TonightTarget[];
  timeZone: string;
  /**
   * Bir satır işaretlendiğinde çağrılır — çizelge o anı gösterir.
   * `null` işaretin kalktığı anlamına gelir.
   */
  onMark: (peakAt: Date | null) => void;
}

export function TargetsColumn({ ranked, timeZone, onMark }: Props) {
  const [filter, setFilter] = useState<TargetGroupFilter>('hepsi');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'altitude',
    dir: 'desc',
  });

  const visible = useMemo(
    () =>
      [...ranked.filter((entry) => matchesGroup(entry.target.kind, filter))]
        .sort((a, b) => {
          const delta =
            sort.key === 'peak'
              ? a.peak.peakAt.getTime() - b.peak.peakAt.getTime()
              : a.peak.peakAltitude - b.peak.peakAltitude;
          return sort.dir === 'asc' ? delta : -delta;
        })
        .slice(0, ROWS),
    [ranked, filter, sort]
  );

  /*
   * Çip değişince işaret kalkıyor. Kalmasaydı, artık listede olmayan bir
   * nesnenin zirvesi çizelgede asılı kalırdı — hiçbir satırla eşleşmeyen
   * bir imleç.
   */
  const choose = (value: TargetGroupFilter) => {
    setFilter(value);
    onMark(null);
  };

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'peak' ? 'asc' : 'desc' }
    );
    onMark(null);
  };

  return (
    <div className="flex h-full flex-col gap-3.5 p-5">
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_4.75rem_6rem] items-end gap-x-2.5">
        <h3 className="col-span-2 text-body-sm font-semibold text-foreground">
          Bu Gece Yüksek Objeler
        </h3>
        <SortButton
          active={sort.key === 'peak'}
          dir={sort.key === 'peak' ? sort.dir : 'asc'}
          label="Zirve"
          onClick={() => toggleSort('peak')}
        />
        <SortButton
          active={sort.key === 'altitude'}
          dir={sort.key === 'altitude' ? sort.dir : 'desc'}
          label="Yükseklik"
          onClick={() => toggleSort('altitude')}
        />
      </div>

      <div
        role="radiogroup"
        aria-label="Nesne türü süzgeci"
        className="flex flex-wrap gap-1.5"
      >
        {TARGET_GROUP_CHIPS.map((chip) => {
          const active = chip.value === filter;
          return (
            <button
              key={chip.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(chip.value)}
              className={cn(
                /*
                  py-1.5 → ~29px. WCAG 2.5.8 AA dokunma hedefi 24px ve
                  py-1 ile 25.4px çıkıyordu: standardı geçen ama parmakla
                  ıskalanan bir ölçü. Metni olan bir kontrolde asıl
                  belirleyici yükseklik.
                */
                'rounded-full px-3 py-1.5 text-meta font-medium transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'border border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-meta text-muted-foreground">
          {ranked.length === 0
            ? 'Bu gece karanlık pencere oluşmuyor; hedef sıralaması hesaplanamadı.'
            : 'Bu filtreye uygun nesne yok.'}
        </p>
      ) : (
        <ol className="flex flex-col gap-px">
          {visible.map((entry, index) => (
            <TargetRow
              key={entry.target.slug}
              entry={entry}
              index={index}
              timeZone={timeZone}
              onMark={onMark}
            />
          ))}
        </ol>
      )}

      <Link
        to="/hedefler"
        className="mt-auto rounded-card border border-border px-3 py-2.5 text-center text-meta font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
      >
        Tüm katalog · <span className="num">{catalog.length}</span> nesne
      </Link>
    </div>
  );
}

function SortButton({
  active,
  dir,
  label,
  onClick,
}: {
  active: boolean;
  dir: SortDir;
  label: string;
  onClick: () => void;
}) {
  const nextDir = active ? (dir === 'asc' ? 'desc' : 'asc') : dir;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} sütununu ${
        nextDir === 'asc' ? 'artan' : 'azalan'
      } sırala`}
      className={cn(
        'label caps inline-flex min-h-6 items-center justify-end gap-1 text-right transition-colors',
        active ? 'text-primary' : 'text-faint hover:text-muted-foreground'
      )}
    >
      <span>{label}</span>
      <span aria-hidden className="num text-[0.62rem] leading-none">
        {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );
}

/**
 * Tek hedef satırı.
 *
 * SATIRIN TAMAMI BAĞLANTI. İç içe tıklanabilir bölge yok: sıra numarası,
 * ad ve yükseklik aynı hedefe gidiyor ve üçünü ayrı hedeflere bölmek
 * dokunmatik ekranda isabet hatası üretirdi.
 */
function TargetRow({
  entry,
  index,
  timeZone,
  onMark,
}: {
  entry: TonightTarget;
  index: number;
  timeZone: string;
  onMark: (peakAt: Date | null) => void;
}) {
  const { target, peak } = entry;
  const altitude = Math.max(0, Math.min(90, peak.peakAltitude));
  const proper = properName(target.catalog, target.name, target.kind);

  /*
   * İŞARET HEM FARE HEM KLAVYE İLE. Yalnızca `hover` bağlanırsa özellik
   * klavye kullanıcısı için hiç yok; dokunmatik ekranda da yok. `focus`
   * ikisini birden çözüyor — sekme ile gezen kullanıcı satırda dururken
   * çizelge aynı anı gösteriyor.
   */
  const mark = {
    onMouseEnter: () => onMark(peak.peakAt),
    onMouseLeave: () => onMark(null),
    onFocus: () => onMark(peak.peakAt),
    onBlur: () => onMark(null),
  };

  return (
    <li className={index >= 4 ? 'max-lg:hidden' : undefined}>
      <Link
        to={`/hedef/${target.slug}`}
        {...mark}
        className={cn(
          'grid grid-cols-[1.5rem_minmax(0,1fr)_4.75rem_6rem] items-center gap-x-2.5 rounded-card border px-2 py-1.5 transition-colors',
          index === 0
            ? 'border-cold/25 bg-cold/8 hover:bg-cold/12'
            : 'border-transparent hover:bg-surface-2'
        )}
      >
        <span aria-hidden className="num text-meta text-faint">
          {String(index + 1).padStart(2, '0')}
        </span>

        <span className="min-w-0">
          {/*
            Satır aynı şeyi üç kez söylemiyor. Katalog kodu solda, tür
            altta; `target.name` ise adı olmayan kayıtlar için koddan ve
            türden türetiliyor. Üçü birden basılınca satır "M 29 M 29
            Açık Kümesi / Açık Küme" oluyordu (bkz. `properName`).
          */}
          <span className="block truncate text-body-sm leading-tight">
            <span className="font-semibold text-foreground">
              {target.catalog}
            </span>
            {proper && (
              <span className="text-muted-foreground"> {proper}</span>
            )}
          </span>
          <span className="mt-0.5 block text-meta leading-none text-faint">
            {targetKindLabels[target.kind]}
          </span>
          {/*
            YÜKSEKLİK ÇUBUĞU. Sayı zaten sağda duruyor; çubuğun işi
            satırlar arasındaki FARKI göstermek — 88° ile 64° arasındaki
            uçurum iki sayıyı okumadan görülüyor.
          */}
          <span
            aria-hidden
            className="mt-1.5 block h-[2px] overflow-hidden rounded-full bg-surface-3"
          >
            <span
              className="block h-full rounded-full bg-cold/60"
              style={{ width: `${(altitude / 90) * 100}%` }}
            />
          </span>
        </span>

        <span className="num text-right text-meta text-primary">
          {formatClock(peak.peakAt, timeZone)}
        </span>
        <span className="num min-w-[3.5ch] text-right text-body-sm font-semibold text-foreground">
          {formatAltitude(peak.peakAltitude)}
        </span>
      </Link>
    </li>
  );
}

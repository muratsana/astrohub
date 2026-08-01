import { CloseIcon } from './icons';
import type { Chip } from '@/features/explorer/query';

/**
 * AKTİF FİLTRE CHIP'LERİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * MOTOR BUNLARI ÜRETİYORDU, HİÇBİR SAYFA ÇİZMİYORDU.
 *
 * `useExplorer` aylardır `chips`, `hasFilters` ve `clearAll` döndürüyor
 * ve testleri de var; kaynak taramasında tek tüketici o testlerdi.
 * Yani yetenek "tamam" sayılıyordu ama kullanıcı için hiç var olmadı.
 *
 * Görünmeyen filtre gerçek bir sorun: bir sayfaya bağlantıyla gelen
 * kullanıcı (`?sehir=Ankara`) kısa bir liste görüyor ve listenin neden
 * kısa olduğunu göremiyordu. Açılır kutulara tek tek bakmadan
 * anlaşılmıyordu; mobilde filtreler çekmeceye girdiğinde büsbütün
 * görünmez olacaktı.
 *
 * SIRALAMA CHIP DEĞİL. Sıralama her zaman bir değere sahiptir, yani
 * "kaldırılabilir" bir şey değil — chip'e dönüştürmek kullanıcıya
 * kapatabileceği bir şey varmış gibi gösterirdi. `clearAll` da aynı
 * sebeple sıralamayı korumaya devam ediyor.
 */
export function ActiveFilters({
  chips,
  onRemove,
  onClearAll,
}: {
  chips: Chip[];
  onRemove: (chip: Chip) => void;
  onClearAll: () => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="label text-muted-foreground">Filtreler</span>

      {chips.map((chip) => (
        <button
          key={`${chip.param}:${chip.value}`}
          type="button"
          onClick={() => onRemove(chip)}
          /* Erişilebilir ad kaldırma eylemini söylüyor: ekran okuyucuda
             yalnızca "Ankara" duyan kullanıcı bunun bir düğme olduğunu
             ve basınca ne olacağını bilemezdi. */
          aria-label={`${chip.label} filtresini kaldır`}
          className="inline-flex min-h-6 items-center gap-1 rounded-card border border-border-strong bg-surface-2 py-0.5 pl-2 pr-1.5 text-meta text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {chip.label}
          <CloseIcon aria-hidden className="h-3 w-3 shrink-0" />
        </button>
      ))}

      {/* İki filtreden azken "tümünü temizle" tek tek kaldırmaktan kısa
          değil; yalnızca gerçekten kısayol olduğunda çiziliyor. */}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="min-h-6 px-1.5 text-meta text-muted-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
        >
          Tümünü temizle
        </button>
      )}
    </div>
  );
}

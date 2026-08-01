import { useEventChanges } from '@/services/content/eventInterest';

/**
 * ETKİNLİK DEĞİŞİKLİK GEÇMİŞİ (§9).
 *
 * KATILIMCIYA DA GÖSTERİLİYOR, yalnızca yöneticiye değil. "Bu etkinliğin
 * tarihi iki kez değişti" bilgisi, yol planı yapan kişinin karar verirken
 * bakacağı bir şey; yönetim paneline kilitlemek şeffaflığı bir denetim
 * aracına indirgerdi.
 *
 * GEÇMİŞ YOKSA BÖLÜM DE YOK. Boş bir "Değişiklik geçmişi" başlığı,
 * hiç değişmemiş bir etkinlikte kullanıcıya bir şey söylemez ve sayfada
 * yer kaplar.
 */

const fieldLabels: Record<string, string> = {
  starts_at: 'Tarih',
  ends_at: 'Bitiş',
  status: 'Durum',
  venue: 'Mekân',
  city: 'Şehir',
  title: 'Başlık',
  capacity: 'Kontenjan',
};

const statusLabels: Record<string, string> = {
  draft: 'Taslak',
  published: 'Yayımlandı',
  cancelled: 'İptal edildi',
};

/**
 * Geçmiş kaydı bütün değerleri METİN olarak tutuyor (0050): kolonların
 * tipleri farklı ve kaydın işi hesaplamak değil göstermek. Okunabilir
 * hâle getirmek bu yüzden burada.
 */
function formatValue(field: string, value: string | null): string {
  if (value === null || value === '') return '—';

  if (field === 'status') return statusLabels[value] ?? value;

  if (field === 'starts_at' || field === 'ends_at') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  return value;
}

export function EventChanges({ eventId }: { eventId: string | undefined }) {
  const { changes, loading } = useEventChanges(eventId);

  if (loading || changes.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="type-section mb-3 font-semibold text-foreground">
        Değişiklik geçmişi
      </h2>
      <ol className="space-y-3 border-l border-border">
        {changes.map((entry) => (
          <li key={entry.id} className="relative pl-5">
            <span
              aria-hidden
              className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-border-strong"
            />
            <p className="tabular text-meta text-muted-foreground">
              {new Date(entry.changedAt).toLocaleString('tr-TR', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {Object.entries(entry.changes).map(([field, value]) => (
                <li key={field} className="text-body-sm text-foreground">
                  <span className="text-muted-foreground">
                    {fieldLabels[field] ?? field}:
                  </span>{' '}
                  <span className="line-through decoration-faint">
                    {formatValue(field, value.eski)}
                  </span>{' '}
                  → {formatValue(field, value.yeni)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { events } from '@/features/events/data';
import { eventTypeLabels, type AstroEvent } from '@/features/events/types';

/**
 * YAKLAŞAN ETKİNLİKLER — tablo görünümü.
 *
 * Kart yerine tablo: etkinlikler karşılaştırılarak okunur (tarih, şehir,
 * ücret, kamp). Kaynak şeffaflığı (§8.4) etkinlik detayında sürer.
 */
const columns: Column<AstroEvent>[] = [
  {
    key: 'date',
    header: 'Tarih',
    width: '92px',
    numeric: true,
    cell: (e) =>
      new Date(e.startsAt).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
      }),
  },
  {
    key: 'title',
    header: 'Etkinlik',
    cell: (e) => e.title,
  },
  {
    key: 'type',
    header: 'Tür',
    hideOnMobile: true,
    cell: (e) => (
      <span className="text-muted-foreground">{eventTypeLabels[e.type]}</span>
    ),
  },
  {
    key: 'city',
    header: 'Şehir',
    width: '110px',
    cell: (e) => <span className="text-cold">{e.city}</span>,
  },
  {
    key: 'flags',
    header: 'Nitelik',
    width: '150px',
    hideOnMobile: true,
    cell: (e) => (
      <span className="flex flex-wrap gap-1">
        <Badge tone={e.free ? 'success' : 'muted'}>
          {e.free ? 'Ücretsiz' : 'Ücretli'}
        </Badge>
        {e.camping && <Badge tone="cold">Kamp</Badge>}
      </span>
    ),
  },
];

export function UpcomingEvents() {
  // Tarihe göre sıralı ilk beş etkinlik.
  const upcoming = [...events]
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    )
    .slice(0, 5);

  return (
    <Container className="py-12 sm:py-14">
      <SectionHeader
        title="Yaklaşan Etkinlikler"
        meta={`${events.length} kayıt`}
        description="Gözlem şenlikleri, kamplar, halk gözlemleri ve atölyeler — her kayıt kaynağı ve son doğrulama tarihiyle birlikte."
        linkTo="/etkinlikler"
        linkLabel="Takvim"
      />

      <DataTable
        columns={columns}
        rows={upcoming}
        rowKey={(e) => e.slug}
        rowHref={(e) => `/etkinlik/${e.slug}`}
        empty="Yaklaşan etkinlik yok."
      />
    </Container>
  );
}

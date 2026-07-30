import { Container } from '@/components/ui/Container';

/**
 * Kod bölünmüş rotalar yüklenirken gösterilen iskelet (§16.4).
 *
 * Yükseklik sabit tutulur ki chunk indirilirken sayfa zıplamasın (CLS —
 * §16.5). Ekran okuyucular için durum `aria-live` ile duyurulur.
 */
export function RouteFallback() {
  return (
    <Container className="py-10 sm:py-14">
      {/*
        `data-route-loading`: rota chunk'ı hâlâ inerken DOM'dan okunabilen
        deterministik işaret. E2E'nin buna ihtiyacı var — "h1 var mı" diye
        beklemek yetmiyor: gezinme anında ÖNCEKİ sayfanın h1'i hâlâ ekranda
        oluyor, bekleme anında geçiyor ve sonra iskelet boyanınca h1 bir an
        kayboluyordu. Test o boşluğa denk geldiğinde kararsız biçimde
        düşüyordu (CI'da yakalandı).
      */}
      <div
        role="status"
        aria-live="polite"
        data-route-loading=""
        className="min-h-[60vh]"
      >
        <span className="sr-only">Sayfa yükleniyor…</span>

        <div aria-hidden className="animate-pulse space-y-8">
          <div className="space-y-3">
            <div className="h-8 w-64 rounded-lg bg-surface-2" />
            <div className="h-4 w-96 max-w-full rounded bg-surface-2/70" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="rounded-card border border-border bg-surface-1 p-4"
              >
                <div className="aspect-[16/10] w-full rounded-lg bg-surface-2" />
                <div className="mt-3 h-4 w-3/4 rounded bg-surface-2" />
                <div className="mt-2 h-3 w-1/2 rounded bg-surface-2/70" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}

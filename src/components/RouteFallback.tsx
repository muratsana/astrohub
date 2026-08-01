import { Container } from '@/components/ui/Container';
import { CardGrid } from '@/components/ui/CardGrid';
import { ContentCardSkeletonGrid } from '@/components/ui/ContentCard';

/**
 * Kod bölünmüş rotalar yüklenirken gösterilen iskelet (§16.4).
 *
 * Yükseklik sabit tutulur ki chunk indirilirken sayfa zıplamasın (CLS —
 * §16.5). Ekran okuyucular için durum `aria-live` ile duyurulur.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İSKELET, İNECEK SAYFANIN KENDİ KARTLARINI KULLANIYOR
 *
 * Önce burada elle yazılmış bir yer tutucu vardı: `rounded-lg` köşeler,
 * `aspect-[16/10]` görsel kutusu ve üç kolonlu bir ızgara. Sitenin
 * hiçbirinde bu ölçüler yok — radius her yerde 2px, kart oranı 4:3 ve
 * ızgara 2/3/4/5 kolon. Yani kullanıcı chunk inerken BİR tasarım dili,
 * indikten sonra BAŞKA bir tasarım dili görüyordu; iskelet sayfanın
 * habercisi değil, yabancısıydı.
 *
 * Artık `CardGrid` + `ContentCardSkeleton` — yani gelecek sayfanın
 * gerçekten kullandığı ızgara ve gerçekten kullandığı kart. Kart ölçüsü
 * değişirse iskelet kendiliğinden onunla değişir.
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

        {/* Başlık bloğu: `PageHeader`ın gerçek ölçüleriyle aynı yeri tutar. */}
        <div aria-hidden className="mb-6 animate-pulse space-y-2.5">
          <div className="h-7 w-64 max-w-full bg-surface-2" />
          <div className="h-3.5 w-96 max-w-full bg-surface-2/70" />
        </div>

        {/*
          On kart: ızgara xl'de beş kolon, yani on kart iki dolu satır
          eder. Altı kart gösterilip on kart inseydi sayfa boyu iskelet
          kalkarken bir anda uzardı.
        */}
        <CardGrid view="grid">
          <ContentCardSkeletonGrid count={10} />
        </CardGrid>
      </div>
    </Container>
  );
}

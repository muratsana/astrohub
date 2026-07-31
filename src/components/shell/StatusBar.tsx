import { Container } from '@/components/ui/Container';
import { InlineReadout } from '@/components/ui/Readout';
import { LocationPicker } from '@/features/location/LocationPicker';
import { useSkyConditions } from '@/features/weather/useSkyConditions';
import { seeingLabel } from '@/features/weather/seeing';

/**
 * DURUM ÇUBUĞU — kabuğun en üst şeridi.
 *
 * Konum ve anlık hava koşulu her sayfada görünür kalır; nav ile birlikte
 * yapışkandır.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EFEMERİS OKUMALARI BURADAN KALDIRILDI (ay fazı, astronomik karanlık,
 * süre).
 *
 * Şerit bu üçünü sitenin her sayfasında gösteriyordu. "Bu Gece" paneli
 * yeniden yazıldığında aynı üç değer orada — hem daha büyük, hem
 * çizelgeyle birlikte, hem de ileri tarihli gecelerle — verilmeye
 * başlandı. İki yerde duran bir sayının iki sorunu var: aynı hesabın
 * ikinci kopyası her sayfada boşuna koşuyor, ve bir gün biri
 * güncellenip diğeri eskiyor.
 *
 * Hava okumaları kaldı: onlar ANLIK durum ve gecenin hangi saatinde
 * olursan ol geçerli — galeriye bakarken bile "şu an bulut %80" bilgisi
 * kararı değiştirir. Karanlık penceresi ise bir PLANLAMA sayısı ve
 * planlama ana sayfada yapılıyor.
 *
 * YERLEŞİM NOTU: konum seçici, kaydırılabilir okuma şeridinin **dışında**
 * durur. Daha önce içindeydi ve açılır menü `overflow-x-auto` tarafından
 * kırpılıyordu — menü şeridin 32px yüksekliğine sıkışıp görünmez oluyordu.
 * z-index sorunu değildi; taşma kırpmasıydı.
 */
export function StatusBar() {
  const conditions = useSkyConditions();

  const readouts = (
    <>
      <InlineReadout
        label="Bulut"
        value={
          conditions.data
            ? `%${Math.round(conditions.data.cloudCover)}`
            : conditions.status === 'loading'
              ? '…'
              : '—'
        }
        tone="cold"
      />

      <InlineReadout
        label="Seeing"
        value={
          conditions.data?.seeing
            ? seeingLabel(conditions.data.seeing.index)
            : conditions.status === 'loading'
              ? '…'
              : '—'
        }
        tone="primary"
      />
    </>
  );

  return (
    <div className="bg-background">
      <Container>
        <div className="relative flex h-8 items-center gap-3 border-b border-border">
          {/* Kaydırma bağlamının dışında — açılır menü kırpılmaz */}
          <LocationPicker />

          <span aria-hidden className="h-3 w-px shrink-0 bg-border lg:hidden" />

          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 items-center gap-x-6 whitespace-nowrap lg:flex"
          >
            {readouts}
          </div>

          <div className="flex flex-1 items-center gap-x-5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
            {readouts}
          </div>
        </div>
      </Container>
    </div>
  );
}

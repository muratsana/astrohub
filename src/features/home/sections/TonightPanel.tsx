import { useCallback, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { useLocationContext } from '@/features/location/LocationContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { DecisionColumn } from './tonight/DecisionColumn';
import { TargetsColumn } from './tonight/TargetsColumn';
import { TimelineColumn } from './tonight/TimelineColumn';
import { useTonight } from './tonight/useTonight';

/**
 * BU GECE — ana sayfanın enstrüman paneli (§7.9).
 *
 * MODÜL ÜÇ SORUYU SIRAYLA CEVAPLIYOR ve kolonların sırası tam olarak bu:
 *
 *   1. Bu gece gözlem yapmaya değer mi?   → karar kolonu
 *   2. Ne zaman?                           → zaman çizelgesi
 *   3. Neye bakayım?                       → hedef listesi
 *
 * "KARAR ÖNCE" MİMARİSİ. Panelin önceki sürümü altı ölçüm hücresiydi:
 * bulut, seeing, çiylenme, ay, karanlık, süre. Her sayı doğruydu ve
 * hiçbiri soruyu cevaplamıyordu — "bulut %38, seeing 2.5, ay %62"
 * üçlüsünden "çıkayım mı" sonucunu çıkarmak uzmanlık istiyor. Sitenin
 * işi tam olarak o uzmanlığı üstlenmek: önce hüküm, sonra gerekçe.
 *
 * BU DOSYA ARTIK YALNIZCA DÜZEN. Hesap `useTonight` içinde, çizim
 * kolonlarda. Önceki 755 satırlık sürümde üçü iç içeydi ve bir renk
 * değişikliği için efemeris hesabının içinden geçmek gerekiyordu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KOLON AYIRICILARI `gap-px` İLE.
 *
 * Kenarlık sınıfları kırılım noktalarına göre açılıp kapanmak zorunda
 * kalırdı (üç kolonda dikey, iki kolonda hem dikey hem yatay, tek
 * kolonda yalnız yatay) ve her kırılım kendi hata payını getirirdi.
 * Izgara boşluğu zeminin rengini gösteriyor: hangi düzende olursa olsun
 * kolonların arasında bir saç teli çizgi çıkıyor, fazlası çıkmıyor.
 */
export function TonightPanel() {
  const {
    permission,
    shouldOfferGeolocation,
    requestDeviceLocation,
    dismissGeolocationOffer,
  } = useLocationContext();
  const { theme } = useTheme();
  const tonight = useTonight();

  /*
   * ÜÇÜNCÜ KOLONDAN İKİNCİYE TEK BAĞ. Bir hedef satırı işaretlendiğinde
   * çizelge o nesnenin zirve anını gösteriyor. Durum burada duruyor
   * çünkü iki kardeş kolonun ortak atası bu; kolonlardan birinin içinde
   * tutulsaydı diğerine ulaşmak için bir bağlam ya da olay yayını
   * gerekirdi — iki bileşen için fazla makine.
   *
   * Oran burada hesaplanıyor: hedef kolonu bir ZAMAN veriyor, ekseni
   * bilmiyor. Ekseni bilen tek yer çizelge ve onu besleyen bu kabuk.
   */
  const [markAt, setMarkAt] = useState<number | null>(null);
  const { timeline } = tonight;

  const handleMark = useCallback(
    (peakAt: Date | null) => {
      if (!peakAt || !timeline.from || !timeline.to) {
        setMarkAt(null);
        return;
      }
      const from = timeline.from.getTime();
      const to = timeline.to.getTime();
      const value = peakAt.getTime();
      setMarkAt(value < from || value > to ? null : (value - from) / (to - from));
    },
    [timeline.from, timeline.to]
  );

  return (
    <section className="relative isolate">
      {/*
        GECE ZEMİNİ. Gradyan token'lardan besleniyor, yani üç temada da
        doğru yönde çalışıyor. Yıldızlar yalnızca koyu ve saha modunda:
        açık temada aynı noktalar gökyüzü değil, ekranda toz gibi
        okunuyordu.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(125% 145% at 50% -30%, var(--color-surface-2) 0%, var(--color-surface-1) 38%, var(--color-background) 72%)',
          }}
        />
        {theme !== 'light' && <BackdropStars />}
      </div>

      <Container className="border-b border-border py-5 sm:py-6">
        {shouldOfferGeolocation && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-card border border-cold/40 bg-surface-1 px-3 py-2.5">
            <p className="w-full text-body-sm leading-relaxed text-muted-foreground sm:w-auto sm:flex-1">
              Hesaplar{' '}
              <span className="text-foreground">{tonight.locationLabel}</span>{' '}
              için yapılıyor.{' '}
              <span className="text-cold">Koordinat sunucumuza gönderilmez</span>
              ; yalnızca tarayıcında kalır.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={requestDeviceLocation}>
                Konum izni ver
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissGeolocationOffer}>
                Şehir seçeyim
              </Button>
            </div>
          </div>
        )}

        {permission === 'denied' && (
          <p className="mb-3 rounded-card border border-border bg-surface-1 px-3 py-2 text-meta text-muted-foreground">
            Konum izni alınamadı — hesaplar seçili şehir üzerinden yapılıyor.
            Üstteki konum seçiciden değiştirebilirsin.
          </p>
        )}

        {/*
          h2, h1 DEĞİL. Ana sayfada iki h1 vardı (hero başlığı + bu panel);
          ekran okuyucu için sayfanın iki ana başlığı olmuş oluyor ve belge
          hiyerarşisi kırılıyordu (QA GUI-03/SEO-04). Başlık kararın
          üstünde, karar kolonunun içinde duruyor.

          308/412px sabit sütunlar yalnızca ≥1280'de: altında iki kolon,
          900'ün altında tek kolon (tasarım paketi, "Responsive").
        */}
        <div className="grid gap-px overflow-hidden rounded-card border border-border-strong bg-border lg:grid-cols-2 xl:grid-cols-[308px_minmax(0,1fr)_412px]">
          <DecisionColumn
            score={tonight.score}
            conditions={tonight.conditions}
            locationLabel={tonight.locationLabel}
            dateLabel={tonight.dateLabel}
            timeZone={tonight.timeZone}
          />

          <div className="bg-surface-1">
            <TimelineColumn
              timeline={tonight.timeline}
              moon={tonight.moon}
              moonTimes={tonight.moonTimes}
              conditions={tonight.conditions}
              nowAt={tonight.nowAt}
              markAt={markAt}
              timeZone={tonight.timeZone}
            />
          </div>

          <div className="bg-background lg:col-span-2 xl:col-span-1">
            <TargetsColumn
              ranked={tonight.ranked}
              timeZone={tonight.timeZone}
              onMark={handleMark}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

/**
 * Zemin yıldızları.
 *
 * Konumlar sabit bir listeden geliyor, rastgele değil: her ziyarette
 * aynı gökyüzü. Rastgele üretim sayfanın her boyamasında yıldızları
 * oynatır ve bu, göz ucuyla bakıldığında bir arıza gibi görünür.
 */
const BACKDROP_STARS = [
  [4, 18, 1.4], [11, 62, 1], [17, 31, 1.8], [23, 78, 1.1], [29, 12, 1.3],
  [34, 51, 1], [39, 84, 1.6], [45, 26, 1.1], [52, 66, 1.4], [57, 8, 1],
  [61, 44, 1.7], [66, 88, 1.2], [72, 21, 1.3], [77, 58, 1], [82, 35, 1.5],
  [88, 72, 1.1], [93, 15, 1.4], [97, 49, 1], [8, 41, 1.1], [26, 55, 1.2],
  [48, 92, 1], [69, 68, 1.1], [85, 5, 1.2], [14, 88, 1.3],
] as const;

function BackdropStars() {
  return (
    <div className="absolute inset-0 opacity-60">
      {BACKDROP_STARS.map(([x, y, r]) => (
        <span
          key={`${x}-${y}`}
          className="absolute rounded-full bg-faint"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${r * 2}px`,
            height: `${r * 2}px`,
          }}
        />
      ))}
    </div>
  );
}

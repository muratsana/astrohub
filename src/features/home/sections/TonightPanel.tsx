import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { useLocationContext } from '@/features/location/LocationContext';
import { LocationPicker } from '@/features/location/LocationPicker';
import { useTheme } from '@/features/theme/ThemeContext';
import { DecisionColumn } from './tonight/DecisionColumn';
import { TargetsColumn } from './tonight/TargetsColumn';
import { TimelineColumn } from './tonight/TimelineColumn';
import { useTonight } from './tonight/useTonight';
import { cn } from '@/lib/cn';
import {
  NIGHT_PICKER_DAYS,
  clampOffset,
  offsetFromParam,
  offsetToDate,
  toISODate,
} from './tonight/nightOffset';

/** Paylaşılabilir gece parametresi — `?gece=2026-08-05`. */
const GECE_PARAM = 'gece';

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
  const { permission } = useLocationContext();
  const { theme } = useTheme();

  /*
   * İLERİ TARİHLİ GECE. Gün sayısı durumda, tarih değil: efemeris zaten
   * konumun takvimine göre hesaplıyor ve bir `Date` tutmak zaman dilimi
   * sınırında iki farklı güne düşme riski getiriyordu.
   */
  /*
   * GECE SEÇİMİ URL'DE (§6.4 "URL veya state ile paylaşılabilir
   * tarih/konum").
   *
   * Parametre TARİH taşıyor, offset değil: `?gun=3` yazsaydık paylaşılan
   * bağlantı ertesi gün açıldığında başka bir geceyi gösterirdi.
   * Çeviri ve sınır kontrolü `nightOffset.ts` içinde, testli.
   *
   * `replace: true`: gece değiştirmek bir gezinme değil bir filtre;
   * her tıklama geçmişe bir kayıt eklerse geri düğmesi kullanıcıyı
   * sayfadan çıkarmak yerine gece gece geri sarar.
   */
  const [params, setParams] = useSearchParams();
  const bugun = useMemo(() => new Date(), []);
  const offsetDays = offsetFromParam(params.get(GECE_PARAM), bugun);

  const setOffsetDays = useCallback(
    (next: number | ((d: number) => number)) => {
      const hedef = clampOffset(
        typeof next === 'function' ? next(offsetDays) : next
      );
      const sonraki = new URLSearchParams(params);
      if (hedef === 0) sonraki.delete(GECE_PARAM);
      else sonraki.set(GECE_PARAM, toISODate(offsetToDate(hedef, bugun)));
      setParams(sonraki, { replace: true });
    },
    [offsetDays, params, setParams, bugun]
  );
  const tonight = useTonight(offsetDays);
  const nightSteps = useMemo(
    () =>
      Array.from({ length: NIGHT_PICKER_DAYS }, (_, offset) => {
        const date = offsetToDate(offset, bugun);
        return {
          offset,
          iso: toISODate(date),
          label:
            offset === 0
              ? 'Bu gece'
              : date.toLocaleDateString('tr-TR', {
                  weekday: 'short',
                }),
          detail: date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
          }),
          long: date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            weekday: 'long',
          }),
        };
      }),
    [bugun]
  );
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

      <Container className="border-b border-border py-3 sm:py-4">
        {/*
          GECE SEÇİCİ VE KONUM AYNI SATIRDA. İkisi de "hangi hesap"
          sorusunun parçası: nerede ve ne zaman. Konum seçici üst şeritten
          buraya taşındı — orada her sayfada duruyordu ama asıl işine
          yaradığı yer burası, çünkü değiştirince değişen şey bu panel.

          Efemerisin sınırı yok ama havanınki var; ileri gitme düğmesi
          tahmin ufkunda duruyor. Ufkun ötesini gösterebilirdik (karanlık
          ve ay hesaplanabiliyor) ama o zaman panelin yarısı boş kalırdı
          ve kullanıcı sebebini aramak zorunda kalırdı.
        */}
        <div className="overflow-hidden rounded-card border border-border-strong bg-border">
          <div className="bg-background p-3 sm:p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] xl:items-center">
              <div
                className="min-w-0"
                title={
                  permission === 'denied'
                    ? 'Konum izni kapalı; seçili şehir kullanılıyor.'
                    : undefined
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <LocationPicker variant="panel" />
                </div>
              </div>

              <div className="min-w-0">
                <div
                  role="tablist"
                  aria-label="Gece tarihi seç"
                  className="overflow-x-auto pb-1"
                >
                  <div className="min-w-[560px]">
                    <div className="grid grid-cols-7 gap-1.5">
                      {nightSteps.map((step) => {
                        const selected = step.offset === offsetDays;
                        return (
                          <button
                            key={step.iso}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            aria-label={`${step.long} gecesine git`}
                            onClick={() => setOffsetDays(step.offset)}
                            className={cn(
                              'flex min-h-10 items-center justify-center gap-1.5 rounded-card border px-2 text-center text-meta font-medium transition-colors hover:border-border-strong hover:bg-surface-2',
                              selected
                                ? 'border-primary bg-primary/12 text-foreground'
                                : step.offset < offsetDays
                                  ? 'border-primary/40 text-muted-foreground'
                                  : 'border-border text-muted-foreground'
                            )}
                          >
                            <span>{step.label}</span>
                            <span className="tabular text-faint">
                              {step.detail}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/*
            h2, h1 DEĞİL. Ana sayfada iki h1 vardı (hero başlığı + bu panel);
            ekran okuyucu için sayfanın iki ana başlığı olmuş oluyor ve belge
            hiyerarşisi kırılıyordu (QA GUI-03/SEO-04). Başlık kararın
            üstünde, karar kolonunun içinde duruyor.

            308/412px sabit sütunlar yalnızca ≥1280'de: altında iki kolon,
            900'ün altında tek kolon (tasarım paketi, "Responsive").
          */}
          <div className="grid gap-px bg-border lg:grid-cols-2 xl:grid-cols-[308px_minmax(0,1fr)_412px]">
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

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DecisionColumn } from './DecisionColumn';
import { nightScore, type NightScore } from '@/domain/astronomy/nightScore';
import type { SkyState } from '@/features/weather/useSkyConditions';
import type { SkyConditions } from '@/features/weather/openMeteo';

vi.mock('./bestPlaces', async () => {
  const actual = await vi.importActual<typeof import('./bestPlaces')>(
    './bestPlaces'
  );
  return {
    ...actual,
    bestPlacesForNightWithWeather: vi.fn(
      async (date: Date, _weatherAt: Date, limit = 10) =>
        actual.bestPlacesForNight(date, limit)
    ),
  };
});

/**
 * KARAR KOLONUNUN DOLU HÂLİ.
 *
 * Panelin bütün testleri jsdom'da çalışıyor ve orada `fetch` gerçek bir
 * istek yapamıyor — yani hava verisi HİÇ gelmiyor ve kolon her testte
 * "hesaplanamıyor" dalına düşüyordu. Üretimde kullanıcıların %99'unun
 * göreceği dal ise diğeri.
 *
 * Bu dosya o dalı skoru elle vererek açıyor: kanca yok, ağ yok, yalnızca
 * sunum. Kırılım çubuklarının toplamla aynı fonksiyondan geldiğini de
 * burada görüyoruz — ekrandaki dört değer `nightScore`un ürettiği dört
 * değerin aynısı olmak zorunda.
 */

const CONDITIONS: SkyConditions = {
  cloudCover: 8,
  humidity: 42,
  apparentTemperature: null,
  windGust: null,
  precipitationProbability: null,
  temperature: 19,
  dewPoint: 7,
  windSpeed: 6,
  seeing: { index: 1.5, driver: 'jet' },
  observedAt: new Date('2026-07-31T18:40:00+03:00'),
  source: 'open-meteo',
  layers: null,
  transparency: null,
};

const READY: SkyState = {
  status: 'ready',
  data: CONDITIONS,
  retry: () => {},
};

const SCORE = nightScore({
  cloudCover: CONDITIONS.cloudCover,
  seeingIndex: 1.5,
  humidity: CONDITIONS.humidity,
  windSpeed: CONDITIONS.windSpeed,
  temperature: CONDITIONS.temperature,
  dewPoint: CONDITIONS.dewPoint,
  darkMinutes: 366,
  moonlessMinutes: 300,
  moonIllumination: 0.12,
});

function renderColumn(
  score: NightScore | null = SCORE,
  conditions: SkyState = READY
) {
  return render(
    <DecisionColumn
      score={score}
      bestPlacesDate={new Date('2026-08-09T00:00:00+03:00')}
      bortle={3}
      conditions={conditions}
      locationLabel="Ankara"
      dateLabel="31 Temmuz Cuma"
      timeZone="Europe/Istanbul"
    />
  );
}

describe('DecisionColumn · skor dolu', () => {
  it('toplam skoru ve hükmü gösteriyor', () => {
    renderColumn();
    expect(screen.getByText(String(SCORE.total))).toBeInTheDocument();
    expect(screen.getByText(SCORE.verdictLabel)).toBeInTheDocument();
    expect(screen.getByText(/Ankara · 31 Temmuz Cuma/)).toBeInTheDocument();
  });

  /*
   * ASIL KURAL. Ekranda "78" yazarken altındaki dört çubuğun başka bir
   * şey söylemesi, kullanıcının hangisine inanacağını bilememesi demek.
   * Dördü de aynı fonksiyondan geliyor ve test bunu ekrandan okuyor.
   */
  it('kırılımın dört satırı da skorun ürettiği değerleri gösteriyor', () => {
    renderColumn();
    for (const row of SCORE.rows) {
      expect(screen.getByText(row.label)).toBeInTheDocument();
      expect(
        screen.getByText(row.value === null ? '—' : String(row.value))
      ).toBeInTheDocument();
    }
  });

  it('halkanın dolgu oranı skorun kendisi', () => {
    const { container } = renderColumn();
    const ring = container.querySelector('.score-ring');
    expect(ring).not.toBeNull();
    expect((ring as HTMLElement).style.getPropertyValue('--ring-fill')).toBe(
      `${SCORE.total}%`
    );
  });

  it('gerekçeleri ve öneriyi basıyor', () => {
    renderColumn();
    for (const text of [...SCORE.pros, ...SCORE.cons]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText(SCORE.recommendation)).toBeInTheDocument();
  });

  it('seçili konumun Bortle göstergesini basıyor', () => {
    renderColumn();
    expect(screen.getByText('Bortle Skalası')).toBeInTheDocument();
    expect(screen.getByLabelText('Bortle 3')).toBeInTheDocument();
  });

  it('en iyi yerler listesindeki satırlar seçilebilir', async () => {
    let selected = '';
    render(
      <DecisionColumn
        score={SCORE}
        bestPlacesDate={new Date('2026-08-09T00:00:00+03:00')}
        onUseBestPlace={(place) => {
          selected = place.site.name;
        }}
        conditions={READY}
        locationLabel="Ankara"
        dateLabel="31 Temmuz Cuma"
        timeZone="Europe/Istanbul"
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: 'En İyi Yerler' }));
    const choices = await screen.findAllByRole('button', {
      name: /gözlem yerini kullan/i,
    });

    fireEvent.click(choices[1]);
    expect(selected).toBeTruthy();
  });

  it('güncelleme saatini gösteriyor, servis künyesini arayüzde göstermiyor', () => {
    renderColumn();
    expect(screen.getByText('18:40')).toBeInTheDocument();
    expect(
      screen.queryByText(/Open-Meteo|efemeris yerel hesap/)
    ).not.toBeInTheDocument();
  });

  /*
   * Ekran okuyucuda "+ Üst atmosfer sakin" ile "− Jet akımı hareketli"
   * arasındaki fark yalnızca bir işaret. İşaret metin olarak okunmazsa
   * liste "iyi ve kötü sebepler" değil, düz bir sebepler listesi olur.
   */
  it('artı ve eksi işaretleri metin olarak da okunuyor', () => {
    renderColumn();
    if (SCORE.pros.length > 0) {
      expect(screen.getAllByText(/^Artı:/).length).toBe(SCORE.pros.length);
    }
    if (SCORE.cons.length > 0) {
      expect(screen.getAllByText(/^Eksi:/).length).toBe(SCORE.cons.length);
    }
  });
});

describe('DecisionColumn · seeing ölçülemediğinde', () => {
  it('hükmün neden sınırlandığını yazıyor', () => {
    const limited = nightScore({
      cloudCover: 0,
      seeingIndex: null,
      humidity: 40,
      windSpeed: 3,
      temperature: 18,
      dewPoint: 6,
      darkMinutes: 366,
      moonlessMinutes: 366,
      moonIllumination: 0.02,
    });
    renderColumn(limited, {
      ...READY,
      data: { ...CONDITIONS, seeing: null },
    });

    expect(limited.limitedBySeeing).toBe(true);
    expect(
      screen.getByText(/hüküm bir kademe sınırlandı/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Çok iyi gece')).not.toBeInTheDocument();
  });
});

describe('DecisionColumn · hata', () => {
  it('yeniden deneme düğmesi veriyor ve skoru uydurmuyor', () => {
    let denendi = 0;
    renderColumn(null, {
      status: 'error',
      data: null,
      retry: () => {
        denendi += 1;
      },
    });

    expect(screen.getByText(/hava verisi alınamadı/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /yeniden dene/i });
    button.click();
    expect(denendi).toBe(1);

    expect(screen.queryByText(/^Veri:/)).not.toBeInTheDocument();
  });
});

describe('DecisionColumn — tekrar eden ürün metni', () => {
  it('astrofotoğraf skor satırını çizmez', () => {
    renderColumn();
    expect(screen.queryByText(/Astrofotoğraf:/)).not.toBeInTheDocument();
    expect(screen.getByText(/Ankara · 31 Temmuz Cuma/)).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { bestPlacesForNight } from './bestPlaces';
import type { SkyConditions } from '@/features/weather/openMeteo';

describe('bestPlacesForNight', () => {
  it('seçili gece için ilk 10 gözlem noktasını sıralar', () => {
    const places = bestPlacesForNight(new Date('2026-08-09T00:00:00+03:00'));

    expect(places).toHaveLength(10);
    for (let i = 1; i < places.length; i++) {
      expect(places[i].bestScore).toBeLessThanOrEqual(places[i - 1].bestScore);
    }
  });

  it('güneş sistemi puanı rakımı yüksek noktalarda görünür olur', () => {
    const places = bestPlacesForNight(new Date('2026-08-09T00:00:00+03:00'));
    const high = places.find((place) => place.site.altitude >= 2000);

    expect(high).toBeDefined();
    expect(high!.solarSystemScore).toBeGreaterThan(60);
  });

  it('hava tahmini varsa aday puanını gerçek koşullarla hesaplar', () => {
    const date = new Date('2026-08-09T00:00:00+03:00');
    const withoutWeather = bestPlacesForNight(date);
    const storm = new Map<string, SkyConditions | null>([
      ['Palandöken Yaylası', weather({ cloudCover: 100 })],
    ]);

    const withWeather = bestPlacesForNight(date, 10, storm);
    const palandoken = withWeather.find(
      (place) => place.site.name === 'Palandöken Yaylası'
    );

    expect(withoutWeather[0].site.name).toBe('Palandöken Yaylası');
    expect(palandoken?.weatherBased).toBe(true);
    expect(palandoken?.dsoScore).toBe(0);
  });
});

function weather(overrides: Partial<SkyConditions> = {}): SkyConditions {
  return {
    cloudCover: 0,
    humidity: 45,
    temperature: 14,
    apparentTemperature: 13,
    dewPoint: 5,
    windSpeed: 6,
    windGust: 9,
    precipitationProbability: 0,
    seeing: { index: 1.5, driver: 'jet' },
    observedAt: new Date('2026-08-09T01:00:00+03:00'),
    source: 'open-meteo',
    layers: null,
    transparency: null,
    ...overrides,
  };
}

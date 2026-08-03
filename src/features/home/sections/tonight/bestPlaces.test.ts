import { describe, expect, it } from 'vitest';
import { bestPlacesForNight } from './bestPlaces';

describe('bestPlacesForNight', () => {
  it('seçili gece için ilk 10 gözlem noktasını sıralar', () => {
    const places = bestPlacesForNight(new Date('2026-08-09T00:00:00+03:00'));

    expect(places).toHaveLength(10);
    for (let i = 1; i < places.length; i++) {
      expect(places[i].dsoScore).toBeLessThanOrEqual(places[i - 1].dsoScore);
    }
  });

  it('güneş sistemi puanı rakımı yüksek noktalarda görünür olur', () => {
    const places = bestPlacesForNight(new Date('2026-08-09T00:00:00+03:00'));
    const high = places.find((place) => place.site.altitude >= 2000);

    expect(high).toBeDefined();
    expect(high!.solarSystemScore).toBeGreaterThan(60);
  });
});

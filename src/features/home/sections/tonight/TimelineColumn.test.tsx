import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MoonPhase, RiseSet } from '@/domain/astronomy/ephemeris';
import type { NightTimeline } from '@/domain/astronomy/nightTimeline';
import type { SkyState } from '@/features/weather/useSkyConditions';
import { TimelineColumn } from './TimelineColumn';

const timeline: NightTimeline = {
  from: new Date('2026-08-03T20:00:00+03:00'),
  to: new Date('2026-08-04T06:00:00+03:00'),
  segments: [
    {
      kind: 'dark',
      from: new Date('2026-08-03T22:00:00+03:00'),
      to: new Date('2026-08-04T04:00:00+03:00'),
      start: 0.2,
      span: 0.6,
    },
  ],
  dark: {
    from: new Date('2026-08-03T22:00:00+03:00'),
    to: new Date('2026-08-04T04:00:00+03:00'),
    start: 0.2,
    span: 0.6,
  },
  moonUp: [],
  moonlessDark: [],
  moonlessMinutes: 120,
  now: null,
  moonAltitudes: [
    { at: 0.2, altitude: 5 },
    { at: 0.5, altitude: 24 },
    { at: 0.8, altitude: 10 },
  ],
};

const moon: MoonPhase = {
  illumination: 0.36,
  age: 0.3,
  waxing: true,
  name: 'Şişkin Ay',
};

const moonTimes: RiseSet = {
  rise: null,
  set: new Date('2026-08-04T02:00:00+03:00'),
  alwaysUp: false,
  alwaysDown: false,
};

const conditions: SkyState = {
  status: 'ready',
  retry: () => {},
  data: {
    cloudCover: 42,
    layers: { low: 0, mid: 42, high: 0, visibilityKm: null },
    humidity: 70,
    apparentTemperature: 18,
    windGust: 16,
    precipitationProbability: 5,
    temperature: 20,
    dewPoint: 12,
    windSpeed: 8,
    seeing: { index: 2, driver: 'jet' },
    transparency: null,
    observedAt: new Date('2026-08-03T18:00:00+03:00'),
    source: 'open-meteo',
  },
};

describe('TimelineColumn · koşul kartları', () => {
  it('yalnızca ana veri satırlarını gösteriyor', () => {
    render(
      <TimelineColumn
        timeline={timeline}
        moon={moon}
        moonTimes={moonTimes}
        conditions={conditions}
        nowAt={null}
        markAt={null}
        timeZone="Europe/Istanbul"
      />
    );

    expect(screen.getByText('%42')).toBeInTheDocument();
    expect(screen.queryByText(/alçak %0 · orta %42/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tahmin · jet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/çiy 12°C · nem %70/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hissedilen 18°C/i)).not.toBeInTheDocument();
  });
});

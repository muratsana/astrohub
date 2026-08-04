import { describe, expect, it } from 'vitest';
import { normalizeBridgeStatus } from './bridge';

describe('normalizeBridgeStatus', () => {
  it('bridge yanıtını güvenli montür durumuna indirger', () => {
    expect(
      normalizeBridgeStatus({
        ok: true,
        connected: true,
        driverId: 'ASCOM.Simulator.Telescope',
        name: 'ASCOM Telescope Simulator',
        rightAscensionHours: 12.5,
        declinationDeg: -5.25,
        tracking: true,
        capture: {
          app: 'SGP',
          totalFrames: 120,
          completedFrames: 48,
          ignored: 'x',
        },
      })
    ).toMatchObject({
      ok: true,
      connected: true,
      driverId: 'ASCOM.Simulator.Telescope',
      name: 'ASCOM Telescope Simulator',
      rightAscensionHours: 12.5,
      declinationDeg: -5.25,
      tracking: true,
      capture: {
        app: 'SGP',
        totalFrames: 120,
        completedFrames: 48,
      },
    });
  });

  it('bozuk yanıtı kapalı bağlantı olarak raporlar', () => {
    expect(normalizeBridgeStatus(null)).toEqual({
      ok: false,
      connected: false,
      error: 'Geçersiz bridge yanıtı',
    });
  });
});

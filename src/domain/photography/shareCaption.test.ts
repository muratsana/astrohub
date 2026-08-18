import { describe, expect, it } from 'vitest';
import {
  shareCaption,
  shareHashtags,
  type CaptionInput,
} from './shareCaption';

function girdi(over: Partial<CaptionInput> = {}): CaptionInput {
  return {
    target: { name: 'Orion Bulutsusu', catalog: 'M 42' },
    exposures: [
      { filter: 'Ha', frames: 24, exposureSeconds: 300 },
      { filter: 'OIII', frames: 12, exposureSeconds: 300 },
    ],
    palette: 'SHO',
    captureSessions: [
      { id: 'a', startsOn: '2026-01-12', endsOn: '2026-01-18' },
      { id: 'b', startsOn: '2026-02-03', endsOn: null },
    ],
    setup: { optic: 'RC8', camera: 'ASI2600MM', mount: 'EQ6-R' },
    location: { label: 'Saklıkent, Antalya', visibility: 'region' },
    username: 'muratsana',
    ...over,
  };
}

describe('shareCaption (D06, D07, D10, D14)', () => {
  it('hedef, entegrasyon, tarih, ekipman, konum ve handle taşır', () => {
    const metin = shareCaption(girdi());
    expect(metin).toContain('Orion Bulutsusu (M 42)');
    expect(metin).toContain('3 sa'); // 24*300 + 12*300 = 10800 sn = 3 sa
    expect(metin).toContain('SHO');
    expect(metin).toContain('12–18 Oca 2026, 3 Şub 2026'); // D07 çok sezon
    expect(metin).toContain('RC8 · ASI2600MM · EQ6-R');
    expect(metin).toContain('Saklıkent, Antalya');
    expect(metin).toContain('@muratsana');
  });

  it('konum gizliyse künyeye yazılmaz (D14)', () => {
    const metin = shareCaption(
      girdi({ location: { label: 'Saklıkent, Antalya', visibility: 'hidden' } })
    );
    expect(metin).not.toContain('Saklıkent');
    expect(metin).not.toContain('📍');
  });

  it('opsiyonel alanlar kapatılabilir (D10)', () => {
    const metin = shareCaption(girdi(), {
      equipment: false,
      location: false,
      handle: false,
      dates: false,
    });
    expect(metin).not.toContain('RC8');
    expect(metin).not.toContain('Saklıkent');
    expect(metin).not.toContain('@muratsana');
    expect(metin).not.toContain('Oca');
    // Hedef ve entegrasyon çekirdek olarak kalıyor.
    expect(metin).toContain('Orion Bulutsusu');
    expect(metin).toContain('3 sa');
  });

  it('serbest not künyenin başına gelir (D10)', () => {
    const metin = shareCaption(girdi(), { note: 'İlk SHO denemem!' });
    expect(metin.startsWith('İlk SHO denemem!')).toBe(true);
  });

  it('tek captured_at tarihinden de tarih üretir (geriye dönük)', () => {
    const metin = shareCaption(
      girdi({ captureSessions: [], capturedAt: '2026-07-10' })
    );
    expect(metin).toContain('10 Tem 2026');
  });

  it('hashtag şeridi katalog kodunu içerir', () => {
    expect(shareHashtags(girdi())).toContain('#m42');
    expect(shareHashtags(girdi())).toContain('#astrohub');
  });
});

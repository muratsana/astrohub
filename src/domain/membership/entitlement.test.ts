import { describe, it, expect } from 'vitest';
import {
  getMembershipStatus,
  canUploadNewContent,
  contentStaysVisible,
  daysUntilGraceEnds,
  GRACE_PERIOD_DAYS,
} from './entitlement';

const end = new Date('2026-07-01T00:00:00Z');
const dayMs = 24 * 60 * 60 * 1000;

describe('üyelik entitlement (§4.3)', () => {
  it('üyelik yoksa none döner', () => {
    expect(getMembershipStatus({ currentPeriodEnd: null }, end)).toBe('none');
  });

  it('dönem sonundan önce active', () => {
    const now = new Date(end.getTime() - dayMs);
    expect(getMembershipStatus({ currentPeriodEnd: end }, now)).toBe('active');
  });

  it('dönem sonundan sonra grace süresinde grace', () => {
    const now = new Date(end.getTime() + 5 * dayMs);
    expect(getMembershipStatus({ currentPeriodEnd: end }, now)).toBe('grace');
  });

  it('grace süresi bitince expired', () => {
    const now = new Date(end.getTime() + (GRACE_PERIOD_DAYS + 1) * dayMs);
    expect(getMembershipStatus({ currentPeriodEnd: end }, now)).toBe('expired');
  });

  it('yalnızca aktif üyelik yeni yüklemeye izin verir', () => {
    expect(canUploadNewContent('active')).toBe(true);
    expect(canUploadNewContent('grace')).toBe(false);
    expect(canUploadNewContent('expired')).toBe(false);
  });

  it('grace süresinde içerik görünür kalır, expired’da kalmaz', () => {
    expect(contentStaysVisible('active')).toBe(true);
    expect(contentStaysVisible('grace')).toBe(true);
    expect(contentStaysVisible('expired')).toBe(false);
  });

  it('grace bitişine kalan günü hesaplar', () => {
    const now = new Date(end.getTime() + 4 * dayMs);
    expect(daysUntilGraceEnds({ currentPeriodEnd: end }, now)).toBe(
      GRACE_PERIOD_DAYS - 4
    );
  });
});

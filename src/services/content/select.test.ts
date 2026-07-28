import { describe, expect, it } from 'vitest';
import { selectContent } from './select';

const seed = ['tohum-1', 'tohum-2'];

describe('selectContent', () => {
  it('yapılandırma yoksa tohumu kullanır ve bozulma bildirmez', () => {
    const result = selectContent({
      seed,
      rows: null,
      configured: false,
      failed: false,
    });

    expect(result.items).toEqual(seed);
    expect(result.source).toBe('seed');
    expect(result.degraded).toBe(false);
  });

  it('satır geldiyse veritabanı otoritedir', () => {
    const rows = ['db-1'];
    const result = selectContent({
      seed,
      rows,
      configured: true,
      failed: false,
    });

    expect(result.items).toBe(rows);
    expect(result.source).toBe('db');
    expect(result.degraded).toBe(false);
  });

  it('tablo boşsa tohuma düşer — boş katalog göstermez', () => {
    const result = selectContent({
      seed,
      rows: [],
      configured: true,
      failed: false,
    });

    expect(result.items).toEqual(seed);
    expect(result.source).toBe('seed');
    expect(result.degraded).toBe(false);
  });

  it('okuma başarısızsa tohuma düşer ama bunu bildirir', () => {
    const result = selectContent({
      seed,
      rows: null,
      configured: true,
      failed: true,
    });

    expect(result.items).toEqual(seed);
    expect(result.source).toBe('seed');
    expect(result.degraded).toBe(true);
  });

  it('veri geldiyse sonraki bir hata gösterimi bozmaz', () => {
    // Arka planda tazeleme hata verse bile elde geçerli satırlar var.
    const rows = ['db-1'];
    const result = selectContent({
      seed,
      rows,
      configured: true,
      failed: true,
    });

    expect(result.source).toBe('db');
    expect(result.degraded).toBe(false);
  });
});

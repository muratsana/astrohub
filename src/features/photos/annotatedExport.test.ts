import { describe, expect, it } from 'vitest';
import { olcekCubugu } from './annotatedExport';

/**
 * Ölçek çubuğunun uzunluğu ÖLÇÜDEN türüyor, sabit değil: sabit
 * uzunlukta bir çubuk dar alanlı bir fotoğrafta kadrajı aşar, geniş
 * alanlıda görünmez kalırdı.
 */
describe('ölçek çubuğu', () => {
  it('alanın kabaca beşte birine denk yuvarlak bir yay seçiyor', () => {
    /* 1 derecelik alan → hedef 12′ → listedeki ilk uygun değer 15′. */
    expect(olcekCubugu(1)?.arcmin).toBe(15);
  });

  it('dar alanda küçük, geniş alanda büyük değer seçiyor', () => {
    expect(olcekCubugu(0.1)?.arcmin).toBe(2);
    expect(olcekCubugu(10)?.arcmin).toBe(120);
  });

  it('oran, çubuğun kadrajın ne kadarını kapladığını veriyor', () => {
    const c = olcekCubugu(1);
    expect(c?.oran).toBeCloseTo(15 / 60, 5);
  });

  /* Alan bilinmiyorsa çubuk HİÇ çizilmemeli: uydurulmuş bir ölçek,
     olmayan bir ölçekten kötü. */
  it('alan bilinmiyorsa çubuk yok', () => {
    expect(olcekCubugu(null)).toBeNull();
    expect(olcekCubugu(0)).toBeNull();
  });
});

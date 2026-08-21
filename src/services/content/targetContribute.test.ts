import { describe, expect, it } from 'vitest';
import {
  canonicalCatalogCode,
  validateTargetContribution,
} from './targetContribute';

const validInput = {
  name: 'Test Target',
  kind: 'yildiz' as const,
  constellation: 'Kuğu',
};

describe('canonicalCatalogCode', () => {
  it('yaygın derin uzay kataloglarını tek biçime indirger', () => {
    expect(canonicalCatalogCode('sh 2 157')).toBe('Sh2-157');
    expect(canonicalCatalogCode('vdb141')).toBe('vdB 141');
    expect(canonicalCatalogCode('ldn-1235')).toBe('LDN 1235');
    expect(canonicalCatalogCode('lbn 552')).toBe('LBN 552');
  });

  it('GCVS değişen yıldız adlarını takımyıldız ekiyle saklar', () => {
    expect(canonicalCatalogCode('v 398 cyg')).toBe('V398 Cyg');
    expect(canonicalCatalogCode('V398 CYG')).toBe('V398 Cyg');
    expect(canonicalCatalogCode('nsv 12345')).toBe('NSV 12345');
  });
});

describe('validateTargetContribution', () => {
  it.each(['vdB 141', 'LDN 1235', 'LBN 552', 'Sh2-157', 'V398 Cyg', 'NSV 12345'])(
    '%s katalog kodunu kabul eder',
    (catalog) => {
      expect(validateTargetContribution({ ...validInput, catalog })).toBeNull();
    }
  );

  it('takımyıldız eki olmayan V numarasını reddeder', () => {
    expect(
      validateTargetContribution({ ...validInput, catalog: 'V 398' })
    ).toMatch(/Desteklenen katalog/);
  });
});

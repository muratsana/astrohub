import { describe, expect, it } from 'vitest';
import { adminEditPath, entryEditPath } from './adminEditPath';
import { RECORD_KINDS, type RecordKind } from '@/features/admin/records';

const KINDS = Object.keys(RECORD_KINDS) as RecordKind[];

describe('adminEditPath', () => {
  it('her kayıt türü için adres üretir', () => {
    for (const kind of KINDS) {
      expect(adminEditPath(kind, 'x')).toMatch(/^\/admin\//);
    }
  });

  it('slug adrese kodlanarak giriyor', () => {
    expect(adminEditPath('listing', 'zwo asi')).toContain('slug=zwo+asi');
    expect(adminEditPath('event', 'a&b')).toContain('slug=a%26b');
  });

  /*
   * ASIL SÖZ BU. Denetimde bulunan şey, panele giden derin bağlantıların
   * DÜZENLEYEMEYEN bir ekrana düşmesiydi: kayıt listesi durumu
   * değiştirebiliyor ama tek bir alanı bile düzenleyemiyordu.
   *
   * "Düzenle" yazan bir bağlantının düzenlenecek bir alana götürmesi
   * gerekir; bu sınav, düzenlenebilir alanı olmayan bir türe adres
   * üretilmesini engelliyor.
   */
  it('adres üretilen her tür gerçekten düzenlenebilir', () => {
    for (const kind of KINDS) {
      expect(
        RECORD_KINDS[kind].editFields.length,
        `${kind} için düzenlenebilir alan tanımlı değil`
      ).toBeGreaterThan(0);
    }
  });

  /* Bildirim sahibe gidiyor; sahip kolonu olmayan tür sessizce
     bildirimsiz kalırdı. */
  it('her tür sahibini biliyor', () => {
    for (const kind of KINDS) {
      expect(RECORD_KINDS[kind].ownerColumn, kind).toBeTruthy();
    }
  });
});

describe('entryEditPath', () => {
  it('içerik türünü ve slug’ı taşır', () => {
    expect(entryEditPath('yazi', 'drizzle')).toBe(
      '/admin/yazilar?kind=yazi&slug=drizzle'
    );
    expect(entryEditPath('haber', 'x')).toBe(
      '/admin/haberler?kind=haber&slug=x'
    );
  });
});

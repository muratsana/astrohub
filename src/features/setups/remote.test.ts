import { describe, expect, it } from 'vitest';
import { isUuid, mapSetupRow, mergeSetups } from './remote';
import type { SavedSetup } from './store';

function saved(over: Partial<SavedSetup> = {}): SavedSetup {
  return {
    id: 'setup-abc',
    name: 'Geniş alan',
    visibility: 'ozel',
    draft: { slots: {}, spacerMm: 0, extraWeightKg: 0, seeingArcsec: 3 },
    createdAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-07-01T10:00:00Z',
    ...over,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function row(over: Record<string, unknown> = {}): any {
  return {
    id: '3f6a1b2c-4d5e-4f60-8a91-b2c3d4e5f607',
    name: 'Galaksi seti',
    description: null,
    purpose: null,
    visibility: 'herkese-acik',
    is_default: false,
    slots: { optik: 'ts-130', kamera: 'asi2600mm' },
    spacer_mm: '10.5',
    extra_weight_kg: '1.2',
    seeing_arcsec: '2.5',
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-05T10:00:00Z',
    ...over,
  };
}

describe('isUuid', () => {
  it('veritabanı kimliğini tanır', () => {
    expect(isUuid('3f6a1b2c-4d5e-4f60-8a91-b2c3d4e5f607')).toBe(true);
  });

  it('yerel kimliği reddeder', () => {
    // Yerel depo `setup-a1b2c3d4` üretiyor; bu kimlikle veritabanına
    // yazmaya çalışmak "invalid input syntax for type uuid" veriyor.
    expect(isUuid('setup-a1b2c3d4')).toBe(false);
  });
});

describe('mapSetupRow', () => {
  it('sayısal kolonları metinden çevirir', () => {
    // PostgREST `numeric` kolonları dize olarak döndürüyor; sayı
    // sanmak toplama işlemlerini birleştirmeye çevirirdi.
    const setup = mapSetupRow(row());
    expect(setup.draft.spacerMm).toBe(10.5);
    expect(setup.draft.extraWeightKg).toBe(1.2);
    expect(setup.draft.seeingArcsec).toBe(2.5);
  });

  it('yuvaları olduğu gibi taşır', () => {
    expect(mapSetupRow(row()).draft.slots).toEqual({
      optik: 'ts-130',
      kamera: 'asi2600mm',
    });
  });

  it('bilinmeyen görünürlüğü özele çeker', () => {
    // Şüphede en kapalı seçenek: tanınmayan bir değeri "herkese açık"
    // saymak, kullanıcının setup'ını istemeden yayımlardı.
    expect(mapSetupRow(row({ visibility: 'saçma' })).visibility).toBe('ozel');
  });

  it('boş yuva nesnesini kabul eder', () => {
    expect(mapSetupRow(row({ slots: null })).draft.slots).toEqual({});
  });
});

describe('mergeSetups', () => {
  it('uzaktaki daha yeni kayıt kazanır', () => {
    const merged = mergeSetups(
      [saved({ id: 'a', name: 'eski', updatedAt: '2026-07-01T00:00:00Z' })],
      [saved({ id: 'a', name: 'yeni', updatedAt: '2026-07-09T00:00:00Z' })]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('yeni');
  });

  it('yereldeki daha yeni kayıt korunur', () => {
    const merged = mergeSetups(
      [saved({ id: 'a', name: 'yeni', updatedAt: '2026-07-09T00:00:00Z' })],
      [saved({ id: 'a', name: 'eski', updatedAt: '2026-07-01T00:00:00Z' })]
    );
    expect(merged[0].name).toBe('yeni');
  });

  it('yalnızca yerelde olan kayıt kaybolmaz', () => {
    // Oturum açmadan setup kuran biri giriş yaptığında emeğini
    // kaybetmemeli — bu birleştirmenin asıl sebebi.
    const merged = mergeSetups([saved({ id: 'yerel' })], []);
    expect(merged.map((s) => s.id)).toEqual(['yerel']);
  });

  it('yalnızca uzakta olan kayıt eklenir', () => {
    const merged = mergeSetups([], [saved({ id: 'uzak' })]);
    expect(merged.map((s) => s.id)).toEqual(['uzak']);
  });

  it('sonucu güncellik sırasına dizer', () => {
    const merged = mergeSetups(
      [saved({ id: 'eski', updatedAt: '2026-07-01T00:00:00Z' })],
      [saved({ id: 'yeni', updatedAt: '2026-07-20T00:00:00Z' })]
    );
    expect(merged.map((s) => s.id)).toEqual(['yeni', 'eski']);
  });

  it('aynı anda güncellenmişse uzak kazanır', () => {
    // Beraberlikte veritabanı otoritedir: yerel kopya bir cihazın
    // görüşü, veritabanı hepsinin ortak hâli.
    const merged = mergeSetups(
      [saved({ id: 'a', name: 'yerel', updatedAt: '2026-07-05T00:00:00Z' })],
      [saved({ id: 'a', name: 'uzak', updatedAt: '2026-07-05T00:00:00Z' })]
    );
    expect(merged[0].name).toBe('uzak');
  });
});

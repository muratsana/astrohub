import { describe, it, expect, beforeEach } from 'vitest';
import {
  encodeSetup,
  decodeSetup,
  saveSetup,
  listSetups,
  getSetup,
  deleteSetup,
} from './storage';
import type { SetupInput } from '@/domain/equipment/compatibility';

const input: SetupInput = {
  mount: { name: 'EQ6-R Pro', payloadCapacityKg: 20 },
  optic: {
    name: 'Esprit 100',
    focalLength: 550,
    aperture: 100,
    weightKg: 6.4,
    requiredBackfocusMm: 55,
  },
  camera: {
    name: 'ASI2600MC',
    pixelSize: 3.76,
    sensorWidth: 23.5,
    sensorHeight: 15.7,
    weightKg: 0.7,
    backfocusMm: 17.5,
  },
  spacerMm: 37.5,
  filterThicknessMm: 0,
  accessoriesKg: 1.5,
  reducerFactor: 1,
  seeingArcsec: 3,
};

beforeEach(() => {
  localStorage.clear();
});

describe('setup kodlama (paylaşılabilir bağlantı)', () => {
  it('kodlanan setup aynen geri çözülür', () => {
    const encoded = encodeSetup({ name: 'Gece setupı', input });
    expect(decodeSetup(encoded)).toEqual({ name: 'Gece setupı', input });
  });

  it('Türkçe karakterleri kaybetmez', () => {
    const encoded = encodeSetup({ name: 'Şükrü’nün düzeneği', input });
    expect(decodeSetup(encoded)?.name).toBe('Şükrü’nün düzeneği');
  });

  it('URL güvenli alfabe kullanır', () => {
    const encoded = encodeSetup({ name: 'x'.repeat(50), input });
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('bozuk girdide hata fırlatmaz, null döner', () => {
    expect(decodeSetup('bu-base64-degil!!')).toBeNull();
    expect(decodeSetup('')).toBeNull();
    expect(decodeSetup(null)).toBeNull();
    expect(decodeSetup(undefined)).toBeNull();
  });

  it('eksik alanlı yükü reddeder — adres çubuğundan gelen veriye güvenilmez', () => {
    const halfBaked = encodeSetup({
      name: 'yarım',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: { mount: { name: 'x', payloadCapacityKg: 5 } } as any,
    });
    expect(decodeSetup(halfBaked)).toBeNull();
  });
});

describe('yerel setup deposu', () => {
  it('kaydeder ve geri okur', () => {
    const saved = saveSetup('İlk setup', input);
    expect(getSetup(saved.id)).toEqual(saved);
    expect(listSetups()).toHaveLength(1);
  });

  it('adsız kayda varsayılan ad verir', () => {
    expect(saveSetup('   ', input).name).toBe('Adsız setup');
  });

  it('en yeni kayıt başta listelenir', () => {
    saveSetup('eski', input, new Date('2026-01-01T00:00:00Z'));
    saveSetup('yeni', input, new Date('2026-06-01T00:00:00Z'));

    expect(listSetups().map((s) => s.name)).toEqual(['yeni', 'eski']);
  });

  it('siler', () => {
    const saved = saveSetup('silinecek', input);
    deleteSetup(saved.id);
    expect(getSetup(saved.id)).toBeUndefined();
    expect(listSetups()).toHaveLength(0);
  });

  it('bozuk depo içeriğinde çökmez', () => {
    localStorage.setItem('astrohub:setups', '{bu json değil');
    expect(listSetups()).toEqual([]);
  });

  it('depoda dizi olmayan değer varsa boş liste döner', () => {
    localStorage.setItem('astrohub:setups', '{"a":1}');
    expect(listSetups()).toEqual([]);
  });
});

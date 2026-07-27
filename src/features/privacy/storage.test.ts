import { describe, it, expect, beforeEach } from 'vitest';
import {
  storageInventory,
  readStoredEntries,
  clearStorageItem,
  clearAllStorage,
  hasConsentRequiredItems,
} from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('depolama envanteri (§15.7)', () => {
  it('her kayıt astrohub önekiyle başlar', () => {
    for (const item of storageInventory) {
      expect(item.key.startsWith('astrohub:')).toBe(true);
    }
  });

  it('şu an rıza gerektiren kayıt yok — izleme çerezi kullanılmıyor', () => {
    expect(hasConsentRequiredItems()).toBe(false);
  });

  it('boş tarayıcıda hiçbir kayıt mevcut görünmez', () => {
    const entries = readStoredEntries();
    expect(entries).toHaveLength(storageInventory.length);
    expect(entries.every((e) => e.keys.length === 0)).toBe(true);
  });

  it('yazılan anahtarı mevcut olarak raporlar', () => {
    localStorage.setItem('astrohub:theme', 'field');
    const theme = readStoredEntries().find((e) => e.item.key === 'astrohub:theme');
    expect(theme?.keys).toEqual(['astrohub:theme']);
  });

  it('önekli kaydın tüm anahtarlarını toplar', () => {
    localStorage.setItem('astrohub:view:galeri', 'list');
    localStorage.setItem('astrohub:view:etkinlikler', 'grid');

    const views = readStoredEntries().find((e) => e.item.prefix);
    expect(views?.keys.sort()).toEqual([
      'astrohub:view:etkinlikler',
      'astrohub:view:galeri',
    ]);
  });
});

describe('silme', () => {
  it('tek kaydı siler, diğerlerine dokunmaz', () => {
    localStorage.setItem('astrohub:theme', 'field');
    localStorage.setItem('astrohub:location', '{}');

    const theme = storageInventory.find((i) => i.key === 'astrohub:theme')!;
    clearStorageItem(theme);

    expect(localStorage.getItem('astrohub:theme')).toBeNull();
    expect(localStorage.getItem('astrohub:location')).toBe('{}');
  });

  it('önekli kaydın tüm anahtarlarını siler', () => {
    localStorage.setItem('astrohub:view:galeri', 'list');
    localStorage.setItem('astrohub:view:ilanlar', 'grid');

    const views = storageInventory.find((i) => i.prefix)!;
    clearStorageItem(views);

    expect(localStorage.getItem('astrohub:view:galeri')).toBeNull();
    expect(localStorage.getItem('astrohub:view:ilanlar')).toBeNull();
  });

  it('tümünü silerken yalnızca astrohub anahtarlarına dokunur', () => {
    localStorage.setItem('astrohub:theme', 'field');
    localStorage.setItem('astrohub:view:galeri', 'list');
    localStorage.setItem('baska-uygulama:ayar', 'x');

    const removed = clearAllStorage();

    expect(removed).toBe(2);
    expect(localStorage.getItem('baska-uygulama:ayar')).toBe('x');
  });

  it('silinecek bir şey yoksa sıfır döner', () => {
    expect(clearAllStorage()).toBe(0);
  });
});

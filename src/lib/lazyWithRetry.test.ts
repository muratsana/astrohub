import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryImport } from './lazyWithRetry';

const RELOAD_FLAG = 'astrohub:chunk-reloaded';

let reload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sessionStorage.clear();
  reload = vi.fn();
  // jsdom'da location.reload salt okunur; yerine geçici bir casus konur.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('chunk yükleme yeniden denemesi', () => {
  it('ilk denemede başarılıysa yükleyiciyi bir kez çağırır', async () => {
    const loader = vi.fn().mockResolvedValue({ default: 'modül' });

    await expect(retryImport(loader)).resolves.toEqual({ default: 'modül' });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('geçici hatada bir kez daha dener ve başarılı olur', async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error('ağ hatası'))
      .mockResolvedValueOnce({ default: 'modül' });

    await expect(retryImport(loader)).resolves.toEqual({ default: 'modül' });
    expect(loader).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
  });

  it('iki deneme de başarısızsa sayfayı bir kez yeniler', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('chunk yok'));

    // Yenileme sonrası söz bilinçli olarak asla çözülmez; bekleyip
    // yan etkileri kontrol ediyoruz.
    let settled = false;
    void retryImport(loader).finally(() => {
      settled = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(loader).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(RELOAD_FLAG)).toBe('1');
    expect(settled).toBe(false);
  });

  it('yenileme sonrası hâlâ başarısızsa hatayı yukarı verir — sonsuz döngü yok', async () => {
    sessionStorage.setItem(RELOAD_FLAG, '1');
    const loader = vi.fn().mockRejectedValue(new Error('chunk yok'));

    await expect(retryImport(loader)).rejects.toThrow('chunk yok');
    expect(reload).not.toHaveBeenCalled();
  });
});

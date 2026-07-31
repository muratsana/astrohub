import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enabledProviders, resetProviderCache } from './authProviders';

/**
 * Düğmenin çizilip çizilmeyeceği bu listeye bağlı.
 *
 * Canlıda ölçülen hata: Supabase yapılandırılmıştı ama Google sağlayıcısı
 * KAPALIYDI (`"google": false`). Düğme yine de görünüyordu ve basan
 * herkes "Unsupported provider" hatası alıyordu. Buradaki testler o
 * ayrımı — yapılandırılmış olmak ile sağlayıcının açık olması — sabitliyor.
 */

/*
 * `vi.stubEnv` kullanılıyor, doğrudan atama değil: `import.meta.env`
 * alanları tip düzeyinde salt okunur ve atama `tsc`de kırılıyor —
 * testler çalışsa bile typecheck düşüyordu. `stubEnv` hem tip güvenli
 * hem de `unstubAllEnvs` ile geri alınabilir.
 */
function setEnv(url: string, key: string) {
  vi.stubEnv('VITE_SUPABASE_URL', url);
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', key);
}

function mockSettings(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  });
}

beforeEach(() => {
  resetProviderCache();
  setEnv('https://proje.supabase.co', 'anon-key');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('enabledProviders', () => {
  it('yalnızca açık olanları döndürür', async () => {
    vi.stubGlobal(
      'fetch',
      mockSettings({ external: { google: true, github: false, email: true } })
    );

    const providers = await enabledProviders();
    expect(providers.has('google')).toBe(true);
    expect(providers.has('github')).toBe(false);
    expect(providers.has('email')).toBe(true);
  });

  /* Üretimde ölçülen durum: yapılandırma var, sağlayıcı kapalı. */
  it('kapalı sağlayıcıyı açık saymaz', async () => {
    vi.stubGlobal('fetch', mockSettings({ external: { google: false } }));
    expect((await enabledProviders()).has('google')).toBe(false);
  });

  it('anahtar yoksa hiç istek atmaz', async () => {
    const fetchMock = mockSettings({ external: { google: true } });
    vi.stubGlobal('fetch', fetchMock);
    setEnv('', '');

    expect((await enabledProviders()).size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /*
   * Ağ hatasında BOŞ küme — yani düğme çizilmiyor. Ters yön daha cömert
   * görünür ama kullanıcıyı çalışmayabilecek bir yola sokar; e-posta
   * girişi zaten duruyor.
   */
  it('ağ hatasında sağlayıcı açık sayılmaz', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('kopuk')));
    expect((await enabledProviders()).size).toBe(0);
  });

  it('sunucu hata döndürürse sağlayıcı açık sayılmaz', async () => {
    vi.stubGlobal('fetch', mockSettings({}, false));
    expect((await enabledProviders()).size).toBe(0);
  });

  it('gövde beklenmedik biçimdeyse çökmez', async () => {
    vi.stubGlobal('fetch', mockSettings({ beklenmedik: 1 }));
    expect((await enabledProviders()).size).toBe(0);
  });

  /* Her giriş ekranı açılışında yeniden sormak gereksiz. */
  it('sonucu önbelleğe alır — tek istek', async () => {
    const fetchMock = mockSettings({ external: { google: true } });
    vi.stubGlobal('fetch', fetchMock);

    await enabledProviders();
    await enabledProviders();
    await enabledProviders();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('adresin sonundaki eğik çizgi iki kez yazılmaz', async () => {
    const fetchMock = mockSettings({ external: {} });
    vi.stubGlobal('fetch', fetchMock);
    setEnv('https://proje.supabase.co/', 'anon-key');

    await enabledProviders();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://proje.supabase.co/auth/v1/settings',
      expect.objectContaining({ headers: { apikey: 'anon-key' } })
    );
  });
});

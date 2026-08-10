import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNotificationPreferences } from './notifications';

/**
 * BİLDİRİM TERCİHLERİ — İKİ BİÇİM VE VERİ KAYBI.
 *
 * NEDEN BU TEST VAR. `notification_preferences.categories` iki biçim
 * taşıyor: eski `{"galeri": false}` ve kanal ayrımı yapan
 * `{"galeri": {"site": true, "email": false}}`. Ekran yalnızca site içi
 * kanalı yönetiyor; okurken ikinci biçimi yanlış çözerse kullanıcının
 * kapattığı kategori açık görünür, YAZARKEN ham haritayı ezerse
 * e-posta/push tercihi ve ekranda listelenmeyen kategoriler sessizce
 * silinir. İkincisi geri dönüşü olmayan bir kayıp ve tek bir kutu
 * tıklamasıyla oluyor — bu yüzden asıl sınanan şey o.
 *
 * Sunucu tarafındaki karşılığı `app.notification_allowed`; iki tarafın
 * aynı kuralı uygulaması gerekiyor (anahtar yoksa AÇIK, haritada yazmayan
 * kanal AÇIK).
 */

const { upsert, storedCategories } = vi.hoisted(() => ({
  upsert: vi.fn().mockResolvedValue({ error: null }),
  storedCategories: { value: {} as unknown },
}));

vi.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: true,
  getSupabase: () =>
    Promise.resolve({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { categories: storedCategories.value },
                error: null,
              }),
          }),
        }),
        upsert,
      }),
    }),
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'kullanici-1' },
    loading: false,
    configured: true,
  }),
}));

/** Son `upsert` çağrısına giden `categories` haritası. */
function yazilanHarita(): Record<string, unknown> {
  const [payload] = upsert.mock.calls.at(-1) ?? [];
  return (payload as { categories: Record<string, unknown> }).categories;
}

/*
 * `loading === false` beklemek YETMEZ: kanca ilk çizimde henüz false, effect
 * daha çalışmamıştır ve bekleme anında geri döner. Haritanın dolmasını
 * bekliyoruz — okuma bittiğinde kategoriler yerine oturmuş olur.
 */
async function tercihleriYukle(kayit: unknown) {
  storedCategories.value = kayit;
  const view = renderHook(() => useNotificationPreferences());
  await waitFor(() =>
    expect(Object.keys(view.result.current.categories).length).toBeGreaterThan(0)
  );
  return view;
}

beforeEach(() => {
  upsert.mockClear();
  storedCategories.value = {};
});

describe('bildirim tercihleri — okuma', () => {
  it('eski boolean biçimini kapalı olarak okur', async () => {
    const { result } = await tercihleriYukle({ mesaj: false });
    expect(result.current.categories.mesaj).toBe(false);
  });

  it('kanal haritasında site alanını okur', async () => {
    const { result } = await tercihleriYukle({
      galeri: { site: false, email: true },
    });
    expect(result.current.categories.galeri).toBe(false);
  });

  /*
   * Anahtarın yokluğu "hayır" değil "belirtilmemiş" demek: varsayılan,
   * hiç kaydı olmayan kullanıcıyla aynı olmalı. Sunucu da böyle davranıyor.
   */
  it('haritada kanal yazmıyorsa açık sayar', async () => {
    const { result } = await tercihleriYukle({ forum: { email: false } });
    expect(result.current.categories.forum).toBe(true);
  });

  it('hiç kayıt yoksa hepsini açık sayar', async () => {
    const { result } = await tercihleriYukle({});
    expect(result.current.categories.mesaj).toBe(true);
    expect(result.current.categories.galeri).toBe(true);
  });
});

describe('bildirim tercihleri — yazma haritayı ezmiyor', () => {
  it('ekranda görünmeyen kategoriyi ve kanal tercihini korur', async () => {
    const { result } = await tercihleriYukle({
      // Ekranda kutusu yok (üreticisi henüz yok) ama kayıtta duruyor.
      ilan: false,
      // Site içi açık, e-posta kapalı: ekran yalnızca ilkini yönetiyor.
      galeri: { site: true, email: false },
    });

    await result.current.toggle('mesaj', false);
    await waitFor(() => expect(upsert).toHaveBeenCalled());

    const yazilan = yazilanHarita();
    expect(yazilan.mesaj).toBe(false);
    expect(yazilan.ilan).toBe(false);
    expect(yazilan.galeri).toEqual({ site: true, email: false });
  });

  /*
   * Kanal haritası olarak kaydedilmiş bir kategoriyi kapatmak YALNIZCA
   * site alanını değiştirmeli. Boolean'a düşürseydik, kullanıcı site içi
   * bildirimi kapatırken e-posta tercihini de kaybederdi.
   */
  it('kanal haritası biçimini boolean’a düşürmez', async () => {
    const { result } = await tercihleriYukle({
      galeri: { site: true, email: false },
    });

    await result.current.toggle('galeri', false);
    await waitFor(() => expect(upsert).toHaveBeenCalled());

    expect(yazilanHarita().galeri).toEqual({ site: false, email: false });
  });

  it('boolean kaydedilmiş kategoriyi boolean bırakır', async () => {
    const { result } = await tercihleriYukle({ forum: true });

    await result.current.toggle('forum', false);
    await waitFor(() => expect(upsert).toHaveBeenCalled());

    expect(yazilanHarita().forum).toBe(false);
  });
});

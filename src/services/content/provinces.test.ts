import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchProvinces,
  matchesProvince,
  normalizeTr,
  rankProvinces,
  resetProvinceCache,
  type Province,
} from './provinces';

/**
 * TÜRKİYE İLLERİ — merkezî kaynak (Faz 1.1).
 *
 * Test ortamında Supabase yapılandırılmamış, yani okuma tohum yedeğine
 * düşüyor. 81 ilin veritabanında bulunduğu AYRICA ölçüldü: migration
 * 0040'ın sonundaki blok sayı 81 değilse migration'ı düşürüyor, ve
 * canlıda `count(*) = 81` ile doğrulandı. Buradaki testler, migration'ın
 * garanti edemediği İSTEMCİ tarafını koruyor.
 */

const il = (name: string, searchName: string): Province => ({
  code: 1,
  name,
  slug: searchName,
  searchName,
  latitude: 39,
  longitude: 35,
  isActive: true,
});

describe('normalizeTr', () => {
  /*
   * ASIL TUZAK. JavaScript'te 'I'.toLowerCase() === 'i' — oysa Türkçede
   * 'ı' olmalı. Yerel verilmezse "IĞDIR" → "igdir" yerine "iğdir"
   * benzeri bozuk bir sonuç çıkar ve il aramada bulunamaz.
   */
  it('büyük I Türkçe kurala göre iniyor', () => {
    expect(normalizeTr('IĞDIR')).toBe('igdir');
    expect(normalizeTr('İSTANBUL')).toBe('istanbul');
  });

  it('bütün Türkçe harfleri ASCII karşılığına indiriyor', () => {
    expect(normalizeTr('Çankırı')).toBe('cankiri');
    expect(normalizeTr('Şanlıurfa')).toBe('sanliurfa');
    expect(normalizeTr('Gümüşhane')).toBe('gumushane');
    expect(normalizeTr('Muğla')).toBe('mugla');
    expect(normalizeTr('Hakkâri')).toBe('hakkari');
  });

  /*
   * Veritabanındaki `app.tr_normalize` ile AYNI sonucu vermeli. Ayrışırsa
   * istemci "cankiri" arar, sunucu "çankırı" saklar ve hiçbir şey
   * bulunmaz. Bu değerler canlı veritabanından okunan `search_name`
   * kolonuyla birebir aynı.
   */
  it('veritabanı normalizasyonuyla aynı sonucu veriyor', () => {
    const beklenen: Record<string, string> = {
      Adıyaman: 'adiyaman',
      Ağrı: 'agri',
      Aydın: 'aydin',
      Balıkesir: 'balikesir',
      Diyarbakır: 'diyarbakir',
      Elazığ: 'elazig',
      Kırşehir: 'kirsehir',
      Kahramanmaraş: 'kahramanmaras',
      Nevşehir: 'nevsehir',
      Niğde: 'nigde',
      Tekirdağ: 'tekirdag',
      Uşak: 'usak',
      Düzce: 'duzce',
      Karabük: 'karabuk',
    };
    for (const [ad, norm] of Object.entries(beklenen)) {
      expect(normalizeTr(ad), ad).toBe(norm);
    }
  });
});

describe('matchesProvince', () => {
  it('Türkçe yazımla da ASCII yazımla da buluyor', () => {
    const cankiri = il('Çankırı', 'cankiri');
    expect(matchesProvince(cankiri, 'cankiri')).toBe(true);
    expect(matchesProvince(cankiri, 'Çankırı')).toBe(true);
    expect(matchesProvince(cankiri, 'ÇANKIRI')).toBe(true);
    expect(matchesProvince(cankiri, 'çank')).toBe(true);
  });

  it('boş terim hepsini geçiriyor', () => {
    expect(matchesProvince(il('Van', 'van'), '   ')).toBe(true);
  });

  it('eşleşmeyeni elemiyor', () => {
    expect(matchesProvince(il('Van', 'van'), 'rize')).toBe(false);
  });
});

describe('rankProvinces', () => {
  /*
   * "an" yazan biri Ankara'yı Adıyaman'dan önce görmeli: ikisi de
   * eşleşiyor ama biri baştan. Sıralama olmasaydı kullanıcı aradığı ili
   * listenin ortasında arardı.
   */
  it('baştan eşleşeni öne alıyor', () => {
    const liste = [il('Adıyaman', 'adiyaman'), il('Ankara', 'ankara')];
    expect(rankProvinces(liste, 'an')[0].name).toBe('Ankara');
  });

  it('boş terimde sırayı bozmuyor', () => {
    const liste = [il('Zonguldak', 'zonguldak'), il('Adana', 'adana')];
    expect(rankProvinces(liste, '').map((p) => p.name)).toEqual([
      'Zonguldak',
      'Adana',
    ]);
  });
});

describe('fetchProvinces · yapılandırma yokken', () => {
  beforeEach(() => resetProvinceCache());

  /*
   * Şehir seçici olmadan etkinlik, ilan ve hava durumu akışları
   * kullanılamaz. Okuma düşse bile liste BOŞ DÖNMEMELİ.
   */
  it('boş liste döndürmüyor, tohuma düşüyor', async () => {
    const sonuc = await fetchProvinces();
    expect(sonuc.items.length).toBeGreaterThan(0);
    expect(sonuc.source).toBe('seed');
  });

  /*
   * Tohumda gerçek plaka kodu YOK. Uydurulmuş bir kod, kod üzerinden
   * eşleşen bir sorguyu sessizce yanlış ile bağlardı — bu yüzden
   * negatif veriliyor ve gerçek plakayla asla karışmıyor.
   */
  it('tohum kayıtlarının plaka kodu gerçek koddan ayırt edilebilir', async () => {
    const { items } = await fetchProvinces();
    expect(items.every((p) => p.code < 0)).toBe(true);
  });

  it('tohum kayıtları da normalize arama adı taşıyor', async () => {
    const { items } = await fetchProvinces();
    for (const p of items) {
      expect(p.searchName, p.name).toBe(normalizeTr(p.name));
    }
  });

  it('sonuç önbellekleniyor — dört seçici dört istek atmamalı', async () => {
    const a = await fetchProvinces();
    const b = await fetchProvinces();
    expect(a).toBe(b);
  });
});

/**
 * ASKIDA KALAN SORGU — tarayıcıda ölçülerek bulundu.
 *
 * Önizleme derlemesinde il seçici boş açılıyordu. Sebep bir hata değil,
 * SESSİZLİKTİ: dış çıkış kesik olduğu için `fetch` ne yanıt ne hata
 * veriyordu, düşme payı ise yalnızca hata dalında kuruluydu. Yanıtsız
 * bir istekte hata dalı hiç çalışmaz — söz sonsuza kadar bekler.
 *
 * Aynısı şebekesi kopmuş kullanıcıda olurdu: şehir seçemediği için ilan
 * veremez, profilini düzenleyemezdi.
 */
describe('fetchProvinces — yanıtsız sorgu', () => {
  beforeEach(() => {
    resetProvinceCache();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock('@/services/supabase/client');
    resetProvinceCache();
  });

  it('sorgu hiç dönmezse tohum yedeğine geçiyor', async () => {
    vi.doMock('@/services/supabase/client', () => ({
      isSupabaseConfigured: true,
      /* Hiç çözülmeyen söz: askıda kalan ağ isteğinin taklidi. */
      getSupabase: () => new Promise(() => {}),
    }));
    const mod = await import('./provinces');
    mod.resetProvinceCache();

    vi.useFakeTimers();
    const pending = mod.fetchProvinces();
    await vi.advanceTimersByTimeAsync(6000);
    const result = await pending;

    expect(result.source).toBe('seed');
    expect(result.items.length).toBeGreaterThan(0);
  });

  /* Yedek önbelleğe yazılmamalı: ağı geri gelen kullanıcı oturum boyunca
     15 ille kalmamalı. */
  it('zaman aşımı yedeği önbelleğe yazılmıyor', async () => {
    vi.doMock('@/services/supabase/client', () => ({
      isSupabaseConfigured: true,
      getSupabase: () => new Promise(() => {}),
    }));
    const mod = await import('./provinces');
    mod.resetProvinceCache();

    vi.useFakeTimers();
    const first = mod.fetchProvinces();
    await vi.advanceTimersByTimeAsync(6000);
    const a = await first;

    const second = mod.fetchProvinces();
    await vi.advanceTimersByTimeAsync(6000);
    const b = await second;

    expect(a).not.toBe(b);
    expect(b.source).toBe('seed');
  });
});

/**
 * İKİNCİ TÜKETİCİ DE KORUNUYOR.
 *
 * İlk yazımda zaman aşımı `fetchProvinces` gövdesindeydi ve `inflight`
 * çıplak isteği taşıyordu: `if (inflight) return inflight` dalına düşen
 * ikinci çağrı hiç çözülmeyen sözü bekliyordu. Sayfada iki tüketici var
 * (konum sağlayıcısı ve form seçicisi), yani gerçek kullanımda ikincisi
 * hep korumasız kalıyordu — tarayıcıda ölçülene kadar görünmedi.
 */
describe('fetchProvinces — eşzamanlı ikinci çağrı', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock('@/services/supabase/client');
    resetProvinceCache();
  });

  it('askıda kalan sorguda ikinci çağrı da yedeğe düşüyor', async () => {
    vi.resetModules();
    vi.doMock('@/services/supabase/client', () => ({
      isSupabaseConfigured: true,
      getSupabase: () => new Promise(() => {}),
    }));
    const mod = await import('./provinces');
    mod.resetProvinceCache();

    vi.useFakeTimers();
    const first = mod.fetchProvinces();
    const second = mod.fetchProvinces();
    await vi.advanceTimersByTimeAsync(6000);

    expect((await first).source).toBe('seed');
    expect((await second).source).toBe('seed');
    expect((await second).items.length).toBeGreaterThan(0);
  });
});

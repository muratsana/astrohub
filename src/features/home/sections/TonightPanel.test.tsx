import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { TonightPanel } from './TonightPanel';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { LocationProvider } from '@/features/location/LocationContext';
import { MAX_OFFSET, NIGHT_PICKER_DAYS } from './tonight/nightOffset';

/**
 * "BU GECE" MODÜLÜ — davranış denetimi.
 *
 * Modülün üç kolonu var ve ikisi hava servisinden BAĞIMSIZ: çizelge ve
 * hedef listesi yerel efemeris hesabıyla çalışıyor. jsdom'da `fetch`
 * gerçek bir istek yapamadığı için hava kancası hata/yükleme durumunda
 * kalıyor — bu testler tam olarak o durumu denetliyor, çünkü üretimde de
 * en sık görülecek bozulma bu: servis düşer, gecenin geri kalanı
 * çalışmaya devam etmelidir.
 */
function renderPanel() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <LocationProvider>
          <TonightPanel />
        </LocationProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('TonightPanel · karar kolonu', () => {
  it('başlığı h2 olarak veriyor — sayfada ikinci bir h1 açmıyor', () => {
    renderPanel();
    const heading = screen.getByRole('heading', { name: /^bu gece$/i });
    expect(heading.tagName).toBe('H2');
  });

  /*
   * ASIL KURAL. Skor uydurulamaz: hava verisi yokken bir hüküm
   * göstermek, kullanıcıyı gecenin ortasında ekipmanla dışarı çıkarır.
   */
  it('hava verisi yokken hüküm cümlesi hiç görünmüyor', () => {
    renderPanel();
    expect(
      screen.queryByText(/çok iyi gece|orta gece|zayıf gece/i)
    ).not.toBeInTheDocument();
  });

  it('servis künyesini kullanıcı arayüzünde göstermiyor', () => {
    renderPanel();
    expect(screen.queryByText(/Open-Meteo|efemeris yerel hesap/i)).not.toBeInTheDocument();
  });
});

describe('TonightPanel · zaman kolonu', () => {
  it('karanlık penceresini ve gece aralığını gösteriyor', () => {
    renderPanel();
    expect(screen.getByText(/karanlık penceresi/i)).toBeInTheDocument();
    expect(screen.getByText(/^süre$/i)).toBeInTheDocument();
    expect(screen.getByText(/^aysız$/i)).toBeInTheDocument();
  });

  /*
   * Çizelge tamamen görsel. Ekran okuyucu için aynı bilgi tek bir
   * cümlede veriliyor; `role="img"` + `aria-label` olmadan bu kutu
   * boş bir dikdörtgen olarak okunur.
   */
  it('çizelgenin erişilebilir bir özeti var', () => {
    renderPanel();
    const chart = screen.getByRole('img', { name: /gece/i });
    expect(chart).toHaveAttribute('aria-label', expect.stringMatching(/\d{2}:\d{2}/));
  });

  it('hava servisi yokken koşul kartları tire gösteriyor, panel çökmüyor', () => {
    renderPanel();
    for (const label of [/^bulut örtüsü$/i, /^seeing$/i, /^çiylenme$/i]) {
      const card = screen.getByText(label).closest('div');
      expect(within(card!).getByText('—')).toBeInTheDocument();
    }
  });

  /*
   * Ay hava servisinden gelmiyor — efemeris hesabı. Servis düşükken de
   * dolu olmalı; "—" çıkması, havadan bağımsız bir değerin havaya
   * bağlanmış olması demektir.
   */
  it('ay değeri hava servisinden bağımsız hesaplanıyor', () => {
    renderPanel();
    const card = screen.getByText(/^ay$/i).closest('div');
    expect(within(card!).getByText(/^%\d+$/)).toBeInTheDocument();
  });
});

describe('TonightPanel · hedef kolonu', () => {
  it('çipler tek seçimli bir grup ve biri açık', () => {
    renderPanel();
    const group = screen.getByRole('radiogroup', { name: /nesne türü/i });
    const chips = within(group).getAllByRole('radio');
    expect(chips.map((c) => c.textContent)).toEqual([
      'Tümü',
      'Bulutsu',
      'Küme',
      'Galaksi',
    ]);
    expect(
      chips.filter((c) => c.getAttribute('aria-checked') === 'true')
    ).toHaveLength(1);
  });

  it('çipe basınca seçim o çipe geçiyor', () => {
    renderPanel();
    const group = screen.getByRole('radiogroup', { name: /nesne türü/i });
    const galaksi = within(group).getByRole('radio', { name: 'Galaksi' });

    fireEvent.click(galaksi);

    expect(galaksi).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getByRole('radio', { name: 'Tümü' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  /*
   * SÜZME TAM SIRALAMAYA UYGULANIYOR, altı satıra değil. Bu test onu
   * dolaylı ölçüyor: bir çipe basınca liste boşalıyorsa süzme kesilmiş
   * listenin üstünde çalışıyor demektir — katalogda o türden onlarca
   * kayıt var ve her gece en az birkaçı yükselir.
   */
  it('her çip için liste doluyor — süzme kesilmiş listeye uygulanmıyor', () => {
    renderPanel();
    const group = screen.getByRole('radiogroup', { name: /nesne türü/i });

    for (const name of ['Bulutsu', 'Küme', 'Galaksi']) {
      fireEvent.click(within(group).getByRole('radio', { name }));
      expect(
        screen.queryByText(/bu filtreye uygun nesne yok/i),
        `${name} çipi boş liste veriyor`
      ).not.toBeInTheDocument();
    }
  });

  it('hedef satırları katalog sayfasına bağlanıyor', () => {
    renderPanel();
    const links = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')?.startsWith('/hedef/'));
    expect(links.length).toBeGreaterThan(0);
  });

  it('tüm katalog bağlantısı nesne sayısını taşıyor', () => {
    renderPanel();
    const link = screen.getByRole('link', { name: /tüm katalog/i });
    expect(link).toHaveAttribute('href', '/hedefler');
    expect(link.textContent).toMatch(/\d+ nesne/);
  });

  it('zirve ve yükseklik başlıkları sıralama kontrolü', () => {
    renderPanel();
    const zirve = screen.getByRole('button', { name: /zirve sütununu artan sırala/i });
    const yukseklik = screen.getByRole('button', {
      name: /yükseklik sütununu artan sırala/i,
    });

    fireEvent.click(yukseklik);

    expect(
      screen.getByRole('button', { name: /yükseklik sütununu azalan sırala/i })
    ).toBeInTheDocument();
    expect(zirve).toBeInTheDocument();
  });
});

describe('TonightPanel · ileri tarihli gece', () => {
  it('gece seçimi haftalık tek satırlı kontrol olarak çiziliyor', () => {
    renderPanel();
    const group = screen.getByRole('tablist', { name: /gece tarihi seç/i });
    const tabs = within(group).getAllByRole('tab');

    expect(tabs).toHaveLength(NIGHT_PICKER_DAYS);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[MAX_OFFSET]).toBeInTheDocument();
  });

  it('ileri güne tıklayınca seçim değişiyor ve ilk sekme geri döndürüyor', () => {
    renderPanel();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);

    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(tabs[0]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  /*
   * ASIL KURAL: ana sayfa seçicisi haftalık karar yüzeyi. Hava adaptörü
   * daha uzun veri çekse bile bu kontrol tek haftayı aşmıyor.
   */
  it('haftanın son günü seçilebiliyor, daha ileri kontrol çizilmiyor', () => {
    renderPanel();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[MAX_OFFSET]);

    expect(tabs[MAX_OFFSET]).toHaveAttribute('aria-selected', 'true');
    expect(tabs).toHaveLength(7);
  });

  /*
   * Gelecekteki bir gecede "şu an" diye bir nokta yok; imleci çizmek
   * olmayan bir anı göstermek olurdu.
   */
  it('ileri gecede "şu an" imleci çizilmiyor', () => {
    renderPanel();
    fireEvent.click(screen.getAllByRole('tab')[1]);
    expect(screen.queryByText('ŞU AN')).not.toBeInTheDocument();
  });
});

/**
 * ESKİ GEZİNME YÜZEYİ GERİ GELMESİN.
 *
 * Kullanıcı yorumundaki sorun ayrı ok düğmeleri ve date input'un panelin
 * üstünde dağınık görünmesiydi. Yeni yüzey haftalık tab çizgisi.
 */
describe('TonightPanel · eski gezinme yüzeyi kapalı', () => {
  it('önceki/sonraki okları ve date input çizilmiyor', () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: /önceki gece/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sonraki gece/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/gece tarihi seç/i, { selector: 'input' })).not.toBeInTheDocument();
  });
});

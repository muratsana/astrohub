import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from './HomePage';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { LocationProvider } from '@/features/location/LocationContext';
import { PreviewEditorProvider } from '@/features/preview-editor/PreviewEditorContext';
import { defaultHeroSlides } from './hero/slides';
import { primaryNav } from '@/app/navigation';

/**
 * Ana sayfa duman testi — bölüm sırası:
 * hero → bu gece → galeri → haber/yazı → etkinlik → ilan.
 */
/*
 * İçerik kancaları (ekipman, etkinlik, gözlem noktası) TanStack Query
 * kullanıyor; sağlayıcı olmadan render çöker. Test ortamında Supabase
 * yapılandırması yok, dolayısıyla sorgu hiç kurulmuyor ve sayfa tohum
 * veriyle boyanıyor — sağlayıcı yalnızca kancanın bağlamı için gerekli.
 */
function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ThemeProvider>
          <LocationProvider>
            <PreviewEditorProvider>
              <HomePage />
            </PreviewEditorProvider>
          </LocationProvider>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/**
 * Hero başlığı ekranda Türkçeye duyarlı biçimde büyütülür ("karenin" →
 * "KARENİN"); erişilebilir ad da bu metindir. Varsayılan yerel ayarla
 * büyütülse "KARENIN" çıkardı — testin asıl koruduğu şey bu.
 */
function heroName(title: string): string {
  return title.toLocaleUpperCase('tr-TR');
}

function carousel() {
  return screen.getByRole('region', { name: /astrohub modülleri/i });
}

describe('HomePage · hero', () => {
  it('ilk slaydın başlığını h1 olarak gösterir', () => {
    renderHome();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: heroName(defaultHeroSlides[0].title),
      })
    ).toBeInTheDocument();
  });

  it('her modül için bir gösterge sunar', () => {
    renderHome();
    const tabs = within(carousel()).getAllByRole('tab');
    expect(tabs).toHaveLength(defaultHeroSlides.length);
  });

  it('ileri okuyla sonraki slayda geçer', () => {
    renderHome();
    fireEvent.click(
      within(carousel()).getByRole('button', { name: /sonraki slayt/i })
    );
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: heroName(defaultHeroSlides[1].title),
      })
    ).toBeInTheDocument();
  });

  it('geri okuyla son slayda sarar', () => {
    renderHome();
    fireEvent.click(
      within(carousel()).getByRole('button', { name: /önceki slayt/i })
    );
    const last = defaultHeroSlides[defaultHeroSlides.length - 1];
    expect(
      screen.getByRole('heading', { level: 1, name: heroName(last.title) })
    ).toBeInTheDocument();
  });

  it('göstergeye tıklayınca o slayda gider', () => {
    renderHome();
    const tabs = within(carousel()).getAllByRole('tab');
    fireEvent.click(tabs[2]);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: heroName(defaultHeroSlides[2].title),
      })
    ).toBeInTheDocument();
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('her slaydın CTA’sı gerçek bir modüle bağlanır', () => {
    const navPaths = primaryNav.map((i) => i.to);
    for (const slide of defaultHeroSlides) {
      expect(navPaths, `${slide.badge} hedefi menüde yok`).toContain(
        slide.ctaTo
      );
    }
  });
});

describe('HomePage · bölümler', () => {
  it('hero’dan sonra "Bu Gece" panelini gösterir', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { name: /^bu gece$/i })
    ).toBeInTheDocument();
  });

  it('hava servisine ulaşılamadığında seeing değerini uydurmaz', () => {
    // jsdom'da `fetch` gerçek bir istek yapamaz; kanca hata durumuna
    // düşer. Beklenen davranış boş bir tire — asla uydurulmuş bir sayı.
    renderHome();
    const seeing = screen.getByText(/^seeing$/i).closest('div');
    expect(within(seeing!).getByText('—')).toBeInTheDocument();
  });

  it('bulut ve çiylenme kartlarını da tire ile bırakır', () => {
    renderHome();
    for (const label of [/^bulut örtüsü$/i, /^çiylenme$/i]) {
      const cell = screen.getByText(label).closest('div');
      expect(within(cell!).getByText('—')).toBeInTheDocument();
    }
  });

  /*
   * Hava servisi yokken SKOR DA OLMAMALI. Panelin en görünür sayısı bu
   * ve uydurulmuş bir "iyi gece", kullanıcıyı gecenin ortasında
   * ekipmanla dışarı çıkarır. Kolonun o durumda ne söylediği değil,
   * NE SÖYLEMEDİĞİ denetleniyor.
   */
  it('hava verisi yokken gece skoru göstermez', () => {
    renderHome();
    expect(screen.queryByText(/çok iyi gece|i̇yi gece|orta gece|zayıf gece/i))
      .not.toBeInTheDocument();
  });

  it('hedef süzgeci çipleri tek seçimli bir grup', () => {
    renderHome();
    const group = screen.getByRole('radiogroup', { name: /nesne türü/i });
    const chips = within(group).getAllByRole('radio');
    expect(chips).toHaveLength(4);
    expect(chips.filter((c) => c.getAttribute('aria-checked') === 'true'))
      .toHaveLength(1);
  });

  it('galeri şeridini künyeli karolarla gösterir', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { name: /galeriden son yüklenenler/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/IC 434/).length).toBeGreaterThan(0);
  });

  it('etkinlikleri tablo olarak listeler', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { name: /yaklaşan etkinlikler/i })
    ).toBeInTheDocument();
    // Ajanda satırı: etkinlik adı tam kontrastta bir bağlantı olarak
    // okunmalı. Tablo düzeninde ad diğer hücrelerle aynı ağırlıktaydı.
    // Belirli bir etkinliğe değil, düzene bakıyoruz: ajanda satırındaki
    // ad tam kontrastta bir bağlantı olmalı. İçeriğe kilitlenen bir
    // beklenti, takvim her güncellendiğinde düşerdi.
    const links = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href')?.startsWith('/etkinlik/'));
    expect(links.length).toBeGreaterThan(0);
  });

  it('haberler ve yazılar bölümlerini içerir', () => {
    renderHome();
    for (const name of [/^haberler$/i, /^yazılar$/i]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('son ilanları fiyatıyla gösterir', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { name: /Son İlanlar/ })
    ).toBeInTheDocument();
    const links = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href')?.startsWith('/ilan/'));
    expect(links.length).toBeGreaterThan(0);
    expect(within(links[0]).getByText(/₺$/)).toBeInTheDocument();
  });

  it('karanlık gökyüzü şeridi ana sayfadan çıkarıldı', () => {
    // Modül `/saha`da duruyor ve üst menüde girişi var; ana sayfada
    // yedinci bir bölüm listeyi uzatıyor, sıralamayı güçlendirmiyordu.
    renderHome();
    expect(
      screen.queryByRole('heading', { name: /karanlık gökyüzü/i })
    ).not.toBeInTheDocument();
  });

  it('bölümler istenen sırada dizilir', () => {
    // Sıra bir öncelik beyanı (bkz. HomePage doc): gökyüzü → topluluk →
    // okunacaklar → takvim → pazaryeri. Kayması sessizce olmasın.
    renderHome();
    const order = [
      /^bu gece$/i,
      /galeriden son yüklenenler/i,
      /^haberler$/i,
      /yaklaşan etkinlikler/i,
      /Son İlanlar/,
    ].map((name) => screen.getByRole('heading', { name }));

    for (let i = 1; i < order.length; i++) {
      const relation = order[i - 1].compareDocumentPosition(order[i]);
      expect(
        relation & Node.DOCUMENT_POSITION_FOLLOWING,
        `${order[i].textContent} bir önceki bölümden sonra gelmeli`
      ).toBeTruthy();
    }
  });

  it('araçlar şeridini artık göstermez', () => {
    renderHome();
    expect(
      screen.queryByRole('heading', { name: /^araçlar$/i })
    ).not.toBeInTheDocument();
  });
});

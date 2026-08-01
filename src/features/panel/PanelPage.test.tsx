import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { PanelPage } from './PanelPage';
import { AuthProvider } from '@/features/auth/AuthContext';

/**
 * PANEL MENÜSÜ — "işlevsiz hedef kalmaz" ölçütünün testi (T-505).
 *
 * Panelde üç bağlantı "Yakında" etiketiyle duruyordu: "Planlarım" plan
 * kaydetmeyen bir araca, "İlanlarım" herkese açık pazaryeri listesine,
 * "Üyelik ve Ödeme" ise `/panel`e — yani kullanıcının zaten üzerinde
 * olduğu sayfaya — gidiyordu. Sonuncusu tıklanınca hiçbir şey olmuyordu.
 *
 * Bu test o üç durumu birden kilitliyor: menüde ne "Yakında" notu, ne de
 * sayfanın kendisine dönen bir bağlantı kalabilir.
 *
 * Supabase test ortamında yapılandırılmamış; `AuthProvider` oturumsuz
 * kurulur ve menü yine de çizilir — ölçülen şey menünün içeriği.
 */
function renderPanel(path = '/panel') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/panel" element={<PanelPage />} />
          <Route path="/panel/:section" element={<PanelPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function menuLinks() {
  const menu = screen.getByRole('list', { name: 'Panel bölümleri' });
  return within(menu).getAllByRole('link');
}

describe('PanelPage menüsü', () => {
  it('menüde bağlantı var', () => {
    renderPanel();
    expect(menuLinks().length).toBeGreaterThan(0);
  });

  it('hiçbir bağlantı "Yakında" notu taşımaz', () => {
    renderPanel();
    for (const link of menuLinks()) {
      expect(link.textContent ?? '').not.toMatch(/yakında/i);
    }
  });

  /*
   * Asıl yakalanan hata: bağlantının sayfanın KENDİSİNE gitmesi.
   * "Üyelik ve Ödeme" `/panel`e gidiyordu; kullanıcı tıklıyor, hiçbir
   * şey değişmiyordu.
   */
  it('hiçbir bağlantı panelin kendisine dönmez', () => {
    renderPanel();
    for (const link of menuLinks()) {
      expect(link.getAttribute('href')).not.toBe('/panel');
    }
  });

  it('İlanlarım kendi bölümüne gider', () => {
    renderPanel();
    const link = menuLinks().find((a) => a.textContent?.includes('İlanlarım'));
    expect(link?.getAttribute('href')).toBe('/panel/ilanlar');
  });

  it('Fotoğraflarım kendi bölümüne gider', () => {
    renderPanel();
    const link = menuLinks().find((a) =>
      a.textContent?.includes('Fotoğraflarım')
    );
    expect(link?.getAttribute('href')).toBe('/panel/fotograflar');
  });

  /*
   * Fotoğraf bölümü de oturumsuzken tohum kare göstermemeli — galeri
   * tohuma düşüyor, sahibin listesi düşmemeli.
   */
  it('fotograflar bölümü oturumsuzken tohum fotoğraf göstermez', () => {
    renderPanel('/panel/fotograflar');
    expect(
      screen.getByText(/Henüz fotoğraf yüklemediniz/i)
    ).toBeInTheDocument();
  });

  /*
   * İlan bölümü oturumsuzken de çizilmeli: `useMyListings` kimlik
   * yokken boş liste döndürüyor, bölüm "henüz ilan yok" diyor —
   * çökmüyor ve tohum ilanları "senin ilanların" diye göstermiyor.
   */
  it('ilanlar bölümü oturumsuzken tohum ilan göstermez', () => {
    renderPanel('/panel/ilanlar');
    expect(
      screen.getByText(/Henüz ilan vermediniz/i)
    ).toBeInTheDocument();
  });
});

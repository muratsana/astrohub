import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ForumPage } from './ForumPage';
import { setPreferenceAdapter } from '@/components/ui/preferenceStore';

beforeEach(() => {
  localStorage.clear();
  setPreferenceAdapter(null);
});

describe('ForumPage', () => {
  it('forum ana sayfasında yalnızca kategori girişlerini gösteriyor', () => {
    renderForum('/forum');

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ekipmanlar' })
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: /Ekipmanlar.*2 konu/i })
    ).toHaveAttribute('href', '/forum/kategori/ekipmanlar');
    expect(
      screen.queryByRole('link', {
        name: /İlk teleskop: 130 mm newton mu, 8 inç dobson mu?/,
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Liste görünümü' })
    ).not.toBeInTheDocument();
  });

  it('kategori alt sayfasında ilgili konuları gösteriyor', () => {
    renderForum('/forum/kategori/ekipmanlar');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Ekipmanlar' })
    ).toBeVisible();
    expect(
      screen.queryByRole('link', { name: /Ekipmanlar.*2 konu/i })
    ).not.toBeInTheDocument();

    const threadLink = screen.getByRole('link', {
      name: /İlk teleskop: 130 mm newton mu, 8 inç dobson mu?/,
    });
    expect(threadLink).toHaveAttribute(
      'href',
      '/forum/ilk-teleskop-130-mm-mi-8-inc-dobson-mi'
    );
    expect(screen.getByText(/Ankara’da oturuyorum/)).toBeVisible();
    expect(screen.getAllByRole('link', { name: '@gokhan_k' })[0]).toHaveAttribute(
      'href',
      '/profil/gokhan_k'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Izgara görünümü' }));
    expect(
      screen.getByRole('link', {
        name: /İlk teleskop: 130 mm newton mu, 8 inç dobson mu?/,
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Liste görünümü' }));
    expect(
      screen.queryByRole('link', {
        name: /Forum kuralları ve başlarken okunacaklar/,
      })
    ).not.toBeInTheDocument();
  });

  it('kategori alt sayfasında rozet filtresini uygular', () => {
    renderForum('/forum/kategori/yazilimlar');

    expect(
      screen.getByRole('link', {
        name: /PHD2 guide hatası doğuda ve batıda farklı çıkıyor/,
      })
    ).toHaveAttribute('href', '/forum/phd2-guide-hatasi-dogu-batida-farkli');

    fireEvent.click(screen.getByRole('checkbox', { name: /Sorun Giderme/ }));
    expect(
      screen.getByRole('link', {
        name: /PHD2 guide hatası doğuda ve batıda farklı çıkıyor/,
      })
    ).toBeInTheDocument();
  });
});

function renderForum(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/forum/kategori/:category" element={<ForumPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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
      screen.getByRole('link', { name: /Ekipmanlar.*0 konu/i })
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

  it('kategori alt sayfasında mock konu göstermiyor', () => {
    renderForum('/forum/kategori/ekipmanlar');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Ekipmanlar' })
    ).toBeVisible();
    expect(
      screen.queryByRole('link', { name: /Ekipmanlar.*0 konu/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', {
        name: /İlk teleskop: 130 mm newton mu, 8 inç dobson mu?/,
      })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Eşleşen konu yok')).toBeVisible();
  });

  it('kategori alt sayfasında mock kullanıcı göstermiyor', () => {
    renderForum('/forum/kategori/yazilimlar');

    expect(
      screen.queryByRole('link', {
        name: /PHD2 guide hatası doğuda ve batıda farklı çıkıyor/,
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /@gokhan_k|@tolga_m|@burak_deniz/ })
    ).not.toBeInTheDocument();
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

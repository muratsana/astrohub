import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ForumPage } from './ForumPage';
import { setPreferenceAdapter } from '@/components/ui/preferenceStore';

beforeEach(() => {
  localStorage.clear();
  setPreferenceAdapter(null);
});

describe('ForumPage', () => {
  it('forum ana sayfasında konu başlıklarını tıklanabilir gösteriyor', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/forum']}>
          <ForumPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(
      screen.getAllByRole('heading', { name: 'Ekipmanlar' }).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('2 konu').length).toBeGreaterThan(0);

    const threadLink = screen.getByRole('link', {
      name: /İlk teleskop: 130 mm newton mu, 8 inç dobson mu?/,
    });
    expect(threadLink).toHaveAttribute(
      'href',
      '/forum/ilk-teleskop-130-mm-mi-8-inc-dobson-mi'
    );
    expect(threadLink).toHaveTextContent('@gokhan_k');
    expect(threadLink).toHaveTextContent(/Ankara’da oturuyorum/);

    fireEvent.click(screen.getByRole('button', { name: 'Izgara görünümü' }));
    expect(
      screen.getByRole('link', {
        name: /İlk teleskop: 130 mm newton mu, 8 inç dobson mu?/,
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Liste görünümü' }));
    expect(
      screen.getByRole('link', {
        name: /Forum kuralları ve başlarken okunacaklar/,
      })
    ).toHaveAttribute('href', '/forum/forum-kurallari-ve-baslarken');
    expect(
      screen.getAllByRole('link', { name: /^Ekipmanlar$/ })[0]
    ).toHaveAttribute('href', '/forum?kategori=ekipmanlar');
    expect(
      screen.getAllByRole('link', { name: /^2 konu$/ })[0]
    ).toHaveAttribute('href', '/forum?kategori=ekipmanlar');

    fireEvent.click(screen.getByRole('checkbox', { name: /Sorun Giderme/ }));
    expect(
      screen.getByRole('link', {
        name: /PHD2 guide hatası doğuda ve batıda farklı çıkıyor/,
      })
    ).toHaveAttribute('href', '/forum/phd2-guide-hatasi-dogu-batida-farkli');
    expect(
      screen.queryByRole('link', {
        name: /İlk teleskop: 130 mm newton mu, 8 inç dobson mu?/,
      })
    ).not.toBeInTheDocument();
  });
});

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

describe('ForumPage kategori özeti', () => {
  it('forum ana sayfasında konuları değil kategori başlıklarını gösteriyor', () => {
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
      screen.getByRole('heading', { name: 'Ekipmanlar' })
    ).toBeInTheDocument();
    expect(screen.getByText('2 konu')).toBeInTheDocument();
    expect(screen.queryByText('@astrohub')).not.toBeInTheDocument();
    expect(screen.queryByText(/İlk teleskop:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Izgara görünümü' }));
    expect(screen.queryByText(/Son konu:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Liste görünümü' }));
    expect(screen.queryByText('@astrohub')).not.toBeInTheDocument();
  });
});

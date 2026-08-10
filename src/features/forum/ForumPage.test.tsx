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

describe('ForumPage görünüm anahtarı', () => {
  it('liste ve kart görünümü arasında geçiyor', () => {
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

    expect(screen.getByText('@astrohub')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Izgara görünümü' }));
    expect(screen.queryByText('@astrohub')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Son konu:/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Liste görünümü' }));
    expect(screen.getByText('@astrohub')).toBeInTheDocument();
  });
});

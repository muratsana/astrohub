import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { RadioPage } from './RadioPage';

vi.mock('./RadioContext', () => ({
  useRadio: () => ({
    hasBroadcast: true,
    playing: false,
    toggle: vi.fn(),
  }),
}));

vi.mock('./RadioSchedule', () => ({
  RadioSchedule: () => <section aria-label="Radyo takvimi" />,
}));

describe('RadioPage', () => {
  it('dinleyiciye parça kumandası değil tek canlı yayın kontrolü gösterir', () => {
    render(
      <MemoryRouter>
        <RadioPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('button', { name: 'Canlı yayını başlat' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Canlı yayın').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /sonraki parça/i })).toBeNull();
    expect(screen.queryByText(/spotify/i)).toBeNull();
  });
});
